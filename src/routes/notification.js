const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/notificationController');

router.use(authenticate);

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: List notifications (paginated)
 *     tags: [Notifications]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: Paginated notifications }
 */
router.get('/', ctrl.getNotifications);

/**
 * @swagger
 * /notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     tags: [Notifications]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: Unread count }
 */
router.get('/unread-count', ctrl.getUnreadCount);

/**
 * @swagger
 * /notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: All marked as read }
 */
router.patch('/read-all', ctrl.markAllAsRead);

/**
 * @swagger
 * /notifications/{id}/read:
 *   patch:
 *     summary: Mark single notification as read
 *     tags: [Notifications]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Notification marked as read }
 */
router.patch('/:id/read', ctrl.markAsRead);

/**
 * @swagger
 * /notifications/{id}:
 *   delete:
 *     summary: Delete notification
 *     tags: [Notifications]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Notification deleted }
 */
router.delete('/:id', ctrl.deleteNotification);

module.exports = router;
