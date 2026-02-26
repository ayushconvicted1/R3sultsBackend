const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'results-jwt-secret-key-2024';

// ─── disasters ───
exports.get_disasters = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        if (!tokenPayload) {
            return res.json({ success: false, message: 'Not authorized. No token provided.' }, { status: 401 });
        }
        // Get query parameters
        // req.query is already available via Express;
        const page = parseInt(req.query['page'] || '1', 10);
        const limit = parseInt(req.query['limit'] || '10', 10);
        const search = req.query['search'] || '';
        const type = req.query['type'] || '';
        const status = req.query['status'] || '';
        const severity = req.query['severity'] || '';
        // Build query
        const query = {};
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { 'location.address': { $regex: search, $options: 'i' } },
                { 'location.city': { $regex: search, $options: 'i' } },
                { 'location.state': { $regex: search, $options: 'i' } },
            ];
        }
        if (type) {
            query.type = type;
        }
        if (status) {
            query.status = status;
        }
        if (severity) {
            query.severity = severity;
        }
        // Calculate skip
        const skip = (page - 1) * limit;
        // Fetch disasters from database
        const disastersRaw = await prisma.adminDisaster.findMany({ where: query });
        const total = await prisma.adminDisaster.count({ where: query });
        // Manually populate userId for volunteers since it's a string reference
        const disasters = await Promise.all(disastersRaw.map(async (disaster) => {
            if (disaster.assignedVolunteers && Array.isArray(disaster.assignedVolunteers)) {
                disaster.assignedVolunteers = await Promise.all(disaster.assignedVolunteers.map(async (av) => {
                    if (av.volunteerId && av.volunteerId.userId) {
                        const user = await prisma.adminUser.findUnique({ where: { id: av.volunteerId.userId } });
                        if (user) {
                            av.volunteerId.userId = user;
                        }
                    }
                    return av;
                }));
            }
            return disaster;
        }));
        // Transform disasters to match expected format
        const transformedDisasters = disasters.map((disaster) => {
            // Handle coordinates - can be GeoJSON [lng, lat] or {lat, lng}
            let coordinates;
            if (disaster.location?.coordinates) {
                if (Array.isArray(disaster.location.coordinates)) {
                    // GeoJSON format: [longitude, latitude]
                    coordinates = {
                        lat: disaster.location.coordinates[1],
                        lng: disaster.location.coordinates[0],
                    };
                }
                else if (typeof disaster.location.coordinates === 'object') {
                    // Already in {lat, lng} format
                    coordinates = disaster.location.coordinates;
                }
            }
            // Transform assignedVolunteers
            let assignedVolunteers = [];
            if (disaster.assignedVolunteers && Array.isArray(disaster.assignedVolunteers)) {
                assignedVolunteers = disaster.assignedVolunteers.map((av) => {
                    const volunteer = av.volunteerId;
                    return {
                        volunteerId: { id: volunteer?.id?.toString() || volunteer?.id?.toString() || '',
                            volunteerId: volunteer?.volunteerId || '',
                            userId: volunteer?.userId ? {
                                firstName: volunteer.userId.firstName || '',
                                lastName: volunteer.userId.lastName || '',
                                name: volunteer.userId.name || `${volunteer.userId.firstName || ''} ${volunteer.userId.lastName || ''}`.trim() || 'Unknown',
                                email: volunteer.userId.email || '',
                                phone: volunteer.userId.phone || '',
                            } : undefined,
                        },
                        assignedAt: (av.assignedAt && !isNaN(new Date(av.assignedAt).valueOf())) ? new Date(av.assignedAt).toISOString() : new Date().toISOString(),
                        assignedBy: av.assignedBy ? { id: av.assignedBy.id?.toString() || '',
                            firstName: av.assignedBy.firstName || '',
                            lastName: av.assignedBy.lastName || '',
                            name: av.assignedBy.name || `${av.assignedBy.firstName || ''} ${av.assignedBy.lastName || ''}`.trim() || 'Unknown',
                            email: av.assignedBy.email || '',
                        } : undefined,
                        status: av.status || 'assigned',
                    };
                });
            }
            return { id: disaster.id.toString(),
                id: disaster.id.toString(),
                title: disaster.title,
                description: disaster.description,
                type: disaster.type,
                severity: disaster.severity,
                status: disaster.status,
                location: {
                    address: disaster.location?.address,
                    city: disaster.location?.city,
                    state: disaster.location?.state,
                    country: disaster.location?.country || 'USA',
                    coordinates: coordinates,
                },
                affectedArea: disaster.affectedArea,
                estimatedAffectedPeople: disaster.affectedPopulation || disaster.estimatedAffectedPeople,
                assignedVolunteers: assignedVolunteers,
                reportedBy: disaster.reportedBy,
                reportedAt: disaster.reportedAt,
                startedAt: disaster.startedAt,
                createdAt: disaster.createdAt,
                updatedAt: disaster.updatedAt,
            };
        });
        return res.json({
            success: true,
            data: {
                disasters: transformedDisasters,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            },
        });
    }
    catch (error) {
        console.error('Get disasters error:', error);
        return res.json({
            success: false,
            error: error.message || 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }

  } catch (error) {
    console.error('get_disasters error:', error);
    next(error);
  }
};

exports.post_disasters = async (req, res, next) => {
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
        const { title, description, type, severity, status, location, affectedArea, affectedPopulation, startedAt, } = body;
        const disaster = await prisma.adminDisaster.create({ data: {
            title,
            description,
            type,
            severity,
            status: status || 'active',
            location: {
                type: 'Point',
                coordinates: location.coordinates ? (Array.isArray(location.coordinates) ? location.coordinates : [location.coordinates.lng, location.coordinates.lat]) : undefined,
                address: location.address,
                city: location.city,
                state: location.state,
                country: location.country || 'USA',
            },
            affectedArea: affectedArea || 0,
            affectedPopulation: affectedPopulation || 0,
            reportedBy: tokenPayload.userId,
            reportedAt: new Date(),
            startedAt: startedAt ? new Date(startedAt) : new Date(),
        } });
        return res.json({
            success: true,
            data: { disaster },
            message: 'Disaster reported successfully',
        });
    }
    catch (error) {
        console.error('Create disaster error:', error);
        return res.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('post_disasters error:', error);
    next(error);
  }
};

// ─── disasters/[id] ───
exports.get_disasters__id = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        const { id } = req.params;
        if (!tokenPayload) {
            return res.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const disaster = await prisma.adminDisaster.findUnique({ where: { id: id } });
        if (!disaster) {
            return res.json({ success: false, error: 'Disaster not found' }, { status: 404 });
        }
        return res.json({
            success: true,
            data: { disaster },
        });
    }
    catch (error) {
        console.error('Get disaster error:', error);
        return res.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('get_disasters__id error:', error);
    next(error);
  }
};

exports.put_disasters__id = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        const { id } = req.params;
        if (!tokenPayload) {
            return res.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        if (!true) {
            return res.json({ success: false, error: 'Permission denied' }, { status: 403 });
        }
        const body = req.body;
        const disaster = await prisma.adminDisaster.findUnique({ where: { id: id } });
        if (!disaster) {
            return res.json({ success: false, error: 'Disaster not found' }, { status: 404 });
        }
        // Build update object
        const updateData = {};
        
        // Update fields
        const updateFields = [
            'title', 'description', 'type', 'severity', 'status',
            'affectedArea', 'affectedPopulation'
        ];
        updateFields.forEach((field) => {
            if (body[field] !== undefined) {
                updateData[field] = body[field];
            }
        });
        if (body.location) {
            // Handle coordinates - convert from {lat, lng} to [lng, lat] if needed
            let coordinates = body.location.coordinates || (disaster.location && disaster.location.coordinates);
            if (coordinates && !Array.isArray(coordinates)) {
                // Convert {lat, lng} to [lng, lat] (GeoJSON format)
                if (coordinates.lat !== undefined && coordinates.lng !== undefined) {
                    coordinates = [coordinates.lng, coordinates.lat];
                }
            }
            updateData.location = {
                type: 'Point',
                coordinates: coordinates,
                address: body.location.address !== undefined ? body.location.address : (disaster.location && disaster.location.address),
                city: body.location.city !== undefined ? body.location.city : (disaster.location && disaster.location.city),
                state: body.location.state !== undefined ? body.location.state : (disaster.location && disaster.location.state),
                country: body.location.country !== undefined ? (body.location.country || 'USA') : (disaster.location && disaster.location.country),
            };
        }
        if (body.casualties) {
            updateData.casualties = typeof disaster.casualties === 'object' && disaster.casualties !== null 
                ? { ...disaster.casualties, ...body.casualties } 
                : body.casualties;
        }
        if (body.resources) {
            updateData.resources = typeof disaster.resources === 'object' && disaster.resources !== null 
                ? { ...disaster.resources, ...body.resources } 
                : body.resources;
        }
        // Add update log
        if (body.updateMessage) {
            const currentUpdates = Array.isArray(disaster.updates) ? [...disaster.updates] : [];
            currentUpdates.push({
                message: body.updateMessage,
                updatedBy: tokenPayload.userId,
                updatedAt: new Date(),
            });
            updateData.updates = currentUpdates;
        }
        // Mark as resolved if status changed to resolved
        if (body.status === 'resolved' && disaster.status !== 'resolved') {
            updateData.resolvedAt = new Date();
        }
        
        const updatedDisaster = await prisma.adminDisaster.update({
            where: { id: id },
            data: updateData
        });
        
        return res.json({
            success: true,
            data: { disaster: updatedDisaster },
            message: 'Disaster updated successfully',
        });
    }
    catch (error) {
        console.error('Update disaster error:', error);
        return res.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('put_disasters__id error:', error);
    next(error);
  }
};

exports.delete_disasters__id = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        const { id } = req.params;
        if (!tokenPayload) {
            return res.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        if (!true) {
            return res.json({ success: false, error: 'Only Super Admin can delete disasters' }, { status: 403 });
        }
        // Find the disaster first to get assigned volunteers
        const disaster = await prisma.adminDisaster.findUnique({ where: { id: id } });
        if (!disaster) {
            return res.json({ success: false, error: 'Disaster not found' }, { status: 404 });
        }
        // Get all assigned volunteer IDs before deleting
        const assignedVolunteerIds = [];
        if (disaster.assignedVolunteers && Array.isArray(disaster.assignedVolunteers)) {
            disaster.assignedVolunteers.forEach((av) => {
                const volId = av.volunteerId;
                if (volId) {
                    const volunteerIdStr = typeof volId === 'string'
                        ? volId
                        : (typeof volId === 'object' && volId?.id ? volId.id.toString() : '');
                    if (volunteerIdStr) {
                        assignedVolunteerIds.push(volunteerIdStr);
                    }
                }
            });
        }
        // Update all assigned volunteers - remove this disaster from their assignedDisasters
        if (assignedVolunteerIds.length > 0) {
            const volunteers = await prisma.volunteer.findMany({ where: { id: { in: assignedVolunteerIds } } });
            for (const volunteer of volunteers) {
                const volunteerDoc = volunteer;
                // Remove this disaster from volunteer's assignedDisasters
                if (volunteerDoc.assignedDisasters && Array.isArray(volunteerDoc.assignedDisasters)) {
                    const beforeLength = volunteerDoc.assignedDisasters.length;
                    volunteerDoc.assignedDisasters = volunteerDoc.assignedDisasters.filter((ad) => ad.disasterId?.toString() !== id);
                    const afterLength = volunteerDoc.assignedDisasters.length;
                    // Check if volunteer has any other active assignments
                    const now = new Date();
                    const hasActiveAssignments = volunteerDoc.assignedDisasters?.some((ad) => {
                        const toDate = new Date(ad.toDate);
                        const status = ad.status;
                        return toDate > now && (status === 'assigned' || status === 'active');
                    });
                    // If no active assignments, change availability back to 'available'
                    let availabilityChanged = false;
                    if (!hasActiveAssignments && volunteerDoc.availability === 'on_mission') {
                        volunteerDoc.availability = 'available';
                        availabilityChanged = true;
                    }
                    // Only save if there was a change
                    if (beforeLength !== afterLength || availabilityChanged) {
                        await prisma.volunteer.update({
                            where: { id: volunteerDoc.id },
                            data: {
                                assignedDisasters: volunteerDoc.assignedDisasters,
                                availability: volunteerDoc.availability
                            }
                        });
                    }
                }
            }
        }
        // Now delete the disaster
        await prisma.adminDisaster.delete({ where: { id: id } });
        return res.json({
            success: true,
            message: 'Disaster deleted successfully. All assigned volunteers have been updated.',
            data: {
                removedVolunteersCount: assignedVolunteerIds.length,
            },
        });
    }
    catch (error) {
        console.error('Delete disaster error:', error);
        return res.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('delete_disasters__id error:', error);
    next(error);
  }
};

// ─── disasters/[id]/assign-volunteer ───
exports.post_disasters__id_assign_volunteer = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        const { id: disasterId } = req.params;
        if (!tokenPayload) {
            return res.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        if (!true) {
            return res.json({ success: false, error: 'Permission denied' }, { status: 403 });
        }
        const body = req.body;
        const { volunteerId, fromDate, toDate } = body;
        if (!volunteerId) {
            return res.json({ success: false, error: 'Volunteer ID is required' }, { status: 400 });
        }
        // Find disaster
        const disaster = await prisma.adminDisaster.findUnique({ where: { id: disasterId } });
        if (!disaster) {
            return res.json({ success: false, error: 'Disaster not found' }, { status: 404 });
        }
        // Find volunteer
        const volunteer = await prisma.volunteer.findUnique({ where: { id: volunteerId } });
        if (!volunteer) {
            return res.json({ success: false, error: 'Volunteer not found' }, { status: 404 });
        }
        // Check if volunteer is already assigned to this disaster
        const existingAssignment = disaster.assignedVolunteers.find((v) => v.volunteerId?.toString() === volunteerId);
        if (existingAssignment) {
            return res.json({ success: false, error: 'Volunteer is already assigned to this disaster' }, { status: 400 });
        }
        // Check if volunteer is on mission (has active assignments)
        const volunteerDoc = volunteer;
        const now = new Date();
        const hasActiveAssignments = volunteerDoc.assignedDisasters?.some((ad) => {
            const toDate = new Date(ad.toDate);
            const status = ad.status;
            return toDate > now && (status === 'assigned' || status === 'active');
        });
        if (volunteerDoc.availability === 'on_mission' || hasActiveAssignments) {
            return res.json({ success: false, error: 'Volunteer is currently on mission and cannot be assigned to another disaster until their current assignment period ends' }, { status: 400 });
        }
        // Add volunteer to disaster
        disaster.assignedVolunteers.push({
            volunteerId: volunteerId,
            assignedAt: new Date(),
            assignedBy: tokenPayload.userId,
            status: 'assigned',
        });
        // Update volunteer's assignedDisasters (new schema with dates)
        const isAlreadyAssigned = volunteerDoc.assignedDisasters?.some((ad) => ad.disasterId?.toString() === disasterId);
        if (!isAlreadyAssigned) {
            volunteerDoc.assignedDisasters = volunteerDoc.assignedDisasters || [];
            volunteerDoc.assignedDisasters.push({
                disasterId: disasterId,
                assignedAt: new Date(),
                assignedBy: tokenPayload.userId,
                fromDate: fromDate ? new Date(fromDate) : new Date(), // Use provided date or default to today
                toDate: toDate ? new Date(toDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Use provided date or default to 30 days from now
                status: 'assigned',
            });
            // Change volunteer availability to 'on_mission'
            volunteerDoc.availability = 'on_mission';
        }
        // Update resources count
        const resources = typeof disaster.resources === 'object' && disaster.resources !== null ? { ...disaster.resources } : { volunteersDeployed: 0 };
        resources.volunteersDeployed = disaster.assignedVolunteers.length;
        
        const [updatedDisaster] = await Promise.all([
            prisma.adminDisaster.update({
                where: { id: disasterId },
                data: { assignedVolunteers: disaster.assignedVolunteers, resources }
            }),
            prisma.volunteer.update({
                where: { id: volunteerId },
                data: { assignedDisasters: volunteerDoc.assignedDisasters, availability: volunteerDoc.availability }
            })
        ]);
        
        return res.json({
            success: true,
            data: { disaster: updatedDisaster },
            message: 'Volunteer assigned successfully',
        });
    }
    catch (error) {
        console.error('Assign volunteer error:', error);
        return res.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('post_disasters__id_assign_volunteer error:', error);
    next(error);
  }
};

exports.delete_disasters__id_assign_volunteer = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        const { id: disasterId } = req.params;
        if (!tokenPayload) {
            return res.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        if (!true) {
            return res.json({ success: false, error: 'Permission denied' }, { status: 403 });
        }
        // req.query is already available via Express;
        const volunteerId = req.query['volunteerId'];
        if (!volunteerId) {
            return res.json({ success: false, error: 'Volunteer ID is required' }, { status: 400 });
        }
        // Find disaster
        const disaster = await prisma.adminDisaster.findUnique({ where: { id: disasterId } });
        if (!disaster) {
            return res.json({ success: false, error: 'Disaster not found' }, { status: 404 });
        }
        // Remove volunteer from disaster
        disaster.assignedVolunteers = disaster.assignedVolunteers.filter((v) => v.volunteerId?.toString() !== volunteerId);
        // Update volunteer's assignedDisasters (new schema)
        const volunteer = await prisma.volunteer.findUnique({ where: { id: volunteerId } });
        if (volunteer) {
            const volunteerDoc = volunteer;
            const beforeLength = (volunteerDoc.assignedDisasters || []).length;
            volunteerDoc.assignedDisasters = (volunteerDoc.assignedDisasters || []).filter((ad) => ad.disasterId?.toString() !== disasterId);
            const afterLength = volunteerDoc.assignedDisasters.length;
            // Check if volunteer has any other active assignments
            const now = new Date();
            const hasActiveAssignments = volunteerDoc.assignedDisasters?.some((ad) => {
                const toDate = new Date(ad.toDate);
                const status = ad.status;
                return toDate > now && (status === 'assigned' || status === 'active');
            });
            // If no active assignments, change availability back to 'available'
            let availabilityChanged = false;
            if (!hasActiveAssignments && volunteerDoc.availability === 'on_mission') {
                volunteerDoc.availability = 'available';
                availabilityChanged = true;
            }
            // Only save if there was a change
            if (beforeLength !== afterLength || availabilityChanged) {
                await prisma.volunteer.update({
                    where: { id: volunteerDoc.id },
                    data: {
                        assignedDisasters: volunteerDoc.assignedDisasters,
                        availability: volunteerDoc.availability
                    }
                });
            }
        }
        // Update resources count
        const resources = typeof disaster.resources === 'object' && disaster.resources !== null ? { ...disaster.resources } : { volunteersDeployed: 0 };
        resources.volunteersDeployed = disaster.assignedVolunteers.length;
        
        const updatedDisaster = await prisma.adminDisaster.update({
            where: { id: disasterId },
            data: { assignedVolunteers: disaster.assignedVolunteers, resources }
        });
        
        return res.json({
            success: true,
            data: { disaster: updatedDisaster },
            message: 'Volunteer removed successfully',
        });
    }
    catch (error) {
        console.error('Remove volunteer error:', error);
        return res.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('delete_disasters__id_assign_volunteer error:', error);
    next(error);
  }
};
