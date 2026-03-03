const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/broadcastController');

// All broadcast routes require admin authentication
router.use(authenticate);
router.use(requireRole('ADMIN', 'SUPER_ADMIN'));

/**
 * @swagger
 * /admin/broadcast:
 *   get:
 *     summary: List broadcasts with pagination
 *     tags: [Broadcast]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *         description: Items per page (max 100)
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by title or description
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *         description: Filter broadcasts created on or after this date
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *         description: Filter broadcasts created on or before this date
 *     responses:
 *       200: { description: 'Paginated list of broadcasts' }
 *       403: { description: 'Admin access required' }
 */
router.get('/', ctrl.getBroadcasts);

/**
 * @swagger
 * /admin/broadcast/{id}:
 *   get:
 *     summary: Get a single broadcast by ID
 *     tags: [Broadcast]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Broadcast ID
 *     responses:
 *       200: { description: 'Broadcast details' }
 *       404: { description: 'Broadcast not found' }
 *       403: { description: 'Admin access required' }
 */
router.get('/:id', ctrl.getBroadcastById);

/**
 * @swagger
 * /admin/broadcast:
 *   post:
 *     summary: Create a geo-targeted broadcast notification
 *     tags: [Broadcast]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [latitude, longitude, radius, title, description]
 *             properties:
 *               latitude:    { type: number, format: float, description: 'Center latitude' }
 *               longitude:   { type: number, format: float, description: 'Center longitude' }
 *               radius:      { type: number, description: 'Radius in meters' }
 *               title:       { type: string, description: 'Notification title' }
 *               description: { type: string, description: 'Notification body / description' }
 *     responses:
 *       201: { description: 'Broadcast sent successfully' }
 *       400: { description: 'Validation error' }
 *       403: { description: 'Admin access required' }
 */
router.post(
  '/',
  validate([
    body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
    body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
    body('radius').isFloat({ gt: 0 }).withMessage('Radius must be a positive number (meters)'),
    body('title').notEmpty().trim().withMessage('Title is required'),
    body('description').notEmpty().trim().withMessage('Description is required'),
  ]),
  ctrl.createBroadcast,
);

module.exports = router;
