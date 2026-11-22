import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/adminApi';
import EmptyState from '../../components/EmptyState';
import { SkeletonRows } from '../../components/Skeleton';
import { formatCurrency } from '../../lib/format';

export default function AdminCommissions() {
  const queryClient = useQueryClient();
  const [createRuleModal, setCreateRuleModal] = useState(false);
  const [newRule, setNewRule] = useState({
    commission_type: 'catering_booking',
    name: '',
    calculation_mode: 'percentage',
    rate: 8.0,
    flat_fee: 0.0,
  });

  const { data: rules, isLoading: rulesLoading } = useQuery({
    queryKey: ['admin', 'commissions', 'rules'],
    queryFn: adminApi.listCommissionRules,
  });

  const { data: ledger, isLoading: ledgerLoading } = useQuery({
    queryKey: ['admin', 'commissions', 'ledger'],
    queryFn: () => adminApi.listCommissionLedger(),
  });

  const createRuleMutation = useMutation({
    mutationFn: (payload) => adminApi.createCommissionRule(payload),
    onSuccess: () => {
      setCreateRuleModal(false);
      queryClient.invalidateQueries({ queryKey: ['admin', 'commissions', 'rules'] });
    },
  });

  const settleMutation = useMutation({
    mutationFn: (ledgerId) => adminApi.settleCommission(ledgerId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'commissions', 'ledger'] }),
  });

  const totalCommissionsEarned = (ledger || []).reduce((acc, curr) => acc + (curr.commission_amount || 0), 0);
  const totalSettled = (ledger || []).filter((l) => l.is_settled).reduce((acc, curr) => acc + (curr.commission_amount || 0), 0);
  const totalPending = totalCommissionsEarned - totalSettled;

  return (
    <div className="space-y-8">
      {/* Commission Metrics Header */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-4 border-l-4 border-l-brand-600">
          <p className="text-xs text-neutral-500 font-medium">Total Commissions Recorded</p>
          <p className="text-xl font-bold text-neutral-900 mt-1">{formatCurrency(totalCommissionsEarned)}</p>
          <p className="text-[11px] text-neutral-400 mt-0.5">Across bookings & workforce</p>
        </div>
        <div className="card p-4 border-l-4 border-l-emerald-600">
          <p className="text-xs text-neutral-500 font-medium">Settled to Platform</p>
          <p className="text-xl font-bold text-emerald-700 mt-1">{formatCurrency(totalSettled)}</p>
          <p className="text-[11px] text-neutral-400 mt-0.5">Reconciled funds</p>
        </div>
        <div className="card p-4 border-l-4 border-l-amber-500">
          <p className="text-xs text-neutral-500 font-medium">Pending Settlement</p>
          <p className="text-xl font-bold text-amber-700 mt-1">{formatCurrency(totalPending)}</p>
          <p className="text-[11px] text-neutral-400 mt-0.5">Awaiting payout release</p>
        </div>
      </div>

      {/* Commission Rules Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Commission Rules Configuration</h2>
            <p className="text-xs text-neutral-500">
              Active take-rates deducted from catering bookings and workforce shift payouts
            </p>
          </div>
          <button
            onClick={() => setCreateRuleModal(true)}
            className="rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-700 transition"
          >
            + Add Commission Rule
          </button>
        </div>

        {rulesLoading ? (
          <SkeletonRows rows={3} />
        ) : !rules || rules.length === 0 ? (
          <EmptyState title="No commission rules configured" description="Add a new commission rule above." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rules.map((r) => (
              <div key={r.id} className="card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-900 text-sm">{r.name}</span>
                  <span className="rounded bg-neutral-100 font-mono text-[10px] px-2 py-0.5 text-neutral-600 capitalize">
                    {r.commission_type.replace('_', ' ')}
                  </span>
                </div>
                <div className="pt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-neutral-900">{r.rate}%</span>
                  {r.flat_fee > 0 && <span className="text-xs text-neutral-500">+ {formatCurrency(r.flat_fee)} flat</span>}
                </div>
                <p className="text-[11px] text-neutral-400">Calculation: {r.calculation_mode}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Commission Ledger Table */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Commission Reconciliation Ledger</h2>
          <p className="text-xs text-neutral-500">
            Audit trail of every platform fee deducted from transactions
          </p>
        </div>

        {ledgerLoading ? (
          <SkeletonRows rows={5} />
        ) : !ledger || ledger.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 p-8 text-center text-sm text-neutral-500">
            No commission items recorded yet. When bookings and shifts are completed, deductions will appear here.
          </div>
        ) : (
          <div className="card divide-y divide-neutral-100">
            {ledger.map((item) => (
              <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-900">{item.company_name}</span>
                    <span className="rounded bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600 capitalize">
                      {item.commission_type.replace('_', ' ')}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      item.is_settled ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {item.is_settled ? 'Settled' : 'Pending'}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500">
                    Gross: <strong>{formatCurrency(item.gross_amount)}</strong> · Rate: {item.commission_rate}% ·
                    Commission: <strong className="text-neutral-900">{formatCurrency(item.commission_amount)}</strong> ·
                    Net Payout: {formatCurrency(item.net_payout)}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {!item.is_settled && (
                    <button
                      onClick={() => settleMutation.mutate(item.id)}
                      disabled={settleMutation.isPending}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                    >
                      ✓ Mark Settled
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Rule Modal */}
      {createRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-base font-semibold text-neutral-900">Add Commission Rule</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-neutral-700">Commission Stream</label>
                <select
                  value={newRule.commission_type}
                  onChange={(e) => setNewRule({ ...newRule, commission_type: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-neutral-300 p-2 text-xs"
                >
                  <option value="catering_booking">Catering Booking Commission</option>
                  <option value="workforce_shift">Workforce Shift Commission</option>
                </select>
              </div>

              <div>
                <label className="font-medium text-neutral-700">Rule Name</label>
                <input
                  type="text"
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  placeholder="e.g. Standard Wedding Commission"
                  className="mt-1 w-full rounded-lg border border-neutral-300 p-2 text-xs"
                />
              </div>

              <div>
                <label className="font-medium text-neutral-700">Percentage Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newRule.rate}
                  onChange={(e) => setNewRule({ ...newRule, rate: parseFloat(e.target.value) || 0 })}
                  className="mt-1 w-full rounded-lg border border-neutral-300 p-2 text-xs"
                />
              </div>

              <div>
                <label className="font-medium text-neutral-700">Flat Fee (₹, optional)</label>
                <input
                  type="number"
                  value={newRule.flat_fee}
                  onChange={(e) => setNewRule({ ...newRule, flat_fee: parseFloat(e.target.value) || 0 })}
                  className="mt-1 w-full rounded-lg border border-neutral-300 p-2 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
              <button
                onClick={() => setCreateRuleModal(false)}
                className="rounded-lg px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                disabled={!newRule.name || createRuleMutation.isPending}
                onClick={() => createRuleMutation.mutate(newRule)}
                className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                Save Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

