const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/adminVolunteerController');

router.use(authenticate);

router.get('/', ctrl.get_volunteers);
router.post('/', ctrl.post_volunteers);
router.put('/', ctrl.put_volunteers);
router.delete('/', ctrl.delete_volunteers);
router.post('/:id/assign-disaster', ctrl.post_volunteers__id_assign_disaster);
router.post('/seed', ctrl.post_volunteers_seed);
router.post('/mobile-login', ctrl.post_volunteers_mobile_login);

module.exports = router;