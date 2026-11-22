import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/adminApi';
import EmptyState from '../../components/EmptyState';
import { SkeletonRows } from '../../components/Skeleton';
import { formatCurrency } from '../../lib/format';
import {
  CommissionIcon,
  CheckCircleIcon,
  PlusIcon,
  TransactionIcon,
} from '../../components/Icons';

export default function AdminCommissions() {
  const queryClient = useQueryClient();
  const [createRuleModal, setCreateRuleModal] = useState(false);
  const [settledFilter, setSettledFilter] = useState('all');
  const [toastMessage, setToastMessage] = useState('');

  const [newRule, setNewRule] = useState({
    commission_type: 'catering_booking',
    name: '',
    calculation_mode: 'percentage',
    rate: 8.0,
    flat_fee: 0.0,
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

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
    onSuccess: (created) => {
      showToast(`Created rule "${created.name}" successfully.`);
      setCreateRuleModal(false);
      setNewRule({
        commission_type: 'catering_booking',
        name: '',
        calculation_mode: 'percentage',
        rate: 8.0,
        flat_fee: 0.0,
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'commissions', 'rules'] });
    },
  });

  const settleMutation = useMutation({
    mutationFn: (ledgerId) => adminApi.settleCommission(ledgerId),
    onSuccess: () => {
      showToast('Commission item marked settled.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'commissions', 'ledger'] });
    },
  });

  const filteredLedger = useMemo(() => {
    if (!ledger) return [];
    if (settledFilter === 'settled') return ledger.filter((l) => l.is_settled);
    if (settledFilter === 'unsettled') return ledger.filter((l) => !l.is_settled);
    return ledger;
  }, [ledger, settledFilter]);

  const stats = useMemo(() => {
    if (!ledger) return { totalGross: 0, totalFees: 0, unsettledFees: 0 };
    return {
      totalGross: ledger.reduce((acc, l) => acc + (Number(l.gross_amount) || 0), 0),
      totalFees: ledger.reduce((acc, l) => acc + (Number(l.fee_amount) || 0), 0),
      unsettledFees: ledger
        .filter((l) => !l.is_settled)
        .reduce((acc, l) => acc + (Number(l.fee_amount) || 0), 0),
    };
  }, [ledger]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
            Marketplace Commissions & Revenue Take
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Configure platform commission rules on catering event bookings and workforce hiring, and track settlements.
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
            onClick={() => setCreateRuleModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
          >
            <PlusIcon className="h-4 w-4" />
            <span>New Commission Rule</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Total Invoiced GMV</p>
          <p className="mt-2 text-2xl font-black text-slate-900">{formatCurrency(stats.totalGross)}</p>
          <p className="mt-1 text-[11px] text-slate-400">Underlying booking volume</p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Total Commissions Earned</p>
          <p className="mt-2 text-2xl font-black text-emerald-700">{formatCurrency(stats.totalFees)}</p>
          <p className="mt-1 text-[11px] text-slate-400">Platform revenue take</p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Pending Settlements</p>
          <p className="mt-2 text-2xl font-black text-amber-600">{formatCurrency(stats.unsettledFees)}</p>
          <p className="mt-1 text-[11px] text-slate-400">Awaiting payout clearance</p>
        </div>
      </div>

      {/* Active Rules Grid */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Active Commission Rules</h3>
        {rulesLoading ? (
          <SkeletonRows rows={2} />
        ) : !rules || rules.length === 0 ? (
          <EmptyState title="No rules configured" description="Create a commission rule to begin generating revenue on bookings." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {rules.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{r.name}</span>
                    <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800 capitalize">
                      {r.commission_type?.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Mode: <strong className="capitalize">{r.calculation_mode}</strong> · Rate: <strong className="text-emerald-700">{r.rate}%</strong>
                    {r.flat_fee > 0 && ` + ${formatCurrency(r.flat_fee)} flat`}
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700 font-bold text-sm">
                  {r.rate}%
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Commission Ledger Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Platform Commission Ledger</h3>
            <p className="text-xs text-slate-500">Auditable log of every commission fee calculated on events and job placements.</p>
          </div>

          <div className="flex items-center gap-1.5">
            {['all', 'unsettled', 'settled'].map((f) => (
              <button
                key={f}
                onClick={() => setSettledFilter(f)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition ${
                  settledFilter === f
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {ledgerLoading ? (
          <SkeletonRows rows={5} />
        ) : !filteredLedger || filteredLedger.length === 0 ? (
          <EmptyState title="No commission transactions recorded" description="When caterers complete paid events, commission records will be listed here." />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
            <div className="divide-y divide-slate-100">
              {filteredLedger.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 hover:bg-slate-50/60 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">
                        {item.company_name || 'Catering Partner'}
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-600">
                        Gross: {formatCurrency(item.gross_amount || 0)}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          item.is_settled
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.is_settled ? 'Settled' : 'Pending Settlement'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-4 text-xs text-slate-500">
                      <span>Rate: <strong>{item.rate_applied}%</strong></span>
                      <span>Platform Take: <strong className="text-emerald-700">{formatCurrency(item.fee_amount || 0)}</strong></span>
                      <span>Recorded: {new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!item.is_settled && (
                      <button
                        onClick={() => settleMutation.mutate(item.id)}
                        disabled={settleMutation.isPending}
                        className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-2xs"
                      >
                        Mark Settled
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Rule Modal */}
      {createRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add Commission Rule</h3>
              <button onClick={() => setCreateRuleModal(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createRuleMutation.mutate(newRule);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Rule Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Standard Catering Booking Fee (8%)"
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Commission Category</label>
                <select
                  value={newRule.commission_type}
                  onChange={(e) => setNewRule({ ...newRule, commission_type: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-emerald-500 focus:outline-none"
                >
                  <option value="catering_booking">Catering Event Booking</option>
                  <option value="workforce_hiring">Workforce Placement / Hiring</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Commission % *</label>
                  <input
                    required
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={newRule.rate}
                    onChange={(e) => setNewRule({ ...newRule, rate: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Flat Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={newRule.flat_fee}
                    onChange={(e) => setNewRule({ ...newRule, flat_fee: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateRuleModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createRuleMutation.isPending}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {createRuleMutation.isPending ? 'Saving…' : 'Create Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
