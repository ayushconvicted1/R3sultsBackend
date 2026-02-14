const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const vendor = require('../controllers/vendorController');

// Public
router.post('/signup', validate([
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('fullName').notEmpty(),
]), vendor.signup);

router.post('/login', validate([
  body('password').notEmpty(),
]), vendor.login);

router.post('/google', validate([
  body('idToken').notEmpty(),
]), vendor.googleSignIn);

router.post('/apple', validate([
  body('identityToken').notEmpty(),
]), vendor.appleSignIn);

router.post('/send-otp', validate([
  body('email').isEmail(),
]), vendor.sendOTP);

router.post('/verify-otp', validate([
  body('email').isEmail(),
  body('otp').isLength({ min: 6, max: 6 }),
]), vendor.verifyOTP);

router.post('/forgot-password', validate([
  body('email').isEmail(),
]), vendor.forgotPassword);

router.post('/reset-password', validate([
  body('email').isEmail(),
  body('otp').isLength({ min: 6, max: 6 }),
  body('newPassword').isLength({ min: 6 }),
]), vendor.resetPassword);

router.post('/refresh-token', validate([
  body('refreshToken').notEmpty(),
]), vendor.refreshToken);

// Authenticated vendor
router.get('/me', authenticate, vendor.getMe);
router.put('/profile', authenticate, vendor.updateProfile);
router.post('/logout', authenticate, vendor.logout);
router.put('/change-password', authenticate, validate([
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }),
]), vendor.changePassword);
router.post('/update-phone', authenticate, validate([
  body('phoneNumber').notEmpty(),
]), vendor.updatePhone);

module.exports = router;
