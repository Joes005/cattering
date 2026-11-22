import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { employerMarketplaceApi } from '../../api/employerMarketplaceApi';
import { eventsApi } from '../../api/events';
import { useAuth } from '../../context/AuthContext';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import { SkeletonRows } from '../../components/Skeleton';
import { formatCurrency } from '../../lib/format';

const TABS = ['Job Postings', 'Applications', 'Assigned Workforce', 'Attendance', 'Payouts'];

const ROLES = [
  'Head Chef',
  'Sous Chef',
  'Line Cook',
  'Service Captain',
  'Waiter / Waitress',
  'Bartender',
  'Buffet Attendant',
  'Kitchen Assistant',
  'Dishwasher & Cleaning',
];

const EMPTY_JOB_FORM = {
  event_id: '',
  title: '',
  role: 'Waiter / Waitress',
  description: '',
  required_count: 2,
  shift_start: '',
  shift_end: '',
  pay_rate: 180,
  skills_required: ['Service'],
  venue_location: '',
};

export default function CompanyEmployees() {
  const { currentCompanyId } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('Job Postings');
  const [showJobModal, setShowJobModal] = useState(false);
  const [jobForm, setJobForm] = useState(EMPTY_JOB_FORM);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [error, setError] = useState('');

  // Queries
  const { data: events } = useQuery({
    queryKey: ['events', currentCompanyId],
    queryFn: () => eventsApi.listForCompany(currentCompanyId),
    enabled: !!currentCompanyId,
  });

  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['employer-jobs', currentCompanyId],
    queryFn: () => employerMarketplaceApi.listJobs(currentCompanyId),
    enabled: !!currentCompanyId,
  });

  const { data: applications, isLoading: appsLoading } = useQuery({
    queryKey: ['employer-applications', currentCompanyId, selectedJobId],
    queryFn: () =>
      selectedJobId
        ? employerMarketplaceApi.listApplications(currentCompanyId, selectedJobId)
        : Promise.resolve([]),
    enabled: !!currentCompanyId && !!selectedJobId,
  });

  const { data: assignments, isLoading: assignLoading } = useQuery({
    queryKey: ['employer-assignments', currentCompanyId],
    queryFn: () => employerMarketplaceApi.listAssignments(currentCompanyId),
    enabled: !!currentCompanyId,
  });

  const { data: attendance, isLoading: attLoading } = useQuery({
    queryKey: ['employer-attendance', currentCompanyId],
    queryFn: () => employerMarketplaceApi.listAttendance(currentCompanyId),
    enabled: !!currentCompanyId,
  });

  const { data: payouts, isLoading: payoutsLoading } = useQuery({
    queryKey: ['employer-payouts', currentCompanyId],
    queryFn: () => employerMarketplaceApi.listPayouts(currentCompanyId),
    enabled: !!currentCompanyId,
  });

  // Mutations
  const createJobMutation = useMutation({
    mutationFn: () =>
      employerMarketplaceApi.createJob(currentCompanyId, {
        ...jobForm,
        required_count: Number(jobForm.required_count),
        pay_rate: Number(jobForm.pay_rate),
        shift_start: new Date(jobForm.shift_start).toISOString(),
        shift_end: new Date(jobForm.shift_end).toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employer-jobs', currentCompanyId] });
      setShowJobModal(false);
      setJobForm(EMPTY_JOB_FORM);
      setError('');
    },
    onError: (err) => setError(err.message),
  });

  const updateAppMutation = useMutation({
    mutationFn: ({ appId, status }) =>
      employerMarketplaceApi.updateApplicationStatus(currentCompanyId, appId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employer-applications'] });
      queryClient.invalidateQueries({ queryKey: ['employer-assignments'] });
    },
  });

  const verifyAttMutation = useMutation({
    mutationFn: (attId) => employerMarketplaceApi.verifyAttendance(currentCompanyId, attId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employer-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['employer-payouts'] });
    },
  });

  const updatePayoutMutation = useMutation({
    mutationFn: ({ earningId, status }) =>
      employerMarketplaceApi.updatePayoutStatus(currentCompanyId, earningId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employer-payouts'] }),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Workforce & Marketplace</h2>
          <p className="text-xs text-neutral-500">
            Post catering shifts, hire marketplace staff, verify attendance, and manage payouts
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setShowJobModal(true);
            setError('');
          }}
        >
          + Post Catering Shift
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200 gap-4">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-medium transition border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-brand-600 text-brand-700 font-semibold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Post Shift Modal */}
      {showJobModal && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createJobMutation.mutate();
          }}
          className="card p-5 grid gap-3 sm:grid-cols-2"
        >
          <div className="sm:col-span-2 flex items-center justify-between border-b pb-2">
            <h3 className="font-semibold text-neutral-900">Post New Shift to Marketplace</h3>
            <button
              type="button"
              className="text-neutral-400 hover:text-neutral-700"
              onClick={() => setShowJobModal(false)}
            >
              ✕
            </button>
          </div>

          {error && <p className="sm:col-span-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-700">{error}</p>}

          <div>
            <label className="label">Event *</label>
            <select
              required
              className="input"
              value={jobForm.event_id}
              onChange={(e) => {
                const ev = (events || []).find((x) => x.id === e.target.value);
                setJobForm({
                  ...jobForm,
                  event_id: e.target.value,
                  venue_location: ev?.venue_name || ev?.venue_address || '',
                });
              }}
            >
              <option value="">Select an event…</option>
              {(events || []).map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} ({new Date(ev.event_date).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Posting Title *</label>
            <input
              required
              className="input"
              value={jobForm.title}
              onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
              placeholder="e.g. Banquet Service Waiter"
            />
          </div>

          <div>
            <label className="label">Workforce Role</label>
            <select
              className="input"
              value={jobForm.role}
              onChange={(e) => setJobForm({ ...jobForm, role: e.target.value })}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Required Staff Count</label>
            <input
              type="number"
              min="1"
              required
              className="input"
              value={jobForm.required_count}
              onChange={(e) => setJobForm({ ...jobForm, required_count: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Shift Start Time *</label>
            <input
              type="datetime-local"
              required
              className="input"
              value={jobForm.shift_start}
              onChange={(e) => setJobForm({ ...jobForm, shift_start: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Shift End Time *</label>
            <input
              type="datetime-local"
              required
              className="input"
              value={jobForm.shift_end}
              onChange={(e) => setJobForm({ ...jobForm, shift_end: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Pay Rate (₹ / hour)</label>
            <input
              type="number"
              min="50"
              required
              className="input"
              value={jobForm.pay_rate}
              onChange={(e) => setJobForm({ ...jobForm, pay_rate: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Venue Location</label>
            <input
              className="input"
              value={jobForm.venue_location}
              onChange={(e) => setJobForm({ ...jobForm, venue_location: e.target.value })}
              placeholder="Hall / Address"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="label">Shift Description / Briefing</label>
            <textarea
              className="input"
              rows={2}
              value={jobForm.description}
              onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
              placeholder="Uniform requirements, reporting instructions, tasks"
            />
          </div>

          <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowJobModal(false)}
            >
              Cancel
            </button>
            <button type="submit" disabled={createJobMutation.isPending} className="btn-primary">
              {createJobMutation.isPending ? 'Publishing…' : 'Publish to Marketplace'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 1: JOB POSTINGS */}
      {activeTab === 'Job Postings' && (
        <div className="space-y-4">
          {jobsLoading ? (
            <SkeletonRows rows={4} />
          ) : !jobs || jobs.length === 0 ? (
            <EmptyState
              title="No active shift postings"
              description="Publish a shift posting to allow independent workforce to view and apply."
            />
          ) : (
            <div className="card divide-y divide-neutral-100">
              {jobs.map((job) => (
                <div key={job.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-900">{job.title}</span>
                      <StatusBadge status={job.status} />
                      <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                        {job.role}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                      Required: <strong>{job.required_count} staff</strong> · Pay:{' '}
                      <strong className="text-emerald-700">{formatCurrency(job.pay_rate)}/hr</strong>
                      {job.venue_location && ` · 📍 ${job.venue_location}`}
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Shift: {new Date(job.shift_start).toLocaleString()} – {new Date(job.shift_end).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedJobId(job.id);
                        setActiveTab('Applications');
                      }}
                      className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition"
                    >
                      View Applications →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: APPLICATIONS */}
      {activeTab === 'Applications' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-neutral-600 uppercase">Select Shift:</label>
            <select
              className="input w-auto text-xs py-1"
              value={selectedJobId || ''}
              onChange={(e) => setSelectedJobId(e.target.value)}
            >
              <option value="">Choose a shift posting…</option>
              {(jobs || []).map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} ({j.role})
                </option>
              ))}
            </select>
          </div>

          {!selectedJobId ? (
            <div className="rounded-xl border border-dashed border-neutral-200 p-8 text-center text-sm text-neutral-500">
              Please select a shift posting from the dropdown above to review applicant staff.
            </div>
          ) : appsLoading ? (
            <SkeletonRows rows={3} />
          ) : !applications || applications.length === 0 ? (
            <EmptyState
              title="No applicants yet"
              description="Candidates will show up here as soon as they apply from the Employee Portal."
            />
          ) : (
            <div className="card divide-y divide-neutral-100">
              {applications.map((app) => {
                const emp = app.employee;
                return (
                  <div key={app.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-neutral-900">{emp?.full_name}</span>
                        <StatusBadge status={app.status} />
                      </div>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {emp?.phone && `Phone: ${emp.phone} · `}
                        Location: {emp?.location || 'Not set'} · Rate: {formatCurrency(emp?.hourly_rate || 0)}/hr
                      </p>
                      {app.cover_note && (
                        <p className="text-xs text-neutral-600 mt-1 italic">"{app.cover_note}"</p>
                      )}
                    </div>
                    {app.status === 'applied' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateAppMutation.mutate({ appId: app.id, status: 'accepted' })}
                          disabled={updateAppMutation.isPending}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                        >
                          ✓ Accept & Assign
                        </button>
                        <button
                          onClick={() => updateAppMutation.mutate({ appId: app.id, status: 'rejected' })}
                          disabled={updateAppMutation.isPending}
                          className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-600 hover:bg-red-50 hover:text-red-700 transition"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ASSIGNED WORKFORCE */}
      {activeTab === 'Assigned Workforce' && (
        <div className="space-y-4">
          {assignLoading ? (
            <SkeletonRows rows={4} />
          ) : !assignments || assignments.length === 0 ? (
            <EmptyState
              title="No confirmed assignments"
              description="Accepting applicant staff on shift postings creates confirmed assignments here."
            />
          ) : (
            <div className="card divide-y divide-neutral-100">
              {assignments.map((asgn) => (
                <div key={asgn.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-900">{asgn.employee?.full_name}</span>
                      <StatusBadge status={asgn.status} />
                      <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                        {asgn.role}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                      Event: <strong>{asgn.event?.title}</strong> · Agreed Rate:{' '}
                      <strong className="text-emerald-700">{formatCurrency(asgn.agreed_pay_rate)}/hr</strong>
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Shift: {new Date(asgn.shift_start).toLocaleString()} – {new Date(asgn.shift_end).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ATTENDANCE */}
      {activeTab === 'Attendance' && (
        <div className="space-y-4">
          {attLoading ? (
            <SkeletonRows rows={4} />
          ) : !attendance || attendance.length === 0 ? (
            <EmptyState
              title="No attendance records"
              description="Digital check-in records made by assigned workforce during events appear here."
            />
          ) : (
            <div className="card divide-y divide-neutral-100">
              {attendance.map((att) => (
                <div key={att.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-900">{att.assignment?.employee?.full_name}</span>
                      <StatusBadge status={att.status} />
                      {att.is_verified ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                          ✓ Verified
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                          Verification Pending
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                      Check-in: {att.check_in_time ? new Date(att.check_in_time).toLocaleTimeString() : 'Pending'}
                      {' · '}
                      Check-out: {att.check_out_time ? new Date(att.check_out_time).toLocaleTimeString() : 'Active'}
                      {' · '}
                      Hours: <strong>{att.total_hours.toFixed(1)} hrs</strong>
                    </p>
                  </div>
                  {!att.is_verified && att.check_out_time && (
                    <button
                      onClick={() => verifyAttMutation.mutate(att.id)}
                      disabled={verifyAttMutation.isPending}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                    >
                      Verify & Generate Payout
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: PAYOUTS */}
      {activeTab === 'Payouts' && (
        <div className="space-y-4">
          {payoutsLoading ? (
            <SkeletonRows rows={4} />
          ) : !payouts || payouts.length === 0 ? (
            <EmptyState
              title="No payouts recorded"
              description="Verified attendance logs automatically generate employee earnings and payouts."
            />
          ) : (
            <div className="card divide-y divide-neutral-100">
              {payouts.map((p) => (
                <div key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-900">{p.employee?.full_name}</span>
                      <StatusBadge status={p.status} />
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                      Hours: {p.hours_worked} hrs @ {formatCurrency(p.hourly_rate)}/hr · Total:{' '}
                      <strong className="text-emerald-700 font-bold">{formatCurrency(p.total_amount)}</strong>
                    </p>
                  </div>
                  {p.status !== 'paid' && (
                    <button
                      onClick={() => updatePayoutMutation.mutate({ earningId: p.id, status: 'paid' })}
                      disabled={updatePayoutMutation.isPending}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                    >
                      Mark as Paid
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
