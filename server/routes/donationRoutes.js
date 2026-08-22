const express = require('express');
const router = express.Router();
const {
  createDonation,
  getDonorHistory,
  getDonationById
} = require('../controllers/donationController');
const { protect, authorize, ownerOrRoles } = require('../middleware/auth');

router.use(protect);

// Donation records are logged by the facility that received the
// donation, not self-reported by the donor — keeps donation history
// (and the badges/leaderboard built on top of it) trustworthy.
router.post('/', authorize('Hospital', 'BloodBank', 'Admin'), createDonation);

router.get('/donor/:donorId', ownerOrRoles('donorId', 'Hospital', 'BloodBank', 'Admin'), getDonorHistory);
router.get('/:id', getDonationById);

module.exports = router;