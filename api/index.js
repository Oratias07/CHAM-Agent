
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
  isRead: { type: Boolean, default: false },
  replyTo: String, // ID of the message being replied to
  replyText: String, // Text of the message being replied to
  isEdited: { type: Boolean, default: false },
  deletedFor: { type: [String], default: [] },
  deletedForAll: { type: Boolean, default: false }
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

const AssignmentSchema = new mongoose.Schema({
  courseId: String,
  title: String,
  question: String,
  masterSolution: String,
  rubric: String,
  customInstructions: String,
  maxScore: { type: Number, default: 100 },
  openDate: Date,
  dueDate: Date,
  createdAt: { type: Date, default: Date.now }
});
AssignmentSchema.set('toJSON', { virtuals: true });

const SubmissionSchema = new mongoose.Schema({
  assignmentId: String,
  courseId: String,
  studentId: String,
  studentName: String,
  studentCode: String,
  score: Number,
  feedback: String,
  timestamp: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'evaluated'], default: 'pending' },
  extensionUntil: Date
});
SubmissionSchema.set('toJSON', { virtuals: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Course = mongoose.models.Course || mongoose.model('Course', CourseSchema);
const Archive = mongoose.models.Archive || mongoose.model('Archive', ArchiveSchema);
const Material = mongoose.models.Material || mongoose.model('Material', MaterialSchema);
const DirectMessage = mongoose.models.DirectMessage || mongoose.model('DirectMessage', DirectMessageSchema);
const Grade = mongoose.models.Grade || mongoose.model('Grade', GradeSchema);
const Assignment = mongoose.models.Assignment || mongoose.model('Assignment', AssignmentSchema);
const Submission = mongoose.models.Submission || mongoose.model('Submission', SubmissionSchema);

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
router.get('/users/all', async (req, res) => {
  if (!req.user) return res.status(401).send();
  await connectDB();
  const users = await User.find({ googleId: { $ne: req.user.googleId } });
  res.json(users.map(u => ({ id: u.googleId, name: u.name, picture: u.picture })));
});

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

  const aiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!aiKey) {
    return res.json({ text: "I apologize, but the AI engine is not configured. Please contact the administrator." });
  }
  const ai = new GoogleGenAI({ apiKey: aiKey });
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
    ],
    deletedForAll: { $ne: true },
    deletedFor: { $ne: req.user.googleId }
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
    replyTo: req.body.replyTo,
    replyText: req.body.replyText,
    timestamp: new Date()
  });
  res.json(msg);
});

router.put('/messages/:id', async (req, res) => {
  if (!req.user) return res.status(401).send();
  await connectDB();
  const msg = await DirectMessage.findOneAndUpdate(
    { _id: req.params.id, senderId: req.user.googleId },
    { text: req.body.text, isEdited: true },
    { new: true }
  );
  res.json(msg);
});

router.delete('/messages/:id', async (req, res) => {
  if (!req.user) return res.status(401).send();
  await connectDB();
  const { forEveryone } = req.query;
  if (forEveryone === 'true') {
    await DirectMessage.findOneAndUpdate(
      { _id: req.params.id, senderId: req.user.googleId },
      { deletedForAll: true }
    );
  } else {
    await DirectMessage.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { deletedFor: req.user.googleId } }
    );
  }
  res.json({ success: true });
});

// PERSISTENCE ROUTES
router.post('/grades/save', async (req, res) => {
  if (!req.user) return res.status(401).send();
  await connectDB();
  const { exerciseId, studentId, score, feedback } = req.body;
  
  // Update generic Grade model
  await Grade.findOneAndUpdate(
    { userId: req.user.googleId, exerciseId, studentId },
    { score, feedback, timestamp: Date.now() },
    { upsert: true }
  );

  // Also update Submission if this exerciseId is an assignmentId
  await Submission.findOneAndUpdate(
    { assignmentId: exerciseId, studentId },
    { score, feedback, status: 'evaluated' }
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
    const aiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!aiKey) {
      return res.status(500).json({ message: "AI Analysis Engine Error: API key is not configured in the environment." });
    }
    const ai = new GoogleGenAI({ apiKey: aiKey });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a Senior Academic Code Reviewer.
      Evaluate this student submission.
      
      CONTEXT:
      - Question: ${question}
      - Master Solution: ${masterSolution || 'Not provided'}
      - Rubric: ${rubric}
      - Instructions: ${customInstructions || 'None'}
      
      STUDENT CODE:
      ${studentCode}
      
      REQUIREMENTS:
      1. Score 0-10.
      2. Feedback in Hebrew.
      3. Return ONLY JSON.
      
      FORMAT:
      { "score": number, "feedback": "string" }`,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2
      }
    });
    
    if (!response.text) {
      throw new Error("Empty response from AI engine");
    }
    
    res.json(JSON.parse(response.text));
  } catch (err) {
    console.error('AI Evaluation Error:', err);
    res.status(500).json({ message: "AI Analysis Engine Error: " + err.message });
  }
});

// ASSIGNMENT MANAGEMENT
router.post('/lecturer/assignments', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const assignment = await Assignment.create(req.body);
  res.json(assignment);
});

router.get('/lecturer/courses/:courseId/assignments', async (req, res) => {
  if (!req.user) return res.status(401).send();
  await connectDB();
  const assignments = await Assignment.find({ courseId: req.params.courseId }).sort({ createdAt: -1 });
  res.json(assignments);
});

router.put('/lecturer/assignments/:id', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const assignment = await Assignment.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(assignment);
});

router.delete('/lecturer/assignments/:id', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  await Assignment.findByIdAndDelete(req.params.id);
  await Submission.deleteMany({ assignmentId: req.params.id });
  res.json({ success: true });
});

router.get('/lecturer/assignments/:id/submissions', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const submissions = await Submission.find({ assignmentId: req.params.id }).sort({ timestamp: -1 });
  res.json(submissions);
});

router.post('/lecturer/submissions/:id/extension', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const submission = await Submission.findByIdAndUpdate(req.params.id, { extensionUntil: req.body.extensionUntil }, { new: true });
  res.json(submission);
});

// STUDENT ASSIGNMENT ROUTES
router.get('/student/courses/:courseId/assignments', async (req, res) => {
  if (!req.user) return res.status(401).send();
  await connectDB();
  const assignments = await Assignment.find({ courseId: req.params.courseId }).sort({ createdAt: -1 });
  // Also fetch student's submissions for these assignments
  const submissions = await Submission.find({ studentId: req.user.googleId, courseId: req.params.courseId });
  res.json({ assignments, submissions });
});

router.post('/student/assignments/:id/submit', async (req, res) => {
  if (!req.user) return res.status(401).send();
  await connectDB();
  
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) return res.status(404).json({ message: "Assignment not found" });

  const now = new Date();
  
  // Check if open
  if (now < new Date(assignment.openDate)) {
    return res.status(403).json({ message: "Submission period has not started yet" });
  }

  // Check if past due
  let existingSubmission = await Submission.findOne({ assignmentId: req.params.id, studentId: req.user.googleId });
  const effectiveDueDate = existingSubmission?.extensionUntil ? new Date(existingSubmission.extensionUntil) : new Date(assignment.dueDate);
  
  if (now > effectiveDueDate) {
    return res.status(403).json({ message: "Submission deadline has passed" });
  }

  // Evaluate using AI
  try {
    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const model = genAI.models.get('gemini-3-flash-preview');
    
    const prompt = `
      You are an expert academic grader. Evaluate the following student submission based on the provided question, master solution, and rubric.
      
      QUESTION:
      ${assignment.question}
      
      MASTER SOLUTION:
      ${assignment.masterSolution}
      
      RUBRIC:
      ${assignment.rubric}
      
      STUDENT SUBMISSION:
      ${req.body.studentCode}
      
      CUSTOM INSTRUCTIONS:
      ${assignment.customInstructions || 'None'}
      
      Return a JSON object with:
      1. "score": a number from 0 to 100
      2. "feedback": a detailed string explaining the grade and how to improve.
    `;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: 'application/json' }
    });
    
    const evaluation = JSON.parse(result.text);

    if (existingSubmission) {
      existingSubmission.studentCode = req.body.studentCode;
      existingSubmission.score = evaluation.score;
      existingSubmission.feedback = evaluation.feedback;
      existingSubmission.timestamp = now;
      existingSubmission.status = 'evaluated';
      await existingSubmission.save();
      res.json(existingSubmission);
    } else {
      const submission = await Submission.create({
        assignmentId: req.params.id,
        courseId: assignment.courseId,
        studentId: req.user.googleId,
        studentName: req.user.name,
        studentCode: req.body.studentCode,
        score: evaluation.score,
        feedback: evaluation.feedback,
        status: 'evaluated',
        timestamp: now
      });
      res.json(submission);
    }
  } catch (err) {
    console.error('Auto-Evaluation Error:', err);
    res.status(500).json({ message: "Automatic evaluation failed, but your submission was saved. Please contact your lecturer." });
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
