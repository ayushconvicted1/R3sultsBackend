const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/adminOrderController');

router.use(authenticate);

router.get('/', ctrl.get_orders);
router.get('/:id', ctrl.get_orders__id);

module.exports = router;