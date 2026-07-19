const { BLOOD_GROUPS } = require('../config/constants');

/**
 * Blood type compatibility for red blood cell transfusion.
 *
 * Key: recipient blood group.
 * Value: donor blood groups whose red cells that recipient can safely receive.
 *
 * Derived from ABO/Rh antigen rules:
 *  - A recipient must not receive antigens their plasma has antibodies against.
 *  - Rh-negative recipients must not receive Rh-positive blood.
 *  - O- is the universal donor; AB+ is the universal recipient.
 */
const RECIPIENT_CAN_RECEIVE_FROM = {
  'O-':  ['O-'],
  'O+':  ['O-', 'O+'],
  'A-':  ['O-', 'A-'],
  'A+':  ['O-', 'O+', 'A-', 'A+'],
  'B-':  ['O-', 'B-'],
  'B+':  ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']
};

/**
 * Returns the donor blood groups compatible with a given recipient group.
 */
function getCompatibleDonorGroups(recipientGroup) {
  const groups = RECIPIENT_CAN_RECEIVE_FROM[recipientGroup];
  if (!groups) {
    const err = new Error(
      `Unknown blood group "${recipientGroup}". Must be one of: ${BLOOD_GROUPS.join(', ')}.`
    );
    err.statusCode = 400;
    throw err;
  }
  return [...groups];
}

/**
 * Returns the recipient groups a given donor group can donate to.
 * Computed by inverting the compatibility map rather than duplicating it,
 * so the two directions can never disagree.
 */
function getCompatibleRecipientGroups(donorGroup) {
  if (!BLOOD_GROUPS.includes(donorGroup)) {
    const err = new Error(`Unknown blood group "${donorGroup}".`);
    err.statusCode = 400;
    throw err;
  }
  return BLOOD_GROUPS.filter((recipient) =>
    RECIPIENT_CAN_RECEIVE_FROM[recipient].includes(donorGroup)
  );
}

function isCompatible(donorGroup, recipientGroup) {
  const groups = RECIPIENT_CAN_RECEIVE_FROM[recipientGroup];
  if (!groups) return false;
  return groups.includes(donorGroup);
}

/**
 * Scores how "well matched" a donor group is for a recipient, 0 to 1.
 * An exact type match scores highest; universal donors score slightly
 * lower so that scarce O- stock is preserved where a closer match exists.
 */
function compatibilityScore(donorGroup, recipientGroup) {
  if (!isCompatible(donorGroup, recipientGroup)) return 0;
  if (donorGroup === recipientGroup) return 1;
  if (donorGroup === 'O-') return 0.7;   // universal donor, scarce resource
  return 0.85;                            // compatible but not identical
}

module.exports = {
  getCompatibleDonorGroups,
  getCompatibleRecipientGroups,
  isCompatible,
  compatibilityScore,
  RECIPIENT_CAN_RECEIVE_FROM
};