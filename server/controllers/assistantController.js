const { getAssistantReply } = require('../services/assistantService');

// POST /api/assistant/chat — Feature 20
exports.chatWithAssistant = async (req, res) => {
  const { message, bloodGroup, language } = req.body || {};

  if (!message) {
    return res.status(400).json({ success: false, message: 'Message is required' });
  }

  // Bind donorId authoritatively from req.user if the authenticated user is a Donor
  const donorId = req.user?.role === 'Donor' ? req.user._id : null;
  const targetBloodGroup = req.user?.bloodGroup || bloodGroup;

  const result = await getAssistantReply({
    message,
    donorId,
    bloodGroup: targetBloodGroup,
    language
  });

  res.json({ success: true, data: result });
};