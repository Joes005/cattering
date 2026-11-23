import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { customerApi } from '../../api/customerApi';
import StatusBadge from '../../components/StatusBadge';
import { SkeletonCard, SkeletonRows } from '../../components/Skeleton';
import { formatCurrency } from '../../lib/format';
import {
  CalendarIcon,
  DocumentTextIcon,
  CurrencyIcon,
  ClockIcon,
  BuildingIcon,
  PlusIcon,
  ArrowRightIcon,
  SparklesIcon,
} from '../../components/Icons';

export default function CustomerDashboard() {
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['customer-events'],
    queryFn: () => customerApi.listEvents(),
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
        <SkeletonRows rows={4} />
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Catering Planning & Orders
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Track your catering proposals, approve quotations, inspect banquet menus, and monitor payments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/customer/caterers"
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
          >
            Explore Caterers
          </Link>
          <Link
            to="/customer/book"
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Request Catering</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Confirmed Events</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <CalendarIcon className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">{confirmedEvents.length}</p>
          <p className="mt-1 text-[11px] font-semibold text-emerald-700">
            {confirmedEvents.length > 0 ? 'Upcoming celebrations' : 'No confirmed events yet'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active Proposals</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <DocumentTextIcon className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">{activeInquiries.length}</p>
          <p className="mt-1 text-[11px] text-slate-400">
            Awaiting quotation review
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Invoiced Paid</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <CurrencyIcon className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">{formatCurrency(totalPaid)}</p>
          <p className="mt-1 text-[11px] text-slate-400">
            Deposits & milestones settled
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pending Balance</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <ClockIcon className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">{formatCurrency(pendingPayment)}</p>
          <p className="mt-1 text-[11px] text-slate-400">
            {pendingPayment > 0 ? 'Due for upcoming catering' : 'All accounts settled'}
          </p>
        </div>
      </div>

      {/* Hero Booking Invitation */}
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/70 to-white p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
              <SparklesIcon className="h-3.5 w-3.5" />
            </span>
            <h3 className="text-base font-bold text-slate-900">Planning a Wedding, Birthday or Corporate Gala?</h3>
          </div>
          <p className="text-xs text-slate-600">
            Discover verified catering companies, compare per-plate package prices, and get customized menu quotations.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link
            to="/customer/caterers"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
          >
            Explore Caterers
          </Link>
          <Link
            to="/customer/book"
            className="flex items-center gap-1 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-xs"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            <span>Request Proposal</span>
          </Link>
        </div>
      </div>

      {/* Recent Bookings & Inquiries */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">My Recent Bookings & Inquiries</h3>
            <p className="text-xs text-slate-500 mt-0.5">Manage event planning milestones and review quotations</p>
          </div>
          <Link
            to="/customer/events"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            <span>View All ({allEvents.length})</span>
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
        </div>

        {allEvents.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">
            No catering bookings placed yet. Submit an inquiry to an approved caterer to begin!
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {allEvents.slice(0, 5).map((evt) => (
              <div key={evt.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-sm">{evt.title}</span>
                    <StatusBadge status={evt.status} />
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                      {evt.event_type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    📅 {new Date(evt.event_date).toLocaleDateString()} · 👥 {evt.guest_count} guests
                    {evt.venue_name && ` · 📍 ${evt.venue_name}`}
                  </p>
                </div>
                <Link
                  to={`/customer/events/${evt.id}`}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs self-start sm:self-auto"
                >
                  <span>Review Quotes & Status</span>
                  <ArrowRightIcon className="h-3.5 w-3.5 text-slate-400" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
