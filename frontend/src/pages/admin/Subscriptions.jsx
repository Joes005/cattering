import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/adminApi';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import { SkeletonRows } from '../../components/Skeleton';
import { formatCurrency } from '../../lib/format';

export default function AdminSubscriptions() {
  const queryClient = useQueryClient();
  const [createPlanModal, setCreatePlanModal] = useState(false);
  const [overrideModal, setOverrideModal] = useState({ open: false, companyId: '', planId: '', durationDays: 30 });
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
    onSuccess: () => {
      setCreatePlanModal(false);
      queryClient.invalidateQueries({ queryKey: ['admin', 'subscriptions', 'plans'] });
    },
  });

  const overrideMutation = useMutation({
    mutationFn: (payload) => adminApi.overrideSubscription(payload),
    onSuccess: () => {
      setOverrideModal({ open: false, companyId: '', planId: '', durationDays: 30 });
      queryClient.invalidateQueries({ queryKey: ['admin', 'subscriptions', 'list'] });
    },
  });

  return (
    <div className="space-y-8">
      {/* SaaS Tier Definitions */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">SaaS Subscription Plans</h2>
            <p className="text-xs text-neutral-500">
              Configured monetization tiers, usage limits, and monthly/annual pricing for catering businesses
            </p>
          </div>
          <button
            onClick={() => setCreatePlanModal(true)}
            className="rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-700 transition"
          >
            + Create New Plan Tier
          </button>
        </div>

        {plansLoading ? (
          <SkeletonRows rows={4} />
        ) : !plans || plans.length === 0 ? (
          <EmptyState title="No subscription plans found" description="Create your first subscription tier above." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((p) => (
              <div key={p.id} className="card p-5 space-y-3 border-t-4 border-t-brand-600 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-900">{p.name}</span>
                    <span className="rounded bg-neutral-100 font-mono text-[10px] px-2 py-0.5 text-neutral-600 uppercase">
                      {p.code}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">{p.description}</p>

                  <div className="mt-4">
                    <span className="text-2xl font-bold text-neutral-900">{formatCurrency(p.monthly_price)}</span>
                    <span className="text-xs text-neutral-500"> / month</span>
                    <p className="text-[11px] text-neutral-400 mt-0.5">or {formatCurrency(p.annual_price)} / yr</p>
                  </div>

                  <div className="mt-4 space-y-1.5 border-t border-neutral-100 pt-3 text-xs text-neutral-600">
                    <p>✓ <strong>{p.max_active_events_per_month}</strong> active events / mo</p>
                    <p>✓ Up to <strong>{p.max_customers}</strong> customer records</p>
                    <p>✓ <strong>{p.max_job_postings_per_month}</strong> workforce shifts / mo</p>
                    <p>✓ {p.custom_branding ? 'Custom Brand Settings' : 'Standard Plated Branding'}</p>
                    <p>✓ Analytics: <span className="capitalize">{p.analytics_tier}</span></p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={`inline-block w-full text-center rounded-lg py-1.5 text-xs font-semibold ${
                    p.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'
                  }`}>
                    {p.is_active ? 'Active Tier' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Subscriptions Ledger */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Active Business Subscriptions</h2>
            <p className="text-xs text-neutral-500">
              Live catering business subscriptions, renewal schedules, and manual administrative overrides
            </p>
          </div>
          <button
            onClick={() => setOverrideModal({ open: true, companyId: employers?.[0]?.id || '', planId: plans?.[0]?.id || '', durationDays: 30 })}
            className="rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition"
          >
            ⚙️ Grant Subscription Override
          </button>
        </div>

        {subsLoading ? (
          <SkeletonRows rows={4} />
        ) : !subscriptions || subscriptions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 p-8 text-center text-sm text-neutral-500">
            No active business subscriptions recorded yet. Use the override button above to assign an employer plan.
          </div>
        ) : (
          <div className="card divide-y divide-neutral-100">
            {subscriptions.map((sub) => (
              <div key={sub.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-900">{sub.company_name}</span>
                    <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                      {sub.plan?.name || 'SaaS Plan'}
                    </span>
                    <StatusBadge status={sub.status} />
                  </div>
                  <p className="text-xs text-neutral-500">
                    Cycle: <strong className="capitalize">{sub.billing_cycle}</strong> · Period End: {new Date(sub.current_period_end).toLocaleDateString()}
                    {sub.payment_reference && ` · Ref: ${sub.payment_reference}`}
                  </p>
                </div>
                <div className="text-right text-xs text-neutral-500">
                  {sub.auto_renew ? '🔄 Auto-renews' : 'Non-renewing'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Plan Modal */}
      {createPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-base font-semibold text-neutral-900">Create Subscription Plan Tier</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-medium text-neutral-700">Plan Code (slug)</label>
                <input
                  type="text"
                  value={newPlan.code}
                  onChange={(e) => setNewPlan({ ...newPlan, code: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  placeholder="e.g. enterprise_plus"
                  className="mt-1 w-full rounded-lg border border-neutral-300 p-2 text-xs"
                />
              </div>
              <div>
                <label className="font-medium text-neutral-700">Display Name</label>
                <input
                  type="text"
                  value={newPlan.name}
                  onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                  placeholder="e.g. Enterprise Plus"
                  className="mt-1 w-full rounded-lg border border-neutral-300 p-2 text-xs"
                />
              </div>
              <div className="col-span-2">
                <label className="font-medium text-neutral-700">Description</label>
                <input
                  type="text"
                  value={newPlan.description}
                  onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                  placeholder="Target audience & key features..."
                  className="mt-1 w-full rounded-lg border border-neutral-300 p-2 text-xs"
                />
              </div>
              <div>
                <label className="font-medium text-neutral-700">Monthly Price (₹)</label>
                <input
                  type="number"
                  value={newPlan.monthly_price}
                  onChange={(e) => setNewPlan({ ...newPlan, monthly_price: parseFloat(e.target.value) || 0 })}
                  className="mt-1 w-full rounded-lg border border-neutral-300 p-2 text-xs"
                />
              </div>
              <div>
                <label className="font-medium text-neutral-700">Annual Price (₹)</label>
                <input
                  type="number"
                  value={newPlan.annual_price}
                  onChange={(e) => setNewPlan({ ...newPlan, annual_price: parseFloat(e.target.value) || 0 })}
                  className="mt-1 w-full rounded-lg border border-neutral-300 p-2 text-xs"
                />
              </div>
              <div>
                <label className="font-medium text-neutral-700">Max Active Events / Mo</label>
                <input
                  type="number"
                  value={newPlan.max_active_events_per_month}
                  onChange={(e) => setNewPlan({ ...newPlan, max_active_events_per_month: parseInt(e.target.value) || 0 })}
                  className="mt-1 w-full rounded-lg border border-neutral-300 p-2 text-xs"
                />
              </div>
              <div>
                <label className="font-medium text-neutral-700">Max Customers</label>
                <input
                  type="number"
                  value={newPlan.max_customers}
                  onChange={(e) => setNewPlan({ ...newPlan, max_customers: parseInt(e.target.value) || 0 })}
                  className="mt-1 w-full rounded-lg border border-neutral-300 p-2 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
              <button
                onClick={() => setCreatePlanModal(false)}
                className="rounded-lg px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                disabled={!newPlan.code || !newPlan.name || createPlanMutation.isPending}
                onClick={() => createPlanMutation.mutate(newPlan)}
                className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                Save Plan Tier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Override Modal */}
      {overrideModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-base font-semibold text-neutral-900">Grant Subscription Override</h3>
            <p className="text-xs text-neutral-500">
              Administratively assign or extend a subscription tier for a catering business.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-neutral-700">Target Catering Business</label>
                <select
                  value={overrideModal.companyId}
                  onChange={(e) => setOverrideModal({ ...overrideModal, companyId: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-neutral-300 p-2 text-xs"
                >
                  {(employers || []).map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-medium text-neutral-700">Subscription Tier</label>
                <select
                  value={overrideModal.planId}
                  onChange={(e) => setOverrideModal({ ...overrideModal, planId: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-neutral-300 p-2 text-xs"
                >
                  {(plans || []).map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({formatCurrency(p.monthly_price)}/mo)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-medium text-neutral-700">Duration (Days)</label>
                <input
                  type="number"
                  value={overrideModal.durationDays}
                  onChange={(e) => setOverrideModal({ ...overrideModal, durationDays: parseInt(e.target.value) || 30 })}
                  className="mt-1 w-full rounded-lg border border-neutral-300 p-2 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
              <button
                onClick={() => setOverrideModal({ open: false, companyId: '', planId: '', durationDays: 30 })}
                className="rounded-lg px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                disabled={!overrideModal.companyId || !overrideModal.planId || overrideMutation.isPending}
                onClick={() => overrideMutation.mutate({
                  company_id: overrideModal.companyId,
                  plan_id: overrideModal.planId,
                  duration_days: overrideModal.durationDays,
                  billing_cycle: 'monthly',
                  status: 'active',
                })}
                className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                Apply Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

