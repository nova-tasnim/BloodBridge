const { User } = require('../models/User');
const Donor = require('../models/Donor');

const {
  checkEligibility
} = require('../services/eligibilityService');

const {
  searchDonors
} = require('../services/donorSearchService');

const {
  resolveDonor,
  normalizeDonor,
  setAvailability
} = require('../services/donorIdentityService');

// POST /api/donors — Create donor record directly (registration/admin)
exports.createDonor = async (req, res) => {
  try {
    const donor = await Donor.create(req.body);
    const output = donor.toObject();
    delete output.password;
    res.status(201).json({ success: true, data: output });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// POST /api/donors/become-donor
//
// A Patient gains donor CAPABILITY.
//
// IMPORTANT:
// The Patient remains role === 'Patient'.
// We create user.donorProfile instead of changing the discriminator role.
exports.becomeDonor = async (req, res) => {
  try {
    /*
    |--------------------------------------------------------------------------
    | 1. Native Donor accounts are already donors
    |--------------------------------------------------------------------------
    */

    if (req.user.role === 'Donor') {
      return res.status(400).json({
        success: false,
        message: 'This account is already registered as a blood donor'
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 2. Only Patient accounts can use this self-registration feature
    |--------------------------------------------------------------------------
    */

    if (req.user.role !== 'Patient') {
      return res.status(403).json({
        success: false,
        message: 'Only patient accounts can register as blood donors'
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 3. Prevent a Patient from registering twice
    |--------------------------------------------------------------------------
    */

    if (req.user.donorProfile) {
      return res.status(400).json({
        success: false,
        message: 'You are already registered as a blood donor'
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 4. Read donor information
    |--------------------------------------------------------------------------
    |
    | Phase 1:
    | bloodGroup and dateOfBirth prefer Patient signup information.
    |
    | gender and weightKg are still accepted from this temporary donor form.
    |
    | In Phase 2 we will move gender + weight into Patient signup too,
    | so this second form becomes almost unnecessary.
    |--------------------------------------------------------------------------
    */

    const body = req.body || {};

    const bloodGroup =
      req.user.bloodGroup ||
      body.bloodGroup;

    const dateOfBirth =
      req.user.dateOfBirth ||
      body.dateOfBirth;

    const gender = body.gender;
    const weightKg = body.weightKg;

    const healthFlags = body.healthFlags || {};

    const shareLocationConsent =
      Boolean(body.shareLocationConsent);

    /*
    |--------------------------------------------------------------------------
    | 5. Validate required donor information
    |--------------------------------------------------------------------------
    */

    if (
      !bloodGroup ||
      !dateOfBirth ||
      !gender ||
      weightKg === undefined ||
      weightKg === null ||
      weightKg === ''
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Blood group, date of birth, gender, and weight are required to register as a donor'
      });
    }

    const numericWeight = Number(weightKg);

    if (Number.isNaN(numericWeight) || numericWeight <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid weight'
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 6. Create the embedded donor profile
    |--------------------------------------------------------------------------
    |
    | DO NOT:
    |
    | req.user.role = 'Donor'
    |
    | Patient must remain Patient.
    |--------------------------------------------------------------------------
    */

    req.user.donorProfile = {
      bloodGroup,
      dateOfBirth,
      gender,
      weightKg: numericWeight,

      lastDonationDate: null,
      isAvailable: true,
      totalDonations: 0,

      shareLocationConsent,

      healthFlags
    };

    /*
    |--------------------------------------------------------------------------
    | 7. Save using the existing Patient document
    |--------------------------------------------------------------------------
    |
    | The donorProfile schema automatically generates:
    |
    | DON-XXXXXX
    |--------------------------------------------------------------------------
    */

    await req.user.save();

    /*
    |--------------------------------------------------------------------------
    | 8. Convert to safe JSON response
    |--------------------------------------------------------------------------
    */

    const updatedUser = req.user.toObject();

    delete updatedUser.password;

    /*
    |--------------------------------------------------------------------------
    | 9. Return updated Patient account
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({
      success: true,

      message:
        'Successfully registered as a blood donor',

      data: updatedUser
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

// GET /api/donors — Feature 4: search & filter directory
exports.getDonors = async (req, res) => {
  try {
    const { results, total, page, pages, appliedFilters } = await searchDonors(req.query);

    res.json({
      success: true,
      count: results.length,
      total,
      page,
      pages,
      appliedFilters,
      data: results
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/donors/:id
//
// Supports:
// Mongo User _id
// native Donor publicId
// Patient donorProfile.publicId
exports.getDonorById = async (
  req,
  res
) => {
  try {
    const donor =
      await resolveDonor(
        req.params.id
      );

    if (!donor) {
      return res.status(404).json({
        success: false,
        message:
          'Donor not found'
      });
    }

    const normalized =
      normalizeDonor(donor);

    return res.json({
      success: true,
      data: normalized
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message:
        err.message
    });
  }
};

// PUT /api/donors/:id
exports.updateDonor = async (req, res) => {
  try {
    const body = req.body || {};
    delete body.password;
    delete body.role;

    const donor = await Donor.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true
    }).select('-password');

    if (!donor) return res.status(404).json({ success: false, message: 'Donor not found' });
    res.json({ success: true, data: donor });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /api/donors/:id — soft delete
exports.deleteDonor = async (req, res) => {
  try {
    const donor = await Donor.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!donor) return res.status(404).json({ success: false, message: 'Donor not found' });
    res.json({ success: true, message: 'Donor deactivated' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// GET /api/donors/:id/eligibility
exports.getDonorEligibility = async (
  req,
  res
) => {
  try {
    const donor =
      await resolveDonor(
        req.params.id
      );

    if (!donor) {
      return res.status(404).json({
        success: false,
        message:
          'Donor not found'
      });
    }

    const normalized =
      normalizeDonor(donor);

    const result =
      checkEligibility(
        normalized
      );

    return res.json({
      success: true,

      data: {
        donorId:
          normalized._id,

        publicId:
          normalized.publicId,

        donorName:
          normalized.name,

        bloodGroup:
          normalized.bloodGroup,

        ...result
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message:
        err.message
    });
  }
};
// PATCH /api/donors/:id/availability 
// PATCH /api/donors/:id/availability
// PATCH /api/donors/:id/availability
//
// Works for:
//
// Native Donor:
//   role = Donor
//   isAvailable at top level
//
// Donor-capable Patient:
//   role = Patient
//   donorProfile.isAvailable
//
exports.toggleAvailability = async (req, res) => {
  try {
    /*
     * donorOwnerOrRoles() already resolves the donor
     * for ordinary users and stores it in req.donor.
     *
     * Admin can bypass ownership middleware, so in
     * that case we resolve the donor here.
     */
    const donor =
      req.donor ||
      await resolveDonor(req.params.id);

    if (!donor) {
      return res.status(404).json({
        success: false,
        message: 'Donor not found'
      });
    }

    /*
     * Convert either donor architecture to the
     * same normalized shape.
     */
    const before =
      normalizeDonor(donor);

    if (!before) {
      return res.status(400).json({
        success: false,
        message:
          'This account does not have donor capability'
      });
    }

    /*
     * Frontend normally sends:
     *
     * {
     *   isAvailable: true / false
     * }
     *
     * If it does not, toggle the current value.
     */
    const requestedValue =
      typeof req.body?.isAvailable === 'boolean'
        ? req.body.isAvailable
        : !before.isAvailable;

    /*
     * Universal identity service knows where the
     * availability field belongs:
     *
     * Donor:
     *   user.isAvailable
     *
     * Patient donor:
     *   user.donorProfile.isAvailable
     */
    const updatedDonor =
      await setAvailability(
        donor,
        requestedValue
      );

    const after =
      normalizeDonor(updatedDonor);

    return res.status(200).json({
      success: true,

      message:
        after.isAvailable
          ? 'Donor is now available'
          : 'Donor is now unavailable',

      data: {
        donorId:
          after._id,

        publicId:
          after.publicId,

        donorName:
          after.name,

        isAvailable:
          after.isAvailable
      }
    });
  } catch (err) {
    console.error(
      'toggleAvailability error:',
      err
    );

    return res.status(500).json({
      success: false,
      message:
        err.message ||
        'Unable to update donor availability'
    });
  }
};