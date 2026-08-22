const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminderController');
const { protect, authorize, ownerOrRoles } = require('../middleware/auth');

router.use(protect);

router.get('/donor/:donorId/next-eligible', ownerOrRoles('donorId', 'Hospital', 'BloodBank', 'Admin'), reminderController.getNextEligibleDate);
router.post('/donor/:donorId', ownerOrRoles('donorId', 'Admin'), reminderController.createReminder);
router.get('/due', authorize('Hospital', 'BloodBank', 'Admin'), reminderController.getDueReminders);
router.patch('/:reminderId/sent', authorize('Hospital', 'BloodBank', 'Admin'), reminderController.markReminderSent);

module.exports = router;