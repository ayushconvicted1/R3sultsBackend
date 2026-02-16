const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/notificationController');

// All routes require authentication
router.use(authenticate);

// GET /api/notifications - List notifications (paginated)
router.get('/', ctrl.getNotifications);

// GET /api/notifications/unread-count - Get unread count
router.get('/unread-count', ctrl.getUnreadCount);

// PATCH /api/notifications/read-all - Mark all as read
router.patch('/read-all', ctrl.markAllAsRead);

// PATCH /api/notifications/:id/read - Mark single as read
router.patch('/:id/read', ctrl.markAsRead);

// DELETE /api/notifications/:id - Delete/dismiss
router.delete('/:id', ctrl.deleteNotification);

module.exports = router;
