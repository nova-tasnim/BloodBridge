const {
  findMatches,
  attachMatchesToRequest
} =
  require('../services/matchingService');

const {
  getCompatibleDonorGroups,
  getCompatibleRecipientGroups,
  isCompatible,
  RECIPIENT_CAN_RECEIVE_FROM
} =
  require('../services/compatibilityService');

const {
  notifyMatchedDonors
} =
  require('../services/notificationService');

/*
|--------------------------------------------------------------------------
| Preview matches
|--------------------------------------------------------------------------
*/

exports.getMatches =
  async (req, res) => {
    const result =
      await findMatches(
        req.params.id,
        req.query
      );

    return res.json({
      success:
        true,

      data:
        result
    });
  };

/*
|--------------------------------------------------------------------------
| Run + persist matching
|--------------------------------------------------------------------------
*/

exports.runMatching =
  async (req, res) => {
    const result =
      await attachMatchesToRequest(
        req.params.id,
        req.body || {}
      );

    /*
    |--------------------------------------------------------------------------
    | Notify all matched donors
    |--------------------------------------------------------------------------
    |
    | eventKey prevents duplicate emails/notifications if matching is run again
    | for the exact same request/donor.
    |--------------------------------------------------------------------------
    */

    if (
      result.matches?.length
    ) {
      try {
        await notifyMatchedDonors({
          request:
            result.request,

          matches:
            result.matches
        });
      } catch (err) {
        console.error(
          'Matched donor notification failed:',
          err.message
        );
      }
    }

    return res.json({
      success:
        true,

      message:
        `${result.matches.length} donor(s) matched and notified`,

      data:
        result
    });
  };

/*
|--------------------------------------------------------------------------
| Compatibility
|--------------------------------------------------------------------------
*/

exports.getCompatibility =
  async (req, res) => {
    const group =
      req.params.bloodGroup;

    return res.json({
      success:
        true,

      data: {
        bloodGroup:
          group,

        canReceiveFrom:
          getCompatibleDonorGroups(
            group
          ),

        canDonateTo:
          getCompatibleRecipientGroups(
            group
          )
      }
    });
  };

exports.getCompatibilityMatrix =
  async (req, res) => {
    return res.json({
      success:
        true,

      data:
        RECIPIENT_CAN_RECEIVE_FROM
    });
  };

exports.checkCompatibility =
  async (req, res) => {
    const {
      donor,
      recipient
    } =
      req.query;

    if (
      !donor ||
      !recipient
    ) {
      return res
        .status(400)
        .json({
          success:
            false,

          message:
            'Both donor and recipient query parameters are required'
        });
    }

    return res.json({
      success:
        true,

      data: {
        donorGroup:
          donor,

        recipientGroup:
          recipient,

        compatible:
          isCompatible(
            donor,
            recipient
          )
      }
    });
  };