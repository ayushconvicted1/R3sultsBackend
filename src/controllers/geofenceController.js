const prisma = require('../lib/prisma');
const { paginate, paginationMeta } = require('../utils/pagination');

exports.createGeofence = async (req, res, next) => {
  try {
    const { name, description, type, centerLat, centerLng, radius, polygon } = req.body;
    const geofence = await prisma.geofence.create({
      data: {
        userId: req.user.id, name, description: description || null,
        type: type || 'circle', centerLat, centerLng, radius: radius || 0,
        polygon: polygon || null,
      },
    });
    res.status(201).json({ success: true, message: 'Geofence created successfully', data: { geofence } });
  } catch (error) { next(error); }
};

exports.getAllGeofences = async (req, res, next) => {
  try {
    const geofences = await prisma.geofence.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: { geofences } });
  } catch (error) { next(error); }
};

exports.getGeofence = async (req, res, next) => {
  try {
    const geofence = await prisma.geofence.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!geofence) return res.status(404).json({ success: false, message: 'Geofence not found' });
    res.json({ success: true, data: { geofence } });
  } catch (error) { next(error); }
};

exports.updateGeofence = async (req, res, next) => {
  try {
    const existing = await prisma.geofence.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!existing) return res.status(404).json({ success: false, message: 'Geofence not found' });

    const { name, description, centerLat, centerLng, radius, polygon, type, isActive } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (centerLat !== undefined) data.centerLat = centerLat;
    if (centerLng !== undefined) data.centerLng = centerLng;
    if (radius !== undefined) data.radius = radius;
    if (polygon !== undefined) data.polygon = polygon;
    if (type !== undefined) data.type = type;
    if (isActive !== undefined) data.isActive = isActive;

    const geofence = await prisma.geofence.update({ where: { id: req.params.id }, data });
    res.json({ success: true, message: 'Geofence updated successfully', data: { geofence } });
  } catch (error) { next(error); }
};

exports.deleteGeofence = async (req, res, next) => {
  try {
    const existing = await prisma.geofence.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!existing) return res.status(404).json({ success: false, message: 'Geofence not found' });

    await prisma.geofenceEvent.deleteMany({ where: { geofenceId: req.params.id } });
    await prisma.geofence.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Geofence deleted successfully' });
  } catch (error) { next(error); }
};

exports.getGeofenceEvents = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const { page, limit, skip } = paginate(req.query);
    const where = { geofenceId: req.params.id, userId: req.user.id };
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    const [events, total] = await Promise.all([
      prisma.geofenceEvent.findMany({ where, skip, take: limit, orderBy: { timestamp: 'desc' } }),
      prisma.geofenceEvent.count({ where }),
    ]);
    res.json({ success: true, data: { events, pagination: paginationMeta(total, page, limit) } });
  } catch (error) { next(error); }
};

exports.getUserGeofenceEvents = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const { page, limit, skip } = paginate(req.query);
    const where = { userId: req.user.id };
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    const [events, total] = await Promise.all([
      prisma.geofenceEvent.findMany({ where, skip, take: limit, orderBy: { timestamp: 'desc' } }),
      prisma.geofenceEvent.count({ where }),
    ]);
    res.json({ success: true, data: { events, pagination: paginationMeta(total, page, limit) } });
  } catch (error) { next(error); }
};
