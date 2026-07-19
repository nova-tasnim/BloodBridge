const express = require('express');
const router = express.Router();
const {
  createBloodRequest,
  getBloodRequests,
  getBloodRequestById,
  updateBloodRequest,
  deleteBloodRequest
} = require('../controllers/bloodRequestController');

router.route('/').post(createBloodRequest).get(getBloodRequests);
router
  .route('/:id')
  .get(getBloodRequestById)
  .put(updateBloodRequest)
  .delete(deleteBloodRequest);

module.exports = router;