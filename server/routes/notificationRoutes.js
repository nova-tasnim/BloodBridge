const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

router.post('/notify-matched-donors', notificationController.notifyMatchedDonors);
router.get('/user/:userId', notificationController.getUserNotifications);
router.patch('/:notificationId/read', notificationController.markAsRead);

module.exports = router;