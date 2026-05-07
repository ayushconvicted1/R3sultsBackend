const router = require('express').Router();
const { authenticate, requireAction } = require('../middleware/auth');
const ctrl = require('../controllers/opsUserController');

router.use(authenticate);

// List ops users
router.get('/', requireAction('opsUsers.list'), ctrl.get_ops_users);

// Create ops user
router.post('/', requireAction('opsUsers.create'), ctrl.post_ops_users);

// Update ops user
router.put('/', requireAction('opsUsers.update'), ctrl.put_ops_users);

// Delete ops user
router.delete('/', requireAction('opsUsers.delete'), ctrl.delete_ops_users);

// Utility ops user endpoints
router.get('/me', ctrl.get_ops_users_me);
router.post('/change-password', ctrl.post_ops_users_change_password);
router.post('/seed', requireAction('opsUsers.seed'), ctrl.post_ops_users_seed);

module.exports = router;