const { User } = require('../models/User');
const { BloodRequest } = require('../models/BloodRequest');

const {
  checkEligibility
} = require('./eligibilityService');

const {
  getCompatibleDonorGroups,
  compatibilityScore
} = require('./compatibilityService');

const {
  normalizeDonor
} = require('./donorIdentityService');

const EARTH_RADIUS_KM = 6378.1;

const SCORE_WEIGHTS = {
  compatibility: 40,
  proximity: 30,
  recency: 20,
  reliability: 10
};

const DEFAULT_SEARCH_RADIUS_KM = 15;
const MAX_USEFUL_DISTANCE_KM = 25;
const IDEAL_RECENCY_DAYS = 180;

/*
|--------------------------------------------------------------------------
| Distance
|--------------------------------------------------------------------------
*/

function haversineDistanceKm(
  [lng1, lat1],
  [lng2, lat2]
) {
  const toRad =
    (deg) =>
      (deg * Math.PI) / 180;

  const dLat =
    toRad(lat2 - lat1);

  const dLng =
    toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;

  return (
    2 *
    EARTH_RADIUS_KM *
    Math.asin(Math.sqrt(a))
  );
}

/*
|--------------------------------------------------------------------------
| Scoring helpers
|--------------------------------------------------------------------------
*/

function proximityScore(distanceKm) {
  if (distanceKm == null) {
    return 0;
  }

  if (
    distanceKm >=
    MAX_USEFUL_DISTANCE_KM
  ) {
    return 0;
  }

  return (
    1 -
    distanceKm /
      MAX_USEFUL_DISTANCE_KM
  );
}

function recencyScore(
  lastDonationDate
) {
  if (!lastDonationDate) {
    return 1;
  }

  const days =
    Math.floor(
      (
        Date.now() -
        new Date(
          lastDonationDate
        ).getTime()
      ) /
        (
          1000 *
          60 *
          60 *
          24
        )
    );

  return Math.min(
    days /
      IDEAL_RECENCY_DAYS,
    1
  );
}

function reliabilityScore(donor) {
  return Math.min(
    (
      donor.totalDonations ||
      0
    ) / 5,
    1
  );
}

/*
|--------------------------------------------------------------------------
| Score one normalized donor
|--------------------------------------------------------------------------
*/

function scoreDonor(
  donor,
  request
) {
  const distanceKm =
    donor.location &&
    donor.location.coordinates &&
    request.location
      ? haversineDistanceKm(
          donor.location.coordinates,
          request.location.coordinates
        )
      : null;

  const components = {
    compatibility:
      compatibilityScore(
        donor.bloodGroup,
        request.bloodGroup
      ),

    proximity:
      proximityScore(
        distanceKm
      ),

    recency:
      recencyScore(
        donor.lastDonationDate
      ),

    reliability:
      reliabilityScore(
        donor
      )
  };

  const weighted = {};

  let total = 0;

  for (
    const [key, weight]
    of Object.entries(
      SCORE_WEIGHTS
    )
  ) {
    const points =
      Math.round(
        components[key] *
          weight *
          100
      ) / 100;

    weighted[key] =
      points;

    total += points;
  }

  return {
    score:
      Math.round(
        total * 100
      ) / 100,

    distanceKm:
      distanceKm == null
        ? null
        : Math.round(
            distanceKm *
              100
          ) / 100,

    breakdown:
      weighted,

    rawComponents:
      components
  };
}

/*
|--------------------------------------------------------------------------
| Find compatible donors
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| We no longer use Donor.find().
|
| Matching must include:
|
| Nova:
| role = Donor
|
| AND
|
| Kader:
| role = Patient
| donorProfile != null
|--------------------------------------------------------------------------
*/

async function findMatches(
  requestId,
  options = {}
) {
  const request =
    await BloodRequest.findById(
      requestId
    );

  if (!request) {
    const err =
      new Error(
        'Blood request not found.'
      );

    err.statusCode = 404;

    throw err;
  }

  const radiusKm =
    Number(options.radius) ||
    DEFAULT_SEARCH_RADIUS_KM;

  const limit =
    Number(options.limit) ||
    10;

  const includeIneligible =
    options.includeIneligible ===
    'true';

  const compatibleGroups =
    getCompatibleDonorGroups(
      request.bloodGroup
    );

  /*
  |--------------------------------------------------------------------------
  | Universal donor query
  |--------------------------------------------------------------------------
  */

  const query = {
    isActive: true,

    $or: [
      /*
       * Native Donor
       */
      {
        role: 'Donor',

        isAvailable: true,

        bloodGroup: {
          $in:
            compatibleGroups
        }
      },

      /*
       * Donor-capable Patient
       */
      {
        role: 'Patient',

        donorProfile: {
          $ne: null
        },

        'donorProfile.isAvailable':
          true,

        'donorProfile.bloodGroup': {
          $in:
            compatibleGroups
        }
      }
    ]
  };

  /*
   * Location exists at User level for both architectures.
   */
  if (
    request.location &&
    request.location.coordinates
  ) {
    query.location = {
      $geoWithin: {
        $centerSphere: [
          request.location
            .coordinates,

          radiusKm /
            EARTH_RADIUS_KM
        ]
      }
    };
  }

  const users =
    await User.find(query);

  /*
   * Convert both user architectures into one donor shape.
   */
  const candidates =
    users
      .map(
        normalizeDonor
      )
      .filter(Boolean);

  const eligible = [];
  const rejected = [];

  for (
    const donor
    of candidates
  ) {
    const eligibility =
      checkEligibility(
        donor
      );

    const scored =
      scoreDonor(
        donor,
        request
      );

    const entry = {
      /*
       * DonorResponse and BloodRequest.matchedDonors both reference
       * the underlying User document.
       */
      donorId:
        donor._id,

      publicId:
        donor.publicId,

      donorType:
        donor.donorType,

      name:
        donor.name,

      bloodGroup:
        donor.bloodGroup,

      phone:
        donor.phone,

      area:
        donor.location
          ? donor.location.address
          : null,

      totalDonations:
        donor.totalDonations,

      lastDonationDate:
        donor.lastDonationDate,

      ...scored
    };

    if (
      eligibility.eligible
    ) {
      eligible.push(
        entry
      );
    } else {
      rejected.push({
        ...entry,

        ineligibilityReasons:
          eligibility.reasons,

        nextEligibleDate:
          eligibility.nextEligibleDate
      });
    }
  }

  eligible.sort(
    (a, b) =>
      b.score -
      a.score
  );

  const ranked =
    eligible
      .slice(0, limit)
      .map(
        (donor, index) => ({
          rank:
            index + 1,

          ...donor
        })
      );

  return {
    request: {
      requestId:
        request._id,

      publicId:
        request.publicId,

      patientName:
        request.patientName,

      bloodGroup:
        request.bloodGroup,

      unitsNeeded:
        request.unitsNeeded,

      urgency:
        request.urgency,

      status:
        request.status
    },

    searchCriteria: {
      compatibleGroups,

      radiusKm,

      scoreWeights:
        SCORE_WEIGHTS
    },

    summary: {
      candidatesFound:
        candidates.length,

      eligibleMatches:
        eligible.length,

      excludedByEligibility:
        rejected.length,

      returned:
        ranked.length
    },

    matches:
      ranked,

    excluded:
      includeIneligible
        ? rejected
        : undefined
  };
}

/*
|--------------------------------------------------------------------------
| Persist matches
|--------------------------------------------------------------------------
*/

async function attachMatchesToRequest(
  requestId,
  options = {}
) {
  const result =
    await findMatches(
      requestId,
      options
    );

  const request =
    await BloodRequest.findById(
      requestId
    );

  if (!request) {
    const err =
      new Error(
        'Blood request not found.'
      );

    err.statusCode = 404;

    throw err;
  }

  /*
   * Both Nova and Kader use User._id here.
   */
  request.matchedDonors =
    result.matches.map(
      (match) =>
        match.donorId
    );

  if (
    request.status ===
      'pending' &&
    result.matches.length > 0
  ) {
    request.status =
      'matched';
  }

  await request.save();

  return {
    ...result,

    requestStatus:
      request.status
  };
}

module.exports = {
  findMatches,
  attachMatchesToRequest,
  scoreDonor,
  haversineDistanceKm,
  SCORE_WEIGHTS
};