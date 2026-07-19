const Donor = require('../models/Donor');
const { BloodRequest } = require('../models/BloodRequest');
const { checkEligibility } = require('./eligibilityService');
const { getCompatibleDonorGroups, compatibilityScore } = require('./compatibilityService');

const EARTH_RADIUS_KM = 6378.1;

/**
 * Weights for the composite match score. They sum to 100 so the
 * final score reads as a percentage.
 */
const SCORE_WEIGHTS = {
  compatibility: 40,
  proximity: 30,
  recency: 20,
  reliability: 10
};

const DEFAULT_SEARCH_RADIUS_KM = 15;
const MAX_USEFUL_DISTANCE_KM = 25; // beyond this, proximity scores 0
const IDEAL_RECENCY_DAYS = 180;    // a donor 6+ months clear scores full marks

/**
 * Great-circle distance between two [lng, lat] points, in kilometres.
 * Implemented directly rather than via a library, since this is core
 * matching logic.
 */
function haversineDistanceKm([lng1, lat1], [lng2, lat2]) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/** Closer is better. Linear falloff to zero at MAX_USEFUL_DISTANCE_KM. */
function proximityScore(distanceKm) {
  if (distanceKm == null) return 0;
  if (distanceKm >= MAX_USEFUL_DISTANCE_KM) return 0;
  return 1 - distanceKm / MAX_USEFUL_DISTANCE_KM;
}

/**
 * Longer since the last donation is better, up to IDEAL_RECENCY_DAYS.
 * A donor who has never donated scores full marks.
 */
function recencyScore(lastDonationDate) {
  if (!lastDonationDate) return 1;
  const days = Math.floor(
    (Date.now() - new Date(lastDonationDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  return Math.min(days / IDEAL_RECENCY_DAYS, 1);
}

/**
 * Proxy for reliability until Sprint 4's feedback system exists:
 * donors with a track record score higher, plateauing at 5 donations.
 */
function reliabilityScore(donor) {
  return Math.min((donor.totalDonations || 0) / 5, 1);
}

/**
 * Scores a single donor against a request, returning the total
 * alongside the component breakdown so the result is explainable.
 */
function scoreDonor(donor, request) {
  const distanceKm =
    donor.location && donor.location.coordinates && request.location
      ? haversineDistanceKm(donor.location.coordinates, request.location.coordinates)
      : null;

  const components = {
    compatibility: compatibilityScore(donor.bloodGroup, request.bloodGroup),
    proximity: proximityScore(distanceKm),
    recency: recencyScore(donor.lastDonationDate),
    reliability: reliabilityScore(donor)
  };

  const weighted = {};
  let total = 0;
  for (const [key, weight] of Object.entries(SCORE_WEIGHTS)) {
    const points = Math.round(components[key] * weight * 100) / 100;
    weighted[key] = points;
    total += points;
  }

  return {
    score: Math.round(total * 100) / 100,
    distanceKm: distanceKm == null ? null : Math.round(distanceKm * 100) / 100,
    breakdown: weighted,
    rawComponents: components
  };
}

/**
 * Finds and ranks eligible donors for a blood request.
 *
 * Pipeline:
 *   1. Resolve compatible donor blood groups
 *   2. Query available donors of those groups within the search radius
 *   3. Filter by the eligibility rule engine (Feature 1)
 *   4. Score and rank the survivors
 */
async function findMatches(requestId, options = {}) {
  const request = await BloodRequest.findById(requestId);
  if (!request) {
    const err = new Error('Blood request not found.');
    err.statusCode = 404;
    throw err;
  }

  const radiusKm = Number(options.radius) || DEFAULT_SEARCH_RADIUS_KM;
  const limit = Number(options.limit) || 10;
  const includeIneligible = options.includeIneligible === 'true';

  const compatibleGroups = getCompatibleDonorGroups(request.bloodGroup);

  const query = {
    isActive: true,
    isAvailable: true,
    bloodGroup: { $in: compatibleGroups }
  };

  if (request.location && request.location.coordinates) {
    query.location = {
      $geoWithin: {
        $centerSphere: [request.location.coordinates, radiusKm / EARTH_RADIUS_KM]
      }
    };
  }

  const candidates = await Donor.find(query);

  const eligible = [];
  const rejected = [];

  for (const donor of candidates) {
    const eligibility = checkEligibility(donor);
    const scored = scoreDonor(donor, request);

    const entry = {
      donorId: donor._id,
      name: donor.name,
      bloodGroup: donor.bloodGroup,
      phone: donor.phone,
      area: donor.location ? donor.location.address : null,
      totalDonations: donor.totalDonations,
      lastDonationDate: donor.lastDonationDate,
      ...scored
    };

    if (eligibility.eligible) {
      eligible.push(entry);
    } else {
      rejected.push({
        ...entry,
        ineligibilityReasons: eligibility.reasons,
        nextEligibleDate: eligibility.nextEligibleDate
      });
    }
  }

  eligible.sort((a, b) => b.score - a.score);
  const ranked = eligible.slice(0, limit).map((d, i) => ({ rank: i + 1, ...d }));

  return {
    request: {
      requestId: request._id,
      patientName: request.patientName,
      bloodGroup: request.bloodGroup,
      unitsNeeded: request.unitsNeeded,
      urgency: request.urgency,
      status: request.status
    },
    searchCriteria: {
      compatibleGroups,
      radiusKm,
      scoreWeights: SCORE_WEIGHTS
    },
    summary: {
      candidatesFound: candidates.length,
      eligibleMatches: eligible.length,
      excludedByEligibility: rejected.length,
      returned: ranked.length
    },
    matches: ranked,
    excluded: includeIneligible ? rejected : undefined
  };
}

/**
 * Persists the top matches onto the request and moves it to 'matched'.
 */
async function attachMatchesToRequest(requestId, options = {}) {
  const result = await findMatches(requestId, options);

  const request = await BloodRequest.findById(requestId);
  request.matchedDonors = result.matches.map((m) => m.donorId);
  if (request.status === 'pending' && result.matches.length > 0) {
    request.status = 'matched';
  }
  await request.save();

  return { ...result, requestStatus: request.status };
}

module.exports = {
  findMatches,
  attachMatchesToRequest,
  scoreDonor,
  haversineDistanceKm,
  SCORE_WEIGHTS
};