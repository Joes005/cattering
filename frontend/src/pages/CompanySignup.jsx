import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const EMPTY_FORM = { name: '', owner_name: '', owner_email: '', owner_password: '', gst_number: '', currency: 'INR' };

export default function CompanySignup() {
  const { signupCompany } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signupCompany(form);
      navigate('/company', { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to register your company');
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
        <div className="relative space-y-4">
          <p className="text-2xl font-semibold leading-snug">Bring your catering business online.</p>
          <ul className="space-y-2 text-sm text-white/80">
            <li className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[11px]">✓</span>
              Manage enquiries, quotations and bookings
            </li>
            <li className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[11px]">✓</span>
              Assign staff and track inventory
            </li>
            <li className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[11px]">✓</span>
              Invoice, collect payments, and report on revenue
            </li>
          </ul>
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
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Register your company</h1>
          <p className="mt-1 text-sm text-neutral-500">Set up your catering business on Plated — free to start.</p>

          <form onSubmit={handleSubmit} className="card mt-6 space-y-4 p-6">
            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <div>
              <label className="label">Company name</label>
              <input required className="input" value={form.name} onChange={(e) => update('name', e.target.value)} />
            </div>
            <div>
              <label className="label">Your name</label>
              <input
                required
                className="input"
                value={form.owner_name}
                onChange={(e) => update('owner_name', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Work email</label>
              <input
                type="email"
                required
                className="input"
                value={form.owner_email}
                onChange={(e) => update('owner_email', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                required
                minLength={6}
                className="input"
                value={form.owner_password}
                onChange={(e) => update('owner_password', e.target.value)}
              />
            </div>
            <div>
              <label className="label">GST number (optional)</label>
              <input className="input" value={form.gst_number} onChange={(e) => update('gst_number', e.target.value)} />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? 'Setting up your company…' : 'Create company account'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-neutral-500">
            Looking to book an event instead?{' '}
            <Link to="/signup" className="font-medium text-brand-700 hover:underline">
              Sign up as a client
            </Link>
          </p>
          <p className="mt-2 text-center text-sm text-neutral-500">
            Already registered?{' '}
            <Link to="/login" className="font-medium text-brand-700 hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
