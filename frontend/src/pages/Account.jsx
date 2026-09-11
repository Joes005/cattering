import { useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Account() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    current_password: '',
    new_password: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const payload = { full_name: form.full_name, phone: form.phone };
      if (form.new_password) {
        payload.current_password = form.current_password;
        payload.new_password = form.new_password;
      }
      await api.put('/auth/profile', payload, true);
      await refresh();
      setForm((f) => ({ ...f, current_password: '', new_password: '' }));
      setMessage('Your profile has been updated.');
    } catch (err) {
      setError(err.message || 'Unable to update your profile');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h2 className="mb-1 text-lg font-semibold text-neutral-900">Account settings</h2>
      <p className="mb-6 text-sm text-neutral-500">{user?.email}</p>

      <form onSubmit={handleSubmit} className="card space-y-4 p-6">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {message && <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{message}</p>}

        <div>
          <label className="label">Full name</label>
          <input className="input" value={form.full_name} onChange={(e) => update('full_name', e.target.value)} />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
        </div>

        <hr className="border-neutral-200" />

        <div>
          <label className="label">Current password</label>
          <input
            type="password"
            className="input"
            value={form.current_password}
            onChange={(e) => update('current_password', e.target.value)}
            placeholder="Only needed if changing your password"
          />
        </div>
        <div>
          <label className="label">New password</label>
          <input
            type="password"
            minLength={6}
            className="input"
            value={form.new_password}
            onChange={(e) => update('new_password', e.target.value)}
          />
        </div>

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
