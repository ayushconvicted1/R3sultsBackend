const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const vol = require('../controllers/volunteerController');

router.use(authenticate);
router.use(requireRole('SUPER_ADMIN', 'ADMIN'));

router.get('/', vol.listVolunteers);
router.get('/:volunteerId', vol.getVolunteerDetails);

router.patch('/:volunteerId/approve', vol.approveVolunteer);

router.patch('/:volunteerId/reject', validate([
  body('rejectionReason').notEmpty().withMessage('Rejection reason is required'),
]), vol.rejectVolunteer);

router.patch('/:volunteerId/suspend', vol.suspendVolunteer);
router.patch('/:volunteerId/reactivate', vol.reactivateVolunteer);

router.patch('/:volunteerId/notes', validate([
  body('notes').notEmpty().withMessage('Notes are required'),
]), vol.updateVolunteerNotes);

module.exports = router;
