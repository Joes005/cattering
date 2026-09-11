import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { membersApi } from '../../api/members';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import { SkeletonRows } from '../../components/Skeleton';
import { useAuth } from '../../context/AuthContext';

const EMPTY_FORM = { full_name: '', email: '', password: '', phone: '', employment_role: 'staff', job_title: '' };

export default function CompanyEmployees() {
  const { currentCompanyId, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const { data: members, isLoading } = useQuery({
    queryKey: ['members', currentCompanyId],
    queryFn: () => membersApi.list(currentCompanyId),
    enabled: !!currentCompanyId,
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  const canCreate = hasPermission('employees.create');
  const canUpdate = hasPermission('employees.update');

  const createMutation = useMutation({
    mutationFn: () => membersApi.create(currentCompanyId, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', currentCompanyId] });
      setShowForm(false);
      setForm(EMPTY_FORM);
      setError('');
    },
    onError: (err) => setError(err.message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => membersApi.update(currentCompanyId, id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members', currentCompanyId] }),
  });

  const roleLabel = { owner: 'Owner', manager: 'Manager', staff: 'Staff' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900">Employees</h2>
        {canCreate && (
          <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancel' : '+ Add employee'}
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="card grid gap-3 p-5 sm:grid-cols-2"
        >
          {error && <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div>
            <label className="label">Full name</label>
            <input
              required
              className="input"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              required
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Temporary password</label>
            <input
              type="password"
              required
              minLength={6}
              className="input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="label">Role</label>
            <select
              className="input"
              value={form.employment_role}
              onChange={(e) => setForm({ ...form, employment_role: e.target.value })}
            >
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
              <option value="owner">Owner</option>
            </select>
          </div>
          <div>
            <label className="label">Job title</label>
            <input
              className="input"
              placeholder="e.g. Service Captain"
              value={form.job_title}
              onChange={(e) => setForm({ ...form, job_title: e.target.value })}
            />
          </div>
          <button type="submit" disabled={createMutation.isPending} className="btn-primary sm:col-span-2 sm:w-fit">
            {createMutation.isPending ? 'Adding…' : 'Add employee'}
          </button>
        </form>
      )}

      {isLoading ? (
        <SkeletonRows />
      ) : members.length === 0 ? (
        <EmptyState title="No employees yet" description="Add your first team member to start assigning events." />
      ) : (
        <div className="card divide-y divide-neutral-100">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                  {m.user.full_name[0]?.toUpperCase()}
                </span>
                <div>
                  <p className="text-sm font-medium text-neutral-900">{m.user.full_name}</p>
                  <p className="text-xs text-neutral-500">
                    {roleLabel[m.employment_role]}
                    {m.job_title ? ` · ${m.job_title}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={m.status} />
                {canUpdate && (
                  <button
                    className="btn-secondary text-xs"
                    onClick={() =>
                      statusMutation.mutate({ id: m.id, status: m.status === 'active' ? 'inactive' : 'active' })
                    }
                  >
                    {m.status === 'active' ? 'Deactivate' : 'Activate'}
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
