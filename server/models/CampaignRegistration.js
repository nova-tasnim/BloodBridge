const mongoose = require('mongoose');

const campaignRegistrationSchema =
  new mongoose.Schema(
    {
      campaign: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          'Campaign',

        required:
          true,

        index:
          true
      },

      /*

      | Universal donor identity

      |
      | ALWAYS User._id.
      |
      | Native Donor:
      | User._id
      |
      | Patient + donorProfile:
      | same User._id
   
      */
      donor: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          'User',

        required:
          true,

        index:
          true
      },

      registeredAt: {
        type:
          Date,

        default:
          Date.now
      },

      attended: {
        type:
          Boolean,

        default:
          false
      },

      donated: {
        type:
          Boolean,

        default:
          false
      },

      unitsDonated: {
        type:
          Number,

        default:
          0,

        min:
          0
      },

      /*
      | Link campaign donation to authoritative DonationRecord
      |
      | This prevents:
      |
      | Campaign says donated
      | but Donation History says nothing.
    
      */
      donationRecord: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          'DonationRecord',

        default:
          null
      },

      notes: {
        type:
          String,

        trim:
          true,

        default:
          ''
      }
    },

    {
      timestamps:
        true
    }
  );

/*
|--------------------------------------------------------------------------
| Prevent duplicate campaign registration
|--------------------------------------------------------------------------
*/

campaignRegistrationSchema.index(
  {
    campaign: 1,
    donor: 1
  },
  {
    unique:
      true
  }
);

module.exports =
  mongoose.model(
    'CampaignRegistration',
    campaignRegistrationSchema
  );