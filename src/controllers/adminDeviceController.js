const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'results-jwt-secret-key-2024';

// ─── devices ───
exports.get_devices = async (req, res, next) => {
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
        const page = parseInt(req.query['page'] || '1');
        const limit = parseInt(req.query['limit'] || '10');
        const search = req.query['search'] || '';
        const status = req.query['status'] || 'all';
        const deviceType = req.query['deviceType'] || 'all';
        const query = {};
        if (search) {
            query.$or = [
                { deviceId: { $regex: search, $options: 'i' } },
                { deviceName: { $regex: search, $options: 'i' } },
                { ownerName: { $regex: search, $options: 'i' } },
            ];
        }
        if (status && status !== 'all')
            query.status = status;
        if (deviceType && deviceType !== 'all')
            query.deviceType = deviceType;
        const skip = (page - 1) * limit;
        const [devices, total] = await Promise.all([
            prisma.adminDevice.findMany({ where: query, orderBy: { createdAt: 'desc' }, skip: skip, take: limit }),
            prisma.adminDevice.count({ where: query }),
        ]);
        return res.json({
            success: true,
            data: devices.map(device => ({
                id: device.id?.toString(),
                deviceId: device.deviceId,
                deviceName: device.deviceName,
                deviceType: device.deviceType,
                ownerName: device.ownerName,
                registeredDate: device.registeredDate?.toISOString() || new Date().toISOString(),
                location: device.location,
                batteryLevel: device.batteryLevel,
                signalStrength: device.signalStrength,
                firmwareVersion: device.firmwareVersion,
                lastSynced: device.lastSynced?.toISOString() || new Date().toISOString(),
                status: device.status,
                features: device.features,
                primaryOwner: device.primaryOwner,
                familyMembers: device.familyMembers || [],
                createdAt: device.createdAt?.toISOString() || new Date().toISOString(),
                updatedAt: device.updatedAt?.toISOString() || new Date().toISOString(),
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
        console.error('Get devices error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }

  } catch (error) {
    console.error('get_devices error:', error);
    next(error);
  }
};

exports.post_devices = async (req, res, next) => {
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
        // Validate required fields
        const missingFields = [];
        if (!body.deviceId || !String(body.deviceId).trim())
            missingFields.push('deviceId');
        if (!body.deviceName || !String(body.deviceName).trim())
            missingFields.push('deviceName');
        if (!body.deviceType)
            missingFields.push('deviceType');
        if (!body.ownerName || !String(body.ownerName).trim())
            missingFields.push('ownerName');
        if (!body.location?.address || !String(body.location.address).trim())
            missingFields.push('location.address');
        if (!body.location?.city || !String(body.location.city).trim())
            missingFields.push('location.city');
        if (!body.location?.state || !String(body.location.state).trim())
            missingFields.push('location.state');
        if (body.location?.coordinates?.lat === undefined || body.location?.coordinates?.lng === undefined) {
            missingFields.push('location.coordinates');
        }
        if (missingFields.length > 0) {
            return res.json({
                success: false,
                error: `Missing required fields: ${missingFields.join(', ')}`,
                missingFields
            }, { status: 400 });
        }
        // Check if deviceId already exists
        const existingDevice = await prisma.adminDevice.findFirst({ where: { deviceId: body.deviceId.toUpperCase().trim() } });
        if (existingDevice) {
            return res.status(400).json({ success: false, error: 'Device ID already exists' });
        }
        const deviceData = {
            deviceId: String(body.deviceId).trim().toUpperCase(),
            deviceName: String(body.deviceName).trim(),
            deviceType: body.deviceType,
            ownerName: String(body.ownerName).trim(),
            registeredDate: body.registeredDate ? new Date(body.registeredDate) : new Date(),
            location: {
                address: String(body.location.address).trim(),
                city: String(body.location.city).trim(),
                state: String(body.location.state).trim(),
                zipCode: body.location.zipCode ? String(body.location.zipCode).trim() : '',
                coordinates: {
                    lat: Number(body.location.coordinates.lat),
                    lng: Number(body.location.coordinates.lng),
                },
            },
            batteryLevel: body.batteryLevel !== undefined ? Number(body.batteryLevel) : 100,
            signalStrength: body.signalStrength !== undefined ? Number(body.signalStrength) : 100,
            firmwareVersion: body.firmwareVersion || '2.4.1',
            lastSynced: body.lastSynced ? new Date(body.lastSynced) : new Date(),
            status: body.status || 'active',
            features: {
                gpsTracking: body.features?.gpsTracking !== undefined ? body.features.gpsTracking : true,
                sosButton: body.features?.sosButton !== undefined ? body.features.sosButton : true,
                heartRateMonitor: body.features?.heartRateMonitor !== undefined ? body.features.heartRateMonitor : false,
                fallDetection: body.features?.fallDetection !== undefined ? body.features.fallDetection : false,
            },
            primaryOwner: {
                name: body.primaryOwner?.name || String(body.ownerName).trim(),
                role: body.primaryOwner?.role || 'Device Owner',
                avatar: body.primaryOwner?.avatar || '',
            },
            familyMembers: Array.isArray(body.familyMembers) ? body.familyMembers.map((member) => ({
                name: String(member.name).trim(),
                role: member.role || 'Tracked Member',
                avatar: member.avatar || '',
            })) : [],
        };
        let device = await prisma.adminprisma.adminDevice.create({ data: { data: deviceData } });
        // Device.create returns an array if passed an array, but a single doc if passed an object
        if (Array.isArray(device)) {
            device = device[0];
        }
        return res.status(201).json({
            success: true,
            data: {
                id: device.id?.toString(),
                deviceId: device.deviceId,
                deviceName: device.deviceName,
                deviceType: device.deviceType,
                ownerName: device.ownerName,
                registeredDate: device.registeredDate?.toISOString() || new Date().toISOString(),
                location: device.location,
                batteryLevel: device.batteryLevel,
                signalStrength: device.signalStrength,
                firmwareVersion: device.firmwareVersion,
                lastSynced: device.lastSynced?.toISOString() || new Date().toISOString(),
                status: device.status,
                features: device.features,
                primaryOwner: device.primaryOwner,
                familyMembers: device.familyMembers,
                createdAt: device.createdAt?.toISOString() || new Date().toISOString(),
            },
        });
    }
    catch (error) {
        console.error('Create device error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }

  } catch (error) {
    console.error('post_devices error:', error);
    next(error);
  }
};

exports.put_devices = async (req, res, next) => {
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
        if (!body.id) {
            return res.status(400).json({ success: false, error: 'Device ID is required' });
        }
        let deviceId;
        try {
            deviceId = body.id;
        }
        catch (error) {
            return res.status(400).json({ success: false, error: 'Invalid device ID format' });
        }
        const device = await prisma.adminDevice.findUnique({ where: { id: deviceId } });
        if (!device) {
            return res.status(404).json({ success: false, error: 'Device not found' });
        }
        const updateData = {};
        if (body.deviceName !== undefined)
            updateData.deviceName = String(body.deviceName).trim();
        if (body.deviceType !== undefined)
            updateData.deviceType = body.deviceType;
        if (body.ownerName !== undefined)
            updateData.ownerName = String(body.ownerName).trim();
        if (body.batteryLevel !== undefined)
            updateData.batteryLevel = Math.max(0, Math.min(100, Number(body.batteryLevel)));
        if (body.signalStrength !== undefined)
            updateData.signalStrength = Math.max(0, Math.min(100, Number(body.signalStrength)));
        if (body.firmwareVersion !== undefined)
            updateData.firmwareVersion = String(body.firmwareVersion).trim();
        if (body.lastSynced !== undefined)
            updateData.lastSynced = new Date(body.lastSynced);
        if (body.status !== undefined)
            updateData.status = body.status;
        if (body.location !== undefined) {
            updateData.location = {
                address: body.location.address !== undefined ? String(body.location.address).trim() : device.location.address,
                city: body.location.city !== undefined ? String(body.location.city).trim() : device.location.city,
                state: body.location.state !== undefined ? String(body.location.state).trim() : device.location.state,
                zipCode: body.location.zipCode !== undefined ? String(body.location.zipCode).trim() : device.location.zipCode,
                coordinates: {
                    lat: body.location.coordinates?.lat !== undefined ? Number(body.location.coordinates.lat) : device.location.coordinates.lat,
                    lng: body.location.coordinates?.lng !== undefined ? Number(body.location.coordinates.lng) : device.location.coordinates.lng,
                },
            };
        }
        if (body.features !== undefined) {
            updateData.features = {
                gpsTracking: body.features.gpsTracking !== undefined ? body.features.gpsTracking : device.features.gpsTracking,
                sosButton: body.features.sosButton !== undefined ? body.features.sosButton : device.features.sosButton,
                heartRateMonitor: body.features.heartRateMonitor !== undefined ? body.features.heartRateMonitor : device.features.heartRateMonitor,
                fallDetection: body.features.fallDetection !== undefined ? body.features.fallDetection : device.features.fallDetection,
            };
        }
        if (body.primaryOwner !== undefined) {
            updateData.primaryOwner = {
                name: body.primaryOwner.name !== undefined ? String(body.primaryOwner.name).trim() : device.primaryOwner.name,
                role: body.primaryOwner.role !== undefined ? String(body.primaryOwner.role).trim() : device.primaryOwner.role,
                avatar: body.primaryOwner.avatar !== undefined ? String(body.primaryOwner.avatar).trim() : device.primaryOwner.avatar,
            };
        }
        if (body.familyMembers !== undefined) {
            updateData.familyMembers = Array.isArray(body.familyMembers) ? body.familyMembers.map((member) => ({
                name: String(member.name).trim(),
                role: member.role || 'Tracked Member',
                avatar: member.avatar || '',
            })) : [];
        }
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ success: false, error: 'No fields to update' });
        }
        // Use Prisma for update
        const updateResult = await prisma.adminDevice.update({
            where: { id: deviceId },
            data: {
                ...updateData,
                updatedAt: new Date(),
            }
        });
    if (!updateResult) {
        return res.status(404).json({ success: false, error: 'Device not found' });
    }
    const updatedDevice = await prisma.adminDevice.findUnique({ where: { id: deviceId } });
    if (!updatedDevice) {
        return res.status(404).json({ success: false, error: 'Device not found' });
    }
    return res.json({
        success: true,
        data: {
            id: updatedDevice.id.toString(),
            deviceId: updatedDevice.deviceId,
            deviceName: updatedDevice.deviceName,
            deviceType: updatedDevice.deviceType,
            ownerName: updatedDevice.ownerName,
            registeredDate: updatedDevice.registeredDate?.toISOString() || new Date().toISOString(),
            location: updatedDevice.location,
            batteryLevel: updatedDevice.batteryLevel,
            signalStrength: updatedDevice.signalStrength,
            firmwareVersion: updatedDevice.firmwareVersion,
            lastSynced: updatedDevice.lastSynced?.toISOString() || new Date().toISOString(),
            status: updatedDevice.status,
            features: updatedDevice.features,
            primaryOwner: updatedDevice.primaryOwner,
            familyMembers: updatedDevice.familyMembers,
            createdAt: updatedDevice.createdAt?.toISOString() || new Date().toISOString(),
        },
    });
    }
    catch (error) {
        console.error('Update device error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }

  } catch (error) {
    console.error('put_devices error:', error);
    next(error);
  }
};

exports.delete_devices = async (req, res, next) => {
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
        const id = req.query['id'];
        if (!id || id === 'undefined') return res.status(400).json({ success: false, error: 'Invalid device ID provided' });
        if (!id) {
            return res.status(400).json({ success: false, error: 'Device ID is required' });
        }
        let deviceId;
        try {
            deviceId = id;
        }
        catch (error) {
            return res.status(400).json({ success: false, error: 'Invalid device ID format' });
        }
        const deleteResult = await prisma.adminDevice.deleteMany({ where: { id: deviceId } });
        if (deleteResult.deletedCount === 0) {
            return res.status(404).json({ success: false, error: 'Device not found' });
        }
        return res.json({
            success: true,
            message: 'Device deleted successfully',
        });
    }
    catch (error) {
        console.error('Delete device error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }

  } catch (error) {
    console.error('delete_devices error:', error);
    next(error);
  }
};

// ─── devices/seed ───
exports.post_devices_seed = async (req, res, next) => {
  try {

    try {
        // Clear existing devices
        await prisma.adminDevice.deleteMany({ where: {} });
        // Sample device data based on the images
        const sampleDevices = [
            {
                deviceId: 'R3S-WR-0001',
                deviceName: 'R3sults Watch Pro',
                deviceType: 'watch_pro',
                ownerName: 'John Smith',
                registeredDate: new Date('2024-01-15'),
                location: {
                    address: '123 Main St',
                    city: 'Miami',
                    state: 'FL',
                    zipCode: '33101',
                    coordinates: {
                        lat: 25.7617,
                        lng: -80.1918,
                    },
                },
                batteryLevel: 85,
                signalStrength: 92,
                firmwareVersion: '2.4.1',
                lastSynced: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
                status: 'active',
                features: {
                    gpsTracking: true,
                    sosButton: true,
                    heartRateMonitor: true,
                    fallDetection: true,
                },
                primaryOwner: {
                    name: 'John Smith',
                    role: 'Device Owner',
                    avatar: '',
                },
                familyMembers: [
                    {
                        name: 'Jane Smith',
                        role: 'Tracked Member',
                        avatar: '',
                    },
                    {
                        name: 'Emily Smith',
                        role: 'Tracked Member',
                        avatar: '',
                    },
                    {
                        name: 'Michael Smith',
                        role: 'Tracked Member',
                        avatar: '',
                    },
                ],
            },
            {
                deviceId: 'R3S-WR-0002',
                deviceName: 'R3sults Watch Lite',
                deviceType: 'watch_lite',
                ownerName: 'Sarah Johnson',
                registeredDate: new Date('2024-01-20'),
                location: {
                    address: '456 Oak Ave',
                    city: 'Tampa',
                    state: 'FL',
                    zipCode: '33602',
                    coordinates: {
                        lat: 27.9506,
                        lng: -82.4572,
                    },
                },
                batteryLevel: 45,
                signalStrength: 78,
                firmwareVersion: '2.4.1',
                lastSynced: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
                status: 'active',
                features: {
                    gpsTracking: true,
                    sosButton: true,
                    heartRateMonitor: false,
                    fallDetection: false,
                },
                primaryOwner: {
                    name: 'Sarah Johnson',
                    role: 'Device Owner',
                    avatar: '',
                },
                familyMembers: [
                    {
                        name: 'David Johnson',
                        role: 'Tracked Member',
                        avatar: '',
                    },
                    {
                        name: 'Lisa Johnson',
                        role: 'Guardian',
                        avatar: '',
                    },
                ],
            },
            {
                deviceId: 'R3S-WR-0003',
                deviceName: 'R3sults Watch Pro',
                deviceType: 'watch_pro',
                ownerName: 'Michael Brown',
                registeredDate: new Date('2024-02-01'),
                location: {
                    address: '789 Pine St',
                    city: 'Orlando',
                    state: 'FL',
                    zipCode: '32801',
                    coordinates: {
                        lat: 28.5383,
                        lng: -81.3792,
                    },
                },
                batteryLevel: 92,
                signalStrength: 88,
                firmwareVersion: '2.3.5',
                lastSynced: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
                status: 'active',
                features: {
                    gpsTracking: true,
                    sosButton: true,
                    heartRateMonitor: true,
                    fallDetection: true,
                },
                primaryOwner: {
                    name: 'Michael Brown',
                    role: 'Device Owner',
                    avatar: '',
                },
                familyMembers: [
                    {
                        name: 'Emma Brown',
                        role: 'Tracked Member',
                        avatar: '',
                    },
                ],
            },
            {
                deviceId: 'R3S-WR-0004',
                deviceName: 'R3sults Watch Lite',
                deviceType: 'watch_lite',
                ownerName: 'Jennifer Davis',
                registeredDate: new Date('2024-02-10'),
                location: {
                    address: '321 Elm St',
                    city: 'Jacksonville',
                    state: 'FL',
                    zipCode: '32202',
                    coordinates: {
                        lat: 30.3322,
                        lng: -81.6557,
                    },
                },
                batteryLevel: 67,
                signalStrength: 95,
                firmwareVersion: '2.4.1',
                lastSynced: new Date(Date.now() - 1 * 60 * 1000), // 1 minute ago
                status: 'active',
                features: {
                    gpsTracking: true,
                    sosButton: true,
                    heartRateMonitor: false,
                    fallDetection: false,
                },
                primaryOwner: {
                    name: 'Jennifer Davis',
                    role: 'Device Owner',
                    avatar: '',
                },
                familyMembers: [],
            },
            {
                deviceId: 'R3S-WR-0005',
                deviceName: 'R3sults Watch Pro',
                deviceType: 'watch_pro',
                ownerName: 'Robert Wilson',
                registeredDate: new Date('2024-02-15'),
                location: {
                    address: '654 Maple Dr',
                    city: 'Fort Lauderdale',
                    state: 'FL',
                    zipCode: '33301',
                    coordinates: {
                        lat: 26.1224,
                        lng: -80.1373,
                    },
                },
                batteryLevel: 23,
                signalStrength: 65,
                firmwareVersion: '2.4.0',
                lastSynced: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
                status: 'offline',
                features: {
                    gpsTracking: true,
                    sosButton: true,
                    heartRateMonitor: true,
                    fallDetection: true,
                },
                primaryOwner: {
                    name: 'Robert Wilson',
                    role: 'Device Owner',
                    avatar: '',
                },
                familyMembers: [
                    {
                        name: 'Olivia Wilson',
                        role: 'Tracked Member',
                        avatar: '',
                    },
                    {
                        name: 'James Wilson',
                        role: 'Tracked Member',
                        avatar: '',
                    },
                    {
                        name: 'Sophia Wilson',
                        role: 'Guardian',
                        avatar: '',
                    },
                ],
            },
        ];
        const devices = await prisma.adminDevice.createMany({ data: sampleDevices });
        return res.json({
            success: true,
            message: `Seeded ${devices.length} devices`,
            count: devices.length,
        });
    }
    catch (error) {
        console.error('Seed devices error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }

  } catch (error) {
    console.error('post_devices_seed error:', error);
    next(error);
  }
};
