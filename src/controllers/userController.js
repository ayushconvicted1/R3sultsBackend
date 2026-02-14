const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');

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

exports.updateProfile = async (req, res, next) => {
  try {
    const { fullName, dateOfBirth, gender, profilePictureUrl } = req.body;
    const data = {};
    if (fullName !== undefined) data.fullName = fullName;
    if (dateOfBirth !== undefined) data.dateOfBirth = new Date(dateOfBirth);
    if (gender !== undefined) data.gender = gender;
    if (profilePictureUrl !== undefined) data.profilePictureUrl = profilePictureUrl;

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
