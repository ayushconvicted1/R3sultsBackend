const prisma = require('../lib/prisma');
const { paginate, paginationMeta } = require('../utils/pagination');
const { uploadToCloudinary } = require('../middleware/upload');

const sanitizeUser = (user) => {
  if (!user) return null;
  const { passwordHash, otpCode, otpExpiresAt, otpAttempts, refreshToken, ...safe } = user;
  return safe;
};

// ─── Roles ───
exports.getAllRoles = async (req, res, next) => {
  try {
    res.json({ success: true, data: { roles: ['SUPER_ADMIN', 'ADMIN', 'MEMBER', 'GUEST'] } });
  } catch (error) { next(error); }
};

exports.getUsersByRole = async (req, res, next) => {
  try {
    const { role } = req.params;
    const users = await prisma.user.findMany({ where: { role, isActive: true } });
    res.json({ success: true, data: { users: users.map(sanitizeUser), count: users.length } });
  } catch (error) { next(error); }
};

// ─── Permissions ───
exports.getAllPermissions = async (req, res, next) => {
  try {
    const permissions = [
      'USERS_VIEW', 'USERS_CREATE', 'USERS_UPDATE', 'USERS_DELETE',
      'USERS_ACTIVATE', 'USERS_DEACTIVATE', 'PROFILE_VIEW',
      'PROFILE_UPDATE_OWN', 'PROFILE_UPDATE_OTHERS', 'FAMILY_VIEW',
      'FAMILY_ADD_MEMBER', 'FAMILY_REMOVE_MEMBER', 'FAMILY_UPDATE_MEMBER',
      'FAMILY_UPDATE_GROUP', 'MEDICAL_VIEW', 'MEDICAL_UPDATE_OWN',
      'MEDICAL_UPDATE_OTHERS', 'SETTINGS_VIEW', 'SETTINGS_UPDATE',
      'REPORTS_VIEW', 'REPORTS_EXPORT',
    ];
    res.json({ success: true, data: { permissions } });
  } catch (error) { next(error); }
};

exports.getRolePermissions = async (req, res, next) => {
  try {
    const { role } = req.params;
    const perms = await prisma.rolePermission.findMany({ where: { role } });
    const defaultPerms = await prisma.rolePermission.findMany({ where: { role } });
    res.json({
      success: true,
      data: {
        role,
        permissions: perms.map((p) => p.permission),
        defaultPermissions: defaultPerms.map((p) => p.permission),
        isCustomized: perms.length !== defaultPerms.length,
      },
    });
  } catch (error) { next(error); }
};

exports.assignPermissions = async (req, res, next) => {
  try {
    const { role } = req.params;
    const { permissions } = req.body;

    await prisma.rolePermission.deleteMany({ where: { role } });
    const data = permissions.map((permission) => ({ role, permission }));
    await prisma.rolePermission.createMany({ data });

    res.json({
      success: true,
      message: 'Permissions assigned successfully',
      data: { role, permissions },
    });
  } catch (error) { next(error); }
};

exports.getUserPermissions = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const perms = await prisma.rolePermission.findMany({ where: { role: user.role } });
    res.json({
      success: true,
      data: { user: sanitizeUser(user), permissions: perms.map((p) => p.permission) },
    });
  } catch (error) { next(error); }
};

exports.checkPermission = async (req, res, next) => {
  try {
    const { userId, permission } = req.body;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    let hasPermission = user.role === 'SUPER_ADMIN';
    if (!hasPermission) {
      const perm = await prisma.rolePermission.findUnique({
        where: { role_permission: { role: user.role, permission } },
      });
      hasPermission = !!perm;
    }

    res.json({ success: true, data: { hasPermission, userId, permission } });
  } catch (error) { next(error); }
};

// ─── Accessibility ───
exports.getAllAccessibility = async (req, res, next) => {
  try {
    const settings = await prisma.accessibilitySetting.findMany({ orderBy: { role: 'asc' } });
    const grouped = {};
    settings.forEach((s) => {
      if (!grouped[s.role]) grouped[s.role] = [];
      grouped[s.role].push(s);
    });
    res.json({ success: true, data: { settings: grouped } });
  } catch (error) { next(error); }
};

exports.getRoleAccessibility = async (req, res, next) => {
  try {
    const { role } = req.params;
    const settings = await prisma.accessibilitySetting.findMany({ where: { role } });
    res.json({ success: true, data: { role, settings } });
  } catch (error) { next(error); }
};

exports.updateFeatureAccess = async (req, res, next) => {
  try {
    const { role, feature } = req.params;
    const { canAccess, canCreate, canUpdate, canDelete } = req.body;

    const setting = await prisma.accessibilitySetting.upsert({
      where: { role_feature: { role, feature } },
      update: { canAccess, canCreate, canUpdate, canDelete },
      create: { role, feature, canAccess, canCreate, canUpdate, canDelete },
    });

    res.json({ success: true, message: 'Accessibility setting updated successfully', data: { setting } });
  } catch (error) { next(error); }
};

exports.checkAccess = async (req, res, next) => {
  try {
    const { userId, feature, action } = req.body;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.role === 'SUPER_ADMIN') {
      return res.json({ success: true, data: { canAccess: true, userId, feature, action } });
    }

    const setting = await prisma.accessibilitySetting.findUnique({
      where: { role_feature: { role: user.role, feature } },
    });

    let canAccess = false;
    if (setting) {
      const actionMap = { access: 'canAccess', create: 'canCreate', update: 'canUpdate', delete: 'canDelete' };
      canAccess = setting[actionMap[action]] || false;
    }

    res.json({ success: true, data: { canAccess, userId, feature, action } });
  } catch (error) { next(error); }
};

// ─── Admin Profile ───
exports.getAdminProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const perms = await prisma.rolePermission.findMany({ where: { role: user.role } });
    res.json({
      success: true,
      data: { user: sanitizeUser(user), permissions: perms.map((p) => p.permission), role: user.role },
    });
  } catch (error) { next(error); }
};

// ─── User Management ───
exports.listUsers = async (req, res, next) => {
  try {
    const { role, isActive, search } = req.query;
    const { page, limit, skip } = paginate(req.query);

    const where = {};
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search } },
        { username: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: { users: users.map(sanitizeUser), pagination: paginationMeta(total, page, limit) },
    });
  } catch (error) { next(error); }
};

exports.getUserDetails = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const perms = await prisma.rolePermission.findMany({ where: { role: user.role } });
    res.json({
      success: true,
      data: { user: sanitizeUser(user), permissions: perms.map((p) => p.permission) },
    });
  } catch (error) { next(error); }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const updateData = {};
    const fields = ['fullName', 'email', 'isActive', 'planLimit'];
    fields.forEach((f) => { if (req.body[f] !== undefined) updateData[f] = req.body[f]; });
    if (updateData.isActive !== undefined) updateData.isActive = updateData.isActive === 'true' || updateData.isActive === true;
    if (updateData.planLimit !== undefined) updateData.planLimit = parseInt(updateData.planLimit, 10);

    if (req.file) {
      try {
        const isImage = req.file.mimetype.startsWith('image/');
        const result = await uploadToCloudinary(req.file.buffer, {
          resource_type: isImage ? 'image' : 'raw',
          folder: `r3sults/users/${userId}`,
        });
        if (isImage) {
          updateData.profilePictureUrl = result.secure_url;
        }
      } catch (err) {
        console.error('Upload error:', err);
      }
    }

    const user = await prisma.user.update({ where: { id: userId }, data: updateData });
    res.json({ success: true, message: 'User updated successfully', data: { user: sanitizeUser(user) } });
  } catch (error) { next(error); }
};

exports.activateUser = async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.userId },
      data: { isActive: true },
    });
    res.json({ success: true, message: 'User activated successfully', data: { user: sanitizeUser(user) } });
  } catch (error) { next(error); }
};

exports.deactivateUser = async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.userId },
      data: { isActive: false, refreshToken: null },
    });
    res.json({ success: true, message: 'User deactivated successfully', data: { user: sanitizeUser(user) } });
  } catch (error) { next(error); }
};

exports.getUserRole = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.userId } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          role: user.role,
          roleAssignedBy: user.roleAssignedBy,
          roleAssignedAt: user.roleAssignedAt,
        },
      },
    });
  } catch (error) { next(error); }
};

exports.assignRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role, roleAssignedBy: req.user.id, roleAssignedAt: new Date() },
    });
    res.json({ success: true, message: 'Role assigned successfully', data: { user: sanitizeUser(user) } });
  } catch (error) { next(error); }
};
