const { BloodRequest } = require('../models/BloodRequest');
const {
  createRequest,
  listRequests,
  getRequestById
} = require('../services/bloodRequestService');

// POST /api/requests — Feature 5
exports.createBloodRequest = async (req, res) => {
  const body = req.body || {};

  try {
    const request = await createRequest(body);
    res.status(201).json({ success: true, data: request });
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

// GET /api/requests
exports.getBloodRequests = async (req, res) => {
  const { results, total, page, pages, appliedFilters } = await listRequests(req.query);

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

// GET /api/requests/:id
exports.getBloodRequestById = async (req, res) => {
  const request = await getRequestById(req.params.id);
  if (!request) {
    return res.status(404).json({ success: false, message: 'Blood request not found' });
  }
  res.json({ success: true, data: request });
};

// PUT /api/requests/:id
exports.updateBloodRequest = async (req, res) => {
  const body = req.body || {};

  // Status transitions are handled by the lifecycle service in Sprint 3,
  // not by a general-purpose update.
  delete body.status;
  delete body.requester;
  delete body.matchedDonors;

  const request = await BloodRequest.findByIdAndUpdate(req.params.id, body, {
    new: true,
    runValidators: true
  });
  if (!request) {
    return res.status(404).json({ success: false, message: 'Blood request not found' });
  }
  res.json({ success: true, data: request });
};

// DELETE /api/requests/:id — soft delete
exports.deleteBloodRequest = async (req, res) => {
  const request = await BloodRequest.findByIdAndUpdate(
    req.params.id,
    { isActive: false, status: 'cancelled' },
    { new: true }
  );
  if (!request) {
    return res.status(404).json({ success: false, message: 'Blood request not found' });
  }
  res.json({ success: true, message: 'Blood request cancelled' });
};