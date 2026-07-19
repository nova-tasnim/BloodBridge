const express = require('express');
const router = express.Router();
const {
  getCompatibility,
  getCompatibilityMatrix,
  checkCompatibility
} = require('../controllers/matchingController');

// Static routes before the parameterised one
router.get('/check', checkCompatibility);
router.get('/', getCompatibilityMatrix);
router.get('/:bloodGroup', getCompatibility);

module.exports = router;