const router = require('express').Router();
const weather = require('../controllers/weatherController');

/**
 * @swagger
 * /weather/current:
 *   get:
 *     summary: Get current weather by city
 *     tags: [Weather]
 *     parameters:
 *       - in: query
 *         name: city
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Current weather data }
 */
router.get('/current', weather.currentByCity);

/**
 * @swagger
 * /weather/current/coords:
 *   get:
 *     summary: Get current weather by coordinates
 *     tags: [Weather]
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: lon
 *         required: true
 *         schema: { type: number }
 *     responses:
 *       200: { description: Current weather data }
 */
router.get('/current/coords', weather.currentByCoords);

/**
 * @swagger
 * /weather/forecast:
 *   get:
 *     summary: Get forecast by city
 *     tags: [Weather]
 *     parameters:
 *       - in: query
 *         name: city
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Weather forecast }
 */
router.get('/forecast', weather.forecastByCity);

/**
 * @swagger
 * /weather/forecast/coords:
 *   get:
 *     summary: Get forecast by coordinates
 *     tags: [Weather]
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: lon
 *         required: true
 *         schema: { type: number }
 *     responses:
 *       200: { description: Weather forecast }
 */
router.get('/forecast/coords', weather.forecastByCoords);

/**
 * @swagger
 * /weather/air-pollution:
 *   get:
 *     summary: Get air pollution data
 *     tags: [Weather]
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: lon
 *         required: true
 *         schema: { type: number }
 *     responses:
 *       200: { description: Air quality index }
 */
router.get('/air-pollution', weather.airPollution);

module.exports = router;
