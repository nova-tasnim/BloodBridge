const mongoose = require('mongoose');
const { User } = require('./User');
const { BLOOD_GROUPS } = require('../config/constants');

const patientSchema = new mongoose.Schema({
  bloodGroup: { type: String, enum: BLOOD_GROUPS },
  dateOfBirth: { type: Date },
  medicalCondition: { type: String, trim: true },
  guardianContact: { type: String, trim: true }
});

module.exports = User.discriminator('Patient', patientSchema);