require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Global Middleware ───
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
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

// ─── Swagger Docs ───
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'R3sults API Docs',
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
app.use('/api/shop/orders', require('./routes/shopOrders'));
app.use('/api/mobile', require('./routes/mobile'));
app.use('/api/weather', require('./routes/weather'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/disasters', require('./routes/disaster'));
app.use('/api/notifications', require('./routes/notification'));
app.use('/api/volunteers', require('./routes/volunteersAlias'));
app.use('/api/resource-locator', require('./routes/resourceLocator'));
app.use('/api/live-disasters', require('./routes/liveDisaster'));
app.use('/api/currency', require('./routes/currency'));

// ─── Admin Dashboard Routes (migrated from Next.js) ───
app.use('/api/admin-auth', require('./routes/adminAuth'));
app.use('/api/admin/dashboard', require('./routes/dashboardStats'));
app.use('/api/admin/ops-users', require('./routes/opsUser'));
app.use('/api/admin/disasters', require('./routes/adminDisaster'));
app.use('/api/admin/emergencies', require('./routes/adminEmergency'));
app.use('/api/admin/shelters', require('./routes/adminShelter'));
app.use('/api/admin/devices', require('./routes/adminDevice'));
app.use('/api/admin/incidents', require('./routes/adminIncident'));
app.use('/api/admin/inventory', require('./routes/adminInventory'));
app.use('/api/admin/damage-reports', require('./routes/adminDamageReport'));
app.use('/api/admin/adjusters', require('./routes/adminAdjuster'));
app.use('/api/admin/volunteer-mgmt', require('./routes/adminVolunteer'));
app.use('/api/admin/volunteer-teams', require('./routes/adminVolunteerTeam'));
app.use('/api/admin/products', require('./routes/adminProduct'));
app.use('/api/admin/orders', require('./routes/adminOrder'));
app.use('/api/admin/services', require('./routes/adminService'));
app.use('/api/admin/users-mgmt', require('./routes/adminUser'));
app.use('/api/admin/reports', require('./routes/adminReport'));
app.use('/api/admin/search', require('./routes/adminSearch'));
app.use('/api/admin/seed', require('./routes/adminSeed'));
app.use('/api/admin/mobile', require('./routes/adminMobile'));
app.use('/api/admin/broadcast', require('./routes/broadcast'));

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
  console.log(`📖 API Docs: http://localhost:${PORT}/api-docs`);
});

module.exports = app;
