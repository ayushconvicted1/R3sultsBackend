const API_KEY = process.env.OPENWEATHERMAP_API_KEY;
const BASE = 'https://api.openweathermap.org/data/2.5';

const fetchWeather = async (path, params) => {
  if (!API_KEY) throw Object.assign(new Error('Weather API key not configured'), { statusCode: 503 });
  const qs = new URLSearchParams({ ...params, appid: API_KEY, units: 'metric' }).toString();
  const res = await fetch(`${BASE}${path}?${qs}`);
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.message || 'Weather API error'), { statusCode: res.status });
  return data;
};

exports.currentByCity = async (req, res, next) => {
  try {
    const { city, country } = req.query;
    if (!city) return res.status(400).json({ success: false, message: 'city query parameter is required' });
    const q = country ? `${city},${country}` : city;
    const data = await fetchWeather('/weather', { q });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

exports.currentByCoords = async (req, res, next) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ success: false, message: 'lat and lon query parameters are required' });
    const data = await fetchWeather('/weather', { lat, lon });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

exports.forecastByCity = async (req, res, next) => {
  try {
    const { city, country } = req.query;
    if (!city) return res.status(400).json({ success: false, message: 'city query parameter is required' });
    const q = country ? `${city},${country}` : city;
    const data = await fetchWeather('/forecast', { q });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

exports.forecastByCoords = async (req, res, next) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ success: false, message: 'lat and lon query parameters are required' });
    const data = await fetchWeather('/forecast', { lat, lon });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

exports.airPollution = async (req, res, next) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ success: false, message: 'lat and lon query parameters are required' });
    const data = await fetchWeather('/air_pollution', { lat, lon });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

exports.dashboardWeather = async (req, res, next) => {
  try {
    const { type, lat, lon, city, state } = req.query;
    
    // Multi-city overview for dashboard maps
    if (type === 'multi') {
      const topCities = [
        { city: 'New York', state: 'NY', lat: 40.7128, lon: -74.0060 },
        { city: 'Los Angeles', state: 'CA', lat: 34.0522, lon: -118.2437 },
        { city: 'Chicago', state: 'IL', lat: 41.8781, lon: -87.6298 },
        { city: 'Houston', state: 'TX', lat: 29.7604, lon: -95.3698 },
        { city: 'Phoenix', state: 'AZ', lat: 33.4484, lon: -112.0740 }
      ];
      
      const results = [];
      for (const c of topCities) {
        try {
          const data = await fetchWeather('/weather', { lat: c.lat, lon: c.lon });
          results.push({
            city: c.city,
            state: c.state,
            country: 'US',
            lat: c.lat,
            lon: c.lon,
            temperature: Math.round((data.main.temp * 9/5) + 32), // Convert metric to imperial for dashboard
            feelsLike: Math.round((data.main.feels_like * 9/5) + 32),
            humidity: data.main.humidity,
            pressure: data.main.pressure,
            windSpeed: Math.round(data.wind.speed * 2.237),
            windDirection: data.wind.deg,
            description: data.weather[0].description,
            icon: data.weather[0].icon,
            visibility: data.visibility / 1609, // miles
            clouds: data.clouds.all
          });
        } catch (e) {
          console.error(`Failed fetching weather for ${c.city}`, e);
        }
      }
      return res.json({ success: true, data: results });
    }
    
    if (type === 'alerts') {
      // Free tier of OneCall/Weather doesn't always have alerts unless there's an active one. 
      // Return empty array to prevent frontend crash
      return res.json({ success: true, data: [] });
    }
    
    if (type === 'onecall' || (!type && lat && lon)) {
      if (!lat || !lon) return res.status(400).json({ success: false, message: 'lat and lon required' });
      
      // Attempt to hit onecall API (requires 3.0 subscription usually, but we fallback gracefully)
      try {
        if (!API_KEY) throw Object.assign(new Error('Weather API key not configured'), { statusCode: 503 });
        const qs = new URLSearchParams({ lat, lon, exclude: 'minutely', appid: API_KEY, units: 'imperial' }).toString();
        const resOnecall = await fetch(`https://api.openweathermap.org/data/3.0/onecall?${qs}`);
        
        if (resOnecall.ok) {
          const data = await resOnecall.json();
          
          const formatted = {
            current: {
              city: city || 'Unknown City',
              state: state || '',
              country: 'US',
              lat,
              lon,
              temperature: Math.round(data.current.temp),
              feelsLike: Math.round(data.current.feels_like),
              humidity: data.current.humidity,
              pressure: data.current.pressure,
              windSpeed: Math.round(data.current.wind_speed),
              windDirection: data.current.wind_deg,
              description: data.current.weather[0].description,
              icon: data.current.weather[0].icon,
              visibility: (data.current.visibility || 10000) / 1609,
              clouds: data.current.clouds,
              sunrise: data.current.sunrise,
              sunset: data.current.sunset,
              timezone: data.timezone,
              timezoneOffset: data.timezone_offset,
              uvIndex: data.current.uvi,
              dewPoint: Math.round(data.current.dew_point)
            },
            hourly: (data.hourly || []).map(h => ({
              dt: h.dt,
              temp: Math.round(h.temp),
              feelsLike: Math.round(h.feels_like),
              humidity: h.humidity,
              description: h.weather[0].description,
              icon: h.weather[0].icon,
              windSpeed: h.wind_speed,
              pop: h.pop,
              uvIndex: h.uvi
            })),
            daily: (data.daily || []).map(d => ({
              dt: d.dt,
              sunrise: d.sunrise,
              sunset: d.sunset,
              tempDay: Math.round(d.temp.day),
              tempMin: Math.round(d.temp.min),
              tempMax: Math.round(d.temp.max),
              tempNight: Math.round(d.temp.night),
              humidity: d.humidity,
              description: d.weather[0].description,
              icon: d.weather[0].icon,
              windSpeed: d.wind_speed,
              pop: d.pop,
              uvIndex: d.uvi,
              summary: d.summary
            })),
            alerts: data.alerts || []
          };
          return res.json({ success: true, data: formatted });
        } else {
          // Fallback to standard current weather if OneCall 3.0 fails (e.g. no subscription)
          const data = await fetchWeather('/weather', { lat, lon });
          const formatted = {
            current: {
              city: city || data.name,
              state: state || '',
              country: data.sys.country,
              lat,
              lon,
              temperature: Math.round((data.main.temp * 9/5) + 32),
              feelsLike: Math.round((data.main.feels_like * 9/5) + 32),
              humidity: data.main.humidity,
              pressure: data.main.pressure,
              windSpeed: Math.round(data.wind.speed * 2.237),
              windDirection: data.wind.deg,
              description: data.weather[0].description,
              icon: data.weather[0].icon,
              visibility: data.visibility / 1609,
              clouds: data.clouds.all,
              sunrise: data.sys.sunrise,
              sunset: data.sys.sunset,
              timezoneOffset: data.timezone,
              uvIndex: 0,
              dewPoint: 0
            },
            hourly: [],
            daily: [],
            alerts: []
          };
          return res.json({ success: true, data: formatted });
        }
      } catch (e) {
        console.error('OneCall fallback failed', e);
        return res.status(500).json({ success: false, message: e.message });
      }
    }
    
    return res.status(400).json({ success: false, message: 'Unhandled weather query parameters' });
  } catch (error) { next(error); }
};
