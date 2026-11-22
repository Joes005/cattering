import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/adminApi';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import { SkeletonRows } from '../../components/Skeleton';
import {
  UsersIcon,
  SearchIcon,
  CheckCircleIcon,
  EyeIcon,
  ShieldCheckIcon,
} from '../../components/Icons';

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin', 'users', roleFilter, statusFilter, search],
    queryFn: () => adminApi.listUsers(roleFilter, statusFilter, search),
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const toggleStatusMutation = useMutation({
    mutationFn: ({ userId, newStatus }) => adminApi.setUserStatus(userId, newStatus),
    onSuccess: (updated) => {
      showToast(`Account status updated to ${updated.status}.`);
      if (selectedUser?.id === updated.id) setSelectedUser(updated);
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  const roleBadgeStyle = {
    admin: 'bg-purple-50 text-purple-700 border-purple-200',
    employer: 'bg-blue-50 text-blue-700 border-blue-200',
    employee: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    customer: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  const counts = useMemo(() => {
    if (!users) return { all: 0, employer: 0, employee: 0, customer: 0, admin: 0 };
    return {
      all: users.length,
      employer: users.filter((u) => u.role === 'employer').length,
      employee: users.filter((u) => u.role === 'employee').length,
      customer: users.filter((u) => u.role === 'customer').length,
      admin: users.filter((u) => u.role === 'admin').length,
    };
  }, [users]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Platform Users Directory</h2>
          <p className="mt-1 text-xs text-slate-500">
            Centralized governance for all 4 platform roles: Admin, Employer, Employee, and Customer.
          </p>
        </div>

        {toastMessage && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 shadow-xs animate-in fade-in">
            <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
        {/* Role Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All Roles' },
            { id: 'employer', label: 'Employers' },
            { id: 'employee', label: 'Employees' },
            { id: 'customer', label: 'Customers' },
            { id: 'admin', label: 'Admins' },
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => setRoleFilter(r.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                roleFilter === r.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
          </select>

          {/* Search Box */}
          <div className="relative w-full sm:w-60">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, phone..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>
      </div>

      {/* Users List */}
      {isLoading ? (
        <SkeletonRows rows={6} />
      ) : !users || users.length === 0 ? (
        <EmptyState
          title="No platform users found"
          description="Try broadening your role, status, or search filters."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
          <div className="divide-y divide-slate-100">
            {users.map((u) => {
              const isSuspended = u.status === 'suspended';
              const isAdmin = u.role === 'admin';

              return (
                <div
                  key={u.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-slate-50/60 transition"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700 uppercase">
                      {u.full_name?.[0] || 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900">{u.full_name}</span>
                        <span
                          className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            roleBadgeStyle[u.role] || 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {u.role}
                        </span>
                        <StatusBadge status={u.status} />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {u.email} {u.phone && `· ${u.phone}`} · Joined {new Date(u.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => setSelectedUser(u)}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                    >
                      <EyeIcon className="h-3.5 w-3.5 text-slate-500" />
                      <span>Details</span>
                    </button>

                    {!isAdmin && (
                      <button
                        onClick={() =>
                          toggleStatusMutation.mutate({
                            userId: u.id,
                            newStatus: isSuspended ? 'active' : 'suspended',
                          })
                        }
                        disabled={toggleStatusMutation.isPending}
                        className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                          isSuspended
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                            : 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                        }`}
                      >
                        {isSuspended ? 'Activate Account' : 'Suspend Access'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* User Inspection Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700 font-bold">
                  <UsersIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedUser.full_name}</h3>
                  <p className="text-xs text-slate-500">Platform Identity Profile</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`rounded-md border px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${
                  roleBadgeStyle[selectedUser.role] || 'bg-slate-100 text-slate-600'
                }`}
              >
                {selectedUser.role}
              </span>
              <StatusBadge status={selectedUser.status} />
            </div>

            <div className="space-y-2.5 rounded-xl bg-slate-50 p-4 border border-slate-100 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Email Address:</span>
                <span className="font-semibold text-slate-800">{selectedUser.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phone Number:</span>
                <span className="font-semibold text-slate-800">{selectedUser.phone || 'None'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">User ID:</span>
                <span className="font-mono text-slate-600">{selectedUser.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Account Created:</span>
                <span className="text-slate-800">{new Date(selectedUser.created_at).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedUser(null)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>

              {selectedUser.role !== 'admin' && (
                <button
                  onClick={() =>
                    toggleStatusMutation.mutate({
                      userId: selectedUser.id,
                      newStatus: selectedUser.status === 'suspended' ? 'active' : 'suspended',
                    })
                  }
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                    selectedUser.status === 'suspended'
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-rose-600 text-white hover:bg-rose-700'
                  }`}
                >
                  {selectedUser.status === 'suspended' ? 'Activate Account' : 'Suspend Account'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
