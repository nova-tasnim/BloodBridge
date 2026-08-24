const { User } = require('../models/User');
const { BloodRequest } = require('../models/BloodRequest');

/*
|--------------------------------------------------------------------------
| Shared platform-stat definitions
|--------------------------------------------------------------------------
|
| Donor capability:
| - Native Donor
| - Patient + donorProfile
|
| Active request:
| - isActive = true
| - status = pending / matched / accepted
|
*/

const ACTIVE_REQUEST_STATUSES = [
  'pending',
  'matched',
  'accepted'
];

const ACTIVE_DONOR_FILTER = {
  isActive: true,

  $or: [
    {
      role: 'Donor'
    },

    {
      role: 'Patient',
      donorProfile: {
        $ne: null
      }
    }
  ]
};

const ACTIVE_REQUEST_FILTER = {
  isActive: true,

  status: {
    $in: ACTIVE_REQUEST_STATUSES
  }
};

function formatRate(
  numerator,
  denominator
) {
  if (!denominator) {
    return '0.00%';
  }

  return `${
    (
      (
        numerator /
        denominator
      ) *
      100
    ).toFixed(2)
  }%`;
}

async function getPlatformOverviewStats() {
  const startOfMonth =
    new Date();

  startOfMonth.setDate(1);

  startOfMonth.setHours(
    0,
    0,
    0,
    0
  );

  const [
    totalDonors,
    totalPatients,
    totalHospitals,
    totalBloodBanks,
    totalCommunityMembers,
    totalRequestsAllTime,
    activeRequests,
    totalRequestsThisMonth,
    fulfilledRequests
  ] =
    await Promise.all([
      /*
       * Donor capability count.
       *
       * Native Donor
       * OR
       * Patient + donorProfile
       */
      User.countDocuments(
        ACTIVE_DONOR_FILTER
      ),

      /*
       * Patient remains the primary role even
       * when donorProfile exists.
       */
      User.countDocuments({
        role: 'Patient',
        isActive: true
      }),

      User.countDocuments({
        role: 'Hospital',
        isActive: true
      }),

      User.countDocuments({
        role: 'BloodBank',
        isActive: true
      }),

      /*
       * Unique active community accounts.
       *
       * Do NOT calculate this as:
       *
       * donors + patients + hospitals + bloodBanks
       *
       * because Patient-donors would be counted twice.
       */
      User.countDocuments({
        role: {
          $in: [
            'Donor',
            'Patient',
            'Hospital',
            'BloodBank'
          ]
        },

        isActive: true
      }),

      /*
       * Historical total:
       * every request ever created.
       */
      BloodRequest.countDocuments(),

      /*
       * Currently active lifecycle requests.
       */
      BloodRequest.countDocuments(
        ACTIVE_REQUEST_FILTER
      ),

      /*
       * Requests created this month,
       * regardless of later lifecycle status.
       */
      BloodRequest.countDocuments({
        createdAt: {
          $gte:
            startOfMonth
        }
      }),

      BloodRequest.countDocuments({
        status:
          'fulfilled'
      })
    ]);

  return {
    totalDonors,
    totalPatients,
    totalHospitals,
    totalBloodBanks,

    totalCommunityMembers,

    totalRequestsAllTime,
    activeRequests,
    totalRequestsThisMonth,
    fulfilledRequests,

    fulfillmentRate:
      formatRate(
        fulfilledRequests,
        totalRequestsAllTime
      )
  };
}

module.exports = {
  ACTIVE_REQUEST_STATUSES,
  ACTIVE_DONOR_FILTER,
  ACTIVE_REQUEST_FILTER,
  formatRate,
  getPlatformOverviewStats
};