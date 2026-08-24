const express =
  require('express');

const router =
  express.Router();

const {
  BloodRequest
} =
  require('../models/BloodRequest');

const {
  createBloodRequest,
  getBloodRequests,
  getBloodRequestById,
  getMyBloodRequests,
  updateBloodRequest,
  deleteBloodRequest
} =
  require('../controllers/bloodRequestController');

const {
  getMatches,
  runMatching
} =
  require('../controllers/matchingController');

const {
  changeStatus,
  respond,
  fulfil,
  invite,
  getTimeline,
  getTransitionMap,
  getAllowed
} =
  require('../controllers/lifecycleController');

const {
  protect,
  authorize,
  requireDonorCapability,
  requireVerifiedInstitution
} =
  require('../middleware/auth');

/*
|--------------------------------------------------------------------------
| Request ownership/staff middleware
|--------------------------------------------------------------------------
*/

async function isRequestOwnerOrStaff(
  req,
  res,
  next
) {
  try {
    const request =
      await BloodRequest.findById(
        req.params.id
      );

    if (!request) {
      return res
        .status(404)
        .json({
          success: false,
          message:
            'Request not found'
        });
    }

    const isOwner =
      String(
        request.requester
      ) ===
      String(
        req.user._id
      );

    const isStaff =
      [
        'Hospital',
        'BloodBank',
        'Admin'
      ].includes(
        req.user.role
      );

    if (
      !isOwner &&
      !isStaff
    ) {
      return res
        .status(403)
        .json({
          success: false,

          message:
            'Forbidden — not authorized to manage this request'
        });
    }

    req.bloodRequest =
      request;

    next();
  } catch (err) {
    next(err);
  }
}

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/

router.use(
  protect
);

/*
|--------------------------------------------------------------------------
| Lifecycle metadata
|--------------------------------------------------------------------------
*/

router.get(
  '/lifecycle/transitions',
  getTransitionMap
);

/*
|--------------------------------------------------------------------------
| Create / list requests
|--------------------------------------------------------------------------
|
| Capability matrix:
|
| Donor          ✅
| Patient        ✅
| Patient-donor  ✅ (role remains Patient)
| Hospital       ✅
| BloodBank      ❌
| Admin          ✅
|--------------------------------------------------------------------------
*/

router
  .route('/')

  .post(
    authorize(
      'Patient',
      'Donor',
      'Hospital',
      'Admin'
    ),

    createBloodRequest
  )

  .get(
    getBloodRequests
  );

/*
|--------------------------------------------------------------------------
| Own created requests
|--------------------------------------------------------------------------
*/

router.get(
  '/my',
  getMyBloodRequests
);

/*
|--------------------------------------------------------------------------
| Matching
|--------------------------------------------------------------------------
|
| Viewing matching calculation remains authenticated.
|
| Actually running/persisting matching:
|
| Hospital
| BloodBank
| Admin
|--------------------------------------------------------------------------
*/

router.get(
  '/:id/matches',
  getMatches
);

router.post(
  '/:id/matches',

  authorize(
    'Hospital',
    'BloodBank',
    'Admin'
  ),

  runMatching
);

/*
|--------------------------------------------------------------------------
| Lifecycle
|--------------------------------------------------------------------------
*/

router.get(
  '/:id/timeline',

  requireVerifiedInstitution,

  getTimeline
);
router.get(
  '/:id/allowed-transitions',
  getAllowed
);

/*
 * Owner can cancel.
 *
 * Staff may manage other valid state transitions.
 *
 * Controller enforces exact transition capability.
 */
router.patch(
  '/:id/status',

  requireVerifiedInstitution,

  isRequestOwnerOrStaff,

  changeStatus
);

/*
|--------------------------------------------------------------------------
| DONOR RESPONSE
|--------------------------------------------------------------------------
|
| Native Donor ✅
| Patient + donorProfile ✅
|
| No role === Donor authorization here.
|--------------------------------------------------------------------------
*/

router.post(
  '/:id/respond',

  requireDonorCapability,

  respond
);

/*
|--------------------------------------------------------------------------
| VERIFIED FULFILLMENT
|--------------------------------------------------------------------------
|
| Capability matrix:
|
| Donor          ❌
| Patient        ❌
| Patient-donor  ❌
| Hospital       ✅
| BloodBank      ✅
| Admin          ✅
|--------------------------------------------------------------------------
*/

router.post(
  '/:id/fulfil',

  authorize(
    'Hospital',
    'BloodBank',
    'Admin'
  ),

  fulfil
);

/*
|--------------------------------------------------------------------------
| Invitations
|--------------------------------------------------------------------------
*/

router.post(
  '/:id/invite',

  authorize(
    'Hospital',
    'BloodBank',
    'Admin'
  ),

  invite
);

/*
|--------------------------------------------------------------------------
| Request details/edit/cancel
|--------------------------------------------------------------------------
*/

router
  .route('/:id')

  .get(
    getBloodRequestById
  )

.put(
  requireVerifiedInstitution,
  isRequestOwnerOrStaff,
  updateBloodRequest
)

  .delete(
    requireVerifiedInstitution,
    isRequestOwnerOrStaff,
    deleteBloodRequest
  );

module.exports =
  router;