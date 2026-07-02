const disasterService = require('../services/disasterService');

// Parse common query params from request
function parseFilters(query) {
  return {
    type: query.type,
    severity: query.severity,
    source: query.source,
    status: query.status,
    category: query.category,
    search: query.search,
    limit: query.limit,
    includeInactive: query.includeInactive,
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

// GET /api/disasters/:id — single disaster by custom ID
exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const disaster = await disasterService.getDisasterById(id);
    if (!disaster) {
      return res.status(404).json({ success: false, message: 'Disaster not found' });
    }
    res.json({ success: true, data: { disaster } });
  } catch (error) {
    next(error);
  }
};

// POST /api/disasters — create a new manual disaster
exports.create = async (req, res, next) => {
  try {
    const { title, type, description, severity, status, location, magnitude, magnitudeUnit, date } = req.body;

    if (!title || !type) {
      return res.status(400).json({
        success: false,
        message: 'title and type are required',
      });
    }

    const disaster = await disasterService.createDisaster({
      title,
      type,
      description,
      severity,
      status,
      location,
      magnitude,
      magnitudeUnit,
      date,
    });

    res.status(201).json({
      success: true,
      data: { disaster },
      message: 'Disaster created successfully',
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/disasters/weather — Weather.gov alerts only
exports.getWeather = async (req, res, next) => {
  try {
    const filters = { ...parseFilters(req.query), source: 'Weather.gov' };
    const data = await disasterService.getDisasters(filters);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// GET /api/disasters/earthquakes — USGS earthquakes only
exports.getEarthquakes = async (req, res, next) => {
  try {
    const filters = { ...parseFilters(req.query), type: 'earthquake' };
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

// POST /api/disasters/sync — force a manual sync
exports.forceSync = async (req, res, next) => {
  try {
    await disasterService.syncDisasters();
    res.json({ success: true, message: 'Disaster sync completed' });
  } catch (error) {
    next(error);
  }
};
