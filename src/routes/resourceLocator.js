const router = require('express').Router();
const ctrl = require('../controllers/resourceLocatorController');

// All resource-locator routes are public (no auth required)

/**
 * @swagger
 * /resource-locator/categories:
 *   get:
 *     summary: Get resource categories
 *     tags: [Resource Locator]
 *     responses:
 *       200: { description: List of categories }
 */
router.get('/categories', ctrl.getCategories);

/**
 * @swagger
 * /resource-locator/resources:
 *   get:
 *     summary: List resources (shelters)
 *     tags: [Resource Locator]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: lat
 *         schema: { type: number }
 *       - in: query
 *         name: lng
 *         schema: { type: number }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200: { description: List of resources }
 */
router.get('/resources', ctrl.getResources);

/**
 * @swagger
 * /resource-locator/resources/{id}:
 *   get:
 *     summary: Get resource details
 *     tags: [Resource Locator]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Resource details }
 */
router.get('/resources/:id', ctrl.getResourceById);

module.exports = router;
