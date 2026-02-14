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
