const {
  recordDonation,
  getDonationHistory,
  getDonationStats
} = require('../services/donationService');

// POST /api/donations — log a donation
exports.createDonation = async (req, res) => {
  const body = req.body || {};

  if (!body.donorId) {
    return res.status(400).json({ success: false, message: 'donorId is required' });
  }

  const record = await recordDonation({
    donorId: body.donorId,
    bloodRequestId: body.bloodRequestId || null,
    bloodBankId: body.bloodBankId || null,
    donationDate: body.donationDate || new Date(),
    unitsDonated: body.unitsDonated || 1,
    locationName: body.locationName || '',
    notes: body.notes || ''
  });

  res.status(201).json({ success: true, data: record });
};

// GET /api/donations/donor/:donorId — history for one donor
exports.getDonorHistory = async (req, res) => {
  const [history, stats] = await Promise.all([
    getDonationHistory(req.params.donorId),
    getDonationStats(req.params.donorId)
  ]);

  res.json({
    success: true,
    count: history.length,
    stats,
    data: history
  });
};

// GET /api/donations/:id — single record
exports.getDonationById = async (req, res) => {
  const DonationRecord = require('../models/DonationRecord');
  const record = await DonationRecord.findById(req.params.id);
  if (!record) {
    return res.status(404).json({ success: false, message: 'Donation record not found' });
  }
  res.json({ success: true, data: record });
};