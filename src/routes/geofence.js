const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const geo = require('../controllers/geofenceController');

router.use(authenticate);

/**
 * @swagger
 * /geofence:
 *   post:
 *     summary: Create a geofence
 *     tags: [Geofence]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, centerLat, centerLng]
 *             properties:
 *               name: { type: string }
 *               centerLat: { type: number, format: float }
 *               centerLng: { type: number, format: float }
 *               radiusMeters: { type: number }
 *     responses:
 *       201: { description: Geofence created }
 *   get:
 *     summary: List all geofences
 *     tags: [Geofence]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: List of geofences }
 */
router.post('/', validate([
  body('name').notEmpty(),
  body('centerLat').isFloat(),
  body('centerLng').isFloat(),
]), geo.createGeofence);
router.get('/', geo.getAllGeofences);

/**
 * @swagger
 * /geofence/events:
 *   get:
 *     summary: Get user's geofence events
 *     tags: [Geofence]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: User geofence events }
 */
router.get('/events', geo.getUserGeofenceEvents);

/**
 * @swagger
 * /geofence/{id}:
 *   get:
 *     summary: Get geofence by ID
 *     tags: [Geofence]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Geofence details }
 *   put:
 *     summary: Update geofence
 *     tags: [Geofence]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Geofence updated }
 *   delete:
 *     summary: Delete geofence
 *     tags: [Geofence]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Geofence deleted }
 */
router.get('/:id', geo.getGeofence);
router.put('/:id', geo.updateGeofence);
router.delete('/:id', geo.deleteGeofence);

/**
 * @swagger
 * /geofence/{id}/events:
 *   get:
 *     summary: Get events for a geofence
 *     tags: [Geofence]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Geofence events }
 */
router.get('/:id/events', geo.getGeofenceEvents);

module.exports = router;
