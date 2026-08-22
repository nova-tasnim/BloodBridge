const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('Admin'));

router.get('/overview', adminController.getPlatformOverview);
router.get('/shortage-trends', adminController.getShortageTrends);
router.get('/donor-retention', adminController.getDonorRetention);
router.patch('/verify/:userId', adminController.verifyInstitution);
router.get('/pending-verifications', adminController.getPendingVerifications);
router.get('/users', adminController.getAllUsers);
router.patch('/users/:userId/deactivate', adminController.deactivateUser);
router.patch('/users/:userId/activate', adminController.activateUser);

module.exports = router;