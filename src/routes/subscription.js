const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const sub = require('../controllers/subscriptionController');

// Public — list plans (no auth required)
router.get('/plans', sub.getPlans);

// Authenticated — subscription management
router.get('/current', authenticate, sub.getCurrent);
router.post('/verify-apple', authenticate, sub.verifyApple);
router.post('/verify-google', authenticate, sub.verifyGoogle);
router.post('/restore', authenticate, sub.restore);
router.post('/create-square-checkout', authenticate, sub.createSquareCheckout);

// Webhooks — no auth (verified by payload signature)
router.post('/webhook/apple', sub.webhookApple);
router.post('/webhook/google', sub.webhookGoogle);
router.post('/webhook/square', sub.webhookSquare);

module.exports = router;
