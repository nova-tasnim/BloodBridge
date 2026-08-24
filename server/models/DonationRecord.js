const crypto =
  require('crypto');

const mongoose =
  require('mongoose');

const {
  BLOOD_GROUPS
} =
  require('../config/constants');

const donationRecordSchema =
  new mongoose.Schema(
    {
      publicId: {
        type: String,

        unique: true,

        sparse: true,

        default: () =>
          'REC-' +
          crypto
            .randomBytes(3)
            .toString('hex')
            .toUpperCase()
      },

      /*
      |--------------------------------------------------------------------------
      | Donor
      |--------------------------------------------------------------------------
      |
      | Always underlying User._id.
      |
      | Native Donor:
      | User._id
      |
      | Patient + donorProfile:
      | same User._id
      |--------------------------------------------------------------------------
      */

      donor: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: 'User',

        required: true,

        index: true
      },

      /*
      |--------------------------------------------------------------------------
      | Donation source
      |--------------------------------------------------------------------------
      */

      donationType: {
        type: String,

        enum: [
          'regular',
          'campaign',
          'request'
        ],

        default:
          'regular',

        index: true
      },

      /*
      |--------------------------------------------------------------------------
      | Campaign donation
      |--------------------------------------------------------------------------
      */

      campaign: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          'Campaign',

        default:
          null,

        index:
          true
      },

      /*
      |--------------------------------------------------------------------------
      | Request donation
      |--------------------------------------------------------------------------
      */

      bloodRequest: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          'BloodRequest',

        default:
          null,

        index:
          true
      },

      /*
      |--------------------------------------------------------------------------
      | Blood bank
      |--------------------------------------------------------------------------
      */

      bloodBank: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          'User',

        default:
          null
      },

      bloodGroup: {
        type:
          String,

        enum:
          BLOOD_GROUPS,

        required:
          true
      },

      donationDate: {
        type:
          Date,

        required:
          true,

        default:
          Date.now
      },

      unitsDonated: {
        type:
          Number,

        required:
          true,

        default:
          1,

        min:
          0.5
      },

      locationName: {
        type:
          String,

        trim:
          true,

        default:
          ''
      },

      notes: {
        type:
          String,

        trim:
          true,

        default:
          ''
      },

      /*
      |--------------------------------------------------------------------------
      | Who submitted/logged the donation?
      |--------------------------------------------------------------------------
      |
      | Could be:
      |
      | Donor
      | Patient-donor
      | Hospital
      | BloodBank
      | Admin
      |--------------------------------------------------------------------------
      */

      submittedBy: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          'User',

        required:
          true
      },

      /*
      |--------------------------------------------------------------------------
      | Approval workflow
      |--------------------------------------------------------------------------
      */

      status: {
        type:
          String,

        enum: [
          'pending',
          'approved',
          'rejected'
        ],

        default:
          'pending',

        index:
          true
      },

      approvedBy: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          'User',

        default:
          null
      },

      approvedAt: {
        type:
          Date,

        default:
          null
      },

      rejectionReason: {
        type:
          String,

        trim:
          true,

        default:
          ''
      },

      /*
       * Keep verifiedBy because some existing UI and other
       * parts of BloodBridge already use it.
       *
       * It will now only be set when Admin approves.
       */
      verifiedBy: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          'User',

        default:
          null
      }
    },

    {
      timestamps:
        true
    }
  );

donationRecordSchema.index({
  donor: 1,
  donationDate: -1
});



donationRecordSchema.index(
  {
    bloodRequest: 1,
    donor: 1
  },

  {
    unique: true,

    partialFilterExpression: {
      bloodRequest: {
        $type:
          'objectId'
      }
    }
  }
);



donationRecordSchema.index({
  campaign: 1,
  donor: 1,
  status: 1
});

donationRecordSchema.pre(
  'save',
  function () {
    if (!this.publicId) {
      this.publicId =
        'REC-' +
        crypto
          .randomBytes(3)
          .toString('hex')
          .toUpperCase();
    }
  }
);

module.exports =
  mongoose.model(
    'DonationRecord',
    donationRecordSchema
  );