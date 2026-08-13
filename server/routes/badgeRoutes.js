const express = require('express');
const router = express.Router();
const badgeController = require('../controllers/badgeController');

router.post('/donor/:donorId/check', badgeController.checkAndAwardBadges);
router.get('/leaderboard', badgeController.getLeaderboard);
router.get('/donor/:donorId', badgeController.getDonorBadges);

module.exports = router;