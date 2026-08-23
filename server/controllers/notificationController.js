const Notification =
  require('../models/Notification');

const {
  User
} =
  require('../models/User');

const {
  notifyUser
} =
  require('../services/notificationService');

/*
|--------------------------------------------------------------------------
| Internal compatibility function
|--------------------------------------------------------------------------
|
| requestLifecycleService already calls:
|
| createNotification(...)
|
| We retain that function name, but it now produces BOTH:
|
| - navbar notification
| - real email
|--------------------------------------------------------------------------
*/

exports.createNotification =
  async (
    userId,
    message,
    type = 'general'
  ) => {
    const result =
      await notifyUser({
        userId,
        message,
        type
      });

    return (
      result?.notification ||
      null
    );
  };

/*
|--------------------------------------------------------------------------
| Manual staff matched-donor notification endpoint
|--------------------------------------------------------------------------
|
| Matching will also be wired automatically, but this endpoint can remain.
|--------------------------------------------------------------------------
*/

exports.notifyMatchedDonors =
  async (req, res) => {
    try {
      const {
        donorIds,
        requestId,
        message
      } =
        req.body;

      if (
        !Array.isArray(
          donorIds
        )
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              'donorIds must be an array'
          });
      }

      const results = [];

      for (
        const donorId
        of donorIds
      ) {
        const donor =
          await User.findById(
            donorId
          );

        if (!donor) {
          continue;
        }

        const result =
          await notifyUser({
            userId:
              donor._id,

            message:
              message ||
              `You have been matched to blood request ${requestId}.`,

            type:
              'match',

            subject:
              'BloodBridge — You Have Been Matched',

            eventKey:
              requestId
                ? `manual-match:${requestId}:${donor._id}`
                : null
          });

        results.push(
          result
        );
      }

      return res
        .status(201)
        .json({
          success:
            true,

          count:
            results.length,

          data:
            results
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
| Logged-in user's notifications
|--------------------------------------------------------------------------
*/

exports.getMyNotifications =
  async (req, res) => {
    try {
      const notifications =
        await Notification
          .find({
            userId:
              req.user._id
          })
          .sort({
            createdAt: -1
          })
          .limit(50);

      const unreadCount =
        notifications.filter(
          (notification) =>
            !notification.isRead
        ).length;

      return res.json({
        success:
          true,

        data:
          notifications,

        unreadCount
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
| User-specific history
|--------------------------------------------------------------------------
*/

exports.getUserNotifications =
  async (req, res) => {
    try {
      const notifications =
        await Notification
          .find({
            userId:
              req.params.userId
          })
          .sort({
            createdAt: -1
          });

      return res.json({
        success:
          true,

        data:
          notifications
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
| Mark one read
|--------------------------------------------------------------------------
*/

exports.markAsRead =
  async (req, res) => {
    try {
      const notification =
        await Notification.findById(
          req.params.notificationId
        );

      if (!notification) {
        return res
          .status(404)
          .json({
            success:
              false,

            message:
              'Notification not found'
          });
      }

      const isOwner =
        String(
          notification.userId
        ) ===
        String(
          req.user._id
        );

      const isAdmin =
        req.user.role ===
        'Admin';

      if (
        !isOwner &&
        !isAdmin
      ) {
        return res
          .status(403)
          .json({
            success:
              false,

            message:
              'Forbidden — not your notification'
          });
      }

      notification.isRead =
        true;

      await notification.save();

      return res.json({
        success:
          true,

        data:
          notification
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
| Mark all read
|--------------------------------------------------------------------------
*/

exports.markAllAsRead =
  async (req, res) => {
    try {
      const result =
        await Notification.updateMany(
          {
            userId:
              req.user._id,

            isRead:
              false
          },

          {
            $set: {
              isRead:
                true
            }
          }
        );

      return res.json({
        success:
          true,

        updatedCount:
          result.modifiedCount
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