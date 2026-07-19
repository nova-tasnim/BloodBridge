const Donor = require('../models/Donor');
const { checkEligibility } = require('../services/eligibilityService');

// POST /api/donors
exports.createDonor = async (req, res) => {
  const donor = await Donor.create(req.body);
  const output = donor.toObject();
  delete output.password;
  res.status(201).json({ success: true, data: output });
};

// GET /api/donors
exports.getDonors = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;

  const filter = { isActive: true };
  if (req.query.bloodGroup) filter.bloodGroup = req.query.bloodGroup;
  if (req.query.isAvailable) filter.isAvailable = req.query.isAvailable === 'true';

  const [donors, total] = await Promise.all([
    Donor.find(filter).skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 }),
    Donor.countDocuments(filter)
  ]);

  res.json({
    success: true,
    count: donors.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: donors
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
  delete req.body.password;
  delete req.body.role;

  const donor = await Donor.findByIdAndUpdate(req.params.id, req.body, {
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