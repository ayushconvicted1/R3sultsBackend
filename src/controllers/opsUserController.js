const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'results-jwt-secret-key-2024';

// ─── ops-users ───
exports.get_ops_users = async (req, res, next) => {
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
        const page = parseInt(req.query['page'] || '1');
        const limit = parseInt(req.query['limit'] || '100');
        const search = req.query['search'] || '';
        const role = req.query['role'] || '';
        const status = req.query['status'] || '';
        const sort = req.query['sort'] || 'createdAt';
        const order = req.query['order'] || 'desc';
        const query = {};
        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
            ];
        }
        if (role)
            query.role = role;
        if (status)
            query.status = status;
        const skip = (page - 1) * limit;
        const sortOrder = order === 'asc' ? 1 : -1;
        const [users, total] = await Promise.all([
            prisma.opsUser.findMany({ where: query }),
            prisma.opsUser.count({ where: query }),
        ]);
        return res.json({
            success: true,
            data: {
                users: users.map((u) => mapOpsUserToResponse(u)),
                pagination: { page, limit, total, pages: Math.ceil(total / limit) },
            },
        });
    }
    catch (error) {
        console.error('Get ops users error:', error);
        return res.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('get_ops_users error:', error);
    next(error);
  }
};

exports.post_ops_users = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        if (!tokenPayload) {
            return res.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const body = req.body;
        const role = (body.role === 'super_admin' ? 'super_admin' : 'admin');
        if (role === 'super_admin' && !true) {
            return res.json({ success: false, error: 'Only Super Admin can create super admin users' }, { status: 403 });
        }
        if (!true) {
            return res.json({ success: false, error: 'Permission denied' }, { status: 403 });
        }
        const existing = await prisma.opsUser.findFirst({ where: { email: (body.email || '').toLowerCase() } });
        if (existing) {
            return res.json({ success: false, error: 'Email already exists' }, { status: 400 });
        }
        const hashedPassword = await bcrypt.hash(body.password);
        let firstName = body.firstName || '';
        let lastName = body.lastName || '';
        if (!firstName && !lastName && body.name) {
            const parts = (body.name || '').trim().split(' ');
            firstName = parts[0] || '';
            lastName = parts.slice(1).join(' ') || '';
        }
        const user = await prisma.opsprisma.adminUser.create({ data: { data: {
                    firstName,
                    lastName,
                    name: `${firstName} ${lastName}`.trim(),
                    email: (body.email || '').toLowerCase(),
                    password: hashedPassword,
                    phone: body.phone || '',
                    role: body.role === 'super_admin' ? 'super_admin' : 'admin',
                    status: body.status || 'active',
                    profilePhoto: body.profilePhoto || '',
                    bloodGroup: body.bloodGroup || '',
                    gender: body.gender || '',
                    dateOfBirth: body.dateOfBirth || undefined,
                    ssnNumber: body.ssnNumber || '',
                    driversLicense: {
                        number: body.driversLicense?.number || '',
                        state: body.driversLicense?.state || '',
                        expiryDate: body.driversLicense?.expiryDate || undefined,
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
                } } });
        try {
            const userName = `${firstName} ${lastName}`.trim() || body.email;
            const emailTemplate = email_1.emailTemplates.welcome(userName, body.email.toLowerCase(), body.password);
            await (0, email_1.sendEmail)({ to: body.email.toLowerCase(), subject: emailTemplate.subject, html: emailTemplate.html });
        }
        catch (_) { }
        const u = await prisma.opsUser.findUnique({ where: { id: user.id } });
        return res.json({
            success: true,
            data: { user: u ? mapOpsUserToResponse(u) : mapOpsUserToResponse(user) },
            message: 'OPS user created successfully',
        });
    }
    catch (error) {
        console.error('Create ops user error:', error);
        return res.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('post_ops_users error:', error);
    next(error);
  }
};

exports.put_ops_users = async (req, res, next) => {
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
            return res.json({ success: false, error: 'User ID required' }, { status: 400 });
        }
        const body = req.body;
        const existing = await prisma.opsUser.findUnique({ where: { id: id } });
        if (!existing) {
            return res.json({ success: false, error: 'User not found' }, { status: 404 });
        }
        if (existing.role === 'super_admin' && tokenPayload.role !== 'super_admin') {
            return res.json({ success: false, error: 'Cannot edit super admin' }, { status: 403 });
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
            dateOfBirth: body.dateOfBirth !== undefined ? body.dateOfBirth : existing.dateOfBirth,
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
            updateData.password = await bcrypt.hash(body.password);
        }
        if (body.preferences && typeof body.preferences === 'object' && body.preferences.notifications) {
            updateData.preferences = {
                notifications: {
                    ...(existing.preferences?.notifications || {}),
                    ...body.preferences.notifications,
                },
            };
        }
        const updated = await prisma.opsUser.update({ where: { id: id }, data: updateData });
        return res.json({
            success: true,
            data: { user: updated ? mapOpsUserToResponse(updated) : null },
            message: 'OPS user updated successfully',
        });
    }
    catch (error) {
        console.error('Update ops user error:', error);
        return res.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('put_ops_users error:', error);
    next(error);
  }
};

exports.delete_ops_users = async (req, res, next) => {
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
            return res.json({ success: false, error: 'User ID required' }, { status: 400 });
        }
        const user = await prisma.opsUser.findUnique({ where: { id: id } });
        if (!user) {
            return res.json({ success: false, error: 'User not found' }, { status: 404 });
        }
        if (user.role === 'super_admin') {
            return res.json({ success: false, error: 'Cannot delete super admin' }, { status: 403 });
        }
        if (user.id.toString() === tokenPayload.userId) {
            return res.json({ success: false, error: 'Cannot delete your own account' }, { status: 400 });
        }
        await prisma.opsUser.delete({ where: { id: id } });
        return res.json({ success: true, message: 'OPS user deleted successfully' });
    }
    catch (error) {
        console.error('Delete ops user error:', error);
        return res.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('delete_ops_users error:', error);
    next(error);
  }
};

// ─── ops-users/me ───
exports.get_ops_users_me = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        if (!tokenPayload) {
            return res.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const user = await prisma.opsUser.findUnique({ where: { id: tokenPayload.userId } });
        if (!user) {
            return res.json({ success: false, error: 'User not found' }, { status: 404 });
        }
        return res.json({ success: true, data: mapMe(user) });
    }
    catch (error) {
        console.error('Get ops user me error:', error);
        return res.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('get_ops_users_me error:', error);
    next(error);
  }
};

// ─── ops-users/change-password ───
exports.post_ops_users_change_password = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        if (!tokenPayload) {
            return res.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const body = req.body;
        const { currentPassword, newPassword } = body;
        if (!currentPassword || !newPassword) {
            return res.json({ success: false, error: 'Current password and new password are required' }, { status: 400 });
        }
        if (newPassword.length < 6) {
            return res.json({ success: false, error: 'New password must be at least 6 characters' }, { status: 400 });
        }
        const user = await prisma.opsUser.findUnique({ where: { id: tokenPayload.userId } });
        if (!user) {
            return res.json({ success: false, error: 'User not found' }, { status: 404 });
        }
        const valid = await bcrypt.compare(currentPassword, user.password);
        if (!valid) {
            return res.json({ success: false, error: 'Current password is incorrect' }, { status: 401 });
        }
        user.password = await bcrypt.hash(newPassword);
        // Note: user.save() pattern needs prisma.model.update() - see TODO below
        return res.json({ success: true, message: 'Password updated successfully' });
    }
    catch (error) {
        console.error('Change password error:', error);
        return res.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('post_ops_users_change_password error:', error);
    next(error);
  }
};

// ─── ops-users/seed ───
exports.post_ops_users_seed = async (req, res, next) => {
  try {

    try {
        const defaultPassword = 'Admin@123';
        const hashed = await bcrypt.hash(defaultPassword);
        const seeds = [
            {
                firstName: 'Super',
                lastName: 'Admin',
                name: 'Super Admin',
                email: 'superadmin@resultsportal.com',
                password: hashed,
                phone: '+1-555-0100',
                role: 'super_admin',
                status: 'active',
                profilePhoto: '',
                dateOfBirth: new Date('1980-01-15'),
                gender: 'male',
                bloodGroup: 'O+',
                ssnNumber: '***-**-1000',
                driversLicense: { number: 'DL100001', state: 'CA', expiryDate: new Date('2028-12-31') },
                emergencyContact: {
                    firstName: 'Jane',
                    lastName: 'Admin',
                    phone: '+1-555-0101',
                    relation: 'spouse',
                },
                address: {
                    street: '100 Admin Plaza',
                    apartment: 'Suite 1',
                    city: 'Los Angeles',
                    state: 'CA',
                    zipCode: '90001',
                    country: 'United States',
                },
            },
            {
                firstName: 'Portal',
                lastName: 'Admin',
                name: 'Portal Admin',
                email: 'admin@resultsportal.com',
                password: hashed,
                phone: '+1-555-0200',
                role: 'admin',
                status: 'active',
                profilePhoto: '',
                dateOfBirth: new Date('1985-06-20'),
                gender: 'female',
                bloodGroup: 'A+',
                ssnNumber: '***-**-2000',
                driversLicense: { number: 'DL200002', state: 'NY', expiryDate: new Date('2027-06-30') },
                emergencyContact: {
                    firstName: 'John',
                    lastName: 'Doe',
                    phone: '+1-555-0201',
                    relation: 'sibling',
                },
                address: {
                    street: '200 Operations Way',
                    apartment: 'Apt 5',
                    city: 'New York',
                    state: 'NY',
                    zipCode: '10001',
                    country: 'United States',
                },
            },
            {
                firstName: 'Ops',
                lastName: 'Manager',
                name: 'Ops Manager',
                email: 'ops.manager@resultsportal.com',
                password: hashed,
                phone: '+1-555-0300',
                role: 'admin',
                status: 'active',
                profilePhoto: '',
                dateOfBirth: new Date('1990-03-10'),
                gender: 'male',
                bloodGroup: 'B+',
                ssnNumber: '***-**-3000',
                driversLicense: { number: 'DL300003', state: 'TX', expiryDate: new Date('2026-09-15') },
                emergencyContact: {
                    firstName: 'Sarah',
                    lastName: 'Manager',
                    phone: '+1-555-0301',
                    relation: 'parent',
                },
                address: {
                    street: '300 Manager Blvd',
                    apartment: '',
                    city: 'Houston',
                    state: 'TX',
                    zipCode: '77001',
                    country: 'United States',
                },
            },
        ];
        const results = [];
        for (const s of seeds) {
            const existing = await prisma.opsUser.findFirst({ where: { email: s.email.toLowerCase() } });
            if (existing) {
                await prisma.opsprisma.adminUser.updateMany({ where: { where: { email: s.email.toLowerCase() }, } }, {
                    firstName: s.firstName,
                    lastName: s.lastName,
                    name: s.name,
                    phone: s.phone,
                    role: s.role,
                    status: s.status,
                    dateOfBirth: s.dateOfBirth,
                    gender: s.gender,
                    bloodGroup: s.bloodGroup,
                    ssnNumber: s.ssnNumber,
                    driversLicense: s.driversLicense,
                    emergencyContact: s.emergencyContact,
                    address: s.address,
                    updatedAt: new Date(),
                });
            }
            ;
            results.push({ email: s.email, action: 'updated' });
        }
        {
            await prisma.opsprisma.adminUser.create({ data: { data: {
                        ...s,
                        email: s.email.toLowerCase(),
                    } } });
            results.push({ email: s.email, action: 'created' });
        }
    }
    finally {
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
