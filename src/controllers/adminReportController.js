const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'results-jwt-secret-key-2024';

// ─── reports ───
exports.get_reports = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        if (!tokenPayload) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        if (!true) {
            return res.status(403).json({ success: false, error: 'Permission denied' });
        }
        // req.query is already available via Express;
        const reportType = req.query['type'] || 'summary';
        const startDate = req.query['startDate'];
        const endDate = req.query['endDate'];
        let dateFilter = {};
        if (startDate && endDate) {
            dateFilter = {
                createdAt: { gte: new Date(startDate),
                    $lte: new Date(endDate),
                },
            };
        }
        let reportData = {};
        switch (reportType) {
            case 'disaster':
                const disasters = await prisma.adminDisaster.findMany({ where: dateFilter });
                reportData = {
                    title: 'Disaster Report',
                    summary: {
                        total: disasters.length,
                        active: disasters.filter((d) => d.status === 'active').length,
                        resolved: disasters.filter((d) => d.status === 'resolved').length,
                        critical: disasters.filter((d) => d.severity === 'critical').length,
                    },
                    byType: disasters.reduce((acc, d) => {
                        acc[d.type] = (acc[d.type] || 0) + 1;
                        return acc;
                    }, {}),
                    bySeverity: disasters.reduce((acc, d) => {
                        acc[d.severity] = (acc[d.severity] || 0) + 1;
                        return acc;
                    }, {}),
                    recentDisasters: disasters.slice(0, 10),
                };
                break;
            case 'volunteer':
                const volunteers = await prisma.volunteer.findMany({ where: dateFilter });
                reportData = {
                    title: 'Volunteer Report',
                    summary: {
                        total: volunteers.length,
                        available: volunteers.filter((v) => v.availability === 'available').length,
                        onMission: volunteers.filter((v) => v.availability === 'on_mission').length,
                        totalMissionsCompleted: volunteers.reduce((acc, v) => acc + (v.completedMissions || 0), 0),
                    },
                    byAvailability: volunteers.reduce((acc, v) => {
                        acc[v.availability] = (acc[v.availability] || 0) + 1;
                        return acc;
                    }, {}),
                    topVolunteers: volunteers
                        .sort((a, b) => (b.completedMissions || 0) - (a.completedMissions || 0))
                        .slice(0, 10),
                };
                break;
            case 'emergency':
                const emergencies = await prisma.adminEmergency.findMany({ where: dateFilter });
                reportData = {
                    title: 'Emergency Response Report',
                    summary: {
                        total: emergencies.length,
                        pending: emergencies.filter((e) => e.status === 'pending').length,
                        inProgress: emergencies.filter((e) => e.status === 'in_progress').length,
                        resolved: emergencies.filter((e) => e.status === 'resolved').length,
                        critical: emergencies.filter((e) => e.priority === 'critical').length,
                    },
                    byType: emergencies.reduce((acc, e) => {
                        acc[e.type] = (acc[e.type] || 0) + 1;
                        return acc;
                    }, {}),
                    byPriority: emergencies.reduce((acc, e) => {
                        acc[e.priority] = (acc[e.priority] || 0) + 1;
                        return acc;
                    }, {}),
                    recentEmergencies: emergencies.slice(0, 10),
                };
                break;
            case 'service':
                const providers = await prisma.adminServiceProvider.findMany({ where: dateFilter });
                reportData = {
                    title: 'Service Provider Report',
                    summary: {
                        total: providers.length,
                        verified: providers.filter((p) => p.verified).length,
                        emergencyAvailable: providers.filter((p) => p.isAvailableForEmergency).length,
                        avgRating: providers.length > 0
                            ? (providers.reduce((acc, p) => acc + (p.rating || 0), 0) / providers.length).toFixed(1)
                            : 0,
                    },
                    byCategory: providers.reduce((acc, p) => {
                        acc[p.category] = (acc[p.category] || 0) + 1;
                        return acc;
                    }, {}),
                    topProviders: providers
                        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                        .slice(0, 10),
                };
                break;
            default: // summary
                const [totalUsers, totalDisasters, totalEmergencies, totalVolunteers, totalProviders] = await Promise.all([
                    prisma.adminUser.count({ where: dateFilter }),
                    prisma.adminDisaster.count({ where: dateFilter }),
                    prisma.adminEmergency.count({ where: dateFilter }),
                    prisma.volunteer.count({ where: dateFilter }),
                    prisma.adminServiceProvider.count({ where: dateFilter }),
                ]);
                const activeDisasters = await prisma.adminDisaster.count({ where: { ...dateFilter, status: 'active' } });
                const pendingEmergencies = await prisma.adminEmergency.count({ where: { ...dateFilter, status: 'pending' } });
                const availableVolunteers = await prisma.volunteer.count({ where: { ...dateFilter, availability: 'available' } });
                const verifiedProviders = await prisma.adminServiceProvider.count({ where: { ...dateFilter, verified: true } });
                reportData = {
                    title: 'Summary Report',
                    overview: {
                        totalUsers,
                        totalDisasters,
                        totalEmergencies,
                        totalVolunteers,
                        totalProviders,
                        activeDisasters,
                        pendingEmergencies,
                        availableVolunteers,
                        verifiedProviders,
                    },
                    period: {
                        startDate: startDate || 'All time',
                        endDate: endDate || 'Present',
                    },
                };
        }
        return res.json({
            success: true,
            data: {
                report: reportData,
                generatedAt: new Date().toISOString(),
            },
        });
    }
    catch (error) {
        console.error('Get reports error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }

  } catch (error) {
    console.error('get_reports error:', error);
    next(error);
  }
};

exports.post_reports = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        if (!tokenPayload) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        if (!true) {
            return res.status(403).json({ success: false, error: 'Permission denied' });
        }
        const body = req.body;
        const { type, format, dateRange } = body;
        // In a real application, this would generate actual files
        // For now, we return metadata about the generated report
        const reportId = `RPT-${Date.now()}`;
        return res.json({
            success: true,
            data: {
                reportId,
                type,
                format,
                dateRange,
                status: 'ready',
                downloadUrl: `/api/reports/download?id=${reportId}`,
                generatedAt: new Date().toISOString(),
                generatedBy: tokenPayload.userId,
            },
            message: 'Report generated successfully',
        });
    }
    catch (error) {
        console.error('Generate report error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }

  } catch (error) {
    console.error('post_reports error:', error);
    next(error);
  }
};
