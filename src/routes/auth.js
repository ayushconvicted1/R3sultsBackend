const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const auth = require('../controllers/authController');

router.post('/register', validate([
  body('phoneNumber').notEmpty().withMessage('Phone number is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('fullName').notEmpty().withMessage('Full name is required'),
]), auth.register);

router.post('/login', validate([
  body('phoneNumber').notEmpty().withMessage('Phone number is required'),
  body('password').notEmpty().withMessage('Password is required'),
]), auth.login);

router.post('/google', validate([
  body('idToken').notEmpty().withMessage('Google ID token is required'),
]), auth.googleSignIn);

router.post('/apple', validate([
  body('identityToken').notEmpty().withMessage('Apple identity token is required'),
]), auth.appleSignIn);

router.post('/phone/send-otp', validate([
  body('phoneNumber').notEmpty().withMessage('Phone number is required'),
]), auth.sendOTP);

router.post('/phone/verify-otp', validate([
  body('phoneNumber').notEmpty().withMessage('Phone number is required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
]), auth.verifyOTP);

router.post('/forgot-password', validate([
  body('phoneNumber').notEmpty().withMessage('Phone number is required'),
]), auth.forgotPassword);

router.post('/reset-password', validate([
  body('phoneNumber').notEmpty().withMessage('Phone number is required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
]), auth.resetPassword);

router.post('/refresh-token', validate([
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
]), auth.refreshToken);

router.get('/me', authenticate, auth.getMe);

router.post('/update-phone', authenticate, validate([
  body('phoneNumber').notEmpty().withMessage('Phone number is required'),
]), auth.updatePhone);

router.post('/logout', authenticate, auth.logout);

module.exports = router;
