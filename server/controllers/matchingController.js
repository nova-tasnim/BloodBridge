const {
  findMatches,
  attachMatchesToRequest
} = require('../services/matchingService');
const {
  getCompatibleDonorGroups,
  getCompatibleRecipientGroups,
  isCompatible,
  RECIPIENT_CAN_RECEIVE_FROM
} = require('../services/compatibilityService');

// GET /api/requests/:id/matches — ranked donors, read-only
exports.getMatches = async (req, res) => {
  const result = await findMatches(req.params.id, req.query);
  res.json({ success: true, data: result });
};

// POST /api/requests/:id/matches — run matching and persist to the request
exports.runMatching = async (req, res) => {
  const result = await attachMatchesToRequest(req.params.id, req.body || {});
  res.json({
    success: true,
    message: `${result.matches.length} donor(s) matched`,
    data: result
  });
};

// GET /api/compatibility/:bloodGroup — who can donate to this group
exports.getCompatibility = async (req, res) => {
  const group = req.params.bloodGroup;

  res.json({
    success: true,
    data: {
      bloodGroup: group,
      canReceiveFrom: getCompatibleDonorGroups(group),
      canDonateTo: getCompatibleRecipientGroups(group)
    }
  });
};

// GET /api/compatibility — the full matrix
exports.getCompatibilityMatrix = async (req, res) => {
  res.json({ success: true, data: RECIPIENT_CAN_RECEIVE_FROM });
};

// GET /api/compatibility/check?donor=O-&recipient=AB+
exports.checkCompatibility = async (req, res) => {
  const { donor, recipient } = req.query;
  if (!donor || !recipient) {
    return res.status(400).json({
      success: false,
      message: 'Both donor and recipient query parameters are required'
    });
  }

  res.json({
    success: true,
    data: {
      donorGroup: donor,
      recipientGroup: recipient,
      compatible: isCompatible(donor, recipient)
    }
  });
};