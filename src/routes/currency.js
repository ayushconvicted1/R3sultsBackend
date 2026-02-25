const router = require('express').Router();
const controller = require('../controllers/currencyController');

router.get('/', controller.getCurrency);

module.exports = router;
