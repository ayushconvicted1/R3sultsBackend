const prisma = require('../lib/prisma');

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ─── NWS Event Type → Our Type Mapping ───
const NWS_TYPE_MAP = {
  'Tornado Warning': 'tornado',
  'Tornado Watch': 'tornado',
  'Tornado Emergency': 'tornado',
  'Severe Thunderstorm Warning': 'tornado',
  'Severe Thunderstorm Watch': 'tornado',
  'Hurricane Warning': 'hurricane',
  'Hurricane Watch': 'hurricane',
  'Hurricane Local Statement': 'hurricane',
  'Tropical Storm Warning': 'hurricane',
  'Tropical Storm Watch': 'hurricane',
  'Flash Flood Warning': 'flood',
  'Flash Flood Watch': 'flood',
  'Flood Warning': 'flood',
  'Flood Watch': 'flood',
  'Flood Advisory': 'flood',
  'Coastal Flood Warning': 'flood',
  'Coastal Flood Watch': 'flood',
  'Coastal Flood Advisory': 'flood',
  'River Flood Warning': 'flood',
  'River Flood Watch': 'flood',
  'Red Flag Warning': 'wildfire',
  'Fire Weather Watch': 'wildfire',
  'Fire Warning': 'wildfire',
  'Earthquake Warning': 'earthquake',
  'Tsunami Warning': 'earthquake',
  'Tsunami Watch': 'earthquake',
  'Tsunami Advisory': 'earthquake',
};

// ─── NWS Severity → Our Severity ───
const NWS_SEVERITY_MAP = {
  'Extreme': 'extreme',
  'Severe': 'severe',
  'Moderate': 'moderate',
  'Minor': 'minor',
  'Unknown': 'minor',
};

// ─── USGS Magnitude → Our Severity ───
function magnitudeToSeverity(mag) {
  if (mag >= 7.0) return 'extreme';
  if (mag >= 5.0) return 'severe';
  if (mag >= 3.0) return 'moderate';
  return 'minor';
}

// ─── Extract state from NWS area description ───
function extractState(areaDesc) {
  if (!areaDesc) return 'Unknown';
  // NWS area descriptions often end with state abbreviations like "..., TX"
  const parts = areaDesc.split(';');
  const firstArea = parts[0].trim();
  const commaIdx = firstArea.lastIndexOf(',');
  if (commaIdx !== -1) {
    const stateCode = firstArea.slice(commaIdx + 1).trim();
    if (stateCode.length === 2) return stateCode;
  }
  return firstArea.slice(0, 30);
}

// ─── Fetch from NWS ───
async function fetchFromNWS() {
  try {
    const url = 'https://api.weather.gov/alerts/active?status=actual&message_type=alert';
    const res = await fetch(url, {
      headers: {
        'User-Agent': '(R3sults Disaster App, contact@r3sults.com)',
        'Accept': 'application/geo+json',
      },
    });

    if (!res.ok) {
      console.error(`NWS API returned ${res.status}`);
      return [];
    }

    const data = await res.json();
    const features = data.features || [];

    return features
      .filter((f) => {
        const event = f.properties?.event || '';
        return NWS_TYPE_MAP[event] !== undefined;
      })
      .slice(0, 100) // Limit to 100 most relevant alerts
      .map((f) => {
        const p = f.properties;
        const event = p.event || 'Unknown';
        const type = NWS_TYPE_MAP[event] || 'other';
        const severity = NWS_SEVERITY_MAP[p.severity] || 'minor';
        const areaDesc = p.areaDesc || '';
        const state = extractState(areaDesc);

        // Try to get coordinates from geometry or geocode
        let lat = 0, lng = 0;
        if (f.geometry && f.geometry.type === 'Point') {
          [lng, lat] = f.geometry.coordinates;
        } else if (f.geometry && f.geometry.type === 'Polygon' && f.geometry.coordinates?.[0]?.[0]) {
          // Use centroid of first polygon
          const coords = f.geometry.coordinates[0];
          lat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
          lng = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
        }

        return {
          id: `nws-${p.id || f.id}`,
          source: 'nws',
          type,
          title: `${event} — ${state}`,
          description: p.description || p.headline || event,
          instructions: p.instruction || null,
          severity,
          startTime: new Date(p.onset || p.sent || p.effective || new Date()),
          endTime: new Date(p.expires || p.ends || new Date(Date.now() + 24 * 60 * 60 * 1000)),
          state,
          areaDesc,
          lat,
          lng,
          url: `https://alerts.weather.gov/search?id=${p.id || ''}`,
          raw: { eventType: event, areaDesc, severity: p.severity, certainty: p.certainty, urgency: p.urgency },
        };
      });
  } catch (err) {
    console.error('Failed to fetch from NWS:', err.message);
    return [];
  }
}

// ─── Fetch from USGS ───
async function fetchFromUSGS() {
  try {
    const url = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&limit=50&orderby=time&minmagnitude=2.5';
    const res = await fetch(url);

    if (!res.ok) {
      console.error(`USGS API returned ${res.status}`);
      return [];
    }

    const data = await res.json();
    const features = data.features || [];

    return features.map((f) => {
      const p = f.properties;
      const [lng, lat] = f.geometry?.coordinates || [0, 0];
      const mag = p.mag || 0;
      const place = p.place || 'Unknown location';

      // Extract state from place string (e.g., "10km SSE of Ridgecrest, CA")
      let state = 'Unknown';
      const stateMatch = place.match(/,\s*([A-Z]{2})$/);
      if (stateMatch) {
        state = stateMatch[1];
      } else if (place.toLowerCase().includes('alaska')) {
        state = 'AK';
      } else if (place.toLowerCase().includes('hawaii')) {
        state = 'HI';
      }

      return {
        id: `usgs-${f.id}`,
        source: 'usgs',
        type: 'earthquake',
        title: `M${mag.toFixed(1)} Earthquake — ${place}`,
        description: `Magnitude ${mag.toFixed(1)} earthquake at depth ${(f.geometry?.coordinates?.[2] || 0).toFixed(1)} km. ${place}.`,
        instructions: null,
        severity: magnitudeToSeverity(mag),
        startTime: new Date(p.time),
        endTime: new Date(p.updated || p.time),
        state,
        areaDesc: place,
        lat,
        lng,
        url: p.url || `https://earthquake.usgs.gov/earthquakes/eventpage/${f.id}`,
        raw: { eventType: 'Earthquake', areaDesc: place, magnitude: mag, depth: f.geometry?.coordinates?.[2], status: p.status },
      };
    });
  } catch (err) {
    console.error('Failed to fetch from USGS:', err.message);
    return [];
  }
}

// ─── Check if cache is stale ───
async function isCacheStale() {
  try {
    const meta = await prisma.cacheMetadata.findUnique({ where: { id: 'disasters' } });
    if (!meta) return true;
    return Date.now() - meta.lastFetch.getTime() > CACHE_TTL_MS;
  } catch {
    return true;
  }
}

// ─── Refresh cache ───
async function refreshCache() {
  console.log('🔄 Refreshing disaster cache from NWS + USGS...');

  const [nwsData, usgsData] = await Promise.all([fetchFromNWS(), fetchFromUSGS()]);
  const allDisasters = [...nwsData, ...usgsData];

  console.log(`  → Fetched ${nwsData.length} NWS alerts + ${usgsData.length} USGS earthquakes`);

  if (allDisasters.length === 0) {
    // Still update the timestamp so we don't hammer the APIs
    await prisma.cacheMetadata.upsert({
      where: { id: 'disasters' },
      update: { lastFetch: new Date() },
      create: { id: 'disasters', lastFetch: new Date() },
    });
    return;
  }

  // Replace all cached data in a fast transaction (3 queries instead of N+2)
  const now = new Date();
  await prisma.$transaction([
    prisma.disaster.deleteMany({}),
    prisma.disaster.createMany({
      data: allDisasters.map((d) => ({
        id: d.id,
        source: d.source,
        type: d.type,
        title: d.title,
        description: d.description,
        instructions: d.instructions,
        severity: d.severity,
        startTime: d.startTime,
        endTime: d.endTime,
        state: d.state,
        areaDesc: d.areaDesc,
        lat: d.lat,
        lng: d.lng,
        url: d.url,
        raw: d.raw,
        fetchedAt: now,
      })),
    }),
    prisma.cacheMetadata.upsert({
      where: { id: 'disasters' },
      update: { lastFetch: now },
      create: { id: 'disasters', lastFetch: now },
    }),
  ]);

  console.log(`  ✅ Cached ${allDisasters.length} disasters`);
}

// ─── Ensure cache is fresh, then return from DB ───
async function ensureFreshCache() {
  const stale = await isCacheStale();
  if (stale) {
    await refreshCache();
  }
}

// ─── Query disasters from cache with filters ───
async function getDisasters(filters = {}) {
  await ensureFreshCache();

  const where = {};

  if (filters.source) {
    where.source = Array.isArray(filters.source) ? { in: filters.source } : filters.source;
  }
  if (filters.type) {
    where.type = Array.isArray(filters.type) ? { in: filters.type } : filters.type;
  }
  if (filters.state) {
    where.state = Array.isArray(filters.state) ? { in: filters.state } : filters.state;
  }
  if (filters.severity) {
    where.severity = Array.isArray(filters.severity) ? { in: filters.severity } : filters.severity;
  }

  // Date filters
  if (filters.startDate || filters.endDate) {
    where.startTime = {};
    if (filters.startDate) where.startTime.gte = new Date(filters.startDate);
    if (filters.endDate) where.startTime.lte = new Date(filters.endDate);
  }

  // Time range filters
  if (filters.startTime || filters.endTime) {
    if (!where.startTime) where.startTime = {};
    if (filters.startTime) where.startTime.gte = new Date(filters.startTime);
    if (filters.endTime) where.startTime.lte = new Date(filters.endTime);
  }

  // Month/year filters
  if (filters.month || filters.year) {
    const year = filters.year || new Date().getFullYear();
    const month = filters.month || 1;
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);
    where.startTime = { gte: startOfMonth, lte: endOfMonth };
  }

  const limit = Math.min(parseInt(filters.limit) || 100, 200);

  const items = await prisma.disaster.findMany({
    where,
    orderBy: { startTime: 'desc' },
    take: limit,
  });

  // Count by source
  const allItems = await prisma.disaster.findMany({ where, select: { source: true } });
  const nwsCount = allItems.filter((i) => i.source === 'nws').length;
  const usgsCount = allItems.filter((i) => i.source === 'usgs').length;

  // Transform to frontend shape
  const transformed = items.map((d) => ({
    id: d.id,
    source: d.source,
    type: d.type,
    title: d.title,
    description: d.description,
    instructions: d.instructions,
    severity: d.severity,
    startTime: d.startTime.toISOString(),
    endTime: d.endTime.toISOString(),
    location: {
      state: d.state,
      areaDesc: d.areaDesc,
      lat: d.lat,
      lng: d.lng,
      coordinates: [d.lng, d.lat],
    },
    url: d.url,
    raw: d.raw,
  }));

  return {
    total: allItems.length,
    count: transformed.length,
    sources: {
      nws: nwsCount,
      usgs: usgsCount,
      inciweb: 0,
    },
    filters: {
      usaOnly: filters.usaOnly,
      type: filters.type,
      state: filters.state,
      severity: filters.severity,
      source: filters.source,
      startDate: filters.startDate,
      endDate: filters.endDate,
      startTime: filters.startTime,
      endTime: filters.endTime,
      month: filters.month ? parseInt(filters.month) : undefined,
      year: filters.year ? parseInt(filters.year) : undefined,
      limit,
    },
    items: transformed,
  };
}

module.exports = {
  getDisasters,
  refreshCache,
  isCacheStale,
  fetchFromNWS,
  fetchFromUSGS,
};
