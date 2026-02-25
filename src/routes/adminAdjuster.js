const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/adminAdjusterController');

router.use(authenticate);

router.get('/', ctrl.get_adjusters);
router.post('/', ctrl.post_adjusters);
router.get('/:id', ctrl.get_adjusters__id);
router.put('/:id', ctrl.put_adjusters__id);
router.delete('/:id', ctrl.delete_adjusters__id);
router.post('/seed', ctrl.post_adjusters_seed);
router.delete('/seed', ctrl.delete_adjusters_seed);

module.exports = router;