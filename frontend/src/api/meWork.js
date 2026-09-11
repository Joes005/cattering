import { api } from './client';

export const meWorkApi = {
  listAssignments: () => api.get('/me/assignments', true),
  listTasks: () => api.get('/me/tasks', true),
  updateTask: (taskId, payload) => api.patch(`/me/tasks/${taskId}`, payload, true),
  checkIn: (eventId) => api.post('/me/attendance/check-in', { event_id: eventId }, true),
  checkOut: (eventId) => api.post('/me/attendance/check-out', { event_id: eventId }, true),
};
