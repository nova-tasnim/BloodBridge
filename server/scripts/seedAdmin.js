require('dotenv').config();

const mongoose = require('mongoose');

const { User } = require('../models/User');
const Admin = require('../models/Admin');

/*
|--------------------------------------------------------------------------
| Seed permanent BloodBridge administrator
|--------------------------------------------------------------------------
|
| Admin credentials are read only from .env.
|
| This script is safe to run multiple times:
|
| - If Admin doesn't exist → create it.
| - If same Admin already exists → leave it alone.
| - If same email belongs to another role → stop.
|--------------------------------------------------------------------------
*/

async function seedAdmin() {
  try {
    /*
    |--------------------------------------------------------------------------
    | Required environment variables
    |--------------------------------------------------------------------------
    */

    const requiredVariables = [
      'MONGO_URI',
      'ADMIN_NAME',
      'ADMIN_EMAIL',
      'ADMIN_PHONE',
      'ADMIN_PASSWORD'
    ];

    const missingVariables =
      requiredVariables.filter(
        (key) =>
          !process.env[key] ||
          !String(process.env[key]).trim()
      );

    if (missingVariables.length > 0) {
      throw new Error(
        `Missing environment variable(s): ${missingVariables.join(', ')}`
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Connect to MongoDB
    |--------------------------------------------------------------------------
    */

    await mongoose.connect(
      process.env.MONGO_URI
    );

    console.log(
      'Connected to MongoDB'
    );

    /*
    |--------------------------------------------------------------------------
    | Normalize email
    |--------------------------------------------------------------------------
    */

    const adminEmail =
      process.env.ADMIN_EMAIL
        .trim()
        .toLowerCase();

    /*
    |--------------------------------------------------------------------------
    | Check whether email already exists
    |--------------------------------------------------------------------------
    */

    const existingUser =
      await User.findOne({
        email: adminEmail
      });

    if (existingUser) {
      /*
       * Same email exists but belongs to another role.
       *
       * Never silently convert Patient/Donor/etc. into Admin.
       */
      if (
        existingUser.role !== 'Admin'
      ) {
        throw new Error(
          `The email ${adminEmail} already belongs to a ${existingUser.role} account.`
        );
      }

      console.log('');
      console.log(
        'Admin account already exists.'
      );

      console.log({
        id:
          existingUser._id.toString(),

        name:
          existingUser.name,

        email:
          existingUser.email,

        role:
          existingUser.role,

        isActive:
          existingUser.isActive
      });

      console.log('');
      console.log(
        'No duplicate Admin was created.'
      );

      return;
    }

    /*
    |--------------------------------------------------------------------------
    | Create Admin
    |--------------------------------------------------------------------------
    |
    | Password hashing is handled automatically by the User schema
    | pre-save middleware.
    |--------------------------------------------------------------------------
    */

    const admin =
      await Admin.create({
        name:
          process.env.ADMIN_NAME.trim(),

        email:
          adminEmail,

        phone:
          process.env.ADMIN_PHONE.trim(),

        password:
          process.env.ADMIN_PASSWORD,

        isActive:
          true,

        permissions: [
          'verify_institutions',
          'manage_users',
          'view_analytics'
        ]
      });

    console.log('');
    console.log(
      'BloodBridge Admin created successfully.'
    );

    console.log({
      id:
        admin._id.toString(),

      name:
        admin.name,

      email:
        admin.email,

      role:
        admin.role,

      isActive:
        admin.isActive,

      permissions:
        admin.permissions
    });

    console.log('');
    console.log(
      'You can now log into BloodBridge using ADMIN_EMAIL and ADMIN_PASSWORD.'
    );
  } catch (error) {
    console.error('');
    console.error(
      'ADMIN SEED FAILED:'
    );

    console.error(
      error.message
    );

    process.exitCode = 1;
  } finally {
    /*
    |--------------------------------------------------------------------------
    | Disconnect
    |--------------------------------------------------------------------------
    */

    if (
      mongoose.connection.readyState !== 0
    ) {
      await mongoose.disconnect();

      console.log(
        'Disconnected from MongoDB'
      );
    }
  }
}

seedAdmin();