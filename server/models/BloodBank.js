const mongoose = require('mongoose');
const { User } = require('./User');

const bloodBankSchema = new mongoose.Schema({
  licenseNumber: { type: String, required: true, trim: true },
  isVerified: { type: Boolean, default: false },
  operatingHours: { type: String, trim: true },
  contactPerson: { type: String, trim: true }
});

module.exports = User.discriminator('BloodBank', bloodBankSchema);