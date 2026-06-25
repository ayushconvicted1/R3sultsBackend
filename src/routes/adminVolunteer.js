const router = require('express').Router();
const { authenticate, optionalAuth, requireAction } = require('../middleware/auth');
const ctrl = require('../controllers/adminVolunteerController');

// POST / uses optionalAuth — non-admin callers can add volunteers (unverified),
// while admin callers with a valid token get auto-verified volunteers.
router.post('/', optionalAuth, ctrl.post_volunteers);

// All other routes require full authentication + action-based permissions
router.get('/', authenticate, requireAction('volunteers.list'), ctrl.get_volunteers);
router.put('/', authenticate, requireAction('volunteers.update'), ctrl.put_volunteers);
router.delete('/', authenticate, requireAction('volunteers.delete'), ctrl.delete_volunteers);
router.post('/:id/assign-disaster', authenticate, requireAction('volunteers.assignDisaster'), ctrl.post_volunteers__id_assign_disaster);
router.post('/seed', authenticate, requireAction('volunteers.seed'), ctrl.post_volunteers_seed);
router.post('/mobile-login', authenticate, requireAction('volunteers.mobileLogin'), ctrl.post_volunteers_mobile_login);

module.exports = router;