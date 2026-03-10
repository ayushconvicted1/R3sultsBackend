const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const auth = require('../controllers/authController');

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phoneNumber, password, fullName]
 *             properties:
 *               phoneNumber: { type: string, example: "+1234567890" }
 *               password: { type: string, minLength: 6 }
 *               fullName: { type: string, example: "John Doe" }
 *     responses:
 *       201: { description: User registered successfully }
 *       400: { description: Validation error }
 */
router.post('/register', validate([
  body('phoneNumber').notEmpty().withMessage('Phone number is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('fullName').notEmpty().withMessage('Full name is required'),
]), auth.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with phone number or email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               phoneNumber: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200: { description: Login successful, returns tokens }
 *       401: { description: Invalid credentials }
 */
router.post('/login', validate([
  body().custom((_, { req }) => {
    if (!req.body.phoneNumber && !req.body.email) {
      throw new Error('Phone number or email is required');
    }
    return true;
  }),
  body('password').notEmpty().withMessage('Password is required'),
]), auth.login);

/**
 * @swagger
 * /auth/google:
 *   post:
 *     summary: Google Sign-In
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idToken]
 *             properties:
 *               idToken: { type: string, description: "Google ID token" }
 *     responses:
 *       200: { description: Sign-in successful }
 */
router.post('/google', validate([
  body('idToken').notEmpty().withMessage('Google ID token is required'),
]), auth.googleSignIn);

/**
 * @swagger
 * /auth/apple:
 *   post:
 *     summary: Apple Sign-In
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identityToken]
 *             properties:
 *               identityToken: { type: string }
 *     responses:
 *       200: { description: Sign-in successful }
 */
router.post('/apple', validate([
  body('identityToken').notEmpty().withMessage('Apple identity token is required'),
]), auth.appleSignIn);

/**
 * @swagger
 * /auth/phone/send-otp:
 *   post:
 *     summary: Send OTP to phone number
 *     tags: [Auth]
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
router.post('/phone/send-otp', validate([
  body('phoneNumber').notEmpty().withMessage('Phone number is required'),
]), auth.sendOTP);

/**
 * @swagger
 * /auth/phone/verify-otp:
 *   post:
 *     summary: Verify phone OTP
 *     tags: [Auth]
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
 *       400: { description: Invalid OTP }
 */
router.post('/phone/verify-otp', validate([
  body('phoneNumber').notEmpty().withMessage('Phone number is required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
]), auth.verifyOTP);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Initiate password reset
 *     tags: [Auth]
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
  body('phoneNumber').notEmpty().withMessage('Phone number is required'),
]), auth.forgotPassword);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password with OTP
 *     tags: [Auth]
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
 *       200: { description: Password reset successful }
 */
router.post('/reset-password', validate([
  body('phoneNumber').notEmpty().withMessage('Phone number is required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
]), auth.resetPassword);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh JWT token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200: { description: New tokens returned }
 */
router.post('/refresh-token', validate([
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
]), auth.refreshToken);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Auth]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: Current user data }
 *       401: { description: Unauthorized }
 */
router.get('/me', authenticate, auth.getMe);

/**
 * @swagger
 * /auth/update-phone:
 *   post:
 *     summary: Update phone number
 *     tags: [Auth]
 *     security: [{ BearerAuth: [] }]
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
 *       200: { description: Phone updated }
 */
router.post('/update-phone', authenticate, validate([
  body('phoneNumber').notEmpty().withMessage('Phone number is required'),
]), auth.updatePhone);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout
 *     tags: [Auth]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: Logged out }
 */
router.post('/logout', authenticate, auth.logout);

module.exports = router;
