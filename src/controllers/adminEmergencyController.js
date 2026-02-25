const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'results-jwt-secret-key-2024';

// ─── emergencies ───
exports.get_emergencies = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        if (!tokenPayload) {
            return res.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        // req.query is already available via Express;
        const page = parseInt(req.query['page'] || '1');
        const limit = parseInt(req.query['limit'] || '10');
        const search = req.query['search'] || '';
        const type = req.query['type'] || '';
        const status = req.query['status'] || '';
        const priority = req.query['priority'] || '';
        const query = {};
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { 'requestedBy.name': { $regex: search, $options: 'i' } },
            ];
        }
        if (type)
            query.type = type;
        if (status)
            query.status = status;
        if (priority)
            query.priority = priority;
        const skip = (page - 1) * limit;
        const [emergencies, total] = await Promise.all([
            prisma.adminEmergency.findMany({ where: query, orderBy: { createdAt: 'desc' }, skip: skip, take: limit }),
            prisma.adminEmergency.count({ where: query }),
        ]);
        return res.json({
            success: true,
            data: {
                emergencies,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                    hasMore: skip + emergencies.length < total,
                },
            },
        });
    }
    catch (error) {
        console.error('Get emergencies error:', error);
        return res.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('get_emergencies error:', error);
    next(error);
  }
};

exports.post_emergencies = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        if (!tokenPayload) {
            return res.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        if (!true) {
            return res.json({ success: false, error: 'Permission denied' }, { status: 403 });
        }
        const body = req.body;
        const { title, description, type, priority, disasterId, location, requestedBy, numberOfPeople, specialRequirements, } = body;
        const emergency = await prisma.adminprisma.adminEmergency.create({ data: { data: {
                    title,
                    description,
                    type,
                    priority,
                    status: 'pending',
                    disasterId,
                    location: {
                        type: 'Point',
                        coordinates: location.coordinates,
                        address: location.address,
                    },
                    requestedBy,
                    numberOfPeople: numberOfPeople || 1,
                    specialRequirements: specialRequirements || [],
                } } });
        return res.json({
            success: true,
            data: { emergency },
            message: 'Emergency created successfully',
        });
    }
    catch (error) {
        console.error('Create emergency error:', error);
        return res.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('post_emergencies error:', error);
    next(error);
  }
};
