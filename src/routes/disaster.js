const router = require('express').Router();
const disaster = require('../controllers/disasterController');

router.get('/', disaster.getAll);
router.get('/nws', disaster.getNWS);
router.get('/earthquakes', disaster.getEarthquakes);
router.get('/wildfires', disaster.getWildfires);

module.exports = router;
