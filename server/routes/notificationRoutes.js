const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect, authorize, ownerOrRoles } = require('../middleware/auth');

router.use(protect);

// Notifying donors is a staff-triggered action (or, going forward,
// something the matching engine calls internally) — not something
// any logged-in user should be able to fire at will.
router.post('/notify-matched-donors', authorize('Hospital', 'BloodBank', 'Admin'), notificationController.notifyMatchedDonors);

// Notifications for the currently logged-in user
router.get('/me', notificationController.getMyNotifications);

// Mark all unread notifications belonging to the logged-in user as read
router.patch('/read-all', notificationController.markAllAsRead);

// Existing user-specific endpoint remains available
router.get(
  '/user/:userId',
  ownerOrRoles('userId', 'Admin'),
  notificationController.getUserNotifications
);

// Individual notification read action with ownership protection
router.patch(
  '/:notificationId/read',
  notificationController.markAsRead
);

module.exports = router;