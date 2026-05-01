const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const ctrl = require('../controllers/adminLandingContentController');

// All routes require super_admin
router.use(authenticate);
router.use(requireRole('SUPER_ADMIN'));

// ─── List all sections ───

/**
 * @swagger
 * /admin/landing-content/sections-list:
 *   get:
 *     summary: List all page-section entries
 *     description: Returns every page+section combination stored in the CMS, grouped by page. Useful for populating the admin sidebar.
 *     tags: [Admin Landing Content]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Section list grouped by page
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     pages:
 *                       type: object
 *                       additionalProperties:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id: { type: string }
 *                             page: { type: string }
 *                             section: { type: string }
 *                             sortOrder: { type: integer }
 *                             updatedAt: { type: string, format: date-time }
 *                     total: { type: integer }
 */
router.get('/sections-list', ctrl.listSections);

// ─── Seed default content ───

/**
 * @swagger
 * /admin/landing-content/seed:
 *   post:
 *     summary: Seed default CMS content
 *     description: |
 *       Populates the database with the default content for all pages (home, about, contact, shared).
 *       Uses upsert — existing sections will be overwritten with defaults.
 *       **Use with caution in production.**
 *     tags: [Admin Landing Content]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Seed completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       page: { type: string }
 *                       section: { type: string }
 *                       id: { type: string }
 *                 message: { type: string }
 */
router.post('/seed', ctrl.seedContent);

// ─── Bulk upsert ───

/**
 * @swagger
 * /admin/landing-content/bulk:
 *   put:
 *     summary: Bulk upsert multiple sections
 *     description: Save multiple page-section content documents in one request. Each item is upserted independently.
 *     tags: [Admin Landing Content]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [page, section, content]
 *                   properties:
 *                     page: { type: string, enum: [home, about, contact, shared] }
 *                     section: { type: string, example: hero }
 *                     content: { type: object, description: "Full JSON content for this section" }
 *                     sortOrder: { type: integer, example: 0 }
 *           example:
 *             items:
 *               - page: home
 *                 section: hero
 *                 content: { headlineLines: ["Line 1", "Line 2"], description: "Updated description" }
 *                 sortOrder: 0
 *               - page: shared
 *                 section: footer
 *                 content: { copyrightText: "© 2026 R3sults" }
 *     responses:
 *       200:
 *         description: Bulk save results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     saved: { type: integer }
 *                     failed: { type: integer }
 *                     results: { type: array, items: { type: object } }
 *                     errors: { type: array, items: { type: object } }
 *                 message: { type: string }
 */
router.put('/bulk', ctrl.bulkUpsert);

// ─── Upload media ───

/**
 * @swagger
 * /admin/landing-content/upload:
 *   post:
 *     summary: Upload media file (image/video) to Cloudinary
 *     description: |
 *       Uploads a file to Cloudinary and returns the URL.
 *       The admin should then PUT the URL into the appropriate content field.
 *     tags: [Admin Landing Content]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file, page, section]
 *             properties:
 *               file: { type: string, format: binary, description: "Image or video file" }
 *               page: { type: string, example: home }
 *               section: { type: string, example: hero }
 *               key: { type: string, description: "Optional dot-path key (e.g. backgroundVideo.src)", example: "backgroundVideo.src" }
 *     responses:
 *       200:
 *         description: Upload successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     url: { type: string, example: "https://res.cloudinary.com/..." }
 *                     publicId: { type: string }
 *                     mediaType: { type: string, enum: [image, video] }
 *                     width: { type: integer }
 *                     height: { type: integer }
 *                     format: { type: string }
 *                     bytes: { type: integer }
 *                     key: { type: string }
 *                 message: { type: string }
 */
router.post('/upload', upload.single('file'), ctrl.uploadMedia);

// ─── Get all sections for a page ───

/**
 * @swagger
 * /admin/landing-content:
 *   get:
 *     summary: Get all sections for a page
 *     description: Returns all CMS sections for the given page, grouped into a sections object.
 *     tags: [Admin Landing Content]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         required: true
 *         schema: { type: string, enum: [home, about, contact, shared] }
 *         description: Page identifier
 *       - in: query
 *         name: section
 *         required: false
 *         schema: { type: string }
 *         description: Optional section filter (e.g. "hero")
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
 *                     sections: { type: object, description: "Map of sectionName → content JSON" }
 *                     _meta:
 *                       type: object
 *                       properties:
 *                         sectionCount: { type: integer }
 *                         sectionNames: { type: array, items: { type: string } }
 */
router.get('/', ctrl.getPageContent);

// ─── Get single section ───

/**
 * @swagger
 * /admin/landing-content/{page}/{section}:
 *   get:
 *     summary: Get a specific section
 *     description: Returns the full content JSON for a specific page + section combination.
 *     tags: [Admin Landing Content]
 *     security: [{ BearerAuth: [] }]
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
 *                     updatedBy: { type: string }
 *                     updatedAt: { type: string, format: date-time }
 *       404: { description: Section not found }
 */
router.get('/:page/:section', ctrl.getSectionContent);

// ─── Upsert section ───

/**
 * @swagger
 * /admin/landing-content/{page}/{section}:
 *   put:
 *     summary: Create or update a section
 *     description: |
 *       Upserts the entire content JSON for a specific page + section.
 *       The content field should be the complete JSON object for that section.
 *     tags: [Admin Landing Content]
 *     security: [{ BearerAuth: [] }]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: object
 *                 description: Complete JSON content for this section
 *               sortOrder:
 *                 type: integer
 *                 description: Display order (lower = first)
 *           example:
 *             content:
 *               sectionId: hero
 *               backgroundVideo: { src: "/HeroVid1.mp4", stopBeforeEndSeconds: 1 }
 *               headlineLines: ["Helping resolve the", "Overcoming Disaster :", "Using People, Technology & AI"]
 *               description: "A disaster management ecosystem..."
 *             sortOrder: 0
 *     responses:
 *       200:
 *         description: Section saved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { type: object }
 *                 message: { type: string }
 *       400: { description: Invalid page or missing content }
 */
router.put('/:page/:section', ctrl.upsertSection);

// ─── Patch section (partial update) ───

/**
 * @swagger
 * /admin/landing-content/{page}/{section}:
 *   patch:
 *     summary: Partially update a section
 *     description: |
 *       Shallow-merges the provided fields into the existing section content.
 *       Only top-level keys in the content object are merged — nested objects are replaced entirely.
 *     tags: [Admin Landing Content]
 *     security: [{ BearerAuth: [] }]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: object
 *                 description: Fields to merge into existing content
 *           example:
 *             content:
 *               description: "Updated description only — other fields remain unchanged"
 *     responses:
 *       200:
 *         description: Section patched
 *       404: { description: Section not found }
 */
router.patch('/:page/:section', ctrl.patchSection);

// ─── Delete section ───

/**
 * @swagger
 * /admin/landing-content/{page}/{section}:
 *   delete:
 *     summary: Delete a section
 *     description: Permanently removes a page-section entry from the CMS.
 *     tags: [Admin Landing Content]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: page
 *         required: true
 *         schema: { type: string, enum: [home, about, contact, shared] }
 *       - in: path
 *         name: section
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Section deleted }
 *       404: { description: Section not found }
 */
router.delete('/:page/:section', ctrl.deleteSection);

module.exports = router;
