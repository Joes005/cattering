import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/adminApi';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import { SkeletonRows } from '../../components/Skeleton';
import { formatCurrency } from '../../lib/format';
import {
  TransactionIcon,
  SearchIcon,
  CheckCircleIcon,
  EyeIcon,
} from '../../components/Icons';

export default function AdminTransactions() {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [refundModal, setRefundModal] = useState({ open: false, txn: null });
  const [toastMessage, setToastMessage] = useState('');

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['admin', 'transactions', typeFilter, statusFilter],
    queryFn: () => adminApi.listTransactions(typeFilter, statusFilter),
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const refundMutation = useMutation({
    mutationFn: (txnId) => adminApi.refundTransaction(txnId),
    onSuccess: () => {
      showToast('Transaction successfully refunded. Ledger updated.');
      setRefundModal({ open: false, txn: null });
      queryClient.invalidateQueries({ queryKey: ['admin', 'transactions'] });
    },
  });

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    if (!search.trim()) return transactions;
    const q = search.toLowerCase();
    return transactions.filter(
      (t) =>
        t.reference_id?.toLowerCase().includes(q) ||
        t.company_name?.toLowerCase().includes(q) ||
        t.transaction_type?.toLowerCase().includes(q)
    );
  }, [transactions, search]);

  const summary = useMemo(() => {
    if (!transactions) return { totalGross: 0, totalRefunds: 0, completedCount: 0 };
    return {
      totalGross: transactions.reduce((acc, t) => acc + (Number(t.amount) || 0), 0),
      totalRefunds: transactions
        .filter((t) => t.status === 'refunded' || t.transaction_type === 'refund')
        .reduce((acc, t) => acc + (Number(t.amount) || 0), 0),
      completedCount: transactions.filter((t) => t.status === 'completed' || t.status === 'paid').length,
    };
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
            Platform Financial Transactions
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Consolidated financial audit trail across customer bookings, subscription billing, workforce payouts, and refunds.
          </p>
        </div>

        {toastMessage && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 shadow-xs animate-in fade-in">
            <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      {/* Financial Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Total Transacted Volume</p>
          <p className="mt-2 text-2xl font-black text-slate-900">{formatCurrency(summary.totalGross)}</p>
          <p className="mt-1 text-[11px] text-slate-400">All recorded transactions</p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Successful Transactions</p>
          <p className="mt-2 text-2xl font-black text-emerald-700">{summary.completedCount}</p>
          <p className="mt-1 text-[11px] text-slate-400">Cleared & settled</p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Total Refunded</p>
          <p className="mt-2 text-2xl font-black text-rose-600">{formatCurrency(summary.totalRefunds)}</p>
          <p className="mt-1 text-[11px] text-slate-400">Customer chargebacks & refunds</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All Types' },
            { id: 'catering_booking', label: 'Catering Bookings' },
            { id: 'subscription', label: 'SaaS Subscriptions' },
            { id: 'workforce_payout', label: 'Workforce Payouts' },
            { id: 'refund', label: 'Refunds' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTypeFilter(t.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                typeFilter === t.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>

          <div className="relative w-full sm:w-60">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reference, company..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>
      </div>

      {/* Main List */}
      {isLoading ? (
        <SkeletonRows rows={6} />
      ) : !filteredTransactions || filteredTransactions.length === 0 ? (
        <EmptyState title="No transactions found" description="Transactions will appear here as payments and subscriptions occur." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
          <div className="divide-y divide-slate-100">
            {filteredTransactions.map((txn) => {
              const canRefund = txn.status === 'completed' && txn.transaction_type !== 'refund';

              return (
                <div
                  key={txn.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 hover:bg-slate-50/60 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">
                        {formatCurrency(txn.amount || 0)}
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 capitalize">
                        {txn.transaction_type?.replace('_', ' ') || 'Payment'}
                      </span>
                      <StatusBadge status={txn.status} />
                    </div>

                    <div className="flex flex-wrap gap-x-4 text-xs text-slate-500">
                      {txn.company_name && <span>Business: <strong className="text-slate-800">{txn.company_name}</strong></span>}
                      {txn.reference_id && <span>Ref: <strong className="font-mono text-slate-600">{txn.reference_id}</strong></span>}
                      <span>Date: {new Date(txn.created_at).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {canRefund && (
                      <button
                        onClick={() => setRefundModal({ open: true, txn })}
                        className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition shadow-2xs"
                      >
                        Issue Refund
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {refundModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Confirm Transaction Refund
            </h3>
            <p className="text-xs text-slate-500">
              Are you sure you want to issue a full refund of <strong className="text-slate-900">{formatCurrency(refundModal.txn?.amount || 0)}</strong> for reference <span className="font-mono">{refundModal.txn?.reference_id}</span>?
            </p>
            <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 font-medium">
              ⚠️ This will reverse platform commission and credit the funds back to the original payer.
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRefundModal({ open: false, txn: null })}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                disabled={refundMutation.isPending}
                onClick={() => refundMutation.mutate(refundModal.txn?.id)}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {refundMutation.isPending ? 'Refunding…' : 'Confirm & Process Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
