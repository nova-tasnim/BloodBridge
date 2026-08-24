const {
  BloodRequest
} = require('../models/BloodRequest');

const {
  transitionStatus,
  respondToRequest,
  fulfilRequest,
  inviteMatchedDonors,
  getRequestTimeline,
  getAllowedTransitions,
  TRANSITIONS
} = require('../services/requestLifecycleService');

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function isStaff(user) {
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

/*
|--------------------------------------------------------------------------
| PATCH /api/requests/:id/status
|--------------------------------------------------------------------------
*/

exports.changeStatus =
  async (req, res) => {
    try {
      const body =
        req.body || {};

      if (!body.status) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              'status is required'
          });
      }

      const request =
        req.bloodRequest ||
        await BloodRequest.findById(
          req.params.id
        );

      if (!request) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              'Blood request not found'
          });
      }

      const owner =
        String(
          request.requester
        ) ===
        String(
          req.user._id
        );

      const staff =
        isStaff(
          req.user
        );

      /*
       * Fulfillment may NEVER be manually selected.
       */
      if (
        body.status ===
        'fulfilled'
      ) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              'Request fulfillment must be confirmed through the verified fulfillment action.'
          });
      }

      /*
       * Ordinary request owner may only cancel their own request.
       */
      if (
        owner &&
        !staff &&
        body.status !==
          'cancelled'
      ) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              'Request owners may only cancel their own request. Other lifecycle actions require authorized staff.'
          });
      }

      /*
       * Non-owner, non-staff should never reach this point,
       * but keep controller protection too.
       */
      if (
        !owner &&
        !staff
      ) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              'You are not authorized to change this request status.'
          });
      }

      const result =
        await transitionStatus(
          req.params.id,
          body.status,
          body
        );

      return res.json({
        success: true,

        message:
          `Status changed from "${result.previousStatus}" to "${result.currentStatus}"`,

        data:
          result
      });
    } catch (err) {
      return res
        .status(
          err.statusCode ||
          400
        )
        .json({
          success: false,
          message:
            err.message
        });
    }
  };

/*
|--------------------------------------------------------------------------
| POST /api/requests/:id/respond
|--------------------------------------------------------------------------
|
| Route already requires donor capability.
|
| Therefore:
|
| Nova ✅
| Kader ✅
| Patient ❌
| Hospital ❌
| BloodBank ❌
| Admin ❌
|--------------------------------------------------------------------------
*/

exports.respond =
  async (req, res) => {
    try {
      const body =
        req.body || {};

      if (
        !body.decision ||
        ![
          'accepted',
          'declined'
        ].includes(
          body.decision
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              'decision must be either "accepted" or "declined"'
          });
      }

      /*
       * DO NOT accept body.donorId.
       *
       * A donor response always belongs to the authenticated donor.
       */
      const result =
        await respondToRequest(
          req.params.id,
          req.user._id,
          body.decision,
          {
            reason:
              body.reason ||
              '',

            shareLocation:
              Boolean(
                body.shareLocation
              ),

            donorCoordinates:
              body.donorCoordinates,

            donorArea:
              body.donorArea
          }
        );

      return res.json({
        success: true,

        message:
          `${
            result.donorName ||
            'Donor'
          } ${
            result.decision
          } the request`,

        data:
          result
      });
    } catch (err) {
      return res
        .status(
          err.statusCode ||
          400
        )
        .json({
          success: false,
          message:
            err.message
        });
    }
  };

/*
|--------------------------------------------------------------------------
| POST /api/requests/:id/fulfil
|--------------------------------------------------------------------------
|
| Route allows only:
|
| Hospital
| BloodBank
| Admin
|--------------------------------------------------------------------------
*/

exports.fulfil =
  async (req, res) => {
    try {
      const body =
        req.body || {};

      if (!body.donorId) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              'donorId is required to confirm fulfillment'
          });
      }

      const options = {
        ...body,

        verifiedBy:
          req.user._id
      };

      const result =
        await fulfilRequest(
          req.params.id,
          body.donorId,
          options
        );

      return res.json({
        success: true,

        message:
          result.fullyFulfilled
            ? 'Request fully fulfilled and verified donation recorded'
            : `${result.unitsRemaining} unit(s) still required`,

        data:
          result
      });
    } catch (err) {
      return res
        .status(
          err.statusCode ||
          400
        )
        .json({
          success: false,
          message:
            err.message
        });
    }
  };

/*
|--------------------------------------------------------------------------
| Invite
|--------------------------------------------------------------------------
*/

exports.invite =
  async (req, res) => {
    try {
      const body =
        req.body || {};

      const created =
        await inviteMatchedDonors(
          req.params.id,
          body.matches ||
            []
        );

      return res
        .status(201)
        .json({
          success: true,

          message:
            `${created.length} donor(s) invited`,

          data:
            created
        });
    } catch (err) {
      return res
        .status(
          err.statusCode ||
          400
        )
        .json({
          success: false,
          message:
            err.message
        });
    }
  };

/*
|--------------------------------------------------------------------------
| Timeline
|--------------------------------------------------------------------------
*/
exports.getTimeline =
  async (req, res) => {
    try {
      /*
      |--------------------------------------------------------------------------
      | Resolve access first
      |--------------------------------------------------------------------------
      */

      const request =
        await BloodRequest
          .findById(
            req.params.id
          )
          .select(
            'requester matchedDonors'
          );

      if (!request) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              'Blood request not found'
          });
      }

      const viewerId =
        req.user._id;

      const owner =
        String(
          request.requester
        ) ===
        String(
          viewerId
        );

      const staff =
        isStaff(
          req.user
        );

      /*
       * A matched donor must be able to open
       * the timeline before accepting/declining.
       */
      const matchedDonor =
        request
          .matchedDonors
          .some(
            (donorId) =>
              String(
                donorId
              ) ===
              String(
                viewerId
              )
          );

      if (
        !owner &&
        !staff &&
        !matchedDonor
      ) {
        return res
          .status(403)
          .json({
            success: false,

            message:
              'Forbidden — you are not authorized to view this request timeline'
          });
      }

      let visibility =
        'owner';

      if (staff) {
        visibility =
          'staff';
      } else if (
        matchedDonor &&
        !owner
      ) {
        visibility =
          'donor';
      }

      const timeline =
        await getRequestTimeline(
          req.params.id,
          {
            viewerId,
            visibility
          }
        );

      return res.json({
        success: true,

        data:
          timeline
      });
    } catch (err) {
      return res
        .status(
          err.statusCode ||
          500
        )
        .json({
          success: false,

          message:
            err.message
        });
    }
  };
/*
|--------------------------------------------------------------------------
| Transition map
|--------------------------------------------------------------------------
*/

exports.getTransitionMap =
  async (req, res) => {
    return res.json({
      success: true,

      data: {
        transitions:
          TRANSITIONS,

        description:
          'Generic state transitions. Fulfillment is only completed through verified donation fulfillment.'
      }
    });
  };

/*
|--------------------------------------------------------------------------
| Allowed transitions
|--------------------------------------------------------------------------
*/

exports.getAllowed =
  async (req, res) => {
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
              'Blood request not found'
          });
      }

      return res.json({
        success: true,

        data: {
          currentStatus:
            request.status,

          allowedNext:
            getAllowedTransitions(
              request.status
            )
        }
      });
    } catch (err) {
      return res
        .status(500)
        .json({
          success: false,
          message:
            err.message
        });
    }
  };