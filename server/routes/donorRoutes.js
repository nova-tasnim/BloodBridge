const express = require('express');
const router = express.Router();
const {
  createDonor,
  getDonors,
  getDonorById,
  updateDonor,
  deleteDonor,
  getDonorEligibility,
  toggleAvailability
} = require('../controllers/donorController');

router.route('/').post(createDonor).get(getDonors);
router.get('/:id/eligibility', getDonorEligibility);
router.patch('/:id/availability', toggleAvailability);
router.route('/:id').get(getDonorById).put(updateDonor).delete(deleteDonor);

module.exports = router;