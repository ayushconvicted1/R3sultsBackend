const prisma = require('../lib/prisma');

/**
 * Get notifications for the current user (paginated, newest first)
 */
exports.getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.notification.count({
        where: { userId: req.user.id },
      }),
    ]);

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get unread notification count
 */
exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false },
    });

    res.json({ success: true, data: { unreadCount: count } });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark a single notification as read
 */
exports.markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all notifications as read
 */
exports.markAllAsRead = async (req, res, next) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });

    res.json({
      success: true,
      message: `Marked ${result.count} notifications as read`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete/dismiss a notification
 */
exports.deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    await prisma.notification.delete({ where: { id } });

    res.json({ success: true, message: 'Notification dismissed' });
  } catch (error) {
    next(error);
  }
};
