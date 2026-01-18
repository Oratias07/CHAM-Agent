
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
You have access to the specific context of the current grading session.
[GROUNDING SOURCES]
You must prioritize the provided context (Question, Solution, Rubric, Student Code). 
[RULES]
1. Ground your answers ONLY in the provided sources if possible.
2. Use citations like [Question], [Solution], or [Student Code] when referencing materials.
3. If the user asks for help improving the rubric, suggest specific logic based on the Master Solution.
4. Respond in Hebrew.
5. Maintain a professional academic tone.
6. If the answer is not in the sources, you may use your general knowledge but mention it is not in the specific session context.`;

const AGENT_SYSTEM_PROMPT_TEMPLATE = `[INSTRUCTIONS]
Evaluate student C code against a question and master solution.
[GOAL]
Return score (0-10) and Hebrew feedback.
Feedback must be 2-3 sentences MAX.
[OUTPUT]
{ "score": number, "feedback": "string" }`;

const connectDB = async () => {
  if (cachedDb && mongoose.connection.readyState === 1) return cachedDb;
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;
  try {
    const db = await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    cachedDb = db;
    return db;
  } catch (err) {
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

const GradeSchema = new mongoose.Schema({
  userId: String,
  studentId: String,
  exerciseId: String,
  score: Number,
  feedback: String,
  timestamp: { type: Date, default: Date.now }
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

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Grade = mongoose.models.Grade || mongoose.model('Grade', GradeSchema);
const Material = mongoose.models.Material || mongoose.model('Material', MaterialSchema);

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
      role
    });
  }
  req.login(user, () => res.json(user));
});

router.post('/chat', async (req, res) => {
  if (!req.user) return res.status(401).send();
  try {
    const { message, context } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    let grounding = "";
    if (context) {
      grounding = `
CURRENT EXERCISE CONTEXT (Grounded Sources):
- Question: ${context.question || 'Not provided'}
- Master Solution: ${context.masterSolution || 'Not provided'}
- Rubric: ${context.rubric || 'Not provided'}
- Current Student Code being evaluated: ${context.studentCode || 'Not provided'}
      `;
    }

    const prompt = `${NOTEBOOK_SYSTEM_PROMPT}\n${grounding}\n\nUSER QUESTION: ${message}`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt
    });
    res.json({ text: response.text });
  } catch (err) {
    res.status(500).json({ text: "I encountered an error processing your request." });
  }
});

router.post('/evaluate', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).send();
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
    res.status(500).json({ message: "AI evaluation failed" });
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
  await connectDB();
  const { exerciseId, studentId, score, feedback } = req.body;
  await Grade.findOneAndUpdate(
    { userId: req.user.googleId, exerciseId, studentId },
    { score, feedback, timestamp: Date.now() },
    { upsert: true }
  );
  res.json({ success: true });
});

router.get('/student/workspace', async (req, res) => {
  if (!req.user) return res.status(401).send();
  await connectDB();
  const shared = await Material.find({ courseId: req.user.enrolledLecturerId, type: 'lecturer_shared' });
  const privateNotes = await Material.find({ userId: req.user.googleId, type: 'student_private' });
  res.json({ shared, privateNotes });
});

// IMPORTANT: Support both /api prefix (for rewrites) and root (for function direct access)
app.use('/api', router);
app.use('/', router);

export default app;
