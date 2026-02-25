const fetch = require('node-fetch');

// NASA EONET API for live natural events
const EONET_API = 'https://eonet.gsfc.nasa.gov/api/v3/events';

// ─── Helpers ───
const USA_STATES_BOUNDS = {
  'California': { lat: [32.5, 42.0], lng: [-124.5, -114.0] },
  'Texas': { lat: [25.8, 36.5], lng: [-106.6, -93.5] },
  'Florida': { lat: [24.5, 31.0], lng: [-87.6, -80.0] },
  'New York': { lat: [40.5, 45.0], lng: [-79.8, -71.8] },
  'Illinois': { lat: [36.9, 42.5], lng: [-91.5, -87.0] },
  'Pennsylvania': { lat: [39.7, 42.3], lng: [-80.5, -74.7] },
  'Ohio': { lat: [38.4, 42.0], lng: [-84.8, -80.5] },
  'Georgia': { lat: [30.3, 35.0], lng: [-85.6, -80.8] },
  'North Carolina': { lat: [33.8, 36.6], lng: [-84.3, -75.4] },
  'Michigan': { lat: [41.7, 48.3], lng: [-90.4, -82.4] },
};

function isInUSA(lat, lng) {
  return (
    (lat >= 24.396308 && lat <= 71.538800 && lng >= -179.148909 && lng <= -66.885444) ||
    (lat >= 18.9 && lat <= 22.2 && lng >= -160.3 && lng <= -154.8) ||
    (lat >= 51.2 && lat <= 71.5 && lng >= -179.0 && lng <= -129.0)
  );
}

function getApproximateUSAState(lat, lng) {
  for (const [state, bounds] of Object.entries(USA_STATES_BOUNDS)) {
    if (lat >= bounds.lat[0] && lat <= bounds.lat[1] && lng >= bounds.lng[0] && lng <= bounds.lng[1]) {
      return state;
    }
  }
  return null;
}

const severityMap = {
  'wildfires': 'high', 'severeStorms': 'critical', 'volcanoes': 'critical',
  'earthquakes': 'high', 'floods': 'high', 'landslides': 'medium',
  'seaLakeIce': 'low', 'snow': 'low', 'drought': 'medium',
  'dustHaze': 'low', 'tempExtremes': 'medium', 'waterColor': 'low', 'manmade': 'medium',
};

const typeMap = {
  'wildfires': 'wildfire', 'severeStorms': 'cyclone', 'volcanoes': 'volcanic',
  'earthquakes': 'earthquake', 'floods': 'flood', 'landslides': 'landslide',
  'seaLakeIce': 'iceberg', 'snow': 'other', 'drought': 'drought',
  'dustHaze': 'other', 'tempExtremes': 'other', 'waterColor': 'other', 'manmade': 'other',
};

// ─── In-memory cache ───
let cachedResult = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

exports.getLiveDisasters = async (req, res, next) => {
  try {
    const now = Date.now();
    if (cachedResult && (now - cacheTimestamp) < CACHE_DURATION) {
      return res.json(cachedResult);
    }

    // Fetch from NASA EONET
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let eonetEvents = [];
    try {
      const response = await fetch(`${EONET_API}?status=open&limit=200`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'R3sults-Backend/1.0' },
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        const data = await response.json();
        eonetEvents = data.events || [];
      }
    } catch (e) {
      clearTimeout(timeoutId);
      console.error('EONET API error:', e.message);
    }

    const currentYear = new Date().getFullYear();
    const isCurrentYear = (dateStr) => {
      if (!dateStr) return false;
      const y = new Date(dateStr).getFullYear();
      return !isNaN(y) && y === currentYear;
    };

    // Transform EONET data
    const disasters = eonetEvents
      .map(event => {
        const latestGeometry = event.geometry[event.geometry.length - 1];
        const category = event.categories[0];
        const lat = latestGeometry?.coordinates[1] || 0;
        const lng = latestGeometry?.coordinates[0] || 0;

        let country, state;
        if (isInUSA(lat, lng)) {
          country = 'United States';
          state = getApproximateUSAState(lat, lng) || undefined;
        }

        return {
          id: event.id,
          title: event.title,
          description: event.description || `Live ${category?.title || 'event'} detected by NASA satellites`,
          type: typeMap[category?.id] || 'other',
          category: category?.title || 'Unknown',
          severity: severityMap[category?.id] || 'medium',
          status: event.closed ? 'resolved' : 'active',
          location: { coordinates: { lat, lng }, country, state, region: state ? `${state}, USA` : undefined },
          magnitude: latestGeometry?.magnitudeValue,
          magnitudeUnit: latestGeometry?.magnitudeUnit,
          date: latestGeometry?.date,
          source: event.sources[0]?.url || event.link,
          isLive: true,
        };
      })
      .filter(d => isCurrentYear(d.date));

    // Fetch ReliefWeb data
    let reliefWebData = [];
    try {
      const rwController = new AbortController();
      const rwTimeout = setTimeout(() => rwController.abort(), 10000);
      const rwResponse = await fetch(
        'https://api.reliefweb.int/v1/disasters?appname=results-admin&limit=10&preset=latest',
        { signal: rwController.signal, headers: { 'User-Agent': 'R3sults-Backend/1.0' } }
      );
      clearTimeout(rwTimeout);
      if (rwResponse.ok) {
        const rwData = await rwResponse.json();
        reliefWebData = (rwData.data || [])
          .map(item => ({
            id: `rw-${item.id}`,
            title: item.fields?.name || 'Unknown Disaster',
            description: item.fields?.description || '',
            type: item.fields?.type?.[0]?.name?.toLowerCase() || 'other',
            category: item.fields?.type?.[0]?.name || 'Unknown',
            severity: 'high',
            status: item.fields?.status || 'active',
            location: { country: item.fields?.country?.[0]?.name, region: item.fields?.primary_country?.region?.[0]?.name },
            date: item.fields?.date?.created,
            source: item.fields?.url_alias ? `https://reliefweb.int${item.fields.url_alias}` : null,
            isLive: true, fromReliefWeb: true,
          }))
          .filter(d => isCurrentYear(d.date));
      }
    } catch (e) {
      console.log('ReliefWeb fetch failed, continuing with EONET data');
    }

    const result = {
      success: true,
      data: {
        disasters: [...disasters, ...reliefWebData],
        metadata: {
          eonetCount: disasters.length,
          reliefWebCount: reliefWebData.length,
          lastUpdated: new Date().toISOString(),
          sources: ['NASA EONET', 'ReliefWeb'],
          filter: `Current year (${currentYear}) only`,
        },
      },
    };

    cachedResult = result;
    cacheTimestamp = now;
    return res.json(result);
  } catch (error) {
    console.error('Live disasters fetch error:', error);
    return res.json({
      success: true,
      data: { disasters: [], metadata: { error: 'Failed to fetch live data', lastUpdated: new Date().toISOString() } },
    });
  }
};
