const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Helper to map Volunteer table back into Dashboard UI expected structure
const mapVolunteerToDashboard = (v) => {
  let assignedDisasters = [];
  try {
    if (v.assignedDisasters) {
      assignedDisasters = typeof v.assignedDisasters === 'string' ? JSON.parse(v.assignedDisasters) : v.assignedDisasters;
    }
  } catch(e) {}

  return {
    id: v.id,
    _id: v.id,
    volunteerId: v.id.slice(-8).toUpperCase(),
    userId: {
      id: v.id,
      firstName: (v.fullName || 'Unknown').split(' ')[0] || '',
      lastName: (v.fullName || '').split(' ').slice(1).join(' ') || '',
      name: v.fullName || 'Unknown User',
      email: v.email || '',
      phone: v.phoneNumber || ''
    },
    dateOfBirth: v.dateOfBirth,
    gender: v.gender || 'male',
    bloodGroup: 'unknown',
    profileImage: v.profilePictureUrl || '',
    address: {
      street: v.address || '',
      city: v.city || '',
      state: v.state || '',
      zipCode: v.pincode || '',
      country: v.country || 'USA'
    },
    skills: v.skills ? String(v.skills).split(',').map(s=>s.trim()).filter(Boolean) : [],
    specializations: [],
    languages: v.languages ? String(v.languages).split(',').map(s=>s.trim()).filter(Boolean) : [],
    experience: {
      years: parseInt(v.experience) || 0,
      description: v.experience || ''
    },
    availability: v.availability || 'available',
    availabilitySchedule: { weekdays: true, weekends: true, nights: false, preferredShift: 'any' },
    preferredWorkAreas: [],
    willingToTravel: true,
    maxTravelDistance: 50,
    emergencyContact: {
      name: v.emergencyContactName || '',
      phone: v.emergencyContactPhone || '',
      relation: '',
      email: ''
    },
    healthInfo: { medicalConditions: [], allergies: [], physicallyFit: true },
    hasOwnVehicle: false,
    vehicleType: 'none',
    status: v.status || 'PENDING',
    verificationStatus: v.isVerified ? 'verified' : 'pending',
    rating: v.rating || 0,
    completedMissions: v.totalMissions || 0,
    totalHoursServed: 0,
    assignedDisasters: assignedDisasters,
    joinedAt: v.createdAt,
    createdAt: v.createdAt
  };
};

exports.get_volunteers = async (req, res, next) => {
  try {
    const page = parseInt(req.query['page'] || '1');
    const limit = parseInt(req.query['limit'] || '50');
    const search = req.query['search'] || '';
    const availability = req.query['availability'] || '';
    
    let query = {};
    if (availability && availability !== 'all') {
      query.availability = availability;
    }

    if (search) {
      query.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } }
      ];
    }

    const skip = (page - 1) * limit;

    // Background auto-unassign logic
    try {
      const now = new Date();
      const volunteersToUpdate = await prisma.volunteer.findMany({
        where: { availability: 'on_mission' }
      });
      
      const updatePromises = volunteersToUpdate.map(async (vol) => {
        let assigned = [];
        try { assigned = typeof vol.assignedDisasters === 'string' ? JSON.parse(vol.assignedDisasters) : (vol.assignedDisasters || []); } catch(e){}
        const hasActiveAssignments = assigned.some(ad => {
          const toDate = new Date(ad.toDate);
          return toDate > now && (ad.status === 'assigned' || ad.status === 'active');
        });
        if (!hasActiveAssignments && assigned.length > 0) {
          return prisma.volunteer.update({ where: { id: vol.id }, data: { availability: 'available' } });
        }
        return null;
      });
      Promise.all(updatePromises).catch(err => console.error('Background status update error:', err));
    } catch(e) {}

    const [volunteers, total] = await Promise.all([
      prisma.volunteer.findMany({ where: query, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.volunteer.count({ where: query })
    ]);

    // Populate actual disaster objects for frontend
    const disasterIds = new Set();
    volunteers.forEach(v => {
      let ad = [];
      try { ad = typeof v.assignedDisasters === 'string' ? JSON.parse(v.assignedDisasters) : (v.assignedDisasters||[]); } catch(e){}
      ad.forEach(a => { if (a.disasterId) disasterIds.add(a.disasterId); });
    });

    const disastersMap = new Map();
    if (disasterIds.size > 0) {
      const disasters = await prisma.adminDisaster.findMany({ where: { id: { in: Array.from(disasterIds) } } });
      disasters.forEach(d => disastersMap.set(d.id, d));
    }

    const mappedVolunteers = volunteers.map(v => {
      const mapped = mapVolunteerToDashboard(v);
      mapped.assignedDisasters = mapped.assignedDisasters.map(ad => ({
        ...ad,
        disaster: disastersMap.get(ad.disasterId) || null
      }));
      return mapped;
    });

    return res.json({
      success: true,
      data: {
        volunteers: mappedVolunteers,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('get_volunteers error:', error);
    next(error);
  }
};

exports.post_volunteers = async (req, res, next) => {
  try {
    const body = req.body;
    
    // Check if phone or email exists
    if (body.email) {
      const existing = await prisma.volunteer.findFirst({ where: { email: body.email } });
      if (existing) return res.status(400).json({ success: false, error: 'Email already registered' });
    }
    if (body.phone) {
      const existing = await prisma.volunteer.findFirst({ where: { phoneNumber: body.phone } });
      if (existing) return res.status(400).json({ success: false, error: 'Phone number already registered' });
    }

    const hashedPassword = await bcrypt.hash(body.password || 'volunteer123', 10);
    const fullName = `${body.firstName || ''} ${body.lastName || ''}`.trim() || 'Admin Volunteer';

    const volunteer = await prisma.volunteer.create({
      data: {
        fullName,
        email: body.email || null,
        phoneNumber: body.phone || null,
        passwordHash: hashedPassword,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
        gender: body.gender || 'male',
        profilePictureUrl: body.profileImage || null,
        address: body.address?.street || '',
        city: body.address?.city || '',
        state: body.address?.state || '',
        pincode: body.address?.zipCode || '',
        country: body.address?.country || 'USA',
        skills: Array.isArray(body.skills) ? body.skills.join(', ') : '',
        languages: Array.isArray(body.languages) ? body.languages.join(', ') : '',
        experience: body.experience?.years ? String(body.experience.years) : '',
        availability: body.availability || 'available',
        emergencyContactName: body.emergencyContact?.name || '',
        emergencyContactPhone: body.emergencyContact?.phone || '',
        status: body.status === 'active' ? 'APPROVED' : (body.status || 'APPROVED'),
        isVerified: true,
        isActive: body.status !== 'inactive',
        authProvider: 'phone',
        assignedDisasters: []
      }
    });

    res.status(201).json({ success: true, data: { volunteer: mapVolunteerToDashboard(volunteer) } });
  } catch (error) {
    console.error('post_volunteers error:', error);
    next(error);
  }
};

exports.get_volunteers_single = async (req, res, next) => {
  try {
    const id = req.query.id || req.params.id;
    const volunteer = await prisma.volunteer.findUnique({ where: { id } });
    if (!volunteer) return res.status(404).json({ success: false, error: 'Volunteer not found' });
    res.json({ success: true, data: { volunteer: mapVolunteerToDashboard(volunteer) } });
  } catch (error) { next(error); }
};

exports.put_volunteers = async (req, res, next) => {
  try {
    const id = req.query.id || req.params.id;
    if (!id) return res.status(400).json({ success: false, error: 'Volunteer ID is required' });

    const body = req.body;
    let dataToUpdate = {};

    if (body.firstName || body.lastName) {
      dataToUpdate.fullName = `${body.firstName || ''} ${body.lastName || ''}`.trim();
    }
    if (body.email !== undefined) dataToUpdate.email = body.email || null;
    if (body.phone !== undefined) dataToUpdate.phoneNumber = body.phone || null;
    if (body.password) dataToUpdate.passwordHash = await bcrypt.hash(body.password, 10);
    
    if (body.dateOfBirth) dataToUpdate.dateOfBirth = new Date(body.dateOfBirth);
    if (body.gender) dataToUpdate.gender = body.gender;
    if (body.profileImage) dataToUpdate.profilePictureUrl = body.profileImage;
    if (body.address) {
      if (body.address.street !== undefined) dataToUpdate.address = body.address.street;
      if (body.address.city !== undefined) dataToUpdate.city = body.address.city;
      if (body.address.state !== undefined) dataToUpdate.state = body.address.state;
      if (body.address.zipCode !== undefined) dataToUpdate.pincode = body.address.zipCode;
      if (body.address.country !== undefined) dataToUpdate.country = body.address.country;
    }
    
    if (body.skills) dataToUpdate.skills = Array.isArray(body.skills) ? body.skills.join(', ') : body.skills;
    if (body.languages) dataToUpdate.languages = Array.isArray(body.languages) ? body.languages.join(', ') : body.languages;
    if (body.experience?.years) dataToUpdate.experience = String(body.experience.years);
    if (body.availability) dataToUpdate.availability = body.availability;
    
    if (body.emergencyContact) {
      if (body.emergencyContact.name) dataToUpdate.emergencyContactName = body.emergencyContact.name;
      if (body.emergencyContact.phone) dataToUpdate.emergencyContactPhone = body.emergencyContact.phone;
    }

    if (body.status) {
      dataToUpdate.status = body.status === 'active' ? 'APPROVED' : body.status;
      dataToUpdate.isActive = body.status !== 'inactive';
    }

    const updated = await prisma.volunteer.update({
      where: { id },
      data: dataToUpdate
    });

    res.json({ success: true, data: { volunteer: mapVolunteerToDashboard(updated) } });
  } catch (error) {
    console.error('put error:', error);
    next(error);
  }
};

exports.delete_volunteers = async (req, res, next) => {
  try {
    const id = req.query.id || req.params.id;
    if (!id) return res.status(400).json({ success: false, error: 'Volunteer ID is required' });

    await prisma.volunteer.delete({ where: { id } });
    res.json({ success: true, message: 'Volunteer deleted successfully' });
  } catch (error) { next(error); }
};

exports.post_volunteers__id_assign_disaster = async (req, res, next) => {
  try {
    const volunteerId = req.query.id || req.params.id;
    const { disasterId, fromDate, toDate } = req.body;
    if (!volunteerId || !disasterId || !fromDate || !toDate) {
      return res.status(400).json({ success: false, error: 'volunteerId, disasterId, fromDate, and toDate are required' });
    }

    const volunteer = await prisma.volunteer.findUnique({ where: { id: volunteerId } });
    if (!volunteer) return res.status(404).json({ success: false, error: 'Volunteer not found' });

    let currentAssignments = [];
    try {
      if (volunteer.assignedDisasters) {
        currentAssignments = typeof volunteer.assignedDisasters === 'string' ? JSON.parse(volunteer.assignedDisasters) : volunteer.assignedDisasters;
      }
    } catch(e) {}

    const isAlreadyAssigned = currentAssignments.some(a => a.disasterId === disasterId);
    if (isAlreadyAssigned) return res.status(400).json({ success: false, error: 'Volunteer already assigned to this disaster' });

    currentAssignments.push({
      disasterId,
      assignedAt: new Date().toISOString(),
      fromDate: new Date(fromDate).toISOString(),
      toDate: new Date(toDate).toISOString(),
      status: 'assigned'
    });

    await prisma.volunteer.update({
      where: { id: volunteerId },
      data: { assignedDisasters: currentAssignments, availability: 'on_mission' }
    });

    // Also update AdminDisaster
    const disaster = await prisma.adminDisaster.findUnique({ where: { id: disasterId } });
    if (disaster) {
      let av = [];
      try { av = typeof disaster.assignedVolunteers === 'string' ? JSON.parse(disaster.assignedVolunteers) : (disaster.assignedVolunteers||[]); } catch(e){}
      av.push({ volunteerId, assignedAt: new Date().toISOString(), status: 'assigned' });
      await prisma.adminDisaster.update({ where: { id: disasterId }, data: { assignedVolunteers: av } });
    }

    res.json({ success: true, message: 'Disaster assigned to volunteer successfully' });
  } catch (error) { next(error); }
};

exports.delete_volunteers__id_assign_disaster = async (req, res, next) => {
  res.status(404).json({ error: 'Endpoint moved to disasters api' });
};

exports.post_volunteers_mobile_login = async (req, res, next) => {
  try {
    const { volunteerId, email, password, isPasswordless } = req.body;
    
    if (!isPasswordless && !password) {
      return res.status(400).json({ success: false, error: 'Password is required' });
    }
    if (!volunteerId && !email) {
      return res.status(400).json({ success: false, error: 'Either volunteerId or email is required' });
    }

    let volunteer = null;
    
    if (volunteerId) {
      // Clean volunteerId, it could be the full ID or short ID
      volunteer = await prisma.volunteer.findFirst({
        where: {
          OR: [
            { id: String(volunteerId).trim() },
            { id: { endsWith: String(volunteerId).trim() } },
            { phoneNumber: String(volunteerId).trim() }
          ]
        }
      });
    } else if (email) {
      volunteer = await prisma.volunteer.findFirst({
        where: { email: String(email).toLowerCase().trim() }
      });
    }

    if (!volunteer) {
      return res.status(401).json({ success: false, error: 'Invalid volunteer ID or email' });
    }

    if (volunteer.status !== 'APPROVED' || !volunteer.isActive) {
      return res.status(403).json({ success: false, error: 'Account is not active. Please contact administrator.' });
    }

    let isPasswordValid = false;
    if (isPasswordless) {
      isPasswordValid = true;
    } else {
      if (!volunteer.passwordHash) {
         return res.status(401).json({ success: false, error: 'Account has no password set' });
      }
      isPasswordValid = await bcrypt.compare(String(password), volunteer.passwordHash);
    }

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, error: 'Invalid password' });
    }

    const token = jwt.sign({
      userId: volunteer.id,
      email: volunteer.email,
      role: 'volunteer',
      name: volunteer.fullName,
    }, process.env.JWT_SECRET || 'results-jwt-secret-key-2024');

    return res.json({
      success: true,
      data: {
        volunteer: mapVolunteerToDashboard(volunteer),
        token,
      },
      message: 'Login successful'
    });
  } catch (error) {
    console.error('post_volunteers_mobile_login error:', error);
    next(error);
  }
};

exports.post_volunteers_seed = async (req, res, next) => {
  res.status(404).json({ error: 'Endpoint removed' });
};
