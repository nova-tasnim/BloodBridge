const express = require('express');
const router = express.Router();
const {
  getQueue,
  getCriticalQueue,
  getWeights,
  getSinglePriority
} = require('../controllers/queueController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/critical', getCriticalQueue);
router.get('/weights', getWeights);
router.get('/request/:id', getSinglePriority);
router.get('/', getQueue);

module.exports = router;