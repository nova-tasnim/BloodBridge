const express = require('express');
const router = express.Router();
const {
  getCompatibility,
  getCompatibilityMatrix,
  checkCompatibility
} = require('../controllers/matchingController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/check', checkCompatibility);
router.get('/', getCompatibilityMatrix);
router.get('/:bloodGroup', getCompatibility);

module.exports = router;