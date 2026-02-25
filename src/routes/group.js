const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const group = require('../controllers/groupController');

router.use(authenticate);

/**
 * @swagger
 * /group/add-member:
 *   post:
 *     summary: Add a family member
 *     tags: [Group]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, relation]
 *             properties:
 *               fullName: { type: string }
 *               relation: { type: string }
 *     responses:
 *       201: { description: Member added }
 */
router.post('/add-member', validate([
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('relation').notEmpty().withMessage('Relation is required'),
]), group.addMember);

/**
 * @swagger
 * /group/my-group:
 *   get:
 *     summary: Get user's family group
 *     tags: [Group]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: Group data with members }
 */
router.get('/my-group', group.getMyGroup);

/**
 * @swagger
 * /group/remove-member/{memberId}:
 *   delete:
 *     summary: Remove a family member
 *     tags: [Group]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Member removed }
 */
router.delete('/remove-member/:memberId', group.removeMember);

/**
 * @swagger
 * /group/update-member/{memberId}:
 *   patch:
 *     summary: Update member relation
 *     tags: [Group]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [relation]
 *             properties:
 *               relation: { type: string }
 *     responses:
 *       200: { description: Member updated }
 */
router.patch('/update-member/:memberId', validate([
  body('relation').notEmpty().withMessage('Relation is required'),
]), group.updateMember);

/**
 * @swagger
 * /group/update-name:
 *   patch:
 *     summary: Update group name
 *     tags: [Group]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *     responses:
 *       200: { description: Group name updated }
 */
router.patch('/update-name', validate([
  body('name').notEmpty().withMessage('Group name is required'),
]), group.updateGroupName);

/**
 * @swagger
 * /group/member/{memberId}:
 *   get:
 *     summary: Get member details
 *     tags: [Group]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Member details }
 */
router.get('/member/:memberId', group.getMemberDetails);

/**
 * @swagger
 * /group/member/{memberId}/profile:
 *   patch:
 *     summary: Update member profile
 *     tags: [Group]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Member profile updated }
 */
router.patch('/member/:memberId/profile', group.updateMemberProfile);

/**
 * @swagger
 * /group/members:
 *   get:
 *     summary: Get all members
 *     tags: [Group]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: List of all members }
 */
router.get('/members', group.getAllMembers);

module.exports = router;
