const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../utils/token');
const { generateOTP, isOTPExpired, sendOtpViaGHL } = require('../utils/otp');

// Dummy credentials for App Store / Play Store review
const PLAY_STORE_TEST_PHONE = '+15551234567';
const PLAY_STORE_TEST_OTP = '123456';

const sanitizeUser = (user) => {
  const { passwordHash, otpCode, otpExpiresAt, otpAttempts, refreshToken, ...safe } = user;
  return safe;
};

const ensureTestUserSubscription = async (userId) => {
  await prisma.subscription.upsert({
    where: { userId },
    update: {
      plan: 'ELITE',
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
    create: {
      userId,
      plan: 'ELITE',
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    }
  });
};

const getDefaultRoleId = async () => {
  const memberRole = await prisma.role.findUnique({ where: { name: 'MEMBER' } });
  return memberRole ? memberRole.id : null;
};

const getUserActions = async (roleName, roleId) => {
  if (roleName === 'SUPER_ADMIN') {
    const allActions = await prisma.action.findMany({ where: { isActive: true }, select: { actionKey: true } });
    return allActions.map(a => a.actionKey);
  }
  if (!roleId) return [];
  const roleActions = await prisma.roleActionMap.findMany({
    where: { roleId },
    include: { action: { select: { actionKey: true, isActive: true } } }
  });
  return roleActions.map(ra => ra.action).filter(a => a.isActive).map(a => a.actionKey);
};

/**
 * Generate a unique username from a full name.
 * Format: lowercase name (no spaces/special chars) + random 4-digit salt.
 * e.g. "John Doe" → "johndoe4821"
 */
const generateUniqueUsername = async (fullName) => {
  const base = (fullName || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20) || 'user';

  for (let i = 0; i < 10; i++) {
    const salt = Math.floor(1000 + Math.random() * 9000); // 4-digit random
    const candidate = `${base}${salt}`;
    const exists = await prisma.user.findUnique({ where: { username: candidate } });
    if (!exists) return candidate;
  }
  // Fallback: use timestamp
  return `${base}${Date.now().toString(36)}`;
};

exports.register = async (req, res, next) => {
  try {
    const { phoneNumber, password, fullName, email, username } = req.body;

    const existing = await prisma.user.findFirst({
      where: { OR: [{ phoneNumber }, ...(email ? [{ email }] : []), ...(username ? [{ username }] : [])] },
    });
    if (existing) {
      return res.status(409).json({ success: false, message: 'User already exists with this phone number, email, or username' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const isTestAccount = phoneNumber === PLAY_STORE_TEST_PHONE;
    const otp = isTestAccount ? PLAY_STORE_TEST_OTP : generateOTP();
    const otpExpiresAt = isTestAccount 
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) 
      : new Date(Date.now() + 5 * 60 * 1000);

    const autoUsername = username || await generateUniqueUsername(fullName);

    const user = await prisma.user.create({
      data: {
        phoneNumber,
        passwordHash,
        fullName,
        email: email || null,
        username: autoUsername,
        otpCode: otp,
        otpExpiresAt,
        authProvider: 'phone',
        roleId: await getDefaultRoleId(),
      },
    });

    await sendOtpViaGHL(phoneNumber, otp);

    res.status(201).json({
      success: true,
      message: 'Registration successful. OTP sent for verification.',
      data: { userId: user.id, phoneNumber: user.phoneNumber },
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { phoneNumber, email, password } = req.body;

    if (!password || (!phoneNumber && !email)) {
      return res.status(400).json({ success: false, message: 'Please provide (phoneNumber or email) and password' });
    }

    let user = null;
    if (phoneNumber) {
      user = await prisma.user.findUnique({ where: { phoneNumber } });
    } else if (email) {
      user = await prisma.user.findUnique({ where: { email } });
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }
    if (!user.passwordHash) {
      return res.status(401).json({ success: false, message: 'Please login using your social account' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    let roleName = user.role || 'MEMBER';
    if (user.roleId) {
      const roleRecord = await prisma.role.findUnique({ where: { id: user.roleId } });
      if (roleRecord) roleName = roleRecord.name;
    }
    user.roleName = roleName;
    user.actions = await getUserActions(roleName, user.roleId);

    const accessToken = generateAccessToken({ id: user.id, role: roleName, type: 'user' });
    const refreshToken = generateRefreshToken({ id: user.id, type: 'user' });

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken, lastLoginAt: new Date() },
    });

    if (user.phoneNumber === PLAY_STORE_TEST_PHONE) {
      await ensureTestUserSubscription(user.id);
    }

    res.json({
      success: true,
      message: 'Login successful',
      data: { user: sanitizeUser(user), accessToken, refreshToken },
    });
  } catch (error) {
    next(error);
  }
};

exports.googleSignIn = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: [process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_IOS_CLIENT_ID, process.env.GOOGLE_ANDROID_CLIENT_ID].filter(Boolean),
      });
      payload = ticket.getPayload();
    } catch (verifyError) {
      return res.status(401).json({ success: false, message: 'Invalid Google ID token' });
    }
    const { sub: providerId, email, name, picture } = payload;

    let user = await prisma.user.findFirst({
      where: { OR: [{ providerId, authProvider: 'google' }, ...(email ? [{ email }] : [])] },
    });

    let needsPhoneUpdate = false;
    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date(), authProvider: 'google', providerId },
      });
    } else {
      const autoUsername = await generateUniqueUsername(name);
      user = await prisma.user.create({
        data: {
          email,
          fullName: name,
          username: autoUsername,
          profilePictureUrl: picture,
          authProvider: 'google',
          providerId,
          isVerified: true,
          emailVerified: true,
          roleId: await getDefaultRoleId(),
        },
      });
      needsPhoneUpdate = true;
    }

    if (!user.phoneNumber) needsPhoneUpdate = true;

    let roleName = user.role || 'MEMBER';
    if (user.roleId) {
      const roleRecord = await prisma.role.findUnique({ where: { id: user.roleId } });
      if (roleRecord) roleName = roleRecord.name;
    }
    user.roleName = roleName;
    user.actions = await getUserActions(roleName, user.roleId);

    const accessToken = generateAccessToken({ id: user.id, role: roleName, type: 'user' });
    const refreshToken = generateRefreshToken({ id: user.id, type: 'user' });
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

    res.json({
      success: true,
      message: 'Login successful',
      data: { user: sanitizeUser(user), needsPhoneUpdate, accessToken, refreshToken },
    });
  } catch (error) {
    next(error);
  }
};

exports.appleSignIn = async (req, res, next) => {
  try {
    const { identityToken, user: appleUser } = req.body;

    const appleSignin = require('apple-signin-auth');
    let payload;
    // Accept both the iOS app Bundle ID and the Services ID (for web)
    // Native iOS tokens have aud = Bundle ID, not the Services ID
    const validAudiences = [
      process.env.APPLE_CLIENT_ID,
      process.env.APPLE_IAP_BUNDLE_ID,
    ].filter(Boolean);
    try {
      payload = await appleSignin.verifyIdToken(identityToken, {
        audience: validAudiences.length === 1 ? validAudiences[0] : validAudiences,
        ignoreExpiration: false,
      });
    } catch (verifyError) {
      console.error('Apple token verification failed:', verifyError?.message || verifyError);
      console.error('Expected audiences:', validAudiences);
      return res.status(401).json({ success: false, message: 'Invalid Apple identity token' });
    }

    const { sub: providerId, email } = payload;
    // Handle both backend shape { fullName: { givenName, familyName } }
    // and frontend shape { name: { firstName, lastName } }
    let fullName = null;
    if (appleUser?.fullName) {
      fullName = `${appleUser.fullName.givenName || ''} ${appleUser.fullName.familyName || ''}`.trim() || null;
    } else if (appleUser?.name) {
      fullName = `${appleUser.name.firstName || ''} ${appleUser.name.lastName || ''}`.trim() || null;
    }

    let user = await prisma.user.findFirst({
      where: { OR: [{ providerId, authProvider: 'apple' }, ...(email ? [{ email }] : [])] },
    });

    let needsPhoneUpdate = false;
    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date(), authProvider: 'apple', providerId },
      });
    } else {
      const autoUsername = await generateUniqueUsername(fullName);
      user = await prisma.user.create({
        data: {
          email: email || null,
          fullName,
          username: autoUsername,
          authProvider: 'apple',
          providerId,
          isVerified: true,
          emailVerified: !!email,
          roleId: await getDefaultRoleId(),
        },
      });
      needsPhoneUpdate = true;
    }

    if (!user.phoneNumber) needsPhoneUpdate = true;

    let roleName = user.role || 'MEMBER';
    if (user.roleId) {
      const roleRecord = await prisma.role.findUnique({ where: { id: user.roleId } });
      if (roleRecord) roleName = roleRecord.name;
    }
    user.roleName = roleName;
    user.actions = await getUserActions(roleName, user.roleId);

    const accessToken = generateAccessToken({ id: user.id, role: roleName, type: 'user' });
    const refreshToken = generateRefreshToken({ id: user.id, type: 'user' });
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

    res.json({
      success: true,
      message: 'Login successful',
      data: { user: sanitizeUser(user), needsPhoneUpdate, accessToken, refreshToken },
    });
  } catch (error) {
    next(error);
  }
};

exports.sendOTP = async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;
    const isTestAccount = phoneNumber === PLAY_STORE_TEST_PHONE;
    const otp = isTestAccount ? PLAY_STORE_TEST_OTP : generateOTP();
    const otpExpiresAt = isTestAccount 
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) 
      : new Date(Date.now() + 5 * 60 * 1000);

    let user = await prisma.user.findUnique({ where: { phoneNumber } });
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { otpCode: otp, otpExpiresAt, otpAttempts: 0 },
      });
    } else {
      const autoUsername = await generateUniqueUsername(null);
      user = await prisma.user.create({
        data: { 
          phoneNumber, 
          username: autoUsername, 
          otpCode: otp, 
          otpExpiresAt, 
          authProvider: 'phone',
          roleId: await getDefaultRoleId()
        },
      });
    }

    if (!isTestAccount) {
      await sendOtpViaGHL(phoneNumber, otp);
    }

    res.json({
      success: true,
      message: 'OTP sent successfully',
      data: { phoneNumber, expiresIn: 300 },
    });
  } catch (error) {
    next(error);
  }
};

exports.verifyOTP = async (req, res, next) => {
  try {
    const { phoneNumber, otp } = req.body;

    const user = await prisma.user.findUnique({ where: { phoneNumber } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isTestAccount = phoneNumber === PLAY_STORE_TEST_PHONE;

    if (user.otpAttempts >= 5 && !isTestAccount) {
      return res.status(429).json({ success: false, message: 'Too many OTP attempts. Please request a new OTP.' });
    }

    if (!isTestAccount && (!user.otpCode || isOTPExpired(user.otpExpiresAt))) {
      return res.status(400).json({ success: false, message: 'OTP expired. Please request a new one.' });
    }

    if (isTestAccount) {
      if (otp !== PLAY_STORE_TEST_OTP) {
        return res.status(400).json({ success: false, message: 'Invalid OTP' });
      }
    } else if (user.otpCode !== otp) {
      await prisma.user.update({
        where: { id: user.id },
        data: { otpAttempts: { increment: 1 } },
      });
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        phoneVerified: true,
        otpCode: null,
        otpExpiresAt: null,
        otpAttempts: 0,
        lastLoginAt: new Date(),
      },
    });

    let roleName = updated.role || 'MEMBER';
    if (updated.roleId) {
      const roleRecord = await prisma.role.findUnique({ where: { id: updated.roleId } });
      if (roleRecord) roleName = roleRecord.name;
    }
    updated.roleName = roleName;
    updated.actions = await getUserActions(roleName, updated.roleId);

    const accessToken = generateAccessToken({ id: updated.id, role: roleName, type: 'user' });
    const refreshToken = generateRefreshToken({ id: updated.id, type: 'user' });
    await prisma.user.update({ where: { id: updated.id }, data: { refreshToken } });

    if (updated.phoneNumber === PLAY_STORE_TEST_PHONE) {
      await ensureTestUserSubscription(updated.id);
    }

    res.json({
      success: true,
      message: 'Phone verified successfully',
      data: { user: sanitizeUser(updated), accessToken, refreshToken },
    });
  } catch (error) {
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;
    const user = await prisma.user.findUnique({ where: { phoneNumber } });

    const isTestAccount = phoneNumber === PLAY_STORE_TEST_PHONE;

    if (user) {
      const otp = isTestAccount ? PLAY_STORE_TEST_OTP : generateOTP();
      const otpExpiresAt = isTestAccount 
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) 
        : new Date(Date.now() + 5 * 60 * 1000);
      await prisma.user.update({
        where: { id: user.id },
        data: { otpCode: otp, otpExpiresAt, otpAttempts: 0 },
      });
      if (!isTestAccount) {
        await sendOtpViaGHL(phoneNumber, otp);
      }
    }

    res.json({
      success: true,
      message: 'If account exists, OTP will be sent',
      data: { expiresIn: 300 },
    });
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { phoneNumber, otp, newPassword } = req.body;

    const isTestAccount = phoneNumber === PLAY_STORE_TEST_PHONE;

    const user = await prisma.user.findUnique({ where: { phoneNumber } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!isTestAccount && (!user.otpCode || isOTPExpired(user.otpExpiresAt) || user.otpCode !== otp)) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    if (isTestAccount && otp !== PLAY_STORE_TEST_OTP) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, otpCode: null, otpExpiresAt: null, otpAttempts: 0, refreshToken: null },
    });

    res.json({ success: true, message: 'Password reset successful. Please login again.' });
  } catch (error) {
    next(error);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Refresh token required' });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || user.refreshToken !== token) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    let roleName = user.role || 'MEMBER';
    if (user.roleId) {
      const roleRecord = await prisma.role.findUnique({ where: { id: user.roleId } });
      if (roleRecord) roleName = roleRecord.name;
    }
    user.roleName = roleName;
    user.actions = await getUserActions(roleName, user.roleId);

    const accessToken = generateAccessToken({ id: user.id, role: roleName, type: 'user' });
    const newRefreshToken = generateRefreshToken({ id: user.id, type: 'user' });
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: newRefreshToken } });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: { accessToken, refreshToken: newRefreshToken },
    });
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    res.json({ success: true, data: { user: sanitizeUser(user) } });
  } catch (error) {
    next(error);
  }
};

exports.updatePhone = async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;

    const existing = await prisma.user.findUnique({ where: { phoneNumber } });
    if (existing && existing.id !== req.user.id) {
      return res.status(409).json({ success: false, message: 'Phone number already in use' });
    }

    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { otpCode: otp, otpExpiresAt, otpAttempts: 0 },
    });

    await sendOtpViaGHL(phoneNumber, otp);

    res.json({
      success: true,
      message: 'OTP sent for phone verification',
      data: { phoneNumber, expiresIn: 300 },
    });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { refreshToken: null },
    });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};
