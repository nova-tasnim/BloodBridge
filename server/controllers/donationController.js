const DonationRecord = require('../models/DonationRecord');

const {
  recordDonation,
  getDonationHistory,
  getDonationStats,
  resolveDonor
} = require('../services/donationService');

const {
  hasDonorCapability
} = require('../services/donorIdentityService');

/*
|--------------------------------------------------------------------------
| Capability helpers
|--------------------------------------------------------------------------
*/

/*
 * Hospital / BloodBank / Admin may record a donation
 * for another donor.
 */
function canLogForAnotherUser(user) {
  if (!user) {
    return false;
  }

  return [
    'Hospital',
    'BloodBank',
    'Admin'
  ].includes(user.role);
}

/*
 * According to your capability matrix:
 *
 * Native Donor         -> cannot inspect another donor
 * Patient              -> can
 * Patient + donorProfile -> can
 * Hospital             -> can
 * BloodBank            -> can
 * Admin                -> can
 */
function canLookupOtherDonorHistory(user) {
  if (!user) {
    return false;
  }

  return [
    'Patient',
    'Hospital',
    'BloodBank',
    'Admin'
  ].includes(user.role);
}

/*
|--------------------------------------------------------------------------
| POST /api/donations
|--------------------------------------------------------------------------
|
| Native Donor:
|   self-log only
|
| Patient + donorProfile:
|   self-log only
|
| Normal Patient:
|   cannot log donations
|
| Hospital / BloodBank / Admin:
|   can record a donation for another donor
|--------------------------------------------------------------------------
*/

exports.createDonation = async (req, res) => {
  try {
    const user = req.user;
    const body = req.body || {};

    let donorId = null;

    /*
    |--------------------------------------------------------------------------
    | Donor-capable user -> SELF LOG
    |--------------------------------------------------------------------------
    */

    if (hasDonorCapability(user)) {
      /*
       * A donor may not pretend to log for another donor.
       *
       * Normally the frontend should omit donorId completely.
       *
       * If donorId is supplied anyway, it must resolve back to
       * the currently logged-in user's own donor identity.
       */
      if (
        body.donorId &&
        String(body.donorId).trim() !== ''
      ) {
        const targetDonor = await resolveDonor(
          body.donorId
        );

        if (
          !targetDonor ||
          targetDonor._id.toString() !==
            user._id.toString()
        ) {
          return res.status(403).json({
            success: false,
            message:
              'You may only log donations for your own donor profile'
          });
        }
      }

      donorId = user._id;
    }

    /*
    |--------------------------------------------------------------------------
    | Hospital / BloodBank / Admin -> LOG FOR ANOTHER DONOR
    |--------------------------------------------------------------------------
    */

    else if (canLogForAnotherUser(user)) {
      donorId = body.donorId;

      if (!donorId) {
        return res.status(400).json({
          success: false,
          message:
            'Donor ID is required when recording a donation for another donor'
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Ordinary Patient -> forbidden
    |--------------------------------------------------------------------------
    */

    else {
      return res.status(403).json({
        success: false,
        message:
          'You are not authorized to record donations'
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate units
    |--------------------------------------------------------------------------
    */

    const units = Number(body.unitsDonated);

    if (
      !Number.isFinite(units) ||
      units < 0.5
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Units donated must be at least 0.5'
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Determine verification behavior
    |--------------------------------------------------------------------------
    |
    | Self-log:
    |   verifiedBy = null
    |
    | Hospital/BloodBank/Admin log:
    |   verifiedBy = current user
    |
    | This lets institutional/admin logs count as verified records.
    |--------------------------------------------------------------------------
    */

    const verifiedBy =
      canLogForAnotherUser(user)
        ? user._id
        : null;

    /*
    |--------------------------------------------------------------------------
    | Record donation
    |--------------------------------------------------------------------------
    */

    const record = await recordDonation({
      donorId,

      bloodRequestId:
        body.bloodRequestId || null,

      /*
       * Keep the explicit bloodBankId if one is supplied.
       *
       * We are no longer looking up a separate BloodBank profile here,
       * because donor recording authorization is already based on the
       * logged-in User role.
       */
      bloodBankId:
        body.bloodBankId || null,

      donationDate:
        body.donationDate || new Date(),

      unitsDonated:
        units,

      locationName:
        body.locationName || '',

      notes:
        body.notes || '',

      verifiedBy
    });

    return res.status(201).json({
      success: true,

      message:
        canLogForAnotherUser(user)
          ? 'Donation recorded and verified successfully'
          : 'Donation recorded. Awaiting verification.',

      data: record
    });
  } catch (err) {
    console.error(
      'createDonation error:',
      err
    );

    return res.status(
      err.statusCode || 500
    ).json({
      success: false,
      message:
        err.message ||
        'Unable to record donation'
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET /api/donations/me
|--------------------------------------------------------------------------
|
| Native Donor:
|   yes
|
| Patient + donorProfile:
|   yes
|
| Ordinary Patient:
|   no
|--------------------------------------------------------------------------
*/

exports.getMyDonationHistory = async (
  req,
  res
) => {
  try {
    if (
      !hasDonorCapability(req.user)
    ) {
      return res.status(403).json({
        success: false,
        message:
          'Blood donor registration is required to view your donation history'
      });
    }

    /*
     * DonationRecord.donor always stores the underlying User._id.
     *
     * Therefore this works for:
     *
     * Native Donor
     * Patient + donorProfile
     */
    const donorId = req.user._id;

    const [history, stats] =
      await Promise.all([
        getDonationHistory(donorId),
        getDonationStats(donorId)
      ]);

    return res.json({
      success: true,
      count: history.length,
      stats,
      data: history
    });
  } catch (err) {
    console.error(
      'getMyDonationHistory error:',
      err
    );

    return res.status(500).json({
      success: false,
      message:
        err.message ||
        'Unable to load your donation history'
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET /api/donations/donor/:donorId
|--------------------------------------------------------------------------
|
| donorId may be:
|
| Mongo User _id
| DON-XXXXXX native donor
| DON-XXXXXX Patient donor
|--------------------------------------------------------------------------
*/

exports.getDonorHistory = async (
  req,
  res
) => {
  try {
    const donor = await resolveDonor(
      req.params.donorId
    );

    if (!donor) {
      return res.status(404).json({
        success: false,
        message:
          'Donor not found'
      });
    }

    const isOwnDonor =
      donor._id.toString() ===
      req.user._id.toString();

    /*
    |--------------------------------------------------------------------------
    | Native Donor privacy rule
    |--------------------------------------------------------------------------
    |
    | Native Donor:
    | can only inspect own history.
    |--------------------------------------------------------------------------
    */

    if (
      req.user.role === 'Donor' &&
      !isOwnDonor
    ) {
      return res.status(403).json({
        success: false,
        message:
          'Donors may only view their own donation history'
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Other roles must have lookup capability
    |--------------------------------------------------------------------------
    |
    | Patient -> yes
    | Patient donor -> yes
    | Hospital -> yes
    | BloodBank -> yes
    | Admin -> yes
    |--------------------------------------------------------------------------
    */

    if (
      req.user.role !== 'Donor' &&
      !canLookupOtherDonorHistory(req.user)
    ) {
      return res.status(403).json({
        success: false,
        message:
          'You are not authorized to view donor history'
      });
    }

    const [history, stats] =
      await Promise.all([
        getDonationHistory(
          donor._id
        ),

        getDonationStats(
          donor._id
        )
      ]);

    /*
     * Resolve the public donor ID according to architecture.
     */
    const publicId =
      donor.role === 'Donor'
        ? donor.publicId
        : donor.donorProfile?.publicId;

    return res.json({
      success: true,

      donor: {
        _id:
          donor._id,

        name:
          donor.name,

        publicId:
          publicId || null
      },

      count:
        history.length,

      stats,

      data:
        history
    });
  } catch (err) {
    console.error(
      'getDonorHistory error:',
      err
    );

    return res.status(500).json({
      success: false,
      message:
        err.message ||
        'Unable to load donor history'
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET /api/donations/:id
|--------------------------------------------------------------------------
*/

exports.getDonationById = async (
  req,
  res
) => {
  try {
    const record =
      await DonationRecord
        .findById(
          req.params.id
        )

        .populate(
          'donor',
          'name role'
        )

        .populate(
          'verifiedBy',
          'name role'
        );

    if (!record) {
      return res.status(404).json({
        success: false,
        message:
          'Donation record not found'
      });
    }

    return res.json({
      success: true,
      data: record
    });
  } catch (err) {
    console.error(
      'getDonationById error:',
      err
    );

    return res.status(500).json({
      success: false,
      message:
        err.message ||
        'Unable to load donation record'
    });
  }
};