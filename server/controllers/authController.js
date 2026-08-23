const {
  User
} =
  require('../models/User');

const Donor =
  require('../models/Donor');

const Patient =
  require('../models/Patient');

const Hospital =
  require('../models/Hospital');

const BloodBank =
  require('../models/BloodBank');

const generateToken =
  require('../utils/generateToken');

const {
  sendWelcomeNotification
} =
  require('../services/notificationService');

/*
|--------------------------------------------------------------------------
| Public registration roles
|--------------------------------------------------------------------------
|
| Admin is deliberately absent.
|--------------------------------------------------------------------------
*/

const ROLE_MODELS = {
  Donor,
  Patient,
  Hospital,
  BloodBank
};

function sanitize(
  userDoc
) {
  const output =
    userDoc.toObject();

  delete output.password;

  return output;
}

/*
|--------------------------------------------------------------------------
| POST /api/auth/register
|--------------------------------------------------------------------------
*/

exports.register =
  async (req, res) => {
    const {
      name,
      email,
      phone,
      password,
      role,
      ...roleFields
    } =
      req.body;

    if (
      !name ||
      !email ||
      !phone ||
      !password ||
      !role
    ) {
      return res
        .status(400)
        .json({
          success:
            false,

          message:
            'name, email, phone, password and role are required'
        });
    }

    const Model =
      ROLE_MODELS[role];

    if (!Model) {
      return res
        .status(400)
        .json({
          success:
            false,

          message:
            `role must be one of: ${Object.keys(
              ROLE_MODELS
            ).join(', ')}`
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Create account
    |--------------------------------------------------------------------------
    */

    const user =
      await Model.create({
        name,
        email,
        phone,
        password,
        ...roleFields
      });

    /*
    |--------------------------------------------------------------------------
    | Welcome notification + REAL email
    |--------------------------------------------------------------------------
    |
    | The account remains valid even if Gmail delivery fails.
    |--------------------------------------------------------------------------
    */

    try {
      await sendWelcomeNotification(
        user
      );
    } catch (notificationErr) {
      console.error(
        'Welcome notification failed:',
        notificationErr.message
      );
    }

    const token =
      generateToken(
        user
      );

    return res
      .status(201)
      .json({
        success:
          true,

        data: {
          user:
            sanitize(
              user
            ),

          token
        }
      });
  };

/*
|--------------------------------------------------------------------------
| POST /api/auth/login
|--------------------------------------------------------------------------
*/

exports.login =
  async (req, res) => {
    const {
      email,
      password
    } =
      req.body;

    if (
      !email ||
      !password
    ) {
      return res
        .status(400)
        .json({
          success:
            false,

          message:
            'email and password are required'
        });
    }

    const user =
      await User
        .findOne({
          email:
            String(
              email
            )
              .trim()
              .toLowerCase()
        })
        .select(
          '+password'
        );

    if (
      !user ||
      !user.isActive
    ) {
      return res
        .status(401)
        .json({
          success:
            false,

          message:
            'Invalid credentials'
        });
    }

    const isMatch =
      await user.comparePassword(
        password
      );

    if (!isMatch) {
      return res
        .status(401)
        .json({
          success:
            false,

          message:
            'Invalid credentials'
        });
    }

    const token =
      generateToken(
        user
      );

    return res.json({
      success:
        true,

      data: {
        user:
          sanitize(
            user
          ),

        token
      }
    });
  };

/*
|--------------------------------------------------------------------------
| GET /api/auth/me
|--------------------------------------------------------------------------
*/

exports.getMe =
  async (req, res) => {
    return res.json({
      success:
        true,

      data:
        sanitize(
          req.user
        )
    });
  };