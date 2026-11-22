import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '../../api/customers';
import EmptyState from '../../components/EmptyState';
import { SkeletonRows } from '../../components/Skeleton';
import { useAuth } from '../../context/AuthContext';

const EMPTY_FORM = { name: '', email: '', phone: '', address: '', notes: '' };

export default function CompanyCustomers() {
  const { currentCompanyId } = useAuth();
  const queryClient = useQueryClient();
  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers', currentCompanyId],
    queryFn: () => customersApi.list(currentCompanyId),
    enabled: !!currentCompanyId,
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: () => customersApi.create(currentCompanyId, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', currentCompanyId] });
      setShowForm(false);
      setForm(EMPTY_FORM);
      setError('');
    },
    onError: (err) => setError(err.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Customers</h2>
          <p className="text-xs text-neutral-500">
            Manage your catering client records, contact details, and booking history
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ Add Customer'}
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
            <label className="label">Customer / Contact Name *</label>
            <input
              required
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Aditi Sharma"
            />
          </div>
          <div>
            <label className="label">Email Address</label>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="aditi@example.com"
            />
          </div>
          <div>
            <label className="label">Mobile Number</label>
            <input
              className="input"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91-98765-43210"
            />
          </div>
          <div>
            <label className="label">Address / Location</label>
            <input
              className="input"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="City, Area"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Notes / Preferences</label>
            <textarea
              className="input"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Event preferences, dietary needs, reference"
            />
          </div>
          <button type="submit" disabled={createMutation.isPending} className="btn-primary sm:w-fit">
            {createMutation.isPending ? 'Saving…' : 'Save Customer Record'}
          </button>
        </form>
      )}

      {isLoading ? (
        <SkeletonRows />
      ) : !customers || customers.length === 0 ? (
        <EmptyState
          title="No customers yet"
          description="Add a customer record to create quotations and book catering events."
        />
      ) : (
        <div className="card divide-y divide-neutral-100">
          {customers.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-semibold text-neutral-900">{c.name}</p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {[c.email, c.phone, c.address].filter(Boolean).join(' · ') || 'No contact details'}
                </p>
                {c.notes && <p className="text-xs text-neutral-400 mt-1 italic">{c.notes}</p>}
              </div>
              <span className="text-xs text-neutral-400">Added {new Date(c.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

