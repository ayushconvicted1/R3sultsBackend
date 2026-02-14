const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, optionalAuth, requireRole } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const product = require('../controllers/productController');

const adminLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50 });

router.get('/', optionalAuth, product.getAllProducts);
router.get('/:id', product.getProductById);

router.post('/', authenticate, requireRole('SUPER_ADMIN', 'ADMIN'), adminLimiter, validate([
  body('name').notEmpty(),
  body('price').isFloat({ min: 0 }),
  body('category').notEmpty(),
]), product.createProduct);

router.put('/:id', authenticate, requireRole('SUPER_ADMIN', 'ADMIN'), adminLimiter, product.updateProduct);
router.delete('/:id', authenticate, requireRole('SUPER_ADMIN', 'ADMIN'), adminLimiter, product.deleteProduct);

module.exports = router;
