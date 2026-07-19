const Inventory = require('../models/Inventory');
const { BLOOD_GROUPS } = require('../config/constants');

const DEFAULT_EXPIRY_WARNING_DAYS = 7;

/**
 * Adds units to inventory. If a matching active batch exists for the
 * same blood bank, group and batch number, its units are incremented
 * rather than creating a duplicate line.
 */
async function addStock(payload) {
  const { bloodBank, bloodGroup, unitsAvailable, expiryDate } = payload;

  if (!bloodBank) throw badRequest('bloodBank is required.');
  if (!BLOOD_GROUPS.includes(bloodGroup)) {
    throw badRequest(`bloodGroup must be one of: ${BLOOD_GROUPS.join(', ')}.`);
  }
  if (unitsAvailable == null || Number(unitsAvailable) < 0) {
    throw badRequest('unitsAvailable must be zero or greater.');
  }
  if (!expiryDate) throw badRequest('expiryDate is required.');

  const existing = await Inventory.findOne({
    bloodBank,
    bloodGroup,
    batchNumber: payload.batchNumber || '',
    isActive: true
  });

  if (existing) {
    existing.unitsAvailable += Number(unitsAvailable);
    if (payload.lowStockThreshold != null) {
      existing.lowStockThreshold = Number(payload.lowStockThreshold);
    }
    await existing.save();
    return existing;
  }

  return Inventory.create({
    bloodBank,
    bloodGroup,
    unitsAvailable: Number(unitsAvailable),
    lowStockThreshold: payload.lowStockThreshold != null
      ? Number(payload.lowStockThreshold)
      : 10,
    expiryDate,
    batchNumber: payload.batchNumber || '',
    storageLocation: payload.storageLocation || ''
  });
}

/**
 * Removes units from a specific inventory line (e.g. when blood is issued).
 */
async function consumeStock(inventoryId, units) {
  const item = await Inventory.findById(inventoryId);
  if (!item) throw notFound('Inventory item not found.');

  const amount = Number(units);
  if (!amount || amount <= 0) throw badRequest('units must be greater than zero.');
  if (amount > item.unitsAvailable) {
    throw badRequest(
      `Cannot issue ${amount} unit(s); only ${item.unitsAvailable} available.`
    );
  }

  item.unitsAvailable -= amount;
  await item.save();
  return item;
}

/**
 * Aggregates total units per blood group for one blood bank,
 * flagging any group that has fallen below its threshold.
 */
async function getStockSummary(bloodBankId) {
  const items = await Inventory.find({
    bloodBank: bloodBankId,
    isActive: true
  });

  const summary = {};
  for (const group of BLOOD_GROUPS) {
    summary[group] = { totalUnits: 0, threshold: 10, isLowStock: true, batches: 0 };
  }

  for (const item of items) {
    if (item.isExpired) continue; // expired units do not count as available
    const entry = summary[item.bloodGroup];
    entry.totalUnits += item.unitsAvailable;
    entry.threshold = item.lowStockThreshold;
    entry.batches += 1;
  }

  for (const group of BLOOD_GROUPS) {
    summary[group].isLowStock = summary[group].totalUnits < summary[group].threshold;
  }

  return summary;
}

/**
 * Produces the alert payload: groups below threshold, plus batches
 * expiring within the warning window, plus already-expired batches.
 */
async function getAlerts(bloodBankId, warningDays = DEFAULT_EXPIRY_WARNING_DAYS) {
  const [summary, items] = await Promise.all([
    getStockSummary(bloodBankId),
    Inventory.find({ bloodBank: bloodBankId, isActive: true })
  ]);

  const lowStock = Object.entries(summary)
    .filter(([, v]) => v.isLowStock)
    .map(([bloodGroup, v]) => ({
      bloodGroup,
      totalUnits: v.totalUnits,
      threshold: v.threshold,
      shortfall: v.threshold - v.totalUnits
    }));

  const expiringSoon = items
    .filter((i) => !i.isExpired && i.daysUntilExpiry <= warningDays)
    .map((i) => ({
      inventoryId: i._id,
      bloodGroup: i.bloodGroup,
      unitsAvailable: i.unitsAvailable,
      batchNumber: i.batchNumber,
      expiryDate: i.expiryDate,
      daysUntilExpiry: i.daysUntilExpiry
    }));

  const expired = items
    .filter((i) => i.isExpired)
    .map((i) => ({
      inventoryId: i._id,
      bloodGroup: i.bloodGroup,
      unitsAvailable: i.unitsAvailable,
      batchNumber: i.batchNumber,
      expiryDate: i.expiryDate
    }));

  return {
    alertCount: lowStock.length + expiringSoon.length + expired.length,
    lowStock,
    expiringSoon,
    expired
  };
}

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

function notFound(message) {
  const err = new Error(message);
  err.statusCode = 404;
  return err;
}

module.exports = {
  addStock,
  consumeStock,
  getStockSummary,
  getAlerts
};