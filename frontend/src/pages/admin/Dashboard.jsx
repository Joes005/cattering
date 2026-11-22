import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { adminApi } from '../../api/adminApi';
import { SkeletonCard, SkeletonRows } from '../../components/Skeleton';
import StatusBadge from '../../components/StatusBadge';
import { formatCurrency } from '../../lib/format';
import {
  BuildingIcon,
  StaffIcon,
  SubscriptionIcon,
  CommissionIcon,
  TransactionIcon,
  DisputeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
} from '../../components/Icons';

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const [rejectModal, setRejectModal] = useState({ open: false, companyId: null, companyName: '', reason: '' });
  const [feedbackMsg, setFeedbackMsg] = useState('');

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
      setFeedbackMsg('Catering business approved & activated successfully.');
      setTimeout(() => setFeedbackMsg(''), 4000);
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ companyId, reason }) => adminApi.rejectEmployer(companyId, reason),
    onSuccess: () => {
      setRejectModal({ open: false, companyId: null, companyName: '', reason: '' });
      setFeedbackMsg('Registration rejected with specified notification reason.');
      setTimeout(() => setFeedbackMsg(''), 4000);
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <SkeletonRows rows={5} />
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

  const formattedChartData = (revChart || []).map((pt) => ({
    name: pt.name,
    gross: Number(pt.value) || 0,
    commission: Number(pt.secondary_value) || 0,
  }));

  return (
    <div className="space-y-8">
      {/* Page Title & Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Platform Command Dashboard</h2>
          <p className="mt-1 text-xs text-slate-500">
            Real-time ecosystem overview across 4 platform roles: Admin, Employer, Employee, and Customer.
          </p>
        </div>

        {feedbackMsg && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-800 shadow-xs animate-in fade-in">
            <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
            <span>{feedbackMsg}</span>
          </div>
        )}
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* Metric 1: Businesses */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Catering Businesses</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <BuildingIcon className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">{s.total_employers}</p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px]">
            {s.pending_employers > 0 ? (
              <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                {s.pending_employers} pending KYC
              </span>
            ) : (
              <span className="text-slate-400">All verified</span>
            )}
          </div>
        </div>

        {/* Metric 2: Workforce */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Independent Workforce</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <StaffIcon className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">{s.total_employees}</p>
          <div className="mt-2 text-[11px] text-slate-400">
            Professional staff
          </div>
        </div>

        {/* Metric 3: Events */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Platform Bookings</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <ShieldCheckIcon className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">{s.total_events}</p>
          <div className="mt-2 text-[11px] text-slate-400">
            Across all caterers
          </div>
        </div>

        {/* Metric 4: GMV Volume */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Gross Catering GMV</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <TransactionIcon className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">{formatCurrency(s.total_revenue || 0)}</p>
          <div className="mt-2 text-[11px] font-semibold text-emerald-700">
            Invoiced volume
          </div>
        </div>

        {/* Metric 5: Subscriptions */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">SaaS Subscriptions</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <SubscriptionIcon className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">{s.total_subscriptions}</p>
          <div className="mt-2 text-[11px] text-slate-400">
            Active employer tiers
          </div>
        </div>

        {/* Metric 6: Commissions */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Platform Commissions</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <CommissionIcon className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">{formatCurrency(s.total_commissions || 0)}</p>
          <div className="mt-2 text-[11px]">
            {s.open_disputes > 0 ? (
              <span className="font-bold text-rose-600">{s.open_disputes} open disputes</span>
            ) : (
              <span className="text-emerald-700 font-semibold">0 disputes pending</span>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Trajectory Chart & Quick Governance Shortcuts */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Area Chart */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Platform Financial Trajectory</h3>
              <p className="text-xs text-slate-500">Gross Catering Volume vs Net Platform Commission</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                <span className="font-medium text-slate-600">Gross GMV</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-teal-600"></span>
                <span className="font-medium text-slate-600">Net Platform Take</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            {formattedChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={formattedChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grossGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="commGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '12px',
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    formatter={(val) => [formatCurrency(val), '']}
                  />
                  <Area type="monotone" dataKey="gross" stroke="#10b981" strokeWidth={2.5} fill="url(#grossGrad)" name="Gross GMV" />
                  <Area type="monotone" dataKey="commission" stroke="#0d9488" strokeWidth={2.5} fill="url(#commGrad)" name="Platform Commission" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                Awaiting transaction activity to render trajectory chart.
              </div>
            )}
          </div>
        </div>

        {/* Quick Command Desk */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Governance Shortcuts</h3>
            <p className="mt-1 text-xs text-slate-500">Direct shortcuts to critical administrative consoles.</p>

            <div className="mt-4 space-y-2.5">
              <Link
                to="/admin/companies"
                className="group flex items-center justify-between rounded-xl border border-slate-200/80 p-3 text-xs font-semibold text-slate-700 transition hover:border-emerald-500 hover:bg-emerald-50/30"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition">
                    <BuildingIcon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-slate-900 font-bold">Catering Businesses & KYC</p>
                    <p className="text-[11px] font-normal text-slate-500">{s.pending_employers} awaiting review</p>
                  </div>
                </div>
                <ArrowRightIcon className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
              </Link>

              <Link
                to="/admin/subscriptions"
                className="group flex items-center justify-between rounded-xl border border-slate-200/80 p-3 text-xs font-semibold text-slate-700 transition hover:border-emerald-500 hover:bg-emerald-50/30"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition">
                    <SubscriptionIcon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-slate-900 font-bold">SaaS Subscription Plans</p>
                    <p className="text-[11px] font-normal text-slate-500">Tiers, limits & overrides</p>
                  </div>
                </div>
                <ArrowRightIcon className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
              </Link>

              <Link
                to="/admin/commissions"
                className="group flex items-center justify-between rounded-xl border border-slate-200/80 p-3 text-xs font-semibold text-slate-700 transition hover:border-emerald-500 hover:bg-emerald-50/30"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition">
                    <CommissionIcon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-slate-900 font-bold">Commission Ledger & Payouts</p>
                    <p className="text-[11px] font-normal text-slate-500">Rates, settlements & cuts</p>
                  </div>
                </div>
                <ArrowRightIcon className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
              </Link>

              <Link
                to="/admin/disputes"
                className="group flex items-center justify-between rounded-xl border border-slate-200/80 p-3 text-xs font-semibold text-slate-700 transition hover:border-emerald-500 hover:bg-emerald-50/30"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition">
                    <DisputeIcon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-slate-900 font-bold">Disputes & Arbitration</p>
                    <p className="text-[11px] font-normal text-slate-500">{s.open_disputes} open tickets</p>
                  </div>
                </div>
                <ArrowRightIcon className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
              </Link>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-slate-50 p-3 text-center border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500">Platform Version: 2.0.0 (Production)</span>
          </div>
        </div>
      </div>

      {/* Urgent Action Desk: Pending Catering Businesses Verification */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                Pending Catering Registrations
              </h3>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                (pendingEmployers?.length || 0) > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
              }`}>
                {pendingEmployers?.length || 0}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Review and approve catering businesses to allow service listings and bookings.
            </p>
          </div>

          <Link
            to="/admin/companies"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            <span>View All Businesses</span>
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
        </div>

        {pendingLoading ? (
          <SkeletonRows rows={3} />
        ) : !pendingEmployers || pendingEmployers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-2">
              <CheckCircleIcon className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">All Catering Registrations are Approved</p>
            <p className="text-xs text-slate-500 mt-1">There are no pending KYC reviews waiting in the queue.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pendingEmployers.map((emp) => (
              <div key={emp.id} className="flex flex-col lg:flex-row lg:items-center justify-between py-4 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-bold text-slate-900 text-sm">{emp.name}</span>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      {emp.business_type || 'Catering'}
                    </span>
                    <StatusBadge status={emp.status} />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    {emp.owner_name && <span>Owner: <strong className="text-slate-800">{emp.owner_name}</strong></span>}
                    {emp.owner_email && <span>Email: {emp.owner_email}</span>}
                    {emp.owner_phone && <span>Phone: {emp.owner_phone}</span>}
                    {emp.gst_number && <span>GSTIN: <strong className="font-mono text-slate-800">{emp.gst_number}</strong></span>}
                  </div>
                  {emp.business_address && (
                    <p className="text-xs text-slate-400">📍 {emp.business_address}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => approveMutation.mutate(emp.id)}
                    disabled={approveMutation.isPending}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                  >
                    <CheckCircleIcon className="h-4 w-4" />
                    <span>Approve & Verify</span>
                  </button>
                  <button
                    onClick={() => setRejectModal({ open: true, companyId: emp.id, companyName: emp.name, reason: '' })}
                    className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
                  >
                    <XCircleIcon className="h-4 w-4" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Reject Catering KYC — {rejectModal.companyName}
              </h3>
              <button
                onClick={() => setRejectModal({ open: false, companyId: null, companyName: '', reason: '' })}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500">
              State the reason for rejecting this catering business registration. This explanation will be displayed to the business owner to let them correct their submission.
            </p>
            <textarea
              rows={3}
              value={rejectModal.reason}
              onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
              placeholder="e.g. Invalid GSTIN certificate or food safety license unverified..."
              className="w-full rounded-xl border border-slate-300 p-3 text-xs focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectModal({ open: false, companyId: null, companyName: '', reason: '' })}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                disabled={!rejectModal.reason.trim() || rejectMutation.isPending}
                onClick={() => rejectMutation.mutate({ companyId: rejectModal.companyId, reason: rejectModal.reason })}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {rejectMutation.isPending ? 'Rejecting…' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
