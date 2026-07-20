const express = require('express');
const router = express.Router();
const {
  getQueue,
  getCriticalQueue,
  getWeights,
  getSinglePriority
} = require('../controllers/queueController');

// Static paths before parameterised ones
router.get('/critical', getCriticalQueue);
router.get('/weights', getWeights);
router.get('/request/:id', getSinglePriority);
router.get('/', getQueue);

module.exports = router;