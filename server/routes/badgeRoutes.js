const express =
  require('express');

const router =
  express.Router();

const badgeController =
  require('../controllers/badgeController');

const {
  protect,
  donorOwnerOrRoles
} =
  require('../middleware/auth');

router.use(
  protect
);

/*
|--------------------------------------------------------------------------
| Check/recalculate donor badge state
|--------------------------------------------------------------------------
|
| Owner:
| - Native Donor
| - Patient-donor
|
| Hospital / BloodBank / Admin may also check another donor.
|
*/

router.post(
  '/donor/:donorId/check',

  donorOwnerOrRoles(
    'donorId',
    'Hospital',
    'BloodBank',
    'Admin'
  ),

  badgeController
    .checkAndAwardBadges
);

/*
|--------------------------------------------------------------------------
| Leaderboard
|--------------------------------------------------------------------------
*/

router.get(
  '/leaderboard',

  badgeController
    .getLeaderboard
);

/*
|--------------------------------------------------------------------------
| Donor badge summary
|--------------------------------------------------------------------------
|
| Badge achievement is treated as an authenticated/public donor statistic
| inside BloodBridge.
|
*/

router.get(
  '/donor/:donorId',

  badgeController
    .getDonorBadges
);

module.exports =
  router;