const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { generateOTP, sendSmsOTP } = require('../utils/otp');

const sanitizeUser = (user) => {
  if (!user) return null;
  const { passwordHash, otpCode, otpExpiresAt, otpAttempts, refreshToken, ...safe } = user;
  return safe;
};

exports.addMember = async (req, res, next) => {
  try {
    const adminId = req.user.id;
    const { email, phoneNumber, fullName, relation, dateOfBirth, gender, bloodGroup } = req.body;

    const adminUser = await prisma.user.findUnique({ where: { id: adminId } });
    let group = await prisma.group.findFirst({ where: { adminId } });
    if (!group) {
      group = await prisma.group.create({
        data: { adminId, name: `${adminUser.fullName}'s Family` },
      });
    }

    const memberCount = await prisma.member.count({ where: { groupId: group.id, isActive: true } });
    if (memberCount >= adminUser.planLimit) {
      return res.status(400).json({ success: false, message: `Member limit reached (${adminUser.planLimit})` });
    }

    let isNewUser = false;
    let memberUser = null;
    if (phoneNumber) {
      memberUser = await prisma.user.findUnique({ where: { phoneNumber } });
    }
    if (!memberUser && email) {
      memberUser = await prisma.user.findUnique({ where: { email } });
    }

    if (!memberUser) {
      isNewUser = true;
      const tempPassword = Math.random().toString(36).slice(-8);
      const passwordHash = await bcrypt.hash(tempPassword, 12);
      memberUser = await prisma.user.create({
        data: {
          phoneNumber: phoneNumber || null,
          email: email || null,
          fullName,
          passwordHash,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          gender: gender || null,
          bloodGroup: bloodGroup || null,
          isVerified: true,
          isActive: true,
          authProvider: 'phone',
        },
      });
    }

    const existingMember = await prisma.member.findFirst({
      where: { userId: memberUser.id, groupId: group.id },
    });
    if (existingMember) {
      return res.status(409).json({ success: false, message: 'User is already a member of this group' });
    }

    const member = await prisma.member.create({
      data: { userId: memberUser.id, adminId, groupId: group.id, relation },
    });

    const updatedGroup = await prisma.group.findUnique({
      where: { id: group.id },
      include: { members: { include: { user: true } } },
    });

    res.status(201).json({
      success: true,
      message: 'Member added successfully. Account created and activated.',
      data: {
        member: { ...member, user: sanitizeUser(memberUser) },
        group: updatedGroup,
        isNewUser,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getMyGroup = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const adminGroup = await prisma.group.findFirst({
      where: { adminId: userId },
      include: {
        members: { include: { user: true } },
        admin: true,
      },
    });

    const memberGroups = await prisma.member.findMany({
      where: { userId, isActive: true },
      include: {
        group: {
          include: {
            admin: true,
            members: { include: { user: true } },
          },
        },
      },
    });

    if (adminGroup) {
      adminGroup.admin = sanitizeUser(adminGroup.admin);
      adminGroup.members = adminGroup.members.map((m) => ({ ...m, user: sanitizeUser(m.user) }));
    }

    const sanitizedMemberGroups = memberGroups.map((mg) => ({
      ...mg,
      group: {
        ...mg.group,
        admin: sanitizeUser(mg.group.admin),
        members: mg.group.members.map((m) => ({ ...m, user: sanitizeUser(m.user) })),
      },
    }));

    res.json({
      success: true,
      data: { adminGroup, memberGroups: sanitizedMemberGroups },
    });
  } catch (error) {
    next(error);
  }
};

exports.removeMember = async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    if (member.adminId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only group admin can remove members' });
    }

    await prisma.member.delete({ where: { id: memberId } });
    res.json({ success: true, message: 'Member removed successfully' });
  } catch (error) {
    next(error);
  }
};

exports.updateMember = async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const { relation } = req.body;

    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    if (member.adminId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only group admin can update members' });
    }

    const updated = await prisma.member.update({
      where: { id: memberId },
      data: { relation },
      include: { user: true },
    });
    updated.user = sanitizeUser(updated.user);

    res.json({ success: true, message: 'Member updated successfully', data: { member: updated } });
  } catch (error) {
    next(error);
  }
};

exports.updateGroupName = async (req, res, next) => {
  try {
    const { name } = req.body;
    let group = await prisma.group.findFirst({ where: { adminId: req.user.id } });
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    group = await prisma.group.update({
      where: { id: group.id },
      data: { name },
      include: { members: { include: { user: true } } },
    });

    res.json({ success: true, message: 'Group name updated successfully', data: { group } });
  } catch (error) {
    next(error);
  }
};

exports.getMemberDetails = async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: { user: true, group: true },
    });
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    member.user = sanitizeUser(member.user);
    res.json({ success: true, data: { member } });
  } catch (error) {
    next(error);
  }
};

exports.updateMemberProfile = async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const { fullName, bloodGroup, medicalConditions, dateOfBirth, gender } = req.body;

    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    if (member.adminId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only group admin can update member profile' });
    }

    const data = {};
    if (fullName !== undefined) data.fullName = fullName;
    if (bloodGroup !== undefined) data.bloodGroup = bloodGroup;
    if (medicalConditions !== undefined) data.medicalConditions = medicalConditions;
    if (dateOfBirth !== undefined) data.dateOfBirth = new Date(dateOfBirth);
    if (gender !== undefined) data.gender = gender;

    const user = await prisma.user.update({ where: { id: member.userId }, data });
    res.json({ success: true, message: 'Member profile updated successfully', data: { user: sanitizeUser(user) } });
  } catch (error) {
    next(error);
  }
};

exports.getAllMembers = async (req, res, next) => {
  try {
    const group = await prisma.group.findFirst({
      where: { adminId: req.user.id },
      include: { members: { include: { user: true } } },
    });
    if (!group) {
      return res.json({ success: true, data: { group: null, members: [], totalMembers: 0, planLimit: req.user.planLimit } });
    }

    const members = group.members.map((m) => ({ ...m, user: sanitizeUser(m.user) }));
    res.json({
      success: true,
      data: { group, members, totalMembers: members.length, planLimit: req.user.planLimit },
    });
  } catch (error) {
    next(error);
  }
};
