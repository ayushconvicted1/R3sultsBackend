const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const admin = require('../controllers/adminController');

router.use(authenticate);

// Roles
router.get('/roles', requireRole('SUPER_ADMIN'), admin.getAllRoles);
router.get('/roles/:role/users', requireRole('SUPER_ADMIN', 'ADMIN'), admin.getUsersByRole);

// Permissions
router.get('/permissions', requireRole('SUPER_ADMIN'), admin.getAllPermissions);
router.get('/permissions/roles/:role', requireRole('SUPER_ADMIN'), admin.getRolePermissions);
router.post('/permissions/roles/:role', requireRole('SUPER_ADMIN'), validate([
  body('permissions').isArray().withMessage('Permissions must be an array'),
]), admin.assignPermissions);
router.get('/permissions/users/:userId', requireRole('SUPER_ADMIN', 'ADMIN'), admin.getUserPermissions);
router.post('/permissions/check', requireRole('SUPER_ADMIN', 'ADMIN'), validate([
  body('userId').notEmpty(),
  body('permission').notEmpty(),
]), admin.checkPermission);

// Accessibility
router.get('/accessibility', requireRole('SUPER_ADMIN'), admin.getAllAccessibility);
router.get('/accessibility/role/:role', requireRole('SUPER_ADMIN'), admin.getRoleAccessibility);
router.patch('/accessibility/role/:role/feature/:feature', requireRole('SUPER_ADMIN'), admin.updateFeatureAccess);
router.post('/accessibility/check', authenticate, admin.checkAccess);

// Admin Profile
router.get('/profile', requireRole('SUPER_ADMIN', 'ADMIN'), admin.getAdminProfile);

// User Management
router.get('/users', requireRole('SUPER_ADMIN', 'ADMIN'), admin.listUsers);
router.get('/users/:userId', requireRole('SUPER_ADMIN', 'ADMIN'), admin.getUserDetails);
router.patch('/users/:userId', requireRole('SUPER_ADMIN', 'ADMIN'), upload.single('file'), admin.updateUser);
router.patch('/users/:userId/activate', requireRole('SUPER_ADMIN', 'ADMIN'), admin.activateUser);
router.patch('/users/:userId/deactivate', requireRole('SUPER_ADMIN', 'ADMIN'), admin.deactivateUser);
router.get('/users/:userId/role', requireRole('SUPER_ADMIN', 'ADMIN'), admin.getUserRole);
router.patch('/users/:userId/role', requireRole('SUPER_ADMIN', 'ADMIN'), validate([
  body('role').isIn(['SUPER_ADMIN', 'ADMIN', 'MEMBER', 'GUEST']).withMessage('Invalid role'),
]), admin.assignRole);

module.exports = router;
