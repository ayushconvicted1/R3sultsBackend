const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const fcm = require('../services/fcm');
const { UserStatus } = require('@prisma/client'); // Assuming generated client has it, or just use strings if Enum issues.

// Helper to calculate distance in meters
function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2-lat1);  // deg2rad below
  var dLon = deg2rad(lon2-lon1); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c; // Distance in km
  return d * 1000; // Distance in meters
}

function deg2rad(deg) {
  return deg * (Math.PI/180)
}


const sanitizeUser = (user) => {
  const { passwordHash, otpCode, otpExpiresAt, otpAttempts, refreshToken, ...safe } = user;
  return safe;
};

exports.getProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        groups: { include: { members: { include: { user: true } } } },
        members: { include: { group: true } },
      },
    });
    res.json({ success: true, data: { user: sanitizeUser(user) } });
  } catch (error) {
    next(error);
  }
};

const { uploadToCloudinary } = require('../middleware/upload');

exports.updateProfile = async (req, res, next) => {
  try {
    const { fullName, dateOfBirth, gender, profilePictureUrl } = req.body;
    const data = {};
    
    // Handle text fields
    if (fullName !== undefined) data.fullName = fullName;
    if (dateOfBirth !== undefined) data.dateOfBirth = new Date(dateOfBirth);
    if (gender !== undefined) data.gender = gender;
    
    // Handle direct URL update (e.g. if sending string)
    if (profilePictureUrl !== undefined) data.profilePictureUrl = profilePictureUrl;

    // Handle File Upload if present
    if (req.file) {
      // Multer is using memory storage, so we have a buffer
      const result = await uploadToCloudinary(req.file.buffer, {
        folder: 'r3sults/profiles',
        public_id: `user_${req.user.id}_profile`,
        overwrite: true
      });
      
      if (result && result.secure_url) {
        data.profilePictureUrl = result.secure_url;
      }
    }

    const user = await prisma.user.update({ where: { id: req.user.id }, data });
    res.json({ success: true, message: 'Profile updated successfully', data: { user: sanitizeUser(user) } });
  } catch (error) {
    next(error);
  }
};

exports.updateAddress = async (req, res, next) => {
  try {
    const { address, city, state, country, pincode } = req.body;
    const data = {};
    if (address !== undefined) data.address = address;
    if (city !== undefined) data.city = city;
    if (state !== undefined) data.state = state;
    if (country !== undefined) data.country = country;
    if (pincode !== undefined) data.pincode = pincode;

    const user = await prisma.user.update({ where: { id: req.user.id }, data });
    res.json({ success: true, message: 'Address updated successfully', data: { user: sanitizeUser(user) } });
  } catch (error) {
    next(error);
  }
};

exports.updateEmergencyContact = async (req, res, next) => {
  try {
    const { emergencyContactName, emergencyContactPhone } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { emergencyContactName, emergencyContactPhone },
    });
    res.json({ success: true, message: 'Emergency contact updated successfully', data: { user: sanitizeUser(user) } });
  } catch (error) {
    next(error);
  }
};

exports.updateMedicalInfo = async (req, res, next) => {
  try {
    const { bloodGroup, medicalConditions } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { bloodGroup, medicalConditions },
    });
    res.json({ success: true, message: 'Medical information updated successfully', data: { user: sanitizeUser(user) } });
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (!user.passwordHash) {
      return res.status(400).json({ success: false, message: 'No password set for this account' });
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash, refreshToken: null },
    });

    res.json({ success: true, message: 'Password changed successfully. Please login again.' });
  } catch (error) {
    next(error);
  }
};

exports.updateEmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== req.user.id) {
      return res.status(409).json({ success: false, message: 'Email already in use' });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { email, emailVerified: false },
    });
    res.json({ success: true, message: 'Email updated successfully. Please verify your new email.', data: { user: sanitizeUser(user) } });
  } catch (error) {
    next(error);
  }
};

exports.updateUsername = async (req, res, next) => {
  try {
    const { username } = req.body;
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing && existing.id !== req.user.id) {
      return res.status(409).json({ success: false, message: 'Username already taken' });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { username },
    });
    res.json({ success: true, message: 'Username updated successfully', data: { user: sanitizeUser(user) } });
  } catch (error) {
    next(error);
  }
};

exports.deactivate = async (req, res, next) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { isActive: false, refreshToken: null },
    });
    res.json({ success: true, message: 'Account deactivated successfully' });
  } catch (error) {
    next(error);
  }
};

exports.promoteToAdmin = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Use a transaction to ensure atomicity
    const user = await prisma.$transaction(async (prisma) => {
      // 1. Promote User
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          role: 'ADMIN',
          planId: 'premium_plan', // Fake plan ID
          isSubscriber: true,
          planLimit: 10, // Assuming premium plan has higher limit
        },
      });

      // 2. Check if Group exists
      const existingGroup = await prisma.group.findFirst({
        where: { adminId: userId },
      });

      if (!existingGroup) {
        // 3. Create Group if not exists
        await prisma.group.create({
          data: {
            name: `${updatedUser.fullName || 'My'} Family Group`,
            adminId: userId,
          },
        });
      }

      // Fetch user with updated relations if needed, or just return updatedUser
      // To match getProfile structure:
      return await prisma.user.findUnique({
          where: { id: userId },
          include: {
            groups: { include: { members: { include: { user: true } } } },
            members: { include: { group: true } },
          },
        });
    });

    res.json({ 
        success: true, 
        message: 'Promoted to Admin successfully', 
        data: { user: sanitizeUser(user) } 
    });

  } catch (error) {
    next(error);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    
    // Allow 'Safe', 'Unsafe', 'Unverified' (case insensitive handling or exact enum)
    // Prisma Enum: SAFE, UNSAFE, UNVERIFIED
    const validStatuses = ['SAFE', 'UNSAFE', 'UNVERIFIED'];
    const normalizedStatus = status.toUpperCase();

    if (!validStatuses.includes(normalizedStatus)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const user = await prisma.user.update({
        where: { id: req.user.id },
        data: { status: normalizedStatus }
    });
    
    res.json({ success: true, message: 'Status updated successfully', data: { user: sanitizeUser(user) } });
  } catch (error) {
    next(error);
  }
};

exports.markUsersUnverifiedInRadius = async (req, res, next) => {
    try {
        const { lat, lng, radius, message } = req.body; // radius in meters

        if (!lat || !lng || !radius) {
            return res.status(400).json({ success: false, message: 'Missing lat, lng, or radius' });
        }

        // 1. Find all active user locations
        // Optimization: Use a bounding box first to limit JS calculation
        // 1 degree lat ~ 111km. Radius is in meters.
        // limit = radius / 111000 degrees roughly
        const rDeg = radius / 111000;
        
        const candidateLocations = await prisma.userLocation.findMany({
            where: {
                latitude: { gte: lat - rDeg, lte: lat + rDeg },
                longitude: { gte: lng - rDeg, lte: lng + rDeg },
                isActive: true
            },
            include: { user: true }
        });

        const impactedUserIds = [];
        const fcmTokens = [];

        // 2. Filter exact distance
        for (const loc of candidateLocations) {
            const dist = getDistanceFromLatLonInM(lat, lng, loc.latitude, loc.longitude);
            if (dist <= radius) {
                impactedUserIds.push(loc.userId);
            }
        }
        
        if (impactedUserIds.length === 0) {
            return res.json({ success: true, message: 'No users found in range', impactedCount: 0 });
        }

        // 3. Update status to UNVERIFIED for these users
        await prisma.user.updateMany({
            where: { id: { in: impactedUserIds } },
            data: { status: 'UNVERIFIED' }
        });

        // 4. Send Notifications
        const usersWithTokens = await prisma.user.findMany({
            where: { 
                id: { in: impactedUserIds },
                fcmToken: { not: null } 
            },
            select: { id: true, fcmToken: true }
        });
        
        const tokens = usersWithTokens.map(u => u.fcmToken);
        
        if (tokens.length > 0) {
             await fcm.sendMulticastNotification(
                tokens,
                'Status Alert',
                message || 'You are in an affected area. Please mark your status as Safe or Unsafe.',
                { type: 'STATUS_UPDATE_REQUEST' }
             );
        }
        
        // 5. Create persistent notification records
        const notificationMessage = message || 'You are in an affected area. Please mark your status as Safe or Unsafe.';
        await prisma.notification.createMany({
          data: impactedUserIds.map(userId => ({
            userId,
            title: 'Status Update Request',
            body: notificationMessage,
            type: 'status_update_request',
            data: { type: 'STATUS_UPDATE_REQUEST' },
          })),
        });

        res.json({ 
            success: true, 
            message: `Updated ${impactedUserIds.length} users to Unverified. Notification sent to ${tokens.length} devices.`, 
            impactedCount: impactedUserIds.length 
        });

    } catch (error) {
        next(error);
    }
}

exports.updateFcmToken = async (req, res, next) => {
  try {
    const { fcmToken } = req.body;
    if (!fcmToken) {
        return res.status(400).json({ success: false, message: 'Token required' });
    }

    await prisma.user.update({
        where: { id: req.user.id },
        data: { fcmToken }
    });
    
    res.json({ success: true, message: 'FCM Token updated' });
  } catch (error) {
    next(error);
  }
};


