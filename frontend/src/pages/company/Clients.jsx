import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientsApi } from '../../api/clients';
import EmptyState from '../../components/EmptyState';
import { SkeletonRows } from '../../components/Skeleton';
import { useAuth } from '../../context/AuthContext';

const EMPTY_FORM = { name: '', email: '', phone: '', notes: '' };

export default function CompanyClients() {
  const { currentCompanyId, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients', currentCompanyId],
    queryFn: () => clientsApi.list(currentCompanyId),
    enabled: !!currentCompanyId,
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  const canCreate = hasPermission('clients.create');

  const createMutation = useMutation({
    mutationFn: () => clientsApi.create(currentCompanyId, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients', currentCompanyId] });
      setShowForm(false);
      setForm(EMPTY_FORM);
      setError('');
    },
    onError: (err) => setError(err.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900">Clients</h2>
        {canCreate && (
          <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancel' : '+ Add client'}
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
            <label className="label">Name</label>
            <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <button type="submit" disabled={createMutation.isPending} className="btn-primary sm:w-fit">
            {createMutation.isPending ? 'Saving…' : 'Save client'}
          </button>
        </form>
      )}

      {isLoading ? (
        <SkeletonRows />
      ) : clients.length === 0 ? (
        <EmptyState
          title="No clients yet"
          description="Add a client to start building their event history and bookings."
        />
      ) : (
        <div className="card divide-y divide-neutral-100">
          {clients.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-neutral-900">{c.name}</p>
                <p className="text-xs text-neutral-500">{[c.email, c.phone].filter(Boolean).join(' · ') || 'No contact details'}</p>
              </div>
              <span className="text-xs text-neutral-400">Since {new Date(c.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
