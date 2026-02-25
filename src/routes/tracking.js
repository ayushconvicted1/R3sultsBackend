const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const tracking = require('../controllers/trackingController');

router.use(authenticate);

/**
 * @swagger
 * /tracking/location/all:
 *   get:
 *     summary: Get all user locations (Admin only)
 *     tags: [Tracking]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: All user locations }
 */
router.get('/location/all', requireRole('ADMIN', 'SUPER_ADMIN'), tracking.getAllLocations);

/**
 * @swagger
 * /tracking/location:
 *   post:
 *     summary: Update own location
 *     tags: [Tracking]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [latitude, longitude]
 *             properties:
 *               latitude: { type: number, format: float }
 *               longitude: { type: number, format: float }
 *     responses:
 *       200: { description: Location updated }
 */
router.post('/location', validate([
  body('latitude').isFloat(),
  body('longitude').isFloat(),
]), tracking.updateLocation);

/**
 * @swagger
 * /tracking/location/current:
 *   get:
 *     summary: Get own current location
 *     tags: [Tracking]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: Current location }
 */
router.get('/location/current', tracking.getCurrentLocation);

/**
 * @swagger
 * /tracking/location/current/{userId}:
 *   get:
 *     summary: Get a user's current location
 *     tags: [Tracking]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User's current location }
 */
router.get('/location/current/:userId', tracking.getUserCurrentLocation);

/**
 * @swagger
 * /tracking/location/history:
 *   get:
 *     summary: Get own location history
 *     tags: [Tracking]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: Location history }
 */
router.get('/location/history', tracking.getLocationHistory);

/**
 * @swagger
 * /tracking/location/history/{userId}:
 *   get:
 *     summary: Get user's location history
 *     tags: [Tracking]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User's location history }
 */
router.get('/location/history/:userId', tracking.getUserLocationHistory);

/**
 * @swagger
 * /tracking/location/share:
 *   post:
 *     summary: Share location with another user
 *     tags: [Tracking]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sharedWithId]
 *             properties:
 *               sharedWithId: { type: string }
 *     responses:
 *       200: { description: Location shared }
 */
router.post('/location/share', validate([
  body('sharedWithId').notEmpty(),
]), tracking.shareLocation);

/**
 * @swagger
 * /tracking/location/share/{userId}:
 *   delete:
 *     summary: Stop sharing location with user
 *     tags: [Tracking]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Sharing stopped }
 */
router.delete('/location/share/:userId', tracking.stopSharingLocation);

/**
 * @swagger
 * /tracking/location/shared:
 *   get:
 *     summary: Get users you are sharing location with
 *     tags: [Tracking]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: Shared-with users }
 */
router.get('/location/shared', tracking.getSharedWithUsers);

/**
 * @swagger
 * /tracking/location/visible:
 *   get:
 *     summary: Get users visible to you
 *     tags: [Tracking]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: Visible users }
 */
router.get('/location/visible', tracking.getVisibleUsers);

/**
 * @swagger
 * /tracking/location/multiple:
 *   post:
 *     summary: Get locations for multiple users
 *     tags: [Tracking]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userIds]
 *             properties:
 *               userIds: { type: array, items: { type: string } }
 *     responses:
 *       200: { description: Multiple user locations }
 */
router.post('/location/multiple', validate([
  body('userIds').isArray(),
]), tracking.getMultipleLocations);

/**
 * @swagger
 * /tracking/location/nearby:
 *   get:
 *     summary: Get nearby users
 *     tags: [Tracking]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: Nearby users }
 */
router.get('/location/nearby', tracking.getNearbyUsers);

/**
 * @swagger
 * /tracking/settings:
 *   put:
 *     summary: Update tracking settings
 *     tags: [Tracking]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: Settings updated }
 */
router.put('/settings', tracking.updateTrackingSettings);

module.exports = router;
