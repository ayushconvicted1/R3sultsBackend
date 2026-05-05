const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/adminRolesController');

// All RBAC routes require authentication and SUPER_ADMIN role
router.use(authenticate);
router.use(requireRole('SUPER_ADMIN'));

// ─── ROLES ───
router.get('/roles', ctrl.getRoles);
router.post('/roles', ctrl.createRole);
router.get('/roles/:id', ctrl.getRoleById);
router.put('/roles/:id', ctrl.updateRole);
router.delete('/roles/:id', ctrl.deleteRole);

// ─── ACTIONS ───
router.get('/actions', ctrl.getActions);
router.post('/actions', ctrl.createAction);
router.get('/actions/:id', ctrl.getActionById);
router.put('/actions/:id', ctrl.updateAction);
router.delete('/actions/:id', ctrl.deleteAction);

// ─── ROLE-ACTION MAPPING ───
router.get('/roles/:roleId/actions', ctrl.getRoleActions);
router.post('/roles/:roleId/actions', ctrl.assignAction);
router.delete('/roles/:roleId/actions/:actionId', ctrl.revokeAction);

// Bulk operations
router.put('/roles/:roleId/actions/bulk', ctrl.bulkAssignActions);
router.post('/roles/:roleId/actions/bulk-add', ctrl.bulkAddActions);
router.delete('/roles/:roleId/actions/bulk-remove', ctrl.bulkRevokeActions);

// ─── UTILITY ───
router.get('/check', ctrl.checkPermission);

module.exports = router;
