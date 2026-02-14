const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const order = require('../controllers/orderController');

const orderLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

router.use(authenticate);

router.post('/', orderLimiter, validate([
  body('deliveryAddress').notEmpty(),
]), order.createOrder);

router.get('/', order.getOrders);
router.get('/:id', order.getOrderById);

module.exports = router;
