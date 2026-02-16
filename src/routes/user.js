const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const user = require('../controllers/userController');

router.use(authenticate);

router.get('/profile', user.getProfile);

const { upload } = require('../middleware/upload');

router.patch('/profile', [
  upload.single('file'), 
  validate([
    body('fullName').optional().notEmpty(),
    body('gender').optional().isIn(['male', 'female', 'other']),
  ])
], user.updateProfile);

router.patch('/address', user.updateAddress);

router.patch('/emergency-contact', validate([
  body('emergencyContactName').notEmpty().withMessage('Name is required'),
  body('emergencyContactPhone').notEmpty().withMessage('Phone is required'),
]), user.updateEmergencyContact);

router.patch('/medical-info', user.updateMedicalInfo);

router.patch('/change-password', validate([
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
]), user.changePassword);

router.patch('/email', validate([
  body('email').isEmail().withMessage('Valid email is required'),
]), user.updateEmail);

router.patch('/username', validate([
  body('username').notEmpty().withMessage('Username is required'),
]), user.updateUsername);

router.patch('/deactivate', user.deactivate);


router.post('/promote-to-admin', user.promoteToAdmin);
router.patch('/status', user.updateStatus);
router.post('/admin/status-radius', user.markUsersUnverifiedInRadius);
router.patch('/fcm-token', user.updateFcmToken);

// ─── Property Routes ───
const property = require('../controllers/propertyController');
const { upload } = require('../middleware/upload');

router.get('/property', property.getProperty);
router.patch('/property', property.updateProperty);
router.get('/property/photos', property.getPhotos);
router.post('/property/photos', upload.single('file'), property.addPhoto);
router.patch('/property/photos/:id', upload.single('file'), property.updatePhoto);
router.delete('/property/photos/:id', property.deletePhoto);

module.exports = router;
