const {
  BloodRequest
} = require('../models/BloodRequest');

const {
  ACTIVE_REQUEST_STATUSES,
  formatRate,
  getPlatformOverviewStats
} = require(
  '../services/platformStatsService'
);

/*
|--------------------------------------------------------------------------
| Platform overview — LiveStatsBar
|--------------------------------------------------------------------------
*/

exports.getPlatformOverview =
  async (
    req,
    res
  ) => {
    try {
      const stats =
        await getPlatformOverviewStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (err) {
      res
        .status(500)
        .json({
          success: false,
          message:
            err.message
        });
    }
  };

/*
|--------------------------------------------------------------------------
| Request history
|--------------------------------------------------------------------------
*/

exports.getRequestHistory =
  async (
    req,
    res
  ) => {
    try {
      const {
        requesterId
      } = req.params;

      const requests =
        await BloodRequest
          .find({
            requester:
              requesterId
          })
          .sort({
            createdAt: -1
          });

      res.json({
        success: true,
        data: requests
      });
    } catch (err) {
      res
        .status(500)
        .json({
          success: false,
          message:
            err.message
        });
    }
  };

/*
|--------------------------------------------------------------------------
| Fulfillment statistics
|--------------------------------------------------------------------------
|
| Important:
|
| Do NOT start with:
|
| { isActive: true }
|
| and then try to count fulfilled requests.
|
| Fulfilled requests are intentionally inactive.
|
*/

exports.getFulfillmentStats =
  async (
    req,
    res
  ) => {
    try {
      const {
        requesterId
      } = req.query;

      /*
       * Base filter determines only whose requests
       * we are measuring.
       */
      const baseFilter = {};

      if (requesterId) {
        baseFilter.requester =
          requesterId;
      }

      const [
        totalRequests,
        activeRequests,
        fulfilledRequests,
        pendingRequests,
        byBloodGroup
      ] =
        await Promise.all([
          /*
           * Historical total.
           */
          BloodRequest
            .countDocuments(
              baseFilter
            ),

          /*
           * Currently active requests.
           */
          BloodRequest
            .countDocuments({
              ...baseFilter,

              isActive:
                true,

              status: {
                $in:
                  ACTIVE_REQUEST_STATUSES
              }
            }),

          BloodRequest
            .countDocuments({
              ...baseFilter,

              status:
                'fulfilled'
            }),

          BloodRequest
            .countDocuments({
              ...baseFilter,

              status:
                'pending'
            }),

          BloodRequest.aggregate([
            {
              $match:
                baseFilter
            },

            {
              $group: {
                _id:
                  '$bloodGroup',

                count: {
                  $sum: 1
                }
              }
            }
          ])
        ]);

      res.json({
        success: true,

        data: {
          totalRequests,
          activeRequests,
          fulfilledRequests,
          pendingRequests,

          fulfillmentRate:
            formatRate(
              fulfilledRequests,
              totalRequests
            ),

          byBloodGroup
        }
      });
    } catch (err) {
      res
        .status(500)
        .json({
          success: false,
          message:
            err.message
        });
    }
  };