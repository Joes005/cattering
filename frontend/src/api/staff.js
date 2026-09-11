import { api } from './client';

export const staffApi = {
  list: (companyId, eventId) => api.get(`/companies/${companyId}/events/${eventId}/staff`, true),
  assign: (companyId, eventId, payload) => api.post(`/companies/${companyId}/events/${eventId}/staff`, payload, true),
  update: (companyId, eventId, assignmentId, payload) =>
    api.patch(`/companies/${companyId}/events/${eventId}/staff/${assignmentId}`, payload, true),
  remove: (companyId, eventId, assignmentId) =>
    api.del(`/companies/${companyId}/events/${eventId}/staff/${assignmentId}`, true),
};

export const tasksApi = {
  list: (companyId, eventId) => api.get(`/companies/${companyId}/events/${eventId}/tasks`, true),
  create: (companyId, eventId, payload) => api.post(`/companies/${companyId}/events/${eventId}/tasks`, payload, true),
  update: (companyId, eventId, taskId, payload) =>
    api.patch(`/companies/${companyId}/events/${eventId}/tasks/${taskId}`, payload, true),
};
