const { BloodRequest, URGENCY_LEVELS } = require('../models/BloodRequest');
const { BLOOD_GROUPS } = require('../config/constants');

/**
 * Validates the payload for a new blood request.
 * Returns an array of error messages — empty means valid.
 */
function validateRequestPayload(payload) {
  const errors = [];

  if (!payload.requester) errors.push('requester is required.');
  if (!payload.patientName) errors.push('patientName is required.');

  if (!payload.bloodGroup) {
    errors.push('bloodGroup is required.');
  } else if (!BLOOD_GROUPS.includes(payload.bloodGroup)) {
    errors.push(`bloodGroup must be one of: ${BLOOD_GROUPS.join(', ')}.`);
  }

  if (payload.unitsNeeded == null) {
    errors.push('unitsNeeded is required.');
  } else if (Number(payload.unitsNeeded) < 1) {
    errors.push('unitsNeeded must be at least 1.');
  }

  if (payload.urgency && !URGENCY_LEVELS.includes(payload.urgency)) {
    errors.push(`urgency must be one of: ${URGENCY_LEVELS.join(', ')}.`);
  }

  const coords = payload.location && payload.location.coordinates;
  if (!coords || !Array.isArray(coords) || coords.length !== 2) {
    errors.push('location.coordinates must be [longitude, latitude].');
  } else {
    const [lng, lat] = coords.map(Number);
    if (lng < -180 || lng > 180) errors.push('Longitude must be between -180 and 180.');
    if (lat < -90 || lat > 90) errors.push('Latitude must be between -90 and 90.');
  }

  if (payload.requiredBy && new Date(payload.requiredBy) < new Date()) {
    errors.push('requiredBy cannot be in the past.');
  }

  return errors;
}

async function createRequest(payload) {
  const errors = validateRequestPayload(payload);
  if (errors.length) {
    const err = new Error('Validation failed');
    err.statusCode = 400;
    err.details = errors;
    throw err;
  }

  return BloodRequest.create({
    requester: payload.requester,
    patientName: payload.patientName,
    bloodGroup: payload.bloodGroup,
    unitsNeeded: Number(payload.unitsNeeded),
    urgency: payload.urgency || 'routine',
    hospitalName: payload.hospitalName || '',
    location: {
      type: 'Point',
      coordinates: payload.location.coordinates.map(Number),
      address: payload.location.address || ''
    },
    requiredBy: payload.requiredBy || null,
    contactPhone: payload.contactPhone || '',
    notes: payload.notes || '',
    isSOS: payload.isSOS || false
  });
}

/**
 * Builds a query from filter parameters. Mirrors the donor search
 * approach so both listing endpoints behave consistently.
 */
function buildRequestFilter(params) {
  const filter = { isActive: true };

  if (params.status) filter.status = params.status;
  if (params.bloodGroup) filter.bloodGroup = params.bloodGroup;
  if (params.urgency) filter.urgency = params.urgency;
  if (params.requester) filter.requester = params.requester;
  if (params.isSOS !== undefined) filter.isSOS = params.isSOS === 'true';

  if (params.lat && params.lng) {
    const radiusKm = Number(params.radius) || 10;
    filter.location = {
      $geoWithin: {
        $centerSphere: [[Number(params.lng), Number(params.lat)], radiusKm / 6378.1]
      }
    };
  }

  return filter;
}

async function listRequests(params) {
  const page = Math.max(parseInt(params.page, 10) || 1, 1);
  const limit = Math.min(parseInt(params.limit, 10) || 20, 100);
  const filter = buildRequestFilter(params);

  const [requests, total] = await Promise.all([
    BloodRequest.find(filter)
      .populate('requester', 'name email phone role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    BloodRequest.countDocuments(filter)
  ]);

  return {
    results: requests,
    total,
    page,
    pages: Math.ceil(total / limit) || 0,
    appliedFilters: filter
  };
}

async function getRequestById(id) {
  return BloodRequest.findById(id)
    .populate('requester', 'name email phone role')
    .populate('matchedDonors', 'name bloodGroup phone isAvailable');
}

module.exports = {
  createRequest,
  listRequests,
  getRequestById,
  buildRequestFilter,
  validateRequestPayload
};