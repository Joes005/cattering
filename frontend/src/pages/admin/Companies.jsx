import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/adminApi';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import { SkeletonRows } from '../../components/Skeleton';

export default function AdminCompanies() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [rejectModal, setRejectModal] = useState({ open: false, companyId: null, companyName: '', reason: '' });

  const { data: employers, isLoading } = useQuery({
    queryKey: ['admin', 'employers', statusFilter],
    queryFn: () => adminApi.listEmployers(statusFilter === 'all' ? null : statusFilter),
  });

  const approveMutation = useMutation({
    mutationFn: (companyId) => adminApi.approveEmployer(companyId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'employers'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ companyId, reason }) => adminApi.rejectEmployer(companyId, reason),
    onSuccess: () => {
      setRejectModal({ open: false, companyId: null, companyName: '', reason: '' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'employers'] });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: (companyId) => adminApi.suspendEmployer(companyId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'employers'] }),
  });

  const activateMutation = useMutation({
    mutationFn: (companyId) => adminApi.activateEmployer(companyId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'employers'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Catering Businesses & KYC</h2>
          <p className="text-xs text-neutral-500">
            Review registered catering businesses, verify credentials and tax licenses, and govern platform access
          </p>
        </div>

        <div className="flex items-center gap-2">
          {['all', 'pending_approval', 'approved', 'suspended'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${
                statusFilter === st
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <SkeletonRows rows={5} />
      ) : !employers || employers.length === 0 ? (
        <EmptyState
          title="No catering businesses found"
          description={
            statusFilter === 'pending_approval'
              ? 'No pending registrations requiring review.'
              : 'Registered catering businesses will appear here.'
          }
        />
      ) : (
        <div className="card divide-y divide-neutral-100">
          {employers.map((emp) => (
            <div key={emp.id} className="flex flex-col lg:flex-row lg:items-center justify-between p-4 gap-4">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-neutral-900 text-base">{emp.name}</span>
                  <StatusBadge status={emp.status} />
                  <span className="rounded bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600 font-medium">
                    {emp.business_type || 'Catering'}
                  </span>
                  {emp.currency && (
                    <span className="rounded bg-neutral-50 border border-neutral-200 px-1.5 py-0.5 text-[10px] text-neutral-500 font-mono">
                      {emp.currency}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600">
                  {emp.owner_name && <span>Owner: <strong className="text-neutral-800">{emp.owner_name}</strong></span>}
                  {emp.owner_email && <span>Email: {emp.owner_email}</span>}
                  {emp.owner_phone && <span>Phone: {emp.owner_phone}</span>}
                  {emp.gst_number && <span>GSTIN: <strong className="font-mono text-neutral-800">{emp.gst_number}</strong></span>}
                </div>

                {emp.business_address && (
                  <p className="text-xs text-neutral-400">📍 {emp.business_address}</p>
                )}

                {emp.rejection_reason && emp.status === 'rejected' && (
                  <p className="text-xs text-rose-600 font-medium bg-rose-50 p-2 rounded-lg">
                    Rejection note: {emp.rejection_reason}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {emp.status === 'pending_approval' && (
                  <>
                    <button
                      onClick={() => approveMutation.mutate(emp.id)}
                      disabled={approveMutation.isPending}
                      className="rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => setRejectModal({ open: true, companyId: emp.id, companyName: emp.name, reason: '' })}
                      className="rounded-lg bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition"
                    >
                      ✕ Reject
                    </button>
                  </>
                )}

                {emp.status === 'approved' && (
                  <button
                    onClick={() => suspendMutation.mutate(emp.id)}
                    disabled={suspendMutation.isPending}
                    className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition"
                  >
                    Suspend Business
                  </button>
                )}

                {(emp.status === 'suspended' || emp.status === 'rejected') && (
                  <button
                    onClick={() => activateMutation.mutate(emp.id)}
                    disabled={activateMutation.isPending}
                    className="rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-700 transition"
                  >
                    Reactivate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-base font-semibold text-neutral-900">
              Reject Registration — {rejectModal.companyName}
            </h3>
            <p className="text-xs text-neutral-500">
              Specify the exact reason for rejection so the catering business owner can rectify and resubmit.
            </p>
            <textarea
              rows={3}
              value={rejectModal.reason}
              onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
              placeholder="e.g. Invalid GSTIN certificate or address unverified..."
              className="w-full rounded-xl border border-neutral-300 p-3 text-sm focus:border-brand-500 focus:outline-none"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectModal({ open: false, companyId: null, companyName: '', reason: '' })}
                className="rounded-lg px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                disabled={!rejectModal.reason.trim() || rejectMutation.isPending}
                onClick={() => rejectMutation.mutate({ companyId: rejectModal.companyId, reason: rejectModal.reason })}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
