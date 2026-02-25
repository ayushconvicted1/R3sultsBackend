const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'results-jwt-secret-key-2024';

// ─── shelters ───
exports.get_shelters = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        if (!tokenPayload) {
            return res.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        // req.query is already available via Express;
        const page = parseInt(req.query['page'] || '1');
        const limit = parseInt(req.query['limit'] || '100');
        const search = req.query['search'] || '';
        const status = req.query['status'] || '';
        const type = req.query['type'] || '';
        const city = req.query['city'] || '';
        const query = {};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { address: { $regex: search, $options: 'i' } },
                { city: { $regex: search, $options: 'i' } },
                { state: { $regex: search, $options: 'i' } },
            ];
        }
        if (status && status !== 'all')
            query.status = status;
        if (type)
            query.type = type;
        if (city)
            query.city = { $regex: city, $options: 'i' };
        const skip = (page - 1) * limit;
        const [shelters, total] = await Promise.all([
            prisma.adminShelter.findMany({ where: query, orderBy: { createdAt: 'desc' }, skip: skip, take: limit }),
            prisma.adminShelter.count({ where: query }),
        ]);
        return res.json({
            success: true,
            data: shelters.map(shelter => {
                // Handle both new schema (addressLine1) and old schema (address) for backward compatibility
                // Explicitly handle null and undefined values
                const getValue = (val, defaultValue = '') => {
                    return val !== null && val !== undefined ? val : defaultValue;
                };
                const addressLine1 = getValue(shelter.addressLine1) || getValue(shelter.address) || '';
                return {
                    id: shelter.id.toString(),
                    name: getValue(shelter.name),
                    addressLine1: addressLine1,
                    addressLine2: getValue(shelter.addressLine2),
                    address: addressLine1, // For backward compatibility
                    city: getValue(shelter.city),
                    state: getValue(shelter.state),
                    zipCode: getValue(shelter.zipCode),
                    country: getValue(shelter.country, 'United States'),
                    capacity: getValue(shelter.capacity, 0),
                    currentOccupancy: getValue(shelter.currentOccupancy, 0),
                    contactPerson: getValue(shelter.contactPerson),
                    contactPhone: getValue(shelter.contactPhone),
                    contactEmail: getValue(shelter.contactEmail),
                    description: getValue(shelter.description),
                    website: getValue(shelter.website),
                    operatingHours: getValue(shelter.operatingHours),
                    notes: getValue(shelter.notes),
                    facilities: Array.isArray(shelter.facilities) ? shelter.facilities : [],
                    status: getValue(shelter.status, 'active'),
                    type: getValue(shelter.type, 'temporary'),
                    coordinates: shelter.coordinates && typeof shelter.coordinates === 'object'
                        ? { lat: getValue(shelter.coordinates.lat, 0), lng: getValue(shelter.coordinates.lng, 0) }
                        : { lat: 0, lng: 0 },
                    createdAt: shelter.createdAt?.toISOString() || new Date().toISOString(),
                };
            }),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        console.error('Get shelters error:', error);
        return res.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('get_shelters error:', error);
    next(error);
  }
};

exports.post_shelters = async (req, res, next) => {
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
        // Log received data for debugging (only in development)
        if (process.env.NODE_ENV === 'development') {
            console.log('Received shelter data:', JSON.stringify(body, null, 2));
        }
        // Validate required fields with detailed error messages
        const missingFields = [];
        if (!body.name || !String(body.name).trim())
            missingFields.push('name');
        if (!body.addressLine1 || !String(body.addressLine1).trim())
            missingFields.push('addressLine1');
        if (!body.city || !String(body.city).trim())
            missingFields.push('city');
        if (!body.state || !String(body.state).trim())
            missingFields.push('state');
        if (!body.capacity || Number(body.capacity) < 1)
            missingFields.push('capacity');
        if (!body.contactPerson || !String(body.contactPerson).trim())
            missingFields.push('contactPerson');
        if (!body.contactPhone || !String(body.contactPhone).trim())
            missingFields.push('contactPhone');
        if (!body.type)
            missingFields.push('type');
        if (missingFields.length > 0) {
            console.error('Missing required fields:', missingFields);
            console.error('Received body:', body);
            return res.json({
                success: false,
                error: `Missing required fields: ${missingFields.join(', ')}`,
                missingFields,
                receivedData: process.env.NODE_ENV === 'development' ? body : undefined
            }, { status: 400 });
        }
        // Validate occupancy (only check for negative values)
        const currentOccupancy = Number(body.currentOccupancy) || 0;
        const capacity = Number(body.capacity);
        if (currentOccupancy < 0) {
            return res.json({ success: false, error: 'Current occupancy cannot be negative' }, { status: 400 });
        }
        // Validate email format if provided
        if (body.contactEmail && body.contactEmail.trim()) {
            const emailRegex = /^\S+@\S+\.\S+$/;
            if (!emailRegex.test(body.contactEmail)) {
                return res.json({ success: false, error: 'Please enter a valid email address' }, { status: 400 });
            }
        }
        // Validate website URL format if provided
        if (body.website && body.website.trim()) {
            try {
                new URL(body.website.startsWith('http') ? body.website : `https://${body.website}`);
            }
            catch {
                return res.json({ success: false, error: 'Please enter a valid website URL' }, { status: 400 });
            }
        }
        // Validate zip code format (numbers only) if provided
        if (body.zipCode && body.zipCode.trim()) {
            if (!/^\d+$/.test(body.zipCode.trim())) {
                return res.json({ success: false, error: 'Zip code must contain only numbers' }, { status: 400 });
            }
        }
        // Determine status based on occupancy
        let status = body.status || 'active';
        if (capacity > 0) {
            const occupancyPercentage = (currentOccupancy / capacity) * 100;
            if (occupancyPercentage >= 100) {
                status = 'full';
            }
        }
        // Prepare shelter data with proper trimming - all fields included
        const shelterData = {
            name: String(body.name || '').trim(),
            addressLine1: String(body.addressLine1 || '').trim(),
            addressLine2: body.addressLine2 ? String(body.addressLine2).trim() : '',
            city: String(body.city || '').trim(),
            state: String(body.state || '').trim(),
            zipCode: body.zipCode ? String(body.zipCode).trim() : '',
            country: body.country ? String(body.country).trim() : 'United States',
            capacity: capacity,
            currentOccupancy: currentOccupancy,
            contactPerson: String(body.contactPerson || '').trim(),
            contactPhone: String(body.contactPhone || '').trim(),
            contactEmail: body.contactEmail ? String(body.contactEmail).trim().toLowerCase() : '',
            description: body.description ? String(body.description).trim() : '',
            website: body.website ? String(body.website).trim() : '',
            operatingHours: body.operatingHours ? String(body.operatingHours).trim() : '',
            notes: body.notes ? String(body.notes).trim() : '',
            facilities: Array.isArray(body.facilities) ? body.facilities.map((f) => String(f).trim()).filter((f) => f) : [],
            status: status,
            type: body.type || 'temporary',
            coordinates: {
                lat: Number(body.coordinates?.lat) || 0,
                lng: Number(body.coordinates?.lng) || 0,
            },
        };
        // Create shelter using Prisma
        const shelter = await prisma.adminShelter.create({ data: shelterData });
        if (!shelter) {
            return res.json({ success: false, error: 'Failed to create shelter' }, { status: 500 });
        }
        // Helper function to handle null/undefined values
        const getValue = (val, defaultValue = '') => {
            return val !== null && val !== undefined ? val : defaultValue;
        };
        return res.json({
            success: true,
            data: {
                id: shelter.id.toString(),
                name: getValue(shelter.name),
                addressLine1: getValue(shelter.addressLine1) || getValue(shelter.address) || '',
                addressLine2: getValue(shelter.addressLine2),
                address: getValue(shelter.addressLine1) || getValue(shelter.address) || '', // For backward compatibility
                city: getValue(shelter.city),
                state: getValue(shelter.state),
                zipCode: getValue(shelter.zipCode),
                country: getValue(shelter.country, 'United States'),
                capacity: getValue(shelter.capacity, 0),
                currentOccupancy: getValue(shelter.currentOccupancy, 0),
                contactPerson: getValue(shelter.contactPerson),
                contactPhone: getValue(shelter.contactPhone),
                contactEmail: getValue(shelter.contactEmail),
                description: getValue(shelter.description),
                website: getValue(shelter.website),
                operatingHours: getValue(shelter.operatingHours),
                notes: getValue(shelter.notes),
                facilities: Array.isArray(shelter.facilities) ? shelter.facilities : [],
                status: getValue(shelter.status, 'active'),
                type: getValue(shelter.type, 'temporary'),
                coordinates: shelter.coordinates && typeof shelter.coordinates === 'object'
                    ? { lat: getValue(shelter.coordinates.lat, 0), lng: getValue(shelter.coordinates.lng, 0) }
                    : { lat: 0, lng: 0 },
                createdAt: shelter.createdAt?.toISOString() || new Date().toISOString(),
            },
        }, { status: 201 });
    }
    catch (error) {
        console.error('Create shelter error:', error);
        console.error('Error stack:', error.stack);
        console.error('Error details:', JSON.stringify(error, null, 2));
        return res.json({
            success: false,
            error: error.message || 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }

  } catch (error) {
    console.error('post_shelters error:', error);
    next(error);
  }
};

exports.put_shelters = async (req, res, next) => {
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
            return res.json({ success: false, error: 'Shelter ID is required' }, { status: 400 });
        }
        // Convert string ID to ObjectId for proper MongoDB query
        let shelterId;
        try {
            shelterId = body.id;
        }
        catch (error) {
            return res.json({ success: false, error: 'Invalid shelter ID format' }, { status: 400 });
        }
        const shelter = await prisma.adminShelter.findUnique({ where: { id: shelterId } });
        if (!shelter) {
            return res.json({ success: false, error: 'Shelter not found' }, { status: 404 });
        }
        // Validate zip code format (numbers only) - only if zipCode is provided and not empty
        if (body.zipCode !== undefined && body.zipCode !== null && String(body.zipCode).trim()) {
            const zipCodeStr = String(body.zipCode).trim();
            if (zipCodeStr && !/^\d+$/.test(zipCodeStr)) {
                return res.json({ success: false, error: 'Zip code must contain only numbers' }, { status: 400 });
            }
        }
        // Update ALL fields from the request body
        // The frontend sends all fields, so we update all of them
        const updateData = {};
        // Update all basic fields
        if (body.name !== undefined)
            updateData.name = String(body.name || '').trim();
        if (body.addressLine1 !== undefined)
            updateData.addressLine1 = String(body.addressLine1 || '').trim();
        if (body.addressLine2 !== undefined)
            updateData.addressLine2 = String(body.addressLine2 || '').trim();
        if (body.city !== undefined)
            updateData.city = String(body.city || '').trim();
        if (body.state !== undefined)
            updateData.state = String(body.state || '').trim();
        if (body.zipCode !== undefined)
            updateData.zipCode = String(body.zipCode || '').trim();
        if (body.country !== undefined)
            updateData.country = String(body.country || 'United States').trim();
        // Update capacity and occupancy
        if (body.capacity !== undefined) {
            const newCapacity = Number(body.capacity);
            if (newCapacity < 1) {
                return res.json({ success: false, error: 'Capacity must be at least 1' }, { status: 400 });
            }
            updateData.capacity = newCapacity;
        }
        if (body.currentOccupancy !== undefined) {
            const newOccupancy = Number(body.currentOccupancy) || 0;
            if (newOccupancy < 0) {
                return res.json({ success: false, error: 'Occupancy cannot be negative' }, { status: 400 });
            }
            updateData.currentOccupancy = newOccupancy;
        }
        const newCapacity = updateData.capacity !== undefined ? updateData.capacity : shelter.capacity;
        const newOccupancy = updateData.currentOccupancy !== undefined ? updateData.currentOccupancy : shelter.currentOccupancy;
        // Update status based on occupancy
        if (newCapacity > 0) {
            const occupancyPercentage = (newOccupancy / newCapacity) * 100;
            if (occupancyPercentage >= 100) {
                updateData.status = 'full';
            }
            else if (body.status !== undefined) {
                updateData.status = body.status;
            }
            else if (shelter.status === 'full' && occupancyPercentage < 100) {
                updateData.status = 'active';
            }
        }
        else if (body.status !== undefined) {
            updateData.status = body.status;
        }
        // Update contact information
        if (body.contactPerson !== undefined)
            updateData.contactPerson = String(body.contactPerson || '').trim();
        if (body.contactPhone !== undefined)
            updateData.contactPhone = String(body.contactPhone || '').trim();
        if (body.contactEmail !== undefined) {
            const email = String(body.contactEmail || '').trim().toLowerCase();
            if (email) {
                const emailRegex = /^\S+@\S+\.\S+$/;
                if (!emailRegex.test(email)) {
                    return res.json({ success: false, error: 'Please enter a valid email address' }, { status: 400 });
                }
                updateData.contactEmail = email;
            }
            else {
                updateData.contactEmail = '';
            }
        }
        // Update additional information
        if (body.description !== undefined)
            updateData.description = String(body.description || '').trim();
        if (body.website !== undefined) {
            const website = String(body.website || '').trim();
            if (website) {
                try {
                    new URL(website.startsWith('http') ? website : `https://${website}`);
                    updateData.website = website;
                }
                catch {
                    return res.json({ success: false, error: 'Please enter a valid website URL' }, { status: 400 });
                }
            }
            else {
                updateData.website = '';
            }
        }
        if (body.operatingHours !== undefined)
            updateData.operatingHours = String(body.operatingHours || '').trim();
        if (body.notes !== undefined)
            updateData.notes = String(body.notes || '').trim();
        if (body.facilities !== undefined) {
            updateData.facilities = Array.isArray(body.facilities)
                ? body.facilities.map((f) => String(f).trim()).filter((f) => f)
                : [];
        }
        if (body.type !== undefined)
            updateData.type = body.type;
        if (body.coordinates !== undefined) {
            updateData.coordinates = {
                lat: Number(body.coordinates.lat) || shelter.coordinates.lat,
                lng: Number(body.coordinates.lng) || shelter.coordinates.lng,
            };
        }
        // Ensure we have at least one field to update
        if (Object.keys(updateData).length === 0) {
            return res.json({ success: false, error: 'No fields to update' }, { status: 400 });
        }
        // Log before update for debugging
        console.log('=== UPDATE OPERATION DEBUG ===');
        console.log('Shelter ID (string):', body.id);
        console.log('Shelter ID (ObjectId):', shelterId.toString());
        console.log('Update data keys:', Object.keys(updateData));
        console.log('Update data:', JSON.stringify(updateData, null, 2));
        console.log('Original shelter data:', {
            name: shelter.name,
            capacity: shelter.capacity,
            currentOccupancy: shelter.currentOccupancy,
            city: shelter.city,
            state: shelter.state,
        });
        // Use Prisma update
        const shelterUpdate = await prisma.adminShelter.update({ 
            where: { id: shelterId }, 
            data: updateData 
        });

        return res.json({
            success: true,
            message: 'Shelter updated successfully',
            data: { id: shelterUpdate.id.toString() }
        });
    } catch (innerError) {
        console.error('Update shelter error:', innerError);
        return res.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('put_shelters error:', error);
    next(error);
  }
};

exports.delete_shelters = async (req, res, next) => {
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
        if (!id || id === 'undefined') return res.status(400).json({ success: false, error: 'Invalid shelter ID provided' });
        if (!id) {
            return res.json({ success: false, error: 'Shelter ID is required' }, { status: 400 });
        }
        // Convert string ID to ObjectId for proper MongoDB query
        let shelterId;
        try {
            shelterId = id;
        }
        catch (error) {
            return res.json({ success: false, error: 'Invalid shelter ID format' }, { status: 400 });
        }
        console.log('Deleting shelter:', id, 'ObjectId:', shelterId.toString());
        const deleteResult = await prisma.adminShelter.deleteMany({ where: { id: shelterId } });
        console.log('Delete operation result:', {
            deletedCount: deleteResult.deletedCount,
            acknowledged: deleteResult.acknowledged,
        });
        if (deleteResult.deletedCount === 0) {
            return res.json({ success: false, error: 'Shelter not found' }, { status: 404 });
        }
        return res.json({
            success: true,
            message: 'Shelter deleted successfully',
        });
    }
    catch (error) {
        console.error('Delete shelter error:', error);
        return res.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('delete_shelters error:', error);
    next(error);
  }
};

// ─── shelters/seed ───
exports.post_shelters_seed = async (req, res, next) => {
  try {

    try {
        console.log('Starting shelter seed...');
        console.log('Database connected');
        const sampleShelters = [
            {
                name: 'Government School Relief Camp',
                address: '123 Main Road',
                city: 'Mumbai',
                state: 'Maharashtra',
                capacity: 500,
                currentOccupancy: 320,
                contactPerson: 'Rajesh Kumar',
                contactPhone: '+91 98765 43210',
                facilities: ['Food', 'Water', 'Medical', 'Blankets', 'Toilets'],
                status: 'active',
                type: 'relief_camp',
                coordinates: {
                    lat: 19.0760,
                    lng: 72.8777,
                },
            },
            {
                name: 'Community Hall Shelter',
                address: '45 Park Street',
                city: 'Delhi',
                state: 'Delhi',
                capacity: 200,
                currentOccupancy: 198,
                contactPerson: 'Amit Singh',
                contactPhone: '+91 87654 32109',
                facilities: ['Food', 'Water', 'Toilets'],
                status: 'full',
                type: 'temporary',
                coordinates: {
                    lat: 28.6139,
                    lng: 77.2090,
                },
            },
            {
                name: 'Stadium Emergency Shelter',
                address: '789 Sports Complex',
                city: 'Chennai',
                state: 'Tamil Nadu',
                capacity: 1000,
                currentOccupancy: 450,
                contactPerson: 'Priya Devi',
                contactPhone: '+91 76543 21098',
                facilities: ['Food', 'Water', 'Medical', 'Blankets', 'Toilets', 'Charging Points'],
                status: 'active',
                type: 'emergency',
                coordinates: {
                    lat: 13.0827,
                    lng: 80.2707,
                },
            },
            {
                name: 'Dharamshala Permanent Shelter',
                address: '321 Temple Road',
                city: 'Kolkata',
                state: 'West Bengal',
                capacity: 150,
                currentOccupancy: 0,
                contactPerson: 'Biswas Roy',
                contactPhone: '+91 65432 10987',
                facilities: ['Food', 'Water', 'Toilets', 'Sleeping Area'],
                status: 'closed',
                type: 'permanent',
                coordinates: {
                    lat: 22.5726,
                    lng: 88.3639,
                },
            },
            {
                name: 'City Convention Center',
                address: '567 Downtown Avenue',
                city: 'Bangalore',
                state: 'Karnataka',
                capacity: 800,
                currentOccupancy: 520,
                contactPerson: 'Suresh Reddy',
                contactPhone: '+91 91234 56789',
                facilities: ['Food', 'Water', 'Medical', 'Blankets', 'Toilets', 'WiFi', 'Charging Points'],
                status: 'active',
                type: 'temporary',
                coordinates: {
                    lat: 12.9716,
                    lng: 77.5946,
                },
            },
        ];
        // Check if shelters already exist
        const existingCount = await prisma.adminShelter.count();
        if (existingCount > 0) {
            return res.json({
                success: true,
                message: `Shelters already exist in database (${existingCount} shelters). Use DELETE to clear first.`,
                count: existingCount,
            });
        }
        // Insert sample shelters using insertMany with raw data (bypasses validation issues)
        console.log('Inserting shelters...');
        const inserted = await prisma.adminShelter.createMany({ data: sampleShelters, }, {
            ordered: false, // Continue even if one fails
            rawResult: false
        });
        console.log(`Successfully inserted ${inserted.length} shelters`);
        return res.json({
            success: true,
            message: `Successfully seeded ${inserted.length} shelters`,
            data: inserted.map(shelter => ({
                id: shelter.id.toString(),
                name: shelter.name,
                city: shelter.city,
                state: shelter.state,
                capacity: shelter.capacity,
                currentOccupancy: shelter.currentOccupancy,
                status: shelter.status,
            })),
        }, { status: 201 });
    }
    catch (error) {
        console.error('Seed shelters error:', error);
        console.error('Error stack:', error.stack);
        return res.json({
            success: false,
            error: error.message || 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            errorName: error.name
        }, { status: 500 });
    }

  } catch (error) {
    console.error('post_shelters_seed error:', error);
    next(error);
  }
};

exports.delete_shelters_seed = async (req, res, next) => {
  try {

    try {
        const result = await prisma.adminShelter.deleteMany({ where: {} });
        return res.json({
            success: true,
            message: `Deleted ${result.deletedCount} shelters`,
            deletedCount: result.deletedCount,
        });
    }
    catch (error) {
        console.error('Clear shelters error:', error);
        return res.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('delete_shelters_seed error:', error);
    next(error);
  }
};

// ─── shelters/init ───
exports.get_shelters_init = async (req, res, next) => {
  try {

    try {
        const existingCount = await prisma.adminShelter.count();
        if (existingCount > 0) {
            return res.json({
                success: true,
                message: `Database already initialized with ${existingCount} shelters`,
                count: existingCount,
            });
        }
        const sampleShelters = [
            {
                name: 'Government School Relief Camp',
                addressLine1: '123 Main Road',
                addressLine2: 'Near City Park',
                city: 'Mumbai',
                state: 'Maharashtra',
                zipCode: '400001',
                country: 'India',
                capacity: 500,
                currentOccupancy: 320,
                contactPerson: 'Rajesh Kumar',
                contactPhone: '+91 98765 43210',
                contactEmail: 'rajesh.kumar@example.com',
                description: 'Large relief camp with full facilities for disaster victims',
                website: 'https://example.com',
                operatingHours: '24/7',
                notes: 'Can accommodate up to 500 people with emergency supplies',
                facilities: ['Food', 'Water', 'Medical', 'Blankets', 'Toilets'],
                status: 'active',
                type: 'relief_camp',
                coordinates: { lat: 19.0760, lng: 72.8777 },
            },
            {
                name: 'Community Hall Shelter',
                addressLine1: '45 Park Street',
                addressLine2: 'Block A, First Floor',
                city: 'Delhi',
                state: 'Delhi',
                zipCode: '110001',
                country: 'India',
                capacity: 200,
                currentOccupancy: 198,
                contactPerson: 'Amit Singh',
                contactPhone: '+91 87654 32109',
                contactEmail: 'amit.singh@example.com',
                description: 'Community hall converted to temporary shelter',
                operatingHours: '6 AM - 10 PM',
                facilities: ['Food', 'Water', 'Toilets'],
                status: 'full',
                type: 'temporary',
                coordinates: { lat: 28.6139, lng: 77.2090 },
            },
            {
                name: 'Stadium Emergency Shelter',
                addressLine1: '789 Sports Complex',
                addressLine2: 'Main Stadium Building',
                city: 'Chennai',
                state: 'Tamil Nadu',
                zipCode: '600001',
                country: 'India',
                capacity: 1000,
                currentOccupancy: 450,
                contactPerson: 'Priya Devi',
                contactPhone: '+91 76543 21098',
                contactEmail: 'priya.devi@example.com',
                description: 'Large stadium facility for emergency shelter during disasters',
                operatingHours: '24/7',
                notes: 'Equipped with medical facilities and charging stations',
                facilities: ['Food', 'Water', 'Medical', 'Blankets', 'Toilets', 'Charging Points'],
                status: 'active',
                type: 'emergency',
                coordinates: { lat: 13.0827, lng: 80.2707 },
            },
            {
                name: 'Dharamshala Permanent Shelter',
                addressLine1: '321 Temple Road',
                addressLine2: 'Near Main Temple',
                city: 'Kolkata',
                state: 'West Bengal',
                zipCode: '700001',
                country: 'India',
                capacity: 150,
                currentOccupancy: 0,
                contactPerson: 'Biswas Roy',
                contactPhone: '+91 65432 10987',
                contactEmail: 'biswas.roy@example.com',
                description: 'Permanent shelter facility for long-term accommodation',
                operatingHours: '8 AM - 8 PM',
                facilities: ['Food', 'Water', 'Toilets', 'Sleeping Area'],
                status: 'closed',
                type: 'permanent',
                coordinates: { lat: 22.5726, lng: 88.3639 },
            },
            {
                name: 'City Convention Center',
                addressLine1: '567 Downtown Avenue',
                addressLine2: 'Convention Hall 2',
                city: 'Bangalore',
                state: 'Karnataka',
                zipCode: '560001',
                country: 'India',
                capacity: 800,
                currentOccupancy: 520,
                contactPerson: 'Suresh Reddy',
                contactPhone: '+91 91234 56789',
                contactEmail: 'suresh.reddy@example.com',
                description: 'Modern convention center with full amenities',
                website: 'https://conventioncenter.example.com',
                operatingHours: '24/7',
                notes: 'WiFi available, charging points in all areas',
                facilities: ['Food', 'Water', 'Medical', 'Blankets', 'Toilets', 'WiFi', 'Charging Points'],
                status: 'active',
                type: 'temporary',
                coordinates: { lat: 12.9716, lng: 77.5946 },
            },
        ];
        // Use insertMany which works better than create for bulk inserts
        const inserted = await prisma.adminShelter.createMany({ data: sampleShelters });
        return res.json({
            success: true,
            message: `Successfully initialized with ${inserted.length} shelters`,
            count: inserted.length,
            data: inserted.map(s => ({
                id: s.id.toString(),
                name: s.name,
                city: s.city,
                state: s.state,
            })),
        }, { status: 201 });
    }
    catch (error) {
        console.error('Init shelters error:', error);
        return res.json({
            success: false,
            error: error.message || 'Internal server error',
        }, { status: 500 });
    }

  } catch (error) {
    console.error('get_shelters_init error:', error);
    next(error);
  }
};

// ─── shelters/auto-seed ───
exports.get_shelters_auto_seed = async (req, res, next) => {
  try {

    try {
        // Check if shelters already exist
        const existingCount = await prisma.adminShelter.count();
        if (existingCount > 0) {
            return res.json({
                success: true,
                message: `Database already has ${existingCount} shelters. No seeding needed.`,
                count: existingCount,
                seeded: false,
            });
        }
        const sampleShelters = [
            {
                name: 'Government School Relief Camp',
                address: '123 Main Road',
                city: 'Mumbai',
                state: 'Maharashtra',
                capacity: 500,
                currentOccupancy: 320,
                contactPerson: 'Rajesh Kumar',
                contactPhone: '+91 98765 43210',
                facilities: ['Food', 'Water', 'Medical', 'Blankets', 'Toilets'],
                status: 'active',
                type: 'relief_camp',
                coordinates: { lat: 19.0760, lng: 72.8777 },
            },
            {
                name: 'Community Hall Shelter',
                address: '45 Park Street',
                city: 'Delhi',
                state: 'Delhi',
                capacity: 200,
                currentOccupancy: 198,
                contactPerson: 'Amit Singh',
                contactPhone: '+91 87654 32109',
                facilities: ['Food', 'Water', 'Toilets'],
                status: 'full',
                type: 'temporary',
                coordinates: { lat: 28.6139, lng: 77.2090 },
            },
            {
                name: 'Stadium Emergency Shelter',
                address: '789 Sports Complex',
                city: 'Chennai',
                state: 'Tamil Nadu',
                capacity: 1000,
                currentOccupancy: 450,
                contactPerson: 'Priya Devi',
                contactPhone: '+91 76543 21098',
                facilities: ['Food', 'Water', 'Medical', 'Blankets', 'Toilets', 'Charging Points'],
                status: 'active',
                type: 'emergency',
                coordinates: { lat: 13.0827, lng: 80.2707 },
            },
            {
                name: 'Dharamshala Permanent Shelter',
                address: '321 Temple Road',
                city: 'Kolkata',
                state: 'West Bengal',
                capacity: 150,
                currentOccupancy: 0,
                contactPerson: 'Biswas Roy',
                contactPhone: '+91 65432 10987',
                facilities: ['Food', 'Water', 'Toilets', 'Sleeping Area'],
                status: 'closed',
                type: 'permanent',
                coordinates: { lat: 22.5726, lng: 88.3639 },
            },
            {
                name: 'City Convention Center',
                address: '567 Downtown Avenue',
                city: 'Bangalore',
                state: 'Karnataka',
                capacity: 800,
                currentOccupancy: 520,
                contactPerson: 'Suresh Reddy',
                contactPhone: '+91 91234 56789',
                facilities: ['Food', 'Water', 'Medical', 'Blankets', 'Toilets', 'WiFi', 'Charging Points'],
                status: 'active',
                type: 'temporary',
                coordinates: { lat: 12.9716, lng: 77.5946 },
            },
        ];
        // Insert shelters
        const inserted = await prisma.adminShelter.createMany({ data: sampleShelters });
        return res.json({
            success: true,
            message: `Successfully auto-seeded ${inserted.length} shelters`,
            count: inserted.length,
            seeded: true,
            data: inserted.map(shelter => ({
                id: shelter.id.toString(),
                name: shelter.name,
                city: shelter.city,
                state: shelter.state,
            })),
        }, { status: 201 });
    }
    catch (error) {
        console.error('Auto-seed shelters error:', error);
        return res.json({
            success: false,
            error: error.message || 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }

  } catch (error) {
    console.error('get_shelters_auto_seed error:', error);
    next(error);
  }
};
