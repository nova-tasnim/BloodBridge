const mongoose =
  require('mongoose');

const Feedback =
  require('../models/Feedback');

const {
  BloodRequest
} =
  require('../models/BloodRequest');

const DonationRecord =
  require('../models/DonationRecord');

/*
|--------------------------------------------------------------------------
| Submit feedback
|--------------------------------------------------------------------------
|
| Admin may moderate feedback but may NOT submit feedback.
|
| Request feedback:
| - request must be fulfilled
| - authenticated requester must own it
|
| Donation feedback:
| - donation must be approved
| - authenticated donor must own it
|
*/

exports.submitFeedback =
  async (req, res) => {
    try {
      /*
       * Admin is a moderator, not a reviewer.
       */
      if (
        req.user?.role ===
        'Admin'
      ) {
        return res
          .status(403)
          .json({
            success: false,

            message:
              'Admins may review and moderate feedback but cannot submit feedback'
          });
      }

      const {
        targetType,
        targetId,
        rating,
        comment = ''
      } =
        req.body || {};

      if (
        !targetType ||
        !targetId ||
        rating === undefined
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              'Missing required fields'
          });
      }

      if (
        !mongoose
          .Types
          .ObjectId
          .isValid(
            targetId
          )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              'Invalid target ID'
          });
      }

      const numericRating =
        Number(rating);

      if (
        !Number.isInteger(
          numericRating
        ) ||
        numericRating < 1 ||
        numericRating > 5
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              'Rating must be an integer between 1 and 5'
          });
      }

      /*
      |--------------------------------------------------------------------------
      | Fulfilled request feedback
      |--------------------------------------------------------------------------
      */

      if (
        targetType ===
        'request'
      ) {
        const request =
          await BloodRequest
            .findById(
              targetId
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

        if (
          request.status !==
          'fulfilled'
        ) {
          return res
            .status(400)
            .json({
              success: false,

              message:
                'Feedback only allowed on fulfilled requests'
            });
        }

        const isOwner =
          request.requester
            .toString() ===
          req.user._id
            .toString();

        if (!isOwner) {
          return res
            .status(403)
            .json({
              success: false,

              message:
                'Forbidden — you cannot review this request'
            });
        }
      }

      /*
      |--------------------------------------------------------------------------
      | Approved donation feedback
      |--------------------------------------------------------------------------
      |
      | status === approved is the official rule after Phase 6A.
      |
      */

      else if (
        targetType ===
        'donation'
      ) {
        const donation =
          await DonationRecord
            .findById(
              targetId
            );

        if (!donation) {
          return res
            .status(404)
            .json({
              success: false,

              message:
                'Donation record not found'
            });
        }

        if (
          donation.status !==
          'approved'
        ) {
          return res
            .status(400)
            .json({
              success: false,

              message:
                'Feedback only allowed on approved donations'
            });
        }

        const ownsDonation =
          donation.donor
            .toString() ===
          req.user._id
            .toString();

        if (!ownsDonation) {
          return res
            .status(403)
            .json({
              success: false,

              message:
                'Forbidden — you cannot review this donation'
            });
        }
      }

      else {
        return res
          .status(400)
          .json({
            success: false,

            message:
              'Invalid targetType'
          });
      }

      /*
      |--------------------------------------------------------------------------
      | Duplicate protection
      |--------------------------------------------------------------------------
      */

      const existing =
        await Feedback
          .findOne({
            userId:
              req.user._id,

            targetType,

            targetId
          });

      if (existing) {
        return res
          .status(409)
          .json({
            success: false,

            message:
              'You have already submitted feedback for this item'
          });
      }

      const feedback =
        await Feedback
          .create({
            userId:
              req.user._id,

            targetType,

            targetId,

            rating:
              numericRating,

            comment:
              String(comment)
                .trim()
          });

      return res
        .status(201)
        .json({
          success: true,
          data: feedback
        });
    } catch (err) {
      if (
        err.code ===
        11000
      ) {
        return res
          .status(409)
          .json({
            success: false,

            message:
              'You have already submitted feedback for this item'
          });
      }

      return res
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
| Feedback for target
|--------------------------------------------------------------------------
*/

exports.getFeedbackForTarget =
  async (req, res) => {
    try {
      const {
        targetId
      } =
        req.params;

      if (
        !mongoose
          .Types
          .ObjectId
          .isValid(
            targetId
          )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              'Invalid target ID'
          });
      }

      const feedback =
        await Feedback
          .find({
            targetId
          })

          .populate(
            'userId',
            'name role'
          )

          .sort({
            createdAt:
              -1
          });

      return res.json({
        success: true,
        data: feedback
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

/*
|--------------------------------------------------------------------------
| Average rating
|--------------------------------------------------------------------------
*/

exports.getAverageRating =
  async (req, res) => {
    try {
      const {
        targetId
      } =
        req.params;

      if (
        !mongoose
          .Types
          .ObjectId
          .isValid(
            targetId
          )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              'Invalid target ID'
          });
      }

      const result =
        await Feedback
          .aggregate([
            {
              $match: {
                targetId:
                  new mongoose
                    .Types
                    .ObjectId(
                      targetId
                    )
              }
            },

            {
              $group: {
                _id:
                  '$targetId',

                averageRating: {
                  $avg:
                    '$rating'
                },

                totalReviews: {
                  $sum:
                    1
                }
              }
            }
          ]);

      if (
        result.length ===
        0
      ) {
        return res.json({
          success: true,

          data: {
            averageRating:
              0,

            totalReviews:
              0
          }
        });
      }

      return res.json({
        success: true,

        data: {
          averageRating:
            Math.round(
              result[0]
                .averageRating *
                10
            ) /
            10,

          totalReviews:
            result[0]
              .totalReviews
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

/*
|--------------------------------------------------------------------------
| Recent platform feedback
|--------------------------------------------------------------------------
|
| This is used for Admin moderation.
|
*/

exports.getRecentFeedback =
  async (req, res) => {
    try {
      const page =
        Math.max(
          parseInt(
            req.query.page,
            10
          ) || 1,
          1
        );

      const limit =
        Math.min(
          Math.max(
            parseInt(
              req.query.limit,
              10
            ) || 10,
            1
          ),
          50
        );

      const feedback =
        await Feedback
          .find()

          .populate(
            'userId',
            'name email role'
          )

          .sort({
            createdAt:
              -1
          })

          .skip(
            (
              page -
              1
            ) *
            limit
          )

          .limit(
            limit
          );

      return res.json({
        success: true,
        data: feedback
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

/*
|--------------------------------------------------------------------------
| Admin moderation
|--------------------------------------------------------------------------
*/

exports.deleteFeedback =
  async (req, res) => {
    try {
      const {
        feedbackId
      } =
        req.params;

      if (
        !mongoose
          .Types
          .ObjectId
          .isValid(
            feedbackId
          )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              'Invalid feedback ID'
          });
      }

      const feedback =
        await Feedback
          .findByIdAndDelete(
            feedbackId
          );

      if (!feedback) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              'Feedback not found'
          });
      }

      return res.json({
        success: true,

        message:
          'Feedback removed successfully'
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