const express = require('express');
const router = express.Router();

const mapController = require('../controllers/mapController');

router.get('/nearby', mapController.getNearbyActiveRequests);
router.get('/all-active', mapController.getAllActiveRequests);

module.exports = router;