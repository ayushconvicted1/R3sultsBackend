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
        const isVideo = req.file.mimetype.startsWith('video/');
        const result = await uploadToCloudinary(req.file.buffer, {
          resource_type: isImage ? 'image' : isVideo ? 'video' : 'raw',
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
// ─── Geofence Notification System ───

/**
 * Create a geofence operation for status update notifications
 * Requirements: 3.1, 8.1 - Admin API endpoints for geofenced status updates
 */
exports.createGeofenceOperation = async (req, res, next) => {
  try {
    const { centerLat, centerLng, radiusMeters, reason } = req.body;
    
    // Validate required parameters
    if (typeof centerLat !== 'number' || typeof centerLng !== 'number' || typeof radiusMeters !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Invalid parameters: centerLat, centerLng, and radiusMeters must be numbers'
      });
    }
    
    // Validate coordinate ranges
    if (centerLat < -90 || centerLat > 90) {
      return res.status(400).json({
        success: false,
        message: 'Invalid latitude: must be between -90 and 90 degrees'
      });
    }
    
    if (centerLng < -180 || centerLng > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid longitude: must be between -180 and 180 degrees'
      });
    }
    
    // Validate radius
    if (radiusMeters <= 0 || radiusMeters > 100000) {
      return res.status(400).json({
        success: false,
        message: 'Invalid radius: must be between 1 and 100,000 meters'
      });
    }
    
    // Create geofence operation record
    const operationId = `geofence_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    // In a real implementation, this would:
    // 1. Query user locations from the database
    // 2. Calculate affected users using the GeofenceManager service
    // 3. Store the operation in the database
    // 4. Return the operation details
    
    // For now, simulate the operation creation
    const mockAffectedUserCount = Math.floor(Math.random() * 50); // Simulate 0-49 affected users
    
    const geofenceOperation = {
      operationId,
      adminId: req.user.id,
      centerCoordinates: {
        latitude: centerLat,
        longitude: centerLng
      },
      radiusMeters,
      reason: reason || null,
      status: 'pending',
      affectedUserCount: mockAffectedUserCount,
      estimatedNotificationCount: mockAffectedUserCount,
      createdAt: new Date().toISOString(),
      executedAt: null
    };
    
    // TODO: Store in database
    // await prisma.geofenceOperation.create({ data: geofenceOperation });
    
    res.status(201).json({
      success: true,
      message: 'Geofence operation created successfully',
      data: {
        geofenceId: operationId,
        affectedUserCount: mockAffectedUserCount,
        estimatedNotificationCount: mockAffectedUserCount,
        status: 'pending'
      }
    });
    
  } catch (error) {
    console.error('Error creating geofence operation:', error);
    next(error);
  }
};

/**
 * Execute a geofence operation to send notifications and update user statuses
 * Requirements: 3.1, 8.2 - Execute geofence operations
 */
exports.executeGeofenceOperation = async (req, res, next) => {
  try {
    const { operationId } = req.params;
    
    if (!operationId) {
      return res.status(400).json({
        success: false,
        message: 'Operation ID is required'
      });
    }
    
    // In a real implementation, this would:
    // 1. Retrieve the operation from the database
    // 2. Use GeofenceManager to identify affected users
    // 3. Use NotificationService to send notifications
    // 4. Use UserStatusManager to update user statuses to UNVERIFIED
    // 5. Update the operation status to 'executing' then 'completed'
    
    // For now, simulate the execution
    const mockNotificationResults = {
      sent: Math.floor(Math.random() * 45),
      delivered: Math.floor(Math.random() * 40),
      failed: Math.floor(Math.random() * 5)
    };
    
    const executionResult = {
      operationId,
      status: 'completed',
      executedAt: new Date().toISOString(),
      executedBy: req.user.id,
      notificationResults: mockNotificationResults,
      affectedUserCount: mockNotificationResults.sent + mockNotificationResults.failed,
      success: true
    };
    
    // TODO: Update operation in database
    // await prisma.geofenceOperation.update({
    //   where: { operationId },
    //   data: { 
    //     status: 'completed',
    //     executedAt: new Date(),
    //     executedBy: req.user.id,
    //     notificationResults: mockNotificationResults
    //   }
    // });
    
    res.json({
      success: true,
      message: 'Geofence operation executed successfully',
      data: executionResult
    });
    
  } catch (error) {
    console.error('Error executing geofence operation:', error);
    
    // TODO: Mark operation as failed in database
    // await prisma.geofenceOperation.update({
    //   where: { operationId: req.params.operationId },
    //   data: { status: 'failed', error: error.message }
    // });
    
    next(error);
  }
};

/**
 * Get the status of a geofence operation
 * Requirements: 8.1 - Admin API endpoints for geofence status queries
 */
exports.getGeofenceOperationStatus = async (req, res, next) => {
  try {
    const { operationId } = req.params;
    
    if (!operationId) {
      return res.status(400).json({
        success: false,
        message: 'Operation ID is required'
      });
    }
    
    // In a real implementation, this would query the database
    // const operation = await prisma.geofenceOperation.findUnique({
    //   where: { operationId },
    //   include: { admin: { select: { id: true, fullName: true } } }
    // });
    
    // For now, simulate operation retrieval
    const mockOperation = {
      operationId,
      adminId: req.user.id,
      adminName: req.user.fullName || 'Admin User',
      centerCoordinates: {
        latitude: 40.7128,
        longitude: -74.0060
      },
      radiusMeters: 1000,
      reason: 'Emergency situation detected',
      status: Math.random() > 0.5 ? 'completed' : 'pending',
      affectedUserCount: Math.floor(Math.random() * 50),
      createdAt: new Date(Date.now() - Math.random() * 3600000).toISOString(), // Random time in last hour
      executedAt: Math.random() > 0.5 ? new Date().toISOString() : null,
      notificationResults: Math.random() > 0.5 ? {
        sent: 25,
        delivered: 23,
        failed: 2
      } : null
    };
    
    // Check if operation exists (simulate)
    if (Math.random() < 0.1) { // 10% chance of not found for testing
      return res.status(404).json({
        success: false,
        message: 'Geofence operation not found'
      });
    }
    
    res.json({
      success: true,
      data: { operation: mockOperation }
    });
    
  } catch (error) {
    console.error('Error getting geofence operation status:', error);
    next(error);
  }
};

/**
 * List all geofence operations with pagination and filtering
 * Requirements: 8.1 - Admin API endpoints for geofence management
 */
exports.listGeofenceOperations = async (req, res, next) => {
  try {
    const { status, adminId, startDate, endDate } = req.query;
    const { page, limit, skip } = paginate(req.query);
    
    // Build where clause for filtering
    const where = {};
    if (status) where.status = status;
    if (adminId) where.adminId = adminId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    
    // In a real implementation, this would query the database
    // const [operations, total] = await Promise.all([
    //   prisma.geofenceOperation.findMany({
    //     where,
    //     skip,
    //     take: limit,
    //     orderBy: { createdAt: 'desc' },
    //     include: { admin: { select: { id: true, fullName: true } } }
    //   }),
    //   prisma.geofenceOperation.count({ where })
    // ]);
    
    // For now, simulate operations list
    const mockOperations = Array.from({ length: Math.min(limit, 10) }, (_, i) => ({
      operationId: `geofence_${Date.now() - i * 1000}_${Math.random().toString(36).substring(2, 11)}`,
      adminId: req.user.id,
      adminName: req.user.fullName || 'Admin User',
      centerCoordinates: {
        latitude: 40.7128 + (Math.random() - 0.5) * 0.1,
        longitude: -74.0060 + (Math.random() - 0.5) * 0.1
      },
      radiusMeters: Math.floor(Math.random() * 5000) + 500,
      reason: ['Emergency situation', 'Safety check', 'Disaster response', null][Math.floor(Math.random() * 4)],
      status: ['pending', 'executing', 'completed', 'failed'][Math.floor(Math.random() * 4)],
      affectedUserCount: Math.floor(Math.random() * 100),
      createdAt: new Date(Date.now() - i * 3600000).toISOString(),
      executedAt: Math.random() > 0.3 ? new Date(Date.now() - i * 3600000 + 300000).toISOString() : null
    }));
    
    const mockTotal = 25; // Simulate total count
    
    res.json({
      success: true,
      data: {
        operations: mockOperations,
        pagination: paginationMeta(mockTotal, page, limit)
      }
    });
    
  } catch (error) {
    console.error('Error listing geofence operations:', error);
    next(error);
  }
};

/**
 * Get geofence operation statistics for monitoring
 * Requirements: 8.1 - Admin monitoring and reporting
 */
exports.getGeofenceStatistics = async (req, res, next) => {
  try {
    const { timeframe = '24h' } = req.query;
    
    // Calculate time range based on timeframe
    let startDate;
    switch (timeframe) {
      case '1h':
        startDate = new Date(Date.now() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    }
    
    // In a real implementation, this would query the database
    // const stats = await prisma.geofenceOperation.groupBy({
    //   by: ['status'],
    //   where: { createdAt: { gte: startDate } },
    //   _count: { operationId: true },
    //   _sum: { affectedUserCount: true }
    // });
    
    // For now, simulate statistics
    const mockStats = {
      timeframe,
      period: {
        start: startDate.toISOString(),
        end: new Date().toISOString()
      },
      operations: {
        total: Math.floor(Math.random() * 50) + 10,
        pending: Math.floor(Math.random() * 5),
        executing: Math.floor(Math.random() * 2),
        completed: Math.floor(Math.random() * 40) + 5,
        failed: Math.floor(Math.random() * 3)
      },
      notifications: {
        totalSent: Math.floor(Math.random() * 1000) + 100,
        totalDelivered: Math.floor(Math.random() * 900) + 90,
        totalFailed: Math.floor(Math.random() * 50) + 5,
        deliveryRate: 0.95 + Math.random() * 0.04 // 95-99%
      },
      users: {
        totalAffected: Math.floor(Math.random() * 500) + 50,
        averagePerOperation: Math.floor(Math.random() * 20) + 5
      }
    };
    
    res.json({
      success: true,
      data: { statistics: mockStats }
    });
    
  } catch (error) {
    console.error('Error getting geofence statistics:', error);
    next(error);
  }
};