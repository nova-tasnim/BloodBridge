const mongoose = require('mongoose');
const { BLOOD_GROUPS } = require('../config/constants');

const inventorySchema = new mongoose.Schema(
  {
    bloodBank: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    bloodGroup: { type: String, enum: BLOOD_GROUPS, required: true },
    unitsAvailable: { type: Number, required: true, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 10, min: 0 },
    expiryDate: { type: Date, required: true },
    batchNumber: { type: String, trim: true },
    storageLocation: { type: String, trim: true },
    isActive: { type: Boolean, default: true }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// One inventory line per blood bank / blood group / batch
inventorySchema.index({ bloodBank: 1, bloodGroup: 1, batchNumber: 1 });

inventorySchema.virtual('isLowStock').get(function () {
  return this.unitsAvailable < this.lowStockThreshold;
});

inventorySchema.virtual('daysUntilExpiry').get(function () {
  if (!this.expiryDate) return null;
  const ms = this.expiryDate.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
});

inventorySchema.virtual('isExpired').get(function () {
  if (!this.expiryDate) return false;
  return this.expiryDate.getTime() < Date.now();
});

const Inventory = mongoose.model('Inventory', inventorySchema);

module.exports = Inventory;