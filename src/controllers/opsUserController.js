const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');

// ─── Helpers ───
function mapOpsUserToResponse(u) {
  if (!u) return null;
  return {
    _id: u.id,
    id: u.id,
    firstName: u.firstName || '',
    lastName: u.lastName || '',
    name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim(),
    email: u.email || '',
    phone: u.phone || '',
    role: u.role || 'admin',
    status: u.status || 'active',
    avatar: u.avatar || u.profilePhoto || '',
    profilePhoto: u.profilePhoto || u.avatar || '',
    dateOfBirth: u.dateOfBirth || null,
    bloodGroup: u.bloodGroup || '',
    gender: u.gender || '',
    ssnNumber: u.ssnNumber || '',
    driversLicense: u.driversLicense || { number: '', state: '', expiryDate: null },
    emergencyContact: u.emergencyContact || { firstName: '', lastName: '', phone: '', relation: '' },
    address: u.address || { street: '', apartment: '', city: '', state: '', zipCode: '', country: 'United States' },
    preferences: u.preferences || {},
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

function mapMe(u) {
  if (!u) return null;
  return {
    id: u.id,
    _id: u.id,
    firstName: u.firstName || '',
    lastName: u.lastName || '',
    name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim(),
    email: u.email || '',
    phone: u.phone || '',
    role: u.role || 'admin',
    status: u.status || 'active',
    avatar: u.avatar || u.profilePhoto || '',
    profilePhoto: u.profilePhoto || u.avatar || '',
    dateOfBirth: u.dateOfBirth || null,
    bloodGroup: u.bloodGroup || '',
    gender: u.gender || '',
    ssnNumber: u.ssnNumber || '',
    driversLicense: u.driversLicense || {},
    emergencyContact: u.emergencyContact || {},
    address: u.address || {},
    preferences: u.preferences || {},
  };
}

// ─── GET /api/admin/ops-users ───
exports.get_ops_users = async (req, res, next) => {
  try {
    const tokenPayload = req.user;
    if (!tokenPayload) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const page = parseInt(req.query['page'] || '1', 10);
    const limit = parseInt(req.query['limit'] || '100', 10);
    const search = (req.query['search'] || '').trim();
    const role = req.query['role'] || '';
    const status = req.query['status'] || '';
    const sort = req.query['sort'] || 'createdAt';
    const order = req.query['order'] || 'desc';
    const skip = (page - 1) * limit;

    // Build Prisma where clause
    const where = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) where.role = role;
    if (status) where.status = status;

    // Build orderBy
    const validSortFields = ['createdAt', 'firstName', 'lastName', 'email', 'role', 'status'];
    const orderByField = validSortFields.includes(sort) ? sort : 'createdAt';
    const orderBy = { [orderByField]: order === 'asc' ? 'asc' : 'desc' };

    const [users, total] = await Promise.all([
      prisma.opsUser.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.opsUser.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        users: users.map(mapOpsUserToResponse),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    console.error('get_ops_users error:', error);
    next(error);
  }
};

// ─── POST /api/admin/ops-users ───
exports.post_ops_users = async (req, res, next) => {
  try {
    const tokenPayload = req.user;
    if (!tokenPayload) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const body = req.body;
    const role = body.role === 'super_admin' ? 'super_admin' : 'admin';

    // Check if email already exists
    const existing = await prisma.opsUser.findFirst({
      where: { email: (body.email || '').toLowerCase() },
    });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Email already exists' });
    }

    if (!body.password || body.password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    const hashedPassword = await bcrypt.hash(body.password, 12);

    let firstName = body.firstName || '';
    let lastName = body.lastName || '';
    if (!firstName && !lastName && body.name) {
      const parts = (body.name || '').trim().split(' ');
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ') || '';
    }

    const user = await prisma.opsUser.create({
      data: {
        firstName,
        lastName,
        name: `${firstName} ${lastName}`.trim(),
        email: (body.email || '').toLowerCase(),
        password: hashedPassword,
        phone: body.phone || '',
        role,
        status: body.status || 'active',
        profilePhoto: body.profilePhoto || '',
        bloodGroup: body.bloodGroup || '',
        gender: body.gender || '',
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
        ssnNumber: body.ssnNumber || '',
        driversLicense: {
          number: body.driversLicense?.number || '',
          state: body.driversLicense?.state || '',
          expiryDate: body.driversLicense?.expiryDate || null,
        },
        emergencyContact: {
          firstName: body.emergencyContact?.firstName || body.emergencyFirstName || '',
          lastName: body.emergencyContact?.lastName || body.emergencyLastName || '',
          phone: body.emergencyContact?.phone || body.emergencyContactPhone || body.emergencyPhone || '',
          relation: body.emergencyContact?.relation || body.emergencyContactRelation || body.emergencyRelation || '',
        },
        address: {
          street: body.address?.street || body.street || '',
          apartment: body.address?.apartment || body.apartment || '',
          city: body.address?.city || body.city || '',
          state: body.address?.state || body.state || '',
          zipCode: body.address?.zipCode || body.zipCode || body.address?.pincode || '',
          country: body.address?.country || 'United States',
        },
      },
    });

    return res.status(201).json({
      success: true,
      data: { user: mapOpsUserToResponse(user) },
      message: 'OPS user created successfully',
    });
  } catch (error) {
    console.error('post_ops_users error:', error);
    next(error);
  }
};

// ─── PUT /api/admin/ops-users?id=xxx ───
exports.put_ops_users = async (req, res, next) => {
  try {
    const tokenPayload = req.user;
    if (!tokenPayload) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const id = req.query['id'];
    if (!id) {
      return res.status(400).json({ success: false, error: 'User ID required' });
    }

    const body = req.body;
    const existing = await prisma.opsUser.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (existing.role === 'super_admin' && tokenPayload.role !== 'super_admin') {
      return res.status(403).json({ success: false, error: 'Cannot edit super admin' });
    }

    let firstName = body.firstName !== undefined ? body.firstName : existing.firstName;
    let lastName = body.lastName !== undefined ? body.lastName : existing.lastName;
    if (!firstName && !lastName && body.name) {
      const parts = (body.name || '').trim().split(' ');
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ') || '';
    }

    const updateData = {
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim(),
      phone: body.phone !== undefined ? body.phone : existing.phone,
      status: body.status || existing.status,
      profilePhoto: body.profilePhoto !== undefined ? body.profilePhoto : existing.profilePhoto,
      dateOfBirth: body.dateOfBirth !== undefined ? new Date(body.dateOfBirth) : existing.dateOfBirth,
      bloodGroup: body.bloodGroup !== undefined ? body.bloodGroup : existing.bloodGroup,
      gender: body.gender !== undefined ? body.gender : existing.gender,
      ssnNumber: body.ssnNumber !== undefined ? body.ssnNumber : existing.ssnNumber,
      driversLicense: {
        number: body.driversLicense?.number !== undefined ? body.driversLicense.number : (existing.driversLicense?.number || ''),
        state: body.driversLicense?.state !== undefined ? body.driversLicense.state : (existing.driversLicense?.state || ''),
        expiryDate: body.driversLicense?.expiryDate !== undefined ? body.driversLicense.expiryDate : existing.driversLicense?.expiryDate,
      },
      emergencyContact: {
        firstName: body.emergencyContact?.firstName ?? body.emergencyFirstName ?? existing.emergencyContact?.firstName ?? '',
        lastName: body.emergencyContact?.lastName ?? body.emergencyLastName ?? existing.emergencyContact?.lastName ?? '',
        phone: body.emergencyContact?.phone ?? body.emergencyContactPhone ?? body.emergencyPhone ?? existing.emergencyContact?.phone ?? '',
        relation: body.emergencyContact?.relation ?? body.emergencyContactRelation ?? body.emergencyRelation ?? existing.emergencyContact?.relation ?? '',
      },
      address: {
        street: body.address?.street ?? body.street ?? existing.address?.street ?? '',
        apartment: body.address?.apartment ?? body.apartment ?? existing.address?.apartment ?? '',
        city: body.address?.city ?? body.city ?? existing.address?.city ?? '',
        state: body.address?.state ?? body.state ?? existing.address?.state ?? '',
        zipCode: body.address?.zipCode ?? body.zipCode ?? existing.address?.zipCode ?? existing.address?.pincode ?? '',
        country: body.address?.country ?? existing.address?.country ?? 'United States',
      },
    };

    if (body.role && tokenPayload.role === 'super_admin') {
      updateData.role = body.role === 'super_admin' ? 'super_admin' : 'admin';
    }

    if (body.password && body.password.length >= 6) {
      updateData.password = await bcrypt.hash(body.password, 12);
    }

    if (body.preferences && typeof body.preferences === 'object' && body.preferences.notifications) {
      updateData.preferences = {
        notifications: {
          ...(existing.preferences?.notifications || {}),
          ...body.preferences.notifications,
        },
      };
    }

    const updated = await prisma.opsUser.update({ where: { id }, data: updateData });
    return res.json({
      success: true,
      data: { user: mapOpsUserToResponse(updated) },
      message: 'OPS user updated successfully',
    });
  } catch (error) {
    console.error('put_ops_users error:', error);
    next(error);
  }
};

// ─── DELETE /api/admin/ops-users?id=xxx ───
exports.delete_ops_users = async (req, res, next) => {
  try {
    const tokenPayload = req.user;
    if (!tokenPayload) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const id = req.query['id'];
    if (!id) {
      return res.status(400).json({ success: false, error: 'User ID required' });
    }

    const user = await prisma.opsUser.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    if (user.role === 'super_admin') {
      return res.status(403).json({ success: false, error: 'Cannot delete super admin' });
    }
    if (user.id === tokenPayload.userId) {
      return res.status(400).json({ success: false, error: 'Cannot delete your own account' });
    }

    await prisma.opsUser.delete({ where: { id } });
    return res.json({ success: true, message: 'OPS user deleted successfully' });
  } catch (error) {
    console.error('delete_ops_users error:', error);
    next(error);
  }
};

// ─── GET /api/admin/ops-users/me ───
exports.get_ops_users_me = async (req, res, next) => {
  try {
    const tokenPayload = req.user;
    if (!tokenPayload) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const user = await prisma.opsUser.findUnique({ where: { id: tokenPayload.userId } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    return res.json({ success: true, data: mapMe(user) });
  } catch (error) {
    console.error('get_ops_users_me error:', error);
    next(error);
  }
};

// ─── POST /api/admin/ops-users/change-password ───
exports.post_ops_users_change_password = async (req, res, next) => {
  try {
    const tokenPayload = req.user;
    if (!tokenPayload) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Current password and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters' });
    }

    const user = await prisma.opsUser.findUnique({ where: { id: tokenPayload.userId } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect' });
    }

    const hashedNew = await bcrypt.hash(newPassword, 12);
    await prisma.opsUser.update({
      where: { id: tokenPayload.userId },
      data: { password: hashedNew },
    });

    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('post_ops_users_change_password error:', error);
    next(error);
  }
};

// ─── POST /api/admin/ops-users/seed ───
exports.post_ops_users_seed = async (req, res, next) => {
  try {
    const defaultPassword = 'Admin@123';
    const hashed = await bcrypt.hash(defaultPassword, 12);

    const seeds = [
      {
        firstName: 'Super', lastName: 'Admin', name: 'Super Admin',
        email: 'superadmin@resultsportal.com', password: hashed,
        phone: '+1-555-0100', role: 'super_admin', status: 'active',
        profilePhoto: '', dateOfBirth: new Date('1980-01-15'),
        gender: 'male', bloodGroup: 'O+', ssnNumber: '***-**-1000',
        driversLicense: { number: 'DL100001', state: 'CA', expiryDate: '2028-12-31' },
        emergencyContact: { firstName: 'Jane', lastName: 'Admin', phone: '+1-555-0101', relation: 'spouse' },
        address: { street: '100 Admin Plaza', apartment: 'Suite 1', city: 'Los Angeles', state: 'CA', zipCode: '90001', country: 'United States' },
      },
      {
        firstName: 'Portal', lastName: 'Admin', name: 'Portal Admin',
        email: 'admin@resultsportal.com', password: hashed,
        phone: '+1-555-0200', role: 'admin', status: 'active',
        profilePhoto: '', dateOfBirth: new Date('1985-06-20'),
        gender: 'female', bloodGroup: 'A+', ssnNumber: '***-**-2000',
        driversLicense: { number: 'DL200002', state: 'NY', expiryDate: '2027-06-30' },
        emergencyContact: { firstName: 'John', lastName: 'Doe', phone: '+1-555-0201', relation: 'sibling' },
        address: { street: '200 Operations Way', apartment: 'Apt 5', city: 'New York', state: 'NY', zipCode: '10001', country: 'United States' },
      },
      {
        firstName: 'Ops', lastName: 'Manager', name: 'Ops Manager',
        email: 'ops.manager@resultsportal.com', password: hashed,
        phone: '+1-555-0300', role: 'admin', status: 'active',
        profilePhoto: '', dateOfBirth: new Date('1990-03-10'),
        gender: 'male', bloodGroup: 'B+', ssnNumber: '***-**-3000',
        driversLicense: { number: 'DL300003', state: 'TX', expiryDate: '2026-09-15' },
        emergencyContact: { firstName: 'Sarah', lastName: 'Manager', phone: '+1-555-0301', relation: 'parent' },
        address: { street: '300 Manager Blvd', apartment: '', city: 'Houston', state: 'TX', zipCode: '77001', country: 'United States' },
      },
    ];

    const results = [];
    for (const s of seeds) {
      const existing = await prisma.opsUser.findFirst({ where: { email: s.email.toLowerCase() } });
      if (existing) {
        await prisma.opsUser.update({
          where: { id: existing.id },
          data: {
            firstName: s.firstName, lastName: s.lastName, name: s.name,
            phone: s.phone, role: s.role, status: s.status,
            dateOfBirth: s.dateOfBirth, gender: s.gender, bloodGroup: s.bloodGroup,
            ssnNumber: s.ssnNumber, driversLicense: s.driversLicense,
            emergencyContact: s.emergencyContact, address: s.address,
          },
        });
        results.push({ email: s.email, action: 'updated' });
      } else {
        await prisma.opsUser.create({
          data: { ...s, email: s.email.toLowerCase() },
        });
        results.push({ email: s.email, action: 'created' });
      }
    }

    return res.json({
      success: true,
      data: {
        message: 'OPS users seeded. Default password for all: ' + defaultPassword,
        results,
      },
    });
  } catch (error) {
    console.error('post_ops_users_seed error:', error);
    next(error);
  }
};
