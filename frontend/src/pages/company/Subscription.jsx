import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { companiesApi } from '../../api/companies';
import { useAuth } from '../../context/AuthContext';
import { SkeletonCard } from '../../components/Skeleton';

const PLAN_TIERS = [
  {
    code: 'starter',
    name: 'Starter',
    monthlyPrice: 1999,
    annualPrice: 19990,
    description: 'Essential catering SaaS for boutique caterers and small event planners.',
    features: [
      'Up to 5 active events/month',
      'Up to 50 CRM customers',
      '10 workforce job postings/month',
      'Quotation & Invoice generator',
      'Standard email support',
    ],
    popular: false,
  },
  {
    code: 'growth',
    name: 'Growth Operations',
    monthlyPrice: 3999,
    annualPrice: 39990,
    description: 'Scale catering operations with expanded capacity and custom branding.',
    features: [
      'Up to 50 active events/month',
      'Up to 500 CRM customers',
      '100 workforce job postings/month',
      'Custom branding on quotes/invoices',
      'Inventory & Menu manager',
      'Priority email & phone support',
    ],
    popular: true,
  },
  {
    code: 'business',
    name: 'Business',
    monthlyPrice: 9999,
    annualPrice: 99990,
    description: 'Complete catering management suite for large-scale operations and banquet halls.',
    features: [
      'Unlimited active events',
      'Unlimited CRM customers',
      'Unlimited workforce job postings',
      'Custom branding & white-label PDFs',
      'Advanced financial & analytics reports',
      'Dedicated 24/7 account manager',
    ],
    popular: false,
  },
];

export default function CompanySubscription() {
  const { currentCompanyId, company } = useAuth();
  const queryClient = useQueryClient();
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });

  const { data: subStatus, isLoading, error } = useQuery({
    queryKey: ['company-subscription', currentCompanyId],
    queryFn: () => companiesApi.getSubscription(currentCompanyId),
    enabled: !!currentCompanyId,
  });

  const subscribeMutation = useMutation({
    mutationFn: (planCode) =>
      companiesApi.subscribePlan(currentCompanyId, {
        plan_code: planCode,
        billing_cycle: billingCycle,
        payment_reference: `CARD_${Date.now().toString().slice(-6)}`,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['company-subscription', currentCompanyId] });
      setActionMessage({
        type: 'success',
        text: `Successfully upgraded to the ${data.plan?.name || 'new'} plan!`,
      });
      setSelectedPlan(null);
    },
    onError: (err) => {
      setActionMessage({
        type: 'error',
        text: err.message || 'Failed to process subscription upgrade.',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-neutral-200" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  const activePlanCode = subStatus?.plan?.code?.toLowerCase() || 'starter';
  const hasActiveSub = subStatus?.has_active_subscription;

  // Meter calculations
  const eventsUsed = subStatus?.events_used_this_month || 0;
  const eventsLimit = subStatus?.max_events_limit || 5;
  const eventsPercent = Math.min(100, Math.round((eventsUsed / eventsLimit) * 100));

  const customersCount = subStatus?.customers_count || 0;
  const customersLimit = subStatus?.max_customers_limit || 50;
  const customersPercent = Math.min(100, Math.round((customersCount / customersLimit) * 100));

  const jobsCount = subStatus?.job_postings_count || 0;
  const jobsLimit = subStatus?.max_job_postings_limit || 10;
  const jobsPercent = Math.min(100, Math.round((jobsCount / jobsLimit) * 100));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-neutral-900">SaaS Subscription & Plan</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Manage catering business management software tier, usage limits, and billing for{' '}
          <span className="font-semibold text-neutral-800">{company?.name || 'your catering business'}</span>.
        </p>
      </div>

      {actionMessage.text && (
        <div
          className={`rounded-xl border p-4 text-sm font-medium ${
            actionMessage.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {actionMessage.text}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Failed to load subscription details: {error.message}
        </div>
      )}

      {/* Active Subscription Overview Card */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-100 pb-5">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Current Plan</span>
            <div className="flex items-center gap-3 mt-1">
              <h3 className="text-2xl font-bold text-neutral-900">{subStatus?.plan?.name || 'Starter Plan'}</h3>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  hasActiveSub ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {hasActiveSub ? 'Active Subscription' : 'Trialing / Inactive'}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-medium text-neutral-400">Current Period End</span>
            <p className="text-sm font-semibold text-neutral-800">
              {subStatus?.current_period_end
                ? new Date(subStatus.current_period_end).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : '30 Days From Activation'}
            </p>
          </div>
        </div>

        {/* Operational Usage Meters */}
        <div className="mt-6">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-4">
            Current Tier Resource Usage
          </h4>
          <div className="grid gap-6 sm:grid-cols-3">
            {/* Events Meter */}
            <div className="rounded-xl border border-neutral-100 bg-neutral-50/70 p-4">
              <div className="flex justify-between text-xs font-medium text-neutral-600 mb-1.5">
                <span>Monthly Events</span>
                <span className="font-semibold text-neutral-900">
                  {eventsUsed} / {eventsLimit}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-neutral-200 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    eventsPercent > 90 ? 'bg-red-500' : eventsPercent > 70 ? 'bg-amber-500' : 'bg-brand-600'
                  }`}
                  style={{ width: `${eventsPercent}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-neutral-400">
                {eventsLimit - eventsUsed > 0
                  ? `${eventsLimit - eventsUsed} more event slots remaining`
                  : 'Limit reached for this billing cycle'}
              </p>
            </div>

            {/* Customers Meter */}
            <div className="rounded-xl border border-neutral-100 bg-neutral-50/70 p-4">
              <div className="flex justify-between text-xs font-medium text-neutral-600 mb-1.5">
                <span>CRM Customer Contacts</span>
                <span className="font-semibold text-neutral-900">
                  {customersCount} / {customersLimit}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-neutral-200 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    customersPercent > 90 ? 'bg-red-500' : customersPercent > 70 ? 'bg-amber-500' : 'bg-brand-600'
                  }`}
                  style={{ width: `${customersPercent}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-neutral-400">
                {customersLimit - customersCount > 0
                  ? `${customersLimit - customersCount} customer slots available`
                  : 'Customer quota reached'}
              </p>
            </div>

            {/* Job Postings Meter */}
            <div className="rounded-xl border border-neutral-100 bg-neutral-50/70 p-4">
              <div className="flex justify-between text-xs font-medium text-neutral-600 mb-1.5">
                <span>Workforce Shift Postings</span>
                <span className="font-semibold text-neutral-900">
                  {jobsCount} / {jobsLimit}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-neutral-200 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    jobsPercent > 90 ? 'bg-red-500' : jobsPercent > 70 ? 'bg-amber-500' : 'bg-brand-600'
                  }`}
                  style={{ width: `${jobsPercent}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-neutral-400">
                {jobsLimit - jobsCount > 0
                  ? `${jobsLimit - jobsCount} shift postings available`
                  : 'Job posting quota reached'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Tiers Selection */}
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-bold text-neutral-900">Upgrade or Switch Plan</h3>
          <p className="mt-1 text-sm text-neutral-500">
            Choose the subscription tier that best powers your catering business.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="mt-4 inline-flex items-center rounded-xl bg-neutral-100 p-1 border border-neutral-200">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
                billingCycle === 'monthly' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition flex items-center gap-1.5 ${
                billingCycle === 'annual' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <span>Annual Billing</span>
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {PLAN_TIERS.map((tier) => {
            const isCurrent = activePlanCode === tier.code;
            const price = billingCycle === 'annual' ? tier.annualPrice : tier.monthlyPrice;
            const periodLabel = billingCycle === 'annual' ? '/year' : '/month';

            return (
              <div
                key={tier.code}
                className={`relative flex flex-col justify-between rounded-2xl border p-6 transition-all ${
                  tier.popular
                    ? 'border-brand-500 bg-brand-50/20 shadow-md ring-2 ring-brand-500/20'
                    : isCurrent
                    ? 'border-neutral-400 bg-white shadow-sm'
                    : 'border-neutral-200 bg-white hover:border-neutral-300 shadow-sm'
                }`}
              >
                {tier.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-0.5 text-xs font-bold text-white shadow-sm">
                    Most Popular
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-bold text-neutral-900">{tier.name}</h4>
                    {isCurrent && (
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-700">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-neutral-500 min-h-[32px]">{tier.description}</p>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-neutral-900">₹{price.toLocaleString()}</span>
                    <span className="text-xs text-neutral-500 font-medium">{periodLabel}</span>
                  </div>

                  <ul className="mt-6 space-y-2.5 text-xs text-neutral-600">
                    {tier.features.map((f, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full rounded-xl bg-neutral-100 py-2.5 text-xs font-semibold text-neutral-400 cursor-not-allowed"
                    >
                      Active Plan
                    </button>
                  ) : (
                    <button
                      disabled={subscribeMutation.isPending}
                      onClick={() => subscribeMutation.mutate(tier.code)}
                      className={`w-full rounded-xl py-2.5 text-xs font-bold transition shadow-sm ${
                        tier.popular
                          ? 'bg-brand-600 text-white hover:bg-brand-700'
                          : 'bg-neutral-900 text-white hover:bg-neutral-800'
                      }`}
                    >
                      {subscribeMutation.isPending ? 'Processing…' : `Switch to ${tier.name}`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
