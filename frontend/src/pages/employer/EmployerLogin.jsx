import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function EmployerLogin() {
  const { loginEmployer } = useAuth();
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
      await loginEmployer(email.trim(), password);
      navigate('/employer', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid credentials or company pending approval');
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
      <div className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-brand-gradient p-10 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-noise opacity-20" aria-hidden />
        <Link to="/" className="relative flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-sm font-bold backdrop-blur">
            P
          </div>
          <span className="text-base font-semibold">Plated</span>
        </Link>
        <div className="relative space-y-4">
          <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
            Employer Portal
          </span>
          <p className="text-3xl font-bold leading-snug">
            Manage your catering business & workforce seamlessly.
          </p>
          <p className="text-sm text-white/80">
            From event bookings and itemized quotations to staff marketplace hiring and attendance payouts.
          </p>
        </div>
        <div className="text-xs text-white/60">© Plated Catering Operating System</div>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Employer Login</h1>
            <p className="mt-1 text-xs text-neutral-500">Sign in to manage your catering business.</p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-start gap-2">
              <span className="text-red-500 mt-0.5">⚠️</span>
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="card space-y-4 p-6 shadow-sm">
            <div>
              <label className="label">Business Email</label>
              <input
                type="email"
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@caterer.com"
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
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? 'Signing in…' : 'Log In as Employer'}
            </button>

            {/* Quick-fill preset */}
            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
              <span className="text-neutral-400 font-medium">Demo Employer:</span>
              <button
                type="button"
                onClick={() => fillCredentials('owner@grandregency.com', 'Owner@123')}
                className="text-brand-700 font-semibold hover:underline"
              >
                Fill Credentials →
              </button>
            </div>
          </form>

          <div className="text-center space-y-2">
            <p className="text-xs text-neutral-500">
              New catering business?{' '}
              <Link to="/register/employer" className="font-semibold text-brand-700 hover:underline">
                Register your business
              </Link>
            </p>
            <p className="text-xs text-neutral-400">
              Looking for catering shifts?{' '}
              <Link to="/employee/login" className="text-neutral-600 hover:underline">
                Log in as Employee
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
