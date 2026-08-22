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

router.get('/bank/:bloodBankId/summary', ownerOrRoles('bloodBankId', 'Hospital', 'Admin'), getSummary);
router.get('/bank/:bloodBankId/alerts', ownerOrRoles('bloodBankId', 'Admin'), getInventoryAlerts);

router.route('/')
  .post(authorize('BloodBank', 'Admin'), addInventory)
  .get(getInventory);

router.patch('/:id/consume', authorize('BloodBank', 'Hospital', 'Admin'), consumeInventory);

router.route('/:id')
  .get(getInventoryById)
  .put(authorize('BloodBank', 'Admin'), updateInventory)
  .delete(authorize('BloodBank', 'Admin'), deleteInventory);

module.exports = router;