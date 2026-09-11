import { api } from './client';

export const eventsApi = {
  listMine: () => api.get('/me/events', true),
  getMine: (eventId) => api.get(`/me/events/${eventId}`, true),
  createMine: (payload) => api.post('/me/events', payload, true),
  cancelMine: (eventId) => api.post(`/me/events/${eventId}/cancel`, undefined, true),

  listForCompany: (companyId) => api.get(`/companies/${companyId}/events`, true),
  getForCompany: (companyId, eventId) => api.get(`/companies/${companyId}/events/${eventId}`, true),
  createForCompany: (companyId, payload) => api.post(`/companies/${companyId}/events`, payload, true),
  updateStatus: (companyId, eventId, payload) =>
    api.post(`/companies/${companyId}/events/${eventId}/status`, payload, true),
};
