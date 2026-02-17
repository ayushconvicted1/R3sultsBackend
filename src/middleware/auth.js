const { verifyToken } = require('../utils/token');
const prisma = require('../lib/prisma');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Access token required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (decoded.type === 'volunteer') {
      const volunteer = await prisma.volunteer.findUnique({ where: { id: decoded.id } });
      if (!volunteer || !volunteer.isActive) {
        return res.status(401).json({ success: false, message: 'Invalid or inactive volunteer account' });
      }
      req.user = volunteer;
      req.userType = 'volunteer';
    } else if (decoded.type === 'vendor') {
      const vendor = await prisma.vendor.findUnique({ where: { id: decoded.id } });
      if (!vendor || !vendor.isActive) {
        return res.status(401).json({ success: false, message: 'Invalid or inactive vendor account' });
      }
      req.user = vendor;
      req.userType = 'vendor';
    } else {
      // Support both 'id' (main backend tokens) and 'userId' (admin dashboard tokens)
      const userId = decoded.id || decoded.userId;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || !user.isActive) {
        return res.status(401).json({ success: false, message: 'Invalid or inactive user account' });
      }
      req.user = user;
      req.userType = 'user';
      // Normalize role to uppercase to handle tokens with lowercase roles (e.g. from admin dashboard)
      if (req.user.role) {
        req.user.role = req.user.role.toUpperCase();
      }
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);
      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (user && user.isActive) {
        req.user = user;
        req.userType = 'user';
      }
    }
  } catch (error) {
    // Ignore auth errors for optional auth
  }
  next();
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    next();
  };
};

const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
      if (req.user.role === 'SUPER_ADMIN') return next();

      const rolePermission = await prisma.rolePermission.findUnique({
        where: { role_permission: { role: req.user.role, permission } },
      });
      if (!rolePermission) {
        return res.status(403).json({ success: false, message: 'Insufficient permissions' });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { authenticate, optionalAuth, requireRole, requirePermission };
