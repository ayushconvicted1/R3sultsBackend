const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const shopOrder = require('../controllers/shopOrderController');

const orderLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });

/**
 * @swagger
 * /shop/orders:
 *   post:
 *     summary: Create an order (public, no auth required)
 *     tags: [Shop Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [lineItems, shippingAddress]
 *             properties:
 *               lineItems:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [productId, quantity]
 *                   properties:
 *                     productId: { type: string }
 *                     name: { type: string }
 *                     price: { type: number }
 *                     quantity: { type: integer, minimum: 1 }
 *                     image: { type: string }
 *                     size: { type: string }
 *                     color: { type: string }
 *               shippingAddress:
 *                 type: object
 *                 required: [firstName, lastName, email, phone, line1, city, state, postalCode, country]
 *                 properties:
 *                   firstName: { type: string }
 *                   lastName: { type: string }
 *                   email: { type: string, format: email }
 *                   phone: { type: string }
 *                   line1: { type: string }
 *                   line2: { type: string }
 *                   city: { type: string }
 *                   state: { type: string }
 *                   postalCode: { type: string }
 *                   country: { type: string }
 *               billingAddress: { type: object }
 *               billingSameAsShipping: { type: boolean, default: true }
 *               shippingAmount: { type: number, default: 0 }
 *     responses:
 *       201: { description: Order created successfully }
 *       400: { description: Validation error }
 */
router.post('/', orderLimiter, validate([
  body('lineItems').isArray({ min: 1 }).withMessage('lineItems must be a non-empty array'),
  body('lineItems.*.productId').notEmpty().withMessage('Each item must have a productId'),
  body('lineItems.*.quantity').isInt({ min: 1 }).withMessage('Each item quantity must be >= 1'),
  body('shippingAddress.email').isEmail().withMessage('Valid email is required'),
  body('shippingAddress.firstName').notEmpty().withMessage('First name is required'),
  body('shippingAddress.lastName').notEmpty().withMessage('Last name is required'),
  body('shippingAddress.phone').notEmpty().withMessage('Phone is required'),
  body('shippingAddress.line1').notEmpty().withMessage('Address line 1 is required'),
  body('shippingAddress.city').notEmpty().withMessage('City is required'),
  body('shippingAddress.state').notEmpty().withMessage('State is required'),
  body('shippingAddress.postalCode').notEmpty().withMessage('Postal code is required'),
  body('shippingAddress.country').notEmpty().withMessage('Country is required'),
]), shopOrder.createOrder);

/**
 * @swagger
 * /shop/orders/my:
 *   get:
 *     summary: Get orders for the authenticated user (matched by email or phone)
 *     tags: [Shop Orders]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: List of orders }
 *       401: { description: Unauthorized }
 */
router.get('/my', authenticate, shopOrder.getMyOrders);

/**
 * @swagger
 * /shop/orders/my/{id}:
 *   get:
 *     summary: Get a specific order by ID for the authenticated user
 *     tags: [Shop Orders]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Order ID (orderId like ORD-XXXXXX or internal id)
 *     responses:
 *       200: { description: Order details }
 *       401: { description: Unauthorized }
 *       404: { description: Order not found }
 */
router.get('/my/:id', authenticate, shopOrder.getMyOrderById);

module.exports = router;
