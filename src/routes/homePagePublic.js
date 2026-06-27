const router = require('express').Router();
const ctrl = require('../controllers/homePageContentController');

// ─── Get full home page content ───

/**
 * @swagger
 * /home-page-content:
 *   get:
 *     summary: Get full home page content
 *     description: |
 *       Returns the entire home page content JSON in a single response.
 *       This is the primary endpoint the frontend fetches to populate the home page.
 *       Response is the raw content object (not wrapped in `{ success, data }`).
 *     tags: [Home Page Content (Public)]
 *     responses:
 *       200:
 *         description: Full home page content JSON
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hero: { type: object }
 *                 approach: { type: object }
 *                 impact: { type: object }
 *                 operations: { type: object }
 *                 testimonials: { type: object }
 *                 donate: { type: object }
 *                 stories: { type: object }
 *                 news: { type: object }
 *                 volunteer: { type: object }
 *       404: { description: Content not configured yet }
 */
router.get('/', ctrl.getFullContent);

// ─── Get a single section ───

/**
 * @swagger
 * /home-page-content/{section}:
 *   get:
 *     summary: Get a single section of home page content
 *     description: |
 *       Returns the content for one section of the home page.
 *       Valid sections: hero, approach, impact, operations, testimonials, donate, stories, news, volunteer.
 *     tags: [Home Page Content (Public)]
 *     parameters:
 *       - in: path
 *         name: section
 *         required: true
 *         schema:
 *           type: string
 *           enum: [hero, approach, impact, operations, testimonials, donate, stories, news, volunteer]
 *         description: Section name
 *     responses:
 *       200:
 *         description: Section content
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { type: object, description: "Section content JSON" }
 *       400: { description: Invalid section name }
 *       404: { description: Content or section not found }
 */
router.get('/:section', ctrl.getSection);

module.exports = router;
