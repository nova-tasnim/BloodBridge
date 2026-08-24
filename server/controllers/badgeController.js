const Badge =
  require('../models/Badge');

const DonationRecord =
  require('../models/DonationRecord');

const { User } =
  require('../models/User');

const {
  resolveDonor,
  normalizeDonor
} =
  require('../services/donorIdentityService');

/*
|--------------------------------------------------------------------------
| Badge milestones
|--------------------------------------------------------------------------
|
| Badge progress is derived from APPROVED DonationRecord history.
| Pending/rejected donations never count.
|
*/

const MILESTONES = [
  {
    name: 'First Donation',
    donationsRequired: 1
  },
  {
    name: 'Bronze Donor',
    donationsRequired: 5
  },
  {
    name: 'Silver Donor',
    donationsRequired: 10
  },
  {
    name: 'Gold Donor',
    donationsRequired: 25
  }
];

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

async function ensureBadgeDefinitions() {
  const badges = [];

  for (const milestone of MILESTONES) {
    const badge =
      await Badge.findOneAndUpdate(
        {
          name: milestone.name
        },
        {
          $set: {
            criteria:
              `${milestone.donationsRequired} donations`,

            donationsRequired:
              milestone.donationsRequired
          }
        },
        {
          upsert: true,
          new: true,
          runValidators: true
        }
      );

    badges.push(badge);
  }

  return badges;
}

async function getApprovedDonationStats(
  donorUserId
) {
  const records =
    await DonationRecord
      .find({
        donor: donorUserId,
        status: 'approved'
      })
      .select(
        'unitsDonated donationDate'
      )
      .lean();

  const donationCount =
    records.length;

  const unitsDonated =
    records.reduce(
      (sum, record) =>
        sum +
        Number(
          record.unitsDonated || 0
        ),
      0
    );

  const lastApprovedDonationDate =
    records.reduce(
      (latest, record) => {
        if (!record.donationDate) {
          return latest;
        }

        const current =
          new Date(record.donationDate);

        if (
          !latest ||
          current > latest
        ) {
          return current;
        }

        return latest;
      },
      null
    );

  return {
    donationCount,
    unitsDonated,
    lastApprovedDonationDate
  };
}

function getEarnedBadges(
  badgeDefinitions,
  donationCount
) {
  return badgeDefinitions
    .filter(
      badge =>
        donationCount >=
        badge.donationsRequired
    )
    .sort(
      (a, b) =>
        a.donationsRequired -
        b.donationsRequired
    );
}

function calculateLivesSaved(
  donationCount
) {
  /*
   * Preserve the project's existing rule:
   * 1 approved donation = up to 3 lives saved.
   */
  return donationCount * 3;
}

async function buildDonorBadgeState(
  user,
  badgeDefinitions
) {
  const donor =
    normalizeDonor(user);

  if (!donor) {
    return null;
  }

  const stats =
    await getApprovedDonationStats(
      user._id
    );

  const badges =
    getEarnedBadges(
      badgeDefinitions,
      stats.donationCount
    );

  return {
    donor,

    donationCount:
      stats.donationCount,

    unitsDonated:
      stats.unitsDonated,

    lastApprovedDonationDate:
      stats.lastApprovedDonationDate,

    livesSaved:
      calculateLivesSaved(
        stats.donationCount
      ),

    badges
  };
}

/*
|--------------------------------------------------------------------------
| Check current badge state
|--------------------------------------------------------------------------
|
| We no longer rely on badge/counter state stored on a separate Donor
| document. Current progress comes from approved DonationRecord history.
|
*/

exports.checkAndAwardBadges =
  async (req, res) => {
    try {
      const user =
        req.donor ||
        await resolveDonor(
          req.params.donorId
        );

      if (!user) {
        return res
          .status(404)
          .json({
            success: false,
            message: 'Donor not found'
          });
      }

      const badgeDefinitions =
        await ensureBadgeDefinitions();

      const state =
        await buildDonorBadgeState(
          user,
          badgeDefinitions
        );

      return res.json({
        success: true,

        donor: {
          ...state.donor,

          livesSaved:
            state.livesSaved,

          badges:
            state.badges
        },

        donationCount:
          state.donationCount,

        unitsDonated:
          state.unitsDonated,

        lastApprovedDonationDate:
          state.lastApprovedDonationDate,

        badges:
          state.badges
      });
    } catch (err) {
      return res
        .status(500)
        .json({
          success: false,
          message: err.message
        });
    }
  };

/*
|--------------------------------------------------------------------------
| Leaderboard
|--------------------------------------------------------------------------
|
| Includes:
| - Native Donor
| - Patient + donorProfile
|
| Ranking is based only on APPROVED DonationRecord history.
|
*/

exports.getLeaderboard =
  async (req, res) => {
    try {
      const badgeDefinitions =
        await ensureBadgeDefinitions();

      const grouped =
        await DonationRecord.aggregate([
          {
            $match: {
              status: 'approved'
            }
          },

          {
            $group: {
              _id: '$donor',

              donationCount: {
                $sum: 1
              },

              unitsDonated: {
                $sum: '$unitsDonated'
              },

              lastApprovedDonationDate: {
                $max: '$donationDate'
              }
            }
          }
        ]);

      if (grouped.length === 0) {
        return res.json([]);
      }

      const donorIds =
        grouped.map(
          item => item._id
        );

      const users =
        await User.find({
          _id: {
            $in: donorIds
          },

          isActive: true
        });

      const usersById =
        new Map(
          users.map(user => [
            user._id.toString(),
            user
          ])
        );

      const leaderboard = [];

      for (const stats of grouped) {
        const user =
          usersById.get(
            stats._id.toString()
          );

        if (!user) {
          continue;
        }

        const donor =
          normalizeDonor(user);

        /*
         * Protect against records belonging to users who are no
         * longer donor-capable.
         */
        if (!donor) {
          continue;
        }

        const badges =
          getEarnedBadges(
            badgeDefinitions,
            stats.donationCount
          );

        leaderboard.push({
          _id:
            user._id,

          publicId:
            donor.publicId,

          name:
            donor.name,

          bloodGroup:
            donor.bloodGroup,

          donorType:
            donor.donorType,

          donationCount:
            stats.donationCount,

          unitsDonated:
            stats.unitsDonated,

          lastApprovedDonationDate:
            stats.lastApprovedDonationDate,

          livesSaved:
            calculateLivesSaved(
              stats.donationCount
            ),

          badges
        });
      }

      /*
       * Primary ranking:
       * number of approved donations.
       *
       * Tie breaker:
       * approved units donated.
       */
      leaderboard.sort(
        (a, b) => {
          if (
            b.donationCount !==
            a.donationCount
          ) {
            return (
              b.donationCount -
              a.donationCount
            );
          }

          if (
            b.unitsDonated !==
            a.unitsDonated
          ) {
            return (
              b.unitsDonated -
              a.unitsDonated
            );
          }

          return a.name.localeCompare(
            b.name
          );
        }
      );

      return res.json(
        leaderboard.slice(0, 20)
      );
    } catch (err) {
      return res
        .status(500)
        .json({
          success: false,
          message: err.message
        });
    }
  };

/*
|--------------------------------------------------------------------------
| Get a specific donor's badges
|--------------------------------------------------------------------------
*/

exports.getDonorBadges =
  async (req, res) => {
    try {
      const user =
        await resolveDonor(
          req.params.donorId
        );

      if (!user) {
        return res
          .status(404)
          .json({
            success: false,
            message: 'Donor not found'
          });
      }

      const badgeDefinitions =
        await ensureBadgeDefinitions();

      const state =
        await buildDonorBadgeState(
          user,
          badgeDefinitions
        );

      return res.json({
        success: true,

        donor: {
          _id:
            state.donor._id,

          publicId:
            state.donor.publicId,

          name:
            state.donor.name,

          donorType:
            state.donor.donorType
        },

        donationCount:
          state.donationCount,

        unitsDonated:
          state.unitsDonated,

        lastApprovedDonationDate:
          state.lastApprovedDonationDate,

        badges:
          state.badges,

        livesSaved:
          state.livesSaved
      });
    } catch (err) {
      return res
        .status(500)
        .json({
          success: false,
          message: err.message
        });
    }
  };