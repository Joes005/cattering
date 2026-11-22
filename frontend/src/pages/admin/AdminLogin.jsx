import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AdminLogin() {
  const { loginAdmin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await loginAdmin(email, password);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid administrator credentials');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-900 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-xl font-bold text-white shadow-glow">
            P
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">Plated Admin Portal</h1>
          <p className="mt-1 text-sm text-neutral-400">Platform administrator login only</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-950/80 p-7 shadow-2xl backdrop-blur-md space-y-4">
          {error && <p className="rounded-xl bg-red-950/50 border border-red-800 px-3 py-2 text-sm text-red-300">{error}</p>}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
              Admin Email
            </label>
            <input
              type="email"
              required
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@plated.com"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:opacity-50 transition"
          >
            {submitting ? 'Authenticating…' : 'Log In to Admin Console'}
          </button>
        </form>
      </div>
    </div>
  );
}

