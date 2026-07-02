const crypto = require('crypto');
const prisma = require('../lib/prisma');

const MERGED_API_URL = 'https://results-admin-dashboard.vercel.app/api/merged-live-disasters';
const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── Type → ID Prefix Mapping ───
const TYPE_PREFIX_MAP = {
  hurricane: 'HC',
  flood: 'FL',
  wildfire: 'WF',
  snowstorm: 'SS',
  tornado: 'TD',
  earthquake: 'EQ',
  volcanic: 'VE',
  power_outage: 'PO',
  extreme_weather: 'EW',
};

// ─── Generate a 6-char hex-uppercase suffix ───
function generateSuffix() {
  // Produces 6 random hex chars in uppercase (0-9, A-F)
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

// ─── Generate a typed disaster ID ───
function generateDisasterId(type) {
  const prefix = TYPE_PREFIX_MAP[type] || 'DX'; // DX = unknown type fallback
  return `${prefix}-${generateSuffix()}`;
}

// ─── Generate a deterministic fingerprint for dedup ───
function generateFingerprint(disaster) {
  // For EONET events with stable IDs, use the ID directly
  if (disaster.id && disaster.id.startsWith('EONET_')) {
    return `eonet:${disaster.id}`;
  }

  // For USGS/Weather.gov: hash title + rounded coordinates + source
  const roundedLat = Math.round((disaster.location?.coordinates?.lat || 0) * 100) / 100;
  const roundedLng = Math.round((disaster.location?.coordinates?.lng || 0) * 100) / 100;
  const raw = `${disaster.title}|${roundedLat}|${roundedLng}|${disaster.source}`;
  return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 32);
}

// ─── Fetch from merged live disasters API ───
async function fetchFromMergedAPI() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const res = await fetch(MERGED_API_URL, {
      signal: controller.signal,
      headers: { 'User-Agent': 'R3sults-Backend/2.0' },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.error(`Merged disasters API returned ${res.status}`);
      return [];
    }

    const data = await res.json();
    if (!data.success || !data.data?.disasters) {
      console.error('Merged disasters API returned unexpected shape');
      return [];
    }

    return data.data.disasters;
  } catch (err) {
    console.error('Failed to fetch from merged disasters API:', err.message);
    return [];
  }
}

// ─── Check if sync is needed (24h since last fetch) ───
async function isSyncNeeded() {
  try {
    const meta = await prisma.cacheMetadata.findUnique({ where: { id: 'disasters' } });
    if (!meta) return true;
    return Date.now() - meta.lastFetch.getTime() > SYNC_INTERVAL_MS;
  } catch {
    return true;
  }
}

// ─── Sync disasters from the merged API ───
async function syncDisasters() {
  console.log('🔄 Syncing disasters from merged API...');

  const apiDisasters = await fetchFromMergedAPI();

  if (apiDisasters.length === 0) {
    console.log('  ⚠️ No disasters returned from API, skipping sync');
    // Still update the timestamp so we don't hammer the API
    await prisma.cacheMetadata.upsert({
      where: { id: 'disasters' },
      update: { lastFetch: new Date() },
      create: { id: 'disasters', lastFetch: new Date() },
    });
    return;
  }

  const now = new Date();
  let created = 0;
  let updated = 0;

  // Process each disaster from the API
  for (const apiDisaster of apiDisasters) {
    const fingerprint = generateFingerprint(apiDisaster);

    const lat = apiDisaster.location?.coordinates?.lat || 0;
    const lng = apiDisaster.location?.coordinates?.lng || 0;

    // Check if this disaster already exists in our DB
    const existing = await prisma.disaster.findUnique({ where: { fingerprint } });

    if (existing) {
      // UPDATE — keep the same custom ID, update mutable fields
      await prisma.disaster.update({
        where: { fingerprint },
        data: {
          sourceId: apiDisaster.id,
          title: apiDisaster.title,
          description: apiDisaster.description || '',
          severity: apiDisaster.severity || 'medium',
          status: apiDisaster.status || 'open',
          lat,
          lng,
          magnitude: apiDisaster.magnitude || null,
          magnitudeUnit: apiDisaster.magnitudeUnit || null,
          date: new Date(apiDisaster.date || now),
          isActive: true,
          lastSeenAt: now,
        },
      });
      updated++;
    } else {
      // CREATE — generate a new custom ID
      const customId = generateDisasterId(apiDisaster.type);
      await prisma.disaster.create({
        data: {
          id: customId,
          sourceId: apiDisaster.id,
          fingerprint,
          source: apiDisaster.source || 'Unknown',
          type: apiDisaster.type || 'other',
          category: apiDisaster.category || apiDisaster.type || 'other',
          title: apiDisaster.title || 'Unknown Disaster',
          description: apiDisaster.description || '',
          severity: apiDisaster.severity || 'medium',
          status: apiDisaster.status || 'open',
          lat,
          lng,
          magnitude: apiDisaster.magnitude || null,
          magnitudeUnit: apiDisaster.magnitudeUnit || null,
          date: new Date(apiDisaster.date || now),
          isActive: true,
          isManual: false,
          lastSeenAt: now,
          fetchedAt: now,
        },
      });
      created++;
    }
  }

  // Mark disasters that were NOT seen in this sync as inactive
  // (but only API-sourced ones — never deactivate manually created ones)
  await prisma.disaster.updateMany({
    where: {
      isManual: false,
      lastSeenAt: { lt: now },
      isActive: true,
    },
    data: { isActive: false },
  });

  // Update sync timestamp
  await prisma.cacheMetadata.upsert({
    where: { id: 'disasters' },
    update: { lastFetch: now },
    create: { id: 'disasters', lastFetch: now },
  });

  console.log(`  ✅ Sync complete — ${created} created, ${updated} updated, total API events: ${apiDisasters.length}`);
}

// ─── Ensure fresh data, then return from DB ───
async function ensureFreshData() {
  const needed = await isSyncNeeded();
  if (needed) {
    await syncDisasters();
  }
}

// ─── Create a manual disaster ───
async function createDisaster(disasterData) {
  const customId = generateDisasterId(disasterData.type);
  const fingerprint = `manual:${customId}`;
  const now = new Date();

  const disaster = await prisma.disaster.create({
    data: {
      id: customId,
      sourceId: `manual-${customId}`,
      fingerprint,
      source: 'manual',
      type: disasterData.type || 'other',
      category: disasterData.category || disasterData.type || 'other',
      title: disasterData.title,
      description: disasterData.description || '',
      severity: disasterData.severity || 'medium',
      status: disasterData.status || 'open',
      lat: disasterData.location?.coordinates?.lat || disasterData.lat || 0,
      lng: disasterData.location?.coordinates?.lng || disasterData.lng || 0,
      magnitude: disasterData.magnitude || null,
      magnitudeUnit: disasterData.magnitudeUnit || null,
      date: disasterData.date ? new Date(disasterData.date) : now,
      isActive: true,
      isManual: true,
      lastSeenAt: now,
      fetchedAt: now,
    },
  });

  return disaster;
}

// ─── Query disasters from DB with filters ───
async function getDisasters(filters = {}) {
  await ensureFreshData();

  const where = {
    isActive: true, // Default: only active disasters
  };

  // Allow overriding isActive filter
  if (filters.includeInactive === 'true' || filters.includeInactive === true) {
    delete where.isActive;
  }

  if (filters.source) {
    where.source = Array.isArray(filters.source) ? { in: filters.source } : filters.source;
  }
  if (filters.type) {
    where.type = Array.isArray(filters.type) ? { in: filters.type } : filters.type;
  }
  if (filters.severity) {
    where.severity = Array.isArray(filters.severity) ? { in: filters.severity } : filters.severity;
  }
  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.category) {
    where.category = filters.category;
  }

  // Search filter
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const limit = Math.min(parseInt(filters.limit) || 100, 500);

  const items = await prisma.disaster.findMany({
    where,
    orderBy: { date: 'desc' },
    take: limit,
  });

  const total = await prisma.disaster.count({ where });

  // Count by source
  const sourceCounts = {};
  const sourceAgg = await prisma.disaster.groupBy({
    by: ['source'],
    where,
    _count: true,
  });
  sourceAgg.forEach((s) => {
    sourceCounts[s.source] = s._count;
  });

  // Transform to response shape
  const transformed = items.map((d) => ({
    id: d.id,
    sourceId: d.sourceId,
    source: d.source,
    type: d.type,
    category: d.category,
    title: d.title,
    description: d.description,
    severity: d.severity,
    status: d.status,
    location: {
      coordinates: { lat: d.lat, lng: d.lng },
    },
    magnitude: d.magnitude,
    magnitudeUnit: d.magnitudeUnit,
    date: d.date.toISOString(),
    isLive: d.isActive,
    isManual: d.isManual,
    fetchedAt: d.fetchedAt.toISOString(),
    lastSeenAt: d.lastSeenAt.toISOString(),
  }));

  return {
    total,
    count: transformed.length,
    sources: sourceCounts,
    filters: {
      type: filters.type,
      severity: filters.severity,
      source: filters.source,
      status: filters.status,
      search: filters.search,
      limit,
    },
    items: transformed,
  };
}

// ─── Get a single disaster by ID ───
async function getDisasterById(id) {
  const disaster = await prisma.disaster.findUnique({ where: { id } });
  if (!disaster) return null;

  return {
    id: disaster.id,
    sourceId: disaster.sourceId,
    source: disaster.source,
    type: disaster.type,
    category: disaster.category,
    title: disaster.title,
    description: disaster.description,
    severity: disaster.severity,
    status: disaster.status,
    location: {
      coordinates: { lat: disaster.lat, lng: disaster.lng },
    },
    magnitude: disaster.magnitude,
    magnitudeUnit: disaster.magnitudeUnit,
    date: disaster.date.toISOString(),
    isLive: disaster.isActive,
    isManual: disaster.isManual,
    fetchedAt: disaster.fetchedAt.toISOString(),
    lastSeenAt: disaster.lastSeenAt.toISOString(),
  };
}

module.exports = {
  getDisasters,
  getDisasterById,
  createDisaster,
  syncDisasters,
  isSyncNeeded,
  generateDisasterId,
};
