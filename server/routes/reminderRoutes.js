const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminderController');

router.get('/donor/:donorId/next-eligible', reminderController.getNextEligibleDate);
router.post('/donor/:donorId', reminderController.createReminder);
router.get('/due', reminderController.getDueReminders);
router.patch('/:reminderId/sent', reminderController.markReminderSent);

module.exports = router;