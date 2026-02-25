const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/adminSeedController');

router.use(authenticate);

router.get('/', ctrl.get_seed);

module.exports = router;