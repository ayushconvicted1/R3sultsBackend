const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/newsletterController');

// ─── Public Routes ──────────────────────────────────────────

/**
 * @swagger
 * /newsletter/subscribe:
 *   post:
 *     summary: Subscribe to newsletter
 *     tags: [Newsletter]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address to subscribe
 *     responses:
 *       201: { description: 'Successfully subscribed' }
 *       200: { description: 'Already subscribed or re-subscribed' }
 *       400: { description: 'Validation error' }
 */
router.post(
  '/subscribe',
  validate([
    body('email').isEmail().normalizeEmail().withMessage('A valid email is required'),
  ]),
  ctrl.subscribe,
);

/**
 * @swagger
 * /newsletter/unsubscribe:
 *   post:
 *     summary: Unsubscribe from newsletter
 *     tags: [Newsletter]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address to unsubscribe
 *     responses:
 *       200: { description: 'Successfully unsubscribed' }
 *       404: { description: 'Email not found or already unsubscribed' }
 *       400: { description: 'Validation error' }
 */
router.post(
  '/unsubscribe',
  validate([
    body('email').isEmail().normalizeEmail().withMessage('A valid email is required'),
  ]),
  ctrl.unsubscribe,
);

// ─── Admin Routes (auth required) ───────────────────────────

/**
 * @swagger
 * /newsletter/subscribers:
 *   get:
 *     summary: Get paginated list of newsletter subscribers
 *     tags: [Newsletter]
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
 *         description: Search by email
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, inactive] }
 *         description: Filter by subscription status
 *     responses:
 *       200: { description: 'Paginated list of subscribers' }
 *       403: { description: 'Admin access required' }
 */
router.get(
  '/subscribers',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN'),
  ctrl.getSubscribers,
);

/**
 * @swagger
 * /newsletter/subscribers/all:
 *   get:
 *     summary: Get all active subscriber IDs and emails (for Select All)
 *     tags: [Newsletter]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: 'All active subscriber IDs and emails' }
 *       403: { description: 'Admin access required' }
 */
router.get(
  '/subscribers/all',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN'),
  ctrl.getAllSubscriberEmails,
);

/**
 * @swagger
 * /newsletter/send:
 *   post:
 *     summary: Send newsletter email to selected or all subscribers
 *     tags: [Newsletter]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [subject, html]
 *             properties:
 *               subject:
 *                 type: string
 *                 description: Email subject line
 *               html:
 *                 type: string
 *                 description: HTML body content (from rich text editor)
 *               emailIds:
 *                 type: array
 *                 items: { type: string }
 *                 description: Specific subscriber IDs to send to
 *               sendToAll:
 *                 type: boolean
 *                 description: Set true to send to all active subscribers
 *     responses:
 *       200: { description: 'Newsletter sent successfully' }
 *       400: { description: 'No recipients found or validation error' }
 *       403: { description: 'Admin access required' }
 */
router.post(
  '/send',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN'),
  validate([
    body('subject').notEmpty().trim().withMessage('Subject is required'),
    body('html').notEmpty().withMessage('HTML body content is required'),
  ]),
  ctrl.sendNewsletter,
);

/**
 * @swagger
 * /newsletter/stats:
 *   get:
 *     summary: Get newsletter subscription statistics
 *     tags: [Newsletter]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: 'Subscription statistics' }
 *       403: { description: 'Admin access required' }
 */
router.get(
  '/stats',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN'),
  ctrl.getStats,
);

module.exports = router;
