const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/adminProductController');

router.use(authenticate);

router.get('/', ctrl.get_products);
router.post('/', ctrl.post_products);
router.get('/:id', ctrl.get_products__id);
router.put('/:id', ctrl.put_products__id);
router.delete('/:id', ctrl.delete_products__id);

module.exports = router;