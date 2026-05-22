const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('./middlewares/rateLimiter');
const morgan = require('morgan');
const logger = require('./utils/logger');
const errorHandler = require('./middlewares/errorHandler');

const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');
const teacherRouter = require('./routes/teacher');
const studentRouter = require('./routes/student');
const aiRouter = require('./routes/ai');

const app = express();
app.use(helmet());
app.use(cors({ origin: true }));
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimit);
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/teacher', teacherRouter);
app.use('/api/student', studentRouter);
app.use('/api/ai', aiRouter);

app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Centralized error handler (must be after routes)
app.use(errorHandler);

module.exports = app;
