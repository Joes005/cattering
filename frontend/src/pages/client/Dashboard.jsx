import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { eventsApi } from '../../api/events';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import { SkeletonRows } from '../../components/Skeleton';
import { useAuth } from '../../context/AuthContext';

export default function ClientDashboard() {
  const { user } = useAuth();
  const { data: events, isLoading } = useQuery({ queryKey: ['me', 'events'], queryFn: eventsApi.listMine });

  return (
    <div className="space-y-6">
      <div className="relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl bg-brand-gradient p-6 text-white shadow-glow sm:p-8">
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"
          aria-hidden
        />
        <div className="relative">
          <h2 className="text-2xl font-semibold tracking-tight">Hi {user?.full_name?.split(' ')[0]},</h2>
          <p className="mt-1 text-white/80">Here's what's happening with your events.</p>
        </div>
        <Link to="/client/book" className="btn relative bg-white text-brand-700 shadow-soft hover:bg-white/90">
          + Book an event
        </Link>
      </div>

      {isLoading ? (
        <SkeletonRows rows={3} />
      ) : events.length === 0 ? (
        <EmptyState
          icon="🎉"
          title="No events yet"
          description="Booking a catered event will let you track quotations, payments, and everything else here."
          action={
            <Link to="/client/book" className="btn-primary">
              Book your first event
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <Link
              key={event.id}
              to={`/client/events/${event.id}`}
              className="card-interactive flex flex-wrap items-center justify-between gap-3 p-5"
            >
              <div>
                <p className="text-base font-semibold text-neutral-900">{event.title}</p>
                <p className="text-sm text-neutral-500">
                  {new Date(event.event_date).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}{' '}
                  · {event.guest_count} guests
                  {event.venue_name ? ` · ${event.venue_name}` : ''}
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
