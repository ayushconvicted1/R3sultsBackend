const prisma = require('../lib/prisma');
const { paginate, paginationMeta } = require('../utils/pagination');

exports.updateLocation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { latitude, longitude, accuracy, altitude, speed, heading } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user.locationTrackingEnabled) {
      return res.status(400).json({ success: false, message: 'Location tracking is not enabled' });
    }

    const location = await prisma.userLocation.upsert({
      where: { userId },
      update: { latitude, longitude, accuracy, altitude, speed, heading, lastUpdatedAt: new Date() },
      create: { userId, latitude, longitude, accuracy, altitude, speed, heading },
    });

    await prisma.locationHistory.create({
      data: { userId, latitude, longitude, accuracy, altitude, speed, heading },
    });

    // Check geofence events
    const geofenceEvents = [];
    if (user.locationTrackingEnabled) {
      const geofences = await prisma.geofence.findMany({ where: { userId, isActive: true } });
      for (const gf of geofences) {
        const dist = haversineDistance(latitude, longitude, gf.centerLat, gf.centerLng);
        const isInside = dist <= gf.radius;
        const lastEvent = await prisma.geofenceEvent.findFirst({
          where: { geofenceId: gf.id, userId },
          orderBy: { timestamp: 'desc' },
        });
        const wasInside = lastEvent?.eventType === 'enter';

        if (isInside && !wasInside) {
          const event = await prisma.geofenceEvent.create({
            data: { geofenceId: gf.id, userId, eventType: 'enter', latitude, longitude },
          });
          geofenceEvents.push(event);
        } else if (!isInside && wasInside) {
          const event = await prisma.geofenceEvent.create({
            data: { geofenceId: gf.id, userId, eventType: 'exit', latitude, longitude },
          });
          geofenceEvents.push(event);
        }
      }
    }

    res.json({ success: true, message: 'Location updated successfully', data: { location, geofenceEvents } });
  } catch (error) { next(error); }
};

exports.getCurrentLocation = async (req, res, next) => {
  try {
    const location = await prisma.userLocation.findUnique({ where: { userId: req.user.id } });
    res.json({ success: true, data: { location } });
  } catch (error) { next(error); }
};

exports.getUserCurrentLocation = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    let hasAccess = false;

    // 1. Check for explicit sharing
    const sharing = await prisma.locationSharing.findFirst({
      where: { userId, sharedWithId: req.user.id, isActive: true },
    });
    
    if (sharing) {
      if (!sharing.expiresAt || new Date() <= sharing.expiresAt) {
        hasAccess = true;
      }
    } 
    
    // 2. Check for implicit access (Family Group Admin -> Member)
    if (!hasAccess) {
      const groupMember = await prisma.member.findFirst({
        where: { 
          userId: userId, 
          group: { adminId: req.user.id } 
        },
      });
      if (groupMember) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Location not shared with you' });
    }

    const location = await prisma.userLocation.findUnique({ where: { userId } });
    
    if (!location) {
      return res.status(404).json({ success: false, message: 'Location data not found for user' });
    }

    res.json({ success: true, data: { location } });
  } catch (error) { next(error); }
};

exports.getLocationHistory = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const { page, limit, skip } = paginate(req.query);
    const where = { userId: req.user.id };
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    const [history, total] = await Promise.all([
      prisma.locationHistory.findMany({ where, skip, take: limit, orderBy: { timestamp: 'desc' } }),
      prisma.locationHistory.count({ where }),
    ]);
    res.json({ success: true, data: { history, pagination: paginationMeta(total, page, limit) } });
  } catch (error) { next(error); }
};

exports.getUserLocationHistory = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const sharing = await prisma.locationSharing.findFirst({
      where: { userId, sharedWithId: req.user.id, isActive: true },
    });
    if (!sharing) return res.status(403).json({ success: false, message: 'Location not shared with you' });

    const { startDate, endDate } = req.query;
    const { page, limit, skip } = paginate(req.query);
    const where = { userId };
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    const [history, total] = await Promise.all([
      prisma.locationHistory.findMany({ where, skip, take: limit, orderBy: { timestamp: 'desc' } }),
      prisma.locationHistory.count({ where }),
    ]);
    res.json({ success: true, data: { history, pagination: paginationMeta(total, page, limit) } });
  } catch (error) { next(error); }
};

exports.shareLocation = async (req, res, next) => {
  try {
    const { sharedWithId, expiresAt } = req.body;
    const sharing = await prisma.locationSharing.upsert({
      where: { userId_sharedWithId: { userId: req.user.id, sharedWithId } },
      update: { isActive: true, expiresAt: expiresAt ? new Date(expiresAt) : null },
      create: { userId: req.user.id, sharedWithId, expiresAt: expiresAt ? new Date(expiresAt) : null },
    });
    res.json({ success: true, message: 'Location shared successfully', data: { sharing } });
  } catch (error) { next(error); }
};

exports.stopSharingLocation = async (req, res, next) => {
  try {
    const { userId } = req.params;
    await prisma.locationSharing.updateMany({
      where: { userId: req.user.id, sharedWithId: userId },
      data: { isActive: false },
    });
    res.json({ success: true, message: 'Location sharing stopped successfully' });
  } catch (error) { next(error); }
};

exports.getSharedWithUsers = async (req, res, next) => {
  try {
    const sharings = await prisma.locationSharing.findMany({
      where: { userId: req.user.id, isActive: true },
      include: { sharedWith: true },
    });
    const users = sharings.map((s) => {
      const { passwordHash, otpCode, otpExpiresAt, otpAttempts, refreshToken, ...safe } = s.sharedWith;
      return { ...safe, sharingId: s.id, expiresAt: s.expiresAt };
    });
    res.json({ success: true, data: { users } });
  } catch (error) { next(error); }
};

exports.getVisibleUsers = async (req, res, next) => {
  try {
    const sharings = await prisma.locationSharing.findMany({
      where: { sharedWithId: req.user.id, isActive: true },
      include: { user: true },
    });
    const users = sharings.map((s) => {
      const { passwordHash, otpCode, otpExpiresAt, otpAttempts, refreshToken, ...safe } = s.user;
      return { ...safe, sharingId: s.id, expiresAt: s.expiresAt };
    });
    res.json({ success: true, data: { users } });
  } catch (error) { next(error); }
};

exports.getMultipleLocations = async (req, res, next) => {
  try {
    const { userIds } = req.body;
    const sharings = await prisma.locationSharing.findMany({
      where: { userId: { in: userIds }, sharedWithId: req.user.id, isActive: true },
    });
    const allowedIds = sharings.map((s) => s.userId);
    // Also include own location
    if (userIds.includes(req.user.id)) allowedIds.push(req.user.id);

    const locations = await prisma.userLocation.findMany({
      where: { userId: { in: [...new Set(allowedIds)] } },
    });
    res.json({ success: true, data: { locations } });
  } catch (error) { next(error); }
};

exports.getNearbyUsers = async (req, res, next) => {
  try {
    const radius = parseInt(req.query.radius, 10) || 1000;
    const limit = parseInt(req.query.limit, 10) || 50;

    const myLocation = await prisma.userLocation.findUnique({ where: { userId: req.user.id } });
    if (!myLocation) return res.json({ success: true, data: { users: [] } });

    const allLocations = await prisma.userLocation.findMany({
      where: { userId: { not: req.user.id }, isActive: true },
      include: { user: true },
    });

    const nearby = allLocations
      .map((loc) => {
        const dist = haversineDistance(myLocation.latitude, myLocation.longitude, loc.latitude, loc.longitude);
        return { ...loc, distance: dist };
      })
      .filter((loc) => loc.distance <= radius)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit)
      .map((loc) => {
        const { passwordHash, otpCode, otpExpiresAt, otpAttempts, refreshToken, ...safeUser } = loc.user;
        return { ...safeUser, location: { latitude: loc.latitude, longitude: loc.longitude }, distance: loc.distance };
      });

    res.json({ success: true, data: { users: nearby } });
  } catch (error) { next(error); }
};

exports.updateTrackingSettings = async (req, res, next) => {
  try {
    const { locationTrackingEnabled, locationSharingEnabled, locationUpdateInterval } = req.body;
    const data = {};
    if (locationTrackingEnabled !== undefined) data.locationTrackingEnabled = locationTrackingEnabled;
    if (locationSharingEnabled !== undefined) data.locationSharingEnabled = locationSharingEnabled;
    if (locationUpdateInterval !== undefined) {
      data.locationUpdateInterval = Math.min(3600, Math.max(10, parseInt(locationUpdateInterval, 10)));
    }

    const user = await prisma.user.update({ where: { id: req.user.id }, data });
    const { passwordHash, otpCode, otpExpiresAt: oe, otpAttempts: oa, refreshToken: rt, ...safe } = user;
    res.json({ success: true, message: 'Tracking settings updated successfully', data: { user: safe } });
  } catch (error) { next(error); }
};

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
