import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/adminApi';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import { SkeletonRows } from '../../components/Skeleton';

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin', 'users', roleFilter, statusFilter, search],
    queryFn: () => adminApi.listUsers(roleFilter, statusFilter, search),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ userId, newStatus }) => adminApi.setUserStatus(userId, newStatus),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  const roleBadgeColor = {
    admin: 'bg-purple-100 text-purple-800 border-purple-200',
    employer: 'bg-blue-100 text-blue-800 border-blue-200',
    employee: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    customer: 'bg-amber-100 text-amber-800 border-amber-200',
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Platform Users</h2>
          <p className="text-xs text-neutral-500">
            Centralized directory of all 4 platform roles: Admin, Employer, Employee, and Customer
          </p>
        </div>

        {/* Search */}
        <div className="w-full sm:w-64">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone..."
            className="w-full rounded-xl border border-neutral-300 px-3 py-1.5 text-xs focus:border-brand-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Role & Status Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-neutral-500 mr-1">Role:</span>
          {['all', 'employer', 'employee', 'customer', 'admin'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition ${
                roleFilter === r
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-neutral-500 mr-1">Status:</span>
          {['all', 'active', 'suspended'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition ${
                statusFilter === st
                  ? 'bg-neutral-800 text-white'
                  : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Users List */}
      {isLoading ? (
        <SkeletonRows rows={6} />
      ) : !users || users.length === 0 ? (
        <EmptyState
          title="No users found"
          description="Try broadening your role, status, or search filters."
        />
      ) : (
        <div className="card divide-y divide-neutral-100">
          {users.map((u) => {
            const isSuspended = u.status === 'suspended';
            const isAdmin = u.role === 'admin';

            return (
              <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-sm font-semibold text-neutral-700 flex-shrink-0">
                    {u.full_name?.[0]?.toUpperCase() || 'U'}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-neutral-900">{u.full_name}</p>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          roleBadgeColor[u.role] || 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        {u.role}
                      </span>
                      <StatusBadge status={u.status} />
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {u.email} {u.phone && `· ${u.phone}`} · Joined {new Date(u.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {!isAdmin && (
                    <button
                      onClick={() =>
                        toggleStatusMutation.mutate({
                          userId: u.id,
                          newStatus: isSuspended ? 'active' : 'suspended',
                        })
                      }
                      disabled={toggleStatusMutation.isPending}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        isSuspended
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          : 'bg-neutral-50 text-neutral-700 hover:bg-neutral-100 border border-neutral-200'
                      }`}
                    >
                      {isSuspended ? 'Activate Account' : 'Suspend Account'}
                    </button>
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
