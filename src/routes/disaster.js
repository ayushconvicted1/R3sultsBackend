const router = require('express').Router();
const disaster = require('../controllers/disasterController');

/**
 * @swagger
 * /disasters:
 *   get:
 *     summary: Get all disasters (aggregated)
 *     tags: [Disasters]
 *     responses:
 *       200: { description: Aggregated disaster data from NWS, USGS, InciWeb }
 */
router.get('/', disaster.getAll);

/**
 * @swagger
 * /disasters/nws:
 *   get:
 *     summary: Get NWS weather alerts
 *     tags: [Disasters]
 *     responses:
 *       200: { description: NWS weather alerts }
 */
router.get('/nws', disaster.getNWS);

/**
 * @swagger
 * /disasters/earthquakes:
 *   get:
 *     summary: Get USGS earthquake data
 *     tags: [Disasters]
 *     responses:
 *       200: { description: USGS earthquake data }
 */
router.get('/earthquakes', disaster.getEarthquakes);

/**
 * @swagger
 * /disasters/wildfires:
 *   get:
 *     summary: Get InciWeb wildfire data
 *     tags: [Disasters]
 *     responses:
 *       200: { description: Wildfire data }
 */
router.get('/wildfires', disaster.getWildfires);

module.exports = router;
