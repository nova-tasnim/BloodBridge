const express = require('express');
const router = express.Router();
const { chatWithAssistant } = require('../controllers/assistantController');
const { optionalProtect } = require('../middleware/auth');

router.post('/chat', optionalProtect, chatWithAssistant);

module.exports = router;