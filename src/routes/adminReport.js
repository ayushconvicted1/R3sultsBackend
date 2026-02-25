const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/adminReportController');

router.use(authenticate);

router.get('/', ctrl.get_reports);
router.post('/', ctrl.post_reports);

module.exports = router;