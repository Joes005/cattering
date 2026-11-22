import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/adminApi';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import { SkeletonRows } from '../../components/Skeleton';
import { formatCurrency } from '../../lib/format';

export default function AdminDisputes() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDisputeId, setSelectedDisputeId] = useState(null);
  const [adminMsg, setAdminMsg] = useState('');
  const [resolveModal, setResolveModal] = useState({ open: false, summary: '' });

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
      queryClient.invalidateQueries({ queryKey: ['admin', 'dispute', selectedDisputeId] });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: ({ disputeId, summary }) => adminApi.resolveDispute(disputeId, { status: 'resolved', resolution_summary: summary }),
    onSuccess: () => {
      setResolveModal({ open: false, summary: '' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'disputes'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dispute', selectedDisputeId] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Platform Dispute & Support Arbitration</h2>
        <p className="text-xs text-neutral-500">
          Arbitrate operational conflicts between customers, catering employers, and freelance workforce
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200 pb-3">
        {['all', 'open', 'under_review', 'resolved', 'dismissed'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${
              statusFilter === st
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            {st.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Dispute List (3 cols) */}
        <div className="lg:col-span-3 space-y-3">
          {isLoading ? (
            <SkeletonRows rows={5} />
          ) : !disputes || disputes.length === 0 ? (
            <EmptyState
              title="No disputes found"
              description="Platform disputes and escalations will appear here when submitted."
            />
          ) : (
            <div className="card divide-y divide-neutral-100">
              {disputes.map((d) => (
                <div
                  key={d.id}
                  onClick={() => setSelectedDisputeId(d.id)}
                  className={`cursor-pointer p-4 transition flex flex-col justify-between gap-2 hover:bg-neutral-50/80 ${
                    selectedDisputeId === d.id ? 'bg-brand-50/40 border-l-4 border-l-brand-600' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-neutral-900">{d.dispute_number}</span>
                    <StatusBadge status={d.status} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-900">{d.title}</h4>
                    <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5">{d.description}</p>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
                    <span>Parties: <strong>{d.party_type.replace(/_/g, ' ↔ ')}</strong></span>
                    {d.claim_amount > 0 && (
                      <span className="font-semibold text-rose-600">Claim: {formatCurrency(d.claim_amount)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dispute Thread & Action Panel (2 cols) */}
        <div className="lg:col-span-2">
          {!selectedDisputeId ? (
            <div className="card p-8 text-center text-xs text-neutral-400">
              Select a dispute ticket from the list to inspect messages, evidence, and issue a binding ruling.
            </div>
          ) : detailLoading || !disputeDetail ? (
            <div className="card p-6">
              <SkeletonRows rows={4} />
            </div>
          ) : (
            <div className="card p-5 space-y-4">
              <div className="border-b border-neutral-100 pb-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-neutral-900">{disputeDetail.dispute_number}</span>
                  <StatusBadge status={disputeDetail.status} />
                </div>
                <h3 className="text-base font-semibold text-neutral-900 mt-1">{disputeDetail.title}</h3>
                <p className="text-xs text-neutral-600 mt-1">{disputeDetail.description}</p>

                {disputeDetail.claim_amount > 0 && (
                  <div className="mt-2 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-800 font-medium">
                    Financial Claim: <strong>{formatCurrency(disputeDetail.claim_amount)}</strong>
                  </div>
                )}
              </div>

              {/* Message Thread */}
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Arbitration Thread</p>
                {disputeDetail.messages.length === 0 ? (
                  <p className="text-xs text-neutral-400 italic">No communication logged yet.</p>
                ) : (
                  disputeDetail.messages.map((m) => (
                    <div key={m.id} className="rounded-xl bg-neutral-50 p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between font-semibold text-neutral-700">
                        <span>{m.sender_name}</span>
                        <span className="text-[10px] text-neutral-400 font-normal">
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-neutral-600">{m.message}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Post Admin Message */}
              {disputeDetail.status !== 'resolved' && (
                <div className="space-y-2 pt-2 border-t border-neutral-100">
                  <textarea
                    rows={2}
                    value={adminMsg}
                    onChange={(e) => setAdminMsg(e.target.value)}
                    placeholder="Send administrative directive or query..."
                    className="w-full rounded-xl border border-neutral-300 p-2 text-xs focus:border-brand-500 focus:outline-none"
                  />
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setResolveModal({ open: true, summary: '' })}
                      className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                    >
                      ⚖️ Issue Final Resolution
                    </button>
                    <button
                      disabled={!adminMsg.trim() || postMsgMutation.isPending}
                      onClick={() => postMsgMutation.mutate({ disputeId: disputeDetail.id, message: adminMsg })}
                      className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                    >
                      Send Directive
                    </button>
                  </div>
                </div>
              )}

              {disputeDetail.status === 'resolved' && disputeDetail.resolution_summary && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900">
                  <p className="font-semibold">Official Resolution Summary:</p>
                  <p className="mt-1">{disputeDetail.resolution_summary}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Resolve Modal */}
      {resolveModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-base font-semibold text-neutral-900">Issue Binding Dispute Resolution</h3>
            <p className="text-xs text-neutral-500">
              Summarize the official platform determination and financial ruling. This will close the dispute ticket.
            </p>
            <textarea
              rows={3}
              value={resolveModal.summary}
              onChange={(e) => setResolveModal({ ...resolveModal, summary: e.target.value })}
              placeholder="e.g. Ruled in favor of employee for verified 4 hours worked. 50% penalty applied to catering business..."
              className="w-full rounded-xl border border-neutral-300 p-3 text-sm focus:border-brand-500 focus:outline-none"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setResolveModal({ open: false, summary: '' })}
                className="rounded-lg px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                disabled={!resolveModal.summary.trim() || resolveMutation.isPending}
                onClick={() => resolveMutation.mutate({ disputeId: selectedDisputeId, summary: resolveModal.summary })}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Confirm & Close Dispute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

