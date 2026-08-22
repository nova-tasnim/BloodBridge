const jwt = require('jsonwebtoken');

/**
 * Signs a JWT containing the user's id and role.
 * Role is included so the frontend/middleware can make quick
 * decisions without an extra DB lookup on every request.
 */
function generateToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = generateToken;