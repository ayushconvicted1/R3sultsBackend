const router = require('express').Router();
const { authenticate, requireAction } = require('../middleware/auth');
const ctrl = require('../controllers/adminVolunteerController');

router.use(authenticate);

router.get('/', requireAction('volunteers.list'), ctrl.get_volunteers);
router.post('/', requireAction('volunteers.create'), ctrl.post_volunteers);
router.put('/', requireAction('volunteers.update'), ctrl.put_volunteers);
router.delete('/', requireAction('volunteers.delete'), ctrl.delete_volunteers);
router.post('/:id/assign-disaster', requireAction('volunteers.assignDisaster'), ctrl.post_volunteers__id_assign_disaster);
router.post('/seed', requireAction('volunteers.seed'), ctrl.post_volunteers_seed);
router.post('/mobile-login', requireAction('volunteers.mobileLogin'), ctrl.post_volunteers_mobile_login);

module.exports = router;