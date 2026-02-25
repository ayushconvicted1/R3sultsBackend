const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/adminSearchController');

router.use(authenticate);

router.get('/', ctrl.get_search);

module.exports = router;