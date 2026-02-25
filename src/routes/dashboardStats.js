const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/dashboardStatsController');

router.use(authenticate);

router.get('/stats', ctrl.get_dashboard_stats);

module.exports = router;