
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

const ArchiveSchema = new mongoose.Schema({
  lecturerId: { type: String, index: true },
  sessionName: String,
  courseId: String,
  data: mongoose.Schema.Types.Mixed,
  stats: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now }
});

const MaterialSchema = new mongoose.Schema({
  courseId: String,
  title: String,
  content: String,
  folder: { type: String, default: 'General' },
  isVisible: { type: Boolean, default: true },
  type: { type: String, enum: ['lecturer_shared', 'student_private'] },
  timestamp: { type: Date, default: Date.now }
});

const DirectMessageSchema = new mongoose.Schema({
  senderId: String,
  receiverId: String,
  text: String,
  timestamp: { type: Date, default: Date.now },
  isRead: { type: Boolean, default: false }
});

const GradeSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  studentId: String,
  exerciseId: String,
  score: Number,
  feedback: String,
  timestamp: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Course = mongoose.models.Course || mongoose.model('Course', CourseSchema);
const Archive = mongoose.models.Archive || mongoose.model('Archive', ArchiveSchema);
const Material = mongoose.models.Material || mongoose.model('Material', MaterialSchema);
const DirectMessage = mongoose.models.DirectMessage || mongoose.model('DirectMessage', DirectMessageSchema);
const Grade = mongoose.models.Grade || mongoose.model('Grade', GradeSchema);

// AUTH & MIDDLEWARE
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

// OPTIMIZED AUTH ROUTE: Consolidates User and Course Context
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
      activeCourse // Optimized: Prevents secondary call in StudentPortal
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

// OPTIMIZED LECTURER DASHBOARD DATA
router.get('/lecturer/dashboard-init', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  
  const [courses, archives, pendingWaitlist, unreadMessages] = await Promise.all([
    Course.find({ lecturerId: req.user.googleId }),
    Archive.find({ lecturerId: req.user.googleId }).sort({ timestamp: -1 }),
    Course.find({ lecturerId: req.user.googleId }, 'pendingStudentIds'),
    DirectMessage.countDocuments({ receiverId: req.user.googleId, isRead: false })
  ]);

  const pendingCount = pendingWaitlist.reduce((acc, c) => acc + (c.pendingStudentIds?.length || 0), 0);

  res.json({
    courses: courses.map(c => ({ ...c._doc, id: c._id.toString() })),
    archives: archives.map(a => ({ ...a._doc, id: a._id.toString() })),
    pendingCount,
    unreadMessages
  });
});

// OPTIMIZED SYNC (Polling)
router.get('/lecturer/sync', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  
  const [pendingWaitlist, unreadMessages] = await Promise.all([
    Course.find({ lecturerId: req.user.googleId }, 'pendingStudentIds'),
    DirectMessage.countDocuments({ receiverId: req.user.googleId, isRead: false })
  ]);

  const pendingCount = pendingWaitlist.reduce((acc, c) => acc + (c.pendingStudentIds?.length || 0), 0);
  res.json({ pendingCount, unreadMessages });
});

// ARCHIVE ROUTES
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

// STUDENT INFO & COURSE ACTIONS
router.post('/student/join-course', async (req, res) => {
  if (!req.user) return res.status(401).send();
  await connectDB();
  const { code } = req.body;
  const course = await Course.findOne({ code });
  if (!course) return res.status(404).json({ message: "Course not found" });
  await Course.updateOne({ _id: course._id }, { $addToSet: { pendingStudentIds: req.user.googleId } });
  res.json({ message: "Request sent. Waiting for approval." });
});

router.post('/student/clear-notifications', async (req, res) => {
  if (!req.user) return res.status(401).send();
  await connectDB();
  await User.updateOne({ googleId: req.user.googleId }, { unseenApprovals: 0 });
  res.json({ success: true });
});

// STRICT RAG CHAT
router.post('/student/chat', async (req, res) => {
  if (!req.user || req.user.role !== 'student') return res.status(401).send();
  await connectDB();
  const { courseId, message } = req.body;
  const materials = await Material.find({ courseId, isVisible: true });
  const context = materials.map(m => `--- DOCUMENT: ${m.title} ---\n${m.content}`).join('\n\n');

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `You are a strict Teaching Assistant. 
    CONSTRAINT: You must answer ONLY using the provided documents. 
    If the answer is NOT in the documents, you MUST say: "This information is not covered in your course materials. Please message your instructor."
    DO NOT use external knowledge.
    
    COURSE DOCUMENTS:
    ${context}
    
    STUDENT QUESTION: ${message}`,
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

// Evaluation
router.post('/evaluate', async (req, res) => {
  if (!req.user) return res.status(401).send();
  try {
    const { question, masterSolution, rubric, studentCode, customInstructions } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Evaluate this student code. Question: ${question}. Solution: ${masterSolution}. Rubric: ${rubric}. Code: ${studentCode}. Instructions: ${customInstructions}`,
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
    res.status(500).json({ message: "AI Evaluation failed" });
  }
});

// Course Management
router.post('/lecturer/courses', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const course = await Course.create({ ...req.body, code, lecturerId: req.user.googleId, lecturerName: req.user.name, lecturerPicture: req.user.picture });
  res.json({ ...course._doc, id: course._id.toString() });
});

router.put('/lecturer/courses/:id', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const course = await Course.findOneAndUpdate({ _id: req.params.id, lecturerId: req.user.googleId }, req.body, { new: true });
  res.json({ ...course._doc, id: course._id.toString() });
});

router.delete('/lecturer/courses/:id', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  await Course.findOneAndDelete({ _id: req.params.id, lecturerId: req.user.googleId });
  await Material.deleteMany({ courseId: req.params.id });
  res.json({ success: true });
});

router.get('/lecturer/courses/:id/waitlist', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const course = await Course.findById(req.params.id);
  const pending = await User.find({ googleId: { $in: course.pendingStudentIds } });
  const enrolled = await User.find({ googleId: { $in: course.enrolledStudentIds } });
  res.json({ 
    pending: pending.map(u => ({ id: u.googleId, name: u.name, picture: u.picture })), 
    enrolled: enrolled.map(u => ({ id: u.googleId, name: u.name, picture: u.picture })) 
  });
});

router.post('/lecturer/courses/:id/approve', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const { studentId } = req.body;
  await Course.updateOne({ _id: req.params.id }, { 
    $pull: { pendingStudentIds: studentId },
    $addToSet: { enrolledStudentIds: studentId }
  });
  await User.updateOne({ googleId: studentId }, { 
    $addToSet: { enrolledCourseIds: req.params.id },
    $inc: { unseenApprovals: 1 } 
  });
  res.json({ success: true });
});

router.post('/lecturer/courses/:id/reject', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const { studentId } = req.body;
  await Course.updateOne({ _id: req.params.id }, { $pull: { pendingStudentIds: studentId } });
  res.json({ success: true });
});

router.post('/lecturer/courses/:id/remove-student', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const { studentId } = req.body;
  await Course.updateOne({ _id: req.params.id }, { $pull: { enrolledStudentIds: studentId } });
  await User.updateOne({ googleId: studentId }, { $pull: { enrolledCourseIds: req.params.id } });
  res.json({ success: true });
});

// Materials Management
router.get('/lecturer/courses/:id/materials', async (req, res) => {
  if (!req.user) return res.status(401).send();
  await connectDB();
  const materials = await Material.find({ courseId: req.params.id });
  res.json(materials.map(m => ({ ...m._doc, id: m._id.toString() })));
});

router.post('/lecturer/materials', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const material = await Material.create({ ...req.body });
  res.json({ ...material._doc, id: material._id.toString() });
});

router.put('/lecturer/materials/:id', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const material = await Material.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ ...material._doc, id: material._id.toString() });
});

router.delete('/lecturer/materials/:id', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  await Material.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// Grades Management
router.get('/grades', async (req, res) => {
  if (!req.user) return res.status(401).send();
  await connectDB();
  const grades = await Grade.find({ userId: req.user.googleId });
  res.json(grades);
});

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

// Routes mounting
app.use('/api', router);
app.use('/', router);
export default app;
