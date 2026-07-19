const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const USER_ROLES = ['Donor', 'Patient', 'Hospital', 'BloodBank', 'Admin'];

const GENDERS = ['male', 'female', 'other'];

const ELIGIBILITY_RULES = {
  MIN_AGE: 18,
  MAX_AGE: 65,
  MIN_WEIGHT_KG: 50,
  DONATION_INTERVAL_DAYS: {
    male: 90,
    female: 120,
    other: 120
  }
};

module.exports = { BLOOD_GROUPS, USER_ROLES, GENDERS, ELIGIBILITY_RULES };