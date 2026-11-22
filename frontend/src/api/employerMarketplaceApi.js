import { api } from './client';

export const employerMarketplaceApi = {
  createJob: (companyId, payload) => api.post(`/companies/${companyId}/jobs`, payload, true),
  listJobs: (companyId, eventId = null) =>
    api.get(eventId ? `/companies/${companyId}/jobs?event_id=${eventId}` : `/companies/${companyId}/jobs`, true),
  listApplications: (companyId, jobId) =>
    api.get(`/companies/${companyId}/jobs/${jobId}/applications`, true),
  updateApplicationStatus: (companyId, applicationId, status) =>
    api.post(`/companies/${companyId}/applications/${applicationId}/status`, { status }, true),
  listAssignments: (companyId, eventId = null) =>
    api.get(eventId ? `/companies/${companyId}/assignments?event_id=${eventId}` : `/companies/${companyId}/assignments`, true),
  listAttendance: (companyId, eventId = null) =>
    api.get(eventId ? `/companies/${companyId}/attendance?event_id=${eventId}` : `/companies/${companyId}/attendance`, true),
  verifyAttendance: (companyId, attendanceId, notes = '') =>
    api.post(`/companies/${companyId}/attendance/${attendanceId}/verify`, { is_verified: true, notes }, true),
  listPayouts: (companyId) =>
    api.get(`/companies/${companyId}/payouts`, true),
  updatePayoutStatus: (companyId, earningId, status) =>
    api.post(`/companies/${companyId}/payouts/${earningId}/status`, { status }, true),
};

