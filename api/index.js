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

const getSafeUri = () => {
  let uri = process.env.MONGODB_URI ? process.env.MONGODB_URI.trim() : null;
  if (!uri) return null;
  if (uri.includes('<db_password>') || uri.includes('<password>')) return { error: 'PLACEHOLDER_DETECTED', value: uri };
  if (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://")) return { error: 'INVALID_SCHEME', value: uri };
  if (!uri.includes('@')) return { error: 'MISSING_ADDRESS', value: uri };
  if (uri.includes('.net/?')) uri = uri.replace('.net/?', '.net/st_grader_db?');
  else if (uri.includes('.net') && !uri.includes('.net/')) {
    const parts = uri.split('?');
    uri = parts[0] + '/st_grader_db' + (parts[1] ? '?' + parts[1] : '');
  }
  return uri;
};

const connectDB = async () => {
  const uriResult = getSafeUri();
  if (!uriResult || uriResult.error) throw new Error(uriResult?.error || "MONGODB_URI_MISSING");
  if (cachedDb && mongoose.connection.readyState === 1) return cachedDb;
  try {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    const db = await mongoose.connect(uriResult, { serverSelectionTimeoutMS: 15000, connectTimeoutMS: 15000, appName: 'st-system-db' });
    cachedDb = db;
    return db;
  } catch (err) {
    console.error("DB Error:", err.message);
    throw err;
  }
};

const UserSchema = new mongoose.Schema({ googleId: { type: String, required: true, unique: true }, name: String, email: String, picture: String });
const GradeSchema = new mongoose.Schema({ userId: { type: String, required: true, index: true }, studentId: String, exerciseId: String, score: Number, feedback: String, timestamp: { type: Date, default: Date.now } });
const ArchiveSchema = new mongoose.Schema({ userId: { type: String, required: true, index: true }, timestamp: { type: Date, default: Date.now }, state: Object });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Grade = mongoose.models.Grade || mongoose.model('Grade', GradeSchema);
const Archive = mongoose.models.Archive || mongoose.model('Archive', ArchiveSchema);

const uriResult = getSafeUri();
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'st-system-secret-9922',
  resave: false, 
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 2, secure: true, sameSite: 'none' }
};
if (typeof uriResult === 'string') sessionConfig.store = MongoStore.create({ mongoUrl: uriResult, ttl: 60 * 60 * 2 });

app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({ clientID: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET, callbackURL: "/api/auth/google/callback", proxy: true },
    async (accessToken, refreshToken, profile, done) => {
      try {
        await connectDB();
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
          user = await User.create({ googleId: profile.id, name: profile.displayName, email: profile.emails[0].value, picture: profile.photos[0].value });
        }
        return done(null, user);
      } catch (err) { return done(err); }
    }
  ));
}

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    await connectDB();
    const user = await User.findById(id);
    done(null, user);
  } catch (err) { done(err, null); }
});

const router = express.Router();

router.get('/auth/me', (req, res) => {
  if (req.user) res.json({ id: req.user.googleId, name: req.user.name, email: req.user.email, picture: req.user.picture });
  else res.status(401).json(null);
});

router.get('/auth/google', (req, res, next) => passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next));
router.get('/auth/google/callback', (req, res, next) => {
  passport.authenticate('google', (err, user) => {
    if (err) return res.status(500).send(`Auth Error: ${err.message}`);
    if (!user) return res.redirect('/login');
    req.logIn(user, (err) => err ? next(err) : res.redirect('/'));
  })(req, res, next);
});

router.get('/auth/logout', (req, res) => req.logout(() => res.redirect('/')));

router.post('/evaluate', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required" });
  const apiKey = process.env.API_KEY;
  if (!apiKey) return res.status(500).json({ message: "API_KEY is missing." });
  try {
    const { question, rubric, studentCode, masterSolution, customInstructions } = req.body;
    const ai = new GoogleGenAI({ apiKey });
    
    // Performance Optimization: Reduced thinking budget for faster response while keeping critical reasoning
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: `Evaluate code submission.
      Compare with Master Solution logic.
      Apply Rubric.
      Rules: ${customInstructions}
      Question: ${question}
      Master: ${masterSolution}
      Student: ${studentCode}`,
      config: { 
        responseMimeType: "application/json", 
        thinkingConfig: { thinkingBudget: 4000 }, // Lower budget = Faster response
        systemInstruction: "Expert C evaluator. Provide score (0-10) and 2 sentences of feedback in Hebrew. NO hyphens. JSON ONLY: {\"score\": number, \"feedback\": \"string\"}." 
      }
    });
    res.json(JSON.parse(response.text));
  } catch (err) { res.status(500).json({ message: err.message || "Evaluation error" }); }
});

router.post('/grades/save', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required" });
  try {
    await connectDB();
    const { exerciseId, studentId, score, feedback } = req.body;
    await Grade.findOneAndUpdate({ userId: req.user.googleId, exerciseId, studentId }, { score, feedback, timestamp: Date.now() }, { upsert: true });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false }); }
});

router.get('/grades', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required" });
  try {
    await connectDB();
    const grades = await Grade.find({ userId: req.user.googleId });
    res.json(grades);
  } catch (err) { res.status(500).json([]); }
});

router.delete('/grades/clear', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required" });
  try {
    await connectDB();
    await Grade.deleteMany({ userId: req.user.googleId });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false }); }
});

router.post('/archives/save', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required" });
  try {
    await connectDB();
    await Archive.create({ userId: req.user.googleId, state: req.body.state });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false }); }
});

router.get('/archives', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required" });
  try {
    await connectDB();
    const archives = await Archive.find({ userId: req.user.googleId }).sort({ timestamp: -1 });
    res.json(archives);
  } catch (err) { res.status(500).json([]); }
});

app.use('/api', router);
app.use('/', router);
export default app;