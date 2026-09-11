import { api } from './client';

export const adminUsersApi = {
  list: () => api.get('/users', true),
  suspend: (userId) => api.post(`/users/${userId}/suspend`, undefined, true),
  activate: (userId) => api.post(`/users/${userId}/activate`, undefined, true),
};
