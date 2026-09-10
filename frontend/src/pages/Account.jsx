import { useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Account() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '' });
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function saveProfile(e) {
    e.preventDefault();
    setError('');
    try {
      await api.put('/auth/profile', form, true);
      await refreshUser();
      setNotice('Profile updated.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    setError('');
    try {
      await api.put('/auth/profile', passwordForm, true);
      setPasswordForm({ current_password: '', new_password: '' });
      setNotice('Password changed.');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="container section" style={{ maxWidth: 480 }}>
      <h2>Account settings</h2>
      {notice && <p className="muted">{notice}</p>}
      {error && <p className="error-text">{error}</p>}

      <form className="card" onSubmit={saveProfile} style={{ marginBottom: 24 }}>
        <h3>Profile</h3>
        <div className="field">
          <label>Email</label>
          <input className="input" value={user?.email || ''} disabled />
        </div>
        <div className="field">
          <label>Full name</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="field">
          <label>Phone</label>
          <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <button className="btn btn-primary" type="submit">
          Save changes
        </button>
      </form>

      <form className="card" onSubmit={changePassword}>
        <h3>Change password</h3>
        <div className="field">
          <label>Current password</label>
          <input
            className="input"
            type="password"
            value={passwordForm.current_password}
            onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
          />
        </div>
        <div className="field">
          <label>New password</label>
          <input
            className="input"
            type="password"
            minLength={6}
            value={passwordForm.new_password}
            onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
          />
        </div>
        <button className="btn btn-outline" type="submit">
          Update password
        </button>
      </form>
    </div>
  );
}
