const mongoose = require('mongoose');
const { User } = require('./User');

const adminSchema = new mongoose.Schema({
  permissions: {
    type: [String],
    default: ['verify_institutions', 'manage_users', 'view_analytics']
  }
});

module.exports = User.discriminator('Admin', adminSchema);