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

// Specific routes before parameterised ones
router.get('/bank/:bloodBankId/summary', getSummary);
router.get('/bank/:bloodBankId/alerts', getInventoryAlerts);

router.route('/').post(addInventory).get(getInventory);
router.patch('/:id/consume', consumeInventory);
router
  .route('/:id')
  .get(getInventoryById)
  .put(updateInventory)
  .delete(deleteInventory);

module.exports = router;