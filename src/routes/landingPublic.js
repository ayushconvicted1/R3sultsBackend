const router = require('express').Router();
const ctrl = require('../controllers/adminLandingContentController');

/**
 * @swagger
 * /landing-content:
 *   get:
 *     summary: Get landing page content (public)
 *     tags: [Landing Content]
 *     parameters:
 *       - in: query
 *         name: page
 *         required: true
 *         schema: { type: string, enum: [home, about] }
 *       - in: query
 *         name: section
 *         schema: { type: string }
 *     responses:
 *       200: { description: Landing content }
 */
router.get('/', ctrl.getContent);

module.exports = router;
