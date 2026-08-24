const mongoose =
  require('mongoose');

const {
  User
} =
  require('./User');

const {
  BLOOD_GROUPS,
  GENDERS
} =
  require('../config/constants');

const patientSchema =
  new mongoose.Schema({
    bloodGroup: {
      type: String,
      enum:
        BLOOD_GROUPS,
      required:
        true
    },

    dateOfBirth: {
      type: Date,
      required:
        true
    },

    gender: {
      type: String,
      enum:
        GENDERS,
      required:
        true
    },

    weightKg: {
      type: Number,
      min: 0,
      required:
        true
    },

    medicalCondition: {
      type: String,
      trim:
        true
    },

    guardianContact: {
      type: String,
      trim:
        true
    }
  });

module.exports =
  User.discriminator(
    'Patient',
    patientSchema
  );