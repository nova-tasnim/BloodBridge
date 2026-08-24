const mongoose =
  require('mongoose');

const reminderSchema =
  new mongoose.Schema({
    /*
    |--------------------------------------------------------------------------
    | Universal donor identity
    |--------------------------------------------------------------------------
    |
    | Native Donor and Patient-donor are both User documents.
    | Therefore reminders always reference User._id.
    |
    */

    donorId: {
      type:
        mongoose.Schema.Types.ObjectId,

      ref:
        'User',

      required:
        true,

      unique:
        true,

      index:
        true
    },

    nextEligibleDate: {
      type:
        Date,

      required:
        true
    },

    reminderSent: {
      type:
        Boolean,

      default:
        false
    },

    reminderDate: {
      type:
        Date,

      default:
        null
    },

    createdAt: {
      type:
        Date,

      default:
        Date.now
    }
  });

module.exports =
  mongoose.model(
    'Reminder',
    reminderSchema
  );