import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { eventsApi } from '../../api/events';
import { customersApi } from '../../api/customers';
import { employerMarketplaceApi } from '../../api/employerMarketplaceApi';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import { SkeletonCard, SkeletonRows } from '../../components/Skeleton';
import {
  CalendarIcon,
  UsersIcon,
  StaffIcon,
  BuildingIcon,
  PlusIcon,
  ArrowRightIcon,
  SparklesIcon,
} from '../../components/Icons';

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
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <SkeletonRows rows={4} />
      </div>
    );
  }

  const events = eventsQuery.data || [];
  const customers = customersQuery.data || [];
  const assignments = assignmentsQuery.data || [];
  const upcomingEvents = events.filter((e) => ['inquiry', 'quoted', 'confirmed', 'in_progress'].includes(e.status));

  return (
    <div className="space-y-8">
      {/* Header and Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
            {company?.name || 'Catering Operations Dashboard'}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Manage catering banquets, track customer quotations, hire temporary kitchen staff, and monitor deliveries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/employer/events"
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Create Event</span>
          </Link>
          <Link
            to="/employer/workforce"
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
          >
            Hire Workforce
          </Link>
        </div>
      </div>

      {/* Account Status Alerts */}
      {isPending && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 shadow-xs">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 font-bold">
              ⏳
            </span>
            <div>
              <h3 className="font-bold text-sm text-amber-900">Registration Pending Platform Approval</h3>
              <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                Your business profile for <strong>{company?.name}</strong> is currently being reviewed by platform administrators.
                Once approved, your services will be published to the public catering directory and quotation acceptance will be unlocked.
              </p>
            </div>
          </div>
        </div>
      )}

      {isSuspended && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-5 shadow-xs">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-800 font-bold">
              ⚠️
            </span>
            <div>
              <h3 className="font-bold text-sm text-rose-900">Catering Business Account Suspended</h3>
              <p className="mt-1 text-xs text-rose-800 leading-relaxed">
                Your catering business account is temporarily suspended. Please contact platform administration to resolve compliance or verification inquiries.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Executive KPI Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Events */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Scheduled Events</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <CalendarIcon className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">{events.length}</p>
          <p className="mt-1 text-[11px] font-semibold text-emerald-700">
            {upcomingEvents.length} active & upcoming
          </p>
        </div>

        {/* Metric 2: Customers */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Client CRM Records</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <UsersIcon className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">{customers.length}</p>
          <p className="mt-1 text-[11px] text-slate-400">
            Registered customer contacts
          </p>
        </div>

        {/* Metric 3: Workforce Hires */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Workforce Hired</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <StaffIcon className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">{assignments.length}</p>
          <p className="mt-1 text-[11px] text-slate-400">
            Shift assignments across events
          </p>
        </div>

        {/* Metric 4: Business Standing */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Operating Status</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <BuildingIcon className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <p className="text-xl font-black text-slate-900 capitalize">
              {company?.status === 'approved' ? 'Verified Active' : company?.status || 'Pending'}
            </p>
          </div>
          <p className="mt-1 text-[11px] text-slate-400 truncate">
            {company?.business_type || 'Catering Services'}
          </p>
        </div>
      </div>

      {/* Upcoming Events Overview */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Upcoming Catering Events</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live catering banquets, wedding receptions, and corporate food services
            </p>
          </div>
          <Link
            to="/employer/events"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            <span>View All Events ({events.length})</span>
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
        </div>

        {upcomingEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center space-y-3">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <SparklesIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">No active events currently scheduled</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Create your first catering event or add a client inquiry to generate proposals.
              </p>
            </div>
            <Link
              to="/employer/events"
              className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              <span>Create New Event</span>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {upcomingEvents.slice(0, 5).map((e) => (
              <Link
                key={e.id}
                to={`/employer/events/${e.id}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-2 hover:bg-slate-50/70 rounded-xl px-3 transition"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-sm">{e.title}</span>
                    <StatusBadge status={e.status} />
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                      {e.event_type || 'Event'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    📅 {new Date(e.event_date).toLocaleDateString()} · 👥 {e.guest_count} guests
                    {e.customer && ` · Client: ${e.customer.name}`}
                    {e.venue_name && ` · 📍 ${e.venue_name}`}
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 self-start sm:self-auto">
                  <span>Manage Details</span>
                  <ArrowRightIcon className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
