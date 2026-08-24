const express =
  require('express');

const router =
  express.Router();

const {
  createDonation,
  getMyDonationHistory,
  getMyRegisteredCampaigns,
  getDonorHistory,
  getPendingDonationApprovals,
  approveDonationRecord,
  rejectDonationRecord,
  getDonationById
} =
  require('../controllers/donationController');

const {
  protect,
  authorize,
  requireDonorCapability,
  requireVerifiedInstitution
} =
  require('../middleware/auth');
router.use(
  protect
);

/*
|--------------------------------------------------------------------------
| Donor-capable own routes
|--------------------------------------------------------------------------
*/

router.get(
  '/me',

  requireDonorCapability,

  getMyDonationHistory
);

router.get(
  '/my-campaigns',

  requireDonorCapability,

  getMyRegisteredCampaigns
);

/*
|--------------------------------------------------------------------------
| Admin approval queue
|--------------------------------------------------------------------------
*/

router.get(
  '/pending',

  authorize(
    'Admin'
  ),

  getPendingDonationApprovals
);

router.patch(
  '/:id/approve',

  authorize(
    'Admin'
  ),

  approveDonationRecord
);

router.patch(
  '/:id/reject',

  authorize(
    'Admin'
  ),

  rejectDonationRecord
);

/*
|--------------------------------------------------------------------------
| Submit donation
|--------------------------------------------------------------------------
|
| Detailed capability rules remain inside controller.
|--------------------------------------------------------------------------
*/
router.post(
  '/',

  requireVerifiedInstitution,

  createDonation
);
/*
|--------------------------------------------------------------------------
| Public-within-authorized-app donor lookup
|--------------------------------------------------------------------------
*/

router.get(
  '/donor/:donorId',

  requireVerifiedInstitution,

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