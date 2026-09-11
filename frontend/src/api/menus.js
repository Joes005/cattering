import { api } from './client';

export const menusApi = {
  listCategories: (companyId) => api.get(`/companies/${companyId}/menu-categories`, true),
  createCategory: (companyId, payload) => api.post(`/companies/${companyId}/menu-categories`, payload, true),
  listItems: (companyId) => api.get(`/companies/${companyId}/menu-items`, true),
  createItem: (companyId, payload) => api.post(`/companies/${companyId}/menu-items`, payload, true),
  deleteItem: (companyId, itemId) => api.del(`/companies/${companyId}/menu-items/${itemId}`, true),
};

export const packagesApi = {
  list: (companyId) => api.get(`/companies/${companyId}/packages`, true),
  create: (companyId, payload) => api.post(`/companies/${companyId}/packages`, payload, true),
  delete: (companyId, packageId) => api.del(`/companies/${companyId}/packages/${packageId}`, true),
  listPublic: (companyId) => api.get(`/companies/${companyId}/public/packages`, true),
};
