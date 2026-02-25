const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/adminIncidentController');

router.use(authenticate);

router.get('/', ctrl.get_incidents);
router.post('/', ctrl.post_incidents);
router.put('/', ctrl.put_incidents);
router.delete('/', ctrl.delete_incidents);
router.post('/seed', ctrl.post_incidents_seed);

module.exports = router;