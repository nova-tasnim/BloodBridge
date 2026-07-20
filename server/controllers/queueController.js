const {
  getPriorityQueue,
  getRequestPriority,
  URGENCY_WEIGHT
} = require('../services/prioritizationService');

// GET /api/queue — the live emergency queue
exports.getQueue = async (req, res) => {
  const result = await getPriorityQueue(req.query);
  res.json({ success: true, count: result.queue.length, data: result });
};

// GET /api/queue/critical — critical cases only
exports.getCriticalQueue = async (req, res) => {
  const result = await getPriorityQueue({ ...req.query, urgency: 'critical' });
  res.json({ success: true, count: result.queue.length, data: result });
};

// GET /api/queue/weights — the scoring model, exposed
exports.getWeights = async (req, res) => {
  res.json({
    success: true,
    data: {
      urgencyWeights: URGENCY_WEIGHT,
      description:
        'Priority is recomputed on every read from urgency, hours waited, ' +
        'deadline proximity, and units still outstanding. Wait points are ' +
        'capped so that elapsed time can never outrank a critical case.'
    }
  });
};

// GET /api/queue/request/:id — one request's priority and queue position
exports.getSinglePriority = async (req, res) => {
  const result = await getRequestPriority(req.params.id);
  res.json({ success: true, data: result });
};