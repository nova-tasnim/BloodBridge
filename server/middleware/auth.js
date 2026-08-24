const jwt = require('jsonwebtoken');
const { User } = require('../models/User');

const {
  hasDonorCapability,
  resolveDonor
} = require('../services/donorIdentityService');

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/
/*
|--------------------------------------------------------------------------
| Institution verification
|--------------------------------------------------------------------------
|
| Hospital and BloodBank accounts may log in before Admin approval,
| but trusted institution actions require verification.
|
*/

function isUnverifiedInstitution(user) {
  return Boolean(
    user &&
    [
      'Hospital',
      'BloodBank'
    ].includes(user.role) &&
    user.isVerified !== true
  );
}

function requireVerifiedInstitution(
  req,
  res,
  next
) {
  if (
    isUnverifiedInstitution(
      req.user
    )
  ) {
    return res
      .status(403)
      .json({
        success: false,

        message:
          'Your institution account is awaiting Admin verification'
      });
  }

  next();
}

async function protect(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided'
    });
  }

  const token = header.split(' ')[1];

  let decoded;

  try {
    decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );
  } catch (err) {
    return res.status(401).json({
      success: false,
      message:
        'Not authorized, invalid or expired token'
    });
  }

  const user = await User.findById(decoded.id);

  if (!user || !user.isActive) {
    return res.status(401).json({
      success: false,
      message:
        'Not authorized, user no longer exists or is inactive'
    });
  }

  req.user = user;

  next();
}

/*
|--------------------------------------------------------------------------
| Role authorization
|--------------------------------------------------------------------------
*/
function authorize(
  ...allowedRoles
) {
  return (
    req,
    res,
    next
  ) => {
    if (
      !req.user ||
      !allowedRoles.includes(
        req.user.role
      )
    ) {
      return res
        .status(403)
        .json({
          success: false,

          message:
            'Forbidden — insufficient role permissions'
        });
    }

    /*
     * If an institution is using an institution-only
     * privilege, it must first be verified by Admin.
     */
    if (
      isUnverifiedInstitution(
        req.user
      )
    ) {
      return res
        .status(403)
        .json({
          success: false,

          message:
            'Your institution account is awaiting Admin verification'
        });
    }

    next();
  };
}
/*
|--------------------------------------------------------------------------
| Require donor capability
|--------------------------------------------------------------------------
*/

function requireDonorCapability(req, res, next) {
  if (
    !req.user ||
    !hasDonorCapability(req.user)
  ) {
    return res.status(403).json({
      success: false,
      message:
        'Blood donor registration is required for this action'
    });
  }

  next();
}

/*
|--------------------------------------------------------------------------
| Generic ownership middleware
|--------------------------------------------------------------------------
*/

function ownerOrRoles(
  paramName,
  ...allowedRoles
) {
  return (req, res, next) => {
    const isOwner =
      req.user &&
      req.user._id.toString() ===
        String(req.params[paramName]);

    const hasRole =
      req.user &&
      allowedRoles.includes(req.user.role);

    if (!isOwner && !hasRole) {
      return res.status(403).json({
        success: false,
        message:
          'Forbidden — not your resource'
      });
    }

    next();
  };
}

/*
|--------------------------------------------------------------------------
| Donor-aware ownership middleware
|--------------------------------------------------------------------------
|
| Handles:
|
| Mongo User _id
| DON-XXXXXX native donor
| DON-XXXXXX donor-capable Patient
|--------------------------------------------------------------------------
*/

function donorOwnerOrRoles(
  paramName,
  ...allowedRoles
) {
  return async (req, res, next) => {
    try {
      /*
       * Staff/Admin role bypass.
       */
      if (
        req.user &&
        allowedRoles.includes(
          req.user.role
        )
      ) {
        if (
          isUnverifiedInstitution(
            req.user
          )
        ) {
          return res
            .status(403)
            .json({
              success: false,
      
              message:
                'Your institution account is awaiting Admin verification'
            });
        }
      
        return next();
      }

      /*
       * Ordinary user must themselves be donor-capable.
       */
      if (
        !req.user ||
        !hasDonorCapability(req.user)
      ) {
        return res.status(403).json({
          success: false,
          message:
            'Forbidden — donor capability required'
        });
      }

      const identifier =
        req.params[paramName];

      const donor =
        await resolveDonor(identifier);

      if (!donor) {
        return res.status(404).json({
          success: false,
          message: 'Donor not found'
        });
      }

      const isOwner =
        donor._id.toString() ===
        req.user._id.toString();

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message:
            'Forbidden — not your donor profile'
        });
      }

      /*
       * Save resolved donor for controller.
       */
      req.donor = donor;

      next();
    } catch (err) {
      next(err);
    }
  };
}

/*
|--------------------------------------------------------------------------
| Optional authentication
|--------------------------------------------------------------------------
*/

async function optionalProtect(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return next();
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const user = await User.findById(decoded.id);

    if (user && user.isActive) {
      req.user = user;
    }
  } catch (_) {
    // Continue anonymously.
  }

  next();
}

module.exports = {
  protect,
  authorize,
  requireDonorCapability,
  ownerOrRoles,
  donorOwnerOrRoles,
  optionalProtect,
  requireVerifiedInstitution
};