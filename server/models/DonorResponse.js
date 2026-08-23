const mongoose = require('mongoose');

const RESPONSE_STATUSES = ['pending', 'accepted', 'declined', 'completed'];

const donorResponseSchema = new mongoose.Schema(
  {
    bloodRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodRequest',
      required: true,
      index: true
    },
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    status: { type: String, enum: RESPONSE_STATUSES, default: 'pending' },
    matchScore: { type: Number, default: 0 },
    respondedAt: { type: Date, default: null },
    declineReason: { type: String, trim: true },
    notes: { type: String, trim: true },
    // Phase 2B: Consent-based approximate location sharing
    shareLocation: { type: Boolean, default: false },
    donorCoordinates: {
      type: [Number], // [longitude, latitude] approximate coordinates
      default: undefined
    },
    donorArea: { type: String, trim: true }
  },
  { timestamps: true }
);

// A donor holds one response record per request to prevent duplicate responses
donorResponseSchema.index({ bloodRequest: 1, donor: 1 }, { unique: true });

module.exports = {
  DonorResponse: mongoose.model('DonorResponse', donorResponseSchema),
  RESPONSE_STATUSES
};