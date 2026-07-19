const { ELIGIBILITY_RULES } = require('../config/constants');

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function daysSince(date) {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date).getTime()) / MS_PER_DAY);
}

function getRequiredInterval(gender) {
  return (
    ELIGIBILITY_RULES.DONATION_INTERVAL_DAYS[gender] ??
    ELIGIBILITY_RULES.DONATION_INTERVAL_DAYS.other
  );
}

function calculateNextEligibleDate(lastDonationDate, gender) {
  if (!lastDonationDate) return null;
  const interval = getRequiredInterval(gender);
  const next = new Date(lastDonationDate);
  next.setDate(next.getDate() + interval);
  return next;
}

/**
 * Evaluates donor eligibility against all rules.
 * Returns EVERY failed rule, not just the first.
 */
function checkEligibility(donor) {
  const reasons = [];
  const age = calculateAge(donor.dateOfBirth);
  const interval = getRequiredInterval(donor.gender);
  const elapsed = daysSince(donor.lastDonationDate);

  // Rule 1: age range
  if (age === null) {
    reasons.push('Date of birth is missing.');
  } else if (age < ELIGIBILITY_RULES.MIN_AGE) {
    reasons.push(`Donor is ${age}; minimum age is ${ELIGIBILITY_RULES.MIN_AGE}.`);
  } else if (age > ELIGIBILITY_RULES.MAX_AGE) {
    reasons.push(`Donor is ${age}; maximum age is ${ELIGIBILITY_RULES.MAX_AGE}.`);
  }

  // Rule 2: minimum weight
  if (donor.weightKg == null) {
    reasons.push('Weight is missing.');
  } else if (donor.weightKg < ELIGIBILITY_RULES.MIN_WEIGHT_KG) {
    reasons.push(
      `Weight is ${donor.weightKg} kg; minimum is ${ELIGIBILITY_RULES.MIN_WEIGHT_KG} kg.`
    );
  }

  // Rule 3: interval since last donation
  if (elapsed !== null && elapsed < interval) {
    reasons.push(
      `Only ${elapsed} of ${interval} required days have passed since the last donation.`
    );
  }

  // Rule 4: health flags
  const flags = donor.healthFlags || {};
  if (flags.hasChronicIllness) reasons.push('A chronic illness is recorded.');
  if (flags.onMedication) reasons.push('Donor is currently on medication.');
  if (flags.recentSurgery) reasons.push('A recent surgery is recorded.');
  if (flags.recentTattoo) reasons.push('A recent tattoo or piercing is recorded.');
  if (flags.isPregnant) reasons.push('Donor is pregnant or recently gave birth.');

  const nextEligibleDate = calculateNextEligibleDate(
    donor.lastDonationDate,
    donor.gender
  );

  return {
    eligible: reasons.length === 0,
    reasons,
    age,
    daysSinceLastDonation: elapsed,
    requiredIntervalDays: interval,
    nextEligibleDate
  };
}

module.exports = {
  checkEligibility,
  calculateAge,
  calculateNextEligibleDate,
  daysSince
};