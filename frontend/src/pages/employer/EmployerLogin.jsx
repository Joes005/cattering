import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function EmployerLogin() {
  const { loginEmployer } = useAuth();
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
      await loginEmployer(email, password);
      navigate('/employer', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid credentials or company suspended');
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

      <div className="flex flex-1 items-center justify-center bg-canvas px-4 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Employer Login</h1>
          <p className="mt-1 text-sm text-neutral-500">Sign in to manage your catering business.</p>

          <form onSubmit={handleSubmit} className="card mt-6 space-y-4 p-6">
            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
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
              {submitting ? 'Signing in…' : 'Log In as Employer'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-neutral-500">
            New catering business?{' '}
            <Link to="/register/employer" className="font-semibold text-brand-700 hover:underline">
              Register your business
            </Link>
          </p>
          <p className="mt-2 text-center text-xs text-neutral-400">
            Are you looking for work?{' '}
            <Link to="/employee/login" className="text-brand-600 hover:underline">
              Log in as Employee
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

