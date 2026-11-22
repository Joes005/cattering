import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function EmployerRegister() {
  const { registerEmployer } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '',
    company_name: '',
    email: '',
    phone: '',
    password: '',
    business_type: 'Full-Service Catering',
    address: '',
    gst_number: '',
    description: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [registeredPending, setRegisteredPending] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await registerEmployer(form);
      if (data.company?.status === 'pending_approval') {
        setRegisteredPending(true);
      } else {
        navigate('/employer', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Unable to register catering business');
    } finally {
      setSubmitting(false);
    }
  }

  if (registeredPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
        <div className="card max-w-md p-8 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-2xl text-amber-600">
            ⏳
          </div>
          <h2 className="text-xl font-bold text-neutral-900">Registration Submitted</h2>
          <p className="text-sm text-neutral-600 leading-relaxed">
            Your catering company <strong>{form.company_name}</strong> has been registered successfully.
            Platform administrators review and verify new catering companies before activation.
          </p>
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
            Status: <span className="font-semibold uppercase tracking-wider">Pending Approval</span>
          </div>
          <p className="text-xs text-neutral-500">
            You will receive access to your business portal once approved by an administrator.
          </p>
          <div className="pt-2">
            <Link to="/employer/login" className="btn-primary w-full block text-center">
              Return to Employer Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-[38%] flex-col justify-between overflow-hidden bg-brand-gradient p-10 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-noise opacity-20" aria-hidden />
        <Link to="/" className="relative flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-sm font-bold backdrop-blur">
            P
          </div>
          <span className="text-base font-semibold">Plated</span>
        </Link>
        <div className="relative space-y-4">
          <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
            Employer Registration
          </span>
          <p className="text-2xl font-bold leading-snug">
            Join the premier network for professional catering companies.
          </p>
          <ul className="space-y-2 text-sm text-white/80">
            <li className="flex items-center gap-2">✓ Full event booking & quotation suite</li>
            <li className="flex items-center gap-2">✓ Direct access to verified catering workforce</li>
            <li className="flex items-center gap-2">✓ Digital attendance tracking & instant payouts</li>
          </ul>
        </div>
        <div className="text-xs text-white/60">Strict Company Isolation & Data Security</div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-canvas px-4 py-8">
        <div className="w-full max-w-lg">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Register Catering Business</h1>
          <p className="mt-1 text-sm text-neutral-500">Submit your business details for platform approval.</p>

          <form onSubmit={handleSubmit} className="card mt-6 space-y-4 p-6">
            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Full Name (Owner)</label>
                <input
                  required
                  className="input"
                  value={form.full_name}
                  onChange={(e) => update('full_name', e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                />
              </div>
              <div>
                <label className="label">Business Name</label>
                <input
                  required
                  className="input"
                  value={form.company_name}
                  onChange={(e) => update('company_name', e.target.value)}
                  placeholder="e.g. Grand Feast Caterers"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Business Email</label>
                <input
                  type="email"
                  required
                  className="input"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  placeholder="owner@caterer.com"
                />
              </div>
              <div>
                <label className="label">Mobile Number</label>
                <input
                  required
                  className="input"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  placeholder="+91-98765-43210"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="input"
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="label">Business Type</label>
                <select
                  className="input"
                  value={form.business_type}
                  onChange={(e) => update('business_type', e.target.value)}
                >
                  <option value="Full-Service Catering">Full-Service Catering</option>
                  <option value="Wedding & Banquet Catering">Wedding & Banquet Catering</option>
                  <option value="Corporate Event Catering">Corporate Event Catering</option>
                  <option value="Buffet & Drop-off Catering">Buffet & Drop-off Catering</option>
                  <option value="Institutional & Industrial">Institutional & Industrial</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Business Address</label>
              <input
                className="input"
                value={form.address}
                onChange={(e) => update('address', e.target.value)}
                placeholder="Street address, City, State, PIN"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">GST Number (Optional)</label>
                <input
                  className="input"
                  value={form.gst_number}
                  onChange={(e) => update('gst_number', e.target.value)}
                  placeholder="e.g. 33AAAAA0000A1Z5"
                />
              </div>
              <div>
                <label className="label">Short Description (Optional)</label>
                <input
                  className="input"
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  placeholder="Specialities, cuisines, capacity"
                />
              </div>
            </div>

            <button type="submit" disabled={submitting} className="btn-primary w-full mt-2">
              {submitting ? 'Submitting Registration…' : 'Submit for Admin Approval'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-neutral-500">
            Already registered?{' '}
            <Link to="/employer/login" className="font-semibold text-brand-700 hover:underline">
              Log in to Employer Portal
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

