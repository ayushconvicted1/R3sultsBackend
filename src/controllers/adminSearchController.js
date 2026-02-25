const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'results-jwt-secret-key-2024';

// ─── search ───
exports.get_search = async (req, res, next) => {
  try {

    try {
        const searchParams = request.nextUrl.searchParams;
        const query = req.query['q'] || '';
        if (!query.trim()) {
            return res.json({
                success: true,
                data: { results: [] }
            });
        }
        const searchRegex = new RegExp(query, 'i');
        const results = [];
        // Search Users
        const users = await prisma.adminUser.findMany({ where: {
                $or: [
                    { name: searchRegex },
                    { email: searchRegex },
                    { phone: searchRegex }
                ]
            } });
        users.forEach(user => {
            results.push({
                id: user.id.toString(),
                type: 'user',
                title: user.name,
                subtitle: `${user.role.replace('_', ' ')} • ${user.email}`,
                link: `/dashboard/users?search=${user.name}`,
                icon: 'user'
            });
        });
        // Search Disasters
        const disasters = await prisma.adminDisaster.findMany({ where: {
                $or: [
                    { title: searchRegex },
                    { description: searchRegex },
                    { type: searchRegex },
                    { 'location.city': searchRegex },
                    { 'location.state': searchRegex }
                ]
            } });
        disasters.forEach(disaster => {
            results.push({
                id: disaster.id.toString(),
                type: 'disaster',
                title: disaster.title,
                subtitle: `${disaster.type} • ${disaster.location?.city || 'Unknown'}, ${disaster.location?.state || ''}`,
                link: `/dashboard/disasters?search=${disaster.title}`,
                icon: 'disaster'
            });
        });
        // Search Emergencies
        const emergencies = await prisma.adminEmergency.findMany({ where: {
                $or: [
                    { title: searchRegex },
                    { description: searchRegex },
                    { type: searchRegex },
                    { contactName: searchRegex },
                    { 'location.city': searchRegex }
                ]
            } });
        emergencies.forEach(emergency => {
            results.push({
                id: emergency.id.toString(),
                type: 'emergency',
                title: emergency.title,
                subtitle: `${emergency.type?.replace('_', ' ')} • ${emergency.priority} priority`,
                link: `/dashboard/emergencies?search=${emergency.title}`,
                icon: 'emergency'
            });
        });
        // Search Volunteers
        const volunteers = await prisma.adminVolunteer.findMany({ where: {
                $or: [
                    { skills: searchRegex },
                    { 'location.city': searchRegex },
                    { 'location.state': searchRegex }
                ]
            } });
        volunteers.forEach((volunteer) => {
            results.push({
                id: volunteer.id.toString(),
                type: 'volunteer',
                title: volunteer.userId?.name || 'Unknown Volunteer',
                subtitle: `${volunteer.skills?.slice(0, 2).join(', ')} • ${volunteer.availability}`,
                link: `/dashboard/volunteers?search=${volunteer.userId?.name}`,
                icon: 'volunteer'
            });
        });
        // Search Service Providers
        const providers = await prisma.adminServiceProvider.findMany({ where: {
                $or: [
                    { businessName: searchRegex },
                    { serviceType: searchRegex },
                    { category: searchRegex },
                    { description: searchRegex }
                ]
            } });
        providers.forEach((provider) => {
            results.push({
                id: provider.id.toString(),
                type: 'service',
                title: provider.businessName,
                subtitle: `${provider.category} • ${provider.serviceType}`,
                link: `/dashboard/services?search=${provider.businessName}`,
                icon: 'service'
            });
        });
        // Sort by relevance (exact matches first)
        results.sort((a, b) => {
            const aExact = a.title.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
            const bExact = b.title.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
            return bExact - aExact;
        });
        return res.json({
            success: true,
            data: {
                results: results.slice(0, 15), // Limit total results
                query,
                total: results.length
            }
        });
    }
    catch (error) {
        console.error('Search error:', error);
        return res.json({ success: false, error: 'Search failed' }, { status: 500 });
    }

  } catch (error) {
    console.error('get_search error:', error);
    next(error);
  }
};
