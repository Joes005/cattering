import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { customerApi } from '../../api/customerApi';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import { SkeletonRows } from '../../components/Skeleton';

export default function CustomerEvents() {
  const [filter, setFilter] = useState('all');

  const { data: events, isLoading } = useQuery({
    queryKey: ['customer-events'],
    queryFn: customerApi.listEvents,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-neutral-200" />
        <SkeletonRows rows={5} />
      </div>
    );
  }

  const allEvents = events || [];
  const filteredEvents =
    filter === 'all'
      ? allEvents
      : filter === 'inquiries'
      ? allEvents.filter((e) => ['inquiry', 'quoted'].includes(e.status))
      : filter === 'confirmed'
      ? allEvents.filter((e) => ['confirmed', 'in_progress'].includes(e.status))
      : allEvents.filter((e) => ['completed', 'cancelled'].includes(e.status));

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">My Catering Bookings</h2>
          <p className="text-xs text-neutral-500">Track inquiries, accepted quotations, and event schedules</p>
        </div>
        <Link
          to="/customer/book"
          className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 shadow-xs self-start sm:self-auto transition"
        >
          + Request New Catering
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-neutral-200 pb-2">
        <button
          onClick={() => setFilter('all')}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            filter === 'all' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          All Events ({allEvents.length})
        </button>
        <button
          onClick={() => setFilter('inquiries')}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            filter === 'inquiries' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          Active Inquiries & Quotes
        </button>
        <button
          onClick={() => setFilter('confirmed')}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            filter === 'confirmed' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          Confirmed Bookings
        </button>
        <button
          onClick={() => setFilter('past')}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            filter === 'past' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          Past / Completed
        </button>
      </div>

      {/* Bookings List */}
      {filteredEvents.length === 0 ? (
        <EmptyState
          title="No bookings match this filter"
          description="Explore catering partners and submit an inquiry to begin planning."
        />
      ) : (
        <div className="card divide-y divide-neutral-100">
          {filteredEvents.map((evt) => (
            <div key={evt.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-neutral-900">{evt.title}</h3>
                  <StatusBadge status={evt.status} />
                </div>
                <p className="text-xs text-neutral-500">
                  {evt.event_type} · 📅 {new Date(evt.event_date).toLocaleDateString()} · 👥 {evt.guest_count} guests
                  {evt.venue_name && ` · 📍 ${evt.venue_name}`}
                </p>
                <div className="flex items-center gap-2 pt-1 text-xs text-neutral-400">
                  <span className="capitalize">Dietary: {evt.catering_requirement}</span>
                  <span>·</span>
                  <span>Created {new Date(evt.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  to={`/customer/events/${evt.id}`}
                  className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition"
                >
                  Manage Booking →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

