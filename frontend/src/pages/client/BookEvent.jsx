import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { companiesApi } from '../../api/companies';
import { eventsApi } from '../../api/events';
import { SkeletonRows } from '../../components/Skeleton';

const EVENT_TYPES = [
  'Wedding',
  'Reception',
  'Birthday',
  'Corporate Event',
  'Engagement',
  'Conference',
  'Party',
  'Festival',
  'Private Function',
  'Other',
];

const CATERING_OPTIONS = [
  { value: 'veg', label: 'Vegetarian' },
  { value: 'non_veg', label: 'Non-Vegetarian' },
  { value: 'mixed', label: 'Mixed' },
  { value: 'jain', label: 'Jain' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'custom', label: 'Custom' },
];

const EMPTY_FORM = {
  event_type: 'Wedding',
  event_date: '',
  guest_count: '',
  venue_name: '',
  venue_address: '',
  catering_requirement: 'mixed',
  special_instructions: '',
};

export default function BookEvent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: companies, isLoading } = useQuery({ queryKey: ['companies', 'public'], queryFn: companiesApi.listPublic });

  const [step, setStep] = useState(1);
  const [companyId, setCompanyId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: () =>
      eventsApi.createMine({
        company_id: companyId,
        ...form,
        guest_count: Number(form.guest_count),
        event_date: new Date(form.event_date).toISOString(),
      }),
    onSuccess: (event) => {
      queryClient.invalidateQueries({ queryKey: ['me', 'events'] });
      navigate(`/client/events/${event.id}`, { replace: true });
    },
    onError: (err) => setError(err.message),
  });

  const selectedCompany = companies?.find((c) => c.id === companyId);

  return (
    <div className="mx-auto max-w-xl">
      <h2 className="mb-1 text-2xl font-semibold text-neutral-900">Book an event</h2>
      <p className="mb-6 text-neutral-500">Tell us about your event and we'll get a caterer to quote you.</p>

      <div className="mb-6 flex items-center gap-2 text-xs font-medium text-neutral-400">
        {['Caterer', 'Event details', 'Review'].map((label, i) => (
          <span key={label} className={`flex items-center gap-2 ${step === i + 1 ? 'text-brand-700' : ''}`}>
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                step > i + 1 ? 'bg-brand-600 text-white' : step === i + 1 ? 'bg-brand-100 text-brand-700' : 'bg-neutral-100'
              }`}
            >
              {i + 1}
            </span>
            {label}
            {i < 2 && <span className="mx-1 text-neutral-300">—</span>}
          </span>
        ))}
      </div>

      {step === 1 && (
        <div className="card space-y-3 p-5">
          {isLoading ? (
            <SkeletonRows rows={2} />
          ) : companies.length === 0 ? (
            <p className="text-sm text-neutral-500">No catering companies are available to book with yet.</p>
          ) : (
            companies.map((c) => (
              <button
                key={c.id}
                onClick={() => setCompanyId(c.id)}
                className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                  companyId === c.id ? 'border-brand-600 bg-brand-50' : 'border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                <span className="font-medium text-neutral-900">{c.name}</span>
                {companyId === c.id && <span className="text-brand-700">Selected</span>}
              </button>
            ))
          )}
          <button className="btn-primary w-full" disabled={!companyId} onClick={() => setStep(2)}>
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setStep(3);
          }}
          className="card grid gap-4 p-5"
        >
          <div>
            <label className="label">Event type</label>
            <select className="input" value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })}>
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Event date &amp; time</label>
              <input
                type="datetime-local"
                required
                className="input"
                value={form.event_date}
                onChange={(e) => setForm({ ...form, event_date: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Number of guests</label>
              <input
                type="number"
                required
                min={1}
                className="input"
                value={form.guest_count}
                onChange={(e) => setForm({ ...form, guest_count: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Venue name</label>
            <input className="input" value={form.venue_name} onChange={(e) => setForm({ ...form, venue_name: e.target.value })} />
          </div>
          <div>
            <label className="label">Venue address</label>
            <input
              className="input"
              value={form.venue_address}
              onChange={(e) => setForm({ ...form, venue_address: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Catering requirement</label>
            <div className="grid grid-cols-3 gap-2">
              {CATERING_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setForm({ ...form, catering_requirement: opt.value })}
                  className={`rounded-lg border px-2 py-2 text-xs font-medium ${
                    form.catering_requirement === opt.value
                      ? 'border-brand-600 bg-brand-50 text-brand-700'
                      : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Special instructions</label>
            <textarea
              rows={3}
              className="input"
              value={form.special_instructions}
              onChange={(e) => setForm({ ...form, special_instructions: e.target.value })}
            />
          </div>
          <div className="flex gap-3">
            <button type="button" className="btn-secondary" onClick={() => setStep(1)}>
              Back
            </button>
            <button type="submit" className="btn-primary flex-1">
              Review request
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <div className="card space-y-4 p-5">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <dl className="space-y-2 text-sm">
            <Row label="Caterer" value={selectedCompany?.name} />
            <Row label="Event type" value={form.event_type} />
            <Row label="Date & time" value={form.event_date ? new Date(form.event_date).toLocaleString() : '—'} />
            <Row label="Guests" value={form.guest_count} />
            <Row label="Venue" value={form.venue_name || '—'} />
            <Row label="Catering" value={CATERING_OPTIONS.find((o) => o.value === form.catering_requirement)?.label} />
          </dl>
          <div className="flex gap-3">
            <button type="button" className="btn-secondary" onClick={() => setStep(2)}>
              Back
            </button>
            <button
              type="button"
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate()}
              className="btn-primary flex-1"
            >
              {createMutation.isPending ? 'Sending…' : 'Send booking request'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between border-b border-neutral-100 pb-2">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="font-medium text-neutral-900">{value}</dd>
    </div>
  );
}
