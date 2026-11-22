import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';
import KPICard from '../../components/KPICard';
import { SkeletonCard, SkeletonRows } from '../../components/Skeleton';
import StatusBadge from '../../components/StatusBadge';
import { formatCurrency } from '../../lib/format';

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const [rejectModal, setRejectModal] = useState({ open: false, companyId: null, companyName: '', reason: '' });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminApi.getStats,
  });

  const { data: pendingEmployers, isLoading: pendingLoading } = useQuery({
    queryKey: ['admin', 'employers', 'pending'],
    queryFn: () => adminApi.listEmployers('pending_approval'),
  });

  const { data: revChart } = useQuery({
    queryKey: ['admin', 'charts', 'revenue'],
    queryFn: adminApi.getRevenueChart,
  });

  const approveMutation = useMutation({
    mutationFn: (companyId) => adminApi.approveEmployer(companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ companyId, reason }) => adminApi.rejectEmployer(companyId, reason),
    onSuccess: () => {
      setRejectModal({ open: false, companyId: null, companyName: '', reason: '' });
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });

  if (statsLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  const s = stats || {
    total_employers: 0,
    pending_employers: 0,
    approved_employers: 0,
    total_employees: 0,
    total_events: 0,
    total_revenue: 0,
    total_subscriptions: 0,
    total_commissions: 0,
    open_disputes: 0,
  };

  return (
    <div className="space-y-6">
      {/* Platform KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KPICard
          label="Catering Businesses"
          value={s.total_employers}
          hint={`${s.pending_employers} pending review`}
          icon="🏢"
          tone={s.pending_employers > 0 ? 'accent' : 'brand'}
        />
        <KPICard
          label="Active Workforce"
          value={s.total_employees}
          hint="Independent staff"
          icon="🧑‍🍳"
        />
        <KPICard
          label="Platform Events"
          value={s.total_events}
          hint="All caterers"
          icon="📅"
        />
        <KPICard
          label="Invoiced Volume"
          value={formatCurrency(s.total_revenue || 0)}
          hint="Gross catering"
          icon="💰"
          tone="brand"
        />
        <KPICard
          label="Subscriptions"
          value={s.total_subscriptions}
          hint={`${s.active_subscriptions || 0} active SaaS`}
          icon="💳"
        />
        <KPICard
          label="Commissions Earned"
          value={formatCurrency(s.total_commissions || 0)}
          hint={`${s.open_disputes || 0} open disputes`}
          icon="📈"
          tone="accent"
        />
      </div>

      {/* Revenue & Growth Overview */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">Platform Revenue Trajectory</h2>
              <p className="text-xs text-neutral-500">Gross Catering Volume vs Platform Commission Take</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              Monthly Active Flow
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {(revChart || []).map((point, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-neutral-700">{point.name}</span>
                  <div className="space-x-3">
                    <span className="text-neutral-500">Gross: {formatCurrency(point.value)}</span>
                    <span className="text-emerald-700 font-semibold">Comm: {formatCurrency(point.secondary_value)}</span>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-neutral-100 overflow-hidden flex">
                  <div
                    className="bg-brand-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, (point.value / 1500000) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Shortcuts */}
        <div className="card p-5 space-y-4">
          <h2 className="text-base font-semibold text-neutral-900">Command Shortcuts</h2>
          <div className="grid grid-cols-1 gap-2.5">
            <Link
              to="/admin/companies"
              className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 hover:border-brand-500 hover:bg-brand-50/30 transition text-sm font-medium text-neutral-800"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg">🏢</span>
                <div>
                  <p>Review Businesses</p>
                  <p className="text-xs text-neutral-500 font-normal">{s.pending_employers} awaiting approval</p>
                </div>
              </div>
              <span className="text-neutral-400">→</span>
            </Link>

            <Link
              to="/admin/subscriptions"
              className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 hover:border-brand-500 hover:bg-brand-50/30 transition text-sm font-medium text-neutral-800"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg">💳</span>
                <div>
                  <p>Manage SaaS Plans</p>
                  <p className="text-xs text-neutral-500 font-normal">Tiers, pricing, overrides</p>
                </div>
              </div>
              <span className="text-neutral-400">→</span>
            </Link>

            <Link
              to="/admin/commissions"
              className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 hover:border-brand-500 hover:bg-brand-50/30 transition text-sm font-medium text-neutral-800"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg">📈</span>
                <div>
                  <p>Commission Ledger</p>
                  <p className="text-xs text-neutral-500 font-normal">Rates, cuts, settlements</p>
                </div>
              </div>
              <span className="text-neutral-400">→</span>
            </Link>

            <Link
              to="/admin/disputes"
              className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 hover:border-brand-500 hover:bg-brand-50/30 transition text-sm font-medium text-neutral-800"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg">⚖️</span>
                <div>
                  <p>Disputes & Support</p>
                  <p className="text-xs text-neutral-500 font-normal">{s.open_disputes} open tickets</p>
                </div>
              </div>
              <span className="text-neutral-400">→</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Pending Employer Approval Action Queue */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              Pending Business Registrations ({pendingEmployers?.length || 0})
            </h2>
            <p className="text-xs text-neutral-500">
              Review and verify catering businesses before they can conduct operations
            </p>
          </div>
          {pendingEmployers && pendingEmployers.length > 0 && (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
              Requires Review
            </span>
          )}
        </div>

        {pendingLoading ? (
          <SkeletonRows rows={3} />
        ) : !pendingEmployers || pendingEmployers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 p-8 text-center text-sm text-neutral-500">
            ✅ No pending catering business registrations at this time. All submissions are reviewed!
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {pendingEmployers.map((emp) => (
              <div key={emp.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-900">{emp.name}</span>
                    <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600">
                      {emp.business_type}
                    </span>
                    <StatusBadge status={emp.status} />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500 mt-1">
                    {emp.owner_name && <span>Owner: <strong className="text-neutral-700">{emp.owner_name}</strong></span>}
                    {emp.owner_email && <span>Email: {emp.owner_email}</span>}
                    {emp.gst_number && <span>GST: <strong>{emp.gst_number}</strong></span>}
                    {emp.business_address && <span>📍 {emp.business_address}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => approveMutation.mutate(emp.id)}
                    disabled={approveMutation.isPending}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                  >
                    ✓ Approve Business
                  </button>
                  <button
                    onClick={() => setRejectModal({ open: true, companyId: emp.id, companyName: emp.name, reason: '' })}
                    className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition"
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      {rejectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-base font-semibold text-neutral-900">
              Reject Registration — {rejectModal.companyName}
            </h3>
            <p className="text-xs text-neutral-500">
              Provide a clear reason for rejecting this catering business registration. This will be visible to the business owner.
            </p>
            <textarea
              rows={3}
              value={rejectModal.reason}
              onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
              placeholder="e.g. Incomplete GST documents or invalid food hygiene license..."
              className="w-full rounded-xl border border-neutral-300 p-3 text-sm focus:border-brand-500 focus:outline-none"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectModal({ open: false, companyId: null, companyName: '', reason: '' })}
                className="rounded-lg px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                disabled={!rejectModal.reason.trim() || rejectMutation.isPending}
                onClick={() => rejectMutation.mutate({ companyId: rejectModal.companyId, reason: rejectModal.reason })}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
