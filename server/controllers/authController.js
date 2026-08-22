const { User } = require('../models/User');
const Donor = require('../models/Donor');
const Patient = require('../models/Patient');
const Hospital = require('../models/Hospital');
const BloodBank = require('../models/BloodBank');
const Admin = require('../models/Admin');
const generateToken = require('../utils/generateToken');

// Maps the role string in the request to the correct Mongoose
// discriminator model, so registration creates the right document
// type (Donor/Patient/Hospital/BloodBank/Admin) with its own fields.
const ROLE_MODELS = { Donor, Patient, Hospital, BloodBank, Admin };

function sanitize(userDoc) {
  const output = userDoc.toObject();
  delete output.password;
  return output;
}

// POST /api/auth/register
exports.register = async (req, res) => {
  const { name, email, phone, password, role, ...roleFields } = req.body;

  if (!name || !email || !phone || !password || !role) {
    return res.status(400).json({
      success: false,
      message: 'name, email, phone, password and role are required'
    });
  }

  const Model = ROLE_MODELS[role];
  if (!Model) {
    return res.status(400).json({
      success: false,
      message: `role must be one of: ${Object.keys(ROLE_MODELS).join(', ')}`
    });
  }

  // roleFields carries whatever role-specific data was sent
  // (e.g. bloodGroup/dateOfBirth/gender/weightKg for a Donor,
  // registrationNumber for a Hospital, etc.) straight into the
  // matching discriminator schema.
  const user = await Model.create({ name, email, phone, password, ...roleFields });

  const token = generateToken(user);

  res.status(201).json({
    success: true,
    data: { user: sanitize(user), token }
  });
};

// POST /api/auth/login
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'email and password are required' });
  }

  // password has `select: false` on the schema, so it must be
  // explicitly requested here to run the comparison.
  const user = await User.findOne({ email }).select('+password');

  if (!user || !user.isActive) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const token = generateToken(user);

  res.json({
    success: true,
    data: { user: sanitize(user), token }
  });
};

// GET /api/auth/me  (protected)
exports.getMe = async (req, res) => {
  res.json({ success: true, data: sanitize(req.user) });
};