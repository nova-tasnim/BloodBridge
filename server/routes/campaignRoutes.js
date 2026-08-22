const express = require('express');
const router = express.Router();
const {
  createBloodDrive,
  getCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  registerForCampaign,
  getRegistrations,
  updateAttendance
} = require('../controllers/campaignController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.patch('/registrations/:registrationId', authorize('Hospital', 'BloodBank', 'Admin'), updateAttendance);

router.route('/')
  .post(authorize('Hospital', 'BloodBank', 'Admin'), createBloodDrive)
  .get(getCampaigns);

router.post('/:id/register', authorize('Donor'), registerForCampaign);
router.get('/:id/registrations', authorize('Hospital', 'BloodBank', 'Admin'), getRegistrations);

router.route('/:id')
  .get(getCampaignById)
  .put(authorize('Hospital', 'BloodBank', 'Admin'), updateCampaign)
  .delete(authorize('Hospital', 'BloodBank', 'Admin'), deleteCampaign);

module.exports = router;