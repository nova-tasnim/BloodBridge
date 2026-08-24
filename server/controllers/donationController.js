const DonationRecord =
  require('../models/DonationRecord');

const {
  User
} =
  require('../models/User');

const {
  recordDonation,
  approveDonation,
  rejectDonation,
  getPendingDonations,
  getDonationHistory,
  getDonationStats,
  getRegisteredCampaignsForDonor,
  resolveDonor
} =
  require('../services/donationService');

const {
  hasDonorCapability
} =
  require('../services/donorIdentityService');

const {
  notifyUser
} =
  require('../services/notificationService');

/*
|--------------------------------------------------------------------------
| Capability helpers
|--------------------------------------------------------------------------
*/

function canLogForAnotherUser(
  user
) {
  return Boolean(
    user &&
    [
      'Hospital',
      'BloodBank',
      'Admin'
    ].includes(
      user.role
    )
  );
}

function canLookupOtherDonorHistory(
  user
) {
  return Boolean(
    user &&
    [
      'Patient',
      'Hospital',
      'BloodBank',
      'Admin'
    ].includes(
      user.role
    )
  );
}

/*
|--------------------------------------------------------------------------
| Notify Admins of pending donation
|--------------------------------------------------------------------------
*/

async function notifyAdmins(
  record
) {
  try {
    const admins =
      await User.find({
        role:
          'Admin',

        isActive:
          true
      }).select(
        '_id'
      );

    await Promise.allSettled(
      admins.map(
        (admin) =>
          notifyUser({
            userId:
              admin._id,

            type:
              'status_update',

            subject:
              'BloodBridge — Donation Awaiting Approval',

            message:
              `Donation ${record.publicId} is waiting for Admin approval.`,

            eventKey:
              `donation-pending:${record._id}:${admin._id}`
          })
      )
    );
  } catch (err) {
    console.error(
      'Admin donation notification failed:',
      err.message
    );
  }
}

/*
|--------------------------------------------------------------------------
| POST /api/donations
|--------------------------------------------------------------------------
|
| Every permitted submission starts PENDING.
|--------------------------------------------------------------------------
*/

exports.createDonation =
  async (
    req,
    res
  ) => {
    try {
      const user =
        req.user;

      const body =
        req.body ||
        {};

      let donorId =
        null;

      /*
      |--------------------------------------------------------------------------
      | Donor-capable user -> self
      |--------------------------------------------------------------------------
      */

      if (
        hasDonorCapability(
          user
        )
      ) {
        if (
          body.donorId &&
          String(
            body.donorId
          ).trim()
        ) {
          const target =
            await resolveDonor(
              body.donorId
            );

          if (
            !target ||
            String(
              target._id
            ) !==
            String(
              user._id
            )
          ) {
            return res
              .status(403)
              .json({
                success:
                  false,

                message:
                  'You may only submit donations for your own donor profile'
              });
          }
        }

        donorId =
          user._id;
      }

      /*
      |--------------------------------------------------------------------------
      | Staff/Admin -> another donor
      |--------------------------------------------------------------------------
      */

      else if (
        canLogForAnotherUser(
          user
        )
      ) {
        donorId =
          body.donorId;

        if (!donorId) {
          return res
            .status(400)
            .json({
              success:
                false,

              message:
                'Donor ID is required when logging a donation for another donor'
            });
        }
      }

      /*
      |--------------------------------------------------------------------------
      | Plain Patient
      |--------------------------------------------------------------------------
      */

      else {
        return res
          .status(403)
          .json({
            success:
              false,

            message:
              'You are not authorized to log donations'
          });
      }

      const donationType =
        body.donationType ||
        'regular';

      const record =
        await recordDonation({
          donorId,

          donationType,

          campaignId:
            body.campaignId ||
            null,

          bloodRequestId:
            body.bloodRequestId ||
            null,

          bloodBankId:
            body.bloodBankId ||
            (
              user.role ===
                'BloodBank'
                ? user._id
                : null
            ),

          donationDate:
            body.donationDate ||
            new Date(),

          unitsDonated:
            body.unitsDonated,

          locationName:
            body.locationName ||
            '',

          notes:
            body.notes ||
            '',

          submittedBy:
            user._id
        });

      await notifyAdmins(
        record
      );

      return res
        .status(201)
        .json({
          success:
            true,

          message:
            `Donation ${record.publicId} submitted. Waiting for Admin approval.`,

          data:
            record
        });
    } catch (err) {
      console.error(
        'createDonation error:',
        err
      );

      return res
        .status(
          err.statusCode ||
          500
        )
        .json({
          success:
            false,

          message:
            err.message ||
            'Unable to submit donation'
        });
    }
  };

/*
|--------------------------------------------------------------------------
| GET /api/donations/me
|--------------------------------------------------------------------------
|
| Own history includes:
|
| pending
| approved
| rejected
|--------------------------------------------------------------------------
*/

exports.getMyDonationHistory =
  async (
    req,
    res
  ) => {
    try {
      const [
        history,
        stats
      ] =
        await Promise.all([
          getDonationHistory(
            req.user._id,
            {
              includeAll:
                true
            }
          ),

          getDonationStats(
            req.user._id
          )
        ]);

      return res.json({
        success:
          true,

        count:
          history.length,

        stats,

        data:
          history
      });
    } catch (err) {
      return res
        .status(500)
        .json({
          success:
            false,

          message:
            err.message
        });
    }
  };

/*
|--------------------------------------------------------------------------
| GET /api/donations/my-campaigns
|--------------------------------------------------------------------------
*/

exports.getMyRegisteredCampaigns =
  async (
    req,
    res
  ) => {
    try {
      const campaigns =
        await getRegisteredCampaignsForDonor(
          req.user._id
        );

      return res.json({
        success:
          true,

        count:
          campaigns.length,

        data:
          campaigns
      });
    } catch (err) {
      return res
        .status(500)
        .json({
          success:
            false,

          message:
            err.message
        });
    }
  };

/*
|--------------------------------------------------------------------------
| GET /api/donations/donor/:donorId
|--------------------------------------------------------------------------
|
| Other-user lookup shows APPROVED records only.
|--------------------------------------------------------------------------
*/

exports.getDonorHistory =
  async (
    req,
    res
  ) => {
    try {
      const donor =
        await resolveDonor(
          req.params.donorId
        );

      if (!donor) {
        return res
          .status(404)
          .json({
            success:
              false,

            message:
              'Donor not found'
          });
      }

      const own =
        String(
          donor._id
        ) ===
        String(
          req.user._id
        );

      if (
        req.user.role ===
          'Donor' &&
        !own
      ) {
        return res
          .status(403)
          .json({
            success:
              false,

            message:
              'Donors may only view their own donation history'
          });
      }

      if (
        req.user.role !==
          'Donor' &&
        !canLookupOtherDonorHistory(
          req.user
        )
      ) {
        return res
          .status(403)
          .json({
            success:
              false,

            message:
              'You are not authorized to view donor history'
          });
      }

      const [
        history,
        stats
      ] =
        await Promise.all([
          getDonationHistory(
            donor._id,
            {
              includeAll:
                own
            }
          ),

          getDonationStats(
            donor._id
          )
        ]);

      const publicId =
        donor.role ===
          'Donor'
          ? donor.publicId
          : donor
              .donorProfile
              ?.publicId;

      return res.json({
        success:
          true,

        donor: {
          _id:
            donor._id,

          name:
            donor.name,

          publicId:
            publicId ||
            null
        },

        count:
          history.length,

        stats,

        data:
          history
      });
    } catch (err) {
      return res
        .status(
          err.statusCode ||
          500
        )
        .json({
          success:
            false,

          message:
            err.message
        });
    }
  };

/*
|--------------------------------------------------------------------------
| ADMIN: GET pending
|--------------------------------------------------------------------------
*/

exports.getPendingDonationApprovals =
  async (
    req,
    res
  ) => {
    try {
      const records =
        await getPendingDonations();

      return res.json({
        success:
          true,

        count:
          records.length,

        data:
          records
      });
    } catch (err) {
      return res
        .status(500)
        .json({
          success:
            false,

          message:
            err.message
        });
    }
  };

/*
|--------------------------------------------------------------------------
| ADMIN: approve
|--------------------------------------------------------------------------
*/

exports.approveDonationRecord =
  async (
    req,
    res
  ) => {
    try {
      const record =
        await approveDonation(
          req.params.id,
          req.user
        );

      return res.json({
        success:
          true,

        message:
          `Donation ${record.publicId} approved successfully`,

        data:
          record
      });
    } catch (err) {
      return res
        .status(
          err.statusCode ||
          500
        )
        .json({
          success:
            false,

          message:
            err.message
        });
    }
  };

/*
|--------------------------------------------------------------------------
| ADMIN: reject
|--------------------------------------------------------------------------
*/

exports.rejectDonationRecord =
  async (
    req,
    res
  ) => {
    try {
      const record =
        await rejectDonation(
          req.params.id,
          req.user,
          req.body
            ?.reason ||
            ''
        );

      return res.json({
        success:
          true,

        message:
          `Donation ${record.publicId} rejected`,

        data:
          record
      });
    } catch (err) {
      return res
        .status(
          err.statusCode ||
          500
        )
        .json({
          success:
            false,

          message:
            err.message
        });
    }
  };

/*
|--------------------------------------------------------------------------
| GET one
|--------------------------------------------------------------------------
*/

exports.getDonationById =
  async (
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
            'name role publicId donorProfile'
          )

          .populate(
            'submittedBy',
            'name role'
          )

          .populate(
            'approvedBy',
            'name role'
          )

          .populate(
            'campaign',
            'title venue'
          )

          .populate(
            'bloodRequest',
            'publicId patientName'
          );

      if (!record) {
        return res
          .status(404)
          .json({
            success:
              false,

            message:
              'Donation record not found'
          });
      }

      return res.json({
        success:
          true,

        data:
          record
      });
    } catch (err) {
      return res
        .status(500)
        .json({
          success:
            false,

          message:
            err.message
        });
    }
  };