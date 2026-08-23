const mongoose =
  require('mongoose');

const notificationSchema =
  new mongoose.Schema({
    userId: {
      type:
        mongoose.Schema.Types.ObjectId,

      ref:
        'User',

      required:
        true,

      index:
        true
    },

    message: {
      type:
        String,

      required:
        true
    },

    type: {
      type:
        String,

      enum: [
        'match',
        'status_update',
        'reminder',
        'general',
        'welcome',
        'sos'
      ],

      default:
        'general'
    },

    /*
     * Optional idempotency key.
     *
     * Prevents repeated matching/SOS actions from spamming the same user.
     */
    eventKey: {
      type:
        String,

      default:
        null
    },

    isRead: {
      type:
        Boolean,

      default:
        false
    },

    createdAt: {
      type:
        Date,

      default:
        Date.now
    }
  });

notificationSchema.index({
  userId: 1,
  createdAt: -1
});

notificationSchema.index(
  {
    userId: 1,
    eventKey: 1
  },
  {
    unique:
      true,

    sparse:
      true
  }
);

module.exports =
  mongoose.model(
    'Notification',
    notificationSchema
  );