import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { employeeApi } from '../../api/employeeApi';
import { useAuth } from '../../context/AuthContext';
import KPICard from '../../components/KPICard';
import EmptyState from '../../components/EmptyState';
import { SkeletonCard } from '../../components/Skeleton';
import { formatCurrency } from '../../lib/format';

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
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
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="Confirmed Shifts"
          value={shifts.length}
          hint={nextShift ? 'Upcoming on schedule' : 'No upcoming shifts'}
          icon="📅"
          tone="brand"
        />
        <KPICard
          label="Pending Applications"
          value={pendingApps.length}
          hint="Under employer review"
          icon="📝"
        />
        <KPICard
          label="Total Earnings"
          value={formatCurrency(totalEarned)}
          hint={`${earnings?.payouts?.length || 0} events paid`}
          icon="💰"
          tone="brand"
        />
        <KPICard
          label="Workforce Rating"
          value={`${user?.employee_profile?.rating || '5.0'} ★`}
          hint="Verified staff"
          icon="⭐"
        />
      </div>

      {/* Next Shift Focus Card */}
      {nextShift ? (
        <div className="rounded-2xl border border-brand-200 bg-gradient-to-r from-brand-50 to-white p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
                Next Confirmed Shift
              </span>
              <h2 className="mt-2 text-xl font-bold text-neutral-900">{nextShift.event?.title}</h2>
              <p className="text-sm text-neutral-600 mt-1">
                Employer: <strong>{nextShift.event?.company?.name || 'Catering Co.'}</strong> · Role:{' '}
                <strong className="text-brand-800">{nextShift.role}</strong>
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-neutral-500">
                <span>⏰ Shift: {new Date(nextShift.shift_start).toLocaleString()}</span>
                {nextShift.event?.venue_name && <span>📍 {nextShift.event.venue_name}</span>}
                <span className="font-semibold text-emerald-700">
                  Rate: {formatCurrency(nextShift.agreed_pay_rate)}/hr
                </span>
              </div>
            </div>
            <Link
              to="/employee/attendance"
              className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-brand-500 transition text-center"
            >
              Open Digital Check-In →
            </Link>
          </div>
        </div>
      ) : (
        <div className="card p-6 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-2xl text-brand-600">
            🔍
          </div>
          <h3 className="font-semibold text-neutral-900">Looking for your next catering gig?</h3>
          <p className="text-sm text-neutral-500 max-w-md mx-auto">
            Browse active shifts posted by catering companies and apply with one click.
          </p>
          <div>
            <Link to="/employee/jobs" className="btn-primary">
              Browse Available Shifts
            </Link>
          </div>
        </div>
      )}

      {/* Recent Applications Overview */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-neutral-900">Recent Applications</h2>
          <Link to="/employee/applications" className="text-xs font-semibold text-brand-700 hover:underline">
            View all ({apps.length}) →
          </Link>
        </div>

        {apps.length === 0 ? (
          <EmptyState
            title="No applications submitted"
            description="Explore the shifts marketplace and apply to start working."
          />
        ) : (
          <div className="divide-y divide-neutral-100">
            {apps.slice(0, 4).map((app) => (
              <div key={app.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-neutral-900">{app.job_posting?.title}</p>
                  <p className="text-xs text-neutral-500">
                    Role: {app.job_posting?.role} · Rate: {formatCurrency(app.job_posting?.pay_rate || 0)}/hr
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${
                    app.status === 'accepted'
                      ? 'bg-emerald-100 text-emerald-800'
                      : app.status === 'rejected'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-neutral-100 text-neutral-700'
                  }`}
                >
                  {app.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

