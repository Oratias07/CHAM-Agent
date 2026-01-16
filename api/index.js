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
// Essential for Vercel behind a proxy
app.set('trust proxy', 1);
app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI;

// --- STARTUP DIAGNOSTICS ---
console.log("--- SYSTEM STARTUP ---");
console.log("MONGODB_URI present:", !!MONGODB_URI);
console.log("GOOGLE_CLIENT_ID present:", !!process.env.GOOGLE_CLIENT_ID);
console.log("----------------------");

// Better connection management for Serverless
let cachedDb = null;
const connectDB = async () => {
  if (cachedDb && mongoose.connection.readyState === 1) return cachedDb;
  
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is missing in Vercel environment variables.");
  }
  
  console.log("Connecting to MongoDB...");
  try {
    const db = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
      socketTimeoutMS: 45000,
    });
    cachedDb = db;
    console.log("MongoDB Connected Successfully");
    return db;
  } catch (err) {
    console.error("MongoDB Connection Error:", err.message);
    throw err;
  }
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

// Configure session store
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
    ttl: 14 * 24 * 60 * 60,
    autoRemove: 'native'
  });
}

app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());

// Google Strategy
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
        console.error("Critical Error in Strategy Verify:", err.message);
        return done(err);
      }
    }
  ));
}

passport.serializeUser((user, done) => {
  if (user && user.id) {
    done(null, user.id);
  } else {
    done(new Error("Failed to serialize user: ID missing"), null);
  }
});

passport.deserializeUser(async (id, done) => {
  try {
    await connectDB();
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Diagnostic route
app.get('/api/test-db', async (req, res) => {
  try {
    await connectDB();
    res.json({ status: "success", message: "Database is connected!" });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
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
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

// Enhanced Callback with Error Visibility
app.get('/api/auth/google/callback', (req, res, next) => {
  passport.authenticate('google', (err, user, info) => {
    if (err) {
      // THIS WILL SHOW YOU THE ACTUAL ERROR IN THE BROWSER
      return res.status(500).send(`
        <h1>Login Error</h1>
        <p>The server encountered an error during the Google login process.</p>
        <pre style="background: #f4f4f4; padding: 15px; border-radius: 5px; color: red;">${err.message}</pre>
        <p><strong>Common causes:</strong> 
          1. MongoDB IP Whitelist (add 0.0.0.0/0 in Atlas). 
          2. Incorrect MongoDB password in MONGODB_URI.
        </p>
        <a href="/">Try Again</a>
      `);
    }
    if (!user) {
      return res.redirect('/login');
    }
    req.logIn(user, (err) => {
      if (err) return next(err);
      return res.redirect('/');
    });
  })(req, res, next);
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