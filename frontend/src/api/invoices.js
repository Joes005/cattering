import { api } from './client';

export const invoicesApi = {
  listForCompany: (companyId, eventId) => api.get(`/companies/${companyId}/events/${eventId}/invoices`, true),
  createFromQuotation: (companyId, eventId, quotationId, payload = {}) =>
    api.post(`/companies/${companyId}/events/${eventId}/invoices/from-quotation/${quotationId}`, payload, true),
  send: (companyId, eventId, invoiceId) =>
    api.post(`/companies/${companyId}/events/${eventId}/invoices/${invoiceId}/send`, undefined, true),

  listMine: (eventId) => api.get(`/me/events/${eventId}/invoices`, true),
};

export const paymentsApi = {
  listForCompany: (companyId, eventId) => api.get(`/companies/${companyId}/events/${eventId}/payments`, true),
  record: (companyId, eventId, payload) => api.post(`/companies/${companyId}/events/${eventId}/payments`, payload, true),

  listMine: (eventId) => api.get(`/me/events/${eventId}/payments`, true),
  pay: (eventId, payload) => api.post(`/me/events/${eventId}/payments`, payload, true),
};
