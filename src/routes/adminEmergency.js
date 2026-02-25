const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/adminEmergencyController');

router.use(authenticate);

router.get('/', ctrl.get_emergencies);
router.post('/', ctrl.post_emergencies);

module.exports = router;