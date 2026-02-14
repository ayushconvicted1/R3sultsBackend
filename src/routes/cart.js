const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const cart = require('../controllers/cartController');

const cartLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });

router.use(authenticate);

router.post('/add', cartLimiter, validate([
  body('productId').isInt(),
  body('quantity').isInt({ min: 1 }),
]), cart.addToCart);

router.get('/', cart.getCart);
router.put('/:productId', cartLimiter, validate([
  body('quantity').isInt({ min: 1 }),
]), cart.updateCartItem);
router.delete('/:productId', cart.removeCartItem);
router.post('/clear', cart.clearCart);

module.exports = router;
