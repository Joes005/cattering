import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { employeeApi } from '../../api/employeeApi';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import { SkeletonRows } from '../../components/Skeleton';
import { formatCurrency } from '../../lib/format';

export default function EmployeeSchedule() {
  const { data: schedule, isLoading } = useQuery({
    queryKey: ['employee-schedule'],
    queryFn: employeeApi.listSchedule,
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Confirmed Shifts Schedule</h2>
        <p className="text-xs text-neutral-500">
          Your confirmed catering assignments across all catering employers
        </p>
      </div>

      {isLoading ? (
        <SkeletonRows rows={5} />
      ) : !schedule || schedule.length === 0 ? (
        <EmptyState
          title="No confirmed shifts"
          description="When caterers accept your shift applications, your scheduled events appear here."
        />
      ) : (
        <div className="card divide-y divide-neutral-100">
          {schedule.map((shift) => (
            <div key={shift.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-neutral-900">{shift.event?.title}</span>
                  <StatusBadge status={shift.status} />
                  <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                    {shift.role}
                  </span>
                </div>
                <p className="text-xs text-neutral-600">
                  Catering Employer: <strong className="text-brand-800">{shift.event?.company?.name || 'Catering Partner'}</strong>
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500 pt-1">
                  <span>📅 {new Date(shift.shift_start).toLocaleDateString()}</span>
                  <span>
                    ⏰ {new Date(shift.shift_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                    {new Date(shift.shift_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {shift.event?.venue_name && <span>📍 {shift.event.venue_name}</span>}
                  <span className="font-semibold text-emerald-700">
                    Agreed: {formatCurrency(shift.agreed_pay_rate)}/hr
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  to="/employee/attendance"
                  className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
                >
                  Digital Attendance →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

