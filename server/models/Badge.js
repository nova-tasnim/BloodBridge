const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  criteria: { type: String, required: true }, // e.g., "5 donations"
  donationsRequired: { type: Number, required: true }
});

module.exports = mongoose.model('Badge', badgeSchema);