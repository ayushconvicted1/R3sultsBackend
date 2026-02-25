const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const adminVolCtrl = require('../controllers/adminVolunteerController');
const volCtrl = require('../controllers/volunteerController');

/**
 * Alias routes so the React Native app can call /api/volunteers/*
 * without changing the existing admin dashboard paths.
 */

/**
 * @swagger
 * /volunteers/mobile-login:
 *   post:
 *     summary: Volunteer mobile login (alias)
 *     tags: [Volunteers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               volunteerId: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Login successful }
 */
router.post('/mobile-login', adminVolCtrl.post_volunteers_mobile_login);

/**
 * @swagger
 * /volunteers/by-id/{volunteerId}:
 *   get:
 *     summary: Get volunteer by ID (alias)
 *     tags: [Volunteers]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: volunteerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Volunteer details }
 */
router.get('/by-id/:volunteerId', authenticate, volCtrl.getVolunteerDetails);

/**
 * @swagger
 * /volunteers/public/{volunteerId}:
 *   get:
 *     summary: Get public volunteer info (alias)
 *     tags: [Volunteers]
 *     parameters:
 *       - in: path
 *         name: volunteerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Volunteer public info }
 */
router.get('/public/:volunteerId', volCtrl.getVolunteerDetails);

module.exports = router;
