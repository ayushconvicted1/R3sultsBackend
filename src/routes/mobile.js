const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, optionalAuth } = require('../middleware/auth');
const mobile = require('../controllers/mobileController');

// Tasks — volunteer only
router.get('/tasks', authenticate, mobile.getTasks);
router.get('/tasks/:disasterId', authenticate, mobile.getTaskById);
router.post('/tasks/accept', authenticate, validate([
  body('disasterId').notEmpty(),
]), mobile.acceptTask);
router.post('/tasks/decline', authenticate, validate([
  body('disasterId').notEmpty(),
]), mobile.declineTask);

// Alerts - public
router.get('/alerts', optionalAuth, mobile.getAlerts);

module.exports = router;
