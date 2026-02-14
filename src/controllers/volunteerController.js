const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../utils/token');
const { generateOTP, isOTPExpired, sendSmsOTP } = require('../utils/otp');
const { paginate, paginationMeta } = require('../utils/pagination');

const sanitize = (v) => {
  if (!v) return null;
  const { passwordHash, otpCode, otpExpiresAt, otpAttempts, refreshToken, ...safe } = v;
  return safe;
};

exports.signup = async (req, res, next) => {
  try {
    const { phoneNumber, password, fullName, email, username, skills, experience, availability, languages, volunteerType } = req.body;

    const existing = await prisma.volunteer.findFirst({
      where: { OR: [{ phoneNumber }, ...(email ? [{ email }] : []), ...(username ? [{ username }] : [])] },
    });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Volunteer already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const volunteer = await prisma.volunteer.create({
      data: {
        phoneNumber, passwordHash, fullName, email: email || null, username: username || null,
        skills, experience, availability, languages, volunteerType,
        otpCode: otp, otpExpiresAt, authProvider: 'phone', status: 'PENDING',
      },
    });

    await sendSmsOTP(phoneNumber, otp);

    res.status(201).json({
      success: true,
      message: 'Volunteer registration successful. OTP sent for phone verification. Account pending admin approval.',
      data: { volunteerId: volunteer.id, phoneNumber: volunteer.phoneNumber, status: 'PENDING' },
    });
  } catch (error) { next(error); }
};

exports.login = async (req, res, next) => {
  try {
    const { phoneNumber, email, username, password } = req.body;
    const where = phoneNumber ? { phoneNumber } : email ? { email } : { username };

    const volunteer = await prisma.volunteer.findUnique({ where });
    if (!volunteer) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (!volunteer.isActive) return res.status(403).json({ success: false, message: 'Account is deactivated' });
    if (volunteer.status !== 'APPROVED') {
      return res.status(403).json({ success: false, message: `Account is ${volunteer.status.toLowerCase()}. Please contact admin.` });
    }

    const valid = await bcrypt.compare(password, volunteer.passwordHash);
    if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const accessToken = generateAccessToken({ id: volunteer.id, type: 'volunteer' });
    const refreshToken = generateRefreshToken({ id: volunteer.id, type: 'volunteer' });
    await prisma.volunteer.update({ where: { id: volunteer.id }, data: { refreshToken, lastLoginAt: new Date() } });

    res.json({ success: true, message: 'Login successful', data: { volunteer: sanitize(volunteer), accessToken, refreshToken } });
  } catch (error) { next(error); }
};

exports.sendOTP = async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const volunteer = await prisma.volunteer.findUnique({ where: { phoneNumber } });
    if (volunteer) {
      await prisma.volunteer.update({ where: { id: volunteer.id }, data: { otpCode: otp, otpExpiresAt, otpAttempts: 0 } });
    }

    await sendSmsOTP(phoneNumber, otp);
    res.json({ success: true, message: 'OTP sent successfully', data: { phoneNumber, expiresIn: 300 } });
  } catch (error) { next(error); }
};

exports.verifyOTP = async (req, res, next) => {
  try {
    const { phoneNumber, otp } = req.body;
    const volunteer = await prisma.volunteer.findUnique({ where: { phoneNumber } });
    if (!volunteer) return res.status(404).json({ success: false, message: 'Volunteer not found' });
    if (!volunteer.otpCode || isOTPExpired(volunteer.otpExpiresAt) || volunteer.otpCode !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    const updated = await prisma.volunteer.update({
      where: { id: volunteer.id },
      data: { isVerified: true, phoneVerified: true, otpCode: null, otpExpiresAt: null, otpAttempts: 0 },
    });
    res.json({ success: true, message: 'Phone verified successfully', data: { volunteer: sanitize(updated) } });
  } catch (error) { next(error); }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;
    const volunteer = await prisma.volunteer.findUnique({ where: { phoneNumber } });
    if (volunteer) {
      const otp = generateOTP();
      await prisma.volunteer.update({
        where: { id: volunteer.id },
        data: { otpCode: otp, otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000), otpAttempts: 0 },
      });
      await sendSmsOTP(phoneNumber, otp);
    }
    res.json({ success: true, message: 'If account exists, OTP will be sent', data: { expiresIn: 300 } });
  } catch (error) { next(error); }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { phoneNumber, otp, newPassword } = req.body;
    const volunteer = await prisma.volunteer.findUnique({ where: { phoneNumber } });
    if (!volunteer) return res.status(404).json({ success: false, message: 'Volunteer not found' });
    if (!volunteer.otpCode || isOTPExpired(volunteer.otpExpiresAt) || volunteer.otpCode !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.volunteer.update({
      where: { id: volunteer.id },
      data: { passwordHash, otpCode: null, otpExpiresAt: null, otpAttempts: 0, refreshToken: null },
    });
    res.json({ success: true, message: 'Password reset successful. Please login again.' });
  } catch (error) { next(error); }
};

exports.getMe = async (req, res, next) => {
  try {
    const volunteer = await prisma.volunteer.findUnique({ where: { id: req.user.id } });
    res.json({ success: true, data: { volunteer: sanitize(volunteer) } });
  } catch (error) { next(error); }
};

// ─── Admin Volunteer Management ───
exports.listVolunteers = async (req, res, next) => {
  try {
    const { status, isActive, search } = req.query;
    const { page, limit, skip } = paginate(req.query);
    const where = {};
    if (status) where.status = status;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search } },
      ];
    }

    const [volunteers, total] = await Promise.all([
      prisma.volunteer.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.volunteer.count({ where }),
    ]);

    res.json({ success: true, data: { volunteers: volunteers.map(sanitize), pagination: paginationMeta(total, page, limit) } });
  } catch (error) { next(error); }
};

exports.getVolunteerDetails = async (req, res, next) => {
  try {
    const volunteer = await prisma.volunteer.findUnique({ where: { id: req.params.volunteerId } });
    if (!volunteer) return res.status(404).json({ success: false, message: 'Volunteer not found' });
    res.json({ success: true, data: { volunteer: sanitize(volunteer) } });
  } catch (error) { next(error); }
};

exports.approveVolunteer = async (req, res, next) => {
  try {
    const { notes } = req.body;
    const volunteer = await prisma.volunteer.update({
      where: { id: req.params.volunteerId },
      data: { status: 'APPROVED', verifiedBy: req.user.id, verifiedAt: new Date(), notes: notes || undefined },
    });
    res.json({ success: true, message: 'Volunteer approved successfully', data: { volunteer: sanitize(volunteer) } });
  } catch (error) { next(error); }
};

exports.rejectVolunteer = async (req, res, next) => {
  try {
    const { rejectionReason, notes } = req.body;
    const volunteer = await prisma.volunteer.update({
      where: { id: req.params.volunteerId },
      data: { status: 'REJECTED', rejectionReason, notes: notes || undefined, verifiedBy: req.user.id, verifiedAt: new Date() },
    });
    res.json({ success: true, message: 'Volunteer rejected successfully', data: { volunteer: sanitize(volunteer) } });
  } catch (error) { next(error); }
};

exports.suspendVolunteer = async (req, res, next) => {
  try {
    const { notes } = req.body;
    const volunteer = await prisma.volunteer.update({
      where: { id: req.params.volunteerId },
      data: { status: 'SUSPENDED', notes: notes || undefined, isActive: false },
    });
    res.json({ success: true, message: 'Volunteer suspended successfully', data: { volunteer: sanitize(volunteer) } });
  } catch (error) { next(error); }
};

exports.reactivateVolunteer = async (req, res, next) => {
  try {
    const { notes } = req.body;
    const volunteer = await prisma.volunteer.update({
      where: { id: req.params.volunteerId },
      data: { status: 'APPROVED', notes: notes || undefined, isActive: true },
    });
    res.json({ success: true, message: 'Volunteer reactivated successfully', data: { volunteer: sanitize(volunteer) } });
  } catch (error) { next(error); }
};

exports.updateVolunteerNotes = async (req, res, next) => {
  try {
    const { notes } = req.body;
    const volunteer = await prisma.volunteer.update({
      where: { id: req.params.volunteerId },
      data: { notes },
    });
    res.json({ success: true, message: 'Notes updated successfully', data: { volunteer: sanitize(volunteer) } });
  } catch (error) { next(error); }
};
