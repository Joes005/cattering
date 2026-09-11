import { api } from './client';

export const companiesApi = {
  list: () => api.get('/companies', true),
  listPublic: () => api.get('/companies/public', true),
  get: (companyId) => api.get(`/companies/${companyId}`, true),
  create: (payload) => api.post('/companies', payload, true),
  update: (companyId, payload) => api.patch(`/companies/${companyId}`, payload, true),
};
