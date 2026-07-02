const router = require('express').Router();
const disaster = require('../controllers/disasterController');

/**
 * @swagger
 * /disasters:
 *   get:
 *     summary: Get all disasters (from synced DB)
 *     tags: [Disasters]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string }
 *         description: Filter by type (wildfire, earthquake, flood, tornado, volcanic, extreme_weather)
 *       - in: query
 *         name: severity
 *         schema: { type: string }
 *         description: Filter by severity (critical, high, moderate, medium)
 *       - in: query
 *         name: source
 *         schema: { type: string }
 *         description: Filter by source (NASA EONET, USGS, Weather.gov, manual)
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search in title and description
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *         description: Max results (default 100, max 500)
 *     responses:
 *       200: { description: All active disasters with custom IDs }
 */
router.get('/', disaster.getAll);

/**
 * @swagger
 * /disasters:
 *   post:
 *     summary: Create a new disaster manually
 *     tags: [Disasters]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, type]
 *             properties:
 *               title: { type: string }
 *               type: { type: string, enum: [hurricane, flood, wildfire, snowstorm, tornado, earthquake, volcanic, power_outage, extreme_weather] }
 *               description: { type: string }
 *               severity: { type: string, enum: [critical, high, moderate, medium] }
 *               status: { type: string, default: open }
 *               location: { type: object, properties: { coordinates: { type: object, properties: { lat: { type: number }, lng: { type: number } } } } }
 *               magnitude: { type: number }
 *               magnitudeUnit: { type: string }
 *               date: { type: string, format: date-time }
 *     responses:
 *       201: { description: Disaster created with generated ID }
 */
router.post('/', disaster.create);

/**
 * @swagger
 * /disasters/sync:
 *   post:
 *     summary: Force a manual sync from the upstream API
 *     tags: [Disasters]
 *     responses:
 *       200: { description: Sync completed }
 */
router.post('/sync', disaster.forceSync);

/**
 * @swagger
 * /disasters/weather:
 *   get:
 *     summary: Get Weather.gov alerts only
 *     tags: [Disasters]
 *     responses:
 *       200: { description: Weather.gov disaster alerts }
 */
router.get('/weather', disaster.getWeather);

/**
 * @swagger
 * /disasters/earthquakes:
 *   get:
 *     summary: Get earthquake data only
 *     tags: [Disasters]
 *     responses:
 *       200: { description: Earthquake data }
 */
router.get('/earthquakes', disaster.getEarthquakes);

/**
 * @swagger
 * /disasters/wildfires:
 *   get:
 *     summary: Get wildfire data only
 *     tags: [Disasters]
 *     responses:
 *       200: { description: Wildfire data }
 */
router.get('/wildfires', disaster.getWildfires);

/**
 * @swagger
 * /disasters/{id}:
 *   get:
 *     summary: Get a single disaster by its custom ID (e.g., FL-32A2EB)
 *     tags: [Disasters]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Custom disaster ID (e.g., EQ-899A75, WF-A3F2B1)
 *     responses:
 *       200: { description: Single disaster }
 *       404: { description: Disaster not found }
 */
router.get('/:id', disaster.getById);

module.exports = router;
