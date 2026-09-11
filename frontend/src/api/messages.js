import { api } from './client';

export const messagesApi = {
  listForCompany: (companyId, eventId) => api.get(`/companies/${companyId}/events/${eventId}/messages`, true),
  sendForCompany: (companyId, eventId, payload) => api.post(`/companies/${companyId}/events/${eventId}/messages`, payload, true),

  listMine: (eventId) => api.get(`/me/events/${eventId}/messages`, true),
  sendMine: (eventId, payload) => api.post(`/me/events/${eventId}/messages`, payload, true),
};
