const { BloodRequest } = require('../models/BloodRequest');
const { DonorResponse } = require('../models/DonorResponse');
const Donor = require('../models/Donor');
const { recordDonation } = require('./donationService');

/**
 * The request state machine.
 *
 * Each key is a current state; the array lists the only states that may
 * follow it. Any transition not present here is rejected. Terminal states
 * map to an empty array and cannot be left.
 */
const TRANSITIONS = {
  pending:   ['matched', 'cancelled', 'expired'],
  matched:   ['accepted', 'pending', 'cancelled', 'expired'],
  accepted:  ['fulfilled', 'matched', 'cancelled'],
  fulfilled: [],
  cancelled: [],
  expired:   ['pending']
};

const TERMINAL_STATES = ['fulfilled', 'cancelled'];

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

function canTransition(from, to) {
  const allowed = TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

function getAllowedTransitions(from) {
  return TRANSITIONS[from] ? [...TRANSITIONS[from]] : [];
}

/**
 * Moves a request to a new status, rejecting any transition the
 * state machine does not permit.
 */
async function transitionStatus(requestId, nextStatus, options = {}) {
  const request = await BloodRequest.findById(requestId);
  if (!request) throw notFound('Blood request not found.');

  const current = request.status;

  if (current === nextStatus) {
    throw badRequest(`Request is already "${current}".`);
  }

  if (TERMINAL_STATES.includes(current)) {
    throw badRequest(
      `"${current}" is a terminal state; the request can no longer be changed.`
    );
  }

  if (!canTransition(current, nextStatus)) {
    throw badRequest(
      `Cannot move from "${current}" to "${nextStatus}". ` +
      `Allowed from "${current}": ${getAllowedTransitions(current).join(', ') || 'none'}.`
    );
  }

  request.status = nextStatus;

  if (nextStatus === 'cancelled') {
    request.isActive = false;
  }

  await request.save();

  return {
    requestId: request._id,
    patientName: request.patientName,
    previousStatus: current,
    currentStatus: request.status,
    allowedNext: getAllowedTransitions(request.status)
  };
}

/**
 * Creates pending response records for every matched donor.
 * Called after the matching engine has attached donors to a request.
 */
async function inviteMatchedDonors(requestId, matches = []) {
  const request = await BloodRequest.findById(requestId);
  if (!request) throw notFound('Blood request not found.');

  const created = [];
  for (const match of matches) {
    try {
      const response = await DonorResponse.create({
        bloodRequest: requestId,
        donor: match.donorId,
        matchScore: match.score || 0
      });
      created.push(response);
    } catch (err) {
      // 11000 means this donor was already invited — skip rather than fail
      if (err.code !== 11000) throw err;
    }
  }

  return created;
}

/**
 * Records a donor's accept or decline against a request.
 * An acceptance advances the request from "matched" to "accepted".
 */
async function respondToRequest(requestId, donorId, decision, extra = {}) {
  if (!['accepted', 'declined'].includes(decision)) {
    throw badRequest('decision must be either "accepted" or "declined".');
  }

  const request = await BloodRequest.findById(requestId);
  if (!request) throw notFound('Blood request not found.');

  if (TERMINAL_STATES.includes(request.status)) {
    throw badRequest(`This request is ${request.status} and no longer accepts responses.`);
  }

  const donor = await Donor.findById(donorId);
  if (!donor) throw notFound('Donor not found.');

  let response = await DonorResponse.findOne({ bloodRequest: requestId, donor: donorId });

  if (!response) {
    // Donor responding without a prior invitation (e.g. from a public listing)
    response = new DonorResponse({ bloodRequest: requestId, donor: donorId });
  }

  if (response.status !== 'pending') {
    throw badRequest(`You have already ${response.status} this request.`);
  }

  response.status = decision;
  response.respondedAt = new Date();
  if (decision === 'declined') {
    response.declineReason = extra.reason || '';
  }
  await response.save();

  let statusChange = null;

  if (decision === 'accepted' && request.status === 'matched') {
    statusChange = await transitionStatus(requestId, 'accepted');
  }

  return {
    donorName: donor.name,
    bloodGroup: donor.bloodGroup,
    decision,
    respondedAt: response.respondedAt,
    requestStatus: statusChange ? statusChange.currentStatus : request.status,
    statusChanged: Boolean(statusChange)
  };
}

/**
 * Marks a request fulfilled by a specific donor.
 *
 * This is the point where the lifecycle writes back into donation history:
 * recordDonation() updates the donor's lastDonationDate and totalDonations,
 * which the eligibility engine then reads. The request only reaches
 * "fulfilled" once the required units have been met.
 */
async function fulfilRequest(requestId, donorId, options = {}) {
  const request = await BloodRequest.findById(requestId);
  if (!request) throw notFound('Blood request not found.');

  if (TERMINAL_STATES.includes(request.status)) {
    throw badRequest(`Request is already ${request.status}.`);
  }

  if (!['accepted', 'matched'].includes(request.status)) {
    throw badRequest(
      `A donation can only be recorded once a donor has been matched or has accepted. ` +
      `Current status: "${request.status}".`
    );
  }

  const units = Number(options.unitsDonated) || 1;

  const donation = await recordDonation({
    donorId,
    bloodRequestId: requestId,
    bloodBankId: options.bloodBankId || null,
    unitsDonated: units,
    locationName: options.locationName || request.hospitalName || '',
    notes: options.notes || `Donation against request for ${request.patientName}`
  });

  request.unitsFulfilled += units;

  const response = await DonorResponse.findOne({ bloodRequest: requestId, donor: donorId });
  if (response) {
    response.status = 'completed';
    await response.save();
  }

  const fullyMet = request.unitsFulfilled >= request.unitsNeeded;

  if (fullyMet) {
    request.status = 'fulfilled';
  }
  await request.save();

  return {
    donationId: donation._id,
    unitsDonated: units,
    unitsFulfilled: request.unitsFulfilled,
    unitsNeeded: request.unitsNeeded,
    unitsRemaining: Math.max(request.unitsNeeded - request.unitsFulfilled, 0),
    requestStatus: request.status,
    fullyFulfilled: fullyMet
  };
}

async function getResponses(requestId) {
  return DonorResponse.find({ bloodRequest: requestId })
    .populate('donor', 'name phone bloodGroup totalDonations isAvailable')
    .sort({ matchScore: -1 });
}

async function getRequestTimeline(requestId) {
  const request = await BloodRequest.findById(requestId);
  if (!request) throw notFound('Blood request not found.');

  const responses = await getResponses(requestId);

  return {
    requestId: request._id,
    patientName: request.patientName,
    currentStatus: request.status,
    allowedNext: getAllowedTransitions(request.status),
    isTerminal: TERMINAL_STATES.includes(request.status),
    unitsNeeded: request.unitsNeeded,
    unitsFulfilled: request.unitsFulfilled,
    unitsRemaining: request.unitsRemaining,
    hoursWaiting: request.hoursWaiting,
    createdAt: request.createdAt,
    responseSummary: {
      total: responses.length,
      pending: responses.filter((r) => r.status === 'pending').length,
      accepted: responses.filter((r) => r.status === 'accepted').length,
      declined: responses.filter((r) => r.status === 'declined').length,
      completed: responses.filter((r) => r.status === 'completed').length
    },
    responses
  };
}

module.exports = {
  transitionStatus,
  respondToRequest,
  fulfilRequest,
  inviteMatchedDonors,
  getResponses,
  getRequestTimeline,
  canTransition,
  getAllowedTransitions,
  TRANSITIONS,
  TERMINAL_STATES
};