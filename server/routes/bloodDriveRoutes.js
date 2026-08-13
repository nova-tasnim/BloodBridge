const express = require('express');
const router = express.Router();
const bloodDriveController = require('../controllers/bloodDriveController');

router.post('/', bloodDriveController.createBloodDrive);
router.get('/upcoming', bloodDriveController.getUpcomingDrives);
router.post('/:driveId/register', bloodDriveController.registerDonor);
router.get('/:driveId', bloodDriveController.getDriveDetails);

module.exports = router;