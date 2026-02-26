const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'results-jwt-secret-key-2024';

// ─── dashboard/stats ───
exports.get_dashboard_stats = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        if (!tokenPayload) {
            return res.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        // Get counts
        const [totalUsers, totalAdmins, totalVolunteers, availableVolunteers, totalServiceProviders, verifiedServiceProviders, activeDisasters, resolvedDisasters, criticalDisasters, pendingEmergencies, inProgressEmergencies, resolvedEmergencies,] = await Promise.all([
            prisma.adminUser.count(),
            prisma.adminUser.count({ where: { role: { in: ['super_admin', 'admin'] } } }),
            prisma.volunteer.count(),
            prisma.volunteer.count({ where: { availability: 'available' } }),
            prisma.adminServiceProvider.count(),
            prisma.adminServiceProvider.count({ where: { verified: true } }),
            prisma.adminDisaster.count({ where: { status: 'active' } }),
            prisma.adminDisaster.count({ where: { status: 'resolved' } }),
            prisma.adminDisaster.count({ where: { severity: 'critical', status: 'active' } }),
            prisma.adminEmergency.count({ where: { status: 'pending' } }),
            prisma.adminEmergency.count({ where: { status: 'in_progress' } }),
            prisma.adminEmergency.count({ where: { status: 'resolved' } }),
        ]);
        // Get total affected population from active disasters
        const activeDisastersData = await prisma.adminDisaster.findMany({
            where: { status: { in: ['active', 'monitoring'] } },
        });
        const totalAffectedPeople = activeDisastersData.reduce((sum, d) => sum + (d.affectedPopulation || 0), 0);
        // Get recent disasters
        const recentDisasters = await prisma.adminDisaster.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5,
        });
        // Get recent emergencies
        const recentEmergencies = await prisma.adminEmergency.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5,
        });
        // Calculate month-over-month changes (simplified)
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const lastMonthUsers = await prisma.adminUser.count({
            where: { createdAt: { lt: lastMonth } },
        });
        const lastMonthVolunteers = await prisma.volunteer.count({
            where: { createdAt: { lt: lastMonth } },
        });
        const userGrowth = lastMonthUsers > 0 ? ((totalUsers - lastMonthUsers) / lastMonthUsers) * 100 : 0;
        const volunteerGrowth = lastMonthVolunteers > 0 ? ((totalVolunteers - lastMonthVolunteers) / lastMonthVolunteers) * 100 : 0;
        return res.json({
            success: true,
            data: {
                overview: {
                    totalUsers,
                    totalAdmins,
                    totalVolunteers,
                    availableVolunteers,
                    totalServiceProviders,
                    verifiedServiceProviders,
                    activeDisasters,
                    resolvedDisasters,
                    criticalDisasters,
                    pendingEmergencies,
                    inProgressEmergencies,
                    resolvedEmergencies,
                    totalAffectedPeople,
                },
                growth: {
                    users: Math.round(userGrowth),
                    volunteers: Math.round(volunteerGrowth),
                },
                recentDisasters,
                recentEmergencies,
            },
        });
    }
    catch (error) {
        console.error('Dashboard stats error:', error);
        return res.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('get_dashboard_stats error:', error);
    next(error);
  }
};
