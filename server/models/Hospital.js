const mongoose = require('mongoose');
const { User } = require('./User');

const hospitalSchema = new mongoose.Schema({
  registrationNumber: { type: String, required: true, trim: true },
  hospitalType: {
    type: String,
    enum: ['government', 'private', 'clinic'],
    default: 'private'
  },
  isVerified: { type: Boolean, default: false },
  contactPerson: { type: String, trim: true }
});

module.exports = User.discriminator('Hospital', hospitalSchema);