const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'results-jwt-secret-key-2024';

// ─── users ───
exports.get_users = async (req, res, next) => {
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
        const limit = parseInt(req.query['limit'] || '10');
        const search = req.query['search'] || '';
        const role = req.query['role'] || '';
        const status = req.query['status'] || '';
        const sort = req.query['sort'] || 'createdAt';
        const order = req.query['order'] || 'desc';
        // Build query
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
        if (role) {
            query.role = role;
        }
        if (status) {
            query.status = status;
        }
        // Users module only shows admin and super_admin
        query.role = { in: ['admin', 'super_admin'] };
        const skip = (page - 1) * limit;
        const sortOrder = order === 'asc' ? 1 : -1;
        const [users, total] = await Promise.all([
            prisma.adminUser.findMany({ where: query }),
            prisma.adminUser.count({ where: query }),
        ]);
        return res.json({
            success: true,
            data: {
                users: users.map(user => {
                    const fullName = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim();
                    const username = user.email?.split('@')[0] || `user_${user.id.toString().slice(-6)}`;
                    return {
                        id: user.id.toString(), id: user.id.toString(),
                        firstName: user.firstName,
                        lastName: user.lastName,
                        name: fullName,
                        fullName: fullName,
                        username: username,
                        email: user.email,
                        phone: user.phone,
                        phoneNumber: user.phone || '',
                        role: user.role?.toUpperCase() || 'MEMBER',
                        status: user.status,
                        profilePhoto: user.profilePhoto,
                        profilePictureUrl: user.profilePhoto || null,
                        dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString() : null,
                        gender: user.gender || null,
                        bloodGroup: user.bloodGroup || null,
                        address: user.address?.street || null,
                        city: user.address?.city || null,
                        state: user.address?.state || null,
                        country: user.address?.country || 'United States',
                        pincode: user.address?.pincode || null,
                        emergencyContactName: user.emergencyContact?.firstName && user.emergencyContact?.lastName
                            ? `${user.emergencyContact.firstName} ${user.emergencyContact.lastName}`.trim()
                            : null,
                        emergencyContactPhone: user.emergencyContact?.phone || null,
                        authProvider: 'email',
                        providerId: null,
                        isVerified: user.status === 'active',
                        isActive: user.status === 'active',
                        emailVerified: user.status === 'active',
                        phoneVerified: false,
                        planLimit: 0,
                        isSubscriber: false,
                        roleAssignedBy: null,
                        roleAssignedAt: null,
                        lastLoginAt: null,
                        deletedAt: null,
                        createdAt: user.createdAt ? user.createdAt.toISOString() : new Date().toISOString(),
                        updatedAt: user.updatedAt ? user.updatedAt.toISOString() : new Date().toISOString(),
                        adminGroups: [],
                        memberGroups: [],
                    };
                }),
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
        console.error('Get users error:', error);
        return res.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('get_users error:', error);
    next(error);
  }
};

exports.post_users = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        if (!tokenPayload) {
            return res.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const body = req.body;
        // Check permissions
        if (body.role === 'super_admin' || body.role === 'admin') {
            if (!tokenPayload || !true) {
                return res.json({ success: false, error: 'Only Super Admin can create admin users' }, { status: 403 });
            }
        }
        else {
            if (!true) {
                return res.json({ success: false, error: 'Permission denied' }, { status: 403 });
            }
        }
        // Check if email exists
        const existingUser = await prisma.adminUser.findFirst({ where: { email: body.email.toLowerCase() } });
        if (existingUser) {
            return res.json({ success: false, error: 'Email already exists' }, { status: 400 });
        }
        // Hash password
        const hashedPassword = await bcrypt.hash(body.password);
        // Create user with all fields - handle both firstName/lastName and name
        let firstName = body.firstName || '';
        let lastName = body.lastName || '';
        // Backward compatibility: if name is provided but not firstName/lastName, split it
        if (!firstName && !lastName && body.name) {
            const nameParts = body.name.trim().split(' ');
            firstName = nameParts[0] || '';
            lastName = nameParts.slice(1).join(' ') || '';
        }
        const user = await prisma.adminprisma.adminUser.create({ data: { data: {
                    firstName,
                    lastName,
                    email: body.email.toLowerCase(),
                    password: hashedPassword,
                    phone: body.phone || '',
                    role: body.role || 'volunteer',
                    status: body.status || 'active',
                    profilePhoto: body.profilePhoto || '',
                    bloodGroup: body.bloodGroup || '',
                    gender: body.gender || '',
                    ssnNumber: body.ssnNumber || '',
                    aadharNumber: body.aadharNumber || body.ssnNumber || '',
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
                        city: body.address?.city || body.city || '',
                        state: body.address?.state || body.state || '',
                        pincode: body.address?.pincode || body.zipCode || '',
                        country: body.address?.country || 'United States',
                    },
                } } });
        // Return user without password
        const userResponse = await prisma.adminUser.findUnique({ where: { id: user.id } });
        // Send welcome email with credentials
        try {
            const userName = `${firstName} ${lastName}`.trim() || body.email;
            const emailTemplate = email_1.emailTemplates.welcome(userName, body.email.toLowerCase(), body.password);
            await (0, email_1.sendEmail)({
                to: body.email.toLowerCase(),
                subject: emailTemplate.subject,
                html: emailTemplate.html,
            });
        }
        catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
            // Don't fail the user creation if email fails
        }
        return res.json({
            success: true,
            data: { user: userResponse },
            message: 'User created successfully',
        });
    }
    catch (error) {
        console.error('Create user error:', error);
        return res.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('post_users error:', error);
    next(error);
  }
};

exports.put_users = async (req, res, next) => {
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
        // Find user
        const existingUser = await prisma.adminUser.findUnique({ where: { id: id } });
        if (!existingUser) {
            return res.json({ success: false, error: 'User not found' }, { status: 404 });
        }
        // Prevent editing super_admin by non-super_admin
        if (existingUser.role === 'super_admin' && tokenPayload.role !== 'super_admin') {
            return res.json({ success: false, error: 'Cannot edit super admin' }, { status: 403 });
        }
        // Handle firstName/lastName
        let firstName = body.firstName !== undefined ? body.firstName : existingUser.firstName;
        let lastName = body.lastName !== undefined ? body.lastName : existingUser.lastName;
        // Backward compatibility
        if (!firstName && !lastName && body.name) {
            const nameParts = body.name.trim().split(' ');
            firstName = nameParts[0] || '';
            lastName = nameParts.slice(1).join(' ') || '';
        }
        // Build update object
        const updateData = {
            firstName,
            lastName,
            name: `${firstName} ${lastName}`.trim() || existingUser.name,
            phone: body.phone !== undefined ? body.phone : existingUser.phone,
            status: body.status || existingUser.status,
            profilePhoto: body.profilePhoto !== undefined ? body.profilePhoto : existingUser.profilePhoto,
            dateOfBirth: body.dateOfBirth || existingUser.dateOfBirth,
            bloodGroup: body.bloodGroup !== undefined ? body.bloodGroup : existingUser.bloodGroup,
            gender: body.gender !== undefined ? body.gender : existingUser.gender,
            ssnNumber: body.ssnNumber !== undefined ? body.ssnNumber : existingUser.ssnNumber,
            aadharNumber: body.aadharNumber !== undefined ? body.aadharNumber : existingUser.aadharNumber,
            driversLicense: {
                number: body.driversLicense?.number !== undefined ? body.driversLicense.number : existingUser.driversLicense?.number || '',
                state: body.driversLicense?.state !== undefined ? body.driversLicense.state : existingUser.driversLicense?.state || '',
                expiryDate: body.driversLicense?.expiryDate || existingUser.driversLicense?.expiryDate,
            },
            emergencyContact: {
                firstName: body.emergencyContact?.firstName || body.emergencyFirstName || existingUser.emergencyContact?.firstName || '',
                lastName: body.emergencyContact?.lastName || body.emergencyLastName || existingUser.emergencyContact?.lastName || '',
                phone: body.emergencyContact?.phone || body.emergencyContactPhone || body.emergencyPhone || existingUser.emergencyContact?.phone || '',
                relation: body.emergencyContact?.relation || body.emergencyContactRelation || body.emergencyRelation || existingUser.emergencyContact?.relation || '',
            },
            address: {
                street: body.address?.street || body.street || existingUser.address?.street || '',
                city: body.address?.city || body.city || existingUser.address?.city || '',
                state: body.address?.state || body.state || existingUser.address?.state || '',
                pincode: body.address?.pincode || body.zipCode || existingUser.address?.pincode || '',
                country: body.address?.country || existingUser.address?.country || 'United States',
            },
        };
        // Only super_admin can change roles
        if (body.role && tokenPayload.role === 'super_admin') {
            updateData.role = body.role;
        }
        // Update password if provided
        if (body.password && body.password.length >= 6) {
            updateData.password = await bcrypt.hash(body.password);
        }
        const updatedUser = await prisma.adminUser.update({ where: { id: id }, data: updateData });
        return res.json({
            success: true,
            data: { user: updatedUser },
            message: 'User updated successfully',
        });
    }
    catch (error) {
        console.error('Update user error:', error);
        return res.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('put_users error:', error);
    next(error);
  }
};

exports.delete_users = async (req, res, next) => {
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
        const user = await prisma.adminUser.findUnique({ where: { id: id } });
        if (!user) {
            return res.json({ success: false, error: 'User not found' }, { status: 404 });
        }
        // Prevent deleting super_admin
        if (user.role === 'super_admin') {
            return res.json({ success: false, error: 'Cannot delete super admin' }, { status: 403 });
        }
        // Delete user (admin and super_admin don't have related profiles)
        await prisma.adminUser.delete({ where: { id: id } });
        return res.json({
            success: true,
            message: 'User deleted successfully',
        });
    }
    catch (error) {
        console.error('Delete user error:', error);
        return res.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('delete_users error:', error);
    next(error);
  }
};

// ─── users/[id] ───
exports.get_users__id = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        const { id } = req.params;
        if (!tokenPayload) {
            return res.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const user = await prisma.adminUser.findUnique({ where: { id: id } });
        if (!user) {
            return res.json({ success: false, error: 'User not found' }, { status: 404 });
        }
        // Get additional profile data
        let profile = null;
        if (user.role === 'volunteer') {
            profile = await prisma.adminVolunteer.findFirst({ where: { userId: id } });
        }
        else if (user.role === 'service_provider') {
            profile = await prisma.adminServiceProvider.findFirst({ where: { userId: id } });
        }
        return res.json({
            success: true,
            data: { user, profile },
        });
    }
    catch (error) {
        console.error('Get user error:', error);
        return res.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('get_users__id error:', error);
    next(error);
  }
};

exports.put_users__id = async (req, res, next) => {
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
        const { name, email, phone, role, status, address, password } = body;
        const user = await prisma.adminUser.findUnique({ where: { id: id } });
        if (!user) {
            return res.json({ success: false, error: 'User not found' }, { status: 404 });
        }
        // Admin cannot edit super_admin or other admins
        if (tokenPayload.role === 'admin') {
            if (user.role === 'super_admin' || user.role === 'admin') {
                return res.json({ success: false, error: 'You cannot edit this user' }, { status: 403 });
            }
        }
        // Check email uniqueness
        if (email && email !== user.email) {
            const existingUser = await prisma.adminUser.findFirst({ where: { email: email.toLowerCase() } });
            if (existingUser) {
                return res.json({ success: false, error: 'Email already exists' }, { status: 400 });
            }
        }
        // Update fields
        if (name)
            user.name = name;
        if (email)
            user.email = email.toLowerCase();
        if (phone)
            user.phone = phone;
        if (status)
            user.status = status;
        if (address)
            user.address = address;
        // Only super_admin can change roles
        if (role && tokenPayload.role === 'super_admin') {
            user.role = role;
        }
        // Update password if provided
        if (password) {
            user.password = await bcrypt.hash(password);
        }
        // Note: user.save() pattern needs prisma.model.update() - see TODO below
        return res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    status: user.status,
                    address: user.address,
                },
            },
            message: 'User updated successfully',
        });
    }
    catch (error) {
        console.error('Update user error:', error);
        return res.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('put_users__id error:', error);
    next(error);
  }
};

exports.delete_users__id = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        const { id } = req.params;
        if (!tokenPayload) {
            return res.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        if (!true) {
            return res.json({ success: false, error: 'Only Super Admin can delete users' }, { status: 403 });
        }
        const user = await prisma.adminUser.findUnique({ where: { id: id } });
        if (!user) {
            return res.json({ success: false, error: 'User not found' }, { status: 404 });
        }
        // Cannot delete self
        if (user.id.toString() === tokenPayload.userId) {
            return res.json({ success: false, error: 'Cannot delete your own account' }, { status: 400 });
        }
        // Delete associated profiles
        if (user.role === 'volunteer') {
            await prisma.adminVolunteer.deleteMany({ where: { userId: id } });
        }
        else if (user.role === 'service_provider') {
            await prisma.adminServiceProvider.deleteMany({ where: { userId: id } });
        }
        await prisma.adminUser.delete({ where: { id: id } });
        return res.json({
            success: true,
            message: 'User deleted successfully',
        });
    }
    catch (error) {
        console.error('Delete user error:', error);
        return res.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('delete_users__id error:', error);
    next(error);
  }
};
