import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { eventsApi } from '../../api/events';
import { customersApi } from '../../api/customers';
import { employerMarketplaceApi } from '../../api/employerMarketplaceApi';
import { useAuth } from '../../context/AuthContext';
import KPICard from '../../components/KPICard';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import { SkeletonCard } from '../../components/Skeleton';

export default function CompanyDashboard() {
  const { currentCompanyId, company, user } = useAuth();

  const eventsQuery = useQuery({
    queryKey: ['events', currentCompanyId],
    queryFn: () => eventsApi.listForCompany(currentCompanyId),
    enabled: !!currentCompanyId,
  });

  const customersQuery = useQuery({
    queryKey: ['customers', currentCompanyId],
    queryFn: () => customersApi.list(currentCompanyId),
    enabled: !!currentCompanyId,
  });

  const assignmentsQuery = useQuery({
    queryKey: ['assignments', currentCompanyId],
    queryFn: () => employerMarketplaceApi.listAssignments(currentCompanyId),
    enabled: !!currentCompanyId,
  });

  const isPending = company?.status === 'pending_approval';
  const isSuspended = company?.status === 'suspended';

  if (eventsQuery.isLoading || customersQuery.isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  const events = eventsQuery.data || [];
  const customers = customersQuery.data || [];
  const assignments = assignmentsQuery.data || [];
  const upcomingEvents = events.filter((e) => ['inquiry', 'quoted', 'confirmed'].includes(e.status));

  return (
    <div className="space-y-6">
      {/* Account Status Alerts */}
      {isPending && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-900 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⏳</span>
            <div>
              <h3 className="font-semibold text-base">Registration Pending Admin Approval</h3>
              <p className="mt-1 text-sm text-amber-800 leading-relaxed">
                Welcome to Plated! Your catering business profile for <strong>{company?.name}</strong> has been created
                and is awaiting verification by platform administrators. Once approved, all operational features including
                marketplace hiring and quotation publishing will be fully activated.
              </p>
            </div>
          </div>
        </div>
      )}

      {isSuspended && (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-5 text-red-900 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-semibold text-base">Company Account Suspended</h3>
              <p className="mt-1 text-sm text-red-800 leading-relaxed">
                Your catering business account has been suspended by platform administration. Please reach out to support.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="Catering Events"
          value={events.length}
          hint={`${upcomingEvents.length} active / upcoming`}
          icon="📅"
          tone="brand"
        />
        <KPICard label="Customer Records" value={customers.length} icon="👥" />
        <KPICard
          label="Workforce Assignments"
          value={assignments.length}
          hint="Hired across events"
          icon="🧑‍🍳"
        />
        <KPICard
          label="Business Status"
          value={company?.status === 'approved' ? 'Active' : company?.status || 'Pending'}
          hint={company?.name || 'Catering Co.'}
          icon="🏢"
          tone={company?.status === 'approved' ? 'brand' : 'accent'}
        />
      </div>

      {/* Upcoming Events List */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Upcoming Events</h2>
            <p className="text-xs text-neutral-500">Upcoming catering banquets and deliveries</p>
          </div>
          <Link to="/employer/events" className="text-xs font-semibold text-brand-700 hover:underline">
            View all events →
          </Link>
        </div>

        {upcomingEvents.length === 0 ? (
          <EmptyState
            icon="🎉"
            title="No upcoming events"
            description="Create your first event from the Events tab or add a customer to get started."
          />
        ) : (
          <div className="divide-y divide-neutral-100">
            {upcomingEvents.slice(0, 5).map((e) => (
              <Link
                key={e.id}
                to={`/employer/events/${e.id}`}
                className="flex items-center justify-between py-3 hover:bg-neutral-50 rounded-lg px-2 -mx-2 transition"
              >
                <div>
                  <p className="text-sm font-semibold text-neutral-900">{e.title}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {new Date(e.event_date).toLocaleDateString()} · {e.guest_count} guests
                    {e.customer && ` · Customer: ${e.customer.name}`}
                    {e.venue_name && ` · 📍 ${e.venue_name}`}
                  </p>
                </div>
                <StatusBadge status={e.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
