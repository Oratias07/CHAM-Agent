
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
app.use(express.json());

let cachedDb = null;

const NOTEBOOK_SYSTEM_PROMPT = `You are a high-level academic study assistant (NotebookLM style). 
You have access to a variety of "Sources" including lecture materials, exercises, and student notes.
Your goal is to help students understand the material deeply.
[RULES]
1. ALWAYS ground your answers in the provided Sources. 
2. Use citations like [Source Name] when quoting or referencing.
3. Feedback must be in Hebrew unless requested otherwise.
`;

const AGENT_SYSTEM_PROMPT_TEMPLATE = `[INSTRUCTIONS]
Evaluate student C code against a question and master solution.
[GOAL]
Return score (0-10) and Hebrew feedback.
Feedback must be 2-3 sentences MAX.
[OUTPUT]
{ "score": number, "feedback": "string" }
`;

const connectDB = async () => {
  if (cachedDb && mongoose.connection.readyState === 1) return cachedDb;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not defined in environment variables.");
    return null;
  }
  try {
    const db = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, // 5 second timeout
    });
    cachedDb = db;
    return db;
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
    return null;
  }
};

const UserSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true },
  name: String,
  email: String,
  picture: String,
  role: { type: String, enum: ['lecturer', 'student'], default: null },
  enrolledLecturerId: String
});

const MaterialSchema = new mongoose.Schema({
  userId: String,
  courseId: String,
  title: String,
  content: String,
  type: { type: String, enum: ['lecturer_shared', 'student_private'] },
  sourceType: String,
  timestamp: { type: Date, default: Date.now }
});

const GradeSchema = new mongoose.Schema({
  userId: String,
  studentId: String,
  exerciseId: String,
  score: Number,
  feedback: String,
  timestamp: { type: Date, default: Date.now }
});

const ArchiveSchema = new mongoose.Schema({
  userId: String,
  timestamp: { type: Date, default: Date.now },
  state: Object
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Material = mongoose.models.Material || mongoose.model('Material', MaterialSchema);
const Grade = mongoose.models.Grade || mongoose.model('Grade', GradeSchema);
const Archive = mongoose.models.Archive || mongoose.model('Archive', ArchiveSchema);

// Configure Session Store - Fallback to MemoryStore if MONGODB_URI is missing
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
  sessionConfig.store = MongoStore.create({ 
    mongoUrl: process.env.MONGODB_URI,
    ttl: 24 * 60 * 60 // 1 day
  });
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

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const db = await connectDB();
    if (!db) return done(null, null); // Skip if no DB
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    console.error("Deserialization error:", err);
    done(err, null);
  }
});

const router = express.Router();

router.get('/auth/me', (req, res) => {
  if (req.user) {
    res.json({ 
      id: req.user.googleId, 
      name: req.user.name, 
      email: req.user.email, 
      picture: req.user.picture, 
      role: req.user.role, 
      enrolledLecturerId: req.user.enrolledLecturerId 
    });
  } else {
    res.status(401).json({ message: "Not authenticated" });
  }
});

router.post('/auth/dev', async (req, res) => {
  try {
    const db = await connectDB();
    const devId = 'dev-bypass-12345';
    let user = null;

    if (db) {
      user = await User.findOne({ googleId: devId });
      if (!user) {
        user = await User.create({
          googleId: devId,
          name: 'Developer Mode',
          email: 'dev@stsystem.local',
          picture: 'https://api.dicebear.com/7.x/bottts/svg?seed=dev',
          role: null
        });
      }
    } else {
      // Memory fallback for dev roaming without DB
      user = {
        id: 'mock-id',
        googleId: devId,
        name: 'Developer (Mock)',
        role: null
      };
    }

    req.login(user, (err) => {
      if (err) return res.status(500).json({ message: "Dev login failed" });
      res.json({ 
        id: user.googleId, 
        name: user.name, 
        email: user.email || 'dev@local', 
        picture: user.picture || '', 
        role: user.role, 
        enrolledLecturerId: user.enrolledLecturerId 
      });
    });
  } catch (err) {
    res.status(500).json({ message: "Dev login encountered a critical error" });
  }
});

router.post('/user/update-role', async (req, res) => {
  if (!req.user) return res.status(401).send();
  const { role } = req.body;
  await connectDB();
  const user = await User.findOneAndUpdate({ googleId: req.user.googleId }, { role }, { new: true });
  res.json(user);
});

router.post('/student/join', async (req, res) => {
  if (!req.user) return res.status(401).send();
  const { lecturerId } = req.body;
  await connectDB();
  const lecturer = await User.findOne({ googleId: lecturerId, role: 'lecturer' });
  if (!lecturer) return res.status(404).json({ message: "Lecturer ID not found" });
  const user = await User.findOneAndUpdate({ googleId: req.user.googleId }, { enrolledLecturerId: lecturerId }, { new: true });
  res.json(user);
});

router.post('/evaluate', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required" });
  try {
    const { question, rubric, studentCode, masterSolution, customInstructions } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `${AGENT_SYSTEM_PROMPT_TEMPLATE}\n\nQ: ${question}\nSolution: ${masterSolution}\nRubric: ${rubric}\nStudent: ${studentCode}\nInstr: ${customInstructions}`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    res.json(JSON.parse(response.text));
  } catch (err) { 
    res.status(500).json({ message: err.message }); 
  }
});

router.get('/grades', async (req, res) => {
  if (!req.user) return res.status(401).send();
  await connectDB();
  const grades = await Grade.find({ userId: req.user.googleId });
  res.json(grades);
});

router.post('/grades/save', async (req, res) => {
  if (!req.user) return res.status(401).send();
  const { exerciseId, studentId, score, feedback } = req.body;
  await connectDB();
  await Grade.findOneAndUpdate({ userId: req.user.googleId, exerciseId, studentId }, { score, feedback, timestamp: Date.now() }, { upsert: true });
  res.json({ success: true });
});

router.post('/grades/clear', async (req, res) => {
  if (!req.user) return res.status(401).send();
  await connectDB();
  await Grade.deleteMany({ userId: req.user.googleId });
  res.json({ success: true });
});

router.post('/archives/save', async (req, res) => {
  if (!req.user) return res.status(401).send();
  const { state } = req.body;
  await connectDB();
  await Archive.create({ userId: req.user.googleId, state });
  res.json({ success: true });
});

router.get('/archives', async (req, res) => {
  if (!req.user) return res.status(401).send();
  await connectDB();
  const archives = await Archive.find({ userId: req.user.googleId }).sort({ timestamp: -1 });
  res.json(archives);
});

router.post('/student/chat', async (req, res) => {
  if (!req.user) return res.status(401).send();
  const { message, sources } = req.body;
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const context = sources.map(s => `SOURCE [${s.title}]:\n${s.content}`).join('\n\n');
  const prompt = `${NOTEBOOK_SYSTEM_PROMPT}\n\nCONTEXT:\n${context}\n\nQ: ${message}`;
  const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: prompt });
  res.json({ text: response.text });
});

router.get('/student/workspace', async (req, res) => {
  if (!req.user) return res.status(401).send();
  await connectDB();
  const shared = await Material.find({ courseId: req.user.enrolledLecturerId, type: 'lecturer_shared' });
  const privateNotes = await Material.find({ userId: req.user.googleId, type: 'student_private' });
  res.json({ shared, privateNotes });
});

app.use('/api', router);

// Explicit 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: "API endpoint not found" });
});

export default app;
