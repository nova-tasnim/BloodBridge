const express = require('express');
const router = express.Router();
const BloodRequest = require('../models/BloodRequest');
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
const { protect, authorize } = require('../middleware/auth');

// Blood request ownership can't be checked from the URL alone (the
// URL param is the request's own id, not the requester's id), so this
// looks the request up first and compares its `requester` field.
async function isRequestOwnerOrStaff(req, res, next) {
  const request = await BloodRequest.findById(req.params.id);
  if (!request) {
    return res.status(404).json({ success: false, message: 'Request not found' });
  }

  const isOwner = request.requester?.toString() === req.user._id.toString();
  const isStaff = ['Hospital', 'BloodBank', 'Admin'].includes(req.user.role);

  if (!isOwner && !isStaff) {
    return res.status(403).json({ success: false, message: 'Forbidden — not your request' });
  }

  req.bloodRequest = request; // avoids a second lookup inside the controller
  next();
}

router.use(protect);

router.get('/lifecycle/transitions', getTransitionMap);

router.route('/')
  .post(authorize('Patient', 'Hospital', 'Admin'), createBloodRequest)
  .get(getBloodRequests);

router.get('/:id/matches', getMatches);
router.post('/:id/matches', authorize('Hospital', 'BloodBank', 'Admin'), runMatching);

router.get('/:id/timeline', getTimeline);
router.get('/:id/allowed-transitions', getAllowed);
router.patch('/:id/status', authorize('Hospital', 'BloodBank', 'Admin'), changeStatus);
router.post('/:id/respond', authorize('Donor'), respond);
router.post('/:id/fulfil', authorize('Hospital', 'BloodBank', 'Admin'), fulfil);
router.post('/:id/invite', authorize('Hospital', 'BloodBank', 'Admin'), invite);

router.route('/:id')
  .get(getBloodRequestById)
  .put(isRequestOwnerOrStaff, updateBloodRequest)
  .delete(isRequestOwnerOrStaff, deleteBloodRequest);

module.exports = router;