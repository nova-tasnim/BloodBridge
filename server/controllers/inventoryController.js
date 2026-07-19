const Inventory = require('../models/Inventory');
const {
  addStock,
  consumeStock,
  getStockSummary,
  getAlerts
} = require('../services/inventoryService');

// POST /api/inventory — add stock
exports.addInventory = async (req, res) => {
  const item = await addStock(req.body || {});
  res.status(201).json({ success: true, data: item });
};

// GET /api/inventory — list, optionally filtered
exports.getInventory = async (req, res) => {
  const filter = { isActive: true };
  if (req.query.bloodBank) filter.bloodBank = req.query.bloodBank;
  if (req.query.bloodGroup) filter.bloodGroup = req.query.bloodGroup;

  const items = await Inventory.find(filter)
    .populate('bloodBank', 'name email phone')
    .sort({ expiryDate: 1 });

  res.json({ success: true, count: items.length, data: items });
};

// GET /api/inventory/:id
exports.getInventoryById = async (req, res) => {
  const item = await Inventory.findById(req.params.id).populate(
    'bloodBank',
    'name email phone'
  );
  if (!item) {
    return res.status(404).json({ success: false, message: 'Inventory item not found' });
  }
  res.json({ success: true, data: item });
};

// PUT /api/inventory/:id
exports.updateInventory = async (req, res) => {
  const body = req.body || {};
  delete body.bloodBank;

  const item = await Inventory.findByIdAndUpdate(req.params.id, body, {
    new: true,
    runValidators: true
  });
  if (!item) {
    return res.status(404).json({ success: false, message: 'Inventory item not found' });
  }
  res.json({ success: true, data: item });
};

// PATCH /api/inventory/:id/consume — issue units
exports.consumeInventory = async (req, res) => {
  const body = req.body || {};
  const item = await consumeStock(req.params.id, body.units);

  res.json({
    success: true,
    message: `${body.units} unit(s) issued`,
    data: {
      inventoryId: item._id,
      bloodGroup: item.bloodGroup,
      unitsAvailable: item.unitsAvailable,
      isLowStock: item.isLowStock
    }
  });
};

// DELETE /api/inventory/:id — soft delete
exports.deleteInventory = async (req, res) => {
  const item = await Inventory.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );
  if (!item) {
    return res.status(404).json({ success: false, message: 'Inventory item not found' });
  }
  res.json({ success: true, message: 'Inventory item removed' });
};

// GET /api/inventory/bank/:bloodBankId/summary
exports.getSummary = async (req, res) => {
  const summary = await getStockSummary(req.params.bloodBankId);
  res.json({ success: true, data: summary });
};

// GET /api/inventory/bank/:bloodBankId/alerts — the low-stock feature
exports.getInventoryAlerts = async (req, res) => {
  const warningDays = parseInt(req.query.warningDays, 10) || 7;
  const alerts = await getAlerts(req.params.bloodBankId, warningDays);
  res.json({ success: true, data: alerts });
};