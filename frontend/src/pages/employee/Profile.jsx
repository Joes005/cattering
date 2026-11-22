import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { employeeApi } from '../../api/employeeApi';
import { useAuth } from '../../context/AuthContext';
import { SkeletonRows } from '../../components/Skeleton';
import { formatCurrency } from '../../lib/format';

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

export default function EmployeeProfile() {
  const { user, refresh } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    skills: [],
    bio: '',
    hourly_rate: 150,
    location: '',
    is_available: true,
  });
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['employee-profile'],
    queryFn: employeeApi.getProfile,
  });

  useEffect(() => {
    if (profile) {
      setForm({
        skills: profile.skills || [],
        bio: profile.bio || '',
        hourly_rate: profile.hourly_rate || 150,
        location: profile.location || '',
        is_available: profile.is_available ?? true,
      });
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: () =>
      employeeApi.updateProfile({
        ...form,
        hourly_rate: parseFloat(form.hourly_rate) || 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-profile'] });
      refresh();
      setSuccessMsg('Profile updated successfully!');
      setErrorMsg('');
      setTimeout(() => setSuccessMsg(''), 4000);
    },
    onError: (err) => setErrorMsg(err.message),
  });

  function toggleSkill(skill) {
    setForm((f) => {
      const exists = f.skills.includes(skill);
      const skills = exists ? f.skills.filter((s) => s !== skill) : [...f.skills, skill];
      return { ...f, skills };
    });
  }

  if (isLoading) return <SkeletonRows rows={6} />;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Workforce Profile</h2>
        <p className="text-xs text-neutral-500">
          Manage your skills, preferred hourly rate, and availability for catering employers
        </p>
      </div>

      {successMsg && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800">
          ✓ {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-medium text-red-700">
          ✕ {errorMsg}
        </div>
      )}

      {/* Account Info Card */}
      <div className="card p-5">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-xl font-bold text-emerald-800">
            {user?.full_name?.[0]?.toUpperCase() || 'W'}
          </span>
          <div>
            <h3 className="text-base font-bold text-neutral-900">{user?.full_name}</h3>
            <p className="text-xs text-neutral-500">{user?.email} {user?.phone && `· ${user.phone}`}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                ⭐ {profile?.rating || '5.0'} Rating
              </span>
              <span className="text-xs text-neutral-500">
                Expected Rate: <strong>{formatCurrency(form.hourly_rate)}/hr</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateMutation.mutate();
        }}
        className="card p-6 space-y-5"
      >
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <span className="text-sm font-semibold text-neutral-900">Work Availability</span>
            <p className="text-xs text-neutral-500">
              When turned on, catering employers can find and assign you to events
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={form.is_available}
              onChange={(e) => setForm({ ...form, is_available: e.target.checked })}
            />
            <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Base Location / City</label>
            <input
              required
              className="input"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
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
              onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="label">Skills & Service Specialties</label>
          <div className="mt-1.5 flex flex-wrap gap-2">
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
          <label className="label">Catering Experience & Bio</label>
          <textarea
            rows={3}
            className="input"
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            placeholder="Describe your hospitality background, banquets worked, punctuality…"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="btn-primary w-full bg-emerald-600 hover:bg-emerald-700"
          >
            {updateMutation.isPending ? 'Saving Profile…' : 'Save Profile Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

