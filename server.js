require('dotenv').config();
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('mongo-sanitize');
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const uploadDirs = [
  'uploads',
  'uploads/student-photos',
  'uploads/birth-certificates',
  'uploads/payment-proofs'
];

uploadDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});
const teacherRoutes = require('./routes/teachers');
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const activityRoutes = require('./routes/activities');
const categoryRoutes = require('./routes/categories');
const adminRoutes = require('./routes/admin');
const { requireTeacher } = require('./middleware/auth');
const teamRoutes = require('./routes/teams');
const app = express();

const PORT = process.env.PORT || 3000;
const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/school_activity_app';
app.set('trust proxy', 1);

const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)) {
  throw new Error('SESSION_SECRET must be set to a strong random value of at least 32 characters in production.');
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  next();
});

app.use((req, res, next) => {
  req.body = mongoSanitize(req.body);
  req.query = mongoSanitize(req.query);
  req.params = mongoSanitize(req.params);
  next();
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'محاولات تسجيل دخول كثيرة. حاول مرة أخرى بعد 15 دقيقة.' }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'محاولات تسجيل كثيرة. حاول مرة أخرى لاحقًا.' }
});

app.use('/api/auth/student/login', authLimiter);
app.use('/api/auth/teacher/login', authLimiter);
app.use('/api/students/register', registerLimiter);
app.use((req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  next();
});
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-only-change-this-secret-before-production',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MONGODB_URI }),
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      maxAge: 1000 * 60 * 60 * 4
}
  })
);
app.use('/api/teachers', teacherRoutes);
app.use('/public', express.static(path.join(__dirname, 'public')));

// IMPORTANT:
// Do NOT expose uploads publicly.
// This line was removed:

app.get('/', (req, res) => {
  res.redirect('/public/index.html');
});

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/admin', adminRoutes);

// View protected uploaded files.
// Only logged-in teachers can open these.
app.get('/protected/uploads/:folder/:filename', requireTeacher, (req, res) => {
  const { folder, filename } = req.params;

  const allowedFolders = ['student-photos', 'birth-certificates', 'payment-proofs'];

  if (!allowedFolders.includes(folder)) {
    return res.status(403).send('Forbidden');
  }

  const safeFileName = path.basename(filename);
  const filePath = path.join(__dirname, 'uploads', folder, safeFileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  res.sendFile(filePath);
});

// Download protected uploaded files.
// Only logged-in teachers can download these.
app.get('/protected/download/:folder/:filename', requireTeacher, (req, res) => {
  const { folder, filename } = req.params;

  const allowedFolders = ['student-photos', 'birth-certificates', 'payment-proofs'];

  if (!allowedFolders.includes(folder)) {
    return res.status(403).send('Forbidden');
  }

  const safeFileName = path.basename(filename);
  const filePath = path.join(__dirname, 'uploads', folder, safeFileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  res.download(filePath);
});

app.use((err, req, res, next) => {
  if (err) {
    return res.status(400).json({
      error: err.message || 'Request failed'
    });
  }

  next();
});

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
