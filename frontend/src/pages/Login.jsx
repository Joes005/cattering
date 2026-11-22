import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { roleHome } from '../router/guards';

export default function Login() {
  const { login } = useAuth();
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
      const user = await login(email.trim(), password);
      navigate(roleHome(user.role || user.global_role), { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to log in. Please check your credentials.');
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
      {/* Brand Hero Panel */}
      <div className="relative hidden w-[44%] flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-900 via-neutral-900 to-emerald-950 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-noise opacity-20" aria-hidden />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" aria-hidden />
        
        <Link to="/" className="relative flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-base font-bold text-white shadow-lg shadow-emerald-500/20">
            P
          </div>
          <span className="text-lg font-bold tracking-tight">Plated</span>
        </Link>

        <div className="relative space-y-6 max-w-md">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Hospitality OS & Marketplace
          </span>
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl text-white">
            "Everything from the first enquiry to the final invoice, in one clear view."
          </h2>
          <p className="text-sm leading-relaxed text-slate-300">
            Unified catering business operations, automated quotes, flexible staff marketplace, and customer event bookings.
          </p>

          <div className="pt-4 border-t border-white/10 grid grid-cols-2 gap-4 text-xs text-slate-300">
            <div>
              <p className="font-semibold text-white">Multi-Business</p>
              <p className="text-[11px] text-slate-400">Manage multiple catering ventures</p>
            </div>
            <div>
              <p className="font-semibold text-white">Verified Workforce</p>
              <p className="text-[11px] text-slate-400">On-demand freelance staff</p>
            </div>
          </div>
        </div>

        <div className="relative flex items-center justify-between text-xs text-slate-400">
          <span>4-Role Hybrid SaaS & Marketplace</span>
          <span className="font-mono text-[11px]">v2.4 Production</span>
        </div>
      </div>

      {/* Login Form Panel */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-12 lg:px-16">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Welcome to Plated
            </h1>
            <p className="text-xs text-slate-500">
              Sign in with your registered account credentials to access your portal.
            </p>
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 flex items-start gap-2.5">
              <span className="text-rose-500 text-sm mt-0.5">⚠️</span>
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-7">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-slate-400 hover:text-slate-600 transition"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-emerald-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-1"
            >
              {submitting ? 'Authenticating…' : (
                <>
                  <span>Sign In to Dashboard</span>
                  <span>→</span>
                </>
              )}
            </button>

            {/* Quick-fill testing presets */}
            <div className="pt-4 border-t border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                1-Click Demo Sign-in
              </p>
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <button
                  type="button"
                  onClick={() => fillCredentials('owner@grandregency.com', 'Owner@123')}
                  className="px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition"
                >
                  🏢 Employer
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials('rahul.chef@grandregency.com', 'Password@123')}
                  className="px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition"
                >
                  🧑‍🍳 Staff
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials('customer_cbd3def8@platedtest.com', 'Password@123')}
                  className="px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition"
                >
                  ✨ Customer
                </button>
              </div>
            </div>
          </form>

          {/* New Account Registration Links */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center">
              New to Plated? Register your account
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

          <div className="text-center pt-2">
            <Link to="/admin/login" className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition flex items-center justify-center gap-1">
              <span>🛡️</span>
              <span>Platform Governance & Admin Console →</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
