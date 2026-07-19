const express = require('express');
const router = express.Router();
const {
  createDonor,
  getDonors,
  getDonorById,
  updateDonor,
  deleteDonor,
  getDonorEligibility
} = require('../controllers/donorController');

router.route('/').post(createDonor).get(getDonors);
router.get('/:id/eligibility', getDonorEligibility);
router.route('/:id').get(getDonorById).put(updateDonor).delete(deleteDonor);

module.exports = router;