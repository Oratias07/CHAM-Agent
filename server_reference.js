/**
 * PRODUCTION BACKEND (Node.js/Express)
 * This server uses the credentials you provided to authenticate users and save data to MongoDB.
 */

const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const MongoStore = require('connect-mongo');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(express.json());

// 1. DATABASE CONNECTION
// Use the MONGODB_URI environment variable you set in Vercel
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch(err => console.error("MongoDB Connection Error:", err));

// Database Schemas
const UserSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true },
  name: String,
  email: String,
  picture: String,
});

const GradeSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true }, // The teacher's ID
  studentId: String,
  exerciseId: String,
  score: Number,
  feedback: String,
  timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Grade = mongoose.model('Grade', GradeSchema);

// 2. AUTHENTICATION CONFIG (Google OAuth)
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }), // Save sessions in DB
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } // 1 week
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
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

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

// 3. SECURE API ENDPOINTS

const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Login required" });
};

// Route to get current user session
app.get('/api/auth/me', (req, res) => {
  if (req.user) {
    res.json({
      id: req.user.googleId,
      name: req.user.name,
      email: req.user.email,
      picture: req.user.picture
    });
  } else {
    res.status(401).send();
  }
});

// OAuth Entry point
app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// OAuth Callback
app.get('/api/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => res.redirect('/')
);

// Evaluation Proxy (Protects API Key)
app.post('/api/evaluate', isAuthenticated, async (req, res) => {
  try {
    const { question, masterSolution, rubric, studentCode, customInstructions } = req.body;
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Evaluate this code based on rubric: ${rubric}. Question: ${question}. Student: ${studentCode}`,
      config: { responseMimeType: "application/json" }
    });

    res.json(JSON.parse(response.text));
  } catch (err) {
    res.status(500).json({ message: "AI Evaluation failed" });
  }
});

// Persistence Routes
app.post('/api/grades/save', isAuthenticated, async (req, res) => {
  const { exerciseId, studentId, score, feedback } = req.body;
  await Grade.findOneAndUpdate(
    { userId: req.user.googleId, exerciseId, studentId },
    { score, feedback, timestamp: Date.now() },
    { upsert: true }
  );
  res.json({ success: true });
});

app.get('/api/grades', isAuthenticated, async (req, res) => {
  const grades = await Grade.find({ userId: req.user.googleId });
  res.json(grades);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend live on port ${PORT}`));