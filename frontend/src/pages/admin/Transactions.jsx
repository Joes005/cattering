import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/adminApi';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import { SkeletonRows } from '../../components/Skeleton';
import { formatCurrency } from '../../lib/format';

export default function AdminTransactions() {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [refundModal, setRefundModal] = useState({ open: false, txn: null });

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['admin', 'transactions', typeFilter, statusFilter],
    queryFn: () => adminApi.listTransactions(typeFilter, statusFilter),
  });

  const refundMutation = useMutation({
    mutationFn: (txnId) => adminApi.refundTransaction(txnId),
    onSuccess: () => {
      setRefundModal({ open: false, txn: null });
      queryClient.invalidateQueries({ queryKey: ['admin', 'transactions'] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Platform Financial Transactions</h2>
          <p className="text-xs text-neutral-500">
            Consolidated ledger of customer bookings, subscription billing, workforce payouts, and refunds
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-neutral-500 mr-1">Type:</span>
          {['all', 'customer_payment', 'subscription_fee', 'workforce_payout', 'commission_deduction', 'refund'].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition ${
                typeFilter === t
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              {t.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-neutral-500 mr-1">Status:</span>
          {['all', 'completed', 'pending', 'refunded', 'failed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition ${
                statusFilter === st
                  ? 'bg-neutral-800 text-white'
                  : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction List */}
      {isLoading ? (
        <SkeletonRows rows={6} />
      ) : !transactions || transactions.length === 0 ? (
        <EmptyState
          title="No transactions found"
          description="Financial transactions will be recorded as events and subscriptions proceed."
        />
      ) : (
        <div className="card divide-y divide-neutral-100">
          {transactions.map((txn) => {
            const isRefundable = txn.status === 'completed' && txn.transaction_type !== 'refund';

            return (
              <div key={txn.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-neutral-900">{txn.transaction_number}</span>
                    <span className="rounded bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-700 capitalize">
                      {txn.transaction_type.replace(/_/g, ' ')}
                    </span>
                    <StatusBadge status={txn.status} />
                  </div>
                  <p className="text-xs text-neutral-500">
                    {txn.company_name && <span>Business: <strong className="text-neutral-700">{txn.company_name}</strong> · </span>}
                    {txn.user_name && <span>User: {txn.user_name} · </span>}
                    Provider: <strong className="capitalize">{txn.gateway_provider}</strong>
                    {txn.gateway_reference && ` (${txn.gateway_reference})`} ·
                    Date: {new Date(txn.created_at).toLocaleDateString()}
                  </p>
                  {txn.description && <p className="text-xs text-neutral-400">{txn.description}</p>}
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <p className={`text-base font-bold ${
                      txn.transaction_type === 'refund' ? 'text-rose-600' : 'text-neutral-900'
                    }`}>
                      {txn.transaction_type === 'refund' ? '-' : '+'}{formatCurrency(txn.amount)}
                    </p>
                    <p className="text-[10px] text-neutral-400 font-mono">{txn.currency}</p>
                  </div>

                  {isRefundable && (
                    <button
                      onClick={() => setRefundModal({ open: true, txn })}
                      className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-rose-50 hover:text-rose-700 transition"
                    >
                      Refund
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Refund Confirmation Modal */}
      {refundModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-base font-semibold text-neutral-900">Authorize Transaction Refund</h3>
            <p className="text-xs text-neutral-500">
              Are you sure you want to refund transaction <strong>{refundModal.txn?.transaction_number}</strong> of amount{' '}
              <strong className="text-neutral-900">{formatCurrency(refundModal.txn?.amount || 0)}</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRefundModal({ open: false, txn: null })}
                className="rounded-lg px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                disabled={refundMutation.isPending}
                onClick={() => refundMutation.mutate(refundModal.txn.id)}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                Confirm Full Refund
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

