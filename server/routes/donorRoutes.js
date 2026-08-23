const express = require('express');
const router = express.Router();

const {
  createDonor,
  becomeDonor,
  getDonors,
  getDonorById,
  updateDonor,
  deleteDonor,
  getDonorEligibility,
  toggleAvailability
} = require('../controllers/donorController');

const {
  protect,
  authorize,
  donorOwnerOrRoles
} = require('../middleware/auth');

router.use(protect);

/*
|--------------------------------------------------------------------------
| Patient → donor capability
|--------------------------------------------------------------------------
*/

router.post(
  '/become-donor',
  authorize('Patient'),
  becomeDonor
);

/*
|--------------------------------------------------------------------------
| Directory
|--------------------------------------------------------------------------
*/

router
  .route('/')
  .post(
    authorize('Admin'),
    createDonor
  )
  .get(getDonors);

/*
|--------------------------------------------------------------------------
| Eligibility
|--------------------------------------------------------------------------
*/

router.get(
  '/:id/eligibility',

  donorOwnerOrRoles(
    'id',
    'Hospital',
    'BloodBank',
    'Admin'
  ),

  getDonorEligibility
);

/*
|--------------------------------------------------------------------------
| Availability
|--------------------------------------------------------------------------
*/

router.patch(
  '/:id/availability',

  donorOwnerOrRoles(
    'id',
    'Admin'
  ),

  toggleAvailability
);

/*
|--------------------------------------------------------------------------
| Donor detail
|--------------------------------------------------------------------------
*/

router
  .route('/:id')
  .get(getDonorById)
  .put(
    authorize('Admin'),
    updateDonor
  )
  .delete(
    authorize('Admin'),
    deleteDonor
  );

module.exports = router;