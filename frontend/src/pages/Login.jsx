import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { roleHome } from '../router/guards';

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
      const user = await login(email, password);
      navigate(roleHome(user.role || user.global_role), { replace: true });
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
            Catering business operations & flexible workforce marketplace — built for scale.
          </p>
        </div>
        <div className="text-xs text-white/60">3-Role Unified Architecture</div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-canvas px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex flex-col items-center gap-2 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-lg font-bold text-white shadow-glow">
              P
            </div>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Welcome to Plated</h1>
          <p className="mt-1 text-sm text-neutral-500">Log in with your account credentials.</p>

          <form onSubmit={handleSubmit} className="card mt-6 space-y-4 p-6">
            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
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
              {submitting ? 'Authenticating…' : 'Log In'}
            </button>
          </form>

          <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              New to Plated? Register your account:
            </p>
            <div className="grid grid-cols-3 gap-2">
              <Link
                to="/register/employer"
                className="flex flex-col items-center justify-center rounded-xl border border-brand-200 bg-brand-50/50 p-2 text-center text-xs font-medium text-brand-800 hover:bg-brand-100/60 transition"
              >
                <span className="text-base">🏢</span>
                <span className="mt-1 font-semibold text-[11px] leading-tight">Employer</span>
                <span className="text-[9px] text-brand-600">Business</span>
              </Link>
              <Link
                to="/register/employee"
                className="flex flex-col items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50/50 p-2 text-center text-xs font-medium text-emerald-800 hover:bg-emerald-100/60 transition"
              >
                <span className="text-base">🧑‍🍳</span>
                <span className="mt-1 font-semibold text-[11px] leading-tight">Staff</span>
                <span className="text-[9px] text-emerald-600">Workforce</span>
              </Link>
              <Link
                to="/register/customer"
                className="flex flex-col items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50/50 p-2 text-center text-xs font-medium text-indigo-800 hover:bg-indigo-100/60 transition"
              >
                <span className="text-base">✨</span>
                <span className="mt-1 font-semibold text-[11px] leading-tight">Customer</span>
                <span className="text-[9px] text-indigo-600">Book Events</span>
              </Link>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-neutral-400">
            <Link to="/customer/login" className="hover:text-indigo-600 transition">
              Customer Sign In →
            </Link>
            <span>&middot;</span>
            <Link to="/admin" className="hover:text-neutral-700 transition">
              Admin Login →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
