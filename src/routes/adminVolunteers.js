const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const vol = require('../controllers/volunteerController');

router.use(authenticate);
router.use(requireRole('SUPER_ADMIN', 'ADMIN'));

/**
 * @swagger
 * /admin/volunteers:
 *   get:
 *     summary: List all volunteers
 *     tags: [Admin Volunteers]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: List of volunteers }
 */
router.get('/', vol.listVolunteers);

/**
 * @swagger
 * /admin/volunteers/{volunteerId}:
 *   get:
 *     summary: Get volunteer details
 *     tags: [Admin Volunteers]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: volunteerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Volunteer details }
 */
router.get('/:volunteerId', vol.getVolunteerDetails);

/**
 * @swagger
 * /admin/volunteers/{volunteerId}/approve:
 *   patch:
 *     summary: Approve a volunteer
 *     tags: [Admin Volunteers]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: volunteerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Volunteer approved }
 */
router.patch('/:volunteerId/approve', vol.approveVolunteer);

/**
 * @swagger
 * /admin/volunteers/{volunteerId}/reject:
 *   patch:
 *     summary: Reject a volunteer
 *     tags: [Admin Volunteers]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: volunteerId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rejectionReason]
 *             properties:
 *               rejectionReason: { type: string }
 *     responses:
 *       200: { description: Volunteer rejected }
 */
router.patch('/:volunteerId/reject', validate([
  body('rejectionReason').notEmpty().withMessage('Rejection reason is required'),
]), vol.rejectVolunteer);

/**
 * @swagger
 * /admin/volunteers/{volunteerId}/suspend:
 *   patch:
 *     summary: Suspend a volunteer
 *     tags: [Admin Volunteers]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: volunteerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Volunteer suspended }
 */
router.patch('/:volunteerId/suspend', vol.suspendVolunteer);

/**
 * @swagger
 * /admin/volunteers/{volunteerId}/reactivate:
 *   patch:
 *     summary: Reactivate a volunteer
 *     tags: [Admin Volunteers]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: volunteerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Volunteer reactivated }
 */
router.patch('/:volunteerId/reactivate', vol.reactivateVolunteer);

/**
 * @swagger
 * /admin/volunteers/{volunteerId}/notes:
 *   patch:
 *     summary: Update volunteer admin notes
 *     tags: [Admin Volunteers]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: volunteerId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [notes]
 *             properties:
 *               notes: { type: string }
 *     responses:
 *       200: { description: Notes updated }
 */
router.patch('/:volunteerId/notes', validate([
  body('notes').notEmpty().withMessage('Notes are required'),
]), vol.updateVolunteerNotes);

module.exports = router;
