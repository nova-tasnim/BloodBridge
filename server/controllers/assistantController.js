const { getAssistantReply } = require('../services/assistantService');

// POST /api/assistant/chat — Feature 20
exports.chatWithAssistant = async (req, res) => {
  const { message, donorId, language } = req.body;

  if (!message) {
    return res.status(400).json({ success: false, message: 'Message is required' });
  }

  const result = await getAssistantReply({ message, donorId, language });

  res.json({ success: true, data: result });
};