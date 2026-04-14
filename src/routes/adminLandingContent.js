const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const ctrl = require('../controllers/adminLandingContentController');

// All routes require super_admin
router.use(authenticate);
router.use(requireRole('SUPER_ADMIN'));

/**
 * @swagger
 * /admin/landing-content:
 *   get:
 *     summary: Get landing page content
 *     tags: [Landing Content]
 *     security: [{ BearerAuth: [] }]
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

/**
 * @swagger
 * /admin/landing-content:
 *   put:
 *     summary: Upsert text content
 *     tags: [Landing Content]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               page: { type: string }
 *               section: { type: string }
 *               key: { type: string }
 *               value: { type: string }
 *               items: { type: array }
 *     responses:
 *       200: { description: Content saved }
 */
router.put('/', ctrl.upsertContent);

/**
 * @swagger
 * /admin/landing-content/upload:
 *   post:
 *     summary: Upload media (image/video)
 *     tags: [Landing Content]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *               page: { type: string }
 *               section: { type: string }
 *               key: { type: string }
 *     responses:
 *       200: { description: Media uploaded }
 */
router.post('/upload', upload.single('file'), ctrl.uploadMedia);

/**
 * @swagger
 * /admin/landing-content/{id}:
 *   delete:
 *     summary: Delete content entry
 *     tags: [Landing Content]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Content deleted }
 */
router.delete('/:id', ctrl.deleteContent);

module.exports = router;
