const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/adminInventoryController');

router.use(authenticate);

router.get('/items', ctrl.get_inventory_items);
router.post('/items', ctrl.post_inventory_items);
router.get('/items/:id', ctrl.get_inventory_items__id);
router.put('/items/:id', ctrl.put_inventory_items__id);
router.delete('/items/:id', ctrl.delete_inventory_items__id);
router.get('/locations', ctrl.get_inventory_locations);
router.post('/locations', ctrl.post_inventory_locations);
router.get('/locations/:id', ctrl.get_inventory_locations__id);
router.put('/locations/:id', ctrl.put_inventory_locations__id);
router.delete('/locations/:id', ctrl.delete_inventory_locations__id);
router.get('/stock', ctrl.get_inventory_stock);
router.post('/stock', ctrl.post_inventory_stock);
router.get('/stock/:id', ctrl.get_inventory_stock__id);
router.put('/stock/:id', ctrl.put_inventory_stock__id);
router.delete('/stock/:id', ctrl.delete_inventory_stock__id);
router.post('/stock/:id/dispatch', ctrl.post_inventory_stock__id_dispatch);
router.post('/stock/:id/reserve', ctrl.post_inventory_stock__id_reserve);
router.post('/stock/:id/restock', ctrl.post_inventory_stock__id_restock);
router.post('/seed', ctrl.post_inventory_seed);

module.exports = router;