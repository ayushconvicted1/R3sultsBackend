const prisma = require('../lib/prisma');
const { sendMulticastNotification } = require('../services/fcm');

/**
 * Create a geo-targeted broadcast notification.
 *
 * Finds all users whose last-known location (UserLocation) falls within the
 * given radius of [latitude, longitude] using the Haversine formula, then sends
 * each of them an FCM push notification and persists a Notification record.
 *
 * POST /api/admin/broadcast
 * Body: { latitude, longitude, radius (meters), title, description }
 */
exports.createBroadcast = async (req, res, next) => {
  try {
    const { latitude, longitude, radius, title, description } = req.body;

    // ── 1. Find users within the radius using Haversine in raw SQL ──
    // Haversine formula returns distance in meters.
    // We join user_locations → users to grab fcmToken in one query.
    const nearbyUsers = await prisma.$queryRaw`
      SELECT * FROM (
        SELECT
          ul."userId",
          u."fcmToken",
          u."fullName",
          (
            6371000 * acos(
              LEAST(1.0,
                cos(radians(${latitude})) * cos(radians(ul."latitude"))
                * cos(radians(ul."longitude") - radians(${longitude}))
                + sin(radians(${latitude})) * sin(radians(ul."latitude"))
              )
            )
          ) AS distance
        FROM user_locations ul
        JOIN users u ON u.id = ul."userId"
        WHERE u."isActive" = true
          AND u."deletedAt" IS NULL
      ) AS nearby
      WHERE distance <= ${radius}
      ORDER BY distance ASC
    `;

    if (!nearbyUsers || nearbyUsers.length === 0) {
      // Still create a broadcast record for audit even if no users found
      await prisma.broadcast.create({
        data: { title, description, latitude, longitude, radius, sentBy: req.user.id, sentCount: 0 },
      });

      return res.status(200).json({
        success: true,
        message: 'Broadcast created but no users found in the specified area',
        data: { usersFound: 0, notificationsSent: 0 },
      });
    }

    // ── 2. Collect valid FCM tokens ──
    const tokens = nearbyUsers
      .map((u) => u.fcmToken)
      .filter((t) => t && t.length > 0);

    // ── 3. Send FCM push notifications ──
    let fcmResult = { successCount: 0, failureCount: 0 };
    if (tokens.length > 0) {
      try {
        fcmResult = await sendMulticastNotification(
          tokens,
          title,
          description,
          {
            type: 'broadcast',
            broadcastLat: String(latitude),
            broadcastLng: String(longitude),
            broadcastRadius: String(radius),
          },
        );
      } catch (fcmError) {
        console.error('FCM multicast error (non-fatal):', fcmError);
      }
    }

    // ── 4. Create in-app Notification records for each targeted user ──
    const notificationData = nearbyUsers.map((u) => ({
      userId: u.userId,
      title,
      body: description,
      type: 'broadcast',
      data: {
        broadcastLat: latitude,
        broadcastLng: longitude,
        broadcastRadius: radius,
      },
    }));

    await prisma.notification.createMany({ data: notificationData });

    // ── 5. Persist broadcast record for auditing ──
    const broadcast = await prisma.broadcast.create({
      data: {
        title,
        description,
        latitude,
        longitude,
        radius,
        sentBy: req.user.id,
        sentCount: nearbyUsers.length,
      },
    });

    res.status(201).json({
      success: true,
      message: `Broadcast sent to ${nearbyUsers.length} user(s)`,
      data: {
        broadcast,
        usersFound: nearbyUsers.length,
        notificationsSent: fcmResult.successCount || tokens.length,
        notificationsFailed: fcmResult.failureCount || 0,
        users: nearbyUsers.map((u) => ({
          userId: u.userId,
          fullName: u.fullName,
          distance: Math.round(Number(u.distance)),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List broadcasts with pagination, search, and date filtering.
 *
 * GET /api/admin/broadcast?page=1&limit=20&search=storm&from=2025-01-01&to=2025-12-31
 */
exports.getBroadcasts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const search = (req.query.search || '').trim();
    const from = req.query.from;
    const to = req.query.to;
    const skip = (page - 1) * limit;

    const where = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [broadcasts, total] = await Promise.all([
      prisma.broadcast.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.broadcast.count({ where }),
    ]);

    // Fetch sender details for all unique sentBy IDs
    const senderIds = [...new Set(broadcasts.map((b) => b.sentBy).filter(Boolean))];
    const senders = senderIds.length
      ? await prisma.user.findMany({
          where: { id: { in: senderIds } },
          select: { id: true, fullName: true, email: true, phoneNumber: true, role: true },
        })
      : [];
    const senderMap = Object.fromEntries(senders.map((s) => [s.id, s]));

    const broadcastsWithSender = broadcasts.map((b) => ({
      ...b,
      sentByUser: senderMap[b.sentBy] || null,
    }));

    res.json({
      success: true,
      data: {
        broadcasts: broadcastsWithSender,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single broadcast by ID.
 *
 * GET /api/admin/broadcast/:id
 */
exports.getBroadcastById = async (req, res, next) => {
  try {
    const broadcast = await prisma.broadcast.findUnique({
      where: { id: req.params.id },
    });

    if (!broadcast) {
      return res.status(404).json({ success: false, message: 'Broadcast not found' });
    }

    // Fetch sender details
    const sentByUser = broadcast.sentBy
      ? await prisma.user.findUnique({
          where: { id: broadcast.sentBy },
          select: { id: true, fullName: true, email: true, phoneNumber: true, role: true },
        })
      : null;

    res.json({ success: true, data: { broadcast: { ...broadcast, sentByUser } } });
  } catch (error) {
    next(error);
  }
};
