import { api } from './client';

export const customerApi = {
  getProfile: () => api.get('/customer/profile', true),
  updateProfile: (payload) => api.patch('/customer/profile', payload, true),

  listCaterers: (search = '', city = '') => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (city) params.append('city', city);
    const qs = params.toString();
    return api.get(qs ? `/customer/caterers?${qs}` : '/customer/caterers', true);
  },

  getCaterer: (companyId) => api.get(`/customer/caterers/${companyId}`, true),
  getCatererMenus: (companyId) => api.get(`/customer/caterers/${companyId}/menus`, true),
  getCatererPackages: (companyId) => api.get(`/customer/caterers/${companyId}/packages`, true),

  submitInquiry: (payload) => api.post('/customer/inquiries', payload, true),
  listEvents: () => api.get('/customer/events', true),
  getEvent: (eventId) => api.get(`/customer/events/${eventId}`, true),

  listQuotations: (eventId) => api.get(`/customer/events/${eventId}/quotations`, true),
  acceptQuotation: (eventId, quoteId) =>
    api.post(`/customer/events/${eventId}/quotations/${quoteId}/accept`, {}, true),

  listInvoices: (eventId = null) =>
    api.get(eventId ? `/customer/events/${eventId}/invoices` : '/customer/invoices', true),
  payInvoice: (invoiceId, payload) =>
    api.post(`/customer/invoices/${invoiceId}/pay`, payload, true),

  submitFeedback: (eventId, payload) =>
    api.post(`/customer/events/${eventId}/feedback`, payload, true),
};

