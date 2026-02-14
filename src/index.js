require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Global Middleware ───
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global rate limiter
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' },
}));

// ─── Health Check ───
app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'Server is running', timestamp: new Date().toISOString() });
});
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'R3sults API is running', timestamp: new Date().toISOString() });
});

// ─── Routes ───
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/group', require('./routes/group'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/admin/volunteers', require('./routes/adminVolunteers'));
app.use('/api/volunteer', require('./routes/volunteer'));
app.use('/api/vendor', require('./routes/vendor'));
app.use('/api/tracking', require('./routes/tracking'));
app.use('/api/geofence', require('./routes/geofence'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/mobile', require('./routes/mobile'));
app.use('/api/weather', require('./routes/weather'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/disasters', require('./routes/disaster'));

// ─── Dev Endpoints ───
const prisma = require('./lib/prisma');
app.get('/api/dev/seed-info', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      take: 20,
      orderBy: { createdAt: 'asc' },
      select: { id: true, phoneNumber: true, email: true, fullName: true, role: true, isActive: true, createdAt: true },
    });
    res.json({ success: true, data: { users, message: 'Dev only — seeded user accounts' } });
  } catch (error) { next(error); }
});

// ─── 404 ───
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Error Handler ───
app.use(errorHandler);

// ─── Start Server ───
app.listen(PORT, () => {
  console.log(`🚀 R3sults API server running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
