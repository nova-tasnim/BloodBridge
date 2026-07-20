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
const {
  changeStatus,
  respond,
  fulfil,
  invite,
  getTimeline,
  getTransitionMap,
  getAllowed
} = require('../controllers/lifecycleController');

// Static path first, or "lifecycle" would be read as an :id
router.get('/lifecycle/transitions', getTransitionMap);

router.route('/').post(createBloodRequest).get(getBloodRequests);

// Feature 8 — matching
router.get('/:id/matches', getMatches);
router.post('/:id/matches', runMatching);

// Feature 9 — lifecycle & donor response
router.get('/:id/timeline', getTimeline);
router.get('/:id/allowed-transitions', getAllowed);
router.patch('/:id/status', changeStatus);
router.post('/:id/respond', respond);
router.post('/:id/fulfil', fulfil);
router.post('/:id/invite', invite);

router
  .route('/:id')
  .get(getBloodRequestById)
  .put(updateBloodRequest)
  .delete(deleteBloodRequest);

module.exports = router;