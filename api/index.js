
import express from 'express';
import mongoose from 'mongoose';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '10mb' }));

let cachedDb = null;

const STUDENT_ASSISTANT_PROMPT = `You are a high-level academic tutor powered by Gemini. 
Your goal is to help students understand their course materials deeply.
[BEHAVIOR]
- Use the provided grounding sources to answer.
- IMPORTANT: You ONLY have access to materials explicitly provided in the context.
- Format responses using Markdown for clarity.
- Be encouraging but rigorous.`;

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
  assignedStudentIds: [String], // Whitelist of users who can join
  createdAt: { type: Date, default: Date.now }
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

const MaterialSchema = new mongoose.Schema({
  userId: String,
  courseId: String,
  title: String,
  content: String,
  folder: { type: String, default: 'General' },
  isVisible: { type: Boolean, default: true },
  type: { type: String, enum: ['lecturer_shared', 'student_private', 'student_specific'] },
  sourceType: String,
  timestamp: { type: Date, default: Date.now }
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
const Exercise = mongoose.models.Exercise || mongoose.model('Exercise', ExerciseSchema);
const Material = mongoose.models.Material || mongoose.model('Material', MaterialSchema);
const Grade = mongoose.models.Grade || mongoose.model('Grade', GradeSchema);

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

router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => res.redirect('/')
);

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
  let role = null;
  if (passcode === '12345') role = 'lecturer';
  else if (passcode === '1234') role = 'student';
  else return res.status(403).json({ message: "Invalid passcode" });

  await connectDB();
  const devId = `dev-${role}-${passcode}`;
  let user = await User.findOne({ googleId: devId });
  if (!user) {
    user = await User.create({
      googleId: devId,
      name: `Dev ${role}`,
      email: `dev-${role}@stsystem.local`,
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
  const { role } = req.body;
  await connectDB();
  const user = await User.findOneAndUpdate(
    { googleId: req.user.googleId },
    { role },
    { new: true }
  );
  res.json(user);
});

// COURSE MANAGEMENT
router.get('/lecturer/courses', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const courses = await Course.find({ lecturerId: req.user.googleId });
  res.json(courses);
});

router.post('/lecturer/courses', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  const { name, description, schedule, instructorName } = req.body;
  await connectDB();
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const course = await Course.create({
    lecturerId: req.user.googleId,
    name,
    description,
    schedule,
    instructorName,
    code,
    assignedStudentIds: []
  });
  res.json(course);
});

router.put('/lecturer/courses/:id', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const course = await Course.findOneAndUpdate(
    { _id: req.params.id, lecturerId: req.user.googleId },
    req.body,
    { new: true }
  );
  res.json(course);
});

router.delete('/lecturer/courses/:id', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  await Course.deleteOne({ _id: req.params.id, lecturerId: req.user.googleId });
  await Material.deleteMany({ courseId: req.params.id });
  await Exercise.deleteMany({ courseId: req.params.id });
  res.json({ success: true });
});

router.get('/lecturer/all-students', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const students = await User.find({ role: 'student' });
  res.json(students.map(s => ({ id: s.googleId, name: s.name, picture: s.picture })));
});

router.post('/student/join-course', async (req, res) => {
  if (!req.user || req.user.role !== 'student') return res.status(401).send();
  const { code } = req.body;
  await connectDB();
  const course = await Course.findOne({ code });
  
  if (!course) return res.status(404).json({ message: "Course not found" });
  
  // WHITELIST CHECK
  if (!course.assignedStudentIds.includes(req.user.googleId)) {
    return res.status(403).json({ message: "Access Denied: You are not assigned to this course by the instructor." });
  }
  
  const user = await User.findOneAndUpdate(
    { googleId: req.user.googleId },
    { $addToSet: { enrolledCourseIds: course._id.toString() } },
    { new: true }
  );
  res.json(user);
});

router.get('/student/workspace', async (req, res) => {
  if (!req.user) return res.status(401).send();
  await connectDB();
  const courseIds = req.user.enrolledCourseIds || [];
  
  // Filter by isVisible for student view
  const shared = await Material.find({ 
    courseId: { $in: courseIds }, 
    isVisible: true,
    type: 'lecturer_shared'
  });
  const privateNotes = await Material.find({ userId: req.user.googleId, type: 'student_private' });
  res.json({ shared, privateNotes });
});

router.post('/student/chat', async (req, res) => {
  if (!req.user) return res.status(401).send();
  try {
    const { message, task } = req.body;
    await connectDB();
    const courseIds = req.user.enrolledCourseIds || [];
    
    // Only fetch visible materials for the chat context
    const visibleMaterials = await Material.find({
      courseId: { $in: courseIds },
      isVisible: true,
      type: 'lecturer_shared'
    });
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    let context = "GROUNDING SOURCES (VISIBLE TO STUDENT):\n";
    visibleMaterials.forEach(s => context += `--- SOURCE: ${s.title} ---\n${s.content}\n\n`);
    
    const finalPrompt = `${STUDENT_ASSISTANT_PROMPT}\n\n${context}\n\nUSER QUERY: ${message || task}`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: finalPrompt
    });
    res.json({ text: response.text });
  } catch (err) {
    res.status(500).json({ text: "Error processing chat." });
  }
});

router.put('/lecturer/materials/:id/visibility', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  const material = await Material.findByIdAndUpdate(req.params.id, { isVisible: req.body.isVisible }, { new: true });
  res.json(material);
});

router.delete('/lecturer/materials/:id', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  await connectDB();
  await Material.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

router.post('/lecturer/upload-material', async (req, res) => {
  if (!req.user || req.user.role !== 'lecturer') return res.status(401).send();
  const { courseId, title, content, folder } = req.body;
  await connectDB();
  const material = await Material.create({
    courseId,
    title,
    content,
    folder: folder || 'General',
    isVisible: true,
    type: 'lecturer_shared',
    sourceType: 'note'
  });
  res.json(material);
});

router.get('/auth/logout', (req, res) => {
  req.logout(() => res.redirect('/'));
});

app.use('/api', router);
app.use('/', router);

export default app;
