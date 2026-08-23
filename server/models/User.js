const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const {
  USER_ROLES,
  BLOOD_GROUPS,
  GENDERS
} = require('../config/constants');

/*
|--------------------------------------------------------------------------
| Shared location schema
|--------------------------------------------------------------------------
*/

const pointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },

    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    },

    address: {
      type: String,
      trim: true
    }
  },
  {
    _id: false
  }
);

/*
|--------------------------------------------------------------------------
| Embedded donor capability profile
|--------------------------------------------------------------------------
|
| IMPORTANT ARCHITECTURE:
|
| Native donor:
|   role = "Donor"
|
| Patient who later becomes donor-capable:
|   role = "Patient"
|   donorProfile = {...}
|
| We NEVER change a Patient's role to Donor.
|
*/

const donorProfileSchema = new mongoose.Schema(
  {
    publicId: {
      type: String,
      default: () =>
        'DON-' + crypto.randomBytes(3).toString('hex').toUpperCase()
    },

    bloodGroup: {
      type: String,
      enum: BLOOD_GROUPS,
      required: true
    },

    dateOfBirth: {
      type: Date,
      required: true
    },

    gender: {
      type: String,
      enum: GENDERS,
      required: true
    },

    weightKg: {
      type: Number,
      required: true,
      min: 0
    },

    lastDonationDate: {
      type: Date,
      default: null
    },

    isAvailable: {
      type: Boolean,
      default: true
    },

    totalDonations: {
      type: Number,
      default: 0
    },

    shareLocationConsent: {
      type: Boolean,
      default: false
    },

    healthFlags: {
      hasChronicIllness: {
        type: Boolean,
        default: false
      },

      onMedication: {
        type: Boolean,
        default: false
      },

      recentSurgery: {
        type: Boolean,
        default: false
      },

      recentTattoo: {
        type: Boolean,
        default: false
      },

      isPregnant: {
        type: Boolean,
        default: false
      }
    }
  },
  {
    _id: false
  }
);

/*
|--------------------------------------------------------------------------
| Base User schema
|--------------------------------------------------------------------------
*/

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },

    phone: {
      type: String,
      required: true,
      trim: true
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false
    },

    location: {
      type: pointSchema,
      required: false
    },

    isActive: {
      type: Boolean,
      default: true
    },

    /*
    |--------------------------------------------------------------------------
    | Donor capability for non-native donors
    |--------------------------------------------------------------------------
    |
    | Patient before registration:
    | donorProfile = null
    |
    | Patient after donor registration:
    | donorProfile = {...}
    |
    */

    donorProfile: {
      type: donorProfileSchema,
      default: null
    }
  },
  {
    timestamps: true,

    // role is automatically created by Mongoose discriminators
    discriminatorKey: 'role',

    collection: 'users',

    toJSON: {
      virtuals: true
    },

    toObject: {
      virtuals: true
    }
  }
);

/*
|--------------------------------------------------------------------------
| Capability virtuals
|--------------------------------------------------------------------------
*/

/*
 * Single source of truth:
 *
 * Can this user personally act as a blood donor?
 *
 * Native Donor        → true
 * Patient + profile   → true
 * Patient only        → false
 * Hospital            → false
 * BloodBank           → false
 * Admin               → false
 */
userSchema.virtual('canDonate').get(function () {
  return (
    this.role === 'Donor' ||
    (
      this.role === 'Patient' &&
      Boolean(this.donorProfile)
    )
  );
});

/*
 * Convenient public donor ID.
 *
 * Native donors keep publicId on the Donor discriminator.
 * Donor-capable Patients keep it inside donorProfile.
 */
userSchema.virtual('donorPublicId').get(function () {
  if (this.role === 'Donor') {
    return this.publicId || null;
  }

  if (this.role === 'Patient' && this.donorProfile) {
    return this.donorProfile.publicId || null;
  }

  return null;
});

/*
|--------------------------------------------------------------------------
| Indexes
|--------------------------------------------------------------------------
*/

userSchema.index({
  location: '2dsphere'
});

/*
 * A donor-capable Patient should not accidentally receive the same
 * embedded public donor ID as another donor-capable Patient.
 */
userSchema.index(
  {
    'donorProfile.publicId': 1
  },
  {
    unique: true,
    sparse: true
  }
);

/*
|--------------------------------------------------------------------------
| Password hashing
|--------------------------------------------------------------------------
*/

userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

/*
|--------------------------------------------------------------------------
| Password comparison
|--------------------------------------------------------------------------
*/

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

/*
|--------------------------------------------------------------------------
| Model
|--------------------------------------------------------------------------
*/

const User = mongoose.model('User', userSchema);

module.exports = {
  User,
  USER_ROLES,
  pointSchema
};