import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function CustomerRegister() {
  const { registerCustomer } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    city: '',
    default_delivery_address: '',
    preferred_cuisines: ''
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || null,
        city: form.city.trim() || null,
        default_delivery_address: form.default_delivery_address.trim() || null,
        preferred_cuisines: form.preferred_cuisines
          ? form.preferred_cuisines.split(',').map(s => s.trim()).filter(Boolean)
          : []
      };
      await registerCustomer(payload);
      navigate('/customer', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your information.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Brand Hero Banner */}
      <div className="relative hidden w-[40%] flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-noise opacity-20" aria-hidden />
        <Link to="/" className="relative flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-base font-bold backdrop-blur">
            P
          </div>
          <span className="text-lg font-bold tracking-tight">Plated</span>
        </Link>

        <div className="relative space-y-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-300">
            ✨ Join Plated as a Customer
          </span>
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
            Effortless catering for memorable events.
          </h1>
          <p className="text-sm leading-relaxed text-indigo-200">
            Sign up to discover top-rated catering teams, send direct inquiries, accept custom quotes, and pay securely online.
          </p>

          <ul className="space-y-3 pt-4 border-t border-white/10 text-xs text-indigo-100">
            <li className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>Direct access to verified regional caterers & menus</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>Transparent itemized proposals & milestone billing</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>End-to-end event timeline & guest count tracking</span>
            </li>
          </ul>
        </div>

        <p className="relative text-xs text-indigo-300">
          PLATED Hospitality Network &middot; Customer Gateway
        </p>
      </div>

      {/* Registration Form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-12 lg:px-16 overflow-y-auto">
        <div className="mx-auto w-full max-w-lg space-y-6">
          <div>
            <span className="inline-block rounded-full bg-indigo-50 text-indigo-700 px-3 py-1 text-xs font-semibold uppercase tracking-wider mb-2">
              Customer Registration
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Create your customer account
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Fill in your details below to start booking catering services.
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 flex items-center gap-2">
              <span className="text-sm">⚠️</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jordan Smith"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Contact Phone</label>
                <input
                  type="tel"
                  placeholder="+1 (555) 234-5678"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="jordan@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">City / Location</label>
                <input
                  type="text"
                  placeholder="e.g. Austin, TX"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Preferred Cuisines</label>
                <input
                  type="text"
                  placeholder="e.g. Mediterranean, BBQ, Vegan"
                  value={form.preferred_cuisines}
                  onChange={(e) => setForm({ ...form, preferred_cuisines: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Default Event / Delivery Address</label>
              <textarea
                rows={2}
                placeholder="Street address, building name, special delivery access instructions"
                value={form.default_delivery_address}
                onChange={(e) => setForm({ ...form, default_delivery_address: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-indigo-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {submitting ? 'Creating Account...' : (
                <>
                  <span>Create Customer Account</span>
                  <span>→</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              Already have an account?{' '}
              <Link to="/customer/login" className="font-semibold text-indigo-600 hover:text-indigo-800">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
