const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const geo = require('../controllers/geofenceController');

router.use(authenticate);

router.post('/', validate([
  body('name').notEmpty(),
  body('centerLat').isFloat(),
  body('centerLng').isFloat(),
]), geo.createGeofence);

router.get('/', geo.getAllGeofences);
router.get('/events', geo.getUserGeofenceEvents);
router.get('/:id', geo.getGeofence);
router.put('/:id', geo.updateGeofence);
router.delete('/:id', geo.deleteGeofence);
router.get('/:id/events', geo.getGeofenceEvents);

module.exports = router;
