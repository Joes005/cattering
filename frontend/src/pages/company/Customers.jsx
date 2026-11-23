import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '../../api/customers';
import EmptyState from '../../components/EmptyState';
import { SkeletonRows } from '../../components/Skeleton';
import { useAuth } from '../../context/AuthContext';
import {
  UsersIcon,
  SearchIcon,
  PlusIcon,
  CheckCircleIcon,
  CalendarIcon,
} from '../../components/Icons';

const EMPTY_FORM = { name: '', email: '', phone: '', address: '', notes: '' };

export default function CompanyCustomers() {
  const { currentCompanyId } = useAuth();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [toastMsg, setToastMsg] = useState('');

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers', currentCompanyId],
    queryFn: () => customersApi.list(currentCompanyId),
    enabled: !!currentCompanyId,
  });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const createMutation = useMutation({
    mutationFn: () => customersApi.create(currentCompanyId, form),
    onSuccess: (created) => {
      showToast(`Customer "${created.name}" added successfully.`);
      queryClient.invalidateQueries({ queryKey: ['customers', currentCompanyId] });
      setShowModal(false);
      setForm(EMPTY_FORM);
    },
    onError: (err) => showToast(`Error: ${err.message}`),
  });

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.address?.toLowerCase().includes(q)
    );
  }, [customers, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
            Client CRM & Customer Records
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Manage your catering client directory, contact phone numbers, dietary preferences, and event history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {toastMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 shadow-xs animate-in fade-in">
              <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
              <span>{toastMsg}</span>
            </div>
          )}

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Search and Summary Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">Total Client Contacts:</span>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-black text-emerald-800">
            {customers?.length || 0}
          </span>
        </div>

        <div className="relative w-full sm:w-72">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, phone, email..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      {/* Customer List */}
      {isLoading ? (
        <SkeletonRows rows={6} />
      ) : !filteredCustomers || filteredCustomers.length === 0 ? (
        <EmptyState
          title="No customer contacts found"
          description={
            searchQuery
              ? `No clients match "${searchQuery}".`
              : 'Add customer records to begin issuing banquet quotations and invoices.'
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
          <div className="divide-y divide-slate-100">
            {filteredCustomers.map((c) => (
              <div
                key={c.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-3 hover:bg-slate-50/60 transition"
              >
                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700 uppercase">
                    {c.name?.[0] || 'C'}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-slate-900">{c.name}</p>
                    <div className="flex flex-wrap gap-x-4 text-xs text-slate-500">
                      {c.phone && <span>📞 {c.phone}</span>}
                      {c.email && <span>✉️ {c.email}</span>}
                      {c.address && <span>📍 {c.address}</span>}
                    </div>
                    {c.notes && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg mt-1.5 leading-relaxed">
                        📝 {c.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Link
                    to="/employer/events"
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                  >
                    <CalendarIcon className="h-3.5 w-3.5 text-slate-500" />
                    <span>View Events</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add Customer Contact</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate();
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Aditi Sharma"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mobile Phone Number</label>
                <input
                  type="text"
                  placeholder="+91-98765-43210"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="aditi.sharma@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address / Location</label>
                <input
                  type="text"
                  placeholder="City, Area"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Dietary Preferences / Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Prefers North Indian and Continental menus; annual corporate client."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || !form.name.trim()}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Saving…' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
