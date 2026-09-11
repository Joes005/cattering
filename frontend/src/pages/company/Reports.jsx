import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { reportsApi } from '../../api/misc';
import KPICard from '../../components/KPICard';
import { SkeletonCard } from '../../components/Skeleton';
import { humanize } from '../../lib/format';
import { useAuth } from '../../context/AuthContext';

const BRAND_GREEN = '#15803D';

export default function CompanyReports() {
  const { currentCompanyId, hasPermission } = useAuth();
  const canSeeFinancial = hasPermission('reports.financial');

  const salesQuery = useQuery({
    queryKey: ['reports', 'sales', currentCompanyId],
    queryFn: () => reportsApi.sales(currentCompanyId),
    enabled: !!currentCompanyId,
  });
  const eventsQuery = useQuery({
    queryKey: ['reports', 'events', currentCompanyId],
    queryFn: () => reportsApi.events(currentCompanyId),
    enabled: !!currentCompanyId,
  });
  const revenueQuery = useQuery({
    queryKey: ['reports', 'revenue', currentCompanyId],
    queryFn: () => reportsApi.revenue(currentCompanyId),
    enabled: !!currentCompanyId && canSeeFinancial,
  });

  if (salesQuery.isLoading || eventsQuery.isLoading || (canSeeFinancial && revenueQuery.isLoading)) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  const sales = salesQuery.data;
  const events = eventsQuery.data;
  const revenue = revenueQuery.data;
  const maxStatusCount = Math.max(1, ...Object.values(events.by_status));

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-neutral-900">Reports</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard label="Enquiries" value={sales.total_enquiries} icon="📥" />
        <KPICard label="Quotations sent" value={sales.total_quotations_sent} icon="📝" />
        <KPICard label="Conversion rate" value={`${sales.conversion_rate}%`} hint="Sent → accepted" icon="📈" tone="brand" />
        <KPICard label="Confirmed bookings" value={sales.confirmed_bookings} icon="✅" />
      </div>

      {canSeeFinancial && revenue && (
        <div className="grid gap-4 sm:grid-cols-3">
          <KPICard label="Total revenue (invoiced)" value={`₹${revenue.total_revenue.toLocaleString()}`} tone="brand" icon="💰" />
          <KPICard label="Collected" value={`₹${revenue.collected.toLocaleString()}`} icon="🏦" />
          <KPICard label="Outstanding" value={`₹${revenue.outstanding.toLocaleString()}`} icon="⏳" />
        </div>
      )}

      {canSeeFinancial && revenue && revenue.monthly.length > 0 && (
        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-neutral-900">Revenue collected by month</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={revenue.monthly} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={{ stroke: '#E5E7EB' }} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value) => [`₹${value.toLocaleString()}`, 'Collected']}
                contentStyle={{ borderRadius: 8, borderColor: '#E5E7EB', fontSize: 13 }}
              />
              <Bar dataKey="amount" fill={BRAND_GREEN} radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card p-5">
        <h3 className="mb-4 text-sm font-semibold text-neutral-900">Events by status</h3>
        <div className="space-y-2">
          {Object.entries(events.by_status).map(([status, count]) => (
            <div key={status} className="flex items-center gap-3 text-sm">
              <span className="w-32 shrink-0 text-neutral-600">{humanize(status)}</span>
              <div className="h-2 flex-1 rounded-full bg-neutral-100">
                <div
                  className="h-2 rounded-full bg-brand-600"
                  style={{ width: `${(count / maxStatusCount) * 100}%` }}
                />
              </div>
              <span className="w-6 text-right font-medium text-neutral-900">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="mb-4 text-sm font-semibold text-neutral-900">Events by type</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(events.by_type).map(([type, count]) => (
            <span key={type} className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-700">
              {type}: {count}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
