const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/adminShelterController');

router.use(authenticate);

router.get('/', ctrl.get_shelters);
router.post('/', ctrl.post_shelters);
router.put('/', ctrl.put_shelters);
router.delete('/', ctrl.delete_shelters);
router.post('/seed', ctrl.post_shelters_seed);
router.delete('/seed', ctrl.delete_shelters_seed);
router.get('/init', ctrl.get_shelters_init);
router.get('/auto-seed', ctrl.get_shelters_auto_seed);

module.exports = router;