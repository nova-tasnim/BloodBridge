const mongoose = require('mongoose');
const { User } = require('./User');
const { BLOOD_GROUPS, GENDERS } = require('../config/constants');

const donorSchema = new mongoose.Schema({
  bloodGroup: { type: String, enum: BLOOD_GROUPS, required: true },
  dateOfBirth: { type: Date, required: true },
  gender: { type: String, enum: GENDERS, required: true },
  weightKg: { type: Number, required: true, min: 0 },
  lastDonationDate: { type: Date, default: null },
  isAvailable: { type: Boolean, default: true },
  totalDonations: { type: Number, default: 0 },
  badges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Badge' }],
  livesSaved: { type: Number, default: 0 },
  healthFlags: {
    hasChronicIllness: { type: Boolean, default: false },
    onMedication: { type: Boolean, default: false },
    recentSurgery: { type: Boolean, default: false },
    recentTattoo: { type: Boolean, default: false },
    isPregnant: { type: Boolean, default: false }
  }
});

donorSchema.virtual('age').get(function () {
  if (!this.dateOfBirth) return null;
  const diffMs = Date.now() - this.dateOfBirth.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
});

donorSchema.index({ bloodGroup: 1, isAvailable: 1 });

const Donor = User.discriminator('Donor', donorSchema);

module.exports = Donor;