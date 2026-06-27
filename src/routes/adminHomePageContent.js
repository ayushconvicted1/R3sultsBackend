const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const ctrl = require('../controllers/homePageContentController');

// All routes require SUPER_ADMIN
router.use(authenticate);
router.use(requireRole('SUPER_ADMIN'));

// ─── Metadata ───

/**
 * @swagger
 * /admin/home-page-content/meta:
 *   get:
 *     summary: Get home page content metadata
 *     description: |
 *       Returns metadata about the home page content (sections list, version, timestamps)
 *       without the full content body. Useful for admin panel status display.
 *     tags: [Admin Home Page Content]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Content metadata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     exists: { type: boolean }
 *                     id: { type: string }
 *                     sections: { type: array, items: { type: string } }
 *                     version: { type: integer }
 *                     updatedBy: { type: string }
 *                     createdAt: { type: string, format: date-time }
 *                     updatedAt: { type: string, format: date-time }
 */
router.get('/meta', ctrl.getMeta);

// ─── Seed default content ───

/**
 * @swagger
 * /admin/home-page-content/seed:
 *   post:
 *     summary: Seed default home page content
 *     description: |
 *       Populates the database with the default home page content from the CMS contract.
 *       If content already exists, it will be overwritten with defaults.
 *       **Use with caution in production.**
 *     tags: [Admin Home Page Content]
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
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     version: { type: integer }
 *                     sections: { type: array, items: { type: string } }
 *                     updatedAt: { type: string, format: date-time }
 *                 message: { type: string }
 */
router.post('/seed', ctrl.seedContent);

// ─── Upload media ───

/**
 * @swagger
 * /admin/home-page-content/upload:
 *   post:
 *     summary: Upload media file for home page content
 *     description: |
 *       Uploads an image or video to Cloudinary and returns the URL.
 *       Use the returned URL in a subsequent PATCH or PUT call to update content.
 *     tags: [Admin Home Page Content]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file, section]
 *             properties:
 *               file: { type: string, format: binary, description: "Image or video file" }
 *               section: { type: string, example: hero, description: "Target section name" }
 *               key: { type: string, description: "Optional dot-path key (e.g. heroImage)", example: heroImage }
 *               oldUrl: { type: string, description: "URL of previous media to delete from Cloudinary" }
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

// ─── Get full content (admin) ───

/**
 * @swagger
 * /admin/home-page-content:
 *   get:
 *     summary: Get full home page content (admin view)
 *     description: |
 *       Returns the entire home page content with metadata (version, updatedBy, timestamps).
 *     tags: [Admin Home Page Content]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Full content with metadata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     content: { type: object, description: "Full home page content JSON" }
 *                     version: { type: integer }
 *                     updatedBy: { type: string }
 *                     createdAt: { type: string, format: date-time }
 *                     updatedAt: { type: string, format: date-time }
 *       404: { description: Content not configured }
 */
router.get('/', ctrl.adminGetFullContent);

// ─── Full replace ───

/**
 * @swagger
 * /admin/home-page-content:
 *   put:
 *     summary: Full replace of home page content
 *     description: |
 *       Overwrites the entire home page content JSON.
 *       Use this only when you want to replace ALL sections at once.
 *       For individual section updates, use PATCH /:section instead.
 *     tags: [Admin Home Page Content]
 *     security: [{ BearerAuth: [] }]
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
 *                 description: "Complete home page content JSON with all sections"
 *           example:
 *             content:
 *               hero: { eyebrow: "...", headline: "...", stats: [] }
 *               approach: { eyebrow: "...", heading: "...", phases: [] }
 *     responses:
 *       200:
 *         description: Content replaced
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     version: { type: integer }
 *                     updatedAt: { type: string, format: date-time }
 *                 message: { type: string }
 *       400: { description: Missing content object }
 */
router.put('/', ctrl.fullReplace);

// ─── Get single section (admin) ───

/**
 * @swagger
 * /admin/home-page-content/{section}:
 *   get:
 *     summary: Get a single section (admin view)
 *     description: Returns a single section's content with metadata.
 *     tags: [Admin Home Page Content]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: section
 *         required: true
 *         schema:
 *           type: string
 *           enum: [hero, approach, impact, operations, testimonials, donate, stories, news, volunteer]
 *     responses:
 *       200:
 *         description: Section content with metadata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     section: { type: string }
 *                     content: { type: object }
 *                     version: { type: integer }
 *                     updatedBy: { type: string }
 *                     updatedAt: { type: string, format: date-time }
 *       400: { description: Invalid section name }
 *       404: { description: Content or section not found }
 */
router.get('/:section', ctrl.adminGetSection);

// ─── Full section replace ───

/**
 * @swagger
 * /admin/home-page-content/{section}:
 *   put:
 *     summary: Full replace a section
 *     description: |
 *       Overwrites an entire section's content. Other sections remain untouched.
 *       Use this when you want to replace ALL fields within one section.
 *       For partial field updates within a section, use PATCH instead.
 *     tags: [Admin Home Page Content]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: section
 *         required: true
 *         schema:
 *           type: string
 *           enum: [hero, approach, impact, operations, testimonials, donate, stories, news, volunteer]
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
 *                 description: "Complete section content JSON"
 *           example:
 *             content:
 *               eyebrow: "Updated Eyebrow"
 *               headline: "Updated Headline"
 *               headlineAccent: "Updated Accent"
 *               headlineSuffix: "Updated Suffix"
 *               subtext: "Updated subtext"
 *               ctaPrimary: "Donate Now"
 *               ctaSecondary: "Partner With Us"
 *               heroImage: "https://cdn.r3sults.org/images/hero-new.jpg"
 *               stats: []
 *     responses:
 *       200:
 *         description: Section replaced
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     section: { type: string }
 *                     content: { type: object }
 *                     version: { type: integer }
 *                     updatedAt: { type: string, format: date-time }
 *                 message: { type: string }
 *       400: { description: Invalid section or missing content }
 *       404: { description: Content not configured }
 */
router.put('/:section', ctrl.replaceSection);

// ─── Partial update (deep merge) ───

/**
 * @swagger
 * /admin/home-page-content/{section}:
 *   patch:
 *     summary: Partially update a section (deep merge)
 *     description: |
 *       Deep-merges the provided fields into the specified section's content.
 *       - Plain objects are recursively merged (only changed keys are updated).
 *       - Arrays are replaced entirely when provided.
 *       - Primitives overwrite the existing value.
 *       - Fields not included in the request remain unchanged.
 *
 *       **This is the recommended endpoint for admin panel edits** — send only what changed.
 *     tags: [Admin Home Page Content]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: section
 *         required: true
 *         schema:
 *           type: string
 *           enum: [hero, approach, impact, operations, testimonials, donate, stories, news, volunteer]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fields]
 *             properties:
 *               fields:
 *                 type: object
 *                 description: "Fields to merge into the existing section content"
 *           examples:
 *             updateHeadline:
 *               summary: Update just the hero headline
 *               value:
 *                 fields:
 *                   headline: "New Headline"
 *             updateStats:
 *               summary: Replace the entire stats array
 *               value:
 *                 fields:
 *                   stats:
 *                     - { value: "25+", label: "Years Experience" }
 *                     - { value: "24/7", label: "Rapid Response" }
 *                     - { value: "15+", label: "Countries Served" }
 *                     - { value: "100%", label: "Transparency" }
 *             updateNested:
 *               summary: Update nested positioning heading
 *               value:
 *                 fields:
 *                   positioning:
 *                     heading: "Updated positioning heading"
 *     responses:
 *       200:
 *         description: Section patched
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     section: { type: string }
 *                     content: { type: object, description: "Full merged section content after update" }
 *                     version: { type: integer }
 *                     updatedAt: { type: string, format: date-time }
 *                 message: { type: string }
 *       400: { description: Invalid section or missing fields }
 *       404: { description: Content or section not found }
 */
router.patch('/:section', ctrl.patchSection);

module.exports = router;
