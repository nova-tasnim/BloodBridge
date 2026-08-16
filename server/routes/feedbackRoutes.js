const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');

router.post('/', feedbackController.submitFeedback);
router.get('/target/:targetId', feedbackController.getFeedbackForTarget);
router.get('/target/:targetId/average', feedbackController.getAverageRating);
router.get('/recent', feedbackController.getRecentFeedback);

module.exports = router;