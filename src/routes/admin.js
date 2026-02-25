const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const admin = require('../controllers/adminController');

router.use(authenticate);

// ─── Roles ───

/**
 * @swagger
 * /admin/roles:
 *   get:
 *     summary: List all roles
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: List of roles }
 */
router.get('/roles', requireRole('SUPER_ADMIN'), admin.getAllRoles);

/**
 * @swagger
 * /admin/roles/{role}/users:
 *   get:
 *     summary: Get users by role
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Users with specified role }
 */
router.get('/roles/:role/users', requireRole('SUPER_ADMIN', 'ADMIN'), admin.getUsersByRole);

// ─── Permissions ───

/**
 * @swagger
 * /admin/permissions:
 *   get:
 *     summary: List all permissions
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: List of permissions }
 */
router.get('/permissions', requireRole('SUPER_ADMIN'), admin.getAllPermissions);

/**
 * @swagger
 * /admin/permissions/roles/{role}:
 *   get:
 *     summary: Get permissions for a role
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Role permissions }
 *   post:
 *     summary: Assign permissions to a role
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [permissions]
 *             properties:
 *               permissions: { type: array, items: { type: string } }
 *     responses:
 *       200: { description: Permissions assigned }
 */
router.get('/permissions/roles/:role', requireRole('SUPER_ADMIN'), admin.getRolePermissions);
router.post('/permissions/roles/:role', requireRole('SUPER_ADMIN'), validate([
  body('permissions').isArray().withMessage('Permissions must be an array'),
]), admin.assignPermissions);

/**
 * @swagger
 * /admin/permissions/users/{userId}:
 *   get:
 *     summary: Get user permissions
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User permissions }
 */
router.get('/permissions/users/:userId', requireRole('SUPER_ADMIN', 'ADMIN'), admin.getUserPermissions);

/**
 * @swagger
 * /admin/permissions/check:
 *   post:
 *     summary: Check if user has permission
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, permission]
 *             properties:
 *               userId: { type: string }
 *               permission: { type: string }
 *     responses:
 *       200: { description: Permission check result }
 */
router.post('/permissions/check', requireRole('SUPER_ADMIN', 'ADMIN'), validate([
  body('userId').notEmpty(),
  body('permission').notEmpty(),
]), admin.checkPermission);

// ─── Accessibility ───

/**
 * @swagger
 * /admin/accessibility:
 *   get:
 *     summary: List all feature accessibility
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: Accessibility data }
 */
router.get('/accessibility', requireRole('SUPER_ADMIN'), admin.getAllAccessibility);

/**
 * @swagger
 * /admin/accessibility/role/{role}:
 *   get:
 *     summary: Get role feature accessibility
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Role accessibility }
 */
router.get('/accessibility/role/:role', requireRole('SUPER_ADMIN'), admin.getRoleAccessibility);

/**
 * @swagger
 * /admin/accessibility/role/{role}/feature/{feature}:
 *   patch:
 *     summary: Update feature access for a role
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: feature
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Feature access updated }
 */
router.patch('/accessibility/role/:role/feature/:feature', requireRole('SUPER_ADMIN'), admin.updateFeatureAccess);

/**
 * @swagger
 * /admin/accessibility/check:
 *   post:
 *     summary: Check feature access
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: Access check result }
 */
router.post('/accessibility/check', authenticate, admin.checkAccess);

// ─── Admin Profile ───

/**
 * @swagger
 * /admin/profile:
 *   get:
 *     summary: Get admin profile
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: Admin profile }
 */
router.get('/profile', requireRole('SUPER_ADMIN', 'ADMIN'), admin.getAdminProfile);

// ─── User Management ───

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: List all users
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: Paginated list of users }
 */
router.get('/users', requireRole('SUPER_ADMIN', 'ADMIN'), admin.listUsers);

/**
 * @swagger
 * /admin/users/{userId}:
 *   get:
 *     summary: Get user details
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User details }
 *   patch:
 *     summary: Update user
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *     responses:
 *       200: { description: User updated }
 */
router.get('/users/:userId', requireRole('SUPER_ADMIN', 'ADMIN'), admin.getUserDetails);
router.patch('/users/:userId', requireRole('SUPER_ADMIN', 'ADMIN'), upload.single('file'), admin.updateUser);

/**
 * @swagger
 * /admin/users/{userId}/activate:
 *   patch:
 *     summary: Activate user
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User activated }
 */
router.patch('/users/:userId/activate', requireRole('SUPER_ADMIN', 'ADMIN'), admin.activateUser);

/**
 * @swagger
 * /admin/users/{userId}/deactivate:
 *   patch:
 *     summary: Deactivate user
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User deactivated }
 */
router.patch('/users/:userId/deactivate', requireRole('SUPER_ADMIN', 'ADMIN'), admin.deactivateUser);

/**
 * @swagger
 * /admin/users/{userId}/role:
 *   get:
 *     summary: Get user role
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User role }
 *   patch:
 *     summary: Assign role to user
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role: { type: string, enum: [SUPER_ADMIN, ADMIN, MEMBER, GUEST] }
 *     responses:
 *       200: { description: Role assigned }
 */
router.get('/users/:userId/role', requireRole('SUPER_ADMIN', 'ADMIN'), admin.getUserRole);
router.patch('/users/:userId/role', requireRole('SUPER_ADMIN', 'ADMIN'), validate([
  body('role').isIn(['SUPER_ADMIN', 'ADMIN', 'MEMBER', 'GUEST']).withMessage('Invalid role'),
]), admin.assignRole);

module.exports = router;
