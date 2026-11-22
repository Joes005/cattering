import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/adminApi';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import { SkeletonRows } from '../../components/Skeleton';
import { formatCurrency } from '../../lib/format';
import {
  SubscriptionIcon,
  SearchIcon,
  CheckCircleIcon,
  PlusIcon,
  ShieldCheckIcon,
} from '../../components/Icons';

export default function AdminSubscriptions() {
  const queryClient = useQueryClient();
  const [createPlanModal, setCreatePlanModal] = useState(false);
  const [overrideModal, setOverrideModal] = useState({ open: false, companyId: '', planId: '', durationDays: 30 });
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const [newPlan, setNewPlan] = useState({
    code: '',
    name: '',
    description: '',
    monthly_price: 1499,
    annual_price: 14990,
    max_active_events_per_month: 20,
    max_customers: 100,
    max_job_postings_per_month: 25,
    custom_branding: false,
    analytics_tier: 'basic',
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['admin', 'subscriptions', 'plans'],
    queryFn: adminApi.listSubscriptionPlans,
  });

  const { data: subscriptions, isLoading: subsLoading } = useQuery({
    queryKey: ['admin', 'subscriptions', 'list'],
    queryFn: () => adminApi.listSubscriptions(),
  });

  const { data: employers } = useQuery({
    queryKey: ['admin', 'employers'],
    queryFn: () => adminApi.listEmployers(),
  });

  const createPlanMutation = useMutation({
    mutationFn: (payload) => adminApi.createSubscriptionPlan(payload),
    onSuccess: (created) => {
      showToast(`Created new plan "${created.name}" successfully.`);
      setCreatePlanModal(false);
      setNewPlan({
        code: '',
        name: '',
        description: '',
        monthly_price: 1499,
        annual_price: 14990,
        max_active_events_per_month: 20,
        max_customers: 100,
        max_job_postings_per_month: 25,
        custom_branding: false,
        analytics_tier: 'basic',
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'subscriptions'] });
    },
  });

  const overrideMutation = useMutation({
    mutationFn: ({ companyId, planId, durationDays }) =>
      adminApi.overrideSubscription({ company_id: companyId, plan_id: planId, duration_days: durationDays }),
    onSuccess: () => {
      showToast('Manual subscription override granted successfully.');
      setOverrideModal({ open: false, companyId: '', planId: '', durationDays: 30 });
      queryClient.invalidateQueries({ queryKey: ['admin', 'subscriptions'] });
    },
  });

  const filteredSubscriptions = useMemo(() => {
    if (!subscriptions) return [];
    if (!searchQuery.trim()) return subscriptions;
    const q = searchQuery.toLowerCase();
    return subscriptions.filter(
      (s) =>
        s.company_name?.toLowerCase().includes(q) ||
        s.plan_name?.toLowerCase().includes(q) ||
        s.status?.toLowerCase().includes(q)
    );
  }, [subscriptions, searchQuery]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
            SaaS Subscription Tiers & Billing
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Define software subscription packages, set event & workforce quotas, and manage active caterer entitlements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {toastMessage && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 shadow-xs animate-in fade-in">
              <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
              <span>{toastMessage}</span>
            </div>
          )}

          <button
            onClick={() => setCreatePlanModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Create Plan Tier</span>
          </button>

          <button
            onClick={() => setOverrideModal({ open: true, companyId: '', planId: '', durationDays: 30 })}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
          >
            Manual Override
          </button>
        </div>
      </div>

      {/* Plan Tiers Grid */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Available SaaS Plans</h3>
        {plansLoading ? (
          <SkeletonRows rows={3} />
        ) : !plans || plans.length === 0 ? (
          <EmptyState title="No plans configured" description="Create your first subscription tier to monetize the SaaS platform." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((p) => (
              <div
                key={p.id}
                className="relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-mono uppercase text-slate-600">
                      {p.code}
                    </span>
                    {p.code === 'growth' && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        Popular
                      </span>
                    )}
                  </div>
                  <h4 className="mt-2 text-base font-bold text-slate-900">{p.name}</h4>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">{p.description || 'Standard catering tier'}</p>

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-slate-900">{formatCurrency(p.monthly_price)}</span>
                      <span className="text-xs text-slate-400">/mo</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      or {formatCurrency(p.annual_price)}/year billed annually
                    </p>
                  </div>

                  {/* Quotas */}
                  <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Events quota:</span>
                      <strong className="text-slate-800">{p.max_active_events_per_month} / mo</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Client CRM quota:</span>
                      <strong className="text-slate-800">{p.max_customers} clients</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Job postings:</span>
                      <strong className="text-slate-800">{p.max_job_postings_per_month} / mo</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Custom Branding:</span>
                      <strong className={p.custom_branding ? 'text-emerald-700' : 'text-slate-400'}>
                        {p.custom_branding ? 'Included' : 'No'}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Analytics Tier:</span>
                      <strong className="text-slate-800 capitalize">{p.analytics_tier}</strong>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Subscriptions List */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Active Caterer Subscriptions</h3>
            <p className="text-xs text-slate-500">Live employer SaaS contracts, expiry dates, and billing renewal status.</p>
          </div>

          <div className="relative w-full sm:w-64">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search business or plan..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        {subsLoading ? (
          <SkeletonRows rows={5} />
        ) : !filteredSubscriptions || filteredSubscriptions.length === 0 ? (
          <EmptyState title="No active subscriptions found" description="Subscriptions will appear here as employers upgrade their plans." />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
            <div className="divide-y divide-slate-100">
              {filteredSubscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 hover:bg-slate-50/60 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">
                        {sub.company_name || 'Catering Company'}
                      </span>
                      <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        {sub.plan_name || 'Standard Plan'}
                      </span>
                      <StatusBadge status={sub.status} />
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>Cycle: <strong className="capitalize text-slate-700">{sub.billing_cycle || 'monthly'}</strong></span>
                      {sub.started_at && (
                        <span>Started: {new Date(sub.started_at).toLocaleDateString()}</span>
                      )}
                      {sub.current_period_end && (
                        <span>Renews / Expires: <strong className="text-slate-800">{new Date(sub.current_period_end).toLocaleDateString()}</strong></span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono text-slate-400">
                      ID: {sub.id?.slice(0, 8)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Plan Modal */}
      {createPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Create SaaS Plan Tier</h3>
              <button onClick={() => setCreatePlanModal(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createPlanMutation.mutate(newPlan);
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Plan Code *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. enterprise"
                    value={newPlan.code}
                    onChange={(e) => setNewPlan({ ...newPlan, code: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Plan Name *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Enterprise Tier"
                    value={newPlan.name}
                    onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newPlan.description}
                  onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                  placeholder="Target audience & inclusions..."
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Monthly Price (₹) *</label>
                  <input
                    required
                    type="number"
                    value={newPlan.monthly_price}
                    onChange={(e) => setNewPlan({ ...newPlan, monthly_price: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Annual Price (₹) *</label>
                  <input
                    required
                    type="number"
                    value={newPlan.annual_price}
                    onChange={(e) => setNewPlan({ ...newPlan, annual_price: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Events/Mo</label>
                  <input
                    type="number"
                    value={newPlan.max_active_events_per_month}
                    onChange={(e) => setNewPlan({ ...newPlan, max_active_events_per_month: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Clients</label>
                  <input
                    type="number"
                    value={newPlan.max_customers}
                    onChange={(e) => setNewPlan({ ...newPlan, max_customers: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Job Postings/Mo</label>
                  <input
                    type="number"
                    value={newPlan.max_job_postings_per_month}
                    onChange={(e) => setNewPlan({ ...newPlan, max_job_postings_per_month: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPlan.custom_branding}
                    onChange={(e) => setNewPlan({ ...newPlan, custom_branding: e.target.checked })}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-semibold text-slate-700">Custom Branding Enabled</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreatePlanModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPlanMutation.isPending}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {createPlanMutation.isPending ? 'Creating…' : 'Save Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Subscription Override Modal */}
      {overrideModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Manual Plan Override</h3>
              <button onClick={() => setOverrideModal({ open: false, companyId: '', planId: '', durationDays: 30 })} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>
            <p className="text-xs text-slate-500">
              Grant custom plan access or complimentary trials to any registered catering business.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                overrideMutation.mutate(overrideModal);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Business *</label>
                <select
                  required
                  value={overrideModal.companyId}
                  onChange={(e) => setOverrideModal({ ...overrideModal, companyId: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">Select a catering business...</option>
                  {(employers || []).map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.owner_email || 'No email'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Plan Tier *</label>
                <select
                  required
                  value={overrideModal.planId}
                  onChange={(e) => setOverrideModal({ ...overrideModal, planId: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">Select a plan tier...</option>
                  {(plans || []).map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.name} ({formatCurrency(pl.monthly_price)}/mo)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Duration (Days)</label>
                <input
                  type="number"
                  min="1"
                  max="3650"
                  value={overrideModal.durationDays}
                  onChange={(e) => setOverrideModal({ ...overrideModal, durationDays: parseInt(e.target.value) || 30 })}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setOverrideModal({ open: false, companyId: '', planId: '', durationDays: 30 })}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!overrideModal.companyId || !overrideModal.planId || overrideMutation.isPending}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {overrideMutation.isPending ? 'Applying…' : 'Apply Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
