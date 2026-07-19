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

// Static path before parameterised ones
router.patch('/registrations/:registrationId', updateAttendance);

router.route('/').post(createBloodDrive).get(getCampaigns);
router.post('/:id/register', registerForCampaign);
router.get('/:id/registrations', getRegistrations);
router
  .route('/:id')
  .get(getCampaignById)
  .put(updateCampaign)
  .delete(deleteCampaign);

module.exports = router;