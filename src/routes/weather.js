const router = require('express').Router();
const weather = require('../controllers/weatherController');

router.get('/current', weather.currentByCity);
router.get('/current/coords', weather.currentByCoords);
router.get('/forecast', weather.forecastByCity);
router.get('/forecast/coords', weather.forecastByCoords);
router.get('/air-pollution', weather.airPollution);

module.exports = router;
