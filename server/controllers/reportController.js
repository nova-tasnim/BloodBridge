const { BloodRequest } = require('../models/BloodRequest');
const { User } = require('../models/User');

// Platform overview for authenticated users (LiveStatsBar)
exports.getPlatformOverview = async (req, res) => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      totalDonors,
      totalPatients,
      totalHospitals,
      totalBloodBanks,
      totalRequestsAllTime,
      totalRequestsThisMonth,
      fulfilledRequests
    ] = await Promise.all([
      User.countDocuments({ role: 'Donor', isActive: true }),
      User.countDocuments({ role: 'Patient', isActive: true }),
      User.countDocuments({ role: 'Hospital', isActive: true }),
      User.countDocuments({ role: 'BloodBank', isActive: true }),
      BloodRequest.countDocuments({ isActive: true }),
      BloodRequest.countDocuments({ isActive: true, createdAt: { $gte: startOfMonth } }),
      BloodRequest.countDocuments({ status: 'fulfilled' })
    ]);

    const fulfillmentRate = totalRequestsAllTime > 0
      ? ((fulfilledRequests / totalRequestsAllTime) * 100).toFixed(2)
      : 0;

    res.json({
      success: true,
      data: {
        totalDonors,
        totalPatients,
        totalHospitals,
        totalBloodBanks,
        totalRequestsAllTime,
        totalRequestsThisMonth,
        fulfillmentRate: `${fulfillmentRate}%`
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get request history for a specific hospital/blood bank
exports.getRequestHistory = async (req, res) => {
  try {
    const { requesterId } = req.params;

    const requests = await BloodRequest.find({ requester: requesterId })
      .sort({ createdAt: -1 });

    res.json({ success: true, data: requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get fulfillment statistics (overall or filtered by requester)
exports.getFulfillmentStats = async (req, res) => {
  try {
    const { requesterId } = req.query;
    const filter = { isActive: true };
    if (requesterId) filter.requester = requesterId;

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
      success: true,
      data: {
        totalRequests,
        fulfilledRequests,
        pendingRequests,
        fulfillmentRate: `${fulfillmentRate}%`,
        byBloodGroup
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};