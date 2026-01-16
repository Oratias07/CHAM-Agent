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

// 1. DATABASE CONNECTION MANAGEMENT
let cachedDb = null;

const getSafeUri = () => {
  let uri = process.env.MONGODB_URI ? process.env.MONGODB_URI.trim() : null;
  if (!uri) return null;

  // Add a database name if it's missing to ensure collections are created in the right place
  if (uri.includes('.net/?')) {
    uri = uri.replace('.net/?', '.net/st_grader_db?');
  } else if (uri.includes('.net') && !uri.includes('.net/')) {
    uri = uri.replace('.net', '.net/st_grader_db');
  }
  return uri;
};

const connectDB = async () => {
  const uri = getSafeUri();
  
  if (!uri) {
    throw new Error("MONGODB_URI is empty or undefined in Vercel environment variables.");
  }

  if (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://")) {
    throw new Error(`Invalid URI scheme. Your URI starts with "${uri.substring(0, 10)}...". It must start with "mongodb://" or "mongodb+srv://"`);
  }

  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }

  console.log("Connecting to MongoDB...");
  try {
    // Clear any previous failed connection state
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    const db = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      appName: 'st-system-db'
    });
    
    cachedDb = db;
    console.log("MongoDB Connected Successfully");
    return db;
  } catch (err) {
    console.error("Database Connection Error:", err.message);
    if (err.message.includes('auth failed') || err.message.includes('bad auth')) {
      throw new Error("AUTHENTICATION_FAILED: The password or username in your MONGODB_URI is wrong. Please check MongoDB Atlas -> Database Access.");
    }
    throw err;
  }
};

// Define Schemas
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

// 2. SESSION CONFIGURATION
const uri = getSafeUri();
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'st-system-secret-9922',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 1000 * 60 * 60 * 24 * 7,
    secure: true, 
    sameSite: 'none'
  }
};

if (uri) {
  sessionConfig.store = MongoStore.create({ 
    mongoUrl: uri,
    ttl: 14 * 24 * 60 * 60,
    autoRemove: 'native'
  });
}

app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());

// 3. PASSPORT GOOGLE STRATEGY
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
        return done(err);
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

// 4. API ROUTES
const router = express.Router();

// DIAGNOSTIC ROUTE
router.get('/test-db', async (req, res) => {
  const rawUri = process.env.MONGODB_URI || '';
  const maskedUri = rawUri.length > 15 
    ? `${rawUri.substring(0, 12)}...${rawUri.substring(rawUri.indexOf('@'))}` 
    : 'EMPTY';

  try {
    await connectDB();
    res.json({ 
      status: "success", 
      message: "Database connection established!",
      dbName: mongoose.connection.name,
      uriPreview: maskedUri
    });
  } catch (err) {
    res.status(500).json({ 
      status: "error", 
      message: err.message,
      uriPreview: maskedUri,
      hint: "If message is 'bad auth', your password in Atlas does not match the URI."
    });
  }
});

router.get('/auth/me', async (req, res) => {
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

router.get('/auth/google', (req, res, next) => {
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

router.get('/auth/google/callback', (req, res, next) => {
  passport.authenticate('google', (err, user, info) => {
    if (err) {
      return res.status(500).send(`
        <div style="font-family: sans-serif; padding: 40px; border: 2px solid red; background: #fff5f5; border-radius: 10px; max-width: 600px; margin: 40px auto;">
          <h1 style="color: #c53030;">MongoDB Connection Error</h1>
          <p>The login was successful via Google, but the app could not save your session to MongoDB.</p>
          <div style="background: #eee; padding: 15px; border-radius: 5px; font-family: monospace; overflow-x: auto;">
            <strong>Error:</strong> ${err.message}
          </div>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #fed7d7;" />
          <h3 style="color: #c53030;">How to fix "Bad Auth":</h3>
          <ol>
            <li>Go to <strong>Database Access</strong> in MongoDB Atlas.</li>
            <li>Edit the user <strong>Vercel-Admin-st-system-db</strong>.</li>
            <li>Click "Edit Password" and type a new one (avoid special characters).</li>
            <li>Update your Vercel Environment Variables with the new URI.</li>
            <li><strong>REDEPLOY</strong> the project on Vercel.</li>
          </ol>
          <a href="/" style="display: inline-block; padding: 10px 20px; background: #3182ce; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">Try Again</a>
        </div>
      `);
    }
    if (!user) return res.redirect('/login');
    req.logIn(user, (err) => {
      if (err) return next(err);
      return res.redirect('/');
    });
  })(req, res, next);
});

router.get('/auth/logout', (req, res) => {
  req.logout((err) => res.redirect('/'));
});

router.post('/evaluate', async (req, res) => {
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

router.post('/grades/save', async (req, res) => {
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

router.get('/grades', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required" });
  try {
    await connectDB();
    const grades = await Grade.find({ userId: req.user.googleId });
    res.json(grades);
  } catch (err) {
    res.status(500).json([]);
  }
});

app.use('/api', router);
app.use('/', router);

export default app;