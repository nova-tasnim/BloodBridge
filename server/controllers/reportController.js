const { BloodRequest } = require('../models/BloodRequest');
// Get request history for a specific hospital/blood bank
exports.getRequestHistory = async (req, res) => {
  try {
    const { requesterId } = req.params;

    const requests = await BloodRequest.find({ requester: requesterId })
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get fulfillment statistics (overall or filtered by requester)
exports.getFulfillmentStats = async (req, res) => {
  try {
    const { requesterId } = req.query;
    const filter = requesterId ? { requesterId } : {};

    const totalRequests = await BloodRequest.countDocuments(filter);
    const fulfilledRequests = await BloodRequest.countDocuments({ ...filter, status: 'fulfilled' });
    const pendingRequests = await BloodRequest.countDocuments({ ...filter, status: 'pending' });

    const fulfillmentRate = totalRequests > 0
      ? ((fulfilledRequests / totalRequests) * 100).toFixed(2)
      : 0;

    // Breakdown by blood group
    const byBloodGroup = await BloodRequest.aggregate([
      { $match: filter },
      { $group: { _id: '$bloodGroup', count: { $sum: 1 } } }
    ]);

    res.json({
      totalRequests,
      fulfilledRequests,
      pendingRequests,
      fulfillmentRate: `${fulfillmentRate}%`,
      byBloodGroup
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};