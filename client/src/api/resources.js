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
  runMatching: (id, payload = {}) => api.post(`/requests/${id}/matches`, payload)
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