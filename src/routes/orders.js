const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const order = require('../controllers/orderController');

const orderLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

router.use(authenticate);

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Create an order from cart
 *     tags: [Orders]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [deliveryAddress]
 *             properties:
 *               deliveryAddress: { type: string }
 *     responses:
 *       201: { description: Order created }
 *   get:
 *     summary: Get user's orders
 *     tags: [Orders]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: List of orders }
 */
router.post('/', orderLimiter, validate([
  body('deliveryAddress').notEmpty(),
]), order.createOrder);
router.get('/', order.getOrders);

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Orders]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Order details }
 */
router.get('/:id', order.getOrderById);

module.exports = router;
