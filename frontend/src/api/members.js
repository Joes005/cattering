import { api } from './client';

export const membersApi = {
  list: (companyId) => api.get(`/companies/${companyId}/members`, true),
  create: (companyId, payload) => api.post(`/companies/${companyId}/members`, payload, true),
  update: (companyId, memberId, payload) =>
    api.patch(`/companies/${companyId}/members/${memberId}`, payload, true),
  setPermissions: (companyId, memberId, payload) =>
    api.put(`/companies/${companyId}/members/${memberId}/permissions`, payload, true),
};
