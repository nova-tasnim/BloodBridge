const mongoose = require('mongoose');

const campaignRegistrationSchema = new mongoose.Schema(
  {
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
      index: true
    },
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    registeredAt: { type: Date, default: Date.now },
    attended: { type: Boolean, default: false },
    donated: { type: Boolean, default: false },
    unitsDonated: { type: Number, default: 0, min: 0 },
    notes: { type: String, trim: true }
  },
  { timestamps: true }
);

// A donor can register for a given campaign only once.
// Enforced at the database level, not just in application code.
campaignRegistrationSchema.index({ campaign: 1, donor: 1 }, { unique: true });

module.exports = mongoose.model('CampaignRegistration', campaignRegistrationSchema);