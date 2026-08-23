const express =
  require('express');

const router =
  express.Router();

const {
  createDonation,
  getMyDonationHistory,
  getDonorHistory,
  getDonationById
} =
  require('../controllers/donationController');

const {
  protect,
  requireDonorCapability
} =
  require('../middleware/auth');

/*
|--------------------------------------------------------------------------
| All donation endpoints require authentication
|--------------------------------------------------------------------------
*/

router.use(protect);

/*
|--------------------------------------------------------------------------
| Own donation history
|--------------------------------------------------------------------------
|
| Native Donor
| Patient + donorProfile
|--------------------------------------------------------------------------
*/

router.get(
  '/me',
  requireDonorCapability,
  getMyDonationHistory
);

/*
|--------------------------------------------------------------------------
| Record donation
|--------------------------------------------------------------------------
|
| Detailed capability enforcement happens inside controller because
| different users have different logging behavior.
|--------------------------------------------------------------------------
*/

router.post(
  '/',
  createDonation
);

/*
|--------------------------------------------------------------------------
| Lookup donor history
|--------------------------------------------------------------------------
*/

router.get(
  '/donor/:donorId',
  getDonorHistory
);

/*
|--------------------------------------------------------------------------
| Single record
|--------------------------------------------------------------------------
*/

router.get(
  '/:id',
  getDonationById
);

module.exports =
  router;