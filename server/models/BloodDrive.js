const mongoose = require('mongoose');

const bloodDriveSchema = new mongoose.Schema({
  organizerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: { type: String, required: true },
  location: { type: String, required: true },
  date: { type: Date, required: true },
  registeredDonors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Donor'
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BloodDrive', bloodDriveSchema);