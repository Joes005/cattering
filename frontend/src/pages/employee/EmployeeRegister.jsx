import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const SKILL_OPTIONS = [
  'Head Chef',
  'Sous Chef',
  'Line Cook',
  'Tandoor / Grill',
  'Pastry / Sweets',
  'Service Captain',
  'Waiter / Waitress',
  'Bartender',
  'Buffet Attendant',
  'Kitchen Assistant',
  'Dishwasher & Cleaning',
  'Logistics / Setup',
];

export default function EmployeeRegister() {
  const { registerEmployee } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    location: '',
    hourly_rate: 150,
    skills: ['Waiter / Waitress'],
    bio: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleSkill(skill) {
    setForm((f) => {
      const exists = f.skills.includes(skill);
      const skills = exists ? f.skills.filter((s) => s !== skill) : [...f.skills, skill];
      return { ...f, skills };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.skills.length === 0) {
      setError('Please select at least one skill or service specialty.');
      return;
    }
    setSubmitting(true);
    try {
      await registerEmployee({
        ...form,
        hourly_rate: parseFloat(form.hourly_rate) || 0,
      });
      navigate('/employee', { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to register employee profile');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-[38%] flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-800 to-teal-900 p-10 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-noise opacity-20" aria-hidden />
        <Link to="/" className="relative flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-sm font-bold backdrop-blur">
            P
          </div>
          <span className="text-base font-semibold">Plated</span>
        </Link>
        <div className="relative space-y-4">
          <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
            Employee Network
          </span>
          <p className="text-2xl font-bold leading-snug">
            Find reliable catering shifts with top employers.
          </p>
          <ul className="space-y-2 text-sm text-white/80">
            <li className="flex items-center gap-2">✓ Browse shifts across multiple catering companies</li>
            <li className="flex items-center gap-2">✓ Set your own hourly rate & work availability</li>
            <li className="flex items-center gap-2">✓ Instant check-in/out and verified payout history</li>
          </ul>
        </div>
        <div className="text-xs text-white/60">Independent Workforce Mobility</div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-canvas px-4 py-8">
        <div className="w-full max-w-lg">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Workforce Registration</h1>
          <p className="mt-1 text-sm text-neutral-500">Create your profile to start receiving catering shifts.</p>

          <form onSubmit={handleSubmit} className="card mt-6 space-y-4 p-6">
            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Full Name</label>
                <input
                  required
                  className="input"
                  value={form.full_name}
                  onChange={(e) => update('full_name', e.target.value)}
                  placeholder="e.g. Suresh Kumar"
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
                <label className="label">Email Address</label>
                <input
                  type="email"
                  required
                  className="input"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  placeholder="suresh@example.com"
                />
              </div>
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
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">City / Location</label>
                <input
                  required
                  className="input"
                  value={form.location}
                  onChange={(e) => update('location', e.target.value)}
                  placeholder="e.g. Chennai, Bangalore"
                />
              </div>
              <div>
                <label className="label">Expected Hourly Rate (₹ / hr)</label>
                <input
                  type="number"
                  min="50"
                  step="10"
                  required
                  className="input"
                  value={form.hourly_rate}
                  onChange={(e) => update('hourly_rate', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="label">Skills & Roles (Select all that apply)</label>
              <div className="mt-1 flex flex-wrap gap-2">
                {SKILL_OPTIONS.map((skill) => {
                  const selected = form.skills.includes(skill);
                  return (
                    <button
                      type="button"
                      key={skill}
                      onClick={() => toggleSkill(skill)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                        selected
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                      }`}
                    >
                      {skill}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="label">Short Bio / Catering Experience</label>
              <textarea
                rows={2}
                className="input"
                value={form.bio}
                onChange={(e) => update('bio', e.target.value)}
                placeholder="Years of experience, special events handled, languages spoken"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full mt-2 bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting ? 'Creating Profile…' : 'Complete Registration'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-neutral-500">
            Already registered?{' '}
            <Link to="/employee/login" className="font-semibold text-emerald-700 hover:underline">
              Log in to Employee Portal
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

