import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { customerApi } from '../../api/customerApi';

const EVENT_TYPES = [
  'Wedding',
  'Reception',
  'Birthday',
  'Corporate Gala',
  'Engagement',
  'Conference',
  'Private Function',
  'Festival Celebration',
  'Housewarming',
  'Other',
];

export default function CustomerBookEvent() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const preselectedCatererId = searchParams.get('caterer_id') || '';
  const preselectedCatererName = searchParams.get('caterer_name') || '';

  const { data: caterers } = useQuery({
    queryKey: ['customer-caterers'],
    queryFn: () => customerApi.listCaterers(),
  });

  const [form, setForm] = useState({
    company_id: preselectedCatererId,
    title: '',
    event_type: 'Wedding',
    event_date: '',
    guest_count: 100,
    venue_name: '',
    venue_address: '',
    catering_requirement: 'mixed',
    special_instructions: '',
  });

  const [errorMsg, setErrorMsg] = useState('');

  const submitMutation = useMutation({
    mutationFn: (payload) =>
      customerApi.submitInquiry({
        ...payload,
        guest_count: parseInt(payload.guest_count, 10) || 100,
        event_date: new Date(payload.event_date).toISOString(),
      }),
    onSuccess: (data) => {
      navigate(`/customer/events/${data.id}`);
    },
    onError: (err) => {
      setErrorMsg(err.message || 'Failed to submit catering inquiry');
    },
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.company_id) {
      setErrorMsg('Please select a catering company.');
      return;
    }
    if (!form.event_date) {
      setErrorMsg('Please specify the date of the event.');
      return;
    }
    setErrorMsg('');
    submitMutation.mutate(form);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-neutral-900">Request Catering Proposal</h2>
        <p className="text-xs text-neutral-500">
          Share your event specifications with the caterer to receive an itemized quotation
        </p>
      </div>

      {errorMsg && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs font-semibold text-red-700">
          ✕ {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        {/* Caterer Selection */}
        <div>
          <label className="block text-xs font-bold text-neutral-700 mb-1">
            Selected Catering Company *
          </label>
          <select
            required
            className="input text-xs"
            value={form.company_id}
            onChange={(e) => setForm({ ...form, company_id: e.target.value })}
          >
            <option value="">Choose a caterer…</option>
            {(caterers || []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.business_type || 'Catering'})
              </option>
            ))}
          </select>
        </div>

        {/* Event Title */}
        <div>
          <label className="block text-xs font-bold text-neutral-700 mb-1">
            Event Title / Occasion *
          </label>
          <input
            required
            type="text"
            placeholder="e.g. Anand & Divya Wedding Reception"
            className="input text-xs"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Event Type */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">Event Type *</label>
            <select
              className="input text-xs"
              value={form.event_type}
              onChange={(e) => setForm({ ...form, event_type: e.target.value })}
            >
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Guest Count */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">Estimated Guests *</label>
            <input
              required
              type="number"
              min="10"
              max="10000"
              className="input text-xs"
              value={form.guest_count}
              onChange={(e) => setForm({ ...form, guest_count: e.target.value })}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Event Date & Time */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">Event Date & Time *</label>
            <input
              required
              type="datetime-local"
              className="input text-xs"
              value={form.event_date}
              onChange={(e) => setForm({ ...form, event_date: e.target.value })}
            />
          </div>

          {/* Catering Requirement */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">Dietary Requirement *</label>
            <select
              className="input text-xs"
              value={form.catering_requirement}
              onChange={(e) => setForm({ ...form, catering_requirement: e.target.value })}
            >
              <option value="mixed">Mixed (Pure Veg & Non-Veg Counters)</option>
              <option value="veg">Pure Vegetarian Only</option>
              <option value="non_veg">Non-Vegetarian Specialized</option>
              <option value="jain">Jain Friendly / Sattvic</option>
              <option value="vegan">Vegan Dining</option>
              <option value="custom">Custom Regional Specialties</option>
            </select>
          </div>
        </div>

        {/* Venue Information */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">Venue / Banquet Hall</label>
            <input
              type="text"
              placeholder="e.g. Mayor Ramanathan Chettiar Hall"
              className="input text-xs"
              value={form.venue_name}
              onChange={(e) => setForm({ ...form, venue_name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">Venue Address / Location</label>
            <input
              type="text"
              placeholder="e.g. Santhome High Road, Mylapore, Chennai"
              className="input text-xs"
              value={form.venue_address}
              onChange={(e) => setForm({ ...form, venue_address: e.target.value })}
            />
          </div>
        </div>

        {/* Special Instructions */}
        <div>
          <label className="block text-xs font-bold text-neutral-700 mb-1">
            Menu Preferences & Special Instructions
          </label>
          <textarea
            rows={3}
            placeholder="e.g. Looking for welcome mocktails, live chaat counter, traditional banana leaf lunch, and evening dessert buffet..."
            className="input text-xs"
            value={form.special_instructions}
            onChange={(e) => setForm({ ...form, special_instructions: e.target.value })}
          />
        </div>

        {/* Actions */}
        <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/customer')}
            className="rounded-xl px-4 py-2.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitMutation.isPending}
            className="rounded-xl bg-brand-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-brand-700 shadow-sm disabled:opacity-50 transition"
          >
            {submitMutation.isPending ? 'Submitting Inquiry…' : 'Submit Catering Inquiry →'}
          </button>
        </div>
      </form>
    </div>
  );
}

