const jwt = require('jsonwebtoken');
const { User } = require('../models/User');

async function protect(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }

  const token = header.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Not authorized, invalid or expired token' });
  }

  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) {
    return res.status(401).json({ success: false, message: 'Not authorized, user no longer exists or is inactive' });
  }

  req.user = user;
  next();
}

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden — insufficient role permissions' });
    }
    next();
  };
}

/**
 * Allows the request through if the logged-in user IS the resource
 * identified by req.params[paramName] (e.g. their own donor id),
 * OR if their role is in the allowed staff/admin roles list.
 * Used for things like "a donor can view/edit their own record,
 * and so can Hospital/BloodBank/Admin staff coordinating with them."
 */
function ownerOrRoles(paramName, ...allowedRoles) {
  return (req, res, next) => {
    const isOwner = req.user && req.user._id.toString() === req.params[paramName];
    const hasRole = req.user && allowedRoles.includes(req.user.role);

    if (!isOwner && !hasRole) {
      return res.status(403).json({ success: false, message: 'Forbidden — not your resource' });
    }
    next();
  };
}

async function optionalProtect(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return next();
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (user && user.isActive) {
      req.user = user;
    }
  } catch (_) {
    // If token invalid/expired, continue anonymously without req.user
  }

  next();
}

module.exports = { protect, authorize, ownerOrRoles, optionalProtect };