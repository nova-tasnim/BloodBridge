const Campaign = require('../models/Campaign');
const {
  createCampaign,
  listCampaigns,
  registerDonor,
  getCampaignRegistrations,
  recordAttendance
} = require('../services/campaignService');

// POST /api/campaigns
exports.createBloodDrive = async (req, res) => {
  try {
    const campaign = await createCampaign(req.body || {});
    res.status(201).json({ success: true, data: campaign });
  } catch (err) {
    if (err.statusCode === 400 && err.details) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: err.details
      });
    }
    throw err;
  }
};

// GET /api/campaigns
exports.getCampaigns = async (req, res) => {
  const { results, total, appliedFilters } = await listCampaigns(req.query);
  res.json({ success: true, count: results.length, total, appliedFilters, data: results });
};

// GET /api/campaigns/:id
exports.getCampaignById = async (req, res) => {
  const campaign = await Campaign.findById(req.params.id).populate(
    'organizer',
    'name email phone role'
  );
  if (!campaign) {
    return res.status(404).json({ success: false, message: 'Campaign not found' });
  }
  res.json({ success: true, data: campaign });
};

// PUT /api/campaigns/:id
exports.updateCampaign = async (req, res) => {
  const body = req.body || {};
  delete body.organizer;
  delete body.registeredCount;

  const campaign = await Campaign.findByIdAndUpdate(req.params.id, body, {
    new: true,
    runValidators: true
  });
  if (!campaign) {
    return res.status(404).json({ success: false, message: 'Campaign not found' });
  }
  res.json({ success: true, data: campaign });
};

// DELETE /api/campaigns/:id — soft delete
exports.deleteCampaign = async (req, res) => {
  const campaign = await Campaign.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );
  if (!campaign) {
    return res.status(404).json({ success: false, message: 'Campaign not found' });
  }
  res.json({ success: true, message: 'Campaign cancelled' });
};

// POST /api/campaigns/:id/register
exports.registerForCampaign = async (req, res) => {
  const body = req.body || {};
  if (!body.donorId) {
    return res.status(400).json({ success: false, message: 'donorId is required' });
  }

  const result = await registerDonor(req.params.id, body.donorId);
  res.status(201).json({ success: true, message: 'Registered successfully', data: result });
};

// GET /api/campaigns/:id/registrations
exports.getRegistrations = async (req, res) => {
  const registrations = await getCampaignRegistrations(req.params.id);
  res.json({ success: true, count: registrations.length, data: registrations });
};

// PATCH /api/campaigns/registrations/:registrationId
exports.updateAttendance = async (req, res) => {
  const registration = await recordAttendance(req.params.registrationId, req.body || {});
  res.json({ success: true, data: registration });
};