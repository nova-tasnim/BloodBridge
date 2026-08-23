const crypto = require('crypto');
const mongoose = require('mongoose');
const { BLOOD_GROUPS } = require('../config/constants');

const donationRecordSchema = new mongoose.Schema(
  {
    // Phase 2B Application-Level Public Identifier
    publicId: {
      type: String,
      unique: true,
      sparse: true,
      default: () => 'REC-' + crypto.randomBytes(3).toString('hex').toUpperCase()
    },
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    bloodRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodRequest',
      default: null,
      index: true
    },
    bloodBank: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    bloodGroup: { type: String, enum: BLOOD_GROUPS, required: true },
    donationDate: { type: Date, required: true, default: Date.now },
    unitsDonated: { type: Number, required: true, default: 1, min: 0.5 },
    locationName: { type: String, trim: true },
    notes: { type: String, trim: true },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { timestamps: true }
);

donationRecordSchema.index({ donor: 1, donationDate: -1 });


// Prevent duplicate donation records for the exact same blood request and donor
donationRecordSchema.index(
  { bloodRequest: 1, donor: 1 },
  { unique: true, sparse: true }
);

// Fallback generator to guarantee publicId uniqueness before save
donationRecordSchema.pre(
  'save',
  function () {
    if (!this.publicId) {
      this.publicId =
        'REC-' +
        crypto
          .randomBytes(3)
          .toString('hex')
          .toUpperCase();
    }
  }
);
module.exports = mongoose.model('DonationRecord', donationRecordSchema);