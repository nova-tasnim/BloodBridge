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
const { protect, authorize, ownerOrRoles } = require('../middleware/auth');

router.use(protect);

// Real donor accounts are created via /api/auth/register now.
// This direct-create endpoint stays available for Admin bulk-add only.
router.route('/')
  .post(authorize('Admin'), createDonor)
  .get(getDonors);

router.get('/:id/eligibility', ownerOrRoles('id', 'Hospital', 'BloodBank', 'Admin'), getDonorEligibility);
router.patch('/:id/availability', ownerOrRoles('id', 'Admin'), toggleAvailability);

router.route('/:id')
  .get(getDonorById)
  .put(ownerOrRoles('id', 'Admin'), updateDonor)
  .delete(ownerOrRoles('id', 'Admin'), deleteDonor);

module.exports = router;