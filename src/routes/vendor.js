const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const vendor = require('../controllers/vendorController');

/**
 * @swagger
 * /vendor/signup:
 *   post:
 *     summary: Register a new vendor
 *     tags: [Vendor]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, fullName]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 6 }
 *               fullName: { type: string }
 *     responses:
 *       201: { description: Vendor registered }
 */
router.post('/signup', validate([
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('fullName').notEmpty(),
]), vendor.signup);

/**
 * @swagger
 * /vendor/login:
 *   post:
 *     summary: Vendor login
 *     tags: [Vendor]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Login successful }
 */
router.post('/login', validate([
  body('password').notEmpty(),
]), vendor.login);

/**
 * @swagger
 * /vendor/google:
 *   post:
 *     summary: Vendor Google Sign-In
 *     tags: [Vendor]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idToken]
 *             properties:
 *               idToken: { type: string }
 *     responses:
 *       200: { description: Google sign-in successful }
 */
router.post('/google', validate([
  body('idToken').notEmpty(),
]), vendor.googleSignIn);

/**
 * @swagger
 * /vendor/apple:
 *   post:
 *     summary: Vendor Apple Sign-In
 *     tags: [Vendor]
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
 *       200: { description: Apple sign-in successful }
 */
router.post('/apple', validate([
  body('identityToken').notEmpty(),
]), vendor.appleSignIn);

/**
 * @swagger
 * /vendor/send-otp:
 *   post:
 *     summary: Send OTP to vendor email
 *     tags: [Vendor]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200: { description: OTP sent }
 */
router.post('/send-otp', validate([
  body('email').isEmail(),
]), vendor.sendOTP);

/**
 * @swagger
 * /vendor/verify-otp:
 *   post:
 *     summary: Verify vendor OTP
 *     tags: [Vendor]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp]
 *             properties:
 *               email: { type: string, format: email }
 *               otp: { type: string, minLength: 6, maxLength: 6 }
 *     responses:
 *       200: { description: OTP verified }
 */
router.post('/verify-otp', validate([
  body('email').isEmail(),
  body('otp').isLength({ min: 6, max: 6 }),
]), vendor.verifyOTP);

/**
 * @swagger
 * /vendor/forgot-password:
 *   post:
 *     summary: Vendor forgot password
 *     tags: [Vendor]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200: { description: Reset OTP sent }
 */
router.post('/forgot-password', validate([
  body('email').isEmail(),
]), vendor.forgotPassword);

/**
 * @swagger
 * /vendor/reset-password:
 *   post:
 *     summary: Reset vendor password
 *     tags: [Vendor]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp, newPassword]
 *             properties:
 *               email: { type: string, format: email }
 *               otp: { type: string }
 *               newPassword: { type: string, minLength: 6 }
 *     responses:
 *       200: { description: Password reset }
 */
router.post('/reset-password', validate([
  body('email').isEmail(),
  body('otp').isLength({ min: 6, max: 6 }),
  body('newPassword').isLength({ min: 6 }),
]), vendor.resetPassword);

/**
 * @swagger
 * /vendor/refresh-token:
 *   post:
 *     summary: Refresh vendor token
 *     tags: [Vendor]
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
 *       200: { description: New tokens }
 */
router.post('/refresh-token', validate([
  body('refreshToken').notEmpty(),
]), vendor.refreshToken);

/**
 * @swagger
 * /vendor/me:
 *   get:
 *     summary: Get vendor profile
 *     tags: [Vendor]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: Vendor profile }
 */
router.get('/me', authenticate, vendor.getMe);

/**
 * @swagger
 * /vendor/profile:
 *   put:
 *     summary: Update vendor profile
 *     tags: [Vendor]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: Profile updated }
 */
router.put('/profile', authenticate, vendor.updateProfile);

/**
 * @swagger
 * /vendor/logout:
 *   post:
 *     summary: Vendor logout
 *     tags: [Vendor]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: Logged out }
 */
router.post('/logout', authenticate, vendor.logout);

/**
 * @swagger
 * /vendor/change-password:
 *   put:
 *     summary: Change vendor password
 *     tags: [Vendor]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string, minLength: 6 }
 *     responses:
 *       200: { description: Password changed }
 */
router.put('/change-password', authenticate, validate([
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }),
]), vendor.changePassword);

/**
 * @swagger
 * /vendor/update-phone:
 *   post:
 *     summary: Update vendor phone
 *     tags: [Vendor]
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
  body('phoneNumber').notEmpty(),
]), vendor.updatePhone);

module.exports = router;
