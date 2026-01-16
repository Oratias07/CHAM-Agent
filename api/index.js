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

const MONGODB_URI = process.env.MONGODB_URI;

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  if (!MONGODB_URI) return;
  return mongoose.connect(MONGODB_URI);
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

app.use(session({
  secret: process.env.SESSION_SECRET || 'gradersaas-secret',
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

const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Login required" });
};

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

app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/api/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => res.redirect('/')
);

app.get('/api/auth/logout', (req, res) => {
  req.logout(() => res.redirect('/'));
});

// CHAT ASSISTANT PROXY
app.post('/api/chat', isAuthenticated, async (req, res) => {
  try {
    const { message, history } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [...history, { role: 'user', parts: [{ text: message }] }],
    });
    res.json({ text: response.text });
  } catch (err) {
    res.status(500).json({ text: "I'm having trouble thinking right now. Please try again later." });
  }
});

app.post('/api/evaluate', isAuthenticated, async (req, res) => {
  try {
    const { question, rubric, studentCode } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', 
      contents: `Grade this code. Rubric: ${rubric}. Question: ${question}. Student: ${studentCode}. Feedback in Hebrew. Output ONLY valid JSON: {"score": number, "feedback": "string"}`,
      config: { responseMimeType: "application/json" }
    });
    res.json(JSON.parse(response.text));
  } catch (err) {
    res.status(500).json({ message: "AI Evaluation failed" });
  }
});

app.post('/api/grades/save', isAuthenticated, async (req, res) => {
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

app.get('/api/grades', isAuthenticated, async (req, res) => {
  try {
    await connectDB();
    const grades = await Grade.find({ userId: req.user.googleId });
    res.json(grades);
  } catch (err) {
    res.status(500).json([]);
  }
});

export default app;