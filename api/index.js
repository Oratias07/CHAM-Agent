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

const MONGODB_URI = process.env.MONGODB_URI;

// Better connection management for Serverless
let cachedDb = null;
const connectDB = async () => {
  if (cachedDb) return cachedDb;
  if (!MONGODB_URI) {
    console.error("CRITICAL: MONGODB_URI is not defined in environment variables.");
    throw new Error("Database configuration missing (MONGODB_URI)");
  }
  
  const db = await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  cachedDb = db;
  return db;
};

const UserSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true },
  name: String,
  email: String,
  picture: String,
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
const Grade = mongoose.models.Grade || mongoose.model('Grade', GradeSchema);

// Configure session store safely
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'gradersaas-ultra-secret-key-99',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 1000 * 60 * 60 * 24 * 7,
    secure: true, 
    sameSite: 'none'
  }
};

if (MONGODB_URI) {
  sessionConfig.store = MongoStore.create({ 
    mongoUrl: MONGODB_URI,
    ttl: 14 * 24 * 60 * 60 
  });
}

app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());

// Initialize Google Strategy
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
        console.error("OAuth DB Error:", err.message);
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

app.get('/api/auth/me', async (req, res) => {
  if (req.user) {
    res.json({
      id: req.user.googleId,
      name: req.user.name,
      email: req.user.email,
      picture: req.user.picture
    });
  } else {
    res.status(401).json(null);
  }
});

app.get('/api/auth/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({ error: "Configuration Error: Google Client ID or Secret is missing in Vercel settings." });
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

app.get('/api/auth/google/callback', (req, res, next) => {
  passport.authenticate('google', { 
    failureRedirect: '/login',
    failureMessage: true 
  })(req, res, next);
}, (req, res) => {
  res.redirect('/');
});

app.get('/api/auth/logout', (req, res) => {
  req.logout((err) => {
    res.redirect('/');
  });
});

app.post('/api/evaluate', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required" });
  try {
    const { question, rubric, studentCode } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', 
      contents: `Grade this code. Rubric: ${rubric}. Question: ${question}. Student: ${studentCode}. Feedback in Hebrew. Output JSON: {"score": number, "feedback": "string"}`,
      config: { responseMimeType: "application/json" }
    });
    res.json(JSON.parse(response.text));
  } catch (err) {
    res.status(500).json({ message: "AI Evaluation failed" });
  }
});

app.post('/api/grades/save', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required" });
  try {
    await connectDB();
    const { exerciseId, studentId, score, feedback } = req.body;
    await Grade.findOneAndUpdate(
      { userId: req.user.googleId, exerciseId, studentId },
      { score, feedback, timestamp: Date.now() },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

app.get('/api/grades', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required" });
  try {
    await connectDB();
    const grades = await Grade.find({ userId: req.user.googleId });
    res.json(grades);
  } catch (err) {
    res.status(500).json([]);
  }
});

export default app;