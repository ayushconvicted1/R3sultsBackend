const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/adminDamageReportController');

router.use(authenticate);

router.get('/', ctrl.get_damage_reports);
router.post('/', ctrl.post_damage_reports);
router.get('/:id', ctrl.get_damage_reports__id);
router.put('/:id', ctrl.put_damage_reports__id);
router.delete('/:id', ctrl.delete_damage_reports__id);
router.post('/seed', ctrl.post_damage_reports_seed);
router.delete('/seed', ctrl.delete_damage_reports_seed);

module.exports = router;