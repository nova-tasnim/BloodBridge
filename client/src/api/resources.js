import api from './client';

export const donorApi = {
  list: (params) => api.get('/donors', { params }),
  getById: (id) => api.get(`/donors/${id}`),
  create: (payload) => api.post('/donors', payload),
  // Phase 2B: Upgrade authenticated user/patient to have a donor profile
  becomeDonor: (payload) => api.post('/donors/become-donor', payload),
  update: (id, payload) => api.put(`/donors/${id}`, payload),
  remove: (id) => api.delete(`/donors/${id}`),
  eligibility: (id) => api.get(`/donors/${id}/eligibility`),
  toggleAvailability: (id, isAvailable) =>
    api.patch(`/donors/${id}/availability`, { isAvailable })
};
export const donationsApi = {
  /*
   * Submit pending donation.
   */
  create: (
    data
  ) =>
    api.post(
      '/donations',
      data
    ),

  /*
   * Own history:
   * pending + approved + rejected.
   */
  getMyHistory: () =>
    api.get(
      '/donations/me'
    ),

  /*
   * Campaigns this donor registered for.
   */
  myCampaigns: () =>
    api.get(
      '/donations/my-campaigns'
    ),

  /*
   * Another donor:
   * approved history only.
   */
  getDonorHistory: (
    donorId
  ) =>
    api.get(
      `/donations/donor/${donorId}`
    ),

  getById: (
    id
  ) =>
    api.get(
      `/donations/${id}`
    ),

  /*
   * Admin approval queue.
   */
  pending: () =>
    api.get(
      '/donations/pending'
    ),

  approve: (
    id
  ) =>
    api.patch(
      `/donations/${id}/approve`
    ),

  reject: (
    id,
    reason
  ) =>
    api.patch(
      `/donations/${id}/reject`,
      {
        reason
      }
    )
};
export const requestApi = {
  list: (params) => api.get('/requests', { params }),
  getById: (id) => api.get(`/requests/${id}`),
  // Authenticated user's created requests
  myRequests: (params) => api.get('/requests/my', { params }),
  create: (payload) => api.post('/requests', payload),
  remove: (id) => api.delete(`/requests/${id}`),
  matches: (id, params) => api.get(`/requests/${id}/matches`, { params }),/* feature 2*/ 
  runMatching: (id, payload = {}) => api.post(`/requests/${id}/matches`, payload),

  // Feature 9 — lifecycle
  timeline: (id) => api.get(`/requests/${id}/timeline`),
  transitions: () => api.get('/requests/lifecycle/transitions'),
  changeStatus: (id, status) => api.patch(`/requests/${id}/status`, { status }),
  // Phase 2B: accepts payload object with location sharing support or positional arguments
  respond: (id, decisionOrPayload, reason, donorId) => {
    if (typeof decisionOrPayload === 'object' && decisionOrPayload !== null) {
      return api.post(`/requests/${id}/respond`, decisionOrPayload);
    }
    if (decisionOrPayload === 'accepted' || decisionOrPayload === 'declined') {
      return api.post(`/requests/${id}/respond`, {
        decision: decisionOrPayload,
        reason,
        ...(donorId ? { donorId } : {})
      });
    }
    // Backward compatibility if legacy signature (id, donorId, decision, reason) is called
    return api.post(`/requests/${id}/respond`, {
      donorId: decisionOrPayload,
      decision: reason,
      ...(donorId ? { reason: donorId } : {})
    });
  },
  // Phase 2B: flexible fulfillment signature accepting payload object or positional parameters
  fulfil: (id, donorIdOrPayload, unitsDonated = 1, notes = '') => {
    if (typeof donorIdOrPayload === 'object' && donorIdOrPayload !== null) {
      return api.post(`/requests/${id}/fulfil`, donorIdOrPayload);
    }
    return api.post(`/requests/${id}/fulfil`, {
      donorId: donorIdOrPayload,
      unitsDonated,
      notes
    });
  }
};

export const inventoryApi = {
  list: (params) => api.get('/inventory', { params }),
  banks: (params) =>
  api.get(
    '/inventory/banks',
    { params }
  ),
  
  add: (payload) => api.post('/inventory', payload),
  consume: (id, units) => api.patch(`/inventory/${id}/consume`, { units }),
  remove: (id) => api.delete(`/inventory/${id}`),
  // Auto-scopes to /me when bankId is not provided or 'me'
  summary: (bankId) =>
    api.get(bankId && bankId !== 'me' ? `/inventory/bank/${bankId}/summary` : '/inventory/summary/me'),
  alerts: (bankId, warningDays) => {
    const isCustomBank = bankId && bankId !== 'me';
    const url = isCustomBank ? `/inventory/bank/${bankId}/alerts` : '/inventory/alerts/me';
    const params = typeof warningDays === 'object' ? warningDays : { warningDays };
    return api.get(url, { params });
  }
};

export const campaignApi = {
  list: (params) =>
    api.get(
      '/campaigns',
      {
        params
      }
    ),

  getById: (id) =>
    api.get(
      `/campaigns/${id}`
    ),

  create: (payload) =>
    api.post(
      '/campaigns',
      payload
    ),

  update: (
    id,
    payload
  ) =>
    api.put(
      `/campaigns/${id}`,
      payload
    ),

  remove: (id) =>
    api.delete(
      `/campaigns/${id}`
    ),

  /*
   * Backend derives donor from authenticated identity.
   *
   * No donorId should normally be supplied.
   */
  register: (
    id
  ) =>
    api.post(
      `/campaigns/${id}/register`,
      {}
    ),

  registrations: (
    id
  ) =>
    api.get(
      `/campaigns/${id}/registrations`
    ),

  updateAttendance: (
    registrationId,
    payload
  ) =>
    api.patch(
      `/campaigns/registrations/${registrationId}`,
      payload
    )
};

export const compatibilityApi = {
  matrix: () => api.get('/compatibility'),
  forGroup: (group) => api.get(`/compatibility/${encodeURIComponent(group)}`),
  check: (donor, recipient) =>
    api.get('/compatibility/check', { params: { donor, recipient } })
};

export const queueApi = {
  get: (params) => api.get('/queue', { params }),
  critical: () => api.get('/queue/critical'),
  weights: () => api.get('/queue/weights'),
  forRequest: (id) => api.get(`/queue/request/${id}`)
};

export const adminApi = {
  overview: () => api.get('/admin/overview'),
  shortageTrends: () => api.get('/admin/shortage-trends'),
  donorRetention: () => api.get('/admin/donor-retention'),
  pendingVerifications: () => api.get('/admin/pending-verifications'),
  users: (params) => api.get('/admin/users', { params }),
  verifyInstitution: (userId) => api.patch(`/admin/verify/${userId}`),
  deactivateUser: (userId) => api.patch(`/admin/users/${userId}/deactivate`)
};

export const mapApi = {
  nearby: (params) => api.get('/map/nearby', { params }),
  allActive: () => api.get('/map/all-active')
};

export const reportApi = {
  overview: () => api.get('/reports/overview'),
  history: (requesterId) => api.get(`/reports/history/${requesterId}`),
  fulfillmentStats: (params) => api.get('/reports/fulfillment-stats', { params })
};

export const assistantApi = {
  chat: (payload) => api.post('/assistant/chat', payload)
};
export const authApi = {
  register: (payload) => api.post('/auth/register', payload),
  login: (payload) => api.post('/auth/login', payload),
  me: () => api.get('/auth/me')
};

export const notificationApi = {
  myNotifications: () => api.get('/notifications/me'),
  markRead: (notificationId) =>
    api.patch(`/notifications/${notificationId}/read`),
  markAllRead: () => api.patch('/notifications/read-all')
};

export const feedbackApi = {
  /*
   * Submit feedback.
   */
  create: (payload) =>
    api.post(
      '/feedback',
      payload
    ),

  /*
   * Feedback attached to a request.
   */
  forRequest: (
    requestId
  ) =>
    api.get(
      `/feedback/target/${requestId}`
    ),

  /*
   * Feedback attached to a donation.
   */
  forDonation: (
    donationId
  ) =>
    api.get(
      `/feedback/target/${donationId}`
    ),

  /*
   * Average rating.
   */
  average: (
    targetId
  ) =>
    api.get(
      `/feedback/target/${targetId}/average`
    ),

  /*
   * Admin moderation feed.
   */
  recent: (
    params
  ) =>
    api.get(
      '/feedback/recent',
      {
        params
      }
    ),

  /*
   * Admin moderation.
   */
  remove: (
    feedbackId
  ) =>
    api.delete(
      `/feedback/${feedbackId}`
    )
};
export const translationApi = {
  /*
   * Public runtime resources.
   */
  resources: () =>
    api.get(
      '/translations/resources'
    ),

  /*
   * Admin management.
   */
  list: (params) =>
    api.get(
      '/translations',
      {
        params
      }
    ),

  create: (payload) =>
    api.post(
      '/translations',
      payload
    ),

  update: (
    id,
    payload
  ) =>
    api.put(
      `/translations/${id}`,
      payload
    ),

  remove: (id) =>
    api.delete(
      `/translations/${id}`
    )
};
export const badgeApi = {
  leaderboard: () =>
    api.get(
      '/badges/leaderboard'
    ),

  donor: (
    donorId
  ) =>
    api.get(
      `/badges/donor/${donorId}`
    ),

  refresh: (
    donorId
  ) =>
    api.post(
      `/badges/donor/${donorId}/check`
    )
};
export const reminderApi = {
  /*
   * Calculate eligibility from
   * real eligibility engine.
   */
  nextEligible: (
    donorId
  ) =>
    api.get(
      `/reminders/donor/${donorId}/next-eligible`
    ),

  /*
   * Read saved MongoDB Reminder.
   */
  current: (
    donorId
  ) =>
    api.get(
      `/reminders/donor/${donorId}`
    ),

  /*
   * Create or refresh Reminder.
   */
  create: (
    donorId
  ) =>
    api.post(
      `/reminders/donor/${donorId}`
    ),

  /*
   * Staff due reminders.
   */
  due: () =>
    api.get(
      '/reminders/due'
    ),

  /*
   * Send reminder.
   */
  markSent: (
    reminderId
  ) =>
    api.patch(
      `/reminders/${reminderId}/sent`
    )
};