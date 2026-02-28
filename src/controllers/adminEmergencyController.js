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
            return res.status(401).json({ success: false, error: 'Unauthorized' });
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
        return res.status(500).json({ success: false, error: 'Internal server error' });
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
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        if (!true) {
            return res.status(403).json({ success: false, error: 'Permission denied' });
        }
        const body = req.body;
        const { title, description, type, priority, disasterId, location, requestedBy, numberOfPeople, specialRequirements, } = body;
        const emergencyData = {
            title,
            description: description || '',
            type,
            priority,
            status: 'pending',
            numberOfPeople: numberOfPeople || 1,
            specialRequirements: specialRequirements || [],
            location: {
                type: 'Point',
                coordinates: location?.coordinates || [0, 0],
                address: location?.address || '',
            },
            requestedBy: requestedBy || { name: 'Unknown', phone: '', email: '' },
        };
        
        if (disasterId) {
            emergencyData.disasterId = disasterId;
        }

        const emergency = await prisma.adminEmergency.create({ data: emergencyData });
        return res.json({
            success: true,
            data: { emergency },
            message: 'Emergency created successfully',
        });
    }
    catch (error) {
        console.error('Create emergency error:', error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }

  } catch (error) {
    console.error('post_emergencies error:', error);
    next(error);
  }
};
