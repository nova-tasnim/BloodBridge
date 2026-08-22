const express = require('express');
const router = express.Router();
const badgeController = require('../controllers/badgeController');
const { protect, ownerOrRoles } = require('../middleware/auth');

router.use(protect);

router.post('/donor/:donorId/check', ownerOrRoles('donorId', 'Hospital', 'BloodBank', 'Admin'), badgeController.checkAndAwardBadges);
router.get('/leaderboard', badgeController.getLeaderboard);
router.get('/donor/:donorId', badgeController.getDonorBadges);

module.exports = router;