const router = require('express').Router();
const controller = require('../controllers/liveDisasterController');

router.get('/', controller.getLiveDisasters);

module.exports = router;
