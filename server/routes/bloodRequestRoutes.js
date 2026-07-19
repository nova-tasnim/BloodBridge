const express = require('express');
const router = express.Router();
const {
  createBloodRequest,
  getBloodRequests,
  getBloodRequestById,
  updateBloodRequest,
  deleteBloodRequest
} = require('../controllers/bloodRequestController');
const { getMatches, runMatching } = require('../controllers/matchingController');

router.route('/').post(createBloodRequest).get(getBloodRequests);
router.get('/:id/matches', getMatches);
router.post('/:id/matches', runMatching);
router
  .route('/:id')
  .get(getBloodRequestById)
  .put(updateBloodRequest)
  .delete(deleteBloodRequest);

module.exports = router;