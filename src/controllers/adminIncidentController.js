const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'results-jwt-secret-key-2024';

// ─── incidents ───
exports.get_incidents = async (req, res, next) => {
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
        if (!id || id === 'undefined') return res.status(400).json({ success: false, error: 'Invalid incident ID provided' });
        // If ID is provided, return single incident
        if (id) {
            try {
                const incidentId = id;
                const incident = await prisma.adminIncident.findUnique({ where: { id: incidentId } });
                if (!incident) {
                    return res.json({ success: false, error: 'Incident not found' }, { status: 404 });
                }
                return res.json({
                    success: true,
                    data: {
                        id: incident.id.toString(),
                        ticketNumber: incident.ticketNumber,
                        type: incident.type,
                        title: incident.title,
                        description: incident.description,
                        priority: incident.priority,
                        status: incident.status,
                        reportedBy: incident.reportedBy,
                        assignedTo: incident.assignedTo || 'Unassigned',
                        attachments: incident.attachments || [],
                        notes: incident.notes || [],
                        timeline: incident.timeline || [],
                        createdAt: incident.createdAt?.toISOString() || new Date().toISOString(),
                        updatedAt: incident.updatedAt?.toISOString() || new Date().toISOString(),
                    },
                });
            }
            catch (error) {
                return res.json({ success: false, error: 'Invalid incident ID format' }, { status: 400 });
            }
        }
        const page = parseInt(req.query['page'] || '1');
        const limit = parseInt(req.query['limit'] || '10');
        const search = req.query['search'] || '';
        const status = req.query['status'] || 'all';
        const type = req.query['type'] || 'all';
        const priority = req.query['priority'] || 'all';
        const query = {};
        if (search) {
            query.$or = [
                { ticketNumber: { $regex: search, $options: 'i' } },
                { title: { $regex: search, $options: 'i' } },
                { 'reportedBy.name': { $regex: search, $options: 'i' } },
                { 'reportedBy.email': { $regex: search, $options: 'i' } },
            ];
        }
        if (status && status !== 'all')
            query.status = status;
        if (type && type !== 'all')
            query.type = type;
        if (priority && priority !== 'all')
            query.priority = priority;
        const skip = (page - 1) * limit;
        const [incidents, total] = await Promise.all([
            prisma.adminIncident.findMany({ where: query, orderBy: { createdAt: 'desc' }, skip: skip, take: limit }),
            prisma.adminIncident.count({ where: query }),
        ]);
        return res.json({
            success: true,
            data: incidents.map(incident => ({
                id: incident.id.toString(),
                ticketNumber: incident.ticketNumber,
                type: incident.type,
                title: incident.title,
                description: incident.description,
                priority: incident.priority,
                status: incident.status,
                reportedBy: incident.reportedBy,
                assignedTo: incident.assignedTo || 'Unassigned',
                attachments: incident.attachments || [],
                notes: incident.notes || [],
                timeline: incident.timeline || [],
                createdAt: incident.createdAt?.toISOString() || new Date().toISOString(),
                updatedAt: incident.updatedAt?.toISOString() || new Date().toISOString(),
            })),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        console.error('Get incidents error:', error);
        return res.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('get_incidents error:', error);
    next(error);
  }
};

exports.post_incidents = async (req, res, next) => {
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
        // Validate required fields
        const missingFields = [];
        if (!body.type)
            missingFields.push('type');
        if (!body.title || !String(body.title).trim())
            missingFields.push('title');
        if (!body.description || !String(body.description).trim())
            missingFields.push('description');
        if (!body.reportedBy?.name || !String(body.reportedBy.name).trim())
            missingFields.push('reportedBy.name');
        if (!body.reportedBy?.email || !String(body.reportedBy.email).trim())
            missingFields.push('reportedBy.email');
        if (!body.reportedBy?.phone || !String(body.reportedBy.phone).trim())
            missingFields.push('reportedBy.phone');
        if (missingFields.length > 0) {
            return res.json({
                success: false,
                error: `Missing required fields: ${missingFields.join(', ')}`,
                missingFields
            }, { status: 400 });
        }
        // Validate email format
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(body.reportedBy.email)) {
            return res.json({ success: false, error: 'Please enter a valid email address' }, { status: 400 });
        }
        // Generate ticket number
        const year = new Date().getFullYear();
        const count = await prisma.adminIncident.count({ where: {} });
        const ticketNumber = `TKT-${year}-${String(count + 1).padStart(5, '0')}`;
        const incidentData = {
            ticketNumber,
            type: body.type,
            title: String(body.title).trim(),
            description: String(body.description).trim(),
            priority: body.priority || 'low',
            status: body.status || 'open',
            reportedBy: {
                name: String(body.reportedBy.name).trim(),
                email: String(body.reportedBy.email).trim().toLowerCase(),
                phone: String(body.reportedBy.phone).trim(),
            },
            assignedTo: body.assignedTo || 'Unassigned',
            attachments: Array.isArray(body.attachments) ? body.attachments : [],
            notes: [],
            timeline: [{
                    type: 'created',
                    title: 'Incident Created',
                    description: `Created by ${body.reportedBy.name}`,
                    createdBy: tokenPayload.name || 'System',
                    createdAt: new Date(),
                }],
        };
        let incident = await prisma.adminprisma.adminIncident.create({ data: { data: incidentData } });
        if (Array.isArray(incident)) {
            incident = incident[0];
        }
        return res.json({
            success: true,
            data: {
                id: incident.id.toString(),
                ticketNumber: incident.ticketNumber,
                type: incident.type,
                title: incident.title,
                description: incident.description,
                priority: incident.priority,
                status: incident.status,
                reportedBy: incident.reportedBy,
                assignedTo: incident.assignedTo || 'Unassigned',
                attachments: incident.attachments || [],
                notes: incident.notes || [],
                timeline: incident.timeline || [],
                createdAt: incident.createdAt?.toISOString() || new Date().toISOString(),
                updatedAt: incident.updatedAt?.toISOString() || new Date().toISOString(),
            },
        }, { status: 201 });
    }
    catch (error) {
        console.error('Create incident error:', error);
        return res.json({
            success: false,
            error: error.message || 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }

  } catch (error) {
    console.error('post_incidents error:', error);
    next(error);
  }
};

exports.put_incidents = async (req, res, next) => {
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
        if (!body.id) {
            return res.json({ success: false, error: 'Incident ID is required' }, { status: 400 });
        }
        let incidentId;
        try {
            incidentId = body.id;
        }
        catch (error) {
            return res.json({ success: false, error: 'Invalid incident ID format' }, { status: 400 });
        }
        const incident = await prisma.adminIncident.findUnique({ where: { id: incidentId } });
        if (!incident) {
            return res.json({ success: false, error: 'Incident not found' }, { status: 404 });
        }
        const updateData = {};
        const timelineUpdates = [];
        // Update basic fields
        if (body.title !== undefined)
            updateData.title = String(body.title).trim();
        if (body.description !== undefined)
            updateData.description = String(body.description).trim();
        if (body.type !== undefined)
            updateData.type = body.type;
        // Update priority with timeline
        if (body.priority !== undefined && body.priority !== incident.priority) {
            updateData.priority = body.priority;
            timelineUpdates.push({
                type: 'priority_changed',
                title: 'Priority Changed',
                description: `Changed to ${body.priority}`,
                createdBy: tokenPayload.name || 'System',
                createdAt: new Date(),
            });
        }
        // Update status with timeline
        if (body.status !== undefined && body.status !== incident.status) {
            updateData.status = body.status;
            timelineUpdates.push({
                type: 'status_updated',
                title: 'Status Updated',
                description: `Changed to ${body.status}`,
                createdBy: tokenPayload.name || 'System',
                createdAt: new Date(),
            });
        }
        // Update assigned to with timeline
        if (body.assignedTo !== undefined && body.assignedTo !== incident.assignedTo) {
            updateData.assignedTo = body.assignedTo || 'Unassigned';
            timelineUpdates.push({
                type: 'assigned',
                title: 'Assignment Updated',
                description: body.assignedTo ? `Assigned to ${body.assignedTo}` : 'Unassigned',
                createdBy: tokenPayload.name || 'System',
                createdAt: new Date(),
            });
        }
        // Update reported by info
        if (body.reportedBy !== undefined) {
            updateData.reportedBy = {
                name: body.reportedBy.name !== undefined ? String(body.reportedBy.name).trim() : incident.reportedBy.name,
                email: body.reportedBy.email !== undefined ? String(body.reportedBy.email).trim().toLowerCase() : incident.reportedBy.email,
                phone: body.reportedBy.phone !== undefined ? String(body.reportedBy.phone).trim() : incident.reportedBy.phone,
            };
        }
        if (body.attachments !== undefined) {
            updateData.attachments = Array.isArray(body.attachments) ? body.attachments : [];
        }
        // Prepare update operations
        const updateOps = {
            ...updateData,
            updatedAt: new Date(),
        };
    }
    finally // Add note if provided
     { }
    ;
    // Add note if provided
    if (body.note && String(body.note).trim()) {
        const newNote = {
            content: String(body.note).trim(),
            createdBy: tokenPayload.name || 'System',
            createdAt: new Date(),
        };
        updateOps.$push = { notes: newNote };
        timelineUpdates.push({
            type: 'note_added',
            title: 'Note Added',
            description: newNote.content,
            createdBy: newNote.createdBy,
            createdAt: new Date(),
        });
    }
    // Add timeline updates
    if (timelineUpdates.length > 0) {
        if (updateOps.$push) {
            updateOps.$push.timeline = { $each: timelineUpdates };
        }
        else {
            updateOps.$push = { timeline: { $each: timelineUpdates } };
        }
    }
    if (Object.keys(updateData).length === 0 && !updateOps.$push) {
        return res.json({ success: false, error: 'No fields to update' }, { status: 400 });
    }
    // Use collection directly for update
    const IncidentCollection = Incident.collection;
    const updateResult = await IncidentCollection.updateOne({ id: incidentId }, updateOps);
    if (updateResult.matchedCount === 0) {
        return res.json({ success: false, error: 'Incident not found' }, { status: 404 });
    }
    const updatedIncident = await prisma.adminIncident.findUnique({ where: { id: incidentId } });
    if (!updatedIncident) {
        return res.json({ success: false, error: 'Incident not found' }, { status: 404 });
    }
    return res.json({
        success: true,
        data: {
            id: updatedIncident.id.toString(),
            ticketNumber: updatedIncident.ticketNumber,
            type: updatedIncident.type,
            title: updatedIncident.title,
            description: updatedIncident.description,
            priority: updatedIncident.priority,
            status: updatedIncident.status,
            reportedBy: updatedIncident.reportedBy,
            assignedTo: updatedIncident.assignedTo || 'Unassigned',
            attachments: updatedIncident.attachments || [],
            notes: updatedIncident.notes || [],
            timeline: updatedIncident.timeline || [],
            createdAt: updatedIncident.createdAt?.toISOString() || new Date().toISOString(),
            updatedAt: updatedIncident.updatedAt?.toISOString() || new Date().toISOString(),
        },
    });

  } catch (error) {
    console.error('put_incidents error:', error);
    next(error);
  }
};

exports.delete_incidents = async (req, res, next) => {
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
        if (!id || id === 'undefined') return res.status(400).json({ success: false, error: 'Invalid incident ID provided' });
        if (!id) {
            return res.json({ success: false, error: 'Incident ID is required' }, { status: 400 });
        }
        let incidentId;
        try {
            incidentId = id;
        }
        catch (error) {
            return res.json({ success: false, error: 'Invalid incident ID format' }, { status: 400 });
        }
        const deleteResult = await prisma.adminIncident.deleteMany({ where: { id: incidentId } });
        if (deleteResult.deletedCount === 0) {
            return res.json({ success: false, error: 'Incident not found' }, { status: 404 });
        }
        return res.json({
            success: true,
            message: 'Incident deleted successfully',
        });
    }
    catch (error) {
        console.error('Delete incident error:', error);
        return res.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('delete_incidents error:', error);
    next(error);
  }
};

// ─── incidents/seed ───
exports.post_incidents_seed = async (req, res, next) => {
  try {

    try {
        // Clear existing incidents
        await prisma.adminIncident.deleteMany({ where: {} });
        // Sample incident data based on the images
        const sampleIncidents = [
            {
                ticketNumber: 'TKT-2024-01001',
                type: 'insurance_support',
                title: 'Insurance adjuster appointment',
                description: 'Detailed description for Insurance adjuster appointment. Requires immediate attention and proper handling.',
                priority: 'low',
                status: 'open',
                reportedBy: {
                    name: 'John Smith',
                    email: 'john.smith@email.com',
                    phone: '(816) 365-1136',
                },
                assignedTo: 'Unassigned',
                attachments: ['file1.pdf', 'file2.jpg'],
                notes: [
                    {
                        content: 'Initial contact made',
                        createdBy: 'System',
                        createdAt: new Date('2024-12-08'),
                    },
                    {
                        content: 'Documentation received',
                        createdBy: 'System',
                        createdAt: new Date('2024-12-08'),
                    },
                ],
                timeline: [
                    {
                        type: 'created',
                        title: 'Incident Created',
                        description: 'Created by John Smith',
                        createdBy: 'John Smith',
                        createdAt: new Date('2024-12-05'),
                    },
                    {
                        type: 'status_updated',
                        title: 'Status Updated',
                        description: 'Changed to Open',
                        createdBy: 'System',
                        createdAt: new Date('2024-12-08'),
                    },
                    {
                        type: 'note_added',
                        title: 'Note Added',
                        description: 'Initial contact made',
                        createdBy: 'System',
                        createdAt: new Date('2024-12-08'),
                    },
                    {
                        type: 'note_added',
                        title: 'Note Added',
                        description: 'Documentation received',
                        createdBy: 'System',
                        createdAt: new Date('2024-12-08'),
                    },
                ],
            },
            {
                ticketNumber: 'TKT-2024-01002',
                type: 'finance_management',
                title: 'Loan assistance needed',
                description: 'Need assistance with loan application and documentation.',
                priority: 'low',
                status: 'in_progress',
                reportedBy: {
                    name: 'Maria Garcia',
                    email: 'maria.garcia@email.com',
                    phone: '(555) 123-4567',
                },
                assignedTo: 'Patricia Taylor',
                attachments: [],
                notes: [
                    {
                        content: 'Application review in progress',
                        createdBy: 'Patricia Taylor',
                        createdAt: new Date('2024-12-15'),
                    },
                ],
                timeline: [
                    {
                        type: 'created',
                        title: 'Incident Created',
                        description: 'Created by Maria Garcia',
                        createdBy: 'Maria Garcia',
                        createdAt: new Date('2024-12-14'),
                    },
                    {
                        type: 'assigned',
                        title: 'Assignment Updated',
                        description: 'Assigned to Patricia Taylor',
                        createdBy: 'System',
                        createdAt: new Date('2024-12-14'),
                    },
                    {
                        type: 'status_updated',
                        title: 'Status Updated',
                        description: 'Changed to In Progress',
                        createdBy: 'System',
                        createdAt: new Date('2024-12-14'),
                    },
                    {
                        type: 'note_added',
                        title: 'Note Added',
                        description: 'Application review in progress',
                        createdBy: 'Patricia Taylor',
                        createdAt: new Date('2024-12-15'),
                    },
                ],
            },
            {
                ticketNumber: 'TKT-2024-01003',
                type: 'legal_assistance',
                title: 'Legal document review required',
                description: 'Need legal assistance with document review and consultation.',
                priority: 'high',
                status: 'open',
                reportedBy: {
                    name: 'Robert Johnson',
                    email: 'robert.johnson@email.com',
                    phone: '(555) 987-6543',
                },
                assignedTo: 'Unassigned',
                attachments: ['legal-doc.pdf'],
                notes: [],
                timeline: [
                    {
                        type: 'created',
                        title: 'Incident Created',
                        description: 'Created by Robert Johnson',
                        createdBy: 'Robert Johnson',
                        createdAt: new Date('2024-12-20'),
                    },
                ],
            },
            {
                ticketNumber: 'TKT-2024-01004',
                type: 'housing',
                title: 'Housing assistance request',
                description: 'Request for temporary housing assistance after disaster.',
                priority: 'critical',
                status: 'in_progress',
                reportedBy: {
                    name: 'Sarah Williams',
                    email: 'sarah.williams@email.com',
                    phone: '(555) 456-7890',
                },
                assignedTo: 'Michael Brown',
                attachments: [],
                notes: [
                    {
                        content: 'Emergency housing arranged',
                        createdBy: 'Michael Brown',
                        createdAt: new Date('2024-12-22'),
                    },
                ],
                timeline: [
                    {
                        type: 'created',
                        title: 'Incident Created',
                        description: 'Created by Sarah Williams',
                        createdBy: 'Sarah Williams',
                        createdAt: new Date('2024-12-21'),
                    },
                    {
                        type: 'assigned',
                        title: 'Assignment Updated',
                        description: 'Assigned to Michael Brown',
                        createdBy: 'System',
                        createdAt: new Date('2024-12-21'),
                    },
                    {
                        type: 'status_updated',
                        title: 'Status Updated',
                        description: 'Changed to In Progress',
                        createdBy: 'System',
                        createdAt: new Date('2024-12-21'),
                    },
                    {
                        type: 'note_added',
                        title: 'Note Added',
                        description: 'Emergency housing arranged',
                        createdBy: 'Michael Brown',
                        createdAt: new Date('2024-12-22'),
                    },
                ],
            },
            {
                ticketNumber: 'TKT-2024-01005',
                type: 'medical',
                title: 'Medical assistance needed',
                description: 'Request for medical assistance and prescription help.',
                priority: 'medium',
                status: 'resolved',
                reportedBy: {
                    name: 'David Lee',
                    email: 'david.lee@email.com',
                    phone: '(555) 321-0987',
                },
                assignedTo: 'Jennifer Davis',
                attachments: ['medical-records.pdf'],
                notes: [
                    {
                        content: 'Medical assistance provided',
                        createdBy: 'Jennifer Davis',
                        createdAt: new Date('2024-12-18'),
                    },
                ],
                timeline: [
                    {
                        type: 'created',
                        title: 'Incident Created',
                        description: 'Created by David Lee',
                        createdBy: 'David Lee',
                        createdAt: new Date('2024-12-16'),
                    },
                    {
                        type: 'assigned',
                        title: 'Assignment Updated',
                        description: 'Assigned to Jennifer Davis',
                        createdBy: 'System',
                        createdAt: new Date('2024-12-16'),
                    },
                    {
                        type: 'status_updated',
                        title: 'Status Updated',
                        description: 'Changed to In Progress',
                        createdBy: 'System',
                        createdAt: new Date('2024-12-16'),
                    },
                    {
                        type: 'note_added',
                        title: 'Note Added',
                        description: 'Medical assistance provided',
                        createdBy: 'Jennifer Davis',
                        createdAt: new Date('2024-12-18'),
                    },
                    {
                        type: 'status_updated',
                        title: 'Status Updated',
                        description: 'Changed to Resolved',
                        createdBy: 'System',
                        createdAt: new Date('2024-12-18'),
                    },
                ],
            },
        ];
        const incidents = await prisma.adminIncident.createMany({ data: sampleIncidents });
        return res.json({
            success: true,
            message: `Seeded ${incidents.length} incidents`,
            count: incidents.length,
        });
    }
    catch (error) {
        console.error('Seed incidents error:', error);
        return res.json({
            success: false,
            error: error.message || 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }

  } catch (error) {
    console.error('post_incidents_seed error:', error);
    next(error);
  }
};
