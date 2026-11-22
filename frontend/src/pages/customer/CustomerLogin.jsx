import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function CustomerLogin() {
  const { loginCustomer } = useAuth();
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
      await loginCustomer(email, password);
      navigate('/customer', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid credentials or inactive customer account');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Brand Hero Banner */}
      <div className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-noise opacity-20" aria-hidden />
        <Link to="/" className="relative flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-base font-bold backdrop-blur">
            P
          </div>
          <span className="text-lg font-bold tracking-tight">Plated</span>
        </Link>

        <div className="relative space-y-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-300">
            ✨ Customer & Event Host Portal
          </span>
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
            Book premier caterers for your private events.
          </h1>
          <p className="text-sm leading-relaxed text-indigo-200">
            Browse verified catering companies, request customized menus, review transparent itemized quotations, and manage milestones seamlessly.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
            <div className="flex items-start gap-3">
              <span className="text-xl">🍽️</span>
              <div>
                <p className="text-xs font-semibold text-white">Curated Menus</p>
                <p className="text-xs text-indigo-200">Tailored dietary & package options</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl">🛡️</span>
              <div>
                <p className="text-xs font-semibold text-white">Secure Escrow</p>
                <p className="text-xs text-indigo-200">Milestone-based verified billing</p>
              </div>
            </div>
          </div>
        </div>

        <p className="relative text-xs text-indigo-300">
          PLATED Hospitality Network &middot; Customer Gateway
        </p>
      </div>

      {/* Login Form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-md space-y-8">
          <div>
            <span className="inline-block rounded-full bg-indigo-50 text-indigo-700 px-3 py-1 text-xs font-semibold uppercase tracking-wider mb-3">
              Customer Sign In
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Welcome back
            </h2>
            <p className="mt-2 text-xs text-gray-500">
              Sign in to track your event inquiries, approve quotations, and manage payments.
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 flex items-center gap-2">
              <span className="text-sm">⚠️</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-indigo-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? 'Authenticating...' : (
                <>
                  <span>Sign In as Customer</span>
                  <span>→</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-gray-200 space-y-3 text-center">
            <p className="text-xs text-gray-500">
              New to PLATED?{' '}
              <Link to="/register/customer" className="font-semibold text-indigo-600 hover:text-indigo-800">
                Create a free customer account
              </Link>
            </p>
            <p className="text-xs text-gray-400">
              Catering business owner?{' '}
              <Link to="/login" className="font-medium text-gray-600 hover:text-gray-900 underline">
                Employer Login
              </Link>
              {' '}&middot;{' '}
              Freelance hospitality worker?{' '}
              <Link to="/employee/login" className="font-medium text-gray-600 hover:text-gray-900 underline">
                Employee Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
