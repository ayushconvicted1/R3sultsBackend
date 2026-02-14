const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const group = require('../controllers/groupController');

router.use(authenticate);

router.post('/add-member', validate([
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('relation').notEmpty().withMessage('Relation is required'),
]), group.addMember);

router.get('/my-group', group.getMyGroup);

router.delete('/remove-member/:memberId', group.removeMember);

router.patch('/update-member/:memberId', validate([
  body('relation').notEmpty().withMessage('Relation is required'),
]), group.updateMember);

router.patch('/update-name', validate([
  body('name').notEmpty().withMessage('Group name is required'),
]), group.updateGroupName);

router.get('/member/:memberId', group.getMemberDetails);

router.patch('/member/:memberId/profile', group.updateMemberProfile);

router.get('/members', group.getAllMembers);

module.exports = router;
