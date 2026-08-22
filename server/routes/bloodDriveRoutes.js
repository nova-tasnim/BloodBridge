const express = require('express');
const router = express.Router();
const bloodDriveController = require('../controllers/bloodDriveController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.post('/', authorize('Hospital', 'BloodBank', 'Admin'), bloodDriveController.createBloodDrive);
router.get('/upcoming', bloodDriveController.getUpcomingDrives);
router.post('/:driveId/register', authorize('Donor'), bloodDriveController.registerDonor);
router.get('/:driveId', bloodDriveController.getDriveDetails);

module.exports = router;