const { BloodRequest } = require('../models/BloodRequest');

/**
 * Priority weighting for the emergency queue.
 *
 * A request's priority is recomputed on every read rather than stored,
 * because wait time and deadline proximity change continuously — a
 * persisted score would be wrong the moment it was written.
 */
const URGENCY_WEIGHT = {
  critical: 100,
  urgent: 60,
  routine: 20
};

// Points accrued per hour spent waiting, so an old routine request
// eventually outranks a fresh one of the same urgency.
const WAIT_POINTS_PER_HOUR = 2;
const MAX_WAIT_POINTS = 80; // caps waiting so it cannot eclipse critical urgency

// Bonus as a hard deadline approaches
const DEADLINE_BONUS = { overdue: 50, within6h: 40, within24h: 25, within72h: 10 };

// Requests still short of blood are pushed above partially met ones
const UNMET_UNIT_POINTS = 5;

const ACTIVE_STATUSES = ['pending', 'matched', 'accepted'];

function deadlineBonus(requiredBy) {
  if (!requiredBy) return { points: 0, label: 'no deadline set' };

  const hoursLeft = (new Date(requiredBy).getTime() - Date.now()) / (1000 * 60 * 60);

  if (hoursLeft < 0) return { points: DEADLINE_BONUS.overdue, label: 'overdue' };
  if (hoursLeft <= 6) return { points: DEADLINE_BONUS.within6h, label: 'due within 6 hours' };
  if (hoursLeft <= 24) return { points: DEADLINE_BONUS.within24h, label: 'due within 24 hours' };
  if (hoursLeft <= 72) return { points: DEADLINE_BONUS.within72h, label: 'due within 3 days' };
  return { points: 0, label: 'deadline not imminent' };
}

/**
 * Scores one request, returning the total with its component breakdown
 * so the ordering is explainable rather than opaque.
 */
function calculatePriority(request) {
  const urgencyPoints = URGENCY_WEIGHT[request.urgency] ?? URGENCY_WEIGHT.routine;

  const hoursWaiting = request.createdAt
    ? Math.floor((Date.now() - new Date(request.createdAt).getTime()) / (1000 * 60 * 60))
    : 0;
  const waitPoints = Math.min(hoursWaiting * WAIT_POINTS_PER_HOUR, MAX_WAIT_POINTS);

  const deadline = deadlineBonus(request.requiredBy);

  const unitsRemaining = Math.max(request.unitsNeeded - request.unitsFulfilled, 0);
  const unmetPoints = unitsRemaining * UNMET_UNIT_POINTS;

  const total = urgencyPoints + waitPoints + deadline.points + unmetPoints;

  return {
    priorityScore: Math.round(total * 100) / 100,
    hoursWaiting,
    unitsRemaining,
    breakdown: {
      urgency: urgencyPoints,
      waiting: Math.round(waitPoints * 100) / 100,
      deadline: deadline.points,
      unmetUnits: unmetPoints
    },
    deadlineStatus: deadline.label,
    isOverdue: deadline.label === 'overdue'
  };
}

/**
 * Builds the live priority queue. Terminal requests are excluded —
 * a fulfilled or cancelled request has no place in an emergency queue.
 */
async function getPriorityQueue(options = {}) {
  const filter = { isActive: true, status: { $in: ACTIVE_STATUSES } };

  if (options.urgency) filter.urgency = options.urgency;
  if (options.bloodGroup) filter.bloodGroup = options.bloodGroup;
  if (options.status) filter.status = options.status;

  const requests = await BloodRequest.find(filter).populate(
    'requester',
    'name phone role'
  );

  const scored = requests.map((r) => {
    const priority = calculatePriority(r);
    return {
      requestId: r._id,
      patientName: r.patientName,
      bloodGroup: r.bloodGroup,
      urgency: r.urgency,
      status: r.status,
      hospitalName: r.hospitalName,
      area: r.location ? r.location.address : null,
      unitsNeeded: r.unitsNeeded,
      unitsFulfilled: r.unitsFulfilled,
      requiredBy: r.requiredBy,
      contactPhone: r.contactPhone,
      isSOS: r.isSOS,
      createdAt: r.createdAt,
      requesterName: r.requester ? r.requester.name : null,
      ...priority
    };
  });

  scored.sort((a, b) => b.priorityScore - a.priorityScore);

  const limit = Number(options.limit) || scored.length;
  const ranked = scored.slice(0, limit).map((r, i) => ({ position: i + 1, ...r }));

  return {
    weights: {
      urgency: URGENCY_WEIGHT,
      waitPointsPerHour: WAIT_POINTS_PER_HOUR,
      maxWaitPoints: MAX_WAIT_POINTS,
      deadlineBonus: DEADLINE_BONUS,
      unmetUnitPoints: UNMET_UNIT_POINTS
    },
    summary: {
      totalInQueue: scored.length,
      critical: scored.filter((r) => r.urgency === 'critical').length,
      urgent: scored.filter((r) => r.urgency === 'urgent').length,
      routine: scored.filter((r) => r.urgency === 'routine').length,
      overdue: scored.filter((r) => r.isOverdue).length,
      unitsOutstanding: scored.reduce((sum, r) => sum + r.unitsRemaining, 0)
    },
    queue: ranked
  };
}

/**
 * Returns a single request's priority alongside its position in the queue.
 */
async function getRequestPriority(requestId) {
  const request = await BloodRequest.findById(requestId);
  if (!request) {
    const err = new Error('Blood request not found.');
    err.statusCode = 404;
    throw err;
  }

  const priority = calculatePriority(request);
  const { queue } = await getPriorityQueue();
  const entry = queue.find((q) => String(q.requestId) === String(requestId));

  return {
    requestId: request._id,
    patientName: request.patientName,
    status: request.status,
    inQueue: Boolean(entry),
    position: entry ? entry.position : null,
    queueLength: queue.length,
    ...priority
  };
}

module.exports = {
  getPriorityQueue,
  getRequestPriority,
  calculatePriority,
  URGENCY_WEIGHT
};
