const mongoose = require('mongoose');
const { BLOOD_GROUPS } = require('../config/constants');

const donationRecordSchema = new mongoose.Schema(
  {
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    bloodRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodRequest',
      default: null
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
    notes: { type: String, trim: true }
  },
  { timestamps: true }
);

donationRecordSchema.index({ donor: 1, donationDate: -1 });

module.exports = mongoose.model('DonationRecord', donationRecordSchema);