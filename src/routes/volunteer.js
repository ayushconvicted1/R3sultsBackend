const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const vol = require('../controllers/volunteerController');

// Public
router.post('/signup', validate([
  body('phoneNumber').notEmpty(),
  body('password').isLength({ min: 6 }),
  body('fullName').notEmpty(),
]), vol.signup);

router.post('/login', validate([
  body('password').notEmpty(),
]), vol.login);

router.post('/send-otp', validate([
  body('phoneNumber').notEmpty(),
]), vol.sendOTP);

router.post('/verify-otp', validate([
  body('phoneNumber').notEmpty(),
  body('otp').isLength({ min: 6, max: 6 }),
]), vol.verifyOTP);

router.post('/forgot-password', validate([
  body('phoneNumber').notEmpty(),
]), vol.forgotPassword);

router.post('/reset-password', validate([
  body('phoneNumber').notEmpty(),
  body('otp').isLength({ min: 6, max: 6 }),
  body('newPassword').isLength({ min: 6 }),
]), vol.resetPassword);

// Authenticated volunteer
router.get('/me', authenticate, vol.getMe);

module.exports = router;
