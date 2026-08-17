import api from './client';

export const donorApi = {
  list: (params) => api.get('/donors', { params }),
  getById: (id) => api.get(`/donors/${id}`),
  create: (payload) => api.post('/donors', payload),
  update: (id, payload) => api.put(`/donors/${id}`, payload),
  remove: (id) => api.delete(`/donors/${id}`),
  eligibility: (id) => api.get(`/donors/${id}/eligibility`),
  toggleAvailability: (id, isAvailable) =>
    api.patch(`/donors/${id}/availability`, { isAvailable })
};

export const donationApi = {
  create: (payload) => api.post('/donations', payload),
  historyFor: (donorId) => api.get(`/donations/donor/${donorId}`)
};

export const requestApi = {
  list: (params) => api.get('/requests', { params }),
  getById: (id) => api.get(`/requests/${id}`),
  create: (payload) => api.post('/requests', payload),
  remove: (id) => api.delete(`/requests/${id}`),
  matches: (id, params) => api.get(`/requests/${id}/matches`, { params }),
  runMatching: (id, payload = {}) => api.post(`/requests/${id}/matches`, payload),

  // Feature 9 — lifecycle
  timeline: (id) => api.get(`/requests/${id}/timeline`),
  transitions: () => api.get('/requests/lifecycle/transitions'),
  changeStatus: (id, status) => api.patch(`/requests/${id}/status`, { status }),
  respond: (id, donorId, decision, reason) =>
    api.post(`/requests/${id}/respond`, { donorId, decision, reason }),
  fulfil: (id, donorId, unitsDonated, notes) =>
    api.post(`/requests/${id}/fulfil`, { donorId, unitsDonated, notes })
};

export const inventoryApi = {
  list: (params) => api.get('/inventory', { params }),
  add: (payload) => api.post('/inventory', payload),
  consume: (id, units) => api.patch(`/inventory/${id}/consume`, { units }),
  remove: (id) => api.delete(`/inventory/${id}`),
  summary: (bankId) => api.get(`/inventory/bank/${bankId}/summary`),
  alerts: (bankId, warningDays) =>
    api.get(`/inventory/bank/${bankId}/alerts`, { params: { warningDays } })
};

export const campaignApi = {
  list: (params) => api.get('/campaigns', { params }),
  getById: (id) => api.get(`/campaigns/${id}`),
  create: (payload) => api.post('/campaigns', payload),
  remove: (id) => api.delete(`/campaigns/${id}`),
  register: (id, donorId) => api.post(`/campaigns/${id}/register`, { donorId }),
  registrations: (id) => api.get(`/campaigns/${id}/registrations`)
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

  shortageTrends: () =>
    api.get('/admin/shortage-trends'),

  donorRetention: () =>
    api.get('/admin/donor-retention'),

  pendingVerifications: () =>
    api.get('/admin/pending-verifications'),

  users: (params) =>
    api.get('/admin/users', { params }),

  verifyInstitution: (userId) =>
    api.patch(`/admin/verify/${userId}`),

  deactivateUser: (userId) =>
    api.patch(`/admin/users/${userId}/deactivate`)
};
export const assistantApi = {
  chat: (message, donorId, language) =>
    api.post('/assistant/chat', { message, donorId, language })
};