import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function EmployeeLogin() {
  const { loginEmployee } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await loginEmployee(email.trim(), password);
      navigate('/employee', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid credentials or inactive account');
    } finally {
      setSubmitting(false);
    }
  }

  const fillCredentials = (fillEmail, fillPass) => {
    setEmail(fillEmail);
    setPassword(fillPass);
    setError('');
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
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

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Employee Login</h1>
            <p className="mt-1 text-xs text-neutral-500">Sign in to browse shifts and manage attendance.</p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-start gap-2">
              <span className="text-red-500 mt-0.5">⚠️</span>
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="card space-y-4 p-6 shadow-sm">
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
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">Password</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-neutral-400 hover:text-neutral-600 transition"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary w-full bg-emerald-700 hover:bg-emerald-800">
              {submitting ? 'Authenticating…' : 'Log In as Employee'}
            </button>

            {/* Quick-fill preset */}
            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
              <span className="text-neutral-400 font-medium">Demo Staff:</span>
              <button
                type="button"
                onClick={() => fillCredentials('rahul.chef@grandregency.com', 'Password@123')}
                className="text-emerald-700 font-semibold hover:underline"
              >
                Fill Credentials →
              </button>
            </div>
          </form>

          <div className="text-center space-y-2">
            <p className="text-xs text-neutral-500">
              New to Plated workforce?{' '}
              <Link to="/register/employee" className="font-semibold text-emerald-700 hover:underline">
                Create staff profile
              </Link>
            </p>
            <p className="text-xs text-neutral-400">
              Catering business owner?{' '}
              <Link to="/employer/login" className="text-neutral-600 hover:underline">
                Log in as Employer
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
