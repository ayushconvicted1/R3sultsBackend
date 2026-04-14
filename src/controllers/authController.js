const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../utils/token');
const { generateOTP, isOTPExpired, sendOtpViaGHL } = require('../utils/otp');

const sanitizeUser = (user) => {
  const { passwordHash, otpCode, otpExpiresAt, otpAttempts, refreshToken, ...safe } = user;
  return safe;
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
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

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

    const accessToken = generateAccessToken({ id: user.id, role: user.role, type: 'user' });
    const refreshToken = generateRefreshToken({ id: user.id, type: 'user' });

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken, lastLoginAt: new Date() },
    });

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
        },
      });
      needsPhoneUpdate = true;
    }

    if (!user.phoneNumber) needsPhoneUpdate = true;

    const accessToken = generateAccessToken({ id: user.id, role: user.role, type: 'user' });
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
    try {
      payload = await appleSignin.verifyIdToken(identityToken, {
        audience: process.env.APPLE_CLIENT_ID,
        ignoreExpiration: false,
      });
    } catch (verifyError) {
      return res.status(401).json({ success: false, message: 'Invalid Apple identity token' });
    }

    const { sub: providerId, email } = payload;
    const fullName = appleUser?.fullName
      ? `${appleUser.fullName.givenName || ''} ${appleUser.fullName.familyName || ''}`.trim()
      : null;

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
        },
      });
      needsPhoneUpdate = true;
    }

    if (!user.phoneNumber) needsPhoneUpdate = true;

    const accessToken = generateAccessToken({ id: user.id, role: user.role, type: 'user' });
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
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    let user = await prisma.user.findUnique({ where: { phoneNumber } });
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { otpCode: otp, otpExpiresAt, otpAttempts: 0 },
      });
    } else {
      const autoUsername = await generateUniqueUsername(null);
      user = await prisma.user.create({
        data: { phoneNumber, username: autoUsername, otpCode: otp, otpExpiresAt, authProvider: 'phone' },
      });
    }

    await sendOtpViaGHL(phoneNumber, otp);

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

    if (user.otpAttempts >= 5) {
      return res.status(429).json({ success: false, message: 'Too many OTP attempts. Please request a new OTP.' });
    }

    if (!user.otpCode || isOTPExpired(user.otpExpiresAt)) {
      return res.status(400).json({ success: false, message: 'OTP expired. Please request a new one.' });
    }

    if (user.otpCode !== otp) {
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

    const accessToken = generateAccessToken({ id: updated.id, role: updated.role, type: 'user' });
    const refreshToken = generateRefreshToken({ id: updated.id, type: 'user' });
    await prisma.user.update({ where: { id: updated.id }, data: { refreshToken } });

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

    if (user) {
      const otp = generateOTP();
      const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
      await prisma.user.update({
        where: { id: user.id },
        data: { otpCode: otp, otpExpiresAt, otpAttempts: 0 },
      });
      await sendOtpViaGHL(phoneNumber, otp);
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

    const user = await prisma.user.findUnique({ where: { phoneNumber } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.otpCode || isOTPExpired(user.otpExpiresAt) || user.otpCode !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
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

    const accessToken = generateAccessToken({ id: user.id, role: user.role, type: 'user' });
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
