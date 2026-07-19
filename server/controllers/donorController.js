const Donor = require('../models/Donor');
const { checkEligibility } = require('../services/eligibilityService');
const { searchDonors } = require('../services/donorSearchService');

// POST /api/donors
exports.createDonor = async (req, res) => {
  const donor = await Donor.create(req.body);
  const output = donor.toObject();
  delete output.password;
  res.status(201).json({ success: true, data: output });
};

// GET /api/donors — Feature 4: search & filter
exports.getDonors = async (req, res) => {
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
};

// GET /api/donors/:id
exports.getDonorById = async (req, res) => {
  const donor = await Donor.findById(req.params.id);
  if (!donor) return res.status(404).json({ success: false, message: 'Donor not found' });
  res.json({ success: true, data: donor });
};

// PUT /api/donors/:id
exports.updateDonor = async (req, res) => {
  const body = req.body || {};
  delete body.password;
  delete body.role;

  const donor = await Donor.findByIdAndUpdate(req.params.id, body, {
    new: true,
    runValidators: true
  });
  if (!donor) return res.status(404).json({ success: false, message: 'Donor not found' });
  res.json({ success: true, data: donor });
};

// DELETE /api/donors/:id — soft delete
exports.deleteDonor = async (req, res) => {
  const donor = await Donor.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );
  if (!donor) return res.status(404).json({ success: false, message: 'Donor not found' });
  res.json({ success: true, message: 'Donor deactivated' });
};

// GET /api/donors/:id/eligibility — Feature 1
exports.getDonorEligibility = async (req, res) => {
  const donor = await Donor.findById(req.params.id);
  if (!donor) return res.status(404).json({ success: false, message: 'Donor not found' });

  const result = checkEligibility(donor);

  res.json({
    success: true,
    data: {
      donorId: donor._id,
      donorName: donor.name,
      bloodGroup: donor.bloodGroup,
      ...result
    }
  });
};

// PATCH /api/donors/:id/availability — Feature 2
exports.toggleAvailability = async (req, res) => {
  const donor = await Donor.findById(req.params.id);
  if (!donor) return res.status(404).json({ success: false, message: 'Donor not found' });

  const body = req.body || {};
  donor.isAvailable =
    typeof body.isAvailable === 'boolean'
      ? body.isAvailable
      : !donor.isAvailable;

  await donor.save();

  res.json({
    success: true,
    message: `Donor is now ${donor.isAvailable ? 'available' : 'unavailable'}`,
    data: {
      donorId: donor._id,
      donorName: donor.name,
      isAvailable: donor.isAvailable
    }
  });
};