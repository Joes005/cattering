import { api } from './client';

export const clientsApi = {
  list: (companyId) => api.get(`/companies/${companyId}/clients`, true),
  create: (companyId, payload) => api.post(`/companies/${companyId}/clients`, payload, true),
  update: (companyId, clientId, payload) =>
    api.patch(`/companies/${companyId}/clients/${clientId}`, payload, true),
};
