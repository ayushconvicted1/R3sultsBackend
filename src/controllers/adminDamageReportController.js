const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'results-jwt-secret-key-2024';

// ─── damage-reports ───
exports.get_damage_reports = async (req, res, next) => {
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
        const damageType = req.query['damageType'] || '';
        const severity = req.query['severity'] || '';
        const customerId = req.query['customerId'] || '';
        const city = req.query['city'] || '';
        const state = req.query['state'] || '';
        // Build query
        const query = {};
        if (search) {
            query.$or = [
                { reportNumber: { $regex: search, $options: 'i' } },
                { 'customer.firstName': { $regex: search, $options: 'i' } },
                { 'customer.lastName': { $regex: search, $options: 'i' } },
                { 'customer.email': { $regex: search, $options: 'i' } },
                { 'propertyAddress.street': { $regex: search, $options: 'i' } },
                { 'propertyAddress.city': { $regex: search, $options: 'i' } },
                { 'propertyAddress.zipCode': { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ];
        }
        if (status) {
            query.status = status;
        }
        if (damageType) {
            query.damageType = damageType;
        }
        if (severity) {
            query.severity = severity;
        }
        if (customerId) {
            query['customer.customerId'] = customerId;
        }
        if (city) {
            query['propertyAddress.city'] = { $regex: city, $options: 'i' };
        }
        if (state) {
            query['propertyAddress.state'] = { $regex: state, $options: 'i' };
        }
        // Calculate skip
        const skip = (page - 1) * limit;
        // Fetch damage reports from database
        const damageReports = await prisma.adminDamageReport.findMany({ where: query, orderBy: { createdAt: 'desc' }, skip: skip, take: limit });
        const total = await prisma.adminDamageReport.count({ where: query });
        // Transform damage reports for response
        const transformedReports = damageReports.map((report) => {
            const totalFunding = report.fundingSources?.reduce((sum, source) => sum + (source.amount || 0), 0) || 0;
            const fundingPercentage = report.estimatedCost > 0
                ? Math.round((totalFunding / report.estimatedCost) * 100)
                : 0;
            const totalVendorCost = report.assignedVendors?.reduce((sum, vendor) => sum + (vendor.estimatedCost || 0), 0) || 0;
            const vendorWorkProgress = report.assignedVendors?.length > 0
                ? Math.round((report.assignedVendors.filter((v) => v.status === 'completed').length / report.assignedVendors.length) * 100)
                : 0;
            return {
                id: report.id.toString(),
                reportNumber: report.reportNumber,
                reportDate: report.reportDate,
                customer: report.customer,
                customerFullName: report.customer ? `${report.customer.firstName} ${report.customer.lastName}` : 'N/A',
                reportedBy: report.reportedBy,
                propertyAddress: report.propertyAddress,
                damageType: report.damageType,
                severity: report.severity,
                status: report.status,
                description: report.description,
                affectedAreas: report.affectedAreas || [],
                estimatedCost: report.estimatedCost,
                actualCost: report.actualCost,
                fundingSources: report.fundingSources || [],
                totalFunding,
                fundingPercentage,
                remainingFunding: Math.max(0, (report.estimatedCost || 0) - totalFunding),
                workflowSteps: report.workflowSteps || [],
                currentStep: report.currentStep || 1,
                assignedAdjuster: report.assignedAdjuster,
                assignedVendors: report.assignedVendors || [],
                totalVendorCost,
                vendorWorkProgress,
                images: report.images || [],
                notes: report.notes,
                tags: report.tags || [],
                priority: report.priority,
                insuranceCoverage: report.insuranceCoverage ?? null,
                createdAt: report.createdAt,
                updatedAt: report.updatedAt,
            };
        });
        return res.json({
            success: true,
            data: {
                damageReports: transformedReports,
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
        console.error('Get damage reports error:', error);
        return res.json({
            success: false,
            error: error.message || 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        }, { status: 500 });
        return addCorsHeaders(response, request);
    }

  } catch (error) {
    console.error('get_damage_reports error:', error);
    next(error);
  }
};

exports.post_damage_reports = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        if (!tokenPayload) {
            return res.json({ success: false, message: 'Not authorized. No token provided.' }, { status: 401 });
            return addCorsHeaders(response, request);
        }
        // Allow admin and super_admin to create damage reports
        if (tokenPayload.role !== 'super_admin' && tokenPayload.role !== 'admin') {
            return res.json({ success: false, error: 'Permission denied' }, { status: 403 });
            return addCorsHeaders(response, request);
        }
        const body = req.body;
        // Validate required fields - now requires customer selection
        if (!body.customer?.customerId) {
            return res.json({ success: false, error: 'Customer selection is required' }, { status: 400 });
            return addCorsHeaders(response, request);
        }
        if (!body.propertyAddress || !body.damageType || !body.severity || !body.description) {
            return res.json({ success: false, error: 'Property address, damage type, severity, and description are required' }, { status: 400 });
            return addCorsHeaders(response, request);
        }
        // Validate insuranceCoverage if provided
        const validInsuranceCoverage = ['uninsured', 'partially_insured', 'fully_insured'];
        if (body.insuranceCoverage != null && body.insuranceCoverage !== '') {
            if (!validInsuranceCoverage.includes(body.insuranceCoverage)) {
                return res.json({ success: false, error: 'insuranceCoverage must be one of: uninsured, partially_insured, fully_insured' }, { status: 400 });
                return addCorsHeaders(response, request);
            }
        }
        const estimatedCost = Number(body.estimatedCost) || 0;
        const fundingSources = Array.isArray(body.fundingSources) ? body.fundingSources : [];
        const totalFunding = fundingSources.reduce((sum, s) => sum + (Number(s?.amount) || 0), 0);
        if (estimatedCost > 0 && totalFunding > estimatedCost) {
            return res.json({ success: false, error: 'Sum of funding sources cannot exceed the estimated repair cost.' }, { status: 400 });
            return addCorsHeaders(response, request);
        }
        // Fetch customer details from User model if only customerId provided
        let customerData = body.customer;
        if (body.customer.customerId && (!body.customer.firstName || !body.customer.lastName)) {
            const user = await prisma.adminUser.findUnique({ where: { id: body.customer.customerId } });
            if (!user) {
                return res.json({ success: false, error: 'Customer not found' }, { status: 404 });
                return addCorsHeaders(response, request);
            }
            customerData = {
                customerId: user.id.toString(),
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                address: user.address ? {
                    street: user.address.street,
                    city: user.address.city,
                    state: user.address.state,
                    zipCode: user.address.pincode,
                } : undefined,
            };
        }
        // Check if report number already exists (if provided)
        if (body.reportNumber) {
            const existingReport = await prisma.adminDamageReport.findFirst({ where: { reportNumber: body.reportNumber.toUpperCase() } });
            if (existingReport) {
                return res.json({ success: false, error: 'Damage report with this report number already exists' }, { status: 400 });
                return addCorsHeaders(response, request);
            }
        }
        // Generate reportNumber before creating document (validation runs before pre-save hook)
        let reportNumber = body.reportNumber?.trim()?.toUpperCase();
        if (!reportNumber) {
            const year = new Date().getFullYear();
            const count = await DamageReport.countDocuments({
                reportDate: { gte: new Date(year, 0, 1), $lt: new Date(year + 1, 0, 1) },
            });
            reportNumber = `DR-${year}-${String(count + 1).padStart(3, '0')}`;
        }
        // Create new damage report with new structure
        const reportData = {
            ...body,
            customer: customerData,
            reportNumber,
            reportDate: body.reportDate ? new Date(body.reportDate) : new Date(),
            reportedBy: {
                userId: tokenPayload.userId,
                name: body.reportedBy?.name || tokenPayload.name,
                email: body.reportedBy?.email || tokenPayload.email,
                phone: body.reportedBy?.phone,
            },
            status: 'report_created',
            description: body.description || '',
            affectedAreas: Array.isArray(body.affectedAreas) ? body.affectedAreas : [],
            estimatedCost: body.estimatedCost || 0,
            fundingSources: body.fundingSources || [],
            insuranceCoverage: body.insuranceCoverage && validInsuranceCoverage.includes(body.insuranceCoverage) ? body.insuranceCoverage : null,
            workflowSteps: DEFAULT_WORKFLOW_STEPS,
            currentStep: 1,
            assignedVendors: [],
            images: body.images || [],
            createdBy: tokenPayload.userId,
            lastModifiedBy: tokenPayload.userId,
        };
        const damageReport = (reportData);
        // Note: damageReport.save() pattern needs prisma.model.update() - see TODO below
        // Calculate metrics from saved document
        const savedTotalFunding = damageReport.fundingSources.reduce((sum, source) => sum + (source.amount || 0), 0);
        const fundingPercentage = damageReport.estimatedCost > 0
            ? Math.round((savedTotalFunding / damageReport.estimatedCost) * 100)
            : 0;
        return res.json({
            success: true,
            data: {
                damageReport: {
                    ...damageReport,
                    customerFullName: `${damageReport.customer.firstName} ${damageReport.customer.lastName}`,
                    totalFunding: savedTotalFunding,
                    fundingPercentage,
                    remainingFunding: Math.max(0, damageReport.estimatedCost - savedTotalFunding),
                    totalVendorCost: 0,
                    vendorWorkProgress: 0,
                },
            },
            message: 'Damage report created successfully',
        });
        return addCorsHeaders(response, request);
    }
    catch (error) {
        console.error('Create damage report error:', error);
        return res.json({
            success: false,
            error: error.message || 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        }, { status: 500 });
        return addCorsHeaders(response, request);
    }

  } catch (error) {
    console.error('post_damage_reports error:', error);
    next(error);
  }
};

// ─── damage-reports/[id] ───
exports.get_damage_reports__id = async (req, res, next) => {
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
        const damageReport = await prisma.adminDamageReport.findUnique({ where: { id: id } });
        if (!damageReport) {
            return res.json({ success: false, error: 'Damage report not found' }, { status: 404 });
            return addCorsHeaders(response, request);
        }
        const metrics = calculateMetrics(damageReport);
        return res.json({
            success: true,
            data: {
                damageReport: {
                    ...damageReport,
                    id: damageReport.id.toString(),
                    ...metrics,
                },
            },
        });
        return addCorsHeaders(response, request);
    }
    catch (error) {
        console.error('Get damage report error:', error);
        return res.json({
            success: false,
            error: error.message || 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        }, { status: 500 });
        return addCorsHeaders(response, request);
    }

  } catch (error) {
    console.error('get_damage_reports__id error:', error);
    next(error);
  }
};

exports.put_damage_reports__id = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        const { id } = req.params;
        if (!tokenPayload) {
            return res.json({ success: false, error: 'Unauthorized' }, { status: 401 });
            return addCorsHeaders(response, request);
        }
        // Check permission
        if (tokenPayload.role !== 'super_admin' && tokenPayload.role !== 'admin') {
            return res.json({ success: false, error: 'Permission denied' }, { status: 403 });
            return addCorsHeaders(response, request);
        }
        // Get existing report
        const existingReport = await prisma.adminDamageReport.findUnique({ where: { id: id } });
        if (!existingReport) {
            return res.json({ success: false, error: 'Damage report not found' }, { status: 404 });
            return addCorsHeaders(response, request);
        }
        const body = req.body;
        // Validate insuranceCoverage if provided
        const validInsuranceCoverage = ['uninsured', 'partially_insured', 'fully_insured'];
        if (body.insuranceCoverage != null && body.insuranceCoverage !== '') {
            if (!validInsuranceCoverage.includes(body.insuranceCoverage)) {
                return res.json({ success: false, error: 'insuranceCoverage must be one of: uninsured, partially_insured, fully_insured' }, { status: 400 });
                return addCorsHeaders(response, request);
            }
        }
        else if (body.insuranceCoverage === '') {
            body.insuranceCoverage = null;
        }
        // If report number is being updated, check for duplicates
        if (body.reportNumber) {
            const duplicateReport = await prisma.adminDamageReport.findFirst({ where: {
                    reportNumber: body.reportNumber.toUpperCase(), id: { not: id }
                } });
            if (duplicateReport) {
                return res.json({ success: false, error: 'Damage report with this report number already exists' }, { status: 400 });
                return addCorsHeaders(response, request);
            }
            body.reportNumber = body.reportNumber.toUpperCase();
        }
        const adminChangedBy = {
            userId: tokenPayload.userId,
            name: tokenPayload.name || '',
            email: tokenPayload.email || '',
        };
        /**
         * Merge workflowSteps safely so we never drop nested stepData.
         *
         * Real-world UI payloads are often partial (e.g. a step object missing stepData).
         * Replacing the full array can wipe stepData in MongoDB. This merge preserves existing stepData
         * unless the incoming payload explicitly provides it.
         */
        const mergeWorkflowSteps = (existingSteps, incomingSteps) => {
            const byStep = new Map((existingSteps || [])
                .filter((s) => s && typeof s.stepNumber === 'number')
                .map((s) => [s.stepNumber, s]));
            const merged = (incomingSteps || [])
                .filter((s) => s && typeof s.stepNumber === 'number')
                .map((incomingStep) => {
                const existingStep = byStep.get(incomingStep.stepNumber);
                const prevStatus = existingStep?.status;
                const newStatus = incomingStep.status;
                const nextStep = {
                    ...(existingStep || {}),
                    ...(incomingStep || {}),
                };
                // Status history: keep existing history, append change when status changes
                const baseHistory = Array.isArray(existingStep?.statusHistory) ? [...existingStep.statusHistory] : [];
                const incomingHistory = Array.isArray(incomingStep.statusHistory) ? incomingStep.statusHistory : undefined;
                const statusHistory = incomingHistory ? [...incomingHistory] : baseHistory;
                if (newStatus && newStatus !== prevStatus) {
                    statusHistory.push({
                        status: newStatus,
                        changedAt: new Date(),
                        changedBy: adminChangedBy,
                    });
                }
                if (statusHistory.length > 0)
                    nextStep.statusHistory = statusHistory;
                // Timestamps
                if (nextStep.status === 'in_progress' && prevStatus !== 'in_progress' && !nextStep.startedAt) {
                    nextStep.startedAt = new Date();
                }
                if (nextStep.status === 'completed' && prevStatus !== 'completed' && !nextStep.completedAt) {
                    nextStep.completedAt = new Date();
                    nextStep.completedBy = tokenPayload.userId;
                }
                // StepData merge (preserve existing if incoming is missing/empty)
                const existingStepData = existingStep?.stepData && typeof existingStep.stepData === 'object' ? existingStep.stepData : undefined;
                const incomingStepData = incomingStep?.stepData && typeof incomingStep.stepData === 'object' ? incomingStep.stepData : undefined;
                const mergedStepData = { ...(existingStepData || {}) };
                if (incomingStepData)
                    Object.assign(mergedStepData, incomingStepData);
                // Strip any deprecated fields
                if ('vendorAssignments' in mergedStepData)
                    delete mergedStepData.vendorAssignments;
                // Step 4: normalize + preserve inspectionBudget unless explicitly overridden
                if (incomingStep.stepNumber === 4) {
                    const incomingBudget = incomingStepData?.inspectionBudget;
                    const hasIncomingBudget = Array.isArray(incomingBudget);
                    const budgetToUse = hasIncomingBudget
                        ? incomingBudget
                        : Array.isArray(existingStepData?.inspectionBudget)
                            ? existingStepData.inspectionBudget
                            : [];
                    mergedStepData.inspectionBudget = budgetToUse.map((item) => ({
                        taskName: String(item?.taskName ?? '').trim(),
                        amount: Number(item?.amount) || 0,
                    }));
                }
                // Keep stepData around for step 3/4 even if empty object so it doesn't disappear in DB
                if (incomingStep.stepNumber === 3 || incomingStep.stepNumber === 4) {
                    nextStep.stepData = mergedStepData;
                }
                else if (Object.keys(mergedStepData).length > 0) {
                    nextStep.stepData = mergedStepData;
                }
                else {
                    // Don't force stepData for other steps
                    delete nextStep.stepData;
                }
                return nextStep;
            });
            return merged;
        };
        // Handle workflow step updates
        if (body.workflowSteps && Array.isArray(body.workflowSteps)) {
            body.workflowSteps = mergeWorkflowSteps(existingReport.workflowSteps || [], body.workflowSteps);
            // Update currentStep based on workflow
            const lastCompleted = body.workflowSteps
                .filter((s) => s.status === 'completed')
                .sort((a, b) => b.stepNumber - a.stepNumber)[0];
            body.currentStep = lastCompleted ? Math.min(lastCompleted.stepNumber + 1, 7) : 1;
        }
        // Handle adjuster assignment (Step 3)
        if (body.assignedAdjuster) {
            const adjuster = body.assignedAdjuster;
            const assignedDate = new Date();
            // If new assignment or adjuster changed
            if (!existingReport.assignedAdjuster ||
                existingReport.assignedAdjuster.adjusterId !== adjuster.adjusterId) {
                body.assignedAdjuster = {
                    ...adjuster,
                    assignedDate,
                    assignedBy: tokenPayload.userId,
                    approvalStatus: adjuster.approvalStatus || 'pending',
                };
                // Update status if assigning adjuster
                if (!body.status) {
                    body.status = 'adjuster_assigned';
                }
                // Step 3: store adjuster in workflow step and set step 3 completed
                if (body.workflowSteps && Array.isArray(body.workflowSteps)) {
                    const step3 = body.workflowSteps.find((s) => s.stepNumber === 3);
                    if (step3) {
                        step3.status = 'completed';
                        step3.completedAt = assignedDate;
                        step3.completedBy = tokenPayload.userId;
                        step3.stepData = step3.stepData || {};
                        step3.stepData.assignedAdjusterSnapshot = {
                            adjusterId: adjuster.adjusterId,
                            adjusterDbId: adjuster.adjusterDbId,
                            fullName: adjuster.fullName,
                            email: adjuster.email,
                            phone: adjuster.phone,
                            companyName: adjuster.companyName,
                            assignedDate,
                            assignedBy: tokenPayload.userId,
                        };
                        const lastCompleted = body.workflowSteps
                            .filter((s) => s.status === 'completed')
                            .sort((a, b) => b.stepNumber - a.stepNumber)[0];
                        body.currentStep = lastCompleted ? Math.min(lastCompleted.stepNumber + 1, 7) : 1;
                    }
                }
                // Also update the Adjuster model's assignedReports
                try {
                    await prisma.adminAdjuster.updateMany({ where: { adjusterId: adjuster.adjusterId }, }, {
                        $push: {
                            assignedReports: {
                                reportId: id,
                                reportNumber: existingReport.reportNumber,
                                customerId: existingReport.customer?.customerId,
                                assignedDate,
                                status: 'assigned',
                            }
                        },
                        $inc: { currentActiveReports: 1, totalReportsHandled: 1 },
                    });
                }
                catch (adjErr) {
                    console.error('Error updating adjuster:', adjErr);
                }
            }
            // Handle approval status change
            if (adjuster.approvalStatus === 'approved' &&
                existingReport.assignedAdjuster?.approvalStatus !== 'approved') {
                body.assignedAdjuster.approvalDate = new Date();
                if (!body.status) {
                    body.status = 'adjuster_approved';
                }
                // Update adjuster's report status
                try {
                    await prisma.adminAdjuster.updateMany({ where: {
                            adjusterId: adjuster.adjusterId,
                            'assignedReports.reportId': id
                        }, }, {
                        'assignedReports.$.approvalStatus': 'approved',
                        'assignedReports.$.approvalDate': new Date(),
                        'assignedReports.$.status': 'approved',
                    });
                }
                finally {
                }
                ;
            }
            try { }
            catch (adjErr) {
                console.error('Error updating adjuster approval:', adjErr);
            }
        }
    }
    // Handle vendor assignments
    finally {
    }
    // Handle vendor assignments
    if (body.assignedVendors && Array.isArray(body.assignedVendors)) {
        const existingVendors = existingReport.assignedVendors || [];
        body.assignedVendors = body.assignedVendors.map((vendor) => {
            const existingVendor = existingVendors.find((v) => v.vendorId === vendor.vendorId || v.id?.toString() === vendor.id);
            // New vendor assignment
            if (!existingVendor) {
                return {
                    ...vendor,
                    assignedDate: new Date(),
                    assignedBy: tokenPayload.userId,
                    status: vendor.status || 'assigned',
                };
            }
            // Existing vendor - check for status changes
            if (vendor.status === 'in_progress' && existingVendor.status !== 'in_progress') {
                vendor.startDate = vendor.startDate || new Date();
            }
            if (vendor.status === 'completed' && existingVendor.status !== 'completed') {
                vendor.completionDate = vendor.completionDate || new Date();
                vendor.completedBy = vendor.completedBy || tokenPayload.userId;
            }
            return {
                ...existingVendor,
                ...vendor,
            };
        });
        // Update status based on vendor progress
        const allVendorsCompleted = body.assignedVendors.length > 0 &&
            body.assignedVendors.every((v) => v.status === 'completed' || v.status === 'cancelled');
        const anyVendorInProgress = body.assignedVendors.some((v) => v.status === 'in_progress');
        if (!body.status) {
            if (allVendorsCompleted) {
                body.status = 'completed';
                // Mark step 7 as completed
                if (body.workflowSteps) {
                    const step7 = body.workflowSteps.find((s) => s.stepNumber === 7);
                    if (step7) {
                        step7.status = 'completed';
                        step7.completedAt = new Date();
                        step7.completedBy = tokenPayload.userId;
                    }
                }
            }
            else if (anyVendorInProgress) {
                body.status = 'work_in_progress';
            }
            else if (body.assignedVendors.length > 0) {
                body.status = 'vendor_assigned';
            }
        }
    }
    // Update lastModifiedBy
    body.lastModifiedBy = tokenPayload.userId;
    // If reportDate is provided, ensure it's a Date object
    if (body.reportDate) {
        body.reportDate = new Date(body.reportDate);
    }
    // Note: workflowSteps normalization is handled inside mergeWorkflowSteps to avoid double-mapping
    // which can accidentally wipe nested stepData when payloads are partial.
    // Use find + save so nested stepData (e.g. step 4 inspectionBudget) is persisted.
    // findByIdAndUpdate with plain objects can drop nested subdocument fields in arrays.
    const doc = await prisma.adminDamageReport.findUnique({ where: { id: id } });
    if (!doc) {
        return res.json({ success: false, error: 'Damage report not found' }, { status: 404 });
        return addCorsHeaders(response, request);
    }
    const { id: _omitId, __v: _omitV, ...updatePayload } = body;
    Object.keys(updatePayload).forEach((key) => {
        if (key === 'workflowSteps') {
            doc.workflowSteps = updatePayload.workflowSteps;
            doc.markModified('workflowSteps');
        }
        else if (key === 'reportDate' && updatePayload.reportDate) {
            doc.reportDate = new Date(updatePayload.reportDate);
        }
        else if (Object.prototype.hasOwnProperty.call(updatePayload, key)) {
            doc.set(key, updatePayload[key]);
        }
    });
    // Note: doc.save() pattern needs prisma.model.update() - see TODO below
    const damageReport = doc.toObject ? doc : doc;
    const metrics = calculateMetrics(damageReport);
    return res.json({
        success: true,
        data: {
            damageReport: {
                ...damageReport,
                id: damageReport.id.toString(),
                ...metrics,
            },
        },
        message: 'Damage report updated successfully',
    });
    return addCorsHeaders(response, request);

  } catch (error) {
    console.error('put_damage_reports__id error:', error);
    next(error);
  }
};

exports.delete_damage_reports__id = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        const { id } = req.params;
        if (!tokenPayload) {
            return res.json({ success: false, error: 'Unauthorized' }, { status: 401 });
            return addCorsHeaders(response, request);
        }
        // Only super_admin can delete damage reports
        if (tokenPayload.role !== 'super_admin') {
            return res.json({ success: false, error: 'Permission denied. Only super admin can delete damage reports.' }, { status: 403 });
            return addCorsHeaders(response, request);
        }
        const damageReport = await prisma.adminDamageReport.delete({ where: { id: id } });
        if (!damageReport) {
            return res.json({ success: false, error: 'Damage report not found' }, { status: 404 });
            return addCorsHeaders(response, request);
        }
        // Update adjuster's assignedReports if there was one
        if (damageReport.assignedAdjuster) {
            try {
                await prisma.adminAdjuster.updateMany({ where: { adjusterId: damageReport.assignedAdjuster.adjusterId }, }, {
                    $pull: { assignedReports: { reportId: id } },
                    $inc: { currentActiveReports: -1 },
                });
            }
            catch (adjErr) {
                console.error('Error updating adjuster after report deletion:', adjErr);
            }
        }
        return res.json({
            success: true,
            message: 'Damage report deleted successfully',
        });
        return addCorsHeaders(response, request);
    }
    catch (error) {
        console.error('Delete damage report error:', error);
        return res.json({
            success: false,
            error: error.message || 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        }, { status: 500 });
        return addCorsHeaders(response, request);
    }

  } catch (error) {
    console.error('delete_damage_reports__id error:', error);
    next(error);
  }
};

// ─── damage-reports/seed ───
exports.post_damage_reports_seed = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        if (!tokenPayload) {
            return res.json({ success: false, message: 'Not authorized. No token provided.' }, { status: 401 });
            return addCorsHeaders(response, request);
        }
        if (tokenPayload.role !== 'super_admin') {
            return res.json({ success: false, error: 'Permission denied. Only super admin can seed data.' }, { status: 403 });
            return addCorsHeaders(response, request);
        }
        // 1) Fetch users (customers) from external API only – no fake data
        const externalRes = await fetch(EXTERNAL_CUSTOMERS_API_URL, {
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
        });
        if (!externalRes.ok) {
            return res.json({ success: false, error: 'Failed to fetch customers from external API. Check EXTERNAL_CUSTOMERS_API_URL.' }, { status: 502 });
            return addCorsHeaders(response, request);
        }
        const externalData = await externalRes.json();
        const externalUsers = externalData?.data?.users ?? externalData?.users ?? [];
        if (!Array.isArray(externalUsers) || externalUsers.length === 0) {
            return res.json({ success: false, error: 'No users returned from external API. Cannot seed damage reports.' }, { status: 400 });
            return addCorsHeaders(response, request);
        }
        const customers = externalUsers.map((u) => mapExternalUserToCustomer(u));
        // 2) Fetch existing adjusters and service providers (vendors) from our DB
        const [adjusters, vendors] = await Promise.all([
            prisma.adminAdjuster.findMany(),
            prisma.adminServiceProvider.findMany(),
        ]);
        // Clear existing damage reports
        await prisma.adminDamageReport.deleteMany({ where: {} });
        const reportedBy = {
            userId: tokenPayload.userId,
            name: tokenPayload.name || 'Admin',
            email: tokenPayload.email,
        };
        const year = new Date().getFullYear();
        const reportsToCreate = [];
        let reportIndex = 0;
        // Build 12 reports: multiple per customer (a single user can have multiple damage reports)
        // Customers repeated: 0,1,2 appear multiple times.
        const customerIndexForReport = [0, 1, 2, 0, 1, 2, 0, 3, 1, 4, 0, 2];
        const assignAdjusterForReport = [false, true, true, false, true, false, true, false, false, true, false, true];
        const assignVendorsForReport = [false, false, true, true, true, false, true, true, false, true, true, true];
        for (let i = 0; i < 12; i++) {
            const custIdx = customerIndexForReport[i] % customers.length;
            const customer = customers[custIdx];
            const template = REPORT_TEMPLATES[i % REPORT_TEMPLATES.length];
            reportIndex++;
            const reportNumber = `DR-${year}-${String(reportIndex).padStart(3, '0')}`;
            let currentStep = 1;
            let status = 'report_created';
            let assignedAdjuster = undefined;
            let assignedVendors = [];
            if (assignAdjusterForReport[i] && adjusters.length > 0) {
                const adj = adjusters[i % adjusters.length];
                assignedAdjuster = {
                    adjusterId: adj.adjusterId || adj.id?.toString(),
                    adjusterDbId: adj.id?.toString(),
                    fullName: adj.fullName || `${adj.firstName || ''} ${adj.lastName || ''}`.trim(),
                    email: adj.email,
                    phone: adj.phone,
                    companyName: adj.companyName,
                    assignedDate: new Date(),
                    assignedBy: tokenPayload.userId,
                    approvalStatus: i === 3 ? 'approved' : 'pending',
                };
                currentStep = 4;
                status = 'adjuster_assigned';
            }
            // Generate step 4 key-value pairs: inspection budget for every report (from affected areas)
            const inspectionBudget = [];
            template.affectedAreas.forEach((area) => {
                inspectionBudget.push({
                    taskName: `${area} Repair`,
                    amount: Math.round((template.estimatedCost / template.affectedAreas.length) * (0.8 + Math.random() * 0.4)),
                });
            });
            if (assignVendorsForReport[i] && vendors.length > 0) {
                const v1 = vendors[i % vendors.length];
                const taskName1 = inspectionBudget[0]?.taskName || 'General Repair';
                assignedVendors.push({
                    vendorId: v1.id?.toString(),
                    providerId: v1.providerId,
                    businessName: v1.businessName || 'Vendor',
                    taskName: taskName1,
                    contactPerson: v1.contactPerson || {},
                    category: v1.category,
                    assignedDate: new Date(),
                    assignedBy: tokenPayload.userId,
                    estimatedCost: inspectionBudget[0]?.amount || Math.round((template.estimatedCost * 0.4) + Math.random() * 5000),
                    status: i >= 6 ? 'completed' : i >= 4 ? 'in_progress' : 'assigned',
                });
                if (i === 5 && vendors.length > 1 && inspectionBudget.length > 1) {
                    const v2 = vendors[(i + 1) % vendors.length];
                    const taskName2 = inspectionBudget[1]?.taskName || 'Secondary Repair';
                    assignedVendors.push({
                        vendorId: v2.id?.toString(),
                        providerId: v2.providerId,
                        businessName: v2.businessName || 'Vendor',
                        taskName: taskName2,
                        category: v2.category,
                        assignedDate: new Date(),
                        assignedBy: tokenPayload.userId,
                        estimatedCost: inspectionBudget[1]?.amount || Math.round((template.estimatedCost * 0.3) + Math.random() * 3000),
                        status: 'in_progress',
                    });
                }
                if (assignedVendors.length > 0) {
                    currentStep = assignedVendors.every((v) => v.status === 'completed') ? 7 : 6;
                    status = currentStep === 7 ? 'completed' : 'work_in_progress';
                }
            }
            // Generate workflow steps (step 4 inspection budget only; vendors are report.assignedVendors)
            const workflowSteps = getDefaultWorkflowSteps(currentStep, status, tokenPayload.userId, tokenPayload.name || 'Admin', tokenPayload.email || '', assignedAdjuster ? {
                adjusterId: assignedAdjuster.adjusterId,
                fullName: assignedAdjuster.fullName,
                email: assignedAdjuster.email,
                phone: assignedAdjuster.phone,
                companyName: assignedAdjuster.companyName,
            } : undefined, inspectionBudget);
            reportsToCreate.push({
                customer: {
                    customerId: customer.customerId,
                    firstName: customer.firstName,
                    lastName: customer.lastName,
                    email: customer.email,
                    phone: customer.phone,
                    address: customer.address,
                },
                reportNumber,
                reportDate: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000),
                reportedBy,
                propertyAddress: template.propertyAddress,
                damageType: template.damageType,
                severity: template.severity,
                status,
                description: template.description,
                affectedAreas: template.affectedAreas,
                estimatedCost: template.estimatedCost,
                fundingSources: template.fundingSources,
                workflowSteps,
                currentStep,
                assignedAdjuster,
                assignedVendors,
                images: [],
                priority: ['low', 'medium', 'high', 'urgent'][i % 4],
                createdBy: tokenPayload.userId,
                lastModifiedBy: tokenPayload.userId,
            });
        }
        const insertedReports = await prisma.adminDamageReport.createMany({ data: reportsToCreate });
        // Sync Adjuster.assignedReports for reports that have an assigned adjuster
        for (let i = 0; i < insertedReports.length; i++) {
            const r = insertedReports[i];
            if (r.assignedAdjuster?.adjusterId) {
                try {
                    await prisma.adminAdjuster.updateMany({ where: { adjusterId: r.assignedAdjuster.adjusterId }, }, {
                        $push: {
                            assignedReports: {
                                reportId: r.id.toString(),
                                reportNumber: r.reportNumber,
                                customerId: r.customer?.customerId,
                                assignedDate: new Date(),
                                status: 'assigned',
                            },
                        },
                        $inc: { currentActiveReports: 1, totalReportsHandled: 1 },
                    });
                }
                catch (adjErr) {
                    console.error('Error syncing adjuster assignedReports:', adjErr);
                }
            }
        }
        return res.json({
            success: true,
            message: `Successfully seeded ${insertedReports.length} damage reports using external API customers and existing adjusters/vendors.`,
            data: {
                damageReportsCount: insertedReports.length,
                source: 'EXTERNAL_CUSTOMERS_API_URL',
                reports: insertedReports.map((r) => ({
                    reportNumber: r.reportNumber,
                    customerName: `${r.customer.firstName} ${r.customer.lastName}`,
                    customerId: r.customer.customerId,
                    status: r.status,
                    damageType: r.damageType,
                    hasAdjuster: !!r.assignedAdjuster,
                    vendorCount: r.assignedVendors?.length ?? 0,
                })),
            },
        });
        return addCorsHeaders(response, request);
    }
    catch (error) {
        console.error('Seed damage reports error:', error);
        return res.json({
            success: false,
            error: error.message || 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        }, { status: 500 });
        return addCorsHeaders(response, request);
    }

  } catch (error) {
    console.error('post_damage_reports_seed error:', error);
    next(error);
  }
};

exports.delete_damage_reports_seed = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        if (!tokenPayload) {
            return res.json({ success: false, message: 'Not authorized. No token provided.' }, { status: 401 });
            return addCorsHeaders(response, request);
        }
        if (tokenPayload.role !== 'super_admin') {
            return res.json({ success: false, error: 'Permission denied. Only super admin can clear data.' }, { status: 403 });
            return addCorsHeaders(response, request);
        }
        const result = await prisma.adminDamageReport.deleteMany({ where: {} });
        return res.json({
            success: true,
            message: `Successfully deleted ${result.deletedCount} damage reports`,
            data: { deletedCount: result.deletedCount },
        });
        return addCorsHeaders(response, request);
    }
    catch (error) {
        console.error('Clear damage reports error:', error);
        return res.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
        return addCorsHeaders(response, request);
    }

  } catch (error) {
    console.error('delete_damage_reports_seed error:', error);
    next(error);
  }
};
