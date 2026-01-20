
// api/index.js - Fully implemented backend logic for material management and AI-powered evaluation using Gemini API.
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
  name: String,
  code: { type: String, unique: true },
  description: String,
  schedule: String,
  instructorName: String,
  enrolledStudentIds: [String],
  pendingStudentIds: [String],
  createdAt: { type: Date, default: Date.now }
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
const Material = mongoose.models.Material || mongoose.model('Material', MaterialSchema);
const DirectMessage = mongoose.models.DirectMessage || mongoose.model('DirectMessage', DirectMessageSchema);
const Grade = mongoose.models.Grade || mongoose.model('Grade', GradeSchema);

// AUTH
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'academic-integrity-secret-123',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 1000 * 60 * 60 * 24, 
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
};

if (process.env.MONGODB_URI) {
  sessionConfig.store = MongoStore.create({ mongoUrl: process.env.MONGODB_URI });
}

app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback",
      proxy: true
    },
    async (accessToken, refreshToken, profile, done) => {
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
    }
  ));
}

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  await connectDB();
  const user = await User.findById(id);
  done(null, user);
});

const router = express.Router();

// AUTH ROUTES
router.get('/auth/me', (req, res) => {
  if (req.user) {
    res.json({ 
      id: req.user.googleId, 
      name: req.user.name, 
      email: req.user.email, 
      picture: req.user.picture, 
      role: req.user.role, 
      enrolledCourseIds: req.user.enrolledCourseIds || [],
      unseenApprovals: req.user.unseenApprovals || 0
    });
  } else {
    res.status(401).json(null);
  }
});

router.post('/auth/dev', async (req, res) => {
  const { passcode } = req.body;
  let role = passcode === '12345' ? 'lecturer' : passcode === '1234' ? 'student' : null;
  if (!role) return res.status(403).json({ message: "Invalid passcode" });

  await connectDB();
  const devId = `dev-${role}-${passcode}`;
  let user = await User.findOne({ googleId: devId });
  if (!user) {
    user = await User.create({
      googleId: devId,
      name: `Dev ${role}`,
      email: `dev-${role}@system.local`,
      role,
      picture: `https://ui-avatars.com/api/?name=Dev+${role}&background=random`
    });
  }
  req.login(user, (err) => {
    if (err) return res.status(500).json({ message: "Login failed" });
    res.json(user);
  });
});

router.post('/user/update-role', async (req, res) => {
  if (!req.user) return res.status(401).send();
  await connectDB();
  const user = await User.findOneAndUpdate({ googleId: req.user.googleId }, { role: req.body.role }, { new: true });
  res.json(user);
});

// MESSAGING ROUTES
router.get('/messages/:otherId', async (req, res) => {
  if (!req.user) return res.status(401).send();
  await connectDB();
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

// COURSE ROUTES
router.get('/lecturer/courses', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const courses = await Course.find({ lecturerId: req.user.googleId });
  res.json(courses.map(c => ({ ...c._doc, id: c._id.toString() })));
});

router.post('/lecturer/courses', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const course = await Course.create({ ...req.body, code, lecturerId: req.user.googleId });
  res.json({ ...course._doc, id: course._id.toString() });
});

router.delete('/lecturer/courses/:id', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const courseId = req.params.id;
  await Course.deleteOne({ _id: courseId, lecturerId: req.user.googleId });
  res.json({ success: true });
});

// ENROLLMENT & WAITLIST
router.post('/student/join-course', async (req, res) => {
  if (!req.user || req.user.role !== 'student') return res.status(401).send();
  await connectDB();
  const course = await Course.findOne({ code: req.body.code });
  if (!course) return res.status(404).json({ message: "Invalid code" });
  await Course.updateOne({ _id: course._id }, { $addToSet: { pendingStudentIds: req.user.googleId } });
  res.json({ message: "Request sent. Waiting for instructor approval." });
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

router.get('/lecturer/notifications', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const courses = await Course.find({ lecturerId: req.user.googleId });
  const pendingCount = courses.reduce((acc, c) => acc + (c.pendingStudentIds?.length || 0), 0);
  res.json({ pendingCount });
});

router.post('/student/clear-notifications', async (req, res) => {
  if (!req.user || req.user.role !== 'student') return res.status(401).send();
  await connectDB();
  await User.updateOne({ googleId: req.user.googleId }, { unseenApprovals: 0 });
  res.json({ success: true });
});

router.get('/lecturer/courses/:id/waitlist', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const course = await Course.findById(req.params.id);
  const pending = await User.find({ googleId: { $in: course.pendingStudentIds } });
  const enrolled = await User.find({ googleId: { $in: course.enrolledStudentIds } });
  res.json({ 
    pending: pending.map(u => ({ id: u.googleId, name: u.name, picture: u.picture, status: 'pending' })),
    enrolled: enrolled.map(u => ({ id: u.googleId, name: u.name, picture: u.picture, status: 'enrolled' }))
  });
});

// MATERIALS ROUTES
router.get('/lecturer/courses/:id/materials', async (req, res) => {
  if (!req.user) return res.status(401).send();
  await connectDB();
  const materials = await Material.find({ courseId: req.params.id });
  res.json(materials.map(m => ({ ...m._doc, id: m._id.toString() })));
});

router.post('/lecturer/materials', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const material = await Material.create(req.body);
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
  await Material.deleteOne({ _id: req.params.id });
  res.json({ success: true });
});

// EVALUATION & GRADES - Uses gemini-3-pro-preview for advanced academic grading.
router.post('/evaluate', async (req, res) => {
  if (!req.user) return res.status(401).send();
  try {
    const { question, masterSolution, rubric, studentCode, customInstructions } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `You are an expert academic instructor. Evaluate the following student submission based on the provided rubric and master solution.
        Problem Description: ${question}
        Standard Solution: ${masterSolution}
        Grading Rubric: ${rubric}
        Student's Submission: ${studentCode}
        Additional Constraints: ${customInstructions}
        
        Analyze logical errors, efficiency, and adherence to requirements.
        Provide a JSON object containing a 'score' (a number from 0 to 10) and 'feedback' (detailed constructive criticism in Hebrew).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER, description: "Final score from 0 to 10" },
            feedback: { type: Type.STRING, description: "Pedagogical feedback in Hebrew" }
          },
          required: ["score", "feedback"]
        }
      }
    });
    res.json(JSON.parse(response.text));
  } catch (err) {
    console.error("Gemini Evaluation Failed:", err);
    res.status(500).json({ message: "AI Evaluation engine failure" });
  }
});

router.post('/grades/save', async (req, res) => {
  if (!req.user) return res.status(401).send();
  await connectDB();
  const { exerciseId, studentId, score, feedback } = req.body;
  await Grade.findOneAndUpdate(
    { userId: req.user.googleId, exerciseId, studentId },
    { score, feedback, timestamp: new Date() },
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

// STUDENT AI CHAT - Grounded in course materials.
router.post('/student/chat', async (req, res) => {
  if (!req.user || req.user.role !== 'student') return res.status(401).send();
  await connectDB();
  const { courseId, message } = req.body;
  const materials = await Material.find({ courseId, isVisible: true });
  const context = materials.map(m => `Material: ${m.title}\nContent: ${m.content}`).join('\n\n');

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `You are a helpful teaching assistant for a university course. 
    A student has asked a question. Answer it concisely based ONLY on the provided course context. 
    If the answer isn't in the context, guide them to contact their instructor via direct message.
    
    Course Context:
    ${context}
    
    Student Question: ${message}`,
  });
  res.json({ text: response.text });
});

app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/api/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => res.redirect('/'));
app.get('/api/auth/logout', (req, res) => req.logout(() => res.redirect('/')));
app.use('/api', router);
app.use('/', router);

export default app;
