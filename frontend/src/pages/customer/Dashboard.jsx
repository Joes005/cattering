import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { customerApi } from '../../api/customerApi';
import { useAuth } from '../../context/AuthContext';
import KPICard from '../../components/KPICard';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import { SkeletonCard, SkeletonRows } from '../../components/Skeleton';
import { formatCurrency } from '../../lib/format';

export default function CustomerDashboard() {
  const { user } = useAuth();

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['customer-events'],
    queryFn: customerApi.listEvents,
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['customer-invoices'],
    queryFn: () => customerApi.listInvoices(),
  });

  if (eventsLoading || invoicesLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <SkeletonRows rows={3} />
      </div>
    );
  }

  const allEvents = events || [];
  const allInvoices = invoices || [];

  const activeInquiries = allEvents.filter((e) => ['inquiry', 'quoted'].includes(e.status));
  const confirmedEvents = allEvents.filter((e) => ['confirmed', 'in_progress'].includes(e.status));
  const totalBilled = allInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const totalPaid = allInvoices.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);
  const pendingPayment = Math.max(0, totalBilled - totalPaid);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="Confirmed Events"
          value={confirmedEvents.length}
          hint={confirmedEvents.length > 0 ? 'Upcoming celebrations' : 'No confirmed events yet'}
          icon="🎉"
          tone="brand"
        />
        <KPICard
          label="Active Inquiries"
          value={activeInquiries.length}
          hint="Under caterer review"
          icon="📋"
          tone="accent"
        />
        <KPICard
          label="Total Paid"
          value={formatCurrency(totalPaid)}
          hint="Deposits & milestones"
          icon="💳"
        />
        <KPICard
          label="Pending Balance"
          value={formatCurrency(pendingPayment)}
          hint={pendingPayment > 0 ? 'Due for upcoming events' : 'All accounts settled'}
          icon="⏳"
        />
      </div>

      {/* Quick Action Banner */}
      <div className="rounded-2xl border border-brand-200 bg-gradient-to-r from-brand-50 to-white p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-brand-900">Planning a Wedding, Birthday or Corporate Gala?</h3>
          <p className="mt-1 text-xs text-brand-700">
            Browse top-rated caterers in your city, review transparent per-plate pricing, and request custom proposals.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/customer/caterers"
            className="rounded-xl bg-white border border-brand-300 px-4 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition shadow-xs"
          >
            Explore Caterers
          </Link>
          <Link
            to="/customer/book"
            className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 transition shadow-xs"
          >
            + Request Catering
          </Link>
        </div>
      </div>

      {/* Recent Bookings & Inquiries */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-neutral-900">My Recent Bookings & Inquiries</h3>
          <Link to="/customer/events" className="text-xs font-semibold text-brand-700 hover:underline">
            View all ({allEvents.length}) →
          </Link>
        </div>

        {allEvents.length === 0 ? (
          <EmptyState
            title="No catering bookings yet"
            description="Submit an inquiry to a verified caterer to start planning your event."
          />
        ) : (
          <div className="divide-y divide-neutral-100">
            {allEvents.slice(0, 5).map((evt) => (
              <div key={evt.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-neutral-900">{evt.title}</span>
                    <StatusBadge status={evt.status} />
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {evt.event_type} · 📅 {new Date(evt.event_date).toLocaleDateString()} · 👥 {evt.guest_count} guests
                    {evt.venue_name && ` · 📍 ${evt.venue_name}`}
                  </p>
                </div>
                <Link
                  to={`/customer/events/${evt.id}`}
                  className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 self-start sm:self-auto"
                >
                  View Event & Quotes →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

