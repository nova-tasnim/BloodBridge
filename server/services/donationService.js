const DonationRecord =
  require('../models/DonationRecord');

const {
  resolveDonor,
  normalizeDonor,
  registerDonationAggregate
} = require('./donorIdentityService');

/*
|--------------------------------------------------------------------------
| Record donation
|--------------------------------------------------------------------------
*/

async function recordDonation({
  donorId,

  bloodRequestId = null,

  bloodBankId = null,

  donationDate = new Date(),

  unitsDonated = 1,

  locationName = '',

  notes = '',

  verifiedBy = null
}) {
  /*
  |--------------------------------------------------------------------------
  | Universal donor resolution
  |--------------------------------------------------------------------------
  */

  const donor =
    await resolveDonor(
      donorId
    );

  if (!donor) {
    const err =
      new Error(
        'Donor not found'
      );

    err.statusCode =
      404;

    throw err;
  }

  const donorData =
    normalizeDonor(
      donor
    );

  /*
  |--------------------------------------------------------------------------
  | Idempotency
  |--------------------------------------------------------------------------
  */

  if (bloodRequestId) {
    const existing =
      await DonationRecord.findOne({
        bloodRequest:
          bloodRequestId,

        donor:
          donor._id
      });

    if (existing) {
      return existing;
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Create record
  |--------------------------------------------------------------------------
  |
  | DonationRecord.donor stores User._id for BOTH donor types.
  |--------------------------------------------------------------------------
  */

  const record =
    await DonationRecord.create({
      donor:
        donor._id,

      bloodRequest:
        bloodRequestId,

      bloodBank:
        bloodBankId,

      bloodGroup:
        donorData.bloodGroup,

      donationDate,

      unitsDonated:
        Number(unitsDonated) || 1,

      locationName,

      notes,

      verifiedBy
    });

  /*
  |--------------------------------------------------------------------------
  | Update donor aggregates
  |--------------------------------------------------------------------------
  |
  | Native Donor:
  | top-level fields
  |
  | Patient donor:
  | donorProfile fields
  |--------------------------------------------------------------------------
  */

  await registerDonationAggregate(
    donor,
    donationDate
  );

  return record;
}

/*
|--------------------------------------------------------------------------
| Donation history
|--------------------------------------------------------------------------
*/

async function getDonationHistory(
  donorId
) {
  return DonationRecord
    .find({
      donor: donorId
    })

    .populate(
      'bloodRequest',
      'publicId patientName hospitalName'
    )

    .populate(
      'bloodBank',
      'name location'
    )

    .populate(
      'verifiedBy',
      'name role'
    )

    .sort({
      donationDate: -1
    });
}

/*
|--------------------------------------------------------------------------
| Donation statistics
|--------------------------------------------------------------------------
*/

async function getDonationStats(
  donorId
) {
  const records =
    await DonationRecord.find({
      donor: donorId
    });

  const totalUnits =
    records.reduce(
      (sum, record) =>
        sum +
        (
          Number(
            record.unitsDonated
          ) || 0
        ),
      0
    );

  const lastDonation =
    records.length
      ? records.reduce(
          (a, b) =>
            new Date(
              a.donationDate
            ) >
            new Date(
              b.donationDate
            )
              ? a
              : b
        ).donationDate
      : null;

  return {
    totalDonations:
      records.length,

    totalUnits,

    lastDonation
  };
}

module.exports = {
  recordDonation,
  getDonationHistory,
  getDonationStats,
  resolveDonor
};