
import express from 'express';
import mongoose from 'mongoose';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '10mb' }));

let cachedDb = null;

const connectDB = async () => {
  if (cachedDb && mongoose.connection.readyState === 1) return cachedDb;
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;
  try {
    const db = await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    cachedDb = db;
    return db;
  } catch (err) {
    console.error("MongoDB Connection Error:", err);
    return null;
  }
};

// SCHEMAS
const UserSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true },
  name: String,
  email: String,
  picture: String,
  role: { type: String, enum: ['lecturer', 'student'], default: null },
  enrolledCourseIds: [String],
  unseenApprovals: { type: Number, default: 0 } 
});
// Ensure virtual 'id' is included in JSON responses
UserSchema.set('toJSON', { virtuals: true });

const CourseSchema = new mongoose.Schema({
  lecturerId: String,
  lecturerName: String,
  lecturerPicture: String,
  name: String,
  code: { type: String, unique: true },
  description: String,
  enrolledStudentIds: [String],
  pendingStudentIds: [String],
  createdAt: { type: Date, default: Date.now }
});
CourseSchema.set('toJSON', { virtuals: true });

const ArchiveSchema = new mongoose.Schema({
  lecturerId: { type: String, index: true },
  sessionName: String,
  courseId: String,
  data: mongoose.Schema.Types.Mixed,
  stats: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now }
});
ArchiveSchema.set('toJSON', { virtuals: true });

const MaterialSchema = new mongoose.Schema({
  courseId: String,
  title: String,
  content: String,
  folder: { type: String, default: 'General' },
  isVisible: { type: Boolean, default: true },
  type: { type: String, enum: ['lecturer_shared', 'student_private'] },
  timestamp: { type: Date, default: Date.now },
  viewedBy: { type: [String], default: [] }
});
MaterialSchema.set('toJSON', { virtuals: true });

const DirectMessageSchema = new mongoose.Schema({
  senderId: String,
  receiverId: String,
  text: String,
  timestamp: { type: Date, default: Date.now },
  isRead: { type: Boolean, default: false }
});
DirectMessageSchema.set('toJSON', { virtuals: true });

const GradeSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  studentId: String,
  exerciseId: String,
  score: Number,
  feedback: String,
  timestamp: { type: Date, default: Date.now }
});
GradeSchema.set('toJSON', { virtuals: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Course = mongoose.models.Course || mongoose.model('Course', CourseSchema);
const Archive = mongoose.models.Archive || mongoose.model('Archive', ArchiveSchema);
const Material = mongoose.models.Material || mongoose.model('Material', MaterialSchema);
const DirectMessage = mongoose.models.DirectMessage || mongoose.model('DirectMessage', DirectMessageSchema);
const Grade = mongoose.models.Grade || mongoose.model('Grade', GradeSchema);

// AUTH CONFIG
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'academic-integrity-secret-123',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' }
};
if (process.env.MONGODB_URI) sessionConfig.store = MongoStore.create({ mongoUrl: process.env.MONGODB_URI });

app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());

if (process.env.GOOGLE_CLIENT_ID) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback",
    proxy: true
  }, async (accessToken, refreshToken, profile, done) => {
    await connectDB();
    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
      user = await User.create({ 
        googleId: profile.id, 
        name: profile.displayName, 
        email: profile.emails[0].value, 
        picture: profile.photos[0].value 
      });
    }
    return done(null, user);
  }));
}

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  await connectDB();
  const user = await User.findById(id);
  done(null, user);
});

const router = express.Router();

// AUTH ROUTES
router.get('/auth/me', async (req, res) => {
  if (req.user) {
    let activeCourse = null;
    await connectDB();
    if (req.user.role === 'student' && req.user.enrolledCourseIds?.length > 0) {
      activeCourse = await Course.findById(req.user.enrolledCourseIds[0]);
    }
    res.json({
      id: req.user.googleId,
      name: req.user.name,
      email: req.user.email,
      picture: req.user.picture,
      role: req.user.role,
      enrolledCourseIds: req.user.enrolledCourseIds,
      unseenApprovals: req.user.unseenApprovals,
      activeCourse 
    });
  } else {
    res.status(401).json(null);
  }
});

router.post('/auth/dev', async (req, res) => {
  await connectDB();
  const { passcode } = req.body;
  let role = passcode === '12345' ? 'lecturer' : 'student';
  let googleId = `dev-${role}`;
  let user = await User.findOne({ googleId });
  if (!user) {
    user = await User.create({ googleId, name: `Dev ${role}`, email: `${role}@dev.local`, role });
  }
  req.login(user, (err) => {
    if (err) return res.status(500).send();
    res.json(user);
  });
});

router.post('/user/update-role', async (req, res) => {
  if (!req.user) return res.status(401).send();
  await connectDB();
  const user = await User.findOneAndUpdate({ googleId: req.user.googleId }, { role: req.body.role }, { new: true });
  res.json(user);
});

// ENHANCED SYNC: Message Alerts + Pending Counts
router.get('/lecturer/sync', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  
  const [pendingWaitlist, unreadMessages, lastMessage] = await Promise.all([
    Course.find({ lecturerId: req.user.googleId }, 'pendingStudentIds'),
    DirectMessage.countDocuments({ receiverId: req.user.googleId, isRead: false }),
    DirectMessage.findOne({ receiverId: req.user.googleId, isRead: false }).sort({ timestamp: -1 })
  ]);

  const pendingCount = pendingWaitlist.reduce((acc, c) => acc + (c.pendingStudentIds?.length || 0), 0);
  res.json({ 
    pendingCount, 
    unreadMessages,
    alert: lastMessage ? { text: lastMessage.text, senderId: lastMessage.senderId } : null 
  });
});

// DASHBOARD INIT
router.get('/lecturer/dashboard-init', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const [courses, archives] = await Promise.all([
    Course.find({ lecturerId: req.user.googleId }),
    Archive.find({ lecturerId: req.user.googleId }).sort({ timestamp: -1 })
  ]);
  res.json({ courses, archives });
});

// ARCHIVE MANAGEMENT
router.post('/lecturer/archive', async (req, res) => {
  if (!req.user) return res.status(401).send();
  await connectDB();
  const archive = await Archive.create({
    lecturerId: req.user.googleId,
    ...req.body,
    timestamp: new Date()
  });
  res.json(archive);
});

// MATERIAL TRACKING
router.post('/student/materials/:id/view', async (req, res) => {
  if (!req.user) return res.status(401).send();
  await connectDB();
  await Material.updateOne(
    { _id: req.params.id },
    { $addToSet: { viewedBy: req.user.googleId } }
  );
  res.json({ success: true });
});

// STRICT RAG STUDENT CHAT
router.post('/student/chat', async (req, res) => {
  if (!req.user || req.user.role !== 'student') return res.status(401).send();
  await connectDB();
  const { courseId, message } = req.body;
  const materials = await Material.find({ courseId, isVisible: true });
  const context = materials.map(m => `### ${m.title} ###\n${m.content}`).join('\n\n');

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `You are a specialized Course Assistant. 
    POLICY: You only answer using the provided documents. If the answer is not in documents, say: "I apologize, but this information is not present in your course materials. Please reach out to your instructor for clarification."
    DO NOT use external world knowledge or programming knowledge not found in the documents.
    
    COURSE DOCUMENTS:
    ${context}
    
    USER QUERY: ${message}`,
  });
  res.json({ text: response.text });
});

// MESSAGING
router.get('/messages/:otherId', async (req, res) => {
  if (!req.user) return res.status(401).send();
  await connectDB();
  await DirectMessage.updateMany(
    { senderId: req.params.otherId, receiverId: req.user.googleId, isRead: false },
    { isRead: true }
  );
  const messages = await DirectMessage.find({
    $or: [
      { senderId: req.user.googleId, receiverId: req.params.otherId },
      { senderId: req.params.otherId, receiverId: req.user.googleId }
    ]
  }).sort({ timestamp: 1 });
  res.json(messages);
});

router.post('/messages', async (req, res) => {
  if (!req.user) return res.status(401).send();
  await connectDB();
  const msg = await DirectMessage.create({
    senderId: req.user.googleId,
    receiverId: req.body.receiverId,
    text: req.body.text,
    timestamp: new Date()
  });
  res.json(msg);
});

// PERSISTENCE ROUTES
router.post('/grades/save', async (req, res) => {
  if (!req.user) return res.status(401).send();
  await connectDB();
  const { exerciseId, studentId, score, feedback } = req.body;
  await Grade.findOneAndUpdate(
    { userId: req.user.googleId, exerciseId, studentId },
    { score, feedback, timestamp: Date.now() },
    { upsert: true }
  );
  res.json({ success: true });
});

router.get('/grades', async (req, res) => {
  if (!req.user) return res.status(401).send();
  await connectDB();
  const grades = await Grade.find({ userId: req.user.googleId });
  res.json(grades);
});

// EVALUATE
router.post('/evaluate', async (req, res) => {
  if (!req.user) return res.status(401).send();
  try {
    const { question, masterSolution, rubric, studentCode, customInstructions } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Evaluate this code. Question: ${question}. Master Solution: ${masterSolution}. Rubric: ${rubric}. Student Code: ${studentCode}. Instructions: ${customInstructions}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            feedback: { type: Type.STRING }
          },
          required: ["score", "feedback"]
        }
      }
    });
    res.json(JSON.parse(response.text));
  } catch (err) {
    res.status(500).json({ message: "AI Analysis Engine Timeout" });
  }
});

// COURSE CRUD
router.post('/lecturer/courses', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const course = await Course.create({ ...req.body, code, lecturerId: req.user.googleId, lecturerName: req.user.name, lecturerPicture: req.user.picture });
  res.json(course);
});

router.put('/lecturer/courses/:id', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const course = await Course.findOneAndUpdate({ _id: req.params.id, lecturerId: req.user.googleId }, req.body, { new: true });
  res.json(course);
});

router.delete('/lecturer/courses/:id', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  await Course.findOneAndDelete({ _id: req.params.id, lecturerId: req.user.googleId });
  await Material.deleteMany({ courseId: req.params.id });
  res.json({ success: true });
});

router.get('/lecturer/courses/:id/waitlist', async (req, res) => {
  if (!req.user) return res.status(401).send();
  await connectDB();
  const course = await Course.findById(req.params.id);
  const pending = await User.find({ googleId: { $in: course.pendingStudentIds } });
  const enrolled = await User.find({ googleId: { $in: course.enrolledStudentIds } });
  res.json({ pending, enrolled });
});

router.post('/lecturer/courses/:id/approve', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const { studentId } = req.body;
  await Course.updateOne({ _id: req.params.id }, { $pull: { pendingStudentIds: studentId }, $addToSet: { enrolledStudentIds: studentId } });
  await User.updateOne({ googleId: studentId }, { $addToSet: { enrolledCourseIds: req.params.id }, $inc: { unseenApprovals: 1 } });
  res.json({ success: true });
});

router.post('/lecturer/courses/:id/reject', async (req, res) => {
  if (!req.user) return res.status(401).send();
  await connectDB();
  await Course.updateOne({ _id: req.params.id }, { $pull: { pendingStudentIds: req.body.studentId } });
  res.json({ success: true });
});

router.post('/lecturer/courses/:id/remove-student', async (req, res) => {
  if (!req.user) return res.status(401).send();
  await connectDB();
  const { studentId } = req.body;
  await Course.updateOne({ _id: req.params.id }, { $pull: { enrolledStudentIds: studentId } });
  await User.updateOne({ googleId: studentId }, { $pull: { enrolledCourseIds: req.params.id } });
  res.json({ success: true });
});

// MATERIAL CRUD
router.get('/lecturer/courses/:id/materials', async (req, res) => {
  if (!req.user) return res.status(401).send();
  await connectDB();
  const materials = await Material.find({ courseId: req.params.id });
  res.json(materials);
});

router.post('/lecturer/materials', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const material = await Material.create({ ...req.body });
  res.json(material);
});

router.put('/lecturer/materials/:id', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const material = await Material.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(material);
});

router.delete('/lecturer/materials/:id', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  await Material.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/api/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => res.redirect('/'));
app.get('/api/auth/logout', (req, res) => req.logout(() => res.redirect('/')));
app.use('/api', router);
app.use('/', router);
export default app;
