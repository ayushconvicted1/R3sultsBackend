const prisma = require('../lib/prisma');

const EARTH_RADIUS_MI = 3959;

function haversineMiles(lat1, lon1, lat2, lon2) {
  const toRad = (n) => (n * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_MI * c;
}

function getValue(val, defaultValue = '') {
  return val !== null && val !== undefined ? val : defaultValue;
}

function formatLastUpdated(updatedAt) {
  const date = typeof updatedAt === 'string' ? new Date(updatedAt) : updatedAt;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return 'Updated just now';
  if (diffMins < 60) return `Updated ${diffMins} min ago`;
  if (diffHours < 24) return `Updated ${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  return `Updated ${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

/**
 * GET /api/resource-locator/categories
 * Public — returns static resource categories.
 */
exports.getCategories = async (_req, res, next) => {
  try {
    const categories = [
      { id: 'shelter', label: 'Shelter Locator', icon: 'shelter', slug: 'shelter' },
      { id: 'food', label: 'Food Supply', icon: 'food', slug: 'food' },
      { id: 'insurance', label: 'Insurance Portal', icon: 'insurance', slug: 'insurance' },
      { id: 'medical', label: 'Medical Assistance', icon: 'medical', slug: 'medical' },
      { id: 'other', label: 'Other', icon: 'other', slug: 'other' },
    ];
    res.json({ success: true, data: { categories } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/resource-locator/resources
 * Public — lists shelters with search, pagination, and distance.
 * Query: search, category, lat, lng, page, limit
 */
exports.getResources = async (req, res, next) => {
  try {
    const search = (req.query.search || '').trim();
    const category = (req.query.category || 'shelter').toLowerCase();
    const latParam = req.query.lat;
    const lngParam = req.query.lng;
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));

    const userLat = latParam ? parseFloat(latParam) : null;
    const userLng = lngParam ? parseFloat(lngParam) : null;

    // Only "shelter" is backed by DB for now
    if (category !== 'shelter' && category !== '') {
      return res.json({
        success: true,
        data: [],
        pagination: { page: 1, limit, total: 0, pages: 0 },
      });
    }

    const where = { status: 'active' };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { state: { contains: search, mode: 'insensitive' } },
        { addressLine1: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [shelters, total] = await Promise.all([
      prisma.adminShelter.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.adminShelter.count({ where }),
    ]);

    const items = shelters.map((s) => {
      const addressLine1 = getValue(s.addressLine1) || getValue(s.address) || '';
      const lat = Number(s.coordinates?.lat) || 0;
      const lng = Number(s.coordinates?.lng) || 0;
      let distanceMiles = null;
      if (userLat != null && userLng != null && (lat !== 0 || lng !== 0)) {
        distanceMiles = Math.round(haversineMiles(userLat, userLng, lat, lng) * 10) / 10;
      }

      const facilities = Array.isArray(s.facilities) ? s.facilities : [];
      const servicesOffered = facilities.length
        ? facilities
        : s.description ? ['Emergency shelter & support'] : ['Support services'];

      return {
        id: s.id.toString(),
        category: 'shelter',
        name: getValue(s.name, ''),
        serviceDescription: getValue(s.description, '') || 'Emergency shelter & food support.',
        lastUpdated: formatLastUpdated(s.updatedAt || s.createdAt || new Date()),
        updatedAt: (s.updatedAt || s.createdAt)?.toISOString?.() || new Date().toISOString(),
        distanceMiles,
        servicesOffered,
        hasLiveChat: false,
        hasSOS: false,
        isBookmarked: false,
        coordinates: { lat, lng },
        addressLine1: addressLine1 || '',
        city: getValue(s.city, ''),
        state: getValue(s.state, ''),
        zipCode: getValue(s.zipCode, ''),
        contactPhone: getValue(s.contactPhone, ''),
        contactEmail: getValue(s.contactEmail, ''),
        operatingHours: getValue(s.operatingHours, ''),
        status: getValue(s.status, 'active'),
      };
    });

    res.json({
      success: true,
      data: items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Resource locator list error:', error);
    next(error);
  }
};

/**
 * GET /api/resource-locator/resources/:id
 * Public — single resource detail.
 */
exports.getResourceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Resource ID is required' });
    }

    const category = (req.query.category || 'shelter').toLowerCase();
    if (category !== 'shelter') {
      return res.status(404).json({ success: false, error: 'Resource not found' });
    }

    const shelter = await prisma.adminShelter.findUnique({ where: { id } });
    if (!shelter) {
      return res.status(404).json({ success: false, error: 'Resource not found' });
    }

    const s = shelter;
    const addressLine1 = getValue(s.addressLine1) || getValue(s.address) || '';
    const coordinates =
      s.coordinates && typeof s.coordinates === 'object'
        ? { lat: Number(s.coordinates.lat) || 0, lng: Number(s.coordinates.lng) || 0 }
        : { lat: 0, lng: 0 };
    const facilities = Array.isArray(s.facilities) ? s.facilities : [];

    const data = {
      id: s.id.toString(),
      category: 'shelter',
      name: getValue(s.name, ''),
      serviceDescription: getValue(s.description, '') || 'Emergency shelter & food support.',
      updatedAt: (s.updatedAt || s.createdAt)?.toISOString?.() || new Date().toISOString(),
      servicesOffered: facilities.length ? facilities : ['Emergency shelter & support'],
      hasLiveChat: false,
      hasSOS: false,
      isBookmarked: false,
      coordinates,
      addressLine1: addressLine1 || '',
      addressLine2: getValue(s.addressLine2, ''),
      city: getValue(s.city, ''),
      state: getValue(s.state, ''),
      zipCode: getValue(s.zipCode, ''),
      country: getValue(s.country, 'United States'),
      contactPerson: getValue(s.contactPerson, ''),
      contactPhone: getValue(s.contactPhone, ''),
      contactEmail: getValue(s.contactEmail, ''),
      website: getValue(s.website, ''),
      operatingHours: getValue(s.operatingHours, ''),
      description: getValue(s.description, ''),
      notes: getValue(s.notes, ''),
      facilities,
      capacity: getValue(s.capacity, 0),
      currentOccupancy: getValue(s.currentOccupancy, 0),
      status: getValue(s.status, 'active'),
      type: getValue(s.type, 'temporary'),
    };

    res.json({ success: true, data });
  } catch (error) {
    console.error('Resource locator detail error:', error);
    next(error);
  }
};
