const express = require('express');
const router = express.Router();
const {
  addInventory,
  getInventory,
  getInventoryById,
  updateInventory,
  consumeInventory,
  deleteInventory,
  getSummary,
  getInventoryAlerts
} = require('../controllers/inventoryController');
const { protect, authorize, ownerOrRoles } = require('../middleware/auth');

router.use(protect);
router.use(authorize('BloodBank', 'Hospital', 'Admin'));

// Scoped summary and alerts routes for authenticated blood bank or specific ID
router.get('/summary/me', authorize('BloodBank', 'Admin'), getSummary);
router.get('/alerts/me', authorize('BloodBank', 'Admin'), getInventoryAlerts);
router.get('/bank/:bloodBankId/summary', getSummary);
router.get('/bank/:bloodBankId/alerts', getInventoryAlerts);

router.route('/')
  .post(authorize('BloodBank', 'Admin'), addInventory)
  .get(getInventory);

router.patch('/:id/consume', authorize('BloodBank', 'Hospital', 'Admin'), consumeInventory);

router.route('/:id')
  .get(getInventoryById)
  .put(authorize('BloodBank', 'Admin'), updateInventory)
  .delete(authorize('BloodBank', 'Admin'), deleteInventory);

module.exports = router;