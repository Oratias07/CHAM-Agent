
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
  enrolledCourseIds: [String]
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

const ExerciseSchema = new mongoose.Schema({
  id: String,
  courseId: String,
  lecturerId: String,
  name: String,
  maxScore: Number,
  question: String,
  masterSolution: String,
  rubric: String,
  customInstructions: String,
  entries: mongoose.Schema.Types.Mixed
});

const GradeSchema = new mongoose.Schema({
  userId: String,
  courseId: String,
  studentId: String,
  exerciseId: String,
  score: Number,
  feedback: String,
  timestamp: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Course = mongoose.models.Course || mongoose.model('Course', CourseSchema);
const Material = mongoose.models.Material || mongoose.model('Material', MaterialSchema);
const Exercise = mongoose.models.Exercise || mongoose.model('Exercise', ExerciseSchema);
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
      enrolledCourseIds: req.user.enrolledCourseIds || [] 
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

// COURSE ROUTES
router.get('/lecturer/courses', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const courses = await Course.find({ lecturerId: req.user.googleId });
  res.json(courses);
});

router.post('/lecturer/courses', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const course = await Course.create({ ...req.body, code, lecturerId: req.user.googleId });
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
  // Thorough cleanup of all course-related objects
  await Course.deleteOne({ _id: req.params.id, lecturerId: req.user.googleId });
  await Material.deleteMany({ courseId: req.params.id });
  await Exercise.deleteMany({ courseId: req.params.id });
  await Grade.deleteMany({ courseId: req.params.id });
  
  // Remove course from all student enrollment lists
  await User.updateMany(
    { enrolledCourseIds: req.params.id },
    { $pull: { enrolledCourseIds: req.params.id } }
  );
  
  res.json({ success: true });
});

app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/api/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => res.redirect('/')
);

// ENROLLMENT & WAITLIST
router.post('/student/join-course', async (req, res) => {
  if (!req.user || req.user.role !== 'student') return res.status(401).send();
  await connectDB();
  const course = await Course.findOne({ code: req.body.code });
  if (!course) return res.status(404).json({ message: "Invalid code" });
  
  await Course.updateOne({ _id: course._id }, { $addToSet: { pendingStudentIds: req.user.googleId } });
  res.json({ message: "Request sent. Waiting for instructor approval." });
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

router.post('/lecturer/courses/:id/approve', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const { studentId } = req.body;
  await Course.updateOne({ _id: req.params.id }, { 
    $pull: { pendingStudentIds: studentId },
    $addToSet: { enrolledStudentIds: studentId }
  });
  await User.updateOne({ googleId: studentId }, { $addToSet: { enrolledCourseIds: req.params.id } });
  res.json({ success: true });
});

router.post('/lecturer/courses/:id/reject', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  await Course.updateOne({ _id: req.params.id }, { $pull: { pendingStudentIds: req.body.studentId } });
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

// MATERIAL MANAGEMENT
router.get('/lecturer/courses/:id/materials', async (req, res) => {
  if (!req.user) return res.status(401).send();
  await connectDB();
  const materials = await Material.find({ courseId: req.params.id });
  res.json(materials);
});

router.post('/lecturer/materials', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const material = await Material.create({ ...req.body, timestamp: Date.now() });
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

// GROUNDED CHAT
router.post('/student/chat', async (req, res) => {
  if (!req.user || req.user.role !== 'student') return res.status(401).send();
  try {
    const { message, courseId } = req.body;
    await connectDB();
    
    // Check enrollment
    const course = await Course.findOne({ _id: courseId, enrolledStudentIds: req.user.googleId });
    if (!course) return res.status(403).json({ text: "Access denied. Enrollment required." });

    // Grounding: Only VISIBLE materials
    const materials = await Material.find({ courseId, isVisible: true });
    const context = materials.map(m => `--- SOURCE: ${m.title} ---\n${m.content}`).join("\n\n");

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are an academic assistant. Use ONLY these materials to answer:
      ${context}
      
      User Query: ${message}`
    });
    res.json({ text: response.text });
  } catch (err) {
    res.status(500).json({ text: "Assistant error." });
  }
});

// OTHER ROUTES
router.post('/evaluate', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  try {
    const { question, masterSolution, rubric, studentCode, customInstructions } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Evaluate the following student code based on the provided rubric and master solution.
      
      ### Question:
      ${question}
      
      ### Master Solution:
      ${masterSolution}
      
      ### Rubric:
      ${rubric}
      
      ### Custom Instructions (Strict):
      ${customInstructions}
      
      ### Student Submission:
      ${studentCode}
      
      Provide a pedagogical feedback in Hebrew and a score from 0 to 10.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            feedback: { type: Type.STRING }
          },
          required: ["score", "feedback"]
        },
        thinkingConfig: { thinkingBudget: 2000 }
      }
    });
    res.json(JSON.parse(response.text));
  } catch (err) {
    console.error("Evaluation Error:", err);
    if (err.status === 429 || (err.message && err.message.includes('Quota exceeded'))) {
      res.status(429).json({ message: "System Rate Limit Exceeded. Please wait 60 seconds and try again." });
    } else {
      res.status(500).json({ message: "AI Evaluation Service encountered an error." });
    }
  }
});

router.get('/auth/logout', (req, res) => req.logout(() => res.redirect('/')));

app.use('/api', router);
app.use('/', router);

export default app;
