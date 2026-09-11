import { api } from './client';

export const notificationsApi = {
  list: () => api.get('/notifications', true),
  markRead: (id) => api.post(`/notifications/${id}/read`, undefined, true),
  markAllRead: () => api.post('/notifications/read-all', undefined, true),
};

export const feedbackApi = {
  getForCompany: (companyId, eventId) => api.get(`/companies/${companyId}/events/${eventId}/feedback`, true),
  getMine: (eventId) => api.get(`/me/events/${eventId}/feedback`, true),
  submitMine: (eventId, payload) => api.post(`/me/events/${eventId}/feedback`, payload, true),
};

export const documentsApi = {
  listForEvent: (companyId, eventId) => api.get(`/companies/${companyId}/events/${eventId}/documents`, true),
  upload: (companyId, { file, type, visibility, eventId }) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    formData.append('visibility', visibility);
    if (eventId) formData.append('event_id', eventId);
    return api.upload(`/companies/${companyId}/documents`, formData, true);
  },
};

export const inventoryApi = {
  list: (companyId) => api.get(`/companies/${companyId}/inventory`, true),
  create: (companyId, payload) => api.post(`/companies/${companyId}/inventory`, payload, true),
  recordTransaction: (companyId, itemId, payload) =>
    api.post(`/companies/${companyId}/inventory/${itemId}/transactions`, payload, true),
};

export const reportsApi = {
  sales: (companyId) => api.get(`/companies/${companyId}/reports/sales`, true),
  revenue: (companyId) => api.get(`/companies/${companyId}/reports/revenue`, true),
  events: (companyId) => api.get(`/companies/${companyId}/reports/events`, true),
};

export const auditLogsApi = {
  listPlatform: () => api.get('/audit-logs', true),
  listForCompany: (companyId) => api.get(`/companies/${companyId}/audit-logs`, true),
};
