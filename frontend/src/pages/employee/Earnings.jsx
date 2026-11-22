import { useQuery } from '@tanstack/react-query';
import { employeeApi } from '../../api/employeeApi';
import KPICard from '../../components/KPICard';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import { SkeletonCard, SkeletonRows } from '../../components/Skeleton';
import { formatCurrency } from '../../lib/format';

export default function EmployeeEarnings() {
  const { data: earnings, isLoading } = useQuery({
    queryKey: ['employee-earnings'],
    queryFn: employeeApi.getEarnings,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <SkeletonRows rows={4} />
      </div>
    );
  }

  const payouts = Array.isArray(earnings) ? earnings : earnings?.payouts || [];
  const totalEarned = Array.isArray(earnings)
    ? earnings.reduce((sum, p) => sum + (p.total_amount || p.amount || 0), 0)
    : earnings?.total_earnings || 0;
  const paidOut = payouts
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + (p.total_amount || p.amount || 0), 0);
  const pendingPayout = totalEarned - paidOut;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Earnings & Payouts</h2>
        <p className="text-xs text-neutral-500">
          Consolidated earnings and payout status across all catering employers
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard
          label="Total Gross Earnings"
          value={formatCurrency(totalEarned)}
          hint="From verified attendance"
          icon="💰"
          tone="brand"
        />
        <KPICard
          label="Settled Payouts"
          value={formatCurrency(paidOut)}
          hint="Transferred to your account"
          icon="✅"
        />
        <KPICard
          label="Pending Settlement"
          value={formatCurrency(pendingPayout > 0 ? pendingPayout : 0)}
          hint="Awaiting caterer payout"
          icon="⏳"
          tone={pendingPayout > 0 ? 'accent' : undefined}
        />
      </div>

      <div className="card p-5">
        <h3 className="text-base font-semibold text-neutral-900 mb-4">Payout History</h3>

        {payouts.length === 0 ? (
          <EmptyState
            title="No payout records yet"
            description="Complete shifts and obtain verified attendance to generate earnings and payouts."
          />
        ) : (
          <div className="divide-y divide-neutral-100">
            {payouts.map((p) => (
              <div key={p.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-900">{p.event_title || 'Catering Event'}</span>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Hours Worked: <strong className="text-neutral-700">{p.hours_worked} hrs</strong> @{' '}
                    {formatCurrency(p.hourly_rate)}/hr
                  </p>
                  {p.paid_at && (
                    <p className="text-[11px] text-neutral-400">
                      Paid on {new Date(p.paid_at).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-base font-bold text-emerald-700">
                    {formatCurrency(p.total_amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

