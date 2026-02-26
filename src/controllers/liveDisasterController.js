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
      });

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
          }));
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
          filter: `All open/active events`,
        },
      },
    };

    // Use Fallback Mock Data if both APIs failed (rate limits/bans)
    if (result.data.disasters.length === 0) {
      console.log('Both APIs failed or returned zero events. Injecting US mock fallback data.');
      result.data.disasters = [
        {
          id: 'mock-1', title: 'California Wildfire (Mock)', description: 'Simulated high-priority wildfire.',
          type: 'wildfire', category: 'Wildfires', severity: 'critical', status: 'active',
          location: { coordinates: { lat: 36.7783, lng: -119.4179 }, country: 'United States', state: 'California', region: 'California, USA' },
          date: new Date(now).toISOString(), source: 'Fallback Local System', isLive: true
        },
        {
          id: 'mock-2', title: 'Texas Severe Storms (Mock)', description: 'Simulated severe thunderstorm warning.',
          type: 'cyclone', category: 'Severe Storms', severity: 'high', status: 'active',
          location: { coordinates: { lat: 31.9686, lng: -99.9018 }, country: 'United States', state: 'Texas', region: 'Texas, USA' },
          date: new Date(now).toISOString(), source: 'Fallback Local System', isLive: true
        },
        {
          id: 'mock-3', title: 'Florida Coastal Flood (Mock)', description: 'Simulated coastal flooding event.',
          type: 'flood', category: 'Floods', severity: 'medium', status: 'active',
          location: { coordinates: { lat: 27.9944, lng: -81.7603 }, country: 'United States', state: 'Florida', region: 'Florida, USA' },
          date: new Date(now).toISOString(), source: 'Fallback Local System', isLive: true
        }
      ];
      result.data.metadata.sources.push('R3sults Fallback');
    }

    // Always cache if we actually got real data
    if (disasters.length > 0 || reliefWebData.length > 0) {
      cachedResult = result;
      cacheTimestamp = now;
    }
    
    return res.json(result);
  } catch (error) {
    console.error('Live disasters fetch error:', error);
    // Return mock data even on top-level failure
    return res.json({
      success: true,
      data: { 
        disasters: [
          {
            id: 'mock-1', title: 'General Service Outage Warning', description: 'Upstream services are currently down.',
            type: 'other', category: 'System', severity: 'medium', status: 'active',
            location: { coordinates: { lat: 39.8283, lng: -98.5795 }, country: 'United States', state: 'Kansas' },
            isLive: true
          }
        ], 
        metadata: { error: 'Failed to fetch live data - displayed mock data', lastUpdated: new Date().toISOString() } 
      },
    });
  }
};
