const router = require('express').Router();
const { authenticate, requireAction } = require('../middleware/auth');
const ctrl = require('../controllers/adminDisasterController');

router.use(authenticate);

router.get('/', requireAction('disasters.list'), ctrl.get_disasters);
router.post('/', requireAction('disasters.create'), ctrl.post_disasters);
router.get('/:id', requireAction('disasters.read'), ctrl.get_disasters__id);
router.put('/:id', requireAction('disasters.update'), ctrl.put_disasters__id);
router.delete('/:id', requireAction('disasters.delete'), ctrl.delete_disasters__id);
router.post('/:id/assign-volunteer', requireAction('disasters.assignVolunteer'), ctrl.post_disasters__id_assign_volunteer);
router.delete('/:id/assign-volunteer', requireAction('disasters.removeVolunteer'), ctrl.delete_disasters__id_assign_volunteer);

module.exports = router;