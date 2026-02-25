const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/adminMobileController');

router.use(authenticate);

router.get('/alerts', ctrl.get_mobile_alerts);
router.get('/tasks', ctrl.get_mobile_tasks);
router.get('/tasks/:disasterId', ctrl.get_mobile_tasks__disasterId);
router.post('/tasks/accept', ctrl.post_mobile_tasks_accept);
router.post('/tasks/decline', ctrl.post_mobile_tasks_decline);

module.exports = router;