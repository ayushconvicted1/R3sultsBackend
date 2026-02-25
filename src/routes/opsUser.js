const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/opsUserController');

router.use(authenticate);

router.get('/', ctrl.get_ops_users);
router.post('/', ctrl.post_ops_users);
router.put('/', ctrl.put_ops_users);
router.delete('/', ctrl.delete_ops_users);
router.get('/me', ctrl.get_ops_users_me);
router.post('/change-password', ctrl.post_ops_users_change_password);
router.post('/seed', ctrl.post_ops_users_seed);

module.exports = router;