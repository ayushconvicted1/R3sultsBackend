const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const vol = require('../controllers/volunteerController');

/**
 * @swagger
 * /volunteer/signup:
 *   post:
 *     summary: Register a new volunteer
 *     tags: [Volunteer]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phoneNumber, password, fullName]
 *             properties:
 *               phoneNumber: { type: string }
 *               password: { type: string, minLength: 6 }
 *               fullName: { type: string }
 *     responses:
 *       201: { description: Volunteer registered }
 */
router.post('/signup', validate([
  body('phoneNumber').notEmpty(),
  body('password').isLength({ min: 6 }),
  body('fullName').notEmpty(),
]), vol.signup);

/**
 * @swagger
 * /volunteer/login:
 *   post:
 *     summary: Volunteer login
 *     tags: [Volunteer]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               phoneNumber: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Login successful }
 */
router.post('/login', validate([
  body('password').notEmpty(),
]), vol.login);

/**
 * @swagger
 * /volunteer/send-otp:
 *   post:
 *     summary: Send OTP to volunteer phone
 *     tags: [Volunteer]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phoneNumber]
 *             properties:
 *               phoneNumber: { type: string }
 *     responses:
 *       200: { description: OTP sent }
 */
router.post('/send-otp', validate([
  body('phoneNumber').notEmpty(),
]), vol.sendOTP);

/**
 * @swagger
 * /volunteer/verify-otp:
 *   post:
 *     summary: Verify volunteer OTP
 *     tags: [Volunteer]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phoneNumber, otp]
 *             properties:
 *               phoneNumber: { type: string }
 *               otp: { type: string, minLength: 6, maxLength: 6 }
 *     responses:
 *       200: { description: OTP verified }
 */
router.post('/verify-otp', validate([
  body('phoneNumber').notEmpty(),
  body('otp').isLength({ min: 6, max: 6 }),
]), vol.verifyOTP);

/**
 * @swagger
 * /volunteer/forgot-password:
 *   post:
 *     summary: Volunteer forgot password
 *     tags: [Volunteer]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phoneNumber]
 *             properties:
 *               phoneNumber: { type: string }
 *     responses:
 *       200: { description: Reset OTP sent }
 */
router.post('/forgot-password', validate([
  body('phoneNumber').notEmpty(),
]), vol.forgotPassword);

/**
 * @swagger
 * /volunteer/reset-password:
 *   post:
 *     summary: Reset volunteer password
 *     tags: [Volunteer]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phoneNumber, otp, newPassword]
 *             properties:
 *               phoneNumber: { type: string }
 *               otp: { type: string }
 *               newPassword: { type: string, minLength: 6 }
 *     responses:
 *       200: { description: Password reset }
 */
router.post('/reset-password', validate([
  body('phoneNumber').notEmpty(),
  body('otp').isLength({ min: 6, max: 6 }),
  body('newPassword').isLength({ min: 6 }),
]), vol.resetPassword);

/**
 * @swagger
 * /volunteer/me:
 *   get:
 *     summary: Get volunteer profile
 *     tags: [Volunteer]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: Volunteer profile }
 */
router.get('/me', authenticate, vol.getMe);

module.exports = router;
