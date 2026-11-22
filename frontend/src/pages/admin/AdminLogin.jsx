import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AdminLogin() {
  const { loginAdmin } = useAuth();
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
      await loginAdmin(email.trim(), password);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
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
    <div className="relative min-h-screen flex items-center justify-center bg-[#070b14] overflow-hidden px-4 py-12 selection:bg-emerald-500 selection:text-white">
      {/* Ambient background lighting effects */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[120px]" aria-hidden />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-indigo-600/15 blur-[140px]" aria-hidden />
      
      {/* Subtle modern grid overlay */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }} 
        aria-hidden 
      />

      <div className="relative w-full max-w-md">
        {/* Top Header & Brand Badge */}
        <div className="text-center mb-8 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1 text-xs font-medium text-emerald-400 backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Platform Governance Console
          </div>
          <div className="flex items-center justify-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 text-lg font-black text-white shadow-lg shadow-emerald-500/20">
              P
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white font-display">
              Plated Admin
            </h1>
          </div>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            Restricted access portal for multi-tenant oversight, caterer verifications, and financial settlements.
          </p>
        </div>

        {/* Login Card */}
        <div className="relative rounded-3xl border border-slate-800/80 bg-slate-900/60 p-8 shadow-2xl shadow-black/80 backdrop-blur-xl">
          {error && (
            <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs leading-relaxed text-rose-300 flex items-start gap-3">
              <span className="text-rose-400 text-base leading-none mt-0.5">⚠️</span>
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Administrator Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@plated.com"
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition duration-150"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-slate-400 hover:text-slate-200 transition"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition duration-150"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 hover:from-emerald-500 hover:to-teal-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-50 transition-all duration-150 active:scale-[0.99] flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Authenticating Session...</span>
                </>
              ) : (
                <>
                  <span>Authenticate Console Session</span>
                  <span>→</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Credential Pre-fill Helpers for Dev / Review */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5 text-center">
              Quick Sign-in Presets
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillCredentials('admin@plated.com', 'Admin@1234')}
                className="group flex flex-col items-start rounded-xl border border-slate-800 bg-slate-950/40 p-2.5 text-left hover:border-emerald-500/40 hover:bg-slate-800/40 transition"
              >
                <span className="text-[10px] font-bold text-emerald-400 group-hover:text-emerald-300">Master Admin</span>
                <span className="text-[11px] text-slate-300 font-mono truncate w-full">admin@plated.com</span>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('joeshwaxavier005@gmail.com', 'Admin@1234')}
                className="group flex flex-col items-start rounded-xl border border-slate-800 bg-slate-950/40 p-2.5 text-left hover:border-emerald-500/40 hover:bg-slate-800/40 transition"
              >
                <span className="text-[10px] font-bold text-teal-400 group-hover:text-teal-300">Personal Admin</span>
                <span className="text-[11px] text-slate-300 font-mono truncate w-full">joeshwaxavier005</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer & Back Link */}
        <div className="mt-6 text-center space-y-3">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition"
          >
            <span>←</span>
            <span>Return to User & Employer Sign In</span>
          </Link>
          <div className="text-[11px] text-slate-500 font-mono">
            PLATED OS &middot; 256-bit AES Encrypted &middot; Multi-Tenant Verified
          </div>
        </div>
      </div>
    </div>
  );
}
