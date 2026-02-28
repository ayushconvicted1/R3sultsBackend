const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'results-jwt-secret-key-2024';

// ─── seed ───
exports.get_seed = async (req, res, next) => {
  try {

    try {
        // Create Super Admin
        const superAdmin = await prisma.adminprisma.adminUser.create({ data: { data: {
                    firstName: 'Super',
                    lastName: 'Admin',
                    name: 'Super Admin',
                    email: 'superadmin@results.com',
                    password: await bcrypt.hash('superadmin123'),
                    role: 'super_admin',
                    status: 'active',
                    address: { city: 'Delhi', country: 'India' },
                } } });
        // Create Admin
        const admin = await prisma.adminprisma.adminUser.create({ data: { data: {
                    firstName: 'Admin',
                    lastName: 'User',
                    name: 'Admin',
                    email: 'admin@results.com',
                    password: await bcrypt.hash('admin123'),
                    role: 'admin',
                    status: 'active',
                    address: { city: 'Mumbai', country: 'India' },
                } } });
        const volunteerData = [
            { name: 'Sneha Gupta', email: 'sneha@results.com', phone: '+91 9876543215', city: 'Kolkata' },
            { name: 'Vikram Singh', email: 'vikram@results.com', phone: '+91 9876543216', city: 'Bangalore' },
        ];
        // Default profile images for volunteers
        const defaultProfileImages = [
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
            'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
            'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face',
            'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face',
            'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
        ];
        // Hash password for volunteers
        const volunteerPassword = await bcrypt.hash('volunteer123');
        const volunteers = [];
        for (let i = 0; i < volunteerData.length; i++) {
            const vol = volunteerData[i];
            const firstName = vol.name.split(' ')[0];
            const lastName = vol.name.split(' ').slice(1).join(' ');
            const user = await prisma.adminprisma.adminUser.create({ data: { data: {
                        firstName,
                        lastName,
                        name: vol.name,
                        email: vol.email,
                        password: volunteerPassword,
                        phone: vol.phone,
                        role: 'volunteer',
                        status: 'active',
                        address: { city: vol.city, country: 'India' },
                    } } });
            const volunteer = await prisma.adminprisma.adminVolunteer.create({ data: { data: {
                        userId: user.id.toString(),
                        skills: ['First Aid', 'Rescue Operations', 'Communication'],
                        availability: 'available',
                        currentLocation: {
                            type: "Point",
                            coordinates: [77.2090 + Math.random() * 5, 28.6139 + Math.random() * 5],
                        },
                        completedMissions: Math.floor(Math.random() * 20),
                        rating: 4 + Math.random(),
                        profileImage: defaultProfileImages[i % defaultProfileImages.length],
                        certifications: [
                            { name: 'CPR Certified', issuedBy: 'Red Cross', issuedDate: new Date('2023-01-15') },
                            { name: 'Disaster Response Training', issuedBy: 'NDMA', issuedDate: new Date('2023-06-20') },
                        ],
                    } } });
            volunteers.push({ user, volunteer });
        }
        // Create Service Providers
        const serviceProviderPassword = await bcrypt.hash('service123');
        const serviceProviderData = [
            {
                name: 'Quick Medical Services',
                email: 'medical@results.com',
                businessName: 'Quick Medical Services',
                category: 'medical',
                city: 'Delhi',
            },
            {
                name: 'Safe Transport Co.',
                email: 'transport@results.com',
                businessName: 'Safe Transport Co.',
                category: 'transportation',
                city: 'Mumbai',
            },
            {
                name: 'Shelter Solutions',
                email: 'shelter@results.com',
                businessName: 'Shelter Solutions Pvt Ltd',
                category: 'shelter',
                city: 'Chennai',
            },
            {
                name: 'Food Relief India',
                email: 'food@results.com',
                businessName: 'Food Relief India',
                category: 'food_water',
                city: 'Kolkata',
            },
        ];
        // Sample service images by category
        const serviceImages = {};
        const providerGalleryImages = [];
        const serviceProviders = [];
        for (const sp of serviceProviderData) {
            const spFirst = sp.name.split(' ')[0];
            const spLast = sp.name.split(' ').slice(1).join(' ');
            const user = await prisma.adminprisma.adminUser.create({ data: { data: {
                        firstName: spFirst,
                        lastName: spLast,
                        name: sp.name,
                        email: sp.email,
                        password: serviceProviderPassword,
                        role: 'service_provider',
                        status: 'active',
                        address: { city: sp.city, country: 'India' },
                    } } });
            const serviceProvider = await prisma.adminprisma.adminServiceProvider.create({ data: { data: {
                        providerId: 'SP' + Math.floor(100000 + Math.random() * 900000).toString(),
                        userId: user.id.toString(),
                        businessName: sp.businessName,
                        category: sp.category,
                        description: `Service provider for ${sp.category.replace('_', ' ')}`,
                        logo: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&h=200&fit=crop',
                        coverImage: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&h=400&fit=crop',
                        gallery: [],
                        services: [
                            {
                                name: `Emergency ${sp.category.replace('_', ' ')} Service`,
                                description: 'Available 24/7 for emergency situations',
                                price: 0,
                                priceType: 'negotiable',
                                isActive: true,
                            },
                            {
                                name: `Standard ${sp.category.replace('_', ' ')} Support`,
                                description: 'Regular support and assistance services',
                                price: 500,
                                priceType: 'hourly',
                                isActive: true,
                            },
                        ],
                        location: {
                            type: 'Point',
                            coordinates: [77.2090 + Math.random() * 5, 28.6139 + Math.random() * 5],
                            address: '123 Service Street',
                            city: sp.city,
                            state: 'State',
                            zipCode: '110001',
                        },
                        rating: 4 + Math.random(),
                        verified: true,
                        isAvailableForEmergency: true,
                        subcategories: [],
                        operatingHours: [],
                        totalReviews: 0,
                        documents: [],
                    } } });
            serviceProviders.push({ user, serviceProvider });
        }
        // Create Sample Disasters
        const disasters = [
            {
                title: 'Flood in Bihar',
                description: 'Heavy flooding in multiple districts due to excessive rainfall.',
                type: 'flood',
                severity: 'high',
                status: 'active',
                location: {
                    type: 'Point',
                    coordinates: [85.3131, 25.5941],
                    address: 'Patna District',
                    city: 'Patna',
                    state: 'Bihar',
                    country: 'India',
                },
                affectedArea: 150,
                affectedPopulation: 50000,
                casualties: { deaths: 12, injured: 45, missing: 8 },
                resources: { volunteersDeployed: 25, serviceProvidersEngaged: 8, fundsAllocated: 5000000, suppliesDistributed: [] },
                reportedBy: superAdmin.id.toString(),
                reportedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                images: [],
                updates: [],
            },
            {
                title: 'Earthquake in Gujarat',
                description: 'Moderate earthquake measuring 5.2 on Richter scale.',
                type: 'earthquake',
                severity: 'medium',
                status: 'monitoring',
                location: {
                    type: 'Point',
                    coordinates: [72.8777, 19.0760],
                    address: 'Kutch District',
                    city: 'Bhuj',
                    state: 'Gujarat',
                    country: 'India',
                },
                affectedArea: 80,
                affectedPopulation: 15000,
                casualties: { deaths: 2, injured: 28, missing: 0 },
                resources: { volunteersDeployed: 15, serviceProvidersEngaged: 5, fundsAllocated: 2000000, suppliesDistributed: [] },
                reportedBy: admin.id.toString(),
                reportedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
                startedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
                images: [],
                updates: [],
            },
            {
                title: 'Cyclone Alert - Odisha Coast',
                description: 'Cyclone approaching eastern coast with expected landfall in 48 hours.',
                type: 'cyclone',
                severity: 'critical',
                status: 'active',
                location: {
                    type: 'Point',
                    coordinates: [85.8245, 20.2961],
                    address: 'Coastal Odisha',
                    city: 'Puri',
                    state: 'Odisha',
                    country: 'India',
                },
                affectedArea: 300,
                affectedPopulation: 200000,
                casualties: { deaths: 0, injured: 5, missing: 0 },
                resources: { volunteersDeployed: 100, serviceProvidersEngaged: 25, fundsAllocated: 15000000, suppliesDistributed: [] },
                reportedBy: superAdmin.id.toString(),
                reportedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                images: [],
                updates: [],
            },
        ];
        const createdDisasters = [];
        for (const disaster of disasters) {
            const created = await prisma.adminprisma.adminDisaster.create({ data: { data: disaster } });
            createdDisasters.push(created);
        }
        // Create Sample Emergencies
        const emergencies = [
            {
                title: 'Family Trapped - Urgent Evacuation',
                description: 'Family of 5 trapped on rooftop due to rising water levels.',
                type: 'evacuation',
                priority: 'critical',
                status: 'in_progress',
                disasterId: createdDisasters[0].id,
                location: {
                    type: 'Point',
                    coordinates: [85.3131, 25.5941],
                    address: 'Near Patna Junction, Bihar',
                },
                requestedBy: { name: 'Rajesh Kumar', phone: '+91 9876543220' },
                assignedTo: [volunteers[0].volunteer.id.toString()],
                notes: [],
                numberOfPeople: 5,
                specialRequirements: ['Elderly person needs wheelchair', 'Infant present'],
            },
            {
                title: 'Medical Emergency - Heart Patient',
                description: 'Heart patient needs immediate medical attention and evacuation.',
                type: 'medical',
                priority: 'critical',
                status: 'dispatched',
                disasterId: createdDisasters[0].id,
                location: {
                    type: 'Point',
                    coordinates: [85.4131, 25.6941],
                    address: 'Danapur Area, Bihar',
                },
                requestedBy: { name: 'Sunita Devi', phone: '+91 9876543221' },
                assignedTo: [volunteers[1].volunteer.id.toString(), volunteers[2].volunteer.id.toString()],
                notes: [],
                numberOfPeople: 2,
                specialRequirements: ['Oxygen cylinder needed', 'Stretcher required'],
            },
            {
                title: 'Supply Delivery - Relief Camp',
                description: 'Relief camp running low on food and water supplies.',
                type: 'supply_delivery',
                priority: 'high',
                status: 'pending',
                location: {
                    type: 'Point',
                    coordinates: [85.2131, 25.4941],
                    address: 'Community Hall, Darbhanga',
                },
                requestedBy: { name: 'Camp Coordinator', phone: '+91 9876543222' },
                numberOfPeople: 200,
                specialRequirements: ['Drinking water - 500L', 'Food packets - 400', 'Blankets - 100'],
                assignedTo: [],
                notes: [],
            },
        ];
        for (const emergency of emergencies) {
            await prisma.adminprisma.adminEmergency.create({ data: { data: emergency } });
        }
        return res.json({
            success: true,
            message: 'Database seeded successfully!',
            data: {
                superAdmin: { email: 'superadmin@results.com', password: 'superadmin123' },
                admin: { email: 'admin@results.com', password: 'admin123' },
                volunteer: { email: 'rahul@results.com', password: 'volunteer123' },
                serviceProvider: { email: 'medical@results.com', password: 'service123' },
            },
        });
    }
    catch (error) {
        console.error('Seed error:', error);
        return res.status(500).json({ success: false, error: 'Failed to seed database' });
    }

  } catch (error) {
    console.error('get_seed error:', error);
    next(error);
  }
};
