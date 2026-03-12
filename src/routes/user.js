const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const user = require('../controllers/userController');
const { upload } = require('../middleware/upload');

router.use(authenticate);

/**
 * @swagger
 * /user/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [User]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: User profile data }
 *   patch:
 *     summary: Update user profile
 *     tags: [User]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               fullName: { type: string }
 *               gender: { type: string, enum: [male, female, other] }
 *               file: { type: string, format: binary, description: Profile photo }
 *     responses:
 *       200: { description: Profile updated }
 */
router.get('/profile', user.getProfile);
router.patch('/profile', [
  upload.single('file'), 
  validate([
    body('fullName').optional().notEmpty(),
    body('gender').optional().isIn(['male', 'female', 'other']),
  ])
], user.updateProfile);

/**
 * @swagger
 * /user/address:
 *   patch:
 *     summary: Update user address
 *     tags: [User]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               address: { type: string }
 *               city: { type: string }
 *               state: { type: string }
 *               country: { type: string }
 *               pincode: { type: string }
 *     responses:
 *       200: { description: Address updated }
 */
router.patch('/address', user.updateAddress);

// ─── Multiple Address CRUD Routes ───

/**
 * @swagger
 * /user/addresses:
 *   get:
 *     summary: Get all user addresses
 *     tags: [User]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: List of addresses }
 *   post:
 *     summary: Add a new address
 *     tags: [User]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [address, city, state, pincode]
 *             properties:
 *               label: { type: string }
 *               address: { type: string }
 *               city: { type: string }
 *               state: { type: string }
 *               country: { type: string }
 *               pincode: { type: string }
 *               isDefault: { type: boolean }
 *     responses:
 *       201: { description: Address created }
 */
router.get('/addresses', user.getAddresses);
router.post('/addresses', validate([
  body('address').notEmpty().withMessage('Address is required'),
  body('city').notEmpty().withMessage('City is required'),
  body('state').notEmpty().withMessage('State is required'),
  body('pincode').notEmpty().withMessage('Pincode is required'),
]), user.addAddress);

/**
 * @swagger
 * /user/addresses/{id}:
 *   patch:
 *     summary: Update an address
 *     tags: [User]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Address updated }
 *   delete:
 *     summary: Delete an address
 *     tags: [User]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Address deleted }
 */
router.patch('/addresses/:id', user.updateAddressById);
router.delete('/addresses/:id', user.deleteAddress);

/**
 * @swagger
 * /user/addresses/{id}/default:
 *   patch:
 *     summary: Set address as default
 *     tags: [User]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Default address updated }
 */
router.patch('/addresses/:id/default', user.setDefaultAddress);

/**
 * @swagger
 * /user/emergency-contact:
 *   patch:
 *     summary: Update emergency contact
 *     tags: [User]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [emergencyContactName, emergencyContactPhone]
 *             properties:
 *               emergencyContactName: { type: string }
 *               emergencyContactPhone: { type: string }
 *     responses:
 *       200: { description: Emergency contact updated }
 */
router.patch('/emergency-contact', validate([
  body('emergencyContactName').notEmpty().withMessage('Name is required'),
  body('emergencyContactPhone').notEmpty().withMessage('Phone is required'),
]), user.updateEmergencyContact);

/**
 * @swagger
 * /user/medical-info:
 *   patch:
 *     summary: Update medical information
 *     tags: [User]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bloodType: { type: string }
 *               allergies: { type: string }
 *               medications: { type: string }
 *               conditions: { type: string }
 *     responses:
 *       200: { description: Medical info updated }
 */
router.patch('/medical-info', user.updateMedicalInfo);

/**
 * @swagger
 * /user/change-password:
 *   patch:
 *     summary: Change password
 *     tags: [User]
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
router.patch('/change-password', validate([
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
]), user.changePassword);

/**
 * @swagger
 * /user/email:
 *   patch:
 *     summary: Update email address
 *     tags: [User]
 *     security: [{ BearerAuth: [] }]
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
 *       200: { description: Email updated }
 */
router.patch('/email', validate([
  body('email').isEmail().withMessage('Valid email is required'),
]), user.updateEmail);

/**
 * @swagger
 * /user/username:
 *   patch:
 *     summary: Update username
 *     tags: [User]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username]
 *             properties:
 *               username: { type: string }
 *     responses:
 *       200: { description: Username updated }
 */
router.patch('/username', validate([
  body('username').notEmpty().withMessage('Username is required'),
]), user.updateUsername);

/**
 * @swagger
 * /user/deactivate:
 *   patch:
 *     summary: Deactivate account
 *     tags: [User]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: Account deactivated }
 */
router.patch('/deactivate', user.deactivate);

/**
 * @swagger
 * /user/promote-to-admin:
 *   post:
 *     summary: Self-promote to admin
 *     tags: [User]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: Promoted }
 */
router.post('/promote-to-admin', user.promoteToAdmin);

/**
 * @swagger
 * /user/status:
 *   patch:
 *     summary: Update user status
 *     tags: [User]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: Status updated }
 */
router.patch('/status', user.updateStatus);

/**
 * @swagger
 * /user/trigger-sos:
 *   post:
 *     summary: Trigger SOS alert
 *     tags: [User]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: SOS triggered }
 */
router.post('/trigger-sos', user.triggerSos);

/**
 * @swagger
 * /user/admin/status-radius:
 *   post:
 *     summary: Mark users unverified in radius
 *     tags: [User]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: Users marked }
 */
router.post('/admin/status-radius', user.markUsersUnverifiedInRadius);

/**
 * @swagger
 * /user/fcm-token:
 *   patch:
 *     summary: Update FCM push notification token
 *     tags: [User]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fcmToken: { type: string }
 *     responses:
 *       200: { description: FCM token updated }
 */
router.patch('/fcm-token', user.updateFcmToken);

// ─── Property Routes ───
const property = require('../controllers/propertyController');

/**
 * @swagger
 * /user/property:
 *   get:
 *     summary: Get user property
 *     tags: [Property]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: Property data }
 *   patch:
 *     summary: Update user property
 *     tags: [Property]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: Property updated }
 */
router.get('/property', property.getProperty);
router.patch('/property', property.updateProperty);

/**
 * @swagger
 * /user/property/photos:
 *   get:
 *     summary: Get property photos
 *     tags: [Property]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: List of photos }
 *   post:
 *     summary: Add property photo
 *     tags: [Property]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *     responses:
 *       201: { description: Photo added }
 */
router.get('/property/photos', property.getPhotos);
router.post('/property/photos', upload.single('file'), property.addPhoto);

/**
 * @swagger
 * /user/property/photos/{id}:
 *   patch:
 *     summary: Update property photo
 *     tags: [Property]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *     responses:
 *       200: { description: Photo updated }
 *   delete:
 *     summary: Delete property photo
 *     tags: [Property]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Photo deleted }
 */
router.patch('/property/photos/:id', upload.single('file'), property.updatePhoto);
router.delete('/property/photos/:id', property.deletePhoto);

module.exports = router;
