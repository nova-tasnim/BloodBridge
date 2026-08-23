const Inventory = require('../models/Inventory');
const {
  addStock,
  consumeStock,
  getStockSummary,
  getAlerts
} = require('../services/inventoryService');

// POST /api/inventory — add stock
exports.addInventory = async (req, res) => {
  const payload = { ...(req.body || {}) };

  // Authenticated identity resolution
  if (req.user?.role === 'BloodBank') {
    payload.bloodBank = req.user._id; // Enforce logged-in blood bank identity
  } else if (req.user?.role === 'Admin' && payload.bloodBank) {
    // Admin explicit target workflow
  } else if (!payload.bloodBank) {
    return res.status(400).json({ success: false, message: 'bloodBank is required' });
  }

  const item = await addStock(payload);
  res.status(201).json({ success: true, data: item });
};
// GET /api/inventory — list, optionally filtered
exports.getInventory = async (req, res) => {
  const filter = { isActive: true };
  if (req.user?.role === 'BloodBank') {
    filter.bloodBank = req.user._id;
  } else if (req.query.bloodBank) {
    filter.bloodBank = req.query.bloodBank;
  }
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

  if (req.user?.role === 'BloodBank' && item.bloodBank?._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Forbidden — not your inventory item' });
  }

  res.json({ success: true, data: item });
};

// PUT /api/inventory/:id
exports.updateInventory = async (req, res) => {
  const body = req.body || {};
  delete body.bloodBank;

  if (req.user?.role === 'BloodBank') {
    const existing = await Inventory.findById(req.params.id).select('bloodBank');
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    if (existing.bloodBank.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden — not your inventory item' });
    }
  }

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

  if (req.user?.role === 'BloodBank') {
    const existing = await Inventory.findById(req.params.id).select('bloodBank');
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    if (existing.bloodBank.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden — not your inventory item' });
    }
  }

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
  if (req.user?.role === 'BloodBank') {
    const existing = await Inventory.findById(req.params.id).select('bloodBank');
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    if (existing.bloodBank.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden — not your inventory item' });
    }
  }

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

// GET /api/inventory/bank/:bloodBankId/summary or /api/inventory/summary/me
exports.getSummary = async (req, res) => {
  let bankId = req.params.bloodBankId;

  // If blood bank is logged in or 'me' is requested, resolve automatically from req.user._id
  if (req.user?.role === 'BloodBank' || bankId === 'me') {
    bankId = req.user._id;
  }

  if (!bankId) {
    return res.status(400).json({ success: false, message: 'bloodBankId is required' });
  }

  const summary = await getStockSummary(bankId);
  res.json({ success: true, data: summary });
};

// GET /api/inventory/bank/:bloodBankId/alerts or /api/inventory/alerts/me
exports.getInventoryAlerts = async (req, res) => {
  let bankId = req.params.bloodBankId;

  // If blood bank is logged in or 'me' is requested, resolve automatically from req.user._id
  if (req.user?.role === 'BloodBank' || bankId === 'me') {
    bankId = req.user._id;
  }

  if (!bankId) {
    return res.status(400).json({ success: false, message: 'bloodBankId is required' });
  }

  const warningDays = parseInt(req.query.warningDays, 10) || 7;
  const alerts = await getAlerts(bankId, warningDays);
  res.json({ success: true, data: alerts });
};