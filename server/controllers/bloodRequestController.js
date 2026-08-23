const {
  BloodRequest
} =
  require('../models/BloodRequest');

const {
  createRequest,
  listRequests,
  getRequestById
} =
  require('../services/bloodRequestService');

const {
  broadcastSOS
} =
  require('../services/notificationService');

/*
|--------------------------------------------------------------------------
| POST /api/requests
|--------------------------------------------------------------------------
*/

exports.createBloodRequest =
  async (req, res) => {
    const body = {
      ...(req.body || {})
    };

    /*
     * Authenticated requester.
     *
     * Admin may explicitly specify another requester.
     */
    if (
      req.user &&
      req.user.role ===
        'Admin' &&
      body.requester
    ) {
      // Keep Admin's explicit target.
    } else if (req.user) {
      body.requester =
        req.user._id;
    }

    try {
      const request =
        await createRequest(
          body
        );

      /*
      |--------------------------------------------------------------------------
      | EMERGENCY SOS BROADCAST
      |--------------------------------------------------------------------------
      |
      | Every ACTIVE BloodBridge user receives:
      |
      | 1. Navbar bell notification
      | 2. Separate real email
      |
      | Individual delivery failures do not cancel the SOS request.
      |--------------------------------------------------------------------------
      */

      if (
        request.isSOS
      ) {
        try {
          const results =
            await broadcastSOS(
              request
            );

          console.log(
            `SOS broadcast attempted for ${results.length} active user(s).`
          );
        } catch (
          broadcastErr
        ) {
          console.error(
            'SOS broadcast failed:',
            broadcastErr.message
          );
        }
      }

      return res
        .status(201)
        .json({
          success:
            true,

          message:
            request.isSOS
              ? 'Emergency SOS created and notifications dispatched'
              : 'Blood request created successfully',

          data:
            request
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
| My requests
|--------------------------------------------------------------------------
*/

exports.getMyBloodRequests =
  async (req, res) => {
    const query = {
      ...(req.query || {}),

      requester:
        req.user._id
    };

    const {
      results,
      total,
      page,
      pages,
      appliedFilters
    } =
      await listRequests(
        query
      );

    return res.json({
      success:
        true,

      count:
        results.length,

      total,
      page,
      pages,
      appliedFilters,

      data:
        results
    });
  };

/*
|--------------------------------------------------------------------------
| List requests
|--------------------------------------------------------------------------
*/

exports.getBloodRequests =
  async (req, res) => {
    const {
      results,
      total,
      page,
      pages,
      appliedFilters
    } =
      await listRequests(
        req.query
      );

    return res.json({
      success:
        true,

      count:
        results.length,

      total,
      page,
      pages,
      appliedFilters,

      data:
        results
    });
  };

/*
|--------------------------------------------------------------------------
| Single request
|--------------------------------------------------------------------------
*/

exports.getBloodRequestById =
  async (req, res) => {
    const request =
      await getRequestById(
        req.params.id
      );

    if (!request) {
      return res
        .status(404)
        .json({
          success:
            false,

          message:
            'Blood request not found'
        });
    }

    return res.json({
      success:
        true,

      data:
        request
    });
  };

/*
|--------------------------------------------------------------------------
| Update request
|--------------------------------------------------------------------------
*/

exports.updateBloodRequest =
  async (req, res) => {
    const body =
      req.body || {};

    const existing =
      await BloodRequest.findById(
        req.params.id
      );

    if (!existing) {
      return res
        .status(404)
        .json({
          success:
            false,

          message:
            'Blood request not found'
        });
    }

    if (
      req.user &&
      req.user.role !==
        'Admin' &&
      String(
        existing.requester
      ) !==
        String(
          req.user._id
        )
    ) {
      return res
        .status(403)
        .json({
          success:
            false,

          message:
            'Not authorized to modify this request'
        });
    }

    delete body.status;
    delete body.requester;
    delete body.matchedDonors;

    const request =
      await BloodRequest
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

      data:
        request
    });
  };

/*
|--------------------------------------------------------------------------
| Cancel request
|--------------------------------------------------------------------------
*/

exports.deleteBloodRequest =
  async (req, res) => {
    const request =
      await BloodRequest
        .findByIdAndUpdate(
          req.params.id,

          {
            isActive:
              false,

            status:
              'cancelled'
          },

          {
            new:
              true
          }
        );

    if (!request) {
      return res
        .status(404)
        .json({
          success:
            false,

          message:
            'Blood request not found'
        });
    }

    return res.json({
      success:
        true,

      message:
        'Blood request cancelled'
    });
  };