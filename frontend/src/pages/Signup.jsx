import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'organizer', phone: '' });
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const user = await register(form);
      navigate(user.role === 'vendor' ? '/vendor-dashboard' : '/create-event');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="auth-page">
      <div className="card">
        <h1>Create your account</h1>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>I am a…</label>
            <select value={form.role} onChange={(e) => update('role', e.target.value)}>
              <option value="organizer">Event organizer (planning an event)</option>
              <option value="vendor">Caterer / vendor (offering services)</option>
            </select>
          </div>
          <div className="field">
            <label>Full name</label>
            <input className="input" required value={form.name} onChange={(e) => update('name', e.target.value)} />
          </div>
          <div className="field">
            <label>Email</label>
            <input
              className="input"
              type="email"
              required
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
            />
          </div>
          <div className="field">
            <label>Phone</label>
            <input className="input" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              className="input"
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn btn-primary" type="submit" style={{ width: '100%' }}>
            Sign up
          </button>
        </form>
        <p className="muted" style={{ marginTop: 16 }}>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
