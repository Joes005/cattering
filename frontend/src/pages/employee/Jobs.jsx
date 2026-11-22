import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { employeeApi } from '../../api/employeeApi';
import EmptyState from '../../components/EmptyState';
import { SkeletonRows } from '../../components/Skeleton';
import { formatCurrency } from '../../lib/format';

const ROLES = [
  'All Roles',
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

export default function EmployeeJobs() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('All Roles');
  const [applyingJob, setApplyingJob] = useState(null);
  const [coverNote, setCoverNote] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['employee-jobs', searchTerm, selectedRole],
    queryFn: () =>
      employeeApi.listJobs(
        searchTerm,
        selectedRole === 'All Roles' ? '' : selectedRole
      ),
  });

  const applyMutation = useMutation({
    mutationFn: () => employeeApi.applyJob(applyingJob.id, coverNote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-applications'] });
      setSuccessMsg(`Application for "${applyingJob.title}" submitted successfully!`);
      setApplyingJob(null);
      setCoverNote('');
      setErrorMsg('');
      setTimeout(() => setSuccessMsg(''), 4000);
    },
    onError: (err) => setErrorMsg(err.message),
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Catering Shifts Marketplace</h2>
        <p className="text-xs text-neutral-500">
          Explore catering gigs across verified companies and apply with transparent hourly rates
        </p>
      </div>

      {successMsg && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-medium text-emerald-800">
          ✓ {successMsg}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          className="input flex-1"
          placeholder="Search shifts by title, caterer, or location…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="input sm:w-56"
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {/* Apply Modal */}
      {applyingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="card max-w-md w-full p-6 space-y-4">
            <div>
              <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                Apply for Shift
              </span>
              <h3 className="mt-2 text-lg font-bold text-neutral-900">{applyingJob.title}</h3>
              <p className="text-xs text-neutral-500 mt-1">
                Employer: <strong>{applyingJob.company_name}</strong> · Role: {applyingJob.role} · Rate:{' '}
                <strong className="text-emerald-700">{formatCurrency(applyingJob.pay_rate)}/hr</strong>
              </p>
            </div>

            {errorMsg && (
              <p className="rounded-lg bg-red-50 p-2 text-xs text-red-700">{errorMsg}</p>
            )}

            <div>
              <label className="label">Cover Note / Experience for Caterer (Optional)</label>
              <textarea
                rows={3}
                className="input"
                value={coverNote}
                onChange={(e) => setCoverNote(e.target.value)}
                placeholder="Mention relevant banquet experience, punctuality, or skills…"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setApplyingJob(null);
                  setErrorMsg('');
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={applyMutation.isPending}
                className="btn-primary"
                onClick={() => applyMutation.mutate()}
              >
                {applyMutation.isPending ? 'Submitting…' : 'Submit Application'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Jobs List */}
      {isLoading ? (
        <SkeletonRows rows={5} />
      ) : !jobs || jobs.length === 0 ? (
        <EmptyState
          title="No catering shifts found"
          description="Try adjusting your role or search filter, or check back soon for newly posted shifts."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {jobs.map((job) => (
            <div key={job.id} className="card p-5 flex flex-col justify-between hover:shadow-card-hover transition">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-block rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-600">
                      {job.role}
                    </span>
                    <h3 className="mt-1 text-base font-bold text-neutral-900">{job.title}</h3>
                    <p className="text-xs font-medium text-brand-800 mt-0.5">
                      🏢 {job.company_name || 'Catering Partner'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-base font-bold text-emerald-700">
                      {formatCurrency(job.pay_rate)}
                    </span>
                    <span className="block text-[10px] text-neutral-500">per hour</span>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-neutral-500 pt-1">
                  <p>
                    📅 <strong>Shift:</strong> {new Date(job.shift_start).toLocaleDateString()} (
                    {new Date(job.shift_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                    {new Date(job.shift_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                  </p>
                  {job.venue_location && (
                    <p>📍 <strong>Location:</strong> {job.venue_location}</p>
                  )}
                  {job.description && (
                    <p className="text-neutral-600 line-clamp-2 mt-1">"{job.description}"</p>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
                <span className="text-[11px] text-neutral-400">
                  Slots needed: {job.required_count}
                </span>
                <button
                  onClick={() => {
                    setApplyingJob(job);
                    setErrorMsg('');
                  }}
                  className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
                >
                  Apply Now
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

