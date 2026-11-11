const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');

router.get('/', attendanceController.getAttendance);
router.post('/', attendanceController.markAttendance);
router.get('/stats', attendanceController.getStats);
router.post('/export', attendanceController.exportReport);

module.exports = router;

