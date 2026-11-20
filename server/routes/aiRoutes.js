const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

router.post('/recognize', aiController.recognizeFace);
router.post('/start-live', aiController.startLive);
router.post('/stop-live', aiController.stopLive);
router.get('/status', aiController.getStatus);

module.exports = router;

