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
app.use(express.json());

// 1. DATABASE CONNECTION
// Helper to ensure DB is connected
const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not defined in environment variables.");
  }
  await mongoose.connect(uri);
};

// Model definitions (idempotent)
const UserSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true },
  name: String,
  email: String,
  picture: String,
  role: { type: String, enum: ['lecturer', 'student'], default: 'student' },
  activeCourseId: String,
  enrolledCourseIds: [String],
  pendingCourseIds: [String],
});

const GradeSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  studentId: String,
  exerciseId: String,
  score: Number,
  feedback: String,
  timestamp: { type: Date, default: Date.now }
});

const CourseSchema = new mongoose.Schema({
  name: String,
  code: { type: String, unique: true },
  lecturerId: String,
  lecturerName: String,
  lecturerPicture: String,
  enrolledStudents: [String], // googleIds
  pendingStudents: [String], // googleIds
});

const MaterialSchema = new mongoose.Schema({
  courseId: String,
  title: String,
  content: String,
  isVisible: { type: Boolean, default: true },
  viewedBy: [String], // googleIds
});

const MessageSchema = new mongoose.Schema({
  senderId: String,
  receiverId: String,
  text: String,
  timestamp: { type: Date, default: Date.now },
  isRead: { type: Boolean, default: false }
});

const ArchiveSchema = new mongoose.Schema({
  sessionName: String,
  courseId: String,
  data: Object,
  stats: Object,
  timestamp: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Grade = mongoose.models.Grade || mongoose.model('Grade', GradeSchema);
const Course = mongoose.models.Course || mongoose.model('Course', CourseSchema);
const Material = mongoose.models.Material || mongoose.model('Material', MaterialSchema);
const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);
const Archive = mongoose.models.Archive || mongoose.model('Archive', ArchiveSchema);

// 2. AUTHENTICATION CONFIG
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  store: MONGODB_URI ? MongoStore.create({ mongoUrl: MONGODB_URI }) : undefined,
  cookie: { 
    maxAge: 1000 * 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}));

app.use(passport.initialize());
app.use(passport.session());

if (process.env.GOOGLE_CLIENT_ID) {
  passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback",
      proxy: true
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
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
      } catch (err) {
        return done(err, null);
      }
    }
  ));
}

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    await connectDB();
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// 3. API ENDPOINTS
app.get('/api/auth/me', async (req, res) => {
  if (req.user) {
    await connectDB();
    const course = req.user.activeCourseId ? await Course.findById(req.user.activeCourseId) : null;
    res.json({
      id: req.user.googleId,
      name: req.user.name,
      email: req.user.email,
      picture: req.user.picture,
      role: req.user.role,
      enrolledCourseIds: req.user.enrolledCourseIds || [],
      pendingCourseIds: req.user.pendingCourseIds || [],
      activeCourse: course ? {
        id: course._id,
        name: course.name,
        lecturerId: course.lecturerId,
        lecturerName: course.lecturerName,
        lecturerPicture: course.lecturerPicture
      } : null
    });
  } else {
    res.status(401).json(null);
  }
});

app.post('/api/user/update-role', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required" });
  await connectDB();
  const { role } = req.body;
  await User.findOneAndUpdate({ googleId: req.user.googleId }, { role });
  res.json({ success: true });
});

app.get('/api/messages/:otherId', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required" });
  await connectDB();
  const messages = await Message.find({
    $or: [
      { senderId: req.user.googleId, receiverId: req.params.otherId },
      { senderId: req.params.otherId, receiverId: req.user.googleId }
    ]
  }).sort({ timestamp: 1 });
  res.json(messages);
});

app.post('/api/messages', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required" });
  await connectDB();
  const { receiverId, text } = req.body;
  const msg = await Message.create({
    senderId: req.user.googleId,
    receiverId,
    text
  });
  res.json(msg);
});

app.get('/api/lecturer/dashboard-init', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required" });
  await connectDB();
  const courses = await Course.find({ lecturerId: req.user.googleId });
  const archives = await Archive.find({ lecturerId: req.user.googleId });
  res.json({ courses, archives });
});

app.get('/api/lecturer/sync', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required" });
  await connectDB();
  const unreadMessages = await Message.countDocuments({ receiverId: req.user.googleId, isRead: false });
  const lastMsg = await Message.findOne({ receiverId: req.user.googleId }).sort({ timestamp: -1 });
  res.json({
    pendingCount: 0, // Simplified for now
    unreadMessages,
    alert: lastMsg ? { text: lastMsg.text, senderId: lastMsg.senderId } : undefined
  });
});

app.get('/api/lecturer/courses/:id/materials', async (req, res) => {
  await connectDB();
  const materials = await Material.find({ courseId: req.params.id });
  res.json(materials);
});

app.post('/api/student/chat', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required" });
  const { message } = req.body;
  // Mock AI chat for student
  res.json({ text: `I am your assistant. You asked: ${message}. Currently I only have access to course documents.` });
});

app.get('/api/admin/db', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required" });
  try {
    await connectDB();
    const users = await User.find({}).limit(100);
    const grades = await Grade.find({}).limit(100);
    const courses = await Course.find({}).limit(100);
    const messages = await Message.find({}).limit(100);
    res.json({ users, grades, courses, messages });
  } catch (err) {
    console.error('DB Admin Error:', err);
    res.status(500).send(err.message);
  }
});

app.post('/api/student/join-course', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required" });
  await connectDB();
  const { code } = req.body;
  const course = await Course.findOne({ code });
  if (!course) return res.status(404).json({ message: "Course not found" });
  
  const student = await User.findOne({ googleId: req.user.googleId });
  if (!student) return res.status(404).json({ message: "Student not found" });

  if (!course.pendingStudents.includes(req.user.googleId) && !course.enrolledStudents.includes(req.user.googleId)) {
    course.pendingStudents.push(req.user.googleId);
    await course.save();
    
    if (!student.pendingCourseIds.includes(course._id.toString())) {
      student.pendingCourseIds.push(course._id.toString());
      await student.save();
    }
  }
  res.json({ message: "Request sent" });
});

app.post('/api/lecturer/courses/:courseId/approve', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required" });
  await connectDB();
  const { studentId } = req.body;
  const course = await Course.findById(req.params.courseId);
  if (!course) return res.status(404).json({ message: "Course not found" });
  
  course.pendingStudents = course.pendingStudents.filter(id => id !== studentId);
  if (!course.enrolledStudents.includes(studentId)) {
    course.enrolledStudents.push(studentId);
    
    const student = await User.findOne({ googleId: studentId });
    if (student) {
      student.pendingCourseIds = student.pendingCourseIds.filter(id => id !== course._id.toString());
      if (!student.enrolledCourseIds.includes(course._id.toString())) {
        student.enrolledCourseIds.push(course._id.toString());
      }
      student.activeCourseId = course._id.toString();
      await student.save();
    }
  }
  await course.save();
  res.json({ success: true });
});

app.post('/api/lecturer/courses', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required" });
  await connectDB();
  const { name, code } = req.body;
  const course = await Course.create({
    name,
    code,
    lecturerId: req.user.googleId,
    lecturerName: req.user.name,
    lecturerPicture: req.user.picture,
    enrolledStudents: [],
    pendingStudents: []
  });
  res.json(course);
});

app.post('/api/auth/dev', async (req, res) => {
  const { passcode } = req.body;
  if (passcode === '1234') { // Simple dev passcode
    await connectDB();
    let user = await User.findOne({ googleId: 'dev-user' });
    if (!user) {
      user = await User.create({
        googleId: 'dev-user',
        name: 'Dev Lecturer',
        email: 'dev@example.com',
        picture: 'https://picsum.photos/200',
        role: 'lecturer'
      });
    }
    req.login(user, (err) => {
      if (err) return res.status(500).json({ message: "Login failed" });
      res.json({
        id: user.googleId,
        name: user.name,
        email: user.email,
        picture: user.picture,
        role: user.role
      });
    });
  } else {
    res.status(401).json({ message: "Invalid passcode" });
  }
});

app.post('/api/lecturer/archive', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required" });
  await connectDB();
  const archive = await Archive.create({
    ...req.body,
    lecturerId: req.user.googleId
  });
  res.json(archive);
});

app.get('/api/lecturer/courses/:courseId/waitlist', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required" });
  await connectDB();
  const course = await Course.findById(req.params.courseId);
  if (!course) return res.status(404).json({ message: "Course not found" });
  
  const pending = await User.find({ googleId: { $in: course.pendingStudents } });
  const enrolled = await User.find({ googleId: { $in: course.enrolledStudents } });
  
  res.json({
    pending: pending.map(u => ({ id: u.googleId, name: u.name, picture: u.picture, status: 'pending' })),
    enrolled: enrolled.map(u => ({ id: u.googleId, name: u.name, picture: u.picture, status: 'enrolled' }))
  });
});

app.post('/api/lecturer/materials', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required" });
  await connectDB();
  const material = await Material.create(req.body);
  res.json(material);
});

app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/api/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => res.redirect('/')
);

app.get('/api/auth/logout', (req, res) => {
  req.logout(() => res.redirect('/'));
});

app.post('/api/student/switch-course', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required" });
  await connectDB();
  const { courseId } = req.body;
  if (!req.user.enrolledCourseIds.includes(courseId)) {
    return res.status(403).json({ message: "Not enrolled in this course" });
  }
  await User.findOneAndUpdate({ googleId: req.user.googleId }, { activeCourseId: courseId });
  
  const user = await User.findOne({ googleId: req.user.googleId });
  const course = await Course.findById(courseId);
  
  res.json({
    id: user.googleId,
    name: user.name,
    email: user.email,
    picture: user.picture,
    role: user.role,
    enrolledCourseIds: user.enrolledCourseIds,
    pendingCourseIds: user.pendingCourseIds,
    activeCourse: course ? {
      id: course._id,
      name: course.name,
      lecturerId: course.lecturerId,
      lecturerName: course.lecturerName,
      lecturerPicture: course.lecturerPicture
    } : null
  });
});

app.post('/api/evaluate', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required" });
  
  try {
    const { question, rubric, studentCode, masterSolution, customInstructions } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: `You are a Senior Academic Code Reviewer and Pedagogical Expert.
      Your task is to evaluate a student's code submission with extreme precision based on the provided rubric.
      
      ### CONTEXT
      - **Exercise Question:** ${question}
      - **Master Solution (Reference):** ${masterSolution || 'Not provided'}
      - **Grading Rubric:** ${rubric}
      - **Additional Constraints:** ${customInstructions || 'None'}
      
      ### STUDENT SUBMISSION
      \`\`\`
      ${studentCode}
      \`\`\`
      
      ### EVALUATION REQUIREMENTS
      1. **Strict Rubric Adherence:** Evaluate the code ONLY against the provided rubric criteria.
      2. **Professionalism:** Your feedback must be constructive, academic, and professional.
      3. **Language:** Feedback MUST be in Hebrew (עברית).
      4. **Score:** Provide a score from 0.0 to 10.0.
      
      ### OUTPUT FORMAT
      Return ONLY a valid JSON object:
      {
        "score": number,
        "feedback": "Detailed pedagogical feedback in Hebrew"
      }`,
      config: { 
        responseMimeType: "application/json",
        temperature: 0.2
      }
    });

    res.json(JSON.parse(response.text));
  } catch (err) {
    console.error('AI Evaluation Error:', err);
    res.status(500).json({ message: "AI Evaluation failed: " + err.message });
  }
});

app.post('/api/grades/save', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required" });
  await connectDB();
  const { exerciseId, studentId, score, feedback } = req.body;
  await Grade.findOneAndUpdate(
    { userId: req.user.googleId, exerciseId, studentId },
    { score, feedback, timestamp: Date.now() },
    { upsert: true }
  );
  res.json({ success: true });
});

app.get('/api/grades', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required" });
  await connectDB();
  const grades = await Grade.find({ userId: req.user.googleId });
  res.json(grades);
});

// For local development only
if (process.env.NODE_ENV !== 'production' && process.env.PORT) {
  app.listen(process.env.PORT, () => console.log(`Server running on ${process.env.PORT}`));
}

// THIS IS THE VERCEL REQUIREMENT: 
// Export the app instance so Vercel can wrap it in a Serverless handler.
export default app;