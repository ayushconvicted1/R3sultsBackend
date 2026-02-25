const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/adminDisasterController');

router.use(authenticate);

router.get('/', ctrl.get_disasters);
router.post('/', ctrl.post_disasters);
router.get('/:id', ctrl.get_disasters__id);
router.put('/:id', ctrl.put_disasters__id);
router.delete('/:id', ctrl.delete_disasters__id);
router.post('/:id/assign-volunteer', ctrl.post_disasters__id_assign_volunteer);
router.delete('/:id/assign-volunteer', ctrl.delete_disasters__id_assign_volunteer);

module.exports = router;