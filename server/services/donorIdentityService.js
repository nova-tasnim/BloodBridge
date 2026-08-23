const mongoose = require('mongoose');
const { User } = require('../models/User');

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function isObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ''));
}

/*
|--------------------------------------------------------------------------
| Is user donor-capable?
|--------------------------------------------------------------------------
|
| Native Donor:
| role = Donor
|
| Donor-capable Patient:
| role = Patient
| donorProfile != null
|--------------------------------------------------------------------------
*/

function hasDonorCapability(user) {
  if (!user) {
    return false;
  }

  return (
    user.role === 'Donor' ||
    (
      user.role === 'Patient' &&
      Boolean(user.donorProfile)
    )
  );
}

/*
|--------------------------------------------------------------------------
| Get donor profile regardless of architecture
|--------------------------------------------------------------------------
*/

function getDonorProfile(user) {
  if (!user) {
    return null;
  }

  if (user.role === 'Donor') {
    return user;
  }

  if (
    user.role === 'Patient' &&
    user.donorProfile
  ) {
    return user.donorProfile;
  }

  return null;
}

/*
|--------------------------------------------------------------------------
| Get public donor ID
|--------------------------------------------------------------------------
*/

function getDonorPublicId(user) {
  const profile = getDonorProfile(user);

  return profile?.publicId || null;
}

/*
|--------------------------------------------------------------------------
| Normalize donor
|--------------------------------------------------------------------------
|
| Everything outside this service receives the same donor shape.
|--------------------------------------------------------------------------
*/

function normalizeDonor(user) {
  if (!hasDonorCapability(user)) {
    return null;
  }

  const profile = getDonorProfile(user);

  return {
    _id: user._id,

    userId: user._id,

    name: user.name,
    email: user.email,
    phone: user.phone,

    role: user.role,

    donorType:
      user.role === 'Donor'
        ? 'native'
        : 'patient-donor',

    publicId:
      profile.publicId,

    bloodGroup:
      profile.bloodGroup,

    dateOfBirth:
      profile.dateOfBirth,

    gender:
      profile.gender,

    weightKg:
      profile.weightKg,

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
| Resolve donor
|--------------------------------------------------------------------------
|
| Supported identifiers:
|
| Mongo User _id
| DON-XXXXXX native donor
| DON-XXXXXX donor-capable Patient
|--------------------------------------------------------------------------
*/

async function resolveDonor(identifier) {
  if (!identifier) {
    return null;
  }

  const value =
    String(identifier).trim();

  let user = null;

  /*
  |--------------------------------------------------------------------------
  | MongoDB User ID
  |--------------------------------------------------------------------------
  */

  if (isObjectId(value)) {
    user =
      await User.findOne({
        _id: value,
        isActive: true
      });

    if (
      !user ||
      !hasDonorCapability(user)
    ) {
      return null;
    }

    return user;
  }

  /*
  |--------------------------------------------------------------------------
  | Public donor ID
  |--------------------------------------------------------------------------
  |
  | Native Donor:
  | publicId
  |
  | Patient donor:
  | donorProfile.publicId
  |--------------------------------------------------------------------------
  */

  user =
    await User.findOne({
      isActive: true,

      $or: [
        {
          role: 'Donor',
          publicId: value
        },

        {
          role: 'Patient',
          'donorProfile.publicId': value
        }
      ]
    });

  if (
    !user ||
    !hasDonorCapability(user)
  ) {
    return null;
  }

  return user;
}

/*
|--------------------------------------------------------------------------
| Update availability
|--------------------------------------------------------------------------
*/

async function setAvailability(
  user,
  value
) {
  if (!hasDonorCapability(user)) {
    throw new Error(
      'User does not have donor capability'
    );
  }

  const nextValue =
    Boolean(value);

  if (user.role === 'Donor') {
    user.isAvailable =
      nextValue;
  } else {
    user.donorProfile.isAvailable =
      nextValue;

    /*
     * Required because donorProfile is embedded.
     */
    user.markModified(
      'donorProfile'
    );
  }

  await user.save();

  return user;
}

/*
|--------------------------------------------------------------------------
| Update donation aggregates
|--------------------------------------------------------------------------
*/

async function registerDonationAggregate(
  user,
  donationDate
) {
  if (!hasDonorCapability(user)) {
    throw new Error(
      'User does not have donor capability'
    );
  }

  const profile =
    getDonorProfile(user);

  const currentLastDate =
    profile.lastDonationDate;

  const newDonationDate =
    new Date(donationDate);

  const shouldUpdateLastDate =
    !currentLastDate ||
    newDonationDate >
      new Date(currentLastDate);

  if (user.role === 'Donor') {
    if (shouldUpdateLastDate) {
      user.lastDonationDate =
        newDonationDate;
    }

    user.totalDonations =
      (user.totalDonations || 0) + 1;
  } else {
    if (shouldUpdateLastDate) {
      user.donorProfile.lastDonationDate =
        newDonationDate;
    }

    user.donorProfile.totalDonations =
      (
        user.donorProfile.totalDonations ||
        0
      ) + 1;

    user.markModified(
      'donorProfile'
    );
  }

  await user.save();

  return user;
}

module.exports = {
  hasDonorCapability,
  getDonorProfile,
  getDonorPublicId,
  normalizeDonor,
  resolveDonor,
  setAvailability,
  registerDonationAggregate
};