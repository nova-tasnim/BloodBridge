const mongoose = require('mongoose');
const { BLOOD_GROUPS } = require('../config/constants');

const pointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
    address: { type: String, trim: true }
  },
  { _id: false }
);

const campaignSchema = new mongoose.Schema(
  {
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    venue: { type: String, required: true, trim: true },
    location: { type: pointSchema, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    targetUnits: { type: Number, default: 0, min: 0 },
    unitsCollected: { type: Number, default: 0, min: 0 },
    priorityBloodGroups: [{ type: String, enum: BLOOD_GROUPS }],
    registeredCount: { type: Number, default: 0, min: 0 },
    contactPhone: { type: String, trim: true },
    isActive: { type: Boolean, default: true }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

campaignSchema.index({ location: '2dsphere' });
campaignSchema.index({ startDate: 1, endDate: 1 });

// Derived status — never stored, so it can't drift out of date
campaignSchema.virtual('status').get(function () {
  const now = Date.now();
  if (!this.isActive) return 'cancelled';
  if (now < this.startDate.getTime()) return 'upcoming';
  if (now > this.endDate.getTime()) return 'completed';
  return 'ongoing';
});

campaignSchema.virtual('progressPercent').get(function () {
  if (!this.targetUnits) return 0;
  return Math.min(Math.round((this.unitsCollected / this.targetUnits) * 100), 100);
});

campaignSchema.virtual('daysUntilStart').get(function () {
  const ms = this.startDate.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
});

const Campaign = mongoose.model('Campaign', campaignSchema);

module.exports = Campaign;