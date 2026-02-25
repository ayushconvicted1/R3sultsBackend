const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/adminAuthController');

// Login doesn't need auth
router.post('/login', ctrl.post_auth_login);

// These need auth
router.get('/me', authenticate, ctrl.get_auth_me);
router.post('/logout', authenticate, ctrl.post_auth_logout);

module.exports = router;