import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { companiesApi } from '../../api/companies';
import { useAuth } from '../../context/AuthContext';

export default function CompanySettings() {
  const { currentCompanyId, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const { data: company, isLoading } = useQuery({
    queryKey: ['company', currentCompanyId],
    queryFn: () => companiesApi.get(currentCompanyId),
    enabled: !!currentCompanyId,
  });
  const [form, setForm] = useState({ name: '', gst_number: '', currency: 'INR' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (company) setForm({ name: company.name, gst_number: company.gst_number || '', currency: company.currency });
  }, [company]);

  const canEdit = hasPermission('settings.update');

  const updateMutation = useMutation({
    mutationFn: () => companiesApi.update(currentCompanyId, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', currentCompanyId] });
      setMessage('Company settings updated.');
      setError('');
    },
    onError: (err) => setError(err.message),
  });

  if (isLoading) return null;

  return (
    <div className="max-w-lg space-y-4">
      <h2 className="text-lg font-semibold text-neutral-900">Company settings</h2>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateMutation.mutate();
        }}
        className="card space-y-4 p-6"
      >
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {message && <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{message}</p>}

        <div>
          <label className="label">Company name</label>
          <input
            disabled={!canEdit}
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="label">GST number</label>
          <input
            disabled={!canEdit}
            className="input"
            value={form.gst_number}
            onChange={(e) => setForm({ ...form, gst_number: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Currency</label>
          <input
            disabled={!canEdit}
            className="input"
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
          />
        </div>

        {canEdit && (
          <button type="submit" disabled={updateMutation.isPending} className="btn-primary">
            {updateMutation.isPending ? 'Saving…' : 'Save changes'}
          </button>
        )}
      </form>
    </div>
  );
}
