const { User } = require('../models/User');
const { checkEligibility } = require('./eligibilityService');

const EARTH_RADIUS_KM = 6378.1;

/*
|--------------------------------------------------------------------------
| Calculate age
|--------------------------------------------------------------------------
*/

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;

  const dob = new Date(dateOfBirth);

  if (Number.isNaN(dob.getTime())) {
    return null;
  }

  const diffMs = Date.now() - dob.getTime();

  return Math.floor(
    diffMs / (1000 * 60 * 60 * 24 * 365.25)
  );
}

/*
|--------------------------------------------------------------------------
| Convert either donor architecture into one common object
|--------------------------------------------------------------------------
|
| Native Donor:
|
| role = Donor
| publicId
| bloodGroup
| gender
| ...
|
| Donor-capable Patient:
|
| role = Patient
| donorProfile.publicId
| donorProfile.bloodGroup
| ...
|
| Frontend should NOT have to care which type it is.
|--------------------------------------------------------------------------
*/

function normalizeDonor(user) {
  const isNativeDonor = user.role === 'Donor';

  const profile = isNativeDonor
    ? user
    : user.donorProfile;

  if (!profile) {
    return null;
  }

  return {
    _id: user._id,

    /*
     * Keep original user ID explicitly too.
     * This will be useful for availability, donations,
     * matching and authorization later.
     */
    userId: user._id,

    name: user.name,
    email: user.email,
    phone: user.phone,

    role: user.role,

    /*
     * Useful frontend indicator.
     */
    donorType: isNativeDonor
      ? 'native'
      : 'patient-donor',

    publicId: profile.publicId,

    bloodGroup: profile.bloodGroup,

    dateOfBirth: profile.dateOfBirth,

    age: calculateAge(profile.dateOfBirth),

    gender: profile.gender,

    weightKg: profile.weightKg,

    lastDonationDate:
      profile.lastDonationDate || null,

    isAvailable:
      profile.isAvailable !== false,

    totalDonations:
      profile.totalDonations || 0,

    shareLocationConsent:
      Boolean(profile.shareLocationConsent),

    healthFlags:
      profile.healthFlags || {},

    location:
      user.location || null,

    isActive:
      user.isActive !== false,

    createdAt:
      user.createdAt,

    updatedAt:
      user.updatedAt
  };
}

/*
|--------------------------------------------------------------------------
| Does normalized donor match frontend filters?
|--------------------------------------------------------------------------
*/

function matchesFilters(donor, params) {
  if (!donor || !donor.isActive) {
    return false;
  }

  /*
  |--------------------------------------------------------------------------
  | Blood group
  |--------------------------------------------------------------------------
  */

  if (params.bloodGroup) {
    const groups = params.bloodGroup
      .split(',')
      .map((group) => group.trim())
      .filter(Boolean);

    if (
      groups.length > 0 &&
      !groups.includes(donor.bloodGroup)
    ) {
      return false;
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Availability
  |--------------------------------------------------------------------------
  */

  if (
    params.isAvailable !== undefined &&
    params.isAvailable !== ''
  ) {
    const requested =
      params.isAvailable === 'true';

    if (donor.isAvailable !== requested) {
      return false;
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Gender
  |--------------------------------------------------------------------------
  */

  if (
    params.gender &&
    donor.gender !== params.gender
  ) {
    return false;
  }

  /*
  |--------------------------------------------------------------------------
  | Minimum weight
  |--------------------------------------------------------------------------
  */

  if (params.minWeight) {
    const minimum = Number(params.minWeight);

    if (
      Number.isFinite(minimum) &&
      Number(donor.weightKg) < minimum
    ) {
      return false;
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Name
  |--------------------------------------------------------------------------
  */

  if (params.name) {
    const search =
      params.name.trim().toLowerCase();

    const donorName =
      String(donor.name || '').toLowerCase();

    if (!donorName.includes(search)) {
      return false;
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Geographic radius
  |--------------------------------------------------------------------------
  */

  if (params.lat && params.lng) {
    const donorCoordinates =
      donor.location?.coordinates;

    if (
      !Array.isArray(donorCoordinates) ||
      donorCoordinates.length < 2
    ) {
      return false;
    }

    const targetLat = Number(params.lat);
    const targetLng = Number(params.lng);
    const radiusKm =
      Number(params.radius) || 10;

    const donorLng =
      Number(donorCoordinates[0]);

    const donorLat =
      Number(donorCoordinates[1]);

    if (
      !Number.isFinite(targetLat) ||
      !Number.isFinite(targetLng) ||
      !Number.isFinite(donorLat) ||
      !Number.isFinite(donorLng)
    ) {
      return false;
    }

    const toRadians = (degrees) =>
      degrees * (Math.PI / 180);

    const dLat =
      toRadians(donorLat - targetLat);

    const dLng =
      toRadians(donorLng - targetLng);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRadians(targetLat)) *
        Math.cos(toRadians(donorLat)) *
        Math.sin(dLng / 2) ** 2;

    const c =
      2 * Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
      );

    const distanceKm =
      EARTH_RADIUS_KM * c;

    if (distanceKm > radiusKm) {
      return false;
    }
  }

  return true;
}

/*
|--------------------------------------------------------------------------
| Sort normalized donors
|--------------------------------------------------------------------------
*/

function sortDonors(donors, sortBy) {
  const copy = [...donors];

  switch (sortBy) {
    case 'oldest':
      return copy.sort(
        (a, b) =>
          new Date(a.createdAt) -
          new Date(b.createdAt)
      );

    case 'name':
      return copy.sort((a, b) =>
        String(a.name || '').localeCompare(
          String(b.name || '')
        )
      );

    case 'mostDonations':
      return copy.sort(
        (a, b) =>
          Number(b.totalDonations || 0) -
          Number(a.totalDonations || 0)
      );

    case 'newest':
    default:
      return copy.sort(
        (a, b) =>
          new Date(b.createdAt) -
          new Date(a.createdAt)
      );
  }
}

/*
|--------------------------------------------------------------------------
| Search directory
|--------------------------------------------------------------------------
*/

async function searchDonors(params = {}) {
  const page =
    Math.max(
      parseInt(params.page, 10) || 1,
      1
    );

  const limit =
    Math.min(
      Math.max(
        parseInt(params.limit, 10) || 20,
        1
      ),
      100
    );

  /*
   * THIS IS THE IMPORTANT QUERY.
   *
   * Return:
   *
   * 1. Native Donors
   *
   * OR
   *
   * 2. Patients who have completed donor registration.
   */

  const users = await User.find({
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
  });

  /*
  |--------------------------------------------------------------------------
   | Normalize both architectures
   |--------------------------------------------------------------------------
   */

  let donors = users
    .map(normalizeDonor)
    .filter(Boolean);

  /*
  |--------------------------------------------------------------------------
   | Apply requested filters
   |--------------------------------------------------------------------------
   */

  donors = donors.filter((donor) =>
    matchesFilters(donor, params)
  );

  /*
  |--------------------------------------------------------------------------
   | Sort
   |--------------------------------------------------------------------------
   */

  donors =
    sortDonors(
      donors,
      params.sortBy
    );

  const total = donors.length;

  /*
  |--------------------------------------------------------------------------
   | Pagination
   |--------------------------------------------------------------------------
   */

  const start =
    (page - 1) * limit;

  const paginated =
    donors.slice(
      start,
      start + limit
    );

  /*
  |--------------------------------------------------------------------------
   | Optional eligibility
   |--------------------------------------------------------------------------
   |
   | checkEligibility expects donor-style fields.
   | Our normalized object deliberately provides those fields.
   |--------------------------------------------------------------------------
   */

  const results =
    params.withEligibility === 'true'
      ? paginated.map((donor) => {
          const {
            eligible,
            reasons
          } = checkEligibility(donor);

          return {
            ...donor,
            eligible,
            ineligibilityReasons:
              reasons
          };
        })
      : paginated;

  /*
   |--------------------------------------------------------------------------
   | Return filters for the UI
   |--------------------------------------------------------------------------
   */

  const appliedFilters = {};

  if (params.bloodGroup) {
    appliedFilters.bloodGroup =
      params.bloodGroup;
  }

  if (
    params.isAvailable !== undefined &&
    params.isAvailable !== ''
  ) {
    appliedFilters.isAvailable =
      params.isAvailable;
  }

  if (params.gender) {
    appliedFilters.gender =
      params.gender;
  }

  if (params.minWeight) {
    appliedFilters.minWeight =
      params.minWeight;
  }

  if (params.name) {
    appliedFilters.name =
      params.name;
  }

  if (params.lat && params.lng) {
    appliedFilters.lat =
      params.lat;

    appliedFilters.lng =
      params.lng;

    appliedFilters.radius =
      params.radius || 10;
  }

  return {
    results,

    total,

    page,

    pages:
      Math.ceil(total / limit) || 0,

    appliedFilters
  };
}

module.exports = {
  searchDonors,
  normalizeDonor
};