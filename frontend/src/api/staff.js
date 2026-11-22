import { api } from './client';
import { employerMarketplaceApi } from './employerMarketplaceApi';

export const staffApi = {
  list: (companyId, eventId) => employerMarketplaceApi.listAssignments(companyId, eventId),
  assign: (companyId, eventId, payload) => employerMarketplaceApi.createJob(companyId, { ...payload, event_id: eventId }),
  update: () => {},
  remove: () => {},
};

export const tasksApi = {
  list: (companyId, eventId) => api.get(`/companies/${companyId}/events/${eventId}/tasks`, true),
  create: (companyId, eventId, payload) =>
    api.post(`/companies/${companyId}/events/${eventId}/tasks`, {
      phase: payload.phase,
      title: payload.title,
      assigned_to_user_id: payload.assigned_to_user_id || payload.assigned_to || null,
      notes: payload.notes || null,
    }, true),
  update: (companyId, eventId, taskId, payload) =>
    api.patch(`/companies/${companyId}/events/${eventId}/tasks/${taskId}`, payload, true),
};
