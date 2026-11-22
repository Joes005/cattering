import { api } from './client';

export const employeeApi = {
  getProfile: () => api.get('/employee/profile', true),
  updateProfile: (payload) => api.patch('/employee/profile', payload, true),
  listJobs: (search = '', role = '') => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (role) params.append('role', role);
    const qs = params.toString();
    return api.get(qs ? `/employee/jobs?${qs}` : '/employee/jobs', true);
  },
  applyJob: (jobId, coverNote = '') =>
    api.post(`/employee/jobs/${jobId}/apply`, { cover_note: coverNote }, true),
  listApplications: () => api.get('/employee/applications', true),
  withdrawApplication: (appId) => api.delete(`/employee/applications/${appId}`, true),
  listSchedule: () => api.get('/employee/schedule', true),
  checkIn: (assignmentId, notes = '') =>
    api.post('/employee/attendance/check', { assignment_id: assignmentId, action: 'check_in', notes }, true),
  checkOut: (assignmentId, notes = '') =>
    api.post('/employee/attendance/check', { assignment_id: assignmentId, action: 'check_out', notes }, true),
  getEarnings: () => api.get('/employee/earnings', true),
  getAttendance: () => api.get('/employee/attendance', true),
};

