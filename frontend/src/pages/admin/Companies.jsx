import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/adminApi';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import { SkeletonRows } from '../../components/Skeleton';
import {
  BuildingIcon,
  SearchIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  ShieldCheckIcon,
} from '../../components/Icons';

export default function AdminCompanies() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [rejectModal, setRejectModal] = useState({ open: false, companyId: null, companyName: '', reason: '' });
  const [toastMessage, setToastMessage] = useState('');

  const { data: employers, isLoading } = useQuery({
    queryKey: ['admin', 'employers', statusFilter],
    queryFn: () => adminApi.listEmployers(statusFilter === 'all' ? null : statusFilter),
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const approveMutation = useMutation({
    mutationFn: (companyId) => adminApi.approveEmployer(companyId),
    onSuccess: (updated) => {
      showToast(`Approved "${updated.name}" successfully.`);
      if (selectedCompany?.id === updated.id) setSelectedCompany(updated);
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ companyId, reason }) => adminApi.rejectEmployer(companyId, reason),
    onSuccess: () => {
      showToast(`Rejected registration with reason specified.`);
      setRejectModal({ open: false, companyId: null, companyName: '', reason: '' });
      setSelectedCompany(null);
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: (companyId) => adminApi.suspendEmployer(companyId),
    onSuccess: (updated) => {
      showToast(`Suspended "${updated.name}". Operations temporarily halted.`);
      if (selectedCompany?.id === updated.id) setSelectedCompany(updated);
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });

  const activateMutation = useMutation({
    mutationFn: (companyId) => adminApi.activateEmployer(companyId),
    onSuccess: (updated) => {
      showToast(`Reactivated "${updated.name}" successfully.`);
      if (selectedCompany?.id === updated.id) setSelectedCompany(updated);
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });

  // Client-side search filtering
  const filteredEmployers = useMemo(() => {
    if (!employers) return [];
    if (!searchQuery.trim()) return employers;
    const q = searchQuery.toLowerCase();
    return employers.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.owner_name?.toLowerCase().includes(q) ||
        c.owner_email?.toLowerCase().includes(q) ||
        c.gst_number?.toLowerCase().includes(q) ||
        c.business_address?.toLowerCase().includes(q)
    );
  }, [employers, searchQuery]);

  // Counts for filter pills
  const counts = useMemo(() => {
    if (!employers) return { all: 0, pending: 0, approved: 0, suspended: 0, rejected: 0 };
    return {
      all: employers.length,
      pending: employers.filter((e) => e.status === 'pending_approval').length,
      approved: employers.filter((e) => e.status === 'approved').length,
      suspended: employers.filter((e) => e.status === 'suspended').length,
      rejected: employers.filter((e) => e.status === 'rejected').length,
    };
  }, [employers]);

  return (
    <div className="space-y-6">
      {/* Header and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
            Catering Businesses & KYC Governance
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Review registered catering companies, verify commercial licenses & GSTIN, and govern active operational status.
          </p>
        </div>

        {toastMessage && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 shadow-xs animate-in fade-in">
            <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All Businesses' },
            { id: 'pending_approval', label: 'Pending KYC' },
            { id: 'approved', label: 'Approved & Active' },
            { id: 'suspended', label: 'Suspended' },
            { id: 'rejected', label: 'Rejected' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                statusFilter === tab.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              {tab.id === 'pending_approval' && counts.pending > 0 && (
                <span className="rounded-full bg-amber-400 px-1.5 py-0.2 text-[10px] font-black text-slate-900">
                  {counts.pending}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search company, owner, GST..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      {/* Main List */}
      {isLoading ? (
        <SkeletonRows rows={6} />
      ) : !filteredEmployers || filteredEmployers.length === 0 ? (
        <EmptyState
          title="No catering businesses found"
          description={
            searchQuery
              ? `No businesses match your search "${searchQuery}".`
              : statusFilter === 'pending_approval'
              ? 'No pending KYC submissions awaiting approval.'
              : 'Registered catering businesses will appear here.'
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
          <div className="divide-y divide-slate-100">
            {filteredEmployers.map((emp) => (
              <div
                key={emp.id}
                className="flex flex-col lg:flex-row lg:items-center justify-between p-5 gap-4 hover:bg-slate-50/60 transition"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 font-bold text-base">
                    <BuildingIcon className="h-5 w-5 text-slate-600" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">{emp.name}</span>
                      <StatusBadge status={emp.status} />
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {emp.business_type || 'Catering'}
                      </span>
                      {emp.currency && (
                        <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-mono text-slate-500">
                          {emp.currency}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      {emp.owner_name && (
                        <span>Owner: <strong className="text-slate-800">{emp.owner_name}</strong></span>
                      )}
                      {emp.owner_email && <span>Email: {emp.owner_email}</span>}
                      {emp.owner_phone && <span>Phone: {emp.owner_phone}</span>}
                      {emp.gst_number && (
                        <span>GSTIN: <strong className="font-mono text-slate-800">{emp.gst_number}</strong></span>
                      )}
                    </div>

                    {emp.business_address && (
                      <p className="text-xs text-slate-400">📍 {emp.business_address}</p>
                    )}

                    {emp.rejection_reason && emp.status === 'rejected' && (
                      <div className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700 font-medium">
                        Rejection reason: {emp.rejection_reason}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                  <button
                    onClick={() => setSelectedCompany(emp)}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                  >
                    <EyeIcon className="h-3.5 w-3.5 text-slate-500" />
                    <span>Inspect</span>
                  </button>

                  {emp.status === 'pending_approval' && (
                    <>
                      <button
                        onClick={() => approveMutation.mutate(emp.id)}
                        disabled={approveMutation.isPending}
                        className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                      >
                        <CheckCircleIcon className="h-3.5 w-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() =>
                          setRejectModal({
                            open: true,
                            companyId: emp.id,
                            companyName: emp.name,
                            reason: '',
                          })
                        }
                        className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
                      >
                        <XCircleIcon className="h-3.5 w-3.5" />
                        <span>Reject</span>
                      </button>
                    </>
                  )}

                  {emp.status === 'approved' && (
                    <button
                      onClick={() => suspendMutation.mutate(emp.id)}
                      disabled={suspendMutation.isPending}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition"
                    >
                      Suspend
                    </button>
                  )}

                  {(emp.status === 'suspended' || emp.status === 'rejected') && (
                    <button
                      onClick={() => activateMutation.mutate(emp.id)}
                      disabled={activateMutation.isPending}
                      className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
                    >
                      Reactivate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inspection Modal / Drawer */}
      {selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <BuildingIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedCompany.name}</h3>
                  <p className="text-xs text-slate-500">Business Profile & Operational Status</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCompany(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            {/* Quick Status Chips */}
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={selectedCompany.status} />
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                Type: {selectedCompany.business_type || 'Catering'}
              </span>
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-mono text-slate-700">
                Currency: {selectedCompany.currency || 'INR'}
              </span>
            </div>

            {/* Grid of Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <p className="text-slate-400 font-semibold uppercase text-[10px]">Owner Name</p>
                <p className="text-slate-800 font-bold mt-0.5">{selectedCompany.owner_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold uppercase text-[10px]">Owner Email</p>
                <p className="text-slate-800 font-medium mt-0.5">{selectedCompany.owner_email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold uppercase text-[10px]">Owner Phone</p>
                <p className="text-slate-800 font-medium mt-0.5">{selectedCompany.owner_phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold uppercase text-[10px]">GSTIN / Tax ID</p>
                <p className="text-slate-800 font-mono font-bold mt-0.5">{selectedCompany.gst_number || 'Unprovided'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-slate-400 font-semibold uppercase text-[10px]">Registered Address</p>
                <p className="text-slate-800 font-medium mt-0.5">{selectedCompany.business_address || 'No physical address provided'}</p>
              </div>
              {selectedCompany.description && (
                <div className="sm:col-span-2">
                  <p className="text-slate-400 font-semibold uppercase text-[10px]">About Business</p>
                  <p className="text-slate-700 mt-0.5 leading-relaxed">{selectedCompany.description}</p>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <span className="text-[11px] text-slate-400">
                Registered ID: <span className="font-mono">{selectedCompany.id?.slice(0, 8)}</span>
              </span>

              <div className="flex items-center gap-2">
                {selectedCompany.status === 'pending_approval' && (
                  <>
                    <button
                      onClick={() => approveMutation.mutate(selectedCompany.id)}
                      disabled={approveMutation.isPending}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition"
                    >
                      Approve & Verify
                    </button>
                    <button
                      onClick={() =>
                        setRejectModal({
                          open: true,
                          companyId: selectedCompany.id,
                          companyName: selectedCompany.name,
                          reason: '',
                        })
                      }
                      className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
                    >
                      Reject
                    </button>
                  </>
                )}

                {selectedCompany.status === 'approved' && (
                  <button
                    onClick={() => suspendMutation.mutate(selectedCompany.id)}
                    disabled={suspendMutation.isPending}
                    className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
                  >
                    Suspend Business Access
                  </button>
                )}

                {(selectedCompany.status === 'suspended' || selectedCompany.status === 'rejected') && (
                  <button
                    onClick={() => activateMutation.mutate(selectedCompany.id)}
                    disabled={activateMutation.isPending}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition"
                  >
                    Reactivate Business
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Reject Catering KYC — {rejectModal.companyName}
            </h3>
            <p className="text-xs text-slate-500">
              Specify the exact reason for rejecting this catering business registration. This explanation will be shown to the business owner to let them resubmit.
            </p>
            <textarea
              rows={3}
              value={rejectModal.reason}
              onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
              placeholder="e.g. Unverified GSTIN document or missing commercial kitchen address..."
              className="w-full rounded-xl border border-slate-300 p-3 text-xs focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectModal({ open: false, companyId: null, companyName: '', reason: '' })}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                disabled={!rejectModal.reason.trim() || rejectMutation.isPending}
                onClick={() => rejectMutation.mutate({ companyId: rejectModal.companyId, reason: rejectModal.reason })}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
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
