const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/adminUserController');

router.use(authenticate);

router.get('/', ctrl.get_users);
router.post('/', ctrl.post_users);
router.put('/', ctrl.put_users);
router.delete('/', ctrl.delete_users);
router.get('/:id', ctrl.get_users__id);
router.put('/:id', ctrl.put_users__id);
router.delete('/:id', ctrl.delete_users__id);

// Create app user (Prisma User model — for admin panel)
router.post('/create-app-user', ctrl.createAppUser);

module.exports = router;