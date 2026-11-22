import { api } from './client';

export const customersApi = {
  list: (companyId) => api.get(`/companies/${companyId}/customers`, true),
  get: (companyId, customerId) => api.get(`/companies/${companyId}/customers/${customerId}`, true),
  create: (companyId, payload) => api.post(`/companies/${companyId}/customers`, payload, true),
  update: (companyId, customerId, payload) =>
    api.patch(`/companies/${companyId}/customers/${customerId}`, payload, true),
};

