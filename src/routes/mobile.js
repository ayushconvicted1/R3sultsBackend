const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, optionalAuth } = require('../middleware/auth');
const mobile = require('../controllers/mobileController');

/**
 * @swagger
 * /mobile/tasks:
 *   get:
 *     summary: Get volunteer tasks
 *     tags: [Mobile]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: List of tasks }
 */
router.get('/tasks', authenticate, mobile.getTasks);

/**
 * @swagger
 * /mobile/tasks/{disasterId}:
 *   get:
 *     summary: Get task by disaster ID
 *     tags: [Mobile]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: disasterId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Task details }
 */
router.get('/tasks/:disasterId', authenticate, mobile.getTaskById);

/**
 * @swagger
 * /mobile/tasks/accept:
 *   post:
 *     summary: Accept a volunteer task
 *     tags: [Mobile]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [disasterId]
 *             properties:
 *               disasterId: { type: string }
 *     responses:
 *       200: { description: Task accepted }
 */
router.post('/tasks/accept', authenticate, validate([
  body('disasterId').notEmpty(),
]), mobile.acceptTask);

/**
 * @swagger
 * /mobile/tasks/decline:
 *   post:
 *     summary: Decline a volunteer task
 *     tags: [Mobile]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [disasterId]
 *             properties:
 *               disasterId: { type: string }
 *     responses:
 *       200: { description: Task declined }
 */
router.post('/tasks/decline', authenticate, validate([
  body('disasterId').notEmpty(),
]), mobile.declineTask);

/**
 * @swagger
 * /mobile/alerts:
 *   get:
 *     summary: Get public alerts
 *     tags: [Mobile]
 *     responses:
 *       200: { description: List of alerts }
 */
router.get('/alerts', optionalAuth, mobile.getAlerts);

module.exports = router;
