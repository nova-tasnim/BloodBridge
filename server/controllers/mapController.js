const { BloodRequest } = require('../models/BloodRequest');

// GET /api/map/nearby
// Returns active, non-fulfilled blood requests within a radius.
exports.getNearbyActiveRequests = async (req, res) => {
  try {
    const { latitude, longitude, radiusKm = 20 } = req.query;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'latitude and longitude are required'
      });
    }

    const lat = Number(latitude);
    const lng = Number(longitude);
    const radius = Number(radiusKm);

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({
        success: false,
        message: 'latitude must be between -90 and 90'
      });
    }

    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        message: 'longitude must be between -180 and 180'
      });
    }

    if (!Number.isFinite(radius) || radius <= 0) {
      return res.status(400).json({
        success: false,
        message: 'radiusKm must be greater than 0'
      });
    }

    const radiusInMeters = radius * 1000;

    const requests = await BloodRequest.find({
      isActive: true,
      status: { $nin: ['fulfilled', 'cancelled', 'expired'] },
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: radiusInMeters
        }
      }
    })
      .select(
        'patientName bloodGroup unitsNeeded unitsFulfilled urgency hospitalName location requiredBy status isSOS contactPhone createdAt'
      )
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: requests.length,
      radiusKm: radius,
      data: requests
    });
  } catch (err) {
    console.error('getNearbyActiveRequests:', err);

    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


// GET /api/map/all-active
// Fallback when browser geolocation is unavailable/denied.
exports.getAllActiveRequests = async (req, res) => {
  try {
    const requests = await BloodRequest.find({
      isActive: true,
      status: { $nin: ['fulfilled', 'cancelled', 'expired'] }
    })
      .select(
        'patientName bloodGroup unitsNeeded unitsFulfilled urgency hospitalName location requiredBy status isSOS contactPhone createdAt'
      )
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (err) {
    console.error('getAllActiveRequests:', err);

    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};