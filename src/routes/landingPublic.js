const router = require('express').Router();
const ctrl = require('../controllers/adminLandingContentController');

// ─── Get full site content ───

/**
 * @swagger
 * /landing-content/full:
 *   get:
 *     summary: Get all CMS content (all pages, all sections)
 *     description: |
 *       Returns every page and every section in a single response.
 *       Ideal for SSR or initial page load caching.
 *       Response structure: `{ shared: { footer: {...}, forms: {...} }, home: { hero: {...}, ... }, about: {...}, contact: {...} }`
 *     tags: [Landing Content (Public)]
 *     responses:
 *       200:
 *         description: Full site content
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   description: "Map of page → { section → content }"
 *                   additionalProperties:
 *                     type: object
 *                     additionalProperties:
 *                       type: object
 */
router.get('/full', ctrl.getFullContent);

// ─── Get page content ───

/**
 * @swagger
 * /landing-content:
 *   get:
 *     summary: Get all sections for a page (public)
 *     description: |
 *       Returns all CMS sections for the specified page, grouped by section name.
 *       Use `page=shared` to get footer and form content.
 *     tags: [Landing Content (Public)]
 *     parameters:
 *       - in: query
 *         name: page
 *         required: true
 *         schema: { type: string, enum: [home, about, contact, shared] }
 *         description: Page to fetch content for
 *       - in: query
 *         name: section
 *         required: false
 *         schema: { type: string }
 *         description: Optional section filter
 *     responses:
 *       200:
 *         description: Page content
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     page: { type: string }
 *                     sections:
 *                       type: object
 *                       description: "Map of sectionName → content JSON"
 *                     _meta:
 *                       type: object
 *                       properties:
 *                         sectionCount: { type: integer }
 *                         sectionNames: { type: array, items: { type: string } }
 *       400: { description: Missing page parameter }
 */
router.get('/', ctrl.getPageContent);

// ─── Get single section ───

/**
 * @swagger
 * /landing-content/{page}/{section}:
 *   get:
 *     summary: Get a specific section (public)
 *     description: Returns content for a specific page + section combination.
 *     tags: [Landing Content (Public)]
 *     parameters:
 *       - in: path
 *         name: page
 *         required: true
 *         schema: { type: string, enum: [home, about, contact, shared] }
 *       - in: path
 *         name: section
 *         required: true
 *         schema: { type: string }
 *         example: hero
 *     responses:
 *       200:
 *         description: Section content
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     page: { type: string }
 *                     section: { type: string }
 *                     content: { type: object }
 *                     sortOrder: { type: integer }
 *                     updatedAt: { type: string, format: date-time }
 *       404: { description: Section not found }
 */
router.get('/:page/:section', ctrl.getSectionContent);

module.exports = router;
