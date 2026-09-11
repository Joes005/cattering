import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { companiesApi } from '../../api/companies';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import { SkeletonRows } from '../../components/Skeleton';

const EMPTY_FORM = { name: '', owner_name: '', owner_email: '', owner_password: '' };

export default function AdminCompanies() {
  const queryClient = useQueryClient();
  const { data: companies, isLoading } = useQuery({ queryKey: ['admin', 'companies'], queryFn: companiesApi.list });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: () => companiesApi.create(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'companies'] });
      setShowForm(false);
      setForm(EMPTY_FORM);
      setError('');
    },
    onError: (err) => setError(err.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900">Companies</h2>
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ New company'}
        </button>
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
            <label className="label">Company name</label>
            <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Owner name</label>
            <input
              required
              className="input"
              value={form.owner_name}
              onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Owner email</label>
            <input
              type="email"
              required
              className="input"
              value={form.owner_email}
              onChange={(e) => setForm({ ...form, owner_email: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Owner temporary password</label>
            <input
              type="password"
              required
              minLength={6}
              className="input"
              value={form.owner_password}
              onChange={(e) => setForm({ ...form, owner_password: e.target.value })}
            />
          </div>
          <button type="submit" disabled={createMutation.isPending} className="btn-primary sm:col-span-2 sm:w-fit">
            {createMutation.isPending ? 'Creating…' : 'Create company'}
          </button>
        </form>
      )}

      {isLoading ? (
        <SkeletonRows />
      ) : companies.length === 0 ? (
        <EmptyState title="No companies yet" description="Create the first catering company to get the platform started." />
      ) : (
        <div className="card divide-y divide-neutral-100">
          {companies.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-neutral-900">{c.name}</p>
                <p className="text-xs text-neutral-500">{c.currency} · joined {new Date(c.created_at).toLocaleDateString()}</p>
              </div>
              <StatusBadge status={c.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
