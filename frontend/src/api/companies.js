import { api } from './client';

export const companiesApi = {
  list: () => api.get('/companies', true),
  listPublic: () => api.get('/companies/public', true),
  getMyBusinesses: () => api.get('/companies/my-businesses', true),
  get: (companyId) => api.get(`/companies/${companyId}`, true),
  create: (payload) => api.post('/companies', payload, true),
  registerBusiness: (payload) => api.post('/companies', payload, true),
  update: (companyId, payload) => api.patch(`/companies/${companyId}`, payload, true),
  getSubscription: (companyId) => api.get(`/companies/${companyId}/subscription`, true),
  subscribePlan: (companyId, payload) => api.post(`/companies/${companyId}/subscription/subscribe`, payload, true),
};
