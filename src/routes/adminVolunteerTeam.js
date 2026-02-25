const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/adminVolunteerTeamController');

router.use(authenticate);

router.get('/', ctrl.get_volunteer_teams);
router.post('/', ctrl.post_volunteer_teams);
router.put('/', ctrl.put_volunteer_teams);
router.delete('/', ctrl.delete_volunteer_teams);

module.exports = router;