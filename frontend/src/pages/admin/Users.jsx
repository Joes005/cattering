import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminUsersApi } from '../../api/adminUsers';
import StatusBadge from '../../components/StatusBadge';
import { SkeletonRows } from '../../components/Skeleton';

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const { data: users, isLoading } = useQuery({ queryKey: ['admin', 'users'], queryFn: adminUsersApi.list });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }) => (active ? adminUsersApi.suspend(id) : adminUsersApi.activate(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  const roleLabel = { admin: 'Admin', company_user: 'Company staff', client: 'Client' };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-neutral-900">Users</h2>

      {isLoading ? (
        <SkeletonRows rows={6} />
      ) : (
        <div className="card divide-y divide-neutral-100">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                  {u.full_name[0]?.toUpperCase()}
                </span>
                <div>
                  <p className="text-sm font-medium text-neutral-900">{u.full_name}</p>
                  <p className="text-xs text-neutral-500">{u.email} · {roleLabel[u.global_role]}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={u.status} />
                {u.global_role !== 'admin' && (
                  <button
                    className="btn-secondary text-xs"
                    onClick={() => toggleMutation.mutate({ id: u.id, active: u.status === 'active' })}
                  >
                    {u.status === 'active' ? 'Suspend' : 'Activate'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
