const disasterService = require('../services/disasterService');

// Parse common query params from request
function parseFilters(query) {
  return {
    usaOnly: query.usaOnly,
    type: query.type,
    state: query.state,
    severity: query.severity,
    source: query.source,
    startDate: query.startDate,
    endDate: query.endDate,
    startTime: query.startTime,
    endTime: query.endTime,
    month: query.month,
    year: query.year,
    limit: query.limit,
    country: query.country,
  };
}

// GET /api/disasters — all disasters
exports.getAll = async (req, res, next) => {
  try {
    const filters = parseFilters(req.query);
    const data = await disasterService.getDisasters(filters);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// GET /api/disasters/nws — NWS alerts only
exports.getNWS = async (req, res, next) => {
  try {
    const filters = { ...parseFilters(req.query), source: 'nws' };
    const data = await disasterService.getDisasters(filters);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// GET /api/disasters/earthquakes — USGS earthquakes only
exports.getEarthquakes = async (req, res, next) => {
  try {
    const filters = { ...parseFilters(req.query), source: 'usgs', type: 'earthquake' };
    const data = await disasterService.getDisasters(filters);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// GET /api/disasters/wildfires — wildfire alerts only
exports.getWildfires = async (req, res, next) => {
  try {
    const filters = { ...parseFilters(req.query), type: 'wildfire' };
    const data = await disasterService.getDisasters(filters);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
