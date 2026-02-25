const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/adminDeviceController');

router.use(authenticate);

router.get('/', ctrl.get_devices);
router.post('/', ctrl.post_devices);
router.put('/', ctrl.put_devices);
router.delete('/', ctrl.delete_devices);
router.post('/seed', ctrl.post_devices_seed);

module.exports = router;