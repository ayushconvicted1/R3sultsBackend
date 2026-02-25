const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'results-jwt-secret-key-2024';

// ─── volunteers ───
exports.get_volunteers = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        if (!tokenPayload) {
            return res.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        if (!true) {
            return res.json({ success: false, error: 'Permission denied' }, { status: 403 });
        }
        try {
        }
        catch (dbError) {
            console.error('Database connection error:', dbError);
            return res.json({
                success: false,
                error: 'Database connection failed',
                details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
            }, { status: 500 });
        }
        // req.query is already available via Express;
        const page = parseInt(req.query['page'] || '1');
        const limit = parseInt(req.query['limit'] || '50');
        const search = req.query['search'] || '';
        const availability = req.query['availability'] || '';
        const query = {};
        if (availability)
            query.availability = availability;
        const skip = (page - 1) * limit;
        // First, update volunteers whose assignment periods have ended
        // Optimize: Only check if we have volunteers with on_mission status
        // This is done in background to avoid blocking the main query
        try {
            const now = new Date();
            const volunteersToUpdate = await prisma.adminVolunteer.findMany({
                where: {
                    availability: 'on_mission',
                    NOT: { assignedDisasters: { equals: [] } },
                },
            });
            // Batch update instead of individual saves
            const updatePromises = volunteersToUpdate.map(async (vol) => {
                const hasActiveAssignments = vol.assignedDisasters?.some((ad) => {
                    const toDate = new Date(ad.toDate);
                    const status = ad.status;
                    return toDate > now && (status === 'assigned' || status === 'active');
                });
                // If no active assignments, change status back to 'available'
                if (!hasActiveAssignments) {
                    return prisma.adminVolunteer.update({ where: { id: vol.id }, data: { availability: 'available' } });
                }
                return null;
            });
            // Don't await - let it run in background
            Promise.all(updatePromises).catch(err => {
                console.error('Background volunteer status update error:', err);
            });
        }
        catch (updateError) {
            // Don't fail the main request if status update fails
            console.error('Volunteer status update error:', updateError);
        }
        let volunteers = await prisma.adminVolunteer.findMany({ where: query, orderBy: { createdAt: 'desc' }, skip: skip, take: limit });
        // Manually populate userId since it's stored as String, not ObjectId reference
        // Optimize: Batch fetch users and teams to reduce database queries
        const userIds = [...new Set(volunteers.map((v) => v.userId).filter(Boolean))];
        const teamIds = [...new Set(volunteers.map((v) => v.teamId).filter(Boolean))];
        // Batch fetch users
        const usersMap = new Map();
        if (userIds.length > 0) {
            const users = await prisma.adminUser.findMany({ where: { id: { in: userIds } } });
            users.forEach((user) => {
                usersMap.set(user.id.toString(), user);
            });
        }
        // Batch fetch teams
        const teamsMap = new Map();
        if (teamIds.length > 0) {
            const teams = await prisma.adminVolunteerTeam.findMany({ where: { id: { in: teamIds } } });
            teams.forEach((team) => {
                teamsMap.set(team.id.toString(), team);
            });
        }
        // Batch fetch disasters for all assignments
        const disasterIds = new Set();
        volunteers.forEach((v) => {
            if (v.assignedDisasters && Array.isArray(v.assignedDisasters)) {
                v.assignedDisasters.forEach((ad) => {
                    if (ad.disasterId)
                        disasterIds.add(ad.disasterId);
                });
            }
        });
        const disastersMap = new Map();
        if (disasterIds.size > 0) {
            const disasters = await prisma.adminDisaster.findMany({ where: { id: { in: Array.from(disasterIds) } } });
            disasters.forEach((disaster) => {
                disastersMap.set(disaster.id.toString(), disaster);
            });
        }
        // Populate data from maps
        for (const volunteer of volunteers) {
            if (volunteer.userId) {
                const userId = String(volunteer.userId);
                volunteer.userId = usersMap.get(userId) || { firstName: '', lastName: '', name: 'Unknown', email: '', phone: '' };
            }
            // Populate team information
            if (volunteer.teamId) {
                const teamId = String(volunteer.teamId);
                volunteer.team = teamsMap.get(teamId) || null;
            }
            else {
                volunteer.team = null;
            }
            // Populate assigned disasters
            if (volunteer.assignedDisasters && Array.isArray(volunteer.assignedDisasters)) {
                for (const assignment of volunteer.assignedDisasters) {
                    if (assignment.disasterId) {
                        const disasterId = String(assignment.disasterId);
                        assignment.disaster = disastersMap.get(disasterId) || null;
                    }
                }
            }
        }
        // Filter by search if needed
        let filteredVolunteers = volunteers;
        if (search) {
            const searchLower = search.toLowerCase();
            filteredVolunteers = volunteers.filter((v) => {
                const fullName = v.userId?.firstName && v.userId?.lastName
                    ? `${v.userId.firstName} ${v.userId.lastName}`.toLowerCase()
                    : (v.userId?.name || '').toLowerCase();
                return ((v.volunteerId && v.volunteerId.toLowerCase().includes(searchLower)) ||
                    (v.userId?.firstName && v.userId.firstName.toLowerCase().includes(searchLower)) ||
                    (v.userId?.lastName && v.userId.lastName.toLowerCase().includes(searchLower)) ||
                    fullName.includes(searchLower) ||
                    (v.userId?.email && v.userId.email.toLowerCase().includes(searchLower)) ||
                    (Array.isArray(v.skills) && v.skills.some((s) => s && s.toLowerCase().includes(searchLower))) ||
                    (v.address?.city && v.address.city.toLowerCase().includes(searchLower)) ||
                    (v.team?.name && v.team.name.toLowerCase().includes(searchLower)));
            });
        }
        const total = await prisma.adminVolunteer.count({ where: query });
        return res.json({
            success: true,
            data: {
                volunteers: filteredVolunteers,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                    hasMore: skip + volunteers.length < total,
                },
            },
        });
    }
    catch (error) {
        console.error('Get volunteers error:', error);
        return res.json({
            success: false,
            error: error.message || 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }

  } catch (error) {
    console.error('get_volunteers error:', error);
    next(error);
  }
};

exports.post_volunteers = async (req, res, next) => {
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
        // Check if email already exists
        const existingUser = await prisma.adminUser.findFirst({ where: { email: body.email } });
        if (existingUser) {
            return res.json({ success: false, error: 'Email already registered' }, { status: 400 });
        }
        // Create user account first
        const hashedPassword = await bcrypt.hash(body.password || 'volunteer123');
        // Extract firstName and lastName - ensure they're not empty
        let firstName = '';
        let lastName = '';
        if (body.firstName) {
            firstName = String(body.firstName).trim();
        }
        else if (body.name) {
            const nameParts = String(body.name).trim().split(' ');
            firstName = nameParts[0] || '';
            lastName = nameParts.slice(1).join(' ') || '';
        }
        if (body.lastName) {
            lastName = String(body.lastName).trim();
        }
        // Ensure minimum length for validation
        if (firstName.length < 2)
            firstName = 'Unknown';
        if (lastName.length < 2)
            lastName = 'User';
        const email = String(body.email || '').toLowerCase().trim();
        const phone = body.phone ? String(body.phone).trim() : '';
        console.log('=== CREATING USER ===');
        console.log('User data:', { firstName, lastName, email, phone });
        const user = await prisma.adminprisma.adminUser.create({ data: { data: {
                    firstName,
                    lastName,
                    name: `${firstName} ${lastName}`.trim(),
                    email,
                    phone,
                    password: hashedPassword,
                    role: 'volunteer',
                    status: 'active',
                    address: body.address,
                } } });
        console.log('✅ User created successfully!');
        console.log('Created user:', { id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            name: user.name
        });
        // Verify by fetching
        const verifyUser = await prisma.adminUser.findUnique({ where: { id: user.id } });
        console.log('🔍 Verification from DB:', {
            firstName: verifyUser?.firstName,
            lastName: verifyUser?.lastName,
            email: verifyUser?.email,
            phone: verifyUser?.phone
        });
        console.log('=== END USER CREATION ===');
        // Create volunteer profile - ensure all form fields are saved
        const volunteer = await prisma.adminprisma.adminVolunteer.create({ data: { data: {
                    userId: user.id.toString(),
                    dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
                    gender: body.gender,
                    bloodGroup: body.bloodGroup,
                    profileImage: body.profileImage || '',
                    address: body.address || {
                        street: '',
                        city: '',
                        state: '',
                        zipCode: '',
                        country: 'United States',
                    },
                    skills: body.skills || [],
                    specializations: body.specializations || [],
                    languages: body.languages || [],
                    experience: body.experience || {
                        years: 0,
                        description: '',
                    },
                    availability: body.availability || 'available',
                    availabilitySchedule: body.availabilitySchedule || {
                        weekdays: true,
                        weekends: true,
                        nights: false,
                        preferredShift: 'any',
                    },
                    preferredWorkAreas: body.preferredWorkAreas || [],
                    willingToTravel: body.willingToTravel ?? true,
                    maxTravelDistance: body.maxTravelDistance || 50,
                    emergencyContact: body.emergencyContact || {
                        name: '',
                        phone: '',
                        relation: '',
                        email: '',
                    },
                    healthInfo: body.healthInfo || {
                        medicalConditions: [],
                        allergies: [],
                        medications: [],
                        physicallyFit: true,
                    },
                    hasOwnVehicle: body.hasOwnVehicle || false,
                    vehicleType: body.vehicleType || 'none',
                    vehicleNumber: body.vehicleNumber || '',
                    status: body.status || 'active',
                    teamId: body.teamId || undefined,
                } } });
        // Manually populate userId since it's stored as String
        const populatedVolunteer = await prisma.adminVolunteer.findUnique({ where: { id: volunteer.id } });
        if (populatedVolunteer && populatedVolunteer.userId) {
            const user = await prisma.adminUser.findUnique({ where: { id: populatedVolunteer.userId } });
            populatedVolunteer.userId = user;
        }
        return res.json({
            success: true,
            data: { volunteer: populatedVolunteer },
            message: 'Volunteer account created successfully'
        }, { status: 201 });
    }
    catch (error) {
        console.error('Create volunteer error:', error);
        return res.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('post_volunteers error:', error);
    next(error);
  }
};

exports.put_volunteers = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        if (!tokenPayload) {
            return res.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        if (!true) {
            return res.json({ success: false, error: 'Permission denied' }, { status: 403 });
        }
        // req.query is already available via Express;
        const id = req.query['id'];
        if (!id) {
            return res.json({ success: false, error: 'Volunteer ID required' }, { status: 400 });
        }
        const body = req.body;
        // Update volunteer profile - ensure all form fields are updated
        const updateData = {
            dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
            gender: body.gender,
            bloodGroup: body.bloodGroup,
            profileImage: body.profileImage,
            address: body.address,
            skills: body.skills || [],
            specializations: body.specializations || [],
            languages: body.languages || [],
            experience: body.experience,
            availability: body.availability,
            availabilitySchedule: body.availabilitySchedule,
            preferredWorkAreas: body.preferredWorkAreas || [],
            willingToTravel: body.willingToTravel,
            maxTravelDistance: body.maxTravelDistance,
            emergencyContact: body.emergencyContact,
            healthInfo: body.healthInfo,
            hasOwnVehicle: body.hasOwnVehicle,
            vehicleType: body.vehicleType,
            vehicleNumber: body.vehicleNumber,
            status: body.status,
            teamId: body.teamId,
            lastActiveAt: new Date(),
        };
        // Remove undefined fields
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });
        // Get the volunteer first to get userId before updating
        const existingVolunteer = await prisma.adminVolunteer.findUnique({ where: { id: id } });
        if (!existingVolunteer) {
            return res.json({ success: false, error: 'Volunteer not found' }, { status: 404 });
        }
        // Get userId as string (it's stored as string in the schema)
        const userId = String(existingVolunteer.userId);
        // Update volunteer document
        const volunteer = await prisma.adminVolunteer.update({ where: { id: id }, data: updateData });
        // Manually populate userId since it's stored as String
        if (volunteer && volunteer.userId) {
            const user = await prisma.adminUser.findUnique({ where: { id: volunteer.userId } });
            volunteer.userId = user;
        }
        console.log('=== USER UPDATE DEBUG ===');
        console.log('User ID to update:', userId);
        console.log('Request body keys:', Object.keys(body));
        console.log('Body fields:', {
            firstName: body.firstName,
            lastName: body.lastName,
            email: body.email,
            phone: body.phone
        });
        // Always update user if these fields are present in body
        const updateUserData = {};
        // Handle firstName - ALWAYS update if present in body
        if (body.firstName !== undefined && body.firstName !== null) {
            const firstName = String(body.firstName).trim();
            // Ensure minimum 2 characters for validation
            updateUserData.firstName = firstName.length >= 2 ? firstName : (firstName || 'Unknown');
            console.log('Setting firstName:', updateUserData.firstName);
        }
        // Handle lastName - ALWAYS update if present in body
        if (body.lastName !== undefined && body.lastName !== null) {
            const lastName = String(body.lastName).trim();
            // Ensure minimum 2 characters for validation
            updateUserData.lastName = lastName.length >= 2 ? lastName : (lastName || 'User');
            console.log('Setting lastName:', updateUserData.lastName);
        }
        // Handle name (derived from firstName/lastName or from body.name)
        if (body.firstName !== undefined || body.lastName !== undefined || body.name !== undefined) {
            const firstName = body.firstName !== undefined
                ? String(body.firstName).trim()
                : (body.name ? String(body.name).split(' ')[0].trim() : '');
            const lastName = body.lastName !== undefined
                ? String(body.lastName).trim()
                : (body.name ? String(body.name).split(' ').slice(1).join(' ').trim() : '');
            updateUserData.name = `${firstName || ''} ${lastName || ''}`.trim() || body.email || 'Unknown User';
            console.log('Setting name:', updateUserData.name);
        }
        // Handle email - ALWAYS update if present in body
        if (body.email !== undefined && body.email !== null) {
            updateUserData.email = String(body.email).toLowerCase().trim();
            console.log('Setting email:', updateUserData.email);
        }
        // Handle phone - ALWAYS update if present in body
        if (body.phone !== undefined && body.phone !== null) {
            updateUserData.phone = String(body.phone).trim() || '';
            console.log('Setting phone:', updateUserData.phone);
        }
        // Handle address
        if (body.address) {
            updateUserData.address = body.address;
        }
        console.log('Final updateUserData:', updateUserData);
        // Update user if we have any fields to update
        if (Object.keys(updateUserData).length > 0) {
            try {
                const updatedUser = await prisma.adminUser.update({ where: { id: userId }, data: updateUserData });
                if (updatedUser) {
                    console.log('✅ User updated successfully!');
                    console.log('Updated fields:', {
                        firstName: updatedUser.firstName,
                        lastName: updatedUser.lastName,
                        email: updatedUser.email,
                        phone: updatedUser.phone,
                        name: updatedUser.name
                    });
                    // Verify by fetching again
                    const verifyUser = await prisma.adminUser.findUnique({ where: { id: userId } });
                    console.log('🔍 Verification from DB:', {
                        firstName: verifyUser?.firstName,
                        lastName: verifyUser?.lastName,
                        email: verifyUser?.email,
                        phone: verifyUser?.phone
                    });
                }
                else {
                    console.error('❌ Failed to update user - findByIdAndUpdate returned null');
                    console.error('User ID used:', userId);
                }
            }
            catch (updateError) {
                console.error('❌ Error updating user:', updateError.message);
                console.error('Full error:', updateError);
            }
        }
        else {
            console.log('⚠️ No user fields to update');
        }
        console.log('=== END USER UPDATE DEBUG ===');
        // Manually populate userId since it's stored as String
        const updatedVolunteer = await prisma.adminVolunteer.findUnique({ where: { id: id } });
        if (updatedVolunteer && updatedVolunteer.userId) {
            const user = await prisma.adminUser.findUnique({ where: { id: updatedVolunteer.userId } });
            updatedVolunteer.userId = user;
        }
        return res.json({
            success: true,
            data: { volunteer: updatedVolunteer },
            message: 'Volunteer updated successfully'
        });
    }
    catch (error) {
        console.error('Update volunteer error:', error);
        return res.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('put_volunteers error:', error);
    next(error);
  }
};

exports.delete_volunteers = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        if (!tokenPayload) {
            return res.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        if (!true) {
            return res.json({ success: false, error: 'Permission denied' }, { status: 403 });
        }
        // req.query is already available via Express;
        const id = req.query['id'];
        if (!id) {
            return res.json({ success: false, error: 'Volunteer ID required' }, { status: 400 });
        }
        const volunteer = await prisma.adminVolunteer.findUnique({ where: { id: id } });
        if (!volunteer) {
            return res.json({ success: false, error: 'Volunteer not found' }, { status: 404 });
        }
        // Delete volunteer profile
        await prisma.adminVolunteer.delete({ where: { id: id } });
        // Optionally deactivate user account
        await prisma.adminUser.update({ where: { id: volunteer.userId }, data: { status: 'inactive' } });
        return res.json({
            success: true,
            message: 'Volunteer deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete volunteer error:', error);
        return res.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('delete_volunteers error:', error);
    next(error);
  }
};

// ─── volunteers/[id]/assign-disaster ───
exports.post_volunteers__id_assign_disaster = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        if (!tokenPayload) {
            return res.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        if (!true) {
            return res.json({ success: false, error: 'Permission denied' }, { status: 403 });
        }
        const params = await context.params;
        const { id: volunteerId } = params;
        const { disasterId, fromDate, toDate } = req.body;
        if (!(typeof volunteerId === "string" && volunteerId.length > 0) || !(typeof disasterId === "string" && disasterId.length > 0)) {
            return res.json({ success: false, error: 'Invalid Volunteer ID or Disaster ID' }, { status: 400 });
        }
        if (!fromDate || !toDate) {
            return res.json({ success: false, error: 'From date and To date are required' }, { status: 400 });
        }
        if (new Date(toDate) < new Date(fromDate)) {
            return res.json({ success: false, error: 'To date must be after from date' }, { status: 400 });
        }
        const volunteer = await prisma.adminVolunteer.findUnique({ where: { id: volunteerId } });
        const disaster = await prisma.adminDisaster.findUnique({ where: { id: disasterId } });
        if (!volunteer) {
            return res.json({ success: false, error: 'Volunteer not found' }, { status: 404 });
        }
        if (!disaster) {
            return res.json({ success: false, error: 'Disaster not found' }, { status: 404 });
        }
        // Check if volunteer is already assigned to this disaster
        const isAlreadyAssigned = volunteer.assignedDisasters?.some((assignment) => assignment.disasterId.toString() === disasterId);
        if (isAlreadyAssigned) {
            return res.json({ success: false, error: 'Volunteer already assigned to this disaster' }, { status: 409 });
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
        // Add assignment to volunteer
        volunteer.assignedDisasters = volunteer.assignedDisasters || [];
        volunteer.assignedDisasters.push({
            disasterId: disasterId,
            assignedBy: tokenPayload.userId,
            assignedAt: new Date(),
            fromDate: new Date(fromDate),
            toDate: new Date(toDate),
            status: 'assigned',
        });
        // Change volunteer availability to 'on_mission'
        volunteerDoc.availability = 'on_mission';
        // Add assignment to disaster
        const disasterDoc = disaster;
        disasterDoc.assignedVolunteers = disasterDoc.assignedVolunteers || [];
        // Check if volunteer is already assigned to this disaster
        const isAlreadyAssignedInDisaster = disasterDoc.assignedVolunteers.some((av) => av.volunteerId?.toString() === volunteerId);
        if (!isAlreadyAssignedInDisaster) {
            disasterDoc.assignedVolunteers.push({
                volunteerId: volunteerId,
                assignedBy: tokenPayload.userId,
                assignedAt: new Date(),
                status: 'assigned', // Use 'assigned' instead of 'pending' to match schema enum
            });
        }
        // Note: volunteer.save() pattern needs prisma.model.update() - see TODO below
        // Note: disaster.save() pattern needs prisma.model.update() - see TODO below
        // Populate disaster data for response
        await volunteer;
        return res.json({
            success: true,
            message: 'Disaster assigned to volunteer successfully',
            data: { volunteer, disaster },
        });
    }
    catch (error) {
        console.error('Assign disaster to volunteer error:', error);
        return res.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('post_volunteers__id_assign_disaster error:', error);
    next(error);
  }
};

// ─── volunteers/seed ───
exports.post_volunteers_seed = async (req, res, next) => {
  try {

    try {
        const user = await req.user;
        if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
            return res.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        // Clear existing data
        await prisma.adminVolunteer.deleteMany({ where: {} });
        await prisma.adminVolunteerTeam.deleteMany({ where: {} });
        // Also delete volunteer users
        await prisma.adminUser.deleteMany({ where: { role: 'volunteer' } });
        // Create teams first
        const teams = [
            {
                name: 'Search & Rescue Alpha',
                description: 'Primary search and rescue team specializing in urban and wilderness rescue operations',
                specialization: 'Search & Rescue',
                status: 'active',
            },
            {
                name: 'Medical Response Team',
                description: 'Emergency medical response team with certified EMTs and paramedics',
                specialization: 'Medical',
                status: 'active',
            },
            {
                name: 'Logistics & Supply',
                description: 'Handles supply chain, transportation, and resource distribution',
                specialization: 'Logistics',
                status: 'active',
            },
            {
                name: 'Water Rescue Unit',
                description: 'Specialized in water-based rescue operations and flood response',
                specialization: 'Water Rescue',
                status: 'active',
            },
            {
                name: 'Communication Team',
                description: 'Manages emergency communications and coordination',
                specialization: 'Communication',
                status: 'active',
            },
        ];
        const createdTeams = [];
        for (const teamData of teams) {
            const team = await prisma.adminprisma.adminVolunteerTeam.create({ data: { data: teamData } });
            createdTeams.push(team);
        }
        // Sample volunteer data
        const volunteerData = [
            {
                name: 'John Smith',
                email: 'john.smith@volunteer.com',
                phone: '+1-555-0101',
                dateOfBirth: '1985-03-15',
                gender: 'male',
                bloodGroup: 'O+',
                street: '123 Main Street',
                city: 'New York',
                state: 'NY',
                zipCode: '10001',
                skills: ['First Aid', 'Rescue', 'Navigation', 'Communication'],
                specializations: ['Urban Rescue', 'Wilderness Search'],
                languages: ['English', 'Spanish'],
                experienceYears: 8,
                experienceDescription: 'Extensive experience in search and rescue operations, certified in wilderness first aid',
                availability: 'available',
                weekdays: true,
                weekends: true,
                nights: true,
                preferredShift: 'any',
                preferredWorkAreas: ['Manhattan', 'Brooklyn'],
                willingToTravel: true,
                maxTravelDistance: 100,
                emergencyName: 'Jane Smith',
                emergencyPhone: '+1-555-0102',
                emergencyRelation: 'Spouse',
                emergencyEmail: 'jane.smith@example.com',
                medicalConditions: [],
                allergies: [],
                physicallyFit: true,
                hasOwnVehicle: true,
                vehicleType: 'suv',
                status: 'active',
                teamIndex: 0, // Search & Rescue Alpha
                isLead: true,
            },
            {
                name: 'Sarah Johnson',
                email: 'sarah.johnson@volunteer.com',
                phone: '+1-555-0201',
                dateOfBirth: '1990-07-22',
                gender: 'female',
                bloodGroup: 'A+',
                street: '456 Oak Avenue',
                city: 'Los Angeles',
                state: 'CA',
                zipCode: '90001',
                skills: ['EMT', 'CPR', 'Medical', 'Triage'],
                specializations: ['Emergency Medicine', 'Trauma Care'],
                languages: ['English'],
                experienceYears: 5,
                experienceDescription: 'Certified EMT with experience in emergency medical response',
                availability: 'available',
                weekdays: true,
                weekends: true,
                nights: false,
                preferredShift: 'morning',
                preferredWorkAreas: ['Downtown LA', 'Hollywood'],
                willingToTravel: true,
                maxTravelDistance: 75,
                emergencyName: 'Mike Johnson',
                emergencyPhone: '+1-555-0202',
                emergencyRelation: 'Spouse',
                emergencyEmail: 'mike.johnson@example.com',
                medicalConditions: [],
                allergies: ['Penicillin'],
                physicallyFit: true,
                hasOwnVehicle: true,
                vehicleType: 'car',
                status: 'active',
                teamIndex: 1, // Medical Response Team
                isLead: true,
            },
            {
                name: 'Michael Chen',
                email: 'michael.chen@volunteer.com',
                phone: '+1-555-0301',
                dateOfBirth: '1988-11-10',
                gender: 'male',
                bloodGroup: 'B+',
                street: '789 Pine Street',
                city: 'Chicago',
                state: 'IL',
                zipCode: '60601',
                skills: ['Logistics', 'Supply Chain', 'Transportation', 'Warehouse Management'],
                specializations: ['Resource Distribution', 'Supply Coordination'],
                languages: ['English', 'Mandarin'],
                experienceYears: 6,
                experienceDescription: 'Background in logistics and supply chain management',
                availability: 'available',
                weekdays: true,
                weekends: false,
                nights: false,
                preferredShift: 'afternoon',
                preferredWorkAreas: ['Chicago Metro'],
                willingToTravel: false,
                maxTravelDistance: 30,
                emergencyName: 'Lisa Chen',
                emergencyPhone: '+1-555-0302',
                emergencyRelation: 'Spouse',
                emergencyEmail: 'lisa.chen@example.com',
                medicalConditions: [],
                allergies: [],
                physicallyFit: true,
                hasOwnVehicle: true,
                vehicleType: 'truck',
                status: 'active',
                teamIndex: 2, // Logistics & Supply
                isLead: true,
            },
            {
                name: 'Emily Rodriguez',
                email: 'emily.rodriguez@volunteer.com',
                phone: '+1-555-0401',
                dateOfBirth: '1992-05-18',
                gender: 'female',
                bloodGroup: 'AB+',
                street: '321 Elm Street',
                city: 'Miami',
                state: 'FL',
                zipCode: '33101',
                skills: ['Water Rescue', 'Swimming', 'Boat Operation', 'Diving'],
                specializations: ['Flood Response', 'Marine Rescue'],
                languages: ['English', 'Spanish'],
                experienceYears: 4,
                experienceDescription: 'Certified lifeguard and water rescue specialist',
                availability: 'available',
                weekdays: true,
                weekends: true,
                nights: false,
                preferredShift: 'any',
                preferredWorkAreas: ['Miami Beach', 'Key West'],
                willingToTravel: true,
                maxTravelDistance: 150,
                emergencyName: 'Carlos Rodriguez',
                emergencyPhone: '+1-555-0402',
                emergencyRelation: 'Parent',
                emergencyEmail: 'carlos.rodriguez@example.com',
                medicalConditions: [],
                allergies: [],
                physicallyFit: true,
                hasOwnVehicle: false,
                vehicleType: 'none',
                status: 'active',
                teamIndex: 3, // Water Rescue Unit
                isLead: true,
            },
            {
                name: 'David Kim',
                email: 'david.kim@volunteer.com',
                phone: '+1-555-0501',
                dateOfBirth: '1987-09-25',
                gender: 'male',
                bloodGroup: 'O-',
                street: '654 Maple Drive',
                city: 'Seattle',
                state: 'WA',
                zipCode: '98101',
                skills: ['Radio Communication', 'Network Setup', 'Coordination', 'Technical Support'],
                specializations: ['Emergency Communications', 'Radio Operations'],
                languages: ['English', 'Korean'],
                experienceYears: 7,
                experienceDescription: 'IT professional with expertise in emergency communication systems',
                availability: 'available',
                weekdays: true,
                weekends: true,
                nights: true,
                preferredShift: 'any',
                preferredWorkAreas: ['Seattle Metro'],
                willingToTravel: true,
                maxTravelDistance: 50,
                emergencyName: 'Jennifer Kim',
                emergencyPhone: '+1-555-0502',
                emergencyRelation: 'Spouse',
                emergencyEmail: 'jennifer.kim@example.com',
                medicalConditions: [],
                allergies: [],
                physicallyFit: true,
                hasOwnVehicle: true,
                vehicleType: 'van',
                status: 'active',
                teamIndex: 4, // Communication Team
                isLead: true,
            },
            // Additional team members
            {
                name: 'Robert Taylor',
                email: 'robert.taylor@volunteer.com',
                phone: '+1-555-0103',
                dateOfBirth: '1991-02-14',
                gender: 'male',
                bloodGroup: 'A+',
                street: '987 Cedar Lane',
                city: 'New York',
                state: 'NY',
                zipCode: '10002',
                skills: ['Rescue', 'Rope Work', 'Climbing'],
                specializations: ['Technical Rescue'],
                languages: ['English'],
                experienceYears: 3,
                experienceDescription: 'Rock climbing instructor with rescue training',
                availability: 'available',
                weekdays: false,
                weekends: true,
                nights: false,
                preferredShift: 'afternoon',
                preferredWorkAreas: ['Manhattan'],
                willingToTravel: true,
                maxTravelDistance: 60,
                emergencyName: 'Patricia Taylor',
                emergencyPhone: '+1-555-0104',
                emergencyRelation: 'Parent',
                emergencyEmail: 'patricia.taylor@example.com',
                medicalConditions: [],
                allergies: [],
                physicallyFit: true,
                hasOwnVehicle: false,
                vehicleType: 'none',
                status: 'active',
                teamIndex: 0,
                isLead: false,
            },
            {
                name: 'Amanda White',
                email: 'amanda.white@volunteer.com',
                phone: '+1-555-0203',
                dateOfBirth: '1993-08-30',
                gender: 'female',
                bloodGroup: 'B-',
                street: '147 Birch Street',
                city: 'Los Angeles',
                state: 'CA',
                zipCode: '90002',
                skills: ['Nursing', 'First Aid', 'Patient Care'],
                specializations: ['Medical Support'],
                languages: ['English'],
                experienceYears: 2,
                experienceDescription: 'Registered nurse with emergency room experience',
                availability: 'available',
                weekdays: true,
                weekends: false,
                nights: true,
                preferredShift: 'night',
                preferredWorkAreas: ['Downtown LA'],
                willingToTravel: false,
                maxTravelDistance: 25,
                emergencyName: 'James White',
                emergencyPhone: '+1-555-0204',
                emergencyRelation: 'Spouse',
                emergencyEmail: 'james.white@example.com',
                medicalConditions: [],
                allergies: [],
                physicallyFit: true,
                hasOwnVehicle: true,
                vehicleType: 'car',
                status: 'active',
                teamIndex: 1,
                isLead: false,
            },
            {
                name: 'James Wilson',
                email: 'james.wilson@volunteer.com',
                phone: '+1-555-0303',
                dateOfBirth: '1989-12-05',
                gender: 'male',
                bloodGroup: 'O+',
                street: '258 Spruce Avenue',
                city: 'Chicago',
                state: 'IL',
                zipCode: '60602',
                skills: ['Driving', 'Forklift', 'Inventory'],
                specializations: ['Transportation'],
                languages: ['English'],
                experienceYears: 4,
                experienceDescription: 'Commercial driver with warehouse experience',
                availability: 'available',
                weekdays: true,
                weekends: true,
                nights: false,
                preferredShift: 'morning',
                preferredWorkAreas: ['Chicago Metro'],
                willingToTravel: true,
                maxTravelDistance: 100,
                emergencyName: 'Mary Wilson',
                emergencyPhone: '+1-555-0304',
                emergencyRelation: 'Spouse',
                emergencyEmail: 'mary.wilson@example.com',
                medicalConditions: [],
                allergies: [],
                physicallyFit: true,
                hasOwnVehicle: true,
                vehicleType: 'truck',
                status: 'active',
                teamIndex: 2,
                isLead: false,
            },
            {
                name: 'Maria Garcia',
                email: 'maria.garcia@volunteer.com',
                phone: '+1-555-0403',
                dateOfBirth: '1994-04-12',
                gender: 'female',
                bloodGroup: 'A-',
                street: '369 Willow Way',
                city: 'Miami',
                state: 'FL',
                zipCode: '33102',
                skills: ['Swimming', 'Boat Operation'],
                specializations: ['Water Safety'],
                languages: ['English', 'Spanish'],
                experienceYears: 2,
                experienceDescription: 'Certified swim instructor and boat operator',
                availability: 'available',
                weekdays: true,
                weekends: true,
                nights: false,
                preferredShift: 'any',
                preferredWorkAreas: ['Miami Beach'],
                willingToTravel: true,
                maxTravelDistance: 80,
                emergencyName: 'Jose Garcia',
                emergencyPhone: '+1-555-0404',
                emergencyRelation: 'Parent',
                emergencyEmail: 'jose.garcia@example.com',
                medicalConditions: [],
                allergies: [],
                physicallyFit: true,
                hasOwnVehicle: false,
                vehicleType: 'none',
                status: 'active',
                teamIndex: 3,
                isLead: false,
            },
            {
                name: 'Kevin Park',
                email: 'kevin.park@volunteer.com',
                phone: '+1-555-0503',
                dateOfBirth: '1990-06-20',
                gender: 'male',
                bloodGroup: 'AB-',
                street: '741 Ash Boulevard',
                city: 'Seattle',
                state: 'WA',
                zipCode: '98102',
                skills: ['Radio', 'Technical Support', 'IT'],
                specializations: ['Technical Support'],
                languages: ['English', 'Korean'],
                experienceYears: 3,
                experienceDescription: 'IT support specialist with radio communication experience',
                availability: 'available',
                weekdays: true,
                weekends: false,
                nights: false,
                preferredShift: 'afternoon',
                preferredWorkAreas: ['Seattle Metro'],
                willingToTravel: false,
                maxTravelDistance: 30,
                emergencyName: 'Susan Park',
                emergencyPhone: '+1-555-0504',
                emergencyRelation: 'Spouse',
                emergencyEmail: 'susan.park@example.com',
                medicalConditions: [],
                allergies: [],
                physicallyFit: true,
                hasOwnVehicle: true,
                vehicleType: 'car',
                status: 'active',
                teamIndex: 4,
                isLead: false,
            },
        ];
        const createdVolunteers = [];
        for (const volData of volunteerData) {
            // Create user account
            const hashedPassword = await bcrypt.hash('volunteer123');
            const firstName = volData.name.split(' ')[0];
            const lastName = volData.name.split(' ').slice(1).join(' ');
            const user = await prisma.adminprisma.adminUser.create({ data: { data: {
                        firstName,
                        lastName,
                        name: volData.name,
                        email: volData.email.toLowerCase(),
                        phone: volData.phone,
                        password: hashedPassword,
                        role: 'volunteer',
                        status: 'active',
                        address: {
                            street: volData.street,
                            city: volData.city,
                            state: volData.state,
                            pincode: volData.zipCode,
                            country: 'United States',
                        },
                    } } });
            // Create volunteer profile
            const volunteer = await prisma.adminprisma.adminVolunteer.create({ data: { data: {
                        userId: user.id.toString(),
                        dateOfBirth: new Date(volData.dateOfBirth),
                        gender: volData.gender,
                        bloodGroup: volData.bloodGroup,
                        profileImage: '',
                        address: {
                            street: volData.street,
                            city: volData.city,
                            state: volData.state,
                            pincode: volData.zipCode,
                            country: 'United States',
                        },
                        skills: volData.skills,
                        specializations: volData.specializations,
                        languages: volData.languages,
                        experience: {
                            years: volData.experienceYears,
                            description: volData.experienceDescription,
                        },
                        availability: volData.availability,
                        availabilitySchedule: {
                            weekdays: volData.weekdays,
                            weekends: volData.weekends,
                            nights: volData.nights,
                            preferredShift: volData.preferredShift,
                        },
                        preferredWorkAreas: volData.preferredWorkAreas,
                        willingToTravel: volData.willingToTravel,
                        maxTravelDistance: volData.maxTravelDistance,
                        emergencyContact: {
                            name: volData.emergencyName,
                            phone: volData.emergencyPhone,
                            relation: volData.emergencyRelation,
                            email: volData.emergencyEmail,
                        },
                        healthInfo: {
                            medicalConditions: volData.medicalConditions,
                            allergies: volData.allergies,
                            medications: [],
                            physicallyFit: volData.physicallyFit,
                        },
                        hasOwnVehicle: volData.hasOwnVehicle,
                        vehicleType: volData.vehicleType,
                        vehicleNumber: '',
                        status: volData.status,
                        rating: Math.random() * 2 + 3, // Random rating between 3-5
                        totalReviews: Math.floor(Math.random() * 20) + 5,
                        completedMissions: Math.floor(Math.random() * 15),
                        totalHoursServed: Math.floor(Math.random() * 200) + 50,
                    } } });
            createdVolunteers.push({ volunteer: volunteer, teamIndex: volData.teamIndex, isLead: volData.isLead });
        }
        // Assign volunteers to teams
        for (let i = 0; i < createdTeams.length; i++) {
            const team = createdTeams[i];
            const teamVolunteers = createdVolunteers.filter(v => v.teamIndex === i);
            const lead = teamVolunteers.find(v => v.isLead);
            const members = teamVolunteers.map(v => v.volunteer.id.toString());
            if (lead) {
                await prisma.adminVolunteerTeam.update({
                    where: { id: team.id },
                    data: {
                        leadId: lead.volunteer.id.toString(),
                        memberIds: members,
                    },
                });
                // Update volunteers with teamId
                for (const memberId of members) {
                    await prisma.adminVolunteer.update({
                        where: { id: memberId },
                        data: { teamId: team.id.toString() },
                    });
                }
            }
        }
        return res.json({
            success: true,
            message: `Successfully seeded ${createdVolunteers.length} volunteers and ${createdTeams.length} teams`,
            data: {
                volunteers: createdVolunteers.length,
                teams: createdTeams.length,
            },
        });
    }
    catch (error) {
        console.error('Error seeding volunteer data:', error);
        return res.json({ success: false, error: error.message || 'Failed to seed volunteer data' }, { status: 500 });
    }

  } catch (error) {
    console.error('post_volunteers_seed error:', error);
    next(error);
  }
};

// ─── volunteers/mobile-login ───
exports.post_volunteers_mobile_login = async (req, res, next) => {
  try {

    try {
        const body = req.body;
        const { volunteerId, email, password } = body;
        if (!password) {
            return res.json({ success: false, error: 'Password is required' }, { status: 400 });
        }
        if (!volunteerId && !email) {
            return res.json({ success: false, error: 'Either volunteerId or email is required' }, { status: 400 });
        }
        let user = null;
        let volunteer = null;
        if (volunteerId) {
            // Find volunteer by volunteerId
            volunteer = await prisma.adminVolunteer.findFirst({
                where: {
                    OR: [
                        { volunteerId: String(volunteerId).trim() },
                        { id: String(volunteerId).trim() },
                    ],
                },
            });
            if (volunteer?.userId) {
                user = await prisma.adminUser.findUnique({ where: { id: volunteer.userId } });
            }
        }
        else if (email) {
            user = await prisma.adminUser.findFirst({
                where: { email: String(email).toLowerCase().trim(), role: 'volunteer' },
            });
            if (user) {
                volunteer = await prisma.adminVolunteer.findFirst({
                    where: { userId: user.id },
                });
            }
        }
        if (!user || !volunteer) {
            return res.json({ success: false, error: 'Invalid volunteer ID or email' }, { status: 401 });
        }
        if (user.status !== 'active') {
            return res.json({ success: false, error: 'Account is not active. Please contact administrator.' }, { status: 403 });
        }
        const hashedPassword = user.password;
        if (typeof hashedPassword !== 'string') {
            return res.json({ success: false, error: 'Invalid account state' }, { status: 500 });
        }
        let isPasswordValid = false;
        try {
            isPasswordValid = await bcrypt.compare(String(password), hashedPassword);
        }
        catch {
            return res.json({ success: false, error: 'Invalid password' }, { status: 401 });
        }
        if (!isPasswordValid) {
            return res.json({ success: false, error: 'Invalid password' }, { status: 401 });
        }
        const displayName = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim();
        const token = jwt.sign({
            userId: user.id,
            email: user.email,
            role: 'volunteer',
            name: displayName,
        });
        const volunteerData = {
            id: volunteer.id,
            volunteerId: volunteer.volunteerId,
            userId: volunteer.userId,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            name: displayName,
            email: user.email || '',
            phone: user.phone || '',
            availability: volunteer.availability,
            status: volunteer.status,
            address: volunteer.address,
            skills: volunteer.skills,
            profileImage: volunteer.profileImage,
        };
        return res.json({
            success: true,
            data: {
                volunteer: volunteerData,
                token,
            },
            message: 'Login successful',
        });
    }
    catch (error) {
        console.error('Volunteer mobile login error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        return res.json({
            success: false,
            error: process.env.NODE_ENV === 'development' ? message : 'Internal server error',
        }, { status: 500 });
    }

  } catch (error) {
    console.error('post_volunteers_mobile_login error:', error);
    next(error);
  }
};
