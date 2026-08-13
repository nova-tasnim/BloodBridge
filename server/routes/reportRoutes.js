const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

router.get('/history/:requesterId', reportController.getRequestHistory);
router.get('/fulfillment-stats', reportController.getFulfillmentStats);

module.exports = router;