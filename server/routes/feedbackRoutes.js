const express =
  require('express');

const router =
  express.Router();

const feedbackController =
  require(
    '../controllers/feedbackController'
  );

const {
  protect,
  authorize
} =
  require('../middleware/auth');

router.use(
  protect
);

/*
|--------------------------------------------------------------------------
| User feedback
|--------------------------------------------------------------------------
*/

router.post(
  '/',
  feedbackController
    .submitFeedback
);

/*
|--------------------------------------------------------------------------
| Admin moderation
|--------------------------------------------------------------------------
*/

router.get(
  '/recent',

  authorize(
    'Admin'
  ),

  feedbackController
    .getRecentFeedback
);

router.delete(
  '/:feedbackId',

  authorize(
    'Admin'
  ),

  feedbackController
    .deleteFeedback
);

/*
|--------------------------------------------------------------------------
| Target feedback
|--------------------------------------------------------------------------
*/

router.get(
  '/target/:targetId/average',

  feedbackController
    .getAverageRating
);

router.get(
  '/target/:targetId',

  feedbackController
    .getFeedbackForTarget
);

module.exports =
  router;