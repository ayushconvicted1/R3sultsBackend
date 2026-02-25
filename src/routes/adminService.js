const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/adminServiceController');

router.use(authenticate);

router.get('/', ctrl.get_services);
router.post('/', ctrl.post_services);
router.put('/', ctrl.put_services);
router.delete('/', ctrl.delete_services);
router.get('/category-documents', ctrl.get_category_documents);
router.post('/category-documents', ctrl.post_category_documents);
router.put('/category-documents', ctrl.put_category_documents);
router.delete('/category-documents', ctrl.delete_category_documents);

module.exports = router;