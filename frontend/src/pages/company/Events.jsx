import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '../../api/events';
import { customersApi } from '../../api/customers';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import { SkeletonRows } from '../../components/Skeleton';
import { useAuth } from '../../context/AuthContext';

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

const EMPTY_FORM = {
  customer_id: '',
  title: '',
  event_type: 'Wedding',
  event_date: '',
  guest_count: '',
  venue_name: '',
  venue_address: '',
  catering_requirement: 'mixed',
};

export default function CompanyEvents() {
  const { currentCompanyId } = useAuth();
  const queryClient = useQueryClient();
  const { data: events, isLoading } = useQuery({
    queryKey: ['events', currentCompanyId],
    queryFn: () => eventsApi.listForCompany(currentCompanyId),
    enabled: !!currentCompanyId,
  });
  const { data: customers } = useQuery({
    queryKey: ['customers', currentCompanyId],
    queryFn: () => customersApi.list(currentCompanyId),
    enabled: !!currentCompanyId,
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  const submitMutation = useMutation({
    mutationFn: () =>
      eventsApi.createForCompany(currentCompanyId, {
        ...form,
        title: form.title || `${form.event_type} for ${form.guest_count} guests`,
        guest_count: Number(form.guest_count),
        event_date: new Date(form.event_date).toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', currentCompanyId] });
      setShowForm(false);
      setForm(EMPTY_FORM);
      setError('');
    },
    onError: (err) => setError(err.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Events</h2>
          <p className="text-xs text-neutral-500">Scheduled catering events and bookings</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ New Event'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitMutation.mutate();
          }}
          className="card grid gap-3 p-5 sm:grid-cols-2"
        >
          {error && <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div>
            <label className="label">Customer *</label>
            <select
              required
              className="input"
              value={form.customer_id}
              onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
            >
              <option value="">Select a customer…</option>
              {(customers || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Event Title (Optional)</label>
            <input
              className="input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Sharma Wedding Banquet"
            />
          </div>
          <div>
            <label className="label">Event Type</label>
            <select className="input" value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })}>
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Event Date &amp; Time</label>
            <input
              type="datetime-local"
              required
              className="input"
              value={form.event_date}
              onChange={(e) => setForm({ ...form, event_date: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Expected Guests</label>
            <input
              type="number"
              min={1}
              required
              className="input"
              value={form.guest_count}
              onChange={(e) => setForm({ ...form, guest_count: e.target.value })}
              placeholder="e.g. 250"
            />
          </div>
          <div>
            <label className="label">Catering Requirement</label>
            <select
              className="input"
              value={form.catering_requirement}
              onChange={(e) => setForm({ ...form, catering_requirement: e.target.value })}
            >
              <option value="veg">Vegetarian Only</option>
              <option value="non_veg">Non-Vegetarian Only</option>
              <option value="mixed">Mixed (Veg & Non-Veg)</option>
              <option value="jain">Jain Friendly</option>
            </select>
          </div>
          <div>
            <label className="label">Venue Name</label>
            <input
              className="input"
              value={form.venue_name}
              onChange={(e) => setForm({ ...form, venue_name: e.target.value })}
              placeholder="e.g. Royal Palace Hall"
            />
          </div>
          <div>
            <label className="label">Venue Address</label>
            <input
              className="input"
              value={form.venue_address}
              onChange={(e) => setForm({ ...form, venue_address: e.target.value })}
              placeholder="Full address"
            />
          </div>
          <button type="submit" disabled={submitMutation.isPending} className="btn-primary sm:col-span-2 sm:w-fit">
            {submitMutation.isPending ? 'Creating…' : 'Create Event'}
          </button>
        </form>
      )}

      {isLoading ? (
        <SkeletonRows />
      ) : !events || events.length === 0 ? (
        <EmptyState title="No events yet" description="Events created for your customers will show up here." />
      ) : (
        <div className="card divide-y divide-neutral-100">
          {events.map((event) => (
            <Link
              key={event.id}
              to={`/employer/events/${event.id}`}
              className="flex items-center justify-between p-4 hover:bg-neutral-50 transition"
            >
              <div>
                <p className="text-sm font-semibold text-neutral-900">{event.title}</p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {new Date(event.event_date).toLocaleDateString()} · {event.guest_count} guests
                  {event.customer && ` · Customer: ${event.customer.name}`}
                  {event.venue_name && ` · 📍 ${event.venue_name}`}
                </p>
              </div>
              <StatusBadge status={event.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
