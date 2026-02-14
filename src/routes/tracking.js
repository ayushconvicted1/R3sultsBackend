const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const tracking = require('../controllers/trackingController');

router.use(authenticate);

router.post('/location', validate([
  body('latitude').isFloat(),
  body('longitude').isFloat(),
]), tracking.updateLocation);

router.get('/location/current', tracking.getCurrentLocation);
router.get('/location/current/:userId', tracking.getUserCurrentLocation);
router.get('/location/history', tracking.getLocationHistory);
router.get('/location/history/:userId', tracking.getUserLocationHistory);

router.post('/location/share', validate([
  body('sharedWithId').notEmpty(),
]), tracking.shareLocation);

router.delete('/location/share/:userId', tracking.stopSharingLocation);
router.get('/location/shared', tracking.getSharedWithUsers);
router.get('/location/visible', tracking.getVisibleUsers);

router.post('/location/multiple', validate([
  body('userIds').isArray(),
]), tracking.getMultipleLocations);

router.get('/location/nearby', tracking.getNearbyUsers);
router.put('/settings', tracking.updateTrackingSettings);

module.exports = router;
