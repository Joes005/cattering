import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '../../api/events';
import { clientsApi } from '../../api/clients';
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
  client_id: '',
  event_type: 'Wedding',
  event_date: '',
  guest_count: '',
  venue_name: '',
  venue_address: '',
  catering_requirement: 'mixed',
};

export default function CompanyEvents() {
  const { currentCompanyId, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const { data: events, isLoading } = useQuery({
    queryKey: ['events', currentCompanyId],
    queryFn: () => eventsApi.listForCompany(currentCompanyId),
    enabled: !!currentCompanyId,
  });
  const { data: clients } = useQuery({
    queryKey: ['clients', currentCompanyId],
    queryFn: () => clientsApi.list(currentCompanyId),
    enabled: !!currentCompanyId && hasPermission('events.create'),
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  const canCreate = hasPermission('events.create');

  const submitMutation = useMutation({
    mutationFn: () =>
      eventsApi.createForCompany(currentCompanyId, {
        ...form,
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
        <h2 className="text-lg font-semibold text-neutral-900">Events</h2>
        {canCreate && (
          <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancel' : '+ New event'}
          </button>
        )}
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
            <label className="label">Client</label>
            <select
              required
              className="input"
              value={form.client_id}
              onChange={(e) => setForm({ ...form, client_id: e.target.value })}
            >
              <option value="">Select a client…</option>
              {(clients || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
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
            <label className="label">Guests</label>
            <input
              type="number"
              min={1}
              required
              className="input"
              value={form.guest_count}
              onChange={(e) => setForm({ ...form, guest_count: e.target.value })}
            />
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
          <button type="submit" disabled={submitMutation.isPending} className="btn-primary sm:col-span-2 sm:w-fit">
            {submitMutation.isPending ? 'Creating…' : 'Create event'}
          </button>
        </form>
      )}

      {isLoading ? (
        <SkeletonRows />
      ) : events.length === 0 ? (
        <EmptyState title="No events yet" description="Events created for your clients will show up here." />
      ) : (
        <div className="card divide-y divide-neutral-100">
          {events.map((event) => (
            <Link
              key={event.id}
              to={`/company/events/${event.id}`}
              className="flex items-center justify-between p-4 hover:bg-neutral-50"
            >
              <div>
                <p className="text-sm font-medium text-neutral-900">{event.title}</p>
                <p className="text-xs text-neutral-500">
                  {new Date(event.event_date).toLocaleDateString()} · {event.guest_count} guests
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
