const {
  transitionStatus,
  respondToRequest,
  fulfilRequest,
  inviteMatchedDonors,
  getRequestTimeline,
  getAllowedTransitions,
  TRANSITIONS
} = require('../services/requestLifecycleService');

// PATCH /api/requests/:id/status
exports.changeStatus = async (req, res) => {
  const body = req.body || {};
  if (!body.status) {
    return res.status(400).json({ success: false, message: 'status is required' });
  }

  const result = await transitionStatus(req.params.id, body.status, body);
  res.json({
    success: true,
    message: `Status changed from "${result.previousStatus}" to "${result.currentStatus}"`,
    data: result
  });
};

// POST /api/requests/:id/respond
exports.respond = async (req, res) => {
  const body = req.body || {};
  if (!body.donorId || !body.decision) {
    return res.status(400).json({
      success: false,
      message: 'donorId and decision ("accepted" or "declined") are required'
    });
  }

  const result = await respondToRequest(
    req.params.id,
    body.donorId,
    body.decision,
    body
  );

  res.json({
    success: true,
    message: `${result.donorName} ${result.decision} the request`,
    data: result
  });
};

// POST /api/requests/:id/fulfil
exports.fulfil = async (req, res) => {
  const body = req.body || {};
  if (!body.donorId) {
    return res.status(400).json({ success: false, message: 'donorId is required' });
  }

  const result = await fulfilRequest(req.params.id, body.donorId, body);

  res.json({
    success: true,
    message: result.fullyFulfilled
      ? 'Request fully fulfilled'
      : `${result.unitsRemaining} unit(s) still required`,
    data: result
  });
};

// POST /api/requests/:id/invite
exports.invite = async (req, res) => {
  const body = req.body || {};
  const created = await inviteMatchedDonors(req.params.id, body.matches || []);
  res.status(201).json({
    success: true,
    message: `${created.length} donor(s) invited`,
    data: created
  });
};

// GET /api/requests/:id/timeline
exports.getTimeline = async (req, res) => {
  const timeline = await getRequestTimeline(req.params.id);
  res.json({ success: true, data: timeline });
};

// GET /api/requests/lifecycle/transitions — the state machine, exposed
exports.getTransitionMap = async (req, res) => {
  res.json({
    success: true,
    data: {
      transitions: TRANSITIONS,
      description:
        'Each key is a request status; the array lists the statuses it may move to. ' +
        'Empty arrays denote terminal states.'
    }
  });
};

// GET /api/requests/:id/allowed-transitions
exports.getAllowed = async (req, res) => {
  const { BloodRequest } = require('../models/BloodRequest');
  const request = await BloodRequest.findById(req.params.id);
  if (!request) {
    return res.status(404).json({ success: false, message: 'Blood request not found' });
  }

  res.json({
    success: true,
    data: {
      currentStatus: request.status,
      allowedNext: getAllowedTransitions(request.status)
    }
  });
};