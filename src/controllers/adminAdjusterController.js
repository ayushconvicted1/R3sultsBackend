const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'results-jwt-secret-key-2024';

// ─── adjusters ───
exports.get_adjusters = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        if (!tokenPayload) {
            return res.json({ success: false, message: 'Not authorized. No token provided.' }, { status: 401 });
            return addCorsHeaders(response, request);
        }
        // Check permission
        if (!true) {
            return res.json({ success: false, error: 'Permission denied' }, { status: 403 });
            return addCorsHeaders(response, request);
        }
        // Get query parameters
        // req.query is already available via Express;
        const page = parseInt(req.query['page'] || '1', 10);
        const limit = parseInt(req.query['limit'] || '20', 10);
        const search = req.query['search'] || '';
        const status = req.query['status'] || '';
        const isAvailable = req.query['isAvailable'];
        const companyName = req.query['companyName'] || '';
        // Build query
        const query = {};
        if (search) {
            query.$or = [
                { adjusterId: { $regex: search, $options: 'i' } },
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { companyName: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
            ];
        }
        if (status) {
            query.status = status;
        }
        if (isAvailable !== null && isAvailable !== undefined && isAvailable !== '') {
            query.isAvailable = isAvailable === 'true';
        }
        if (companyName) {
            query.companyName = { $regex: companyName, $options: 'i' };
        }
        // Calculate skip
        const skip = (page - 1) * limit;
        // Fetch adjusters from database
        const adjusters = await prisma.adminAdjuster.findMany({ where: query, orderBy: { createdAt: 'desc' }, skip: skip, take: limit });
        const total = await prisma.adminAdjuster.count({ where: query });
        // Transform adjusters for response
        const transformedAdjusters = adjusters.map((adjuster) => ({ id: adjuster.id.toString(),
            id: adjuster.id.toString(),
            adjusterId: adjuster.adjusterId,
            photo: adjuster.photo,
            firstName: adjuster.firstName,
            lastName: adjuster.lastName,
            fullName: `${adjuster.firstName} ${adjuster.lastName}`,
            email: adjuster.email,
            phone: adjuster.phone,
            companyName: adjuster.companyName,
            address: adjuster.address,
            certifications: adjuster.certifications || [],
            documents: adjuster.documents || [],
            states: adjuster.states || [],
            specializations: adjuster.specializations || [],
            licenseNumber: adjuster.licenseNumber,
            yearsOfExperience: adjuster.yearsOfExperience,
            status: adjuster.status,
            assignedReports: adjuster.assignedReports || [],
            totalReportsHandled: adjuster.totalReportsHandled || 0,
            currentActiveReports: adjuster.currentActiveReports || 0,
            isAvailable: adjuster.isAvailable,
            availabilityNotes: adjuster.availabilityNotes,
            averageRating: adjuster.averageRating,
            totalRatings: adjuster.totalRatings || 0,
            notes: adjuster.notes,
            createdAt: adjuster.createdAt,
            updatedAt: adjuster.updatedAt,
        }));
        return res.json({
            success: true,
            data: {
                adjusters: transformedAdjusters,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            },
        });
        return addCorsHeaders(response, request);
    }
    catch (error) {
        console.error('Get adjusters error:', error);
        return res.json({
            success: false,
            error: error.message || 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        }, { status: 500 });
        return addCorsHeaders(response, request);
    }

  } catch (error) {
    console.error('get_adjusters error:', error);
    next(error);
  }
};

exports.post_adjusters = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        if (!tokenPayload) {
            return res.json({ success: false, message: 'Not authorized. No token provided.' }, { status: 401 });
            return addCorsHeaders(response, request);
        }
        // Allow admin and super_admin to create adjusters
        if (tokenPayload.role !== 'SUPER_ADMIN' && tokenPayload.role !== 'ADMIN') {
            return res.json({ success: false, error: 'Permission denied' }, { status: 403 });
            return addCorsHeaders(response, request);
        }
        const body = req.body;
        // Validate required fields
        if (!body.firstName || !body.lastName || !body.email) {
            return res.json({ success: false, error: 'First name, last name, and email are required' }, { status: 400 });
            return addCorsHeaders(response, request);
        }
        // Check if email already exists
        const existingAdjuster = await prisma.adminAdjuster.findFirst({ where: { email: body.email.toLowerCase() } });
        if (existingAdjuster) {
            return res.json({ success: false, error: 'An adjuster with this email already exists' }, { status: 400 });
            return addCorsHeaders(response, request);
        }
        // Check if adjusterId already exists (if provided)
        if (body.adjusterId) {
            const existingById = await prisma.adminAdjuster.findFirst({ where: { adjusterId: body.adjusterId.toUpperCase() } });
            if (existingById) {
                return res.json({ success: false, error: 'An adjuster with this ID already exists' }, { status: 400 });
                return addCorsHeaders(response, request);
            }
        }
        // Create new adjuster
        const adjusterData = {
            ...body,
            adjusterId: body.adjusterId?.toUpperCase(),
            email: body.email.toLowerCase(),
            certifications: body.certifications || [],
            documents: body.documents || [],
            states: body.states || [],
            specializations: body.specializations || [],
            assignedReports: [],
            totalReportsHandled: 0,
            currentActiveReports: 0,
            isAvailable: body.isAvailable !== false,
            status: body.status || 'active',
            createdBy: tokenPayload.userId,
            lastModifiedBy: tokenPayload.userId,
        };
        const adjuster = await prisma.adminAdjuster.create({ data: adjusterData });
        return res.json({
            success: true,
            data: {
                adjuster: {
                    ...adjuster, id: adjuster.id.toString(),
                    id: adjuster.id.toString(),
                    fullName: `${adjuster.firstName} ${adjuster.lastName}`,
                },
            },
            message: 'Adjuster created successfully',
        });
        return addCorsHeaders(response, request);
    }
    catch (error) {
        console.error('Create adjuster error:', error);
        return res.json({
            success: false,
            error: error.message || 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        }, { status: 500 });
        return addCorsHeaders(response, request);
    }

  } catch (error) {
    console.error('post_adjusters error:', error);
    next(error);
  }
};

// ─── adjusters/[id] ───
exports.get_adjusters__id = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        const { id } = req.params;
        if (!tokenPayload) {
            return res.json({ success: false, error: 'Unauthorized' }, { status: 401 });
            return addCorsHeaders(response, request);
        }
        // Check permission
        if (!true) {
            return res.json({ success: false, error: 'Permission denied' }, { status: 403 });
            return addCorsHeaders(response, request);
        }
        // Try to find by _id or adjusterId
        let adjuster = await prisma.adminAdjuster.findUnique({ where: { id: id } });
        if (!adjuster) {
            adjuster = await prisma.adminAdjuster.findFirst({ where: { adjusterId: id.toUpperCase() } });
        }
        if (!adjuster) {
            return res.json({ success: false, error: 'Adjuster not found' }, { status: 404 });
            return addCorsHeaders(response, request);
        }
        return res.json({
            success: true,
            data: {
                adjuster: {
                    ...adjuster, id: adjuster.id.toString(),
                    id: adjuster.id.toString(),
                    fullName: `${adjuster.firstName} ${adjuster.lastName}`,
                },
            },
        });
        return addCorsHeaders(response, request);
    }
    catch (error) {
        console.error('Get adjuster error:', error);
        return res.json({
            success: false,
            error: error.message || 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        }, { status: 500 });
        return addCorsHeaders(response, request);
    }

  } catch (error) {
    console.error('get_adjusters__id error:', error);
    next(error);
  }
};

exports.put_adjusters__id = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        const { id } = req.params;
        if (!tokenPayload) {
            return res.json({ success: false, error: 'Unauthorized' }, { status: 401 });
            return addCorsHeaders(response, request);
        }
        // Check permission
        if (tokenPayload.role !== 'SUPER_ADMIN' && tokenPayload.role !== 'ADMIN') {
            return res.json({ success: false, error: 'Permission denied' }, { status: 403 });
            return addCorsHeaders(response, request);
        }
        // Find existing adjuster
        let existingAdjuster = await prisma.adminAdjuster.findUnique({ where: { id: id } });
        if (!existingAdjuster) {
            existingAdjuster = await prisma.adminAdjuster.findFirst({ where: { adjusterId: id.toUpperCase() } });
        }
        if (!existingAdjuster) {
            return res.json({ success: false, error: 'Adjuster not found' }, { status: 404 });
            return addCorsHeaders(response, request);
        }
        const body = req.body;
        // If email is being updated, check for duplicates
        if (body.email && body.email.toLowerCase() !== existingAdjuster.email) {
            const duplicateEmail = await prisma.adminAdjuster.findFirst({ where: {
                    email: body.email.toLowerCase(), id: { not: existingAdjuster.id }
                } });
            if (duplicateEmail) {
                return res.json({ success: false, error: 'An adjuster with this email already exists' }, { status: 400 });
                return addCorsHeaders(response, request);
            }
            body.email = body.email.toLowerCase();
        }
        // If adjusterId is being updated, check for duplicates
        if (body.adjusterId && body.adjusterId.toUpperCase() !== existingAdjuster.adjusterId) {
            const duplicateId = await prisma.adminAdjuster.findFirst({ where: {
                    adjusterId: body.adjusterId.toUpperCase(), id: { not: existingAdjuster.id }
                } });
            if (duplicateId) {
                return res.json({ success: false, error: 'An adjuster with this ID already exists' }, { status: 400 });
                return addCorsHeaders(response, request);
            }
            body.adjusterId = body.adjusterId.toUpperCase();
        }
        // Update lastModifiedBy
        body.lastModifiedBy = tokenPayload.userId;
        // Update currentActiveReports if assignedReports changed
        if (body.assignedReports) {
            body.currentActiveReports = body.assignedReports.filter((r) => ['assigned', 'in_progress', 'inspected'].includes(r.status)).length;
            body.totalReportsHandled = body.assignedReports.length;
        }
        const adjuster = await prisma.adminAdjuster.update({ where: { id: existingAdjuster.id }, data: body });
        if (!adjuster) {
            return res.json({ success: false, error: 'Adjuster not found' }, { status: 404 });
            return addCorsHeaders(response, request);
        }
        return res.json({
            success: true,
            data: {
                adjuster: {
                    ...adjuster, id: adjuster.id.toString(),
                    id: adjuster.id.toString(),
                    fullName: `${adjuster.firstName} ${adjuster.lastName}`,
                },
            },
            message: 'Adjuster updated successfully',
        });
        return addCorsHeaders(response, request);
    }
    catch (error) {
        console.error('Update adjuster error:', error);
        return res.json({
            success: false,
            error: error.message || 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        }, { status: 500 });
        return addCorsHeaders(response, request);
    }

  } catch (error) {
    console.error('put_adjusters__id error:', error);
    next(error);
  }
};

exports.delete_adjusters__id = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        const { id } = req.params;
        if (!tokenPayload) {
            return res.json({ success: false, error: 'Unauthorized' }, { status: 401 });
            return addCorsHeaders(response, request);
        }
        // Only super_admin can delete adjusters
        if (tokenPayload.role !== 'SUPER_ADMIN') {
            return res.json({ success: false, error: 'Permission denied. Only super admin can delete adjusters.' }, { status: 403 });
            return addCorsHeaders(response, request);
        }
        // Try to find and delete by _id or adjusterId
        let adjuster = await prisma.adminAdjuster.delete({ where: { id: id } });
        if (!adjuster) {
            adjuster = await Adjuster.findOneAndDelete({ adjusterId: id.toUpperCase() });
        }
        if (!adjuster) {
            return res.json({ success: false, error: 'Adjuster not found' }, { status: 404 });
            return addCorsHeaders(response, request);
        }
        return res.json({
            success: true,
            message: 'Adjuster deleted successfully',
        });
        return addCorsHeaders(response, request);
    }
    catch (error) {
        console.error('Delete adjuster error:', error);
        return res.json({
            success: false,
            error: error.message || 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        }, { status: 500 });
        return addCorsHeaders(response, request);
    }

  } catch (error) {
    console.error('delete_adjusters__id error:', error);
    next(error);
  }
};

// ─── adjusters/seed ───
exports.post_adjusters_seed = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        if (!tokenPayload) {
            return res.json({ success: false, message: 'Not authorized. No token provided.' }, { status: 401 });
            return addCorsHeaders(response, request);
        }
        // Only super_admin can seed data
        if (tokenPayload.role !== 'SUPER_ADMIN') {
            return res.json({ success: false, error: 'Permission denied. Only super admin can seed data.' }, { status: 403 });
            return addCorsHeaders(response, request);
        }
        // Check if adjusters already exist
        const existingCount = await prisma.adminAdjuster.count();
        if (existingCount > 0) {
            return res.json({
                success: false,
                error: 'Adjusters already exist in the database. Clear existing data first if you want to reseed.',
                existingCount,
            }, { status: 400 });
            return addCorsHeaders(response, request);
        }
        // Insert premade adjusters
        const adjustersToInsert = premadeAdjusters.map(adj => ({
            ...adj,
            assignedReports: [],
            totalReportsHandled: 0,
            currentActiveReports: 0,
            createdBy: tokenPayload.userId,
            lastModifiedBy: tokenPayload.userId,
        }));
        const insertedAdjusters = await prisma.adminAdjuster.createMany({ data: adjustersToInsert });
        return res.json({
            success: true,
            message: `Successfully seeded ${insertedAdjusters.length} adjusters`,
            data: {
                count: insertedAdjusters.length,
                adjusters: insertedAdjusters.map(adj => ({
                    adjusterId: adj.adjusterId,
                    fullName: `${adj.firstName} ${adj.lastName}`,
                    email: adj.email,
                    companyName: adj.companyName,
                })),
            },
        });
        return addCorsHeaders(response, request);
    }
    catch (error) {
        console.error('Seed adjusters error:', error);
        return res.json({
            success: false,
            error: error.message || 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        }, { status: 500 });
        return addCorsHeaders(response, request);
    }

  } catch (error) {
    console.error('post_adjusters_seed error:', error);
    next(error);
  }
};

exports.delete_adjusters_seed = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        if (!tokenPayload) {
            return res.json({ success: false, message: 'Not authorized. No token provided.' }, { status: 401 });
            return addCorsHeaders(response, request);
        }
        // Only super_admin can clear data
        if (tokenPayload.role !== 'SUPER_ADMIN') {
            return res.json({ success: false, error: 'Permission denied. Only super admin can clear data.' }, { status: 403 });
            return addCorsHeaders(response, request);
        }
        const result = await prisma.adminAdjuster.deleteMany({ where: {} });
        return res.json({
            success: true,
            message: `Successfully deleted ${result.deletedCount} adjusters`,
            data: {
                deletedCount: result.deletedCount,
            },
        });
        return addCorsHeaders(response, request);
    }
    catch (error) {
        console.error('Clear adjusters error:', error);
        return res.json({
            success: false,
            error: error.message || 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        }, { status: 500 });
        return addCorsHeaders(response, request);
    }

  } catch (error) {
    console.error('delete_adjusters_seed error:', error);
    next(error);
  }
};
