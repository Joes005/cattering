import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/adminApi';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import { SkeletonRows } from '../../components/Skeleton';

export default function AdminEmployees() {
  const queryClient = useQueryClient();

  const { data: employees, isLoading } = useQuery({
    queryKey: ['admin', 'workforce', 'roster'],
    queryFn: adminApi.listEmployees,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ userId, isActive }) =>
      isActive ? adminApi.suspendEmployee(userId) : adminApi.activateEmployee(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'workforce'] }),
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Workforce & Catering Staff Roster</h2>
        <p className="text-xs text-neutral-500">
          Independent catering professionals, skill sets, ratings, completed shifts, and account status
        </p>
      </div>

      {isLoading ? (
        <SkeletonRows rows={6} />
      ) : !employees || employees.length === 0 ? (
        <EmptyState title="No workforce staff registered" description="Independent catering workers will appear here." />
      ) : (
        <div className="card divide-y divide-neutral-100">
          {employees.map((profile) => {
            const u = profile.user || {};
            const skills = profile.skills || [];
            const isActive = u.status === 'active';

            return (
              <div key={profile.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-sm font-semibold text-emerald-800 flex-shrink-0">
                    {u.full_name?.[0]?.toUpperCase() || 'W'}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-neutral-900">{u.full_name || 'Staff Member'}</p>
                      <StatusBadge status={u.status || 'active'} />
                      <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                        ⭐ {profile.rating?.toFixed(1) || '5.0'}
                      </span>
                      <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600">
                        {profile.total_completed_events || 0} shifts completed
                      </span>
                    </div>

                    <p className="text-xs text-neutral-500 mt-1">
                      {u.email} {u.phone && `· ${u.phone}`} {profile.location && `· 📍 ${profile.location}`}
                      {profile.work_experience_years > 0 && ` · ${profile.work_experience_years} yrs exp`}
                    </p>

                    {skills.length > 0 && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {skills.map((s) => (
                          <span
                            key={s}
                            className="rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-700"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => toggleMutation.mutate({ userId: u.id, isActive })}
                    disabled={toggleMutation.isPending}
                    className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                      isActive
                        ? 'border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {isActive ? 'Suspend Staff' : 'Activate Staff'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

