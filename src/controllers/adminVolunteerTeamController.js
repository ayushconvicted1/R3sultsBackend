const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'results-jwt-secret-key-2024';

// ─── volunteer-teams ───
exports.get_volunteer_teams = async (req, res, next) => {
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
        const limit = parseInt(req.query['limit'] || '50');
        const search = req.query['search'] || '';
        const status = req.query['status'] || '';
        const query = {};
        if (status)
            query.status = status;
        const skip = (page - 1) * limit;
        let teams = await prisma.adminVolunteerTeam.findMany({ where: query, orderBy: { createdAt: 'desc' }, skip: skip, take: limit });
        // Populate lead and members
        for (const team of teams) {
            if (team.leadId) {
                const lead = await prisma.volunteer.findUnique({ where: { id: team.leadId } });
                team.lead = lead;
            }
            if (team.memberIds && team.memberIds.length > 0) {
                const members = await prisma.volunteer.findMany({ where: { id: { in: team.memberIds } } });
                team.members = members;
            }
        }
        // Filter by search if needed
        let filteredTeams = teams;
        if (search) {
            const searchLower = search.toLowerCase();
            filteredTeams = teams.filter((t) => (t.teamId && t.teamId.toLowerCase().includes(searchLower)) ||
                (t.name && t.name.toLowerCase().includes(searchLower)) ||
                (t.specialization && t.specialization.toLowerCase().includes(searchLower)) ||
                (t.lead?.userId?.name && t.lead.userId.name.toLowerCase().includes(searchLower)));
        }
        const total = await prisma.adminVolunteerTeam.count({ where: query });
        return res.json({
            success: true,
            data: {
                teams: filteredTeams,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                    hasMore: skip + teams.length < total,
                },
            },
        });
    }
    catch (error) {
        console.error('Get teams error:', error);
        return res.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('get_volunteer_teams error:', error);
    next(error);
  }
};

exports.post_volunteer_teams = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        if (!tokenPayload) {
            return res.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        if (!true) {
            return res.json({ success: false, error: 'Permission denied' }, { status: 403 });
        }
        const body = req.body;
        // Validate lead exists
        const lead = await prisma.volunteer.findUnique({ where: { id: body.leadId } });
        if (!lead) {
            return res.json({ success: false, error: 'Team lead not found' }, { status: 400 });
        }
        // Validate members exist
        if (body.memberIds && body.memberIds.length > 0) {
            const members = await prisma.volunteer.findMany({ where: { id: { in: body.memberIds } } });
            if (members.length !== body.memberIds.length) {
                return res.json({ success: false, error: 'One or more members not found' }, { status: 400 });
            }
        }
        // Ensure lead is in memberIds
        const memberIds = body.memberIds || [];
        if (!memberIds.includes(body.leadId)) {
            memberIds.push(body.leadId);
        }
        // Create team
        const team = await prisma.adminprisma.adminVolunteerTeam.create({ data: { data: {
                    name: body.name,
                    description: body.description,
                    leadId: body.leadId,
                    memberIds: memberIds,
                    specialization: body.specialization,
                    status: body.status || 'active',
                } } });
        // Update volunteers with teamId
        await prisma.volunteer.updateMany({ where: { id: { in: memberIds } }, data: { teamId: team.id.toString() } });
    const populatedTeam = await prisma.adminVolunteerTeam.findUnique({ where: { id: team.id } });
    // Populate lead and members
    const leadData = await prisma.volunteer.findUnique({ where: { id: team.leadId } });
    const membersData = await prisma.volunteer.findMany({ where: { id: { in: team.memberIds } } });
    return res.json({
        success: true,
        data: {
            team: {
                ...populatedTeam,
                lead: leadData,
                members: membersData,
            },
        },
        message: 'Team created successfully'
    }, { status: 201 });
    }
    catch (error) {
        console.error('Create team error:', error);
        return res.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('post_volunteer_teams error:', error);
    next(error);
  }
};

exports.put_volunteer_teams = async (req, res, next) => {
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
        if (!id || id === 'undefined') return res.status(400).json({ success: false, error: 'Invalid team ID provided' });
        if (!id) {
            return res.json({ success: false, error: 'Team ID required' }, { status: 400 });
        }
        const body = req.body;
        const team = await prisma.adminVolunteerTeam.findUnique({ where: { id: id } });
        if (!team) {
            return res.json({ success: false, error: 'Team not found' }, { status: 404 });
        }
        // If lead is changing, validate new lead exists
        if (body.leadId && body.leadId !== team.leadId) {
            const newLead = await prisma.volunteer.findUnique({ where: { id: body.leadId } });
            if (!newLead) {
                return res.json({ success: false, error: 'New team lead not found' }, { status: 400 });
            }
        }
        // If members are changing, validate they exist
        if (body.memberIds && body.memberIds.length > 0) {
            const members = await prisma.volunteer.findMany({ where: { id: { in: body.memberIds } } });
            if (members.length !== body.memberIds.length) {
                return res.json({ success: false, error: 'One or more members not found' }, { status: 400 });
            }
        }
        // Ensure lead is in memberIds
        const memberIds = body.memberIds || team.memberIds;
        const leadId = body.leadId || team.leadId;
        if (!memberIds.includes(leadId)) {
            memberIds.push(leadId);
        }
        // Get old member IDs to update their teamId
        const oldMemberIds = team.memberIds || [];
        // Update team
        const updateData = {
            name: body.name,
            description: body.description,
            leadId: leadId,
            memberIds: memberIds,
            specialization: body.specialization,
            status: body.status,
        };
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });
        const updatedTeam = await prisma.adminVolunteerTeam.update({ where: { id: id }, data: updateData });
        // Update volunteers' teamId
        // Remove teamId from old members who are no longer in the team
        const removedMembers = oldMemberIds.filter((id) => !memberIds.includes(id.toString()));
        await prisma.volunteer.updateMany({ where: { id: { in: removedMembers } }, }, { $unset: { teamId: '' } });
        // Add teamId to new members
        await prisma.volunteer.updateMany({ where: { id: { in: memberIds } }, data: { teamId: id } });
    // Populate lead and members
    const leadData = await prisma.volunteer.findUnique({ where: { id: leadId } });
    const membersData = await prisma.volunteer.findMany({ where: { id: { in: memberIds } } });
    return res.json({
        success: true,
        data: {
            team: {
                ...updatedTeam,
                lead: leadData,
                members: membersData,
            },
        },
        message: 'Team updated successfully'
    });
    }
    catch (error) {
        console.error('Update team error:', error);
        return res.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('put_volunteer_teams error:', error);
    next(error);
  }
};

exports.delete_volunteer_teams = async (req, res, next) => {
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
        if (!id || id === 'undefined') return res.status(400).json({ success: false, error: 'Invalid team ID provided' });
        if (!id) {
            return res.json({ success: false, error: 'Team ID required' }, { status: 400 });
        }
        const team = await prisma.adminVolunteerTeam.findUnique({ where: { id: id } });
        if (!team) {
            return res.json({ success: false, error: 'Team not found' }, { status: 404 });
        }
        // Remove teamId from all members
        if (team.memberIds && team.memberIds.length > 0) {
            await prisma.volunteer.updateMany({ where: { id: { in: team.memberIds } }, }, { $unset: { teamId: '' } });
        }
        // Delete team
        await prisma.adminVolunteerTeam.delete({ where: { id: id } });
        return res.json({
            success: true,
            message: 'Team deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete team error:', error);
        return res.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('delete_volunteer_teams error:', error);
    next(error);
  }
};
