import { api } from './client';

export const quotationsApi = {
  listForCompany: (companyId, eventId) => api.get(`/companies/${companyId}/events/${eventId}/quotations`, true),
  getForCompany: (companyId, eventId, quotationId) =>
    api.get(`/companies/${companyId}/events/${eventId}/quotations/${quotationId}`, true),
  create: (companyId, eventId, payload) =>
    api.post(`/companies/${companyId}/events/${eventId}/quotations`, payload, true),
  send: (companyId, eventId, quotationId) =>
    api.post(`/companies/${companyId}/events/${eventId}/quotations/${quotationId}/send`, undefined, true),

  listMine: (eventId) => api.get(`/me/events/${eventId}/quotations`, true),
  getMine: (eventId, quotationId) => api.get(`/me/events/${eventId}/quotations/${quotationId}`, true),
  accept: (eventId, quotationId) => api.post(`/me/events/${eventId}/quotations/${quotationId}/accept`, undefined, true),
  reject: (eventId, quotationId) => api.post(`/me/events/${eventId}/quotations/${quotationId}/reject`, undefined, true),
};
