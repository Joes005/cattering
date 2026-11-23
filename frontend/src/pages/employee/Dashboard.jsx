import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { employeeApi } from '../../api/employeeApi';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import { SkeletonCard, SkeletonRows } from '../../components/Skeleton';
import { formatCurrency } from '../../lib/format';
import {
  CalendarIcon,
  DocumentTextIcon,
  CurrencyIcon,
  StaffIcon,
  SearchIcon,
  ClockIcon,
  ArrowRightIcon,
  CheckCircleIcon,
} from '../../components/Icons';

export default function EmployeeDashboard() {
  const { user } = useAuth();

  const { data: schedule, isLoading: scheduleLoading } = useQuery({
    queryKey: ['employee-schedule'],
    queryFn: employeeApi.listSchedule,
  });

  const { data: applications, isLoading: appsLoading } = useQuery({
    queryKey: ['employee-applications'],
    queryFn: employeeApi.listApplications,
  });

  const { data: earnings, isLoading: earningsLoading } = useQuery({
    queryKey: ['employee-earnings'],
    queryFn: employeeApi.getEarnings,
  });

  if (scheduleLoading || appsLoading || earningsLoading) {
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

  const shifts = schedule || [];
  const apps = applications || [];
  const pendingApps = apps.filter((a) => a.status === 'applied');
  const nextShift = shifts[0] || null;
  const totalEarned = Array.isArray(earnings)
    ? earnings.reduce((sum, p) => sum + (p.total_amount || p.amount || 0), 0)
    : earnings?.total_earnings || 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Workforce Command Center
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Welcome back, {user?.full_name}. View your confirmed catering shifts, track applications, and monitor earnings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/employee/jobs"
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
          >
            <SearchIcon className="h-4 w-4" />
            <span>Find Catering Shifts</span>
          </Link>
          <Link
            to="/employee/attendance"
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
          >
            Digital Timecard
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Confirmed Shifts</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <CalendarIcon className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">{shifts.length}</p>
          <p className="mt-1 text-[11px] font-semibold text-emerald-700">
            {nextShift ? 'Next shift confirmed' : 'No upcoming shifts'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pending Applications</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <DocumentTextIcon className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">{pendingApps.length}</p>
          <p className="mt-1 text-[11px] text-slate-400">
            Under caterer review
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Cleared Earnings</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <CurrencyIcon className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">{formatCurrency(totalEarned)}</p>
          <p className="mt-1 text-[11px] text-slate-400">
            Completed assignments
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Staff Rating</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <StaffIcon className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <p className="text-2xl font-black text-slate-900">
              ★ {user?.employee_profile?.rating || '5.0'}
            </p>
            <span className="text-xs text-slate-400">/ 5.0</span>
          </div>
          <p className="mt-1 text-[11px] text-emerald-700 font-semibold">
            Verified Catering Pro
          </p>
        </div>
      </div>

      {/* Next Shift Focus Card */}
      {nextShift ? (
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/70 to-white p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-800">
                  Next Upcoming Shift
                </span>
                <span className="text-xs font-mono text-slate-500 font-semibold">
                  {new Date(nextShift.shift_start).toLocaleDateString()}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 pt-1">{nextShift.event?.title}</h3>
              <p className="text-xs text-slate-600">
                Employer: <strong className="text-slate-800">{nextShift.event?.company?.name || 'Catering Co.'}</strong> · Role:{' '}
                <strong className="text-emerald-800">{nextShift.role}</strong>
              </p>
              <div className="flex flex-wrap gap-4 text-xs text-slate-500 pt-1">
                <span>⏰ Timing: {new Date(nextShift.shift_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {nextShift.event?.venue_name && <span>📍 {nextShift.event.venue_name}</span>}
                <span className="font-bold text-emerald-700">
                  Rate: {formatCurrency(nextShift.agreed_pay_rate)}/hr
                </span>
              </div>
            </div>

            <Link
              to="/employee/attendance"
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition self-start sm:self-auto"
            >
              <ClockIcon className="h-4 w-4" />
              <span>Digital Check-In</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center space-y-3">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <SearchIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Looking for your next catering gig?</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Browse active shift vacancies posted by premier catering companies and apply with 1 click.
            </p>
          </div>
          <div>
            <Link
              to="/employee/jobs"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition"
            >
              <SearchIcon className="h-3.5 w-3.5" />
              <span>Browse Open Shifts</span>
            </Link>
          </div>
        </div>
      )}

      {/* Recent Applications Pipeline */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Shift Applications</h3>
            <p className="text-xs text-slate-500 mt-0.5">Track application statuses across catering employers</p>
          </div>
          <Link
            to="/employee/applications"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            <span>View All ({apps.length})</span>
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
        </div>

        {apps.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">You haven't submitted any applications yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {apps.slice(0, 4).map((app) => (
              <div key={app.id} className="py-3.5 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs">{app.job_posting?.title || 'Catering Assignment'}</span>
                    <StatusBadge status={app.status} />
                  </div>
                  <p className="text-xs text-slate-500">
                    {app.job_posting?.company?.name || 'Caterer'} · Applied {new Date(app.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-700">
                  {formatCurrency(app.job_posting?.pay_rate || 0)}/hr
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
