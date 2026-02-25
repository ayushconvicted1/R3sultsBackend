const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'results-jwt-secret-key-2024';

// ─── services ───
exports.get_services = async (req, res, next) => {
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
        const category = req.query['category'] || '';
        const verified = req.query['verified'];
        const query = {};
        if (category)
            query.category = category;
        if (verified !== null && verified !== '') {
            query.verified = verified === 'true';
        }
        const skip = (page - 1) * limit;
        let serviceProviders = await prisma.adminServiceProvider.findMany({ where: query, orderBy: { createdAt: 'desc' }, skip: skip, take: limit });
        // Filter by search if needed
        if (search) {
            const searchLower = search.toLowerCase();
            serviceProviders = serviceProviders.filter((sp) => (sp.providerId && sp.providerId.toLowerCase().includes(searchLower)) ||
                (sp.businessName && sp.businessName.toLowerCase().includes(searchLower)) ||
                (sp.userId?.name && sp.userId.name.toLowerCase().includes(searchLower)) ||
                (sp.location?.city && sp.location.city.toLowerCase().includes(searchLower)) ||
                (sp.category && sp.category.toLowerCase().includes(searchLower)) ||
                (sp.serviceType && sp.serviceType.toLowerCase().includes(searchLower)));
        }
        const total = await prisma.adminServiceProvider.count({ where: query });
        return res.json({
            success: true,
            data: {
                serviceProviders,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                    hasMore: skip + serviceProviders.length < total,
                },
            },
        });
    }
    catch (error) {
        console.error('Get service providers error:', error);
        return res.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('get_services error:', error);
    next(error);
  }
};

exports.post_services = async (req, res, next) => {
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
        // Check if user exists for this provider or create one
        let userId = body.userId;
        if (!userId && body.contactPerson?.email) {
            // Check if email already exists
            let existingUser = await prisma.adminUser.findFirst({ where: { email: body.contactPerson.email } });
            if (!existingUser) {
                // Create user account for service provider
                const hashedPassword = await bcrypt.hash(body.password || 'provider123');
                existingUser = await prisma.adminprisma.adminUser.create({ data: { data: {
                            name: body.contactPerson.name || body.businessName,
                            email: body.contactPerson.email,
                            phone: body.contactPerson.phone,
                            password: hashedPassword,
                            role: 'service_provider',
                            status: 'active',
                            address: body.location,
                        } } });
            }
            userId = existingUser.id;
        }
        if (!userId) {
            return res.json({ success: false, error: 'User ID or contact email is required' }, { status: 400 });
        }
        // Ensure location has proper GeoJSON format - USA based
        const locationData = body.location ? {
            type: 'Point',
            coordinates: body.location.coordinates || [0, 0],
            address: body.location.address || '',
            landmark: body.location.landmark || '',
            city: body.location.city || '',
            state: body.location.state || '',
            pincode: body.location.pincode || '',
            country: body.location.country || 'United States',
        } : undefined;
        // Create service provider with ALL fields
        const serviceProvider = await prisma.adminprisma.adminServiceProvider.create({ data: { data: {
                    userId,
                    businessName: body.businessName,
                    businessType: body.businessType,
                    registrationNumber: body.registrationNumber,
                    description: body.description,
                    tagline: body.tagline,
                    logo: body.logo,
                    coverImage: body.coverImage,
                    gallery: body.gallery || [],
                    contactPerson: body.contactPerson, // Includes firstName, lastName, designation, phone, email, alternatePhone
                    website: body.website,
                    socialLinks: body.socialLinks,
                    category: body.category,
                    subcategories: body.subcategories || [],
                    serviceType: body.serviceType,
                    services: body.services || [],
                    equipmentAvailable: body.equipmentAvailable || [],
                    teamSize: body.teamSize || 1,
                    vehiclesAvailable: body.vehiclesAvailable || [],
                    location: locationData,
                    serviceAreas: body.serviceAreas || [],
                    maxServiceRadius: body.maxServiceRadius || 50,
                    operatingHours: body.operatingHours || [],
                    is24x7Available: body.is24x7Available || false,
                    pricing: body.pricing,
                    paymentMethods: body.paymentMethods || [],
                    isAvailableForEmergency: body.isAvailableForEmergency ?? true,
                    emergencyCharges: body.emergencyCharges || 0,
                    emergencyResponseTime: body.emergencyResponseTime,
                    yearsOfExperience: body.yearsOfExperience || 0,
                    certifications: body.certifications || [],
                    licenses: body.licenses || [],
                    insuranceDetails: body.insuranceDetails,
                    documents: body.documents || [], // Category-based required documents
                    status: body.status || 'active',
                } } });
        const populatedProvider = await prisma.adminServiceProvider.findUnique({ where: { id: serviceProvider.id } });
        return res.json({
            success: true,
            data: { serviceProvider: populatedProvider },
            message: 'Service provider created successfully'
        }, { status: 201 });
    }
    catch (error) {
        console.error('Create service provider error:', error);
        return res.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('post_services error:', error);
    next(error);
  }
};

exports.put_services = async (req, res, next) => {
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
        if (!id) {
            return res.json({ success: false, error: 'Service provider ID required' }, { status: 400 });
        }
        const body = req.body;
        // Ensure location has proper GeoJSON format - USA based
        const locationData = body.location ? {
            type: 'Point',
            coordinates: body.location.coordinates || [0, 0],
            address: body.location.address || '',
            suite: body.location.suite || '',
            city: body.location.city || '',
            state: body.location.state || '',
            zipCode: body.location.zipCode || '',
            country: body.location.country || 'United States',
        } : undefined;
        // Update service provider with ALL fields
        const serviceProvider = await prisma.adminServiceProvider.update({ where: { id: id, } }, {
            businessName: body.businessName,
            businessType: body.businessType,
            einNumber: body.einNumber, // EIN Number
            registrationNumber: body.registrationNumber,
            stateRegistration: body.stateRegistration,
            description: body.description,
            tagline: body.tagline,
            logo: body.logo,
            coverImage: body.coverImage,
            gallery: body.gallery || [],
            contactPerson: body.contactPerson, // firstName, lastName, designation, phone, email, alternatePhone
            website: body.website,
            socialLinks: body.socialLinks,
            category: body.category,
            subcategories: body.subcategories || [],
            serviceType: body.serviceType,
            services: body.services,
            equipmentAvailable: body.equipmentAvailable,
            teamSize: body.teamSize,
            vehiclesAvailable: body.vehiclesAvailable,
            location: locationData,
            serviceAreas: body.serviceAreas,
            maxServiceRadius: body.maxServiceRadius,
            operatingHours: body.operatingHours,
            is24x7Available: body.is24x7Available,
            pricing: body.pricing,
            paymentMethods: body.paymentMethods,
            isAvailableForEmergency: body.isAvailableForEmergency,
            emergencyCharges: body.emergencyCharges,
            emergencyResponseTime: body.emergencyResponseTime,
            yearsOfExperience: body.yearsOfExperience,
            certifications: body.certifications,
            licenses: body.licenses,
            insuranceDetails: body.insuranceDetails,
            documents: body.documents || [], // Category-based documents
            status: body.status,
        }, { new: true });
        if (!serviceProvider) {
            return res.json({ success: false, error: 'Service provider not found' }, { status: 404 });
        }
        return res.json({
            success: true,
            data: { serviceProvider },
            message: 'Service provider updated successfully'
        });
    }
    catch (error) {
        console.error('Update service provider error:', error);
        return res.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('put_services error:', error);
    next(error);
  }
};

exports.delete_services = async (req, res, next) => {
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
        if (!id) {
            return res.json({ success: false, error: 'Service provider ID required' }, { status: 400 });
        }
        const serviceProvider = await prisma.adminServiceProvider.findUnique({ where: { id: id } });
        if (!serviceProvider) {
            return res.json({ success: false, error: 'Service provider not found' }, { status: 404 });
        }
        // Delete service provider profile
        await prisma.adminServiceProvider.delete({ where: { id: id } });
        // Optionally deactivate user account
        await prisma.adminUser.update({ where: { id: serviceProvider.userId }, data: { status: 'inactive' } });
        return res.json({
            success: true,
            message: 'Service provider deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete service provider error:', error);
        return res.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('delete_services error:', error);
    next(error);
  }
};

// ─── category-documents ───
exports.get_category_documents = async (req, res, next) => {
  try {

    try {
        // req.query is already available via Express;
        const category = req.query['category'];
        // If requesting a specific category
        if (category) {
            let requirement = await prisma.adminCategoryDocReq.findFirst({ where: { category: category.toLowerCase() } });
            // If not in database, return from static constants
            if (!requirement) {
                const staticDocs = usa_1.CATEGORY_DOCUMENTS[category.toLowerCase()];
                const categoryInfo = usa_1.SERVICE_CATEGORIES.find(c => c.value === category.toLowerCase());
                if (staticDocs) {
                    return res.json({
                        success: true,
                        data: {
                            category: category.toLowerCase(),
                            categoryLabel: categoryInfo?.label || category,
                            documents: staticDocs,
                            isDefault: true,
                        },
                    });
                }
                return res.json({
                    success: false,
                    error: 'Category not found',
                }, { status: 404 });
            }
            return res.json({
                success: true,
                data: requirement,
            });
        }
        // Get all from database
        const dbRequirements = await prisma.adminCategoryDocReq.findMany();
        // Merge with static categories to ensure all categories are represented
        const allCategories = usa_1.SERVICE_CATEGORIES.map(cat => {
            const dbReq = dbRequirements.find(r => r.category === cat.value);
            if (dbReq) {
                return dbReq;
            }
            // Return static default if not customized in database
            return {
                category: cat.value,
                categoryLabel: cat.label,
                documents: usa_1.CATEGORY_DOCUMENTS[cat.value] || [],
                isDefault: true,
            };
        });
        return res.json({
            success: true,
            data: allCategories,
        });
    }
    catch (error) {
        console.error('Error fetching category document requirements:', error);
        return res.json({
            success: false,
            error: 'Failed to fetch category document requirements',
        }, { status: 500 });
    }

  } catch (error) {
    console.error('get_category_documents error:', error);
    next(error);
  }
};

exports.post_category_documents = async (req, res, next) => {
  try {

    try {
        // Verify authentication
        const tokenPayload = await req.user;
        if (!tokenPayload) {
            return res.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        if (!true) {
            return res.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }
        const body = req.body;
        const { category, categoryLabel, documents } = body;
        if (!category) {
            return res.json({
                success: false,
                error: 'Category is required',
            }, { status: 400 });
        }
        // Validate documents array
        if (!Array.isArray(documents)) {
            return res.json({
                success: false,
                error: 'Documents must be an array',
            }, { status: 400 });
        }
        // Validate each document entry
        for (const doc of documents) {
            if (!doc.type || !doc.label) {
                return res.json({
                    success: false,
                    error: 'Each document must have a type and label',
                }, { status: 400 });
            }
        }
        // Upsert the category document requirements
        const result = await prisma.adminCategoryDocReq.updateMany({ where: { category: category.toLowerCase() }, }, {
            category: category.toLowerCase(),
            categoryLabel: categoryLabel || usa_1.SERVICE_CATEGORIES.find(c => c.value === category)?.label || category,
            documents,
        }, { upsert: true, new: true, runValidators: true });
        return res.json({
            success: true,
            message: 'Category document requirements saved successfully',
            data: result,
        });
    }
    catch (error) {
        console.error('Error saving category document requirements:', error);
        return res.json({
            success: false,
            error: 'Failed to save category document requirements',
        }, { status: 500 });
    }

  } catch (error) {
    console.error('post_category_documents error:', error);
    next(error);
  }
};

exports.put_category_documents = async (req, res, next) => {
  try {

    try {
        // Verify authentication
        const tokenPayload = await req.user;
        if (!tokenPayload) {
            return res.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        if (!true) {
            return res.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }
        const body = req.body;
        const { category, document: newDoc } = body;
        if (!category || !newDoc || !newDoc.type || !newDoc.label) {
            return res.json({
                success: false,
                error: 'Category, document type, and label are required',
            }, { status: 400 });
        }
        // Check if category exists in DB
        let requirement = await prisma.adminCategoryDocReq.findFirst({ where: { category: category.toLowerCase() } });
        if (!requirement) {
            // Create from static defaults first
            const staticDocs = usa_1.CATEGORY_DOCUMENTS[category.toLowerCase()] || [];
            const categoryLabel = usa_1.SERVICE_CATEGORIES.find(c => c.value === category.toLowerCase())?.label || category;
            requirement = ({
                category: category.toLowerCase(),
                categoryLabel,
                documents: staticDocs,
            });
        }
        // Check if document type already exists
        const existingDoc = requirement.documents.find(d => d.type === newDoc.type);
        if (existingDoc) {
            return res.json({
                success: false,
                error: 'Document type already exists in this category',
            }, { status: 400 });
        }
        // Add the new document type
        requirement.documents.push({
            type: newDoc.type,
            label: newDoc.label,
            required: newDoc.required ?? true,
        });
        // Note: requirement.save() pattern needs prisma.model.update() - see TODO below
        return res.json({
            success: true,
            message: 'Document type added successfully',
            data: requirement,
        });
    }
    catch (error) {
        console.error('Error adding document type:', error);
        return res.json({
            success: false,
            error: 'Failed to add document type',
        }, { status: 500 });
    }

  } catch (error) {
    console.error('put_category_documents error:', error);
    next(error);
  }
};

exports.delete_category_documents = async (req, res, next) => {
  try {

    try {
        // Verify authentication
        const tokenPayload = await req.user;
        if (!tokenPayload) {
            return res.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        if (!true) {
            return res.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }
        // req.query is already available via Express;
        const category = req.query['category'];
        const documentType = req.query['documentType'];
        if (!category || !documentType) {
            return res.json({
                success: false,
                error: 'Category and documentType are required',
            }, { status: 400 });
        }
        // Find or create the category document requirements
        let requirement = await prisma.adminCategoryDocReq.findFirst({ where: { category: category.toLowerCase() } });
        if (!requirement) {
            // Create from static defaults first
            const staticDocs = usa_1.CATEGORY_DOCUMENTS[category.toLowerCase()] || [];
            const categoryLabel = usa_1.SERVICE_CATEGORIES.find(c => c.value === category.toLowerCase())?.label || category;
            requirement = ({
                category: category.toLowerCase(),
                categoryLabel,
                documents: staticDocs,
            });
        }
        // Remove the document type
        const docIndex = requirement.documents.findIndex(d => d.type === documentType);
        if (docIndex === -1) {
            return res.json({
                success: false,
                error: 'Document type not found in this category',
            }, { status: 404 });
        }
        requirement.documents.splice(docIndex, 1);
        // Note: requirement.save() pattern needs prisma.model.update() - see TODO below
        return res.json({
            success: true,
            message: 'Document type removed successfully',
            data: requirement,
        });
    }
    catch (error) {
        console.error('Error removing document type:', error);
        return res.json({
            success: false,
            error: 'Failed to remove document type',
        }, { status: 500 });
    }

  } catch (error) {
    console.error('delete_category_documents error:', error);
    next(error);
  }
};
