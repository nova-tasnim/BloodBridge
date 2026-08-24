const mongoose = require('mongoose');
const { User } = require('../models/User');
const { BloodRequest } = require('../models/BloodRequest');
const DonationRecord = require('../models/DonationRecord');
const {getPlatformOverviewStats} = require(
  '../services/platformStatsService'
);

// 1. Platform overview — high-level counts
exports.getPlatformOverview =
  async (
    req,
    res
  ) => {
    try {
      /*
       * Shared with LiveStatsBar.
       *
       * This prevents Admin and LiveStats from
       * silently using different definitions.
       */
      const stats =
        await getPlatformOverviewStats();

      res.json(stats);
    } catch (err) {
      res
        .status(500)
        .json({
          message:
            err.message
        });
    }
  };


// 2. Shortage trends — requests grouped by blood group and status
exports.getShortageTrends = async (req, res) => {
  try {
    const byBloodGroup = await BloodRequest.aggregate([
      {
        $group: {
          _id: {
            bloodGroup: '$bloodGroup',
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.bloodGroup',
          statusBreakdown: {
            $push: {
              status: '$_id.status',
              count: '$count'
            }
          },
          totalRequests: { $sum: '$count' }
        }
      },
      {
        $sort: {
          totalRequests: -1
        }
      }
    ]);

    const byLocation = await BloodRequest.aggregate([
      {
        $group: {
          _id: '$location.address',
          totalRequests: { $sum: 1 },
          pendingCount: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'pending'] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: {
          totalRequests: -1
        }
      },
      {
        $limit: 10
      }
    ]);

    res.json({
      byBloodGroup,
      byLocation
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// 3. Donor retention — one-time vs repeat vs highly active donors
exports.getDonorRetention =
  async (
    req,
    res
  ) => {
    try {
      /*
       * Only approved DonationRecords are
       * official donation history.
       *
       * Pending/rejected submissions must
       * never increase retention metrics.
       */
      const donationCounts =
        await DonationRecord
          .aggregate([
            {
              $match: {
                status:
                  'approved'
              }
            },

            {
              $group: {
                _id:
                  '$donor',

                donationCount: {
                  $sum: 1
                }
              }
            }
          ]);

      const totalDonorsWithDonations =
        donationCounts.length;

      const oneTimeDonors =
        donationCounts.filter(
          donor =>
            donor.donationCount ===
            1
        ).length;

      const repeatDonors =
        donationCounts.filter(
          donor =>
            donor.donationCount >=
              2 &&
            donor.donationCount <
              5
        ).length;

      const highlyActiveDonors =
        donationCounts.filter(
          donor =>
            donor.donationCount >=
            5
        ).length;

      const retentionRate =
        totalDonorsWithDonations >
        0
          ? (
              (
                (
                  repeatDonors +
                  highlyActiveDonors
                ) /
                totalDonorsWithDonations
              ) *
              100
            ).toFixed(2)
          : 0;

      res.json({
        totalDonorsWithDonations,
        oneTimeDonors,
        repeatDonors,
        highlyActiveDonors,

        retentionRate:
          `${retentionRate}%`
      });
    } catch (err) {
      res
        .status(500)
        .json({
          message:
            err.message
        });
    }
  };


// 4. Verify a hospital or blood bank
exports.verifyInstitution = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    if (user.role !== 'Hospital' && user.role !== 'BloodBank') {
      return res.status(400).json({
        message: 'Only hospitals and blood banks require verification'
      });
    }

    user.isVerified = true;
    await user.save();

    res.json({
      message: 'Institution verified successfully',
      user
    });
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
};


// 5. Get all pending (unverified) institutions
exports.getPendingVerifications = async (req, res) => {
  try {
    const pending = await User.find({
      role: {
        $in: ['Hospital', 'BloodBank']
      },
      isVerified: false
    }).select('name email role createdAt');

    res.json(pending);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
};


// 6. Manage users — list/search/filter with pagination
exports.getAllUsers = async (req, res) => {
  try {
    const {
      role,
      search,
      page = 1,
      limit = 20
    } = req.query;

    const filter = {};

    if (role) {
      filter.role = role;
    }

    if (search) {
      filter.$or = [
        {
          name: {
            $regex: search,
            $options: 'i'
          }
        },
        {
          email: {
            $regex: search,
            $options: 'i'
          }
        }
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const totalUsers = await User.countDocuments(filter);

    res.json({
      users,
      totalUsers,
      page: Number(page),
      totalPages: Math.ceil(totalUsers / limit)
    });
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
};


// 7. Deactivate a user (soft delete)
exports.deactivateUser =
  async (req, res) => {
    try {
      const user =
        await User.findById(
          req.params.userId
        );

      if (!user) {
        return res
          .status(404)
          .json({
            message:
              'User not found'
          });
      }

      /*
       * Never allow the currently logged-in Admin
       * to deactivate their own account.
       */
      if (
        user.role === 'Admin' &&
        String(user._id) ===
          String(req.user._id)
      ) {
        return res
          .status(403)
          .json({
            message:
              'You cannot deactivate your own Admin account'
          });
      }

      /*
       * Never allow BloodBridge to end up with
       * zero active Admin accounts.
       */
      if (
        user.role === 'Admin'
      ) {
        const activeAdminCount =
          await User
            .countDocuments({
              role: 'Admin',
              isActive: true
            });

        if (
          activeAdminCount <= 1
        ) {
          return res
            .status(400)
            .json({
              message:
                'Cannot deactivate the only active Admin account'
            });
        }
      }

      user.isActive =
        false;

      await user.save();

      return res.json({
        message:
          'User deactivated',

        user
      });
    } catch (err) {
      return res
        .status(500)
        .json({
          message:
            err.message
        });
    }
  };
// 8. Activate a user
exports.activateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isActive: true },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    res.json({
      message: 'User activated',
      user
    });
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
};