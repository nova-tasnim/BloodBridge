const Campaign =
  require('../models/Campaign');

const CampaignRegistration =
  require('../models/CampaignRegistration');

const {
  createCampaign,
  listCampaigns,
  registerDonor,
  getCampaignRegistrations,
  recordAttendance,
  assertCampaignManager
} =
  require('../services/campaignService');

/*
|--------------------------------------------------------------------------
| POST /api/campaigns
|--------------------------------------------------------------------------
*/

exports.createBloodDrive =
  async (req, res) => {
    try {
      const payload = {
        ...(req.body || {}),

        /*
         * Organizer is always the authenticated creator.
         *
         * Never trust organizer supplied by the frontend/API caller.
         */
        organizer:
          req.user._id
      };

      const campaign =
        await createCampaign(
          payload
        );

      return res
        .status(201)
        .json({
          success:
            true,

          message:
            'Blood drive created successfully',

          data:
            campaign
        });
    } catch (err) {
      if (
        err.statusCode ===
          400 &&
        err.details
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              'Validation failed',

            errors:
              err.details
          });
      }

      throw err;
    }
  };

/*
|--------------------------------------------------------------------------
| GET /api/campaigns
|--------------------------------------------------------------------------
*/

exports.getCampaigns =
  async (req, res) => {
    const {
      results,
      total,
      appliedFilters
    } =
      await listCampaigns(
        req.query
      );

    return res.json({
      success:
        true,

      count:
        results.length,

      total,

      appliedFilters,

      data:
        results
    });
  };

/*
|--------------------------------------------------------------------------
| GET /api/campaigns/:id
|--------------------------------------------------------------------------
*/

exports.getCampaignById =
  async (req, res) => {
    const campaign =
      await Campaign
        .findById(
          req.params.id
        )
        .populate(
          'organizer',
          'name email phone role'
        );

    if (!campaign) {
      return res
        .status(404)
        .json({
          success:
            false,

          message:
            'Campaign not found'
        });
    }

    return res.json({
      success:
        true,

      data:
        campaign
    });
  };

/*
|--------------------------------------------------------------------------
| PUT /api/campaigns/:id
|--------------------------------------------------------------------------
|
| Hospital/BloodBank may modify ONLY their own campaign.
| Admin may modify any campaign.
|--------------------------------------------------------------------------
*/

exports.updateCampaign =
  async (req, res) => {
    try {
      await assertCampaignManager(
        req.params.id,
        req.user
      );

      const body = {
        ...(req.body || {})
      };

      delete body.organizer;
      delete body.registeredCount;
      delete body.unitsCollected;

      const campaign =
        await Campaign
          .findByIdAndUpdate(
            req.params.id,
            body,
            {
              new:
                true,

              runValidators:
                true
            }
          );

      return res.json({
        success:
          true,

        message:
          'Campaign updated successfully',

        data:
          campaign
      });
    } catch (err) {
      return res
        .status(
          err.statusCode ||
          400
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
| DELETE /api/campaigns/:id
|--------------------------------------------------------------------------
*/

exports.deleteCampaign =
  async (req, res) => {
    try {
      await assertCampaignManager(
        req.params.id,
        req.user
      );

      const campaign =
        await Campaign
          .findByIdAndUpdate(
            req.params.id,

            {
              isActive:
                false
            },

            {
              new:
                true
            }
          );

      return res.json({
        success:
          true,

        message:
          'Campaign cancelled',

        data:
          campaign
      });
    } catch (err) {
      return res
        .status(
          err.statusCode ||
          400
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
| POST /api/campaigns/:id/register
|--------------------------------------------------------------------------
|
*/

exports.registerForCampaign =
  async (req, res) => {
    try {
      const result =
        await registerDonor(
          req.params.id,
          req.user._id
        );

      return res
        .status(201)
        .json({
          success:
            true,

          message:
            'Registered successfully',

          data:
            result
        });
    } catch (err) {
      /*
       * Mongo unique fallback protection.
       */
      if (
        err.code ===
        11000
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              'You are already registered for this campaign.'
          });
      }

      return res
        .status(
          err.statusCode ||
          400
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
| GET /api/campaigns/:id/registrations
|--------------------------------------------------------------------------
*/

exports.getRegistrations =
  async (req, res) => {
    try {
      await assertCampaignManager(
        req.params.id,
        req.user
      );

      const registrations =
        await getCampaignRegistrations(
          req.params.id
        );

      return res.json({
        success:
          true,

        count:
          registrations.length,

        data:
          registrations
      });
    } catch (err) {
      return res
        .status(
          err.statusCode ||
          400
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
| PATCH /api/campaigns/registrations/:registrationId
|--------------------------------------------------------------------------
*/

exports.updateAttendance =
  async (req, res) => {
    try {
      const registration =
        await CampaignRegistration
          .findById(
            req.params.registrationId
          );

      if (!registration) {
        return res
          .status(404)
          .json({
            success:
              false,

            message:
              'Registration not found'
          });
      }

      /*
       * Ownership is checked against the campaign.
       */
      await assertCampaignManager(
        registration.campaign,
        req.user
      );

      const updated =
        await recordAttendance(
          req.params.registrationId,

          req.body ||
            {},

          {
            verifiedBy:
              req.user._id,

            bloodBankId:
              req.user.role ===
                'BloodBank'
                ? req.user._id
                : null
          }
        );

      return res.json({
        success:
          true,

        message:
          updated.donated
            ? 'Campaign donation recorded and donation history updated'
            : 'Attendance updated successfully',

        data:
          updated
      });
    } catch (err) {
      return res
        .status(
          err.statusCode ||
          400
        )
        .json({
          success:
            false,

          message:
            err.message
        });
    }
  };