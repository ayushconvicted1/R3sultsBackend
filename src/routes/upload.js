const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const uploadCtrl = require('../controllers/uploadController');

router.use(authenticate);

router.post('/csv', upload.single('file'), uploadCtrl.uploadCSV);
router.post('/csv/parse', upload.single('file'), uploadCtrl.parseCSV);

module.exports = router;
