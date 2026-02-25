const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const cart = require('../controllers/cartController');

const cartLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });

router.use(authenticate);

/**
 * @swagger
 * /cart/add:
 *   post:
 *     summary: Add item to cart
 *     tags: [Cart]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, quantity]
 *             properties:
 *               productId: { type: integer }
 *               quantity: { type: integer, minimum: 1 }
 *     responses:
 *       200: { description: Item added to cart }
 */
router.post('/add', cartLimiter, validate([
  body('productId').isInt(),
  body('quantity').isInt({ min: 1 }),
]), cart.addToCart);

/**
 * @swagger
 * /cart:
 *   get:
 *     summary: Get cart contents
 *     tags: [Cart]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: Cart items }
 */
router.get('/', cart.getCart);

/**
 * @swagger
 * /cart/{productId}:
 *   put:
 *     summary: Update cart item quantity
 *     tags: [Cart]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantity]
 *             properties:
 *               quantity: { type: integer, minimum: 1 }
 *     responses:
 *       200: { description: Cart item updated }
 *   delete:
 *     summary: Remove item from cart
 *     tags: [Cart]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Item removed }
 */
router.put('/:productId', cartLimiter, validate([
  body('quantity').isInt({ min: 1 }),
]), cart.updateCartItem);
router.delete('/:productId', cart.removeCartItem);

/**
 * @swagger
 * /cart/clear:
 *   post:
 *     summary: Clear all cart items
 *     tags: [Cart]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: Cart cleared }
 */
router.post('/clear', cart.clearCart);

module.exports = router;
