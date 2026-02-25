const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const uploadCtrl = require('../controllers/uploadController');

router.use(authenticate);

/**
 * @swagger
 * /upload/csv:
 *   post:
 *     summary: Upload a CSV file
 *     tags: [Upload]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *     responses:
 *       200: { description: CSV uploaded }
 */
router.post('/csv', upload.single('file'), uploadCtrl.uploadCSV);

/**
 * @swagger
 * /upload/csv/parse:
 *   post:
 *     summary: Parse a CSV file
 *     tags: [Upload]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *     responses:
 *       200: { description: Parsed CSV data }
 */
router.post('/csv/parse', upload.single('file'), uploadCtrl.parseCSV);

module.exports = router;
