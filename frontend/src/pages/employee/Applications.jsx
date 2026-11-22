import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { employeeApi } from '../../api/employeeApi';
import EmptyState from '../../components/EmptyState';
import { SkeletonRows } from '../../components/Skeleton';
import { formatCurrency } from '../../lib/format';

export default function EmployeeApplications() {
  const queryClient = useQueryClient();
  const { data: applications, isLoading } = useQuery({
    queryKey: ['employee-applications'],
    queryFn: employeeApi.listApplications,
  });

  const withdrawMutation = useMutation({
    mutationFn: (appId) => employeeApi.withdrawApplication(appId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employee-applications'] }),
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Shift Applications</h2>
        <p className="text-xs text-neutral-500">Track the review status of your catering shift applications</p>
      </div>

      {isLoading ? (
        <SkeletonRows rows={5} />
      ) : !applications || applications.length === 0 ? (
        <EmptyState
          title="No applications submitted yet"
          description="Browse open catering shifts and apply to start receiving assignments."
        />
      ) : (
        <div className="card divide-y divide-neutral-100">
          {applications.map((app) => {
            const job = app.job_posting;
            return (
              <div key={app.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-900">{job?.title}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                        app.status === 'accepted'
                          ? 'bg-emerald-100 text-emerald-800'
                          : app.status === 'rejected'
                          ? 'bg-red-100 text-red-700'
                          : app.status === 'shortlisted'
                          ? 'bg-blue-100 text-blue-700'
                          : app.status === 'withdrawn'
                          ? 'bg-neutral-100 text-neutral-400'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {app.status}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500">
                    Role: <strong className="text-neutral-700">{job?.role}</strong> · Pay Rate:{' '}
                    <strong className="text-emerald-700">{formatCurrency(job?.pay_rate || 0)}/hr</strong>
                  </p>
                  {app.cover_note && (
                    <p className="text-xs text-neutral-500 italic">"{app.cover_note}"</p>
                  )}
                  <p className="text-[11px] text-neutral-400">
                    Applied on {new Date(app.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {app.status === 'applied' && (
                    <button
                      onClick={() => withdrawMutation.mutate(app.id)}
                      disabled={withdrawMutation.isPending}
                      className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 hover:text-red-600 transition flex-shrink-0"
                    >
                      {withdrawMutation.isPending ? 'Withdrawing…' : 'Withdraw'}
                    </button>
                  )}
                  {app.status === 'accepted' && (
                    <Link
                      to="/employee/schedule"
                      className="rounded-lg bg-brand-50 border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition flex-shrink-0"
                    >
                      View Confirmed Shift →
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

