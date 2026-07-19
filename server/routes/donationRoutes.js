const express = require('express');
const router = express.Router();
const {
  createDonation,
  getDonorHistory,
  getDonationById
} = require('../controllers/donationController');

router.post('/', createDonation);
router.get('/donor/:donorId', getDonorHistory);
router.get('/:id', getDonationById);

module.exports = router;