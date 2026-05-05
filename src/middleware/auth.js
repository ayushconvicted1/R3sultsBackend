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
      let user = await prisma.user.findUnique({ where: { id: userId } });

      if (user && !user.isActive) {
        return res.status(401).json({ success: false, message: 'Inactive user account' });
      }

      if (!user) {
        // User not in local DB (e.g. super_admin from admin dashboard's MongoDB)
        // Trust the valid token claims and construct a user object
        const role = (decoded.role || 'MEMBER').toUpperCase();
        user = {
          id: userId,
          email: decoded.email,
          fullName: decoded.name || decoded.fullName || 'Unknown',
          roleName: role,
          isActive: true,
        };
      } else {
        // User from local DB, resolve roleName from roleId
        if (user.roleId) {
          const roleRecord = await prisma.role.findUnique({ where: { id: user.roleId } });
          user.roleName = roleRecord ? roleRecord.name : 'GUEST';
        } else {
          // Fallback if roleId is null
          user.roleName = 'GUEST';
        }
      }

      req.user = user;
      req.userType = 'user';
      // Normalize roleName to uppercase to handle tokens with lowercase roles
      if (req.user.roleName) {
        req.user.roleName = req.user.roleName.toUpperCase();
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
        if (user.roleId) {
          const roleRecord = await prisma.role.findUnique({ where: { id: user.roleId } });
          user.roleName = roleRecord ? roleRecord.name : 'GUEST';
        } else {
          user.roleName = 'GUEST';
        }
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
    const userRoleName = (req.user.roleName || '').toUpperCase();
    if (!roles.includes(userRoleName)) {
      return res.status(403).json({ 
        success: false, 
        message: `Insufficient permissions: your role '${userRoleName}' does not have access. Required: ${roles.join(', ')}`
      });
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
      const userRoleName = (req.user.roleName || '').toUpperCase();
      if (userRoleName === 'SUPER_ADMIN') return next();

      const rolePermission = await prisma.rolePermission.findUnique({
        where: { role_permission: { role: userRoleName, permission } },
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

const requireAction = (actionKey) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      // SUPER_ADMIN bypasses all action checks
      const userRoleName = (req.user.roleName || '').toUpperCase();
      if (userRoleName === 'SUPER_ADMIN') return next();

      const roleId = req.user.roleId || req.user.id; // OpsUser 'id' is often passed directly but OpsUser has a separate role text currently. Wait.
      // If user is OpsUser, they have a role directly but we should check role table. 
      // Let's resolve the role dynamically.
      let roleRecord;
      if (req.user.roleId) {
        roleRecord = await prisma.role.findUnique({ where: { id: req.user.roleId } });
      } else {
        roleRecord = await prisma.role.findUnique({ where: { name: userRoleName } });
      }

      if (!roleRecord) {
        return res.status(403).json({
          success: false,
          message: `Access denied: no role assigned to your account`
        });
      }

      // Find the action
      const action = await prisma.action.findUnique({ where: { actionKey } });
      if (!action || !action.isActive) {
        return res.status(403).json({
          success: false,
          message: `Access denied: action '${actionKey}' is not recognized or inactive`
        });
      }

      // Check the mapping
      const mapping = await prisma.roleActionMap.findUnique({
        where: { roleId_actionId: { roleId: roleRecord.id, actionId: action.id } }
      });

      if (!mapping) {
        return res.status(403).json({
          success: false,
          message: `Insufficient permissions: you do not have the '${actionKey}' permission`,
          error: {
            code: 'PERMISSION_DENIED',
            requiredAction: actionKey,
            userRole: userRoleName
          }
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { authenticate, optionalAuth, requireRole, requirePermission, requireAction };
