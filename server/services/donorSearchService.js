const Donor = require('../models/Donor');
const { checkEligibility } = require('./eligibilityService');

const EARTH_RADIUS_KM = 6378.1;

const SORT_OPTIONS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  name: { name: 1 },
  mostDonations: { totalDonations: -1 }
};

/**
 * Translates query-string parameters into a MongoDB filter document.
 * Only parameters actually supplied are applied, so the same endpoint
 * serves an unfiltered listing and a narrow multi-criteria search.
 */
function buildFilter(params) {
  const filter = { isActive: true };

  if (params.bloodGroup) {
    // Supports one group or a comma-separated list
    const groups = params.bloodGroup.split(',').map((g) => g.trim());
    filter.bloodGroup = groups.length > 1 ? { $in: groups } : groups[0];
  }

  if (params.isAvailable !== undefined) {
    filter.isAvailable = params.isAvailable === 'true';
  }

  if (params.gender) {
    filter.gender = params.gender;
  }

  if (params.minWeight) {
    filter.weightKg = { $gte: Number(params.minWeight) };
  }

  if (params.name) {
    // Case-insensitive partial match
    filter.name = { $regex: params.name, $options: 'i' };
  }

  // Geospatial radius search — $geoWithin is used rather than $near
  // because $near is not permitted in the count aggregation.
  if (params.lat && params.lng) {
    const radiusKm = Number(params.radius) || 10;
    filter.location = {
      $geoWithin: {
        $centerSphere: [
          [Number(params.lng), Number(params.lat)],
          radiusKm / EARTH_RADIUS_KM
        ]
      }
    };
  }

  return filter;
}

async function searchDonors(params) {
  const page = Math.max(parseInt(params.page, 10) || 1, 1);
  const limit = Math.min(parseInt(params.limit, 10) || 20, 100);
  const sort = SORT_OPTIONS[params.sortBy] || SORT_OPTIONS.newest;

  const filter = buildFilter(params);

  const [donors, total] = await Promise.all([
    Donor.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
    Donor.countDocuments(filter)
  ]);

  // Optional: annotate each result with live eligibility status
  const results =
    params.withEligibility === 'true'
      ? donors.map((d) => {
          const obj = d.toObject();
          const { eligible, reasons } = checkEligibility(d);
          return { ...obj, eligible, ineligibilityReasons: reasons };
        })
      : donors;

  return {
    results,
    total,
    page,
    pages: Math.ceil(total / limit) || 0,
    appliedFilters: filter
  };
}

module.exports = { searchDonors, buildFilter };