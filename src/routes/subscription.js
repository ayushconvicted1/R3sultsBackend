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
router.post('/create-stripe', authenticate, sub.createStripeSubscription);

// Webhooks — no auth (verified by payload signature)
router.post('/webhook/apple', sub.webhookApple);
router.post('/webhook/google', sub.webhookGoogle);
router.post('/webhook/stripe', sub.webhookStripe); // Stripe verifies its own signature

module.exports = router;
