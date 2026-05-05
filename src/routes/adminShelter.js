const router = require('express').Router();
const { authenticate, requireAction } = require('../middleware/auth');
const ctrl = require('../controllers/adminShelterController');

router.use(authenticate);

router.get('/', requireAction('shelters.list'), ctrl.get_shelters);
router.post('/', requireAction('shelters.create'), ctrl.post_shelters);
router.put('/', requireAction('shelters.update'), ctrl.put_shelters);
router.delete('/', requireAction('shelters.delete'), ctrl.delete_shelters);
router.post('/seed', requireAction('shelters.seed'), ctrl.post_shelters_seed);
router.delete('/seed', requireAction('shelters.seed'), ctrl.delete_shelters_seed);
router.get('/init', requireAction('shelters.init'), ctrl.get_shelters_init);
router.get('/auto-seed', requireAction('shelters.seed'), ctrl.get_shelters_auto_seed);

module.exports = router;