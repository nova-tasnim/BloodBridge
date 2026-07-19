const DonationRecord = require('../models/DonationRecord');
const Donor = require('../models/Donor');

/**
 * Records a donation and updates the donor's aggregate fields.
 * Single write path used by this feature and, later, by the
 * request lifecycle when a request is marked fulfilled.
 */
async function recordDonation({
  donorId,
  bloodRequestId = null,
  bloodBankId = null,
  donationDate = new Date(),
  unitsDonated = 1,
  locationName = '',
  notes = ''
}) {
  const donor = await Donor.findById(donorId);
  if (!donor) {
    const err = new Error('Donor not found');
    err.statusCode = 404;
    throw err;
  }

  const record = await DonationRecord.create({
    donor: donor._id,
    bloodRequest: bloodRequestId,
    bloodBank: bloodBankId,
    bloodGroup: donor.bloodGroup,
    donationDate,
    unitsDonated,
    locationName,
    notes
  });

  // Keep denormalised donor fields in sync — the eligibility
  // engine and reminder system both read lastDonationDate.
  const isMostRecent =
    !donor.lastDonationDate ||
    new Date(donationDate) > new Date(donor.lastDonationDate);

  if (isMostRecent) donor.lastDonationDate = donationDate;
  donor.totalDonations += 1;
  await donor.save();

  return record;
}

async function getDonationHistory(donorId) {
  return DonationRecord.find({ donor: donorId }).sort({ donationDate: -1 });
}

async function getDonationStats(donorId) {
  const records = await DonationRecord.find({ donor: donorId });
  const totalUnits = records.reduce((sum, r) => sum + r.unitsDonated, 0);
  const lastDonation = records.length
    ? records.reduce((a, b) => (a.donationDate > b.donationDate ? a : b)).donationDate
    : null;

  return {
    totalDonations: records.length,
    totalUnits,
    lastDonation
  };
}

module.exports = { recordDonation, getDonationHistory, getDonationStats };