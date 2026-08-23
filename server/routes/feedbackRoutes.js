const express = require('express');
const router = express.Router();

const feedbackController = require('../controllers/feedbackController');
const { protect } = require('../middleware/auth');

router.use(protect);

// Submit feedback
router.post('/', feedbackController.submitFeedback);

// Get all feedback for a target
router.get(
  '/target/:targetId',
  feedbackController.getFeedbackForTarget
);

// Get average rating for a target
router.get(
  '/target/:targetId/average',
  feedbackController.getAverageRating
);

// Get recent feedback
router.get(
  '/recent',
  feedbackController.getRecentFeedback
);

module.exports = router;