const crypto = require('crypto');
const mongoose = require('mongoose');
const { User } = require('./User');
const { BLOOD_GROUPS, GENDERS } = require('../config/constants');

const donorSchema = new mongoose.Schema({
  // Phase 2B Application-Level Public Identifier
  publicId: {
    type: String,
    unique: true,
    sparse: true,
    default: () =>
      'DON-' + crypto.randomBytes(3).toString('hex').toUpperCase()
  },

  bloodGroup: {
    type: String,
    enum: BLOOD_GROUPS,
    required: true
  },

  dateOfBirth: {
    type: Date,
    required: true
  },

  gender: {
    type: String,
    enum: GENDERS,
    required: true
  },

  weightKg: {
    type: Number,
    required: true,
    min: 0
  },

  lastDonationDate: {
    type: Date,
    default: null
  },

  isAvailable: {
    type: Boolean,
    default: true
  },

  totalDonations: {
    type: Number,
    default: 0
  },

  badges: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Badge'
    }
  ],

  livesSaved: {
    type: Number,
    default: 0
  },

  // Phase 2B Privacy & Location Preferences
  shareLocationConsent: {
    type: Boolean,
    default: false
  },

  healthFlags: {
    hasChronicIllness: {
      type: Boolean,
      default: false
    },

    onMedication: {
      type: Boolean,
      default: false
    },

    recentSurgery: {
      type: Boolean,
      default: false
    },

    recentTattoo: {
      type: Boolean,
      default: false
    },

    isPregnant: {
      type: Boolean,
      default: false
    }
  }
});

// Virtual age calculation
donorSchema.virtual('age').get(function () {
  if (!this.dateOfBirth) return null;

  const diffMs = Date.now() - this.dateOfBirth.getTime();

  return Math.floor(
    diffMs / (1000 * 60 * 60 * 24 * 365.25)
  );
});

// IMPORTANT:
// Mongoose 9 middleware does not require calling next()
// for this synchronous pre-save hook.
donorSchema.pre('save', function () {
  if (!this.publicId) {
    this.publicId =
      'DON-' + crypto.randomBytes(3).toString('hex').toUpperCase();
  }
});

donorSchema.index({
  bloodGroup: 1,
  isAvailable: 1
});

const Donor = User.discriminator('Donor', donorSchema);

module.exports = Donor;