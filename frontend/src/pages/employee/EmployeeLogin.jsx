import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function EmployeeLogin() {
  const { loginEmployee } = useAuth();
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
      await loginEmployee(email, password);
      navigate('/employee', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid credentials or inactive account');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-800 to-teal-900 p-10 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-noise opacity-20" aria-hidden />
        <Link to="/" className="relative flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-sm font-bold backdrop-blur">
            P
          </div>
          <span className="text-base font-semibold">Plated</span>
        </Link>
        <div className="relative space-y-4">
          <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
            Workforce Portal
          </span>
          <p className="text-3xl font-bold leading-snug">
            Catering gigs, flexible shifts & transparent earnings.
          </p>
          <p className="text-sm text-white/80">
            Work across multiple catering companies, track your shifts, digital attendance, and payout history.
          </p>
        </div>
        <div className="text-xs text-white/60">Independent Catering Workforce Network</div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-canvas px-4 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Employee Login</h1>
          <p className="mt-1 text-sm text-neutral-500">Sign in to browse shifts and manage attendance.</p>

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
                placeholder="staff@example.com"
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
            <button type="submit" disabled={submitting} className="btn-primary w-full bg-emerald-600 hover:bg-emerald-700">
              {submitting ? 'Signing in…' : 'Log In as Employee'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-neutral-500">
            Looking for catering work?{' '}
            <Link to="/register/employee" className="font-semibold text-emerald-700 hover:underline">
              Register as Employee
            </Link>
          </p>
          <p className="mt-2 text-center text-xs text-neutral-400">
            Are you a caterer?{' '}
            <Link to="/employer/login" className="text-brand-600 hover:underline">
              Log in as Employer
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

