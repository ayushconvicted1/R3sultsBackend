const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const product = require('../controllers/productController');

const adminLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50 });

/**
 * @swagger
 * /products:
 *   get:
 *     summary: List all products (public)
 *     tags: [Products]
 *     responses:
 *       200: { description: List of products }
 *   post:
 *     summary: Create a product (Admin only)
 *     tags: [Products]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, price, category]
 *             properties:
 *               name: { type: string }
 *               price: { type: number, minimum: 0 }
 *               category: { type: string }
 *               description: { type: string }
 *     responses:
 *       201: { description: Product created }
 */
router.get('/', product.getAllProducts);
router.post('/', authenticate, requireRole('SUPER_ADMIN', 'ADMIN'), adminLimiter, validate([
  body('name').notEmpty(),
  body('price').isFloat({ min: 0 }),
  body('category').notEmpty(),
]), product.createProduct);

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Product details }
 *   put:
 *     summary: Update product (Admin only)
 *     tags: [Products]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Product updated }
 *   delete:
 *     summary: Delete product (Admin only)
 *     tags: [Products]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Product deleted }
 */
router.get('/:id', product.getProductById);
router.put('/:id', authenticate, requireRole('SUPER_ADMIN', 'ADMIN'), adminLimiter, product.updateProduct);
router.delete('/:id', authenticate, requireRole('SUPER_ADMIN', 'ADMIN'), adminLimiter, product.deleteProduct);

module.exports = router;
