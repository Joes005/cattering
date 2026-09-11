import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function roleHome(role) {
  if (role === 'admin') return '/admin';
  if (role === 'company_user') return '/company';
  return '/client';
}

export default function Login() {
  const { login } = useAuth();
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
      const data = await login(email, password);
      navigate(roleHome(data.user.global_role), { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to log in');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-brand-gradient p-10 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-noise opacity-20" aria-hidden />
        <div
          className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl"
          aria-hidden
        />
        <Link to="/" className="relative flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-sm font-bold backdrop-blur">
            P
          </div>
          <span className="text-base font-semibold">Plated</span>
        </Link>
        <div className="relative">
          <p className="text-2xl font-semibold leading-snug">
            "Everything from the first enquiry to the final invoice, in one clear view."
          </p>
          <p className="mt-4 text-sm text-white/70">
            Catering companies, their staff, and their clients — one workflow.
          </p>
        </div>
        <div />
      </div>

      <div className="flex flex-1 items-center justify-center bg-canvas px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-2 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-lg font-bold text-white shadow-glow">
              P
            </div>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Welcome back</h1>
          <p className="mt-1 text-sm text-neutral-500">Log in to continue to Plated.</p>

          <form onSubmit={handleSubmit} className="card mt-6 space-y-4 p-6">
            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                required
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? 'Logging in…' : 'Log in'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-neutral-500">
            New here?{' '}
            <Link to="/signup" className="font-medium text-brand-700 hover:underline">
              Create a client account
            </Link>
          </p>
          <p className="mt-2 text-center text-sm text-neutral-500">
            Running a catering business?{' '}
            <Link to="/signup/company" className="font-medium text-brand-700 hover:underline">
              Register your company
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
