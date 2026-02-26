const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'results-jwt-secret-key-2024';

// ─── mobile/alerts ───
exports.get_mobile_alerts = async (req, res, next) => {
  try {

    try {
        // req.query is already available via Express;
        const lat = req.query['lat'];
        const lon = req.query['lon'];
        const limit = Math.min(50, Math.max(1, parseInt(req.query['limit'] || '20', 10)));
        const filterType = req.query['filter'] || '';
        const alerts = [];
        const latNum = lat ? parseFloat(lat) : 25.7617;
        const lonNum = lon ? parseFloat(lon) : -80.1918;
        try {
            const weatherUrl = (0, server_api_1.getApiUrl)(`/api/weather?type=alerts&lat=${latNum}&lon=${lonNum}`);
            const res = await (0, server_api_1.fetchWithTimeout)(weatherUrl, {}, 10000);
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                const now = Date.now() / 1000;
                data.data.forEach((a, i) => {
                    const event = a.event || 'Alert';
                    const start = a.start != null ? a.start : now - 120;
                    alerts.push({
                        alertId: `weather-${i}-${start}`,
                        type: event,
                        description: a.description || event,
                        timestamp: relativeTime(new Date(start * 1000)),
                        timestampAbsolute: new Date(start * 1000).toISOString(),
                        iconType: 'warning',
                        source: 'weather',
                    });
                });
            }
        }
        catch (e) {
            console.warn('Mobile alerts: weather fetch failed', e);
        }
        const emergencies = await prisma.adminEmergency.findMany({ where: {
                status: { in: ['pending', 'dispatched', 'in_progress'] },
                priority: { in: ['high', 'critical'] },
            } });
        const typeToTitle = {
            rescue: 'Rescue Alert',
            medical: 'Medical Assistance Alert',
            evacuation: 'Structural Collapse Warning',
            supply_delivery: 'Supply & Relief Alert',
            shelter: 'Shelter Alert',
            other: 'Emergency Alert',
        };
        emergencies.forEach((em) => {
            const title = em.title || typeToTitle[em.type] || 'Emergency Alert';
            if (filterType && title.toLowerCase().indexOf(filterType.toLowerCase()) < 0)
                return;
            alerts.push({
                alertId: `emergency-${em.id}`,
                type: title,
                description: em.description || em.title || 'Authorities report activity in your vicinity.',
                timestamp: relativeTime(em.createdAt || new Date()),
                timestampAbsolute: (em.createdAt || new Date()).toISOString?.()?.replace?.('Z', 'Z'),
                iconType: 'warning',
                source: 'emergency',
            });
        });
        alerts.sort((a, b) => {
            const tA = a.timestampAbsolute ? new Date(a.timestampAbsolute).getTime() : 0;
            const tB = b.timestampAbsolute ? new Date(b.timestampAbsolute).getTime() : 0;
            return tB - tA;
        });
        const sliced = alerts.slice(0, limit);
        return res.json({
            success: true,
            data: sliced,
            pagination: { limit, total: alerts.length },
        });
    }
    catch (error) {
        console.error('Mobile alerts error:', error);
        return res.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('get_mobile_alerts error:', error);
    next(error);
  }
};

// ─── mobile/tasks ───
exports.get_mobile_tasks = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        if (!tokenPayload || tokenPayload.role !== 'volunteer') {
            return res.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const volunteer = await prisma.volunteer.findFirst({ where: { userId: tokenPayload.userId } });
        if (!volunteer) {
            return res.json({ success: false, error: 'Volunteer not found' }, { status: 404 });
        }
        const now = new Date();
        const assignments = volunteer.assignedDisasters || [];
        const activeTasks = assignments.filter((a) => new Date(a.toDate) >= now &&
            (a.status === 'assigned' || a.status === 'active'));
        const completedTasks = assignments.filter((a) => a.status === 'completed');
        const activeTaskCount = activeTasks.length;
        const completedTaskCount = completedTasks.length;
        const responseRating = getValue(volunteer.rating, 0);
        const ratingDisplay = responseRating ? `${Number(responseRating).toFixed(1)}/5` : '0/5';
        const disasterIds = activeTasks
            .map((a) => a.disasterId)
            .filter(Boolean)
            .map((id) => (typeof id === 'string' ? id : id?.toString?.() ?? ''))
            .filter((id) => (typeof id === "string" && id.length > 0));
        const disasters = await prisma.adminDisaster.findMany({ where: { id: { in: disasterIds.map((id) => id) } } });
        const disasterMap = new Map(disasters.map((d) => [d.id.toString(), d]));
        const tasks = activeTasks.map((a) => {
            const did = typeof a.disasterId === 'object' ? a.disasterId?.toString?.() : String(a.disasterId ?? '');
            const disaster = disasterMap.get(did);
            const severity = disaster?.severity || 'high';
            const priority = severity === 'critical' ? 'Critical' : severity === 'high' ? 'High' : severity === 'medium' ? 'Medium' : 'Low';
            return {
                taskId: did,
                assignmentId: did,
                title: getValue(disaster?.title, 'Task'),
                description: getValue(disaster?.description, 'New situation reported close to your location.'),
                priority,
                status: a.status,
                thumbnailImageUrl: null,
                fromDate: a.fromDate?.toISOString?.() ?? a.fromDate,
                toDate: a.toDate?.toISOString?.() ?? a.toDate,
                assignedAt: a.assignedAt?.toISOString?.() ?? a.assignedAt,
            };
        });
        return res.json({
            success: true,
            data: {
                summary: {
                    activeTaskCount,
                    completedTaskCount,
                    responseRating: ratingDisplay,
                    responseRatingValue: responseRating,
                },
                tasks,
            },
        });
    }
    catch (error) {
        console.error('Mobile tasks GET error:', error);
        return res.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('get_mobile_tasks error:', error);
    next(error);
  }
};

// ─── mobile/tasks/[disasterId] ───
exports.get_mobile_tasks__disasterId = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        if (!tokenPayload || tokenPayload.role !== 'volunteer') {
            return res.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const { disasterId } = await context.params;
        if (!disasterId || !(typeof disasterId === "string" && disasterId.length > 0)) {
            return res.json({ success: false, error: 'Valid disasterId is required' }, { status: 400 });
        }
        const volunteer = await prisma.volunteer.findFirst({ where: { userId: tokenPayload.userId } });
        if (!volunteer) {
            return res.json({ success: false, error: 'Volunteer not found' }, { status: 404 });
        }
        const assignment = volunteer.assignedDisasters?.find((a) => String(a.disasterId) === disasterId);
        if (!assignment) {
            return res.json({ success: false, error: 'Task not found or not assigned to you' }, { status: 404 });
        }
        const disaster = await prisma.adminDisaster.findUnique({ where: { id: disasterId } });
        if (!disaster) {
            return res.json({ success: false, error: 'Task not found' }, { status: 404 });
        }
        const d = disaster;
        const severity = d.severity || 'high';
        const priority = severity === 'critical' ? 'Critical' : severity === 'high' ? 'High' : severity === 'medium' ? 'Medium' : 'Low';
        return res.json({
            success: true,
            data: {
                taskId: disasterId,
                title: getValue(d.title, 'Task'),
                description: getValue(d.description, ''),
                priority,
                status: assignment.status,
                thumbnailImageUrl: null,
                fromDate: assignment.fromDate?.toISOString?.() ?? assignment.fromDate,
                toDate: assignment.toDate?.toISOString?.() ?? assignment.toDate,
                assignedAt: assignment.assignedAt?.toISOString?.() ?? assignment.assignedAt,
                location: d.location,
                type: d.type,
                severity: d.severity,
            },
        });
    }
    catch (error) {
        console.error('Mobile task detail error:', error);
        return res.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('get_mobile_tasks__disasterId error:', error);
    next(error);
  }
};

// ─── mobile/tasks/accept ───
exports.post_mobile_tasks_accept = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        if (!tokenPayload || tokenPayload.role !== 'volunteer') {
            return res.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const body = req.body;
        const disasterId = body?.disasterId ? String(body.disasterId).trim() : '';
        if (!disasterId || !(typeof disasterId === "string" && disasterId.length > 0)) {
            return res.json({ success: false, error: 'Valid disasterId is required' }, { status: 400 });
        }
        const volunteer = await prisma.volunteer.findFirst({ where: { userId: tokenPayload.userId } });
        if (!volunteer) {
            return res.json({ success: false, error: 'Volunteer not found' }, { status: 404 });
        }
        const assignments = volunteer.assignedDisasters || [];
        const assignment = assignments.find((a) => String(a.disasterId) === disasterId);
        if (!assignment) {
            return res.json({ success: false, error: 'Task not found or not assigned to you' }, { status: 404 });
        }
        if (assignment.status === 'active') {
            return res.json({
                success: true,
                message: 'Task already accepted',
                data: { disasterId, status: 'active' },
            });
        }
        if (assignment.status === 'cancelled' || assignment.status === 'completed') {
            return res.json({ success: false, error: 'Task cannot be accepted in current state' }, { status: 400 });
        }
        assignment.status = 'active';
        await prisma.volunteer.update({
            where: { id: volunteer.id },
            data: { assignedDisasters: assignments }
        });
        return res.json({
            success: true,
            message: 'Task accepted successfully',
            data: { disasterId, status: 'active' },
        });
    }
    catch (error) {
        console.error('Mobile tasks accept error:', error);
        return res.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('post_mobile_tasks_accept error:', error);
    next(error);
  }
};

// ─── mobile/tasks/decline ───
exports.post_mobile_tasks_decline = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        if (!tokenPayload || tokenPayload.role !== 'volunteer') {
            return res.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const body = req.body;
        const disasterId = body?.disasterId ? String(body.disasterId).trim() : '';
        if (!disasterId || !(typeof disasterId === "string" && disasterId.length > 0)) {
            return res.json({ success: false, error: 'Valid disasterId is required' }, { status: 400 });
        }
        const volunteer = await prisma.volunteer.findFirst({ where: { userId: tokenPayload.userId } });
        if (!volunteer) {
            return res.json({ success: false, error: 'Volunteer not found' }, { status: 404 });
        }
        const assignments = volunteer.assignedDisasters || [];
        const assignment = assignments.find((a) => String(a.disasterId) === disasterId);
        if (!assignment) {
            return res.json({ success: false, error: 'Task not found or not assigned to you' }, { status: 404 });
        }
        if (assignment.status === 'cancelled') {
            return res.json({
                success: true,
                message: 'Task already declined',
                data: { disasterId, status: 'cancelled' },
            });
        }
        if (assignment.status === 'completed') {
            return res.json({ success: false, error: 'Completed task cannot be declined' }, { status: 400 });
        }
        assignment.status = 'cancelled';
        await prisma.volunteer.update({
            where: { id: volunteerId },
            data: { assignedDisasters: assignments }
        });
        if (disaster && disaster.assignedVolunteers?.length) {
            const avList = disaster.assignedVolunteers;
            const av = avList.find((v) => v.volunteerId?.toString() === volunteerId?.toString());
            if (av) {
                av.status = 'removed';
                await prisma.adminDisaster.update({
                    where: { id: disasterId },
                    data: { assignedVolunteers: avList }
                });
            }
        }
        return res.json({
            success: true,
            message: 'Task declined successfully',
            data: { disasterId, status: 'cancelled' },
        });
    }
    catch (error) {
        console.error('Mobile tasks decline error:', error);
        return res.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('post_mobile_tasks_decline error:', error);
    next(error);
  }
};
