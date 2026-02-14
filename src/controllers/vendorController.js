const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../utils/token');
const { generateOTP, isOTPExpired, sendEmailOTP, sendSmsOTP } = require('../utils/otp');

const sanitize = (v) => {
  if (!v) return null;
  const { passwordHash, otpCode, otpExpiresAt, otpAttempts, refreshToken, ...safe } = v;
  return safe;
};

exports.signup = async (req, res, next) => {
  try {
    const { email, password, fullName, businessName, phoneNumber, businessType, businessCategory, einNumber, state, zipCode } = req.body;

    const existing = await prisma.vendor.findFirst({
      where: { OR: [{ email }, ...(phoneNumber ? [{ phoneNumber }] : []), ...(einNumber ? [{ einNumber }] : [])] },
    });
    if (existing) return res.status(409).json({ success: false, message: 'Vendor already exists' });

    const passwordHash = await bcrypt.hash(password, 12);
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const vendor = await prisma.vendor.create({
      data: {
        email, passwordHash, fullName, businessName, phoneNumber: phoneNumber || null,
        businessType, businessCategory, einNumber: einNumber || null,
        state, zipCode, country: 'USA', authProvider: 'email',
        otpCode: otp, otpExpiresAt, status: 'PENDING',
      },
    });

    await sendEmailOTP(email, otp);

    res.status(201).json({
      success: true,
      message: 'Vendor registration successful. OTP sent to your email for verification. Account pending admin approval.',
      data: { vendorId: vendor.id, email: vendor.email, status: 'PENDING' },
    });
  } catch (error) { next(error); }
};

exports.login = async (req, res, next) => {
  try {
    const { email, phoneNumber, username, password } = req.body;
    const where = email ? { email } : phoneNumber ? { phoneNumber } : { username };

    const vendor = await prisma.vendor.findUnique({ where });
    if (!vendor) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (!vendor.isActive) return res.status(403).json({ success: false, message: 'Account is deactivated' });
    if (vendor.status !== 'APPROVED') {
      return res.status(403).json({ success: false, message: `Account is ${vendor.status.toLowerCase()}` });
    }

    const valid = await bcrypt.compare(password, vendor.passwordHash);
    if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const accessToken = generateAccessToken({ id: vendor.id, type: 'vendor' });
    const refreshToken = generateRefreshToken({ id: vendor.id, type: 'vendor' });
    await prisma.vendor.update({ where: { id: vendor.id }, data: { refreshToken, lastLoginAt: new Date() } });

    res.json({ success: true, message: 'Login successful', data: { vendor: sanitize(vendor), accessToken, refreshToken } });
  } catch (error) { next(error); }
};

exports.googleSignIn = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    let payload;
    try {
      const ticket = await client.verifyIdToken({ idToken, audience: [process.env.GOOGLE_CLIENT_ID].filter(Boolean) });
      payload = ticket.getPayload();
    } catch (verifyError) {
      return res.status(401).json({ success: false, message: 'Invalid Google ID token' });
    }
    const { sub: providerId, email, name, picture } = payload;

    let vendor = await prisma.vendor.findFirst({
      where: { OR: [{ providerId, authProvider: 'google' }, ...(email ? [{ email }] : [])] },
    });

    let needsPhoneUpdate = false;
    if (vendor) {
      if (vendor.status !== 'APPROVED') return res.status(403).json({ success: false, message: 'Account not approved' });
      vendor = await prisma.vendor.update({ where: { id: vendor.id }, data: { lastLoginAt: new Date(), authProvider: 'google', providerId } });
    } else {
      return res.status(403).json({ success: false, message: 'No vendor account found. Please register first.' });
    }

    if (!vendor.phoneNumber) needsPhoneUpdate = true;

    const accessToken = generateAccessToken({ id: vendor.id, type: 'vendor' });
    const refreshToken = generateRefreshToken({ id: vendor.id, type: 'vendor' });
    await prisma.vendor.update({ where: { id: vendor.id }, data: { refreshToken } });

    res.json({ success: true, message: 'Login successful', data: { vendor: sanitize(vendor), needsPhoneUpdate, accessToken, refreshToken } });
  } catch (error) { next(error); }
};

exports.appleSignIn = async (req, res, next) => {
  try {
    const { identityToken } = req.body;
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(identityToken, { complete: true });
    if (!decoded) return res.status(401).json({ success: false, message: 'Invalid token' });

    const { sub: providerId, email } = decoded.payload;
    let vendor = await prisma.vendor.findFirst({
      where: { OR: [{ providerId, authProvider: 'apple' }, ...(email ? [{ email }] : [])] },
    });

    if (!vendor || vendor.status !== 'APPROVED') {
      return res.status(403).json({ success: false, message: 'No approved vendor account found' });
    }

    vendor = await prisma.vendor.update({ where: { id: vendor.id }, data: { lastLoginAt: new Date(), authProvider: 'apple', providerId } });
    const needsPhoneUpdate = !vendor.phoneNumber;

    const accessToken = generateAccessToken({ id: vendor.id, type: 'vendor' });
    const refreshToken = generateRefreshToken({ id: vendor.id, type: 'vendor' });
    await prisma.vendor.update({ where: { id: vendor.id }, data: { refreshToken } });

    res.json({ success: true, message: 'Login successful', data: { vendor: sanitize(vendor), needsPhoneUpdate, accessToken, refreshToken } });
  } catch (error) { next(error); }
};

exports.sendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    const otp = generateOTP();
    const vendor = await prisma.vendor.findUnique({ where: { email } });
    if (vendor) {
      await prisma.vendor.update({ where: { id: vendor.id }, data: { otpCode: otp, otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000), otpAttempts: 0 } });
      await sendEmailOTP(email, otp);
    }
    res.json({ success: true, message: 'OTP sent successfully to your email', data: { email, expiresIn: 300 } });
  } catch (error) { next(error); }
};

exports.verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const vendor = await prisma.vendor.findUnique({ where: { email } });
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    if (!vendor.otpCode || isOTPExpired(vendor.otpExpiresAt) || vendor.otpCode !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    const updated = await prisma.vendor.update({
      where: { id: vendor.id },
      data: { isVerified: true, emailVerified: true, otpCode: null, otpExpiresAt: null, otpAttempts: 0 },
    });
    res.json({ success: true, message: 'Email verified successfully', data: { vendor: sanitize(updated) } });
  } catch (error) { next(error); }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const vendor = await prisma.vendor.findUnique({ where: { email } });
    if (vendor) {
      const otp = generateOTP();
      await prisma.vendor.update({ where: { id: vendor.id }, data: { otpCode: otp, otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000), otpAttempts: 0 } });
      await sendEmailOTP(email, otp);
    }
    res.json({ success: true, message: 'If account exists, OTP will be sent to your email', data: { expiresIn: 300 } });
  } catch (error) { next(error); }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    const vendor = await prisma.vendor.findUnique({ where: { email } });
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    if (!vendor.otpCode || isOTPExpired(vendor.otpExpiresAt) || vendor.otpCode !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.vendor.update({ where: { id: vendor.id }, data: { passwordHash, otpCode: null, otpExpiresAt: null, otpAttempts: 0, refreshToken: null } });
    res.json({ success: true, message: 'Password reset successful. Please login again.' });
  } catch (error) { next(error); }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Refresh token required' });

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    const vendor = await prisma.vendor.findUnique({ where: { id: decoded.id } });
    if (!vendor || vendor.refreshToken !== token) return res.status(401).json({ success: false, message: 'Invalid refresh token' });

    const accessToken = generateAccessToken({ id: vendor.id, type: 'vendor' });
    const newRefreshToken = generateRefreshToken({ id: vendor.id, type: 'vendor' });
    await prisma.vendor.update({ where: { id: vendor.id }, data: { refreshToken: newRefreshToken } });

    res.json({ success: true, message: 'Token refreshed successfully', data: { accessToken, refreshToken: newRefreshToken } });
  } catch (error) { next(error); }
};

exports.getMe = async (req, res, next) => {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { id: req.user.id } });
    res.json({ success: true, data: { vendor: sanitize(vendor) } });
  } catch (error) { next(error); }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { fullName, businessName, city, state, zipCode, website, address } = req.body;
    const data = {};
    if (fullName !== undefined) data.fullName = fullName;
    if (businessName !== undefined) data.businessName = businessName;
    if (city !== undefined) data.city = city;
    if (state !== undefined) data.state = state;
    if (zipCode !== undefined) data.zipCode = zipCode;
    if (website !== undefined) data.website = website;
    if (address !== undefined) data.address = address;

    const vendor = await prisma.vendor.update({ where: { id: req.user.id }, data });
    res.json({ success: true, message: 'Profile updated successfully', data: { vendor: sanitize(vendor) } });
  } catch (error) { next(error); }
};

exports.logout = async (req, res, next) => {
  try {
    await prisma.vendor.update({ where: { id: req.user.id }, data: { refreshToken: null } });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) { next(error); }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const vendor = await prisma.vendor.findUnique({ where: { id: req.user.id } });
    if (!vendor.passwordHash) return res.status(400).json({ success: false, message: 'No password set' });
    const valid = await bcrypt.compare(currentPassword, vendor.passwordHash);
    if (!valid) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.vendor.update({ where: { id: req.user.id }, data: { passwordHash, refreshToken: null } });
    res.json({ success: true, message: 'Password changed successfully. Please login again.' });
  } catch (error) { next(error); }
};

exports.updatePhone = async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;
    const existing = await prisma.vendor.findUnique({ where: { phoneNumber } });
    if (existing && existing.id !== req.user.id) return res.status(409).json({ success: false, message: 'Phone number already in use' });

    const otp = generateOTP();
    await prisma.vendor.update({
      where: { id: req.user.id },
      data: { otpCode: otp, otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000), otpAttempts: 0 },
    });
    await sendSmsOTP(phoneNumber, otp);
    res.json({ success: true, message: 'OTP sent for phone verification', data: { phoneNumber, expiresIn: 300 } });
  } catch (error) { next(error); }
};
