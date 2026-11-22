import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/adminApi';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import { SkeletonRows } from '../../components/Skeleton';
import { formatCurrency } from '../../lib/format';
import {
  DisputeIcon,
  CheckCircleIcon,
  EyeIcon,
  ShieldCheckIcon,
} from '../../components/Icons';

export default function AdminDisputes() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDisputeId, setSelectedDisputeId] = useState(null);
  const [adminMsg, setAdminMsg] = useState('');
  const [resolveModal, setResolveModal] = useState({ open: false, summary: '', verdict: 'refund_customer' });
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const { data: disputes, isLoading } = useQuery({
    queryKey: ['admin', 'disputes', statusFilter],
    queryFn: () => adminApi.listDisputes(statusFilter),
  });

  const { data: disputeDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['admin', 'dispute', selectedDisputeId],
    queryFn: () => adminApi.getDispute(selectedDisputeId),
    enabled: !!selectedDisputeId,
  });

  const postMsgMutation = useMutation({
    mutationFn: ({ disputeId, message }) => adminApi.postDisputeMessage(disputeId, { message }),
    onSuccess: () => {
      setAdminMsg('');
      showToast('Mediation note delivered.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'dispute', selectedDisputeId] });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: ({ disputeId, summary }) =>
      adminApi.resolveDispute(disputeId, { status: 'resolved', resolution_summary: summary }),
    onSuccess: () => {
      showToast('Dispute resolved and closed with official verdict.');
      setResolveModal({ open: false, summary: '', verdict: 'refund_customer' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'disputes'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dispute', selectedDisputeId] });
    },
  });

  const activeDispute = disputeDetail || (disputes && disputes.find((d) => d.id === selectedDisputeId));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
            Disputes & Arbitration Desk
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Mediate conflicts between customers, catering businesses, and workforce professionals with binding resolutions.
          </p>
        </div>

        {toastMessage && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 shadow-xs animate-in fade-in">
            <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
        {[
          { id: 'all', label: 'All Cases' },
          { id: 'open', label: 'Open' },
          { id: 'under_review', label: 'Under Arbitration' },
          { id: 'resolved', label: 'Resolved' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold capitalize transition ${
              statusFilter === tab.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Two Pane Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[500px]">
        {/* Left: Dispute List (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Dispute Cases</h3>
            {isLoading ? (
              <SkeletonRows rows={4} />
            ) : !disputes || disputes.length === 0 ? (
              <EmptyState title="No disputes in this view" description="Any opened customer or workforce disputes will appear here." />
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-[600px] pr-1">
                {disputes.map((d) => {
                  const isSelected = d.id === selectedDisputeId;
                  return (
                    <div
                      key={d.id}
                      onClick={() => setSelectedDisputeId(d.id)}
                      className={`cursor-pointer rounded-xl p-3.5 border transition ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/40 shadow-xs ring-1 ring-emerald-500/20'
                          : 'border-slate-200/80 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 text-xs truncate">
                          {d.title || d.reason || 'Booking Dispute'}
                        </span>
                        <StatusBadge status={d.status} />
                      </div>

                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                        <span>By: <strong>{d.raised_by_name || 'Customer'}</strong></span>
                        {d.disputed_amount && (
                          <span className="font-bold text-slate-800">{formatCurrency(d.disputed_amount)}</span>
                        )}
                      </div>

                      <p className="mt-1 text-[11px] text-slate-400 line-clamp-2">
                        {d.description || 'No detailed claim description provided.'}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Active Dispute Arbitration Thread (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs flex flex-col justify-between">
          {!activeDispute ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                <DisputeIcon className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">Select a Dispute Case</p>
              <p className="text-xs text-slate-400 mt-1">Choose a ticket from the left panel to review claims and mediate.</p>
            </div>
          ) : (
            <div className="flex flex-col h-full justify-between space-y-4">
              <div>
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">{activeDispute.title || 'Dispute Investigation'}</h3>
                      <StatusBadge status={activeDispute.status} />
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Case Ref: <span className="font-mono">{activeDispute.id?.slice(0, 8)}</span> · Opened {new Date(activeDispute.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {activeDispute.status !== 'resolved' && (
                    <button
                      onClick={() => setResolveModal({ open: true, summary: '', verdict: 'refund_customer' })}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                    >
                      Issue Verdict & Resolve
                    </button>
                  )}
                </div>

                {/* Case Info Cards */}
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100 mt-4">
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] font-semibold">Complainant:</span>
                    <p className="font-bold text-slate-800 mt-0.5">{activeDispute.raised_by_name || 'Customer'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] font-semibold">Disputed Amount:</span>
                    <p className="font-black text-rose-600 mt-0.5">{formatCurrency(activeDispute.disputed_amount || 0)}</p>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-slate-200/60">
                    <span className="text-slate-400 uppercase text-[10px] font-semibold">Claim Details:</span>
                    <p className="text-slate-700 mt-1 leading-relaxed">{activeDispute.description || 'Customer initiated dispute on catering deliverables.'}</p>
                  </div>
                </div>

                {/* Resolution Summary if already resolved */}
                {activeDispute.resolution_summary && (
                  <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs">
                    <p className="font-bold text-emerald-900">Official Platform Verdict & Summary</p>
                    <p className="text-emerald-800 mt-1 leading-relaxed">{activeDispute.resolution_summary}</p>
                  </div>
                )}

                {/* Messages Thread */}
                <div className="mt-5 space-y-3 max-h-72 overflow-y-auto pr-1">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Arbitration Log</p>
                  {(activeDispute.messages || []).length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No message notes recorded yet.</p>
                  ) : (
                    activeDispute.messages.map((m, idx) => (
                      <div key={idx} className="rounded-xl bg-slate-50 p-3 text-xs border border-slate-100 space-y-1">
                        <div className="flex justify-between items-center text-[10px] text-slate-400">
                          <strong className="text-slate-700">{m.sender_name || 'Admin'}</strong>
                          <span>{new Date(m.created_at).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-slate-800 leading-relaxed">{m.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Message Composer */}
              {activeDispute.status !== 'resolved' && (
                <div className="pt-3 border-t border-slate-100 flex gap-2">
                  <input
                    type="text"
                    value={adminMsg}
                    onChange={(e) => setAdminMsg(e.target.value)}
                    placeholder="Type official admin response or mediation request..."
                    className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && adminMsg.trim()) {
                        postMsgMutation.mutate({ disputeId: activeDispute.id, message: adminMsg });
                      }
                    }}
                  />
                  <button
                    disabled={!adminMsg.trim() || postMsgMutation.isPending}
                    onClick={() => postMsgMutation.mutate({ disputeId: activeDispute.id, message: adminMsg })}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    Send Note
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Resolve Verdict Modal */}
      {resolveModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Issue Arbitration Verdict</h3>
              <button onClick={() => setResolveModal({ open: false, summary: '', verdict: 'refund_customer' })} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>
            <p className="text-xs text-slate-500">
              Formally resolve this dispute. Enter the official judgment and settlement action that will be archived into the platform audit trail.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Verdict Action</label>
                <select
                  value={resolveModal.verdict}
                  onChange={(e) => setResolveModal({ ...resolveModal, verdict: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-emerald-500 focus:outline-none"
                >
                  <option value="refund_customer">Full Refund to Customer</option>
                  <option value="release_to_employer">Release Funds to Catering Business</option>
                  <option value="split_settlement">Split 50/50 Amicable Settlement</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Official Resolution Explanation *</label>
                <textarea
                  rows={3}
                  required
                  value={resolveModal.summary}
                  onChange={(e) => setResolveModal({ ...resolveModal, summary: e.target.value })}
                  placeholder="e.g. Evidence showed caterer arrived 2 hours late. Issued partial refund of ₹5,000 to customer and released remainder to caterer."
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResolveModal({ open: false, summary: '', verdict: 'refund_customer' })}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!resolveModal.summary.trim() || resolveMutation.isPending}
                  onClick={() =>
                    resolveMutation.mutate({
                      disputeId: activeDispute?.id,
                      summary: `Verdict [${resolveModal.verdict}]: ${resolveModal.summary}`,
                    })
                  }
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {resolveMutation.isPending ? 'Resolving…' : 'Finalize Verdict'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
