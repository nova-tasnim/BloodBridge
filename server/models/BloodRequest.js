const crypto = require('crypto');
const mongoose = require('mongoose');
const { BLOOD_GROUPS } = require('../config/constants');

const REQUEST_STATUSES = [
  'pending',
  'matched',
  'accepted',
  'fulfilled',
  'cancelled',
  'expired'
];

const URGENCY_LEVELS = ['critical', 'urgent', 'routine'];

const pointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
    address: { type: String, trim: true }
  },
  { _id: false }
);

const bloodRequestSchema = new mongoose.Schema(
  {
    // Phase 2B Application-Level Public Identifier
    publicId: {
      type: String,
      unique: true,
      sparse: true,
      default: () => 'REQ-' + crypto.randomBytes(3).toString('hex').toUpperCase()
    },
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    patientName: { type: String, required: true, trim: true },
    bloodGroup: { type: String, enum: BLOOD_GROUPS, required: true, index: true },
    unitsNeeded: { type: Number, required: true, min: 1 },
    unitsFulfilled: { type: Number, default: 0, min: 0 },
    urgency: { type: String, enum: URGENCY_LEVELS, default: 'routine', index: true },
    hospitalName: { type: String, trim: true },
    location: { type: pointSchema, required: true },
    requiredBy: { type: Date },
    status: { type: String, enum: REQUEST_STATUSES, default: 'pending', index: true },
    matchedDonors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    isSOS: { type: Boolean, default: false },
    contactPhone: { type: String, trim: true },
    notes: { type: String, trim: true },
    isActive: { type: Boolean, default: true }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

bloodRequestSchema.index({ location: '2dsphere' });
bloodRequestSchema.index({ status: 1, urgency: 1, createdAt: 1 });

// Fallback generator to ensure a public ID exists before saving
bloodRequestSchema.pre('save', function () {
  if (!this.publicId) {
    this.publicId =
      'REQ-' + crypto.randomBytes(3).toString('hex').toUpperCase();
  }
});

// Units still outstanding
bloodRequestSchema.virtual('unitsRemaining').get(function () {
  return Math.max(this.unitsNeeded - this.unitsFulfilled, 0);
});

// Hours elapsed since creation — used by the prioritization queue in Sprint 3
bloodRequestSchema.virtual('hoursWaiting').get(function () {
  if (!this.createdAt) return 0;
  return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60));
});

bloodRequestSchema.virtual('isOverdue').get(function () {
  if (!this.requiredBy) return false;
  return Date.now() > this.requiredBy.getTime() && this.status !== 'fulfilled';
});

const BloodRequest = mongoose.model('BloodRequest', bloodRequestSchema);

module.exports = { BloodRequest, REQUEST_STATUSES, URGENCY_LEVELS };