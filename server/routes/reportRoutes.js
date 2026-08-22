const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// General platform overview stats for authenticated users (LiveStatsBar)
router.get('/overview', reportController.getPlatformOverview);

// Staff-only detailed reporting routes
router.use(authorize('Hospital', 'BloodBank', 'Admin'));
router.get('/history/:requesterId', reportController.getRequestHistory);
router.get('/fulfillment-stats', reportController.getFulfillmentStats);

module.exports = router;