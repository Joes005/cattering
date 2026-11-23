import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '../../api/events';
import { customersApi } from '../../api/customers';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import { SkeletonRows } from '../../components/Skeleton';
import { useAuth } from '../../context/AuthContext';
import {
  CalendarIcon,
  SearchIcon,
  PlusIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  EyeIcon,
} from '../../components/Icons';

const EVENT_TYPES = [
  'Wedding Banquet',
  'Reception',
  'Birthday Celebration',
  'Corporate Gala',
  'Engagement',
  'Conference',
  'Cocktail Party',
  'Festival / Feast',
  'Private Dining',
  'Other Event',
];

const EMPTY_FORM = {
  customer_id: '',
  title: '',
  event_type: 'Wedding Banquet',
  event_date: '',
  guest_count: '',
  venue_name: '',
  venue_address: '',
  catering_requirement: 'mixed',
};

export default function CompanyEvents() {
  const { currentCompanyId } = useAuth();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [toastMsg, setToastMsg] = useState('');

  const { data: events, isLoading } = useQuery({
    queryKey: ['events', currentCompanyId],
    queryFn: () => eventsApi.listForCompany(currentCompanyId),
    enabled: !!currentCompanyId,
  });

  const { data: customers } = useQuery({
    queryKey: ['customers', currentCompanyId],
    queryFn: () => customersApi.list(currentCompanyId),
    enabled: !!currentCompanyId,
  });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const submitMutation = useMutation({
    mutationFn: () =>
      eventsApi.createForCompany(currentCompanyId, {
        ...form,
        title: form.title || `${form.event_type} for ${form.guest_count} guests`,
        guest_count: Number(form.guest_count),
        event_date: new Date(form.event_date).toISOString(),
      }),
    onSuccess: (created) => {
      showToast(`Event "${created.title}" scheduled successfully.`);
      queryClient.invalidateQueries({ queryKey: ['events', currentCompanyId] });
      setShowModal(false);
      setForm(EMPTY_FORM);
    },
    onError: (err) => showToast(`Error: ${err.message}`),
  });

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    let list = events;
    if (statusFilter !== 'all') {
      list = list.filter((e) => e.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (e) =>
          e.title?.toLowerCase().includes(q) ||
          e.customer?.name?.toLowerCase().includes(q) ||
          e.venue_name?.toLowerCase().includes(q) ||
          e.venue_address?.toLowerCase().includes(q) ||
          e.event_type?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [events, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
            Catering Events & Bookings
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Track customer banquets, manage itemized quotations, organize kitchen taskforces, and oversee event execution.
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
            <span>Create Event</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All Events' },
            { id: 'inquiry', label: 'Inquiries' },
            { id: 'quoted', label: 'Quoted' },
            { id: 'confirmed', label: 'Confirmed' },
            { id: 'in_progress', label: 'Executing' },
            { id: 'completed', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold capitalize transition ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
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
            placeholder="Search event, client, venue..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      {/* Events List */}
      {isLoading ? (
        <SkeletonRows rows={6} />
      ) : !filteredEvents || filteredEvents.length === 0 ? (
        <EmptyState
          title="No catering events found"
          description={
            searchQuery
              ? `No events match "${searchQuery}".`
              : statusFilter !== 'all'
              ? `No events currently with status "${statusFilter}".`
              : 'Create your first event or record a customer inquiry to get started.'
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
          <div className="divide-y divide-slate-100">
            {filteredEvents.map((evt) => (
              <div
                key={evt.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-3 hover:bg-slate-50/60 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-bold text-slate-900 text-sm">{evt.title}</span>
                    <StatusBadge status={evt.status} />
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                      {evt.event_type || 'Banquet'}
                    </span>
                    <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      👥 {evt.guest_count} Guests
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>📅 <strong>{new Date(evt.event_date).toLocaleDateString()}</strong> at {new Date(evt.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {evt.customer && <span>Client: <strong className="text-slate-800">{evt.customer.name}</strong></span>}
                    {evt.venue_name && <span>📍 {evt.venue_name}</span>}
                    <span className="capitalize">Menu: {evt.catering_requirement?.replace('_', ' ')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Link
                    to={`/employer/events/${evt.id}`}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                  >
                    <EyeIcon className="h-3.5 w-3.5 text-slate-500" />
                    <span>Manage Details</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Schedule New Catering Event</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitMutation.mutate();
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer / Client *</label>
                <select
                  required
                  value={form.customer_id}
                  onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">Select an existing customer...</option>
                  {(customers || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Event Title (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Royal Wedding Banquet for 300 Guests"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Event Type</label>
                  <select
                    value={form.event_type}
                    onChange={(e) => setForm({ ...form, event_type: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                  >
                    {EVENT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Expected Guests *</label>
                  <input
                    required
                    type="number"
                    min="1"
                    placeholder="e.g. 200"
                    value={form.guest_count}
                    onChange={(e) => setForm({ ...form, guest_count: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Event Date & Time *</label>
                  <input
                    required
                    type="datetime-local"
                    value={form.event_date}
                    onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Catering Requirement</label>
                  <select
                    value={form.catering_requirement}
                    onChange={(e) => setForm({ ...form, catering_requirement: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="veg">Vegetarian Feast</option>
                    <option value="non_veg">Non-Vegetarian Banquet</option>
                    <option value="mixed">Mixed (Veg & Non-Veg)</option>
                    <option value="jain">Jain Friendly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Venue / Hall Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Grand Palace Hall"
                    value={form.venue_name}
                    onChange={(e) => setForm({ ...form, venue_name: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Venue Address</label>
                  <input
                    type="text"
                    placeholder="City, Street"
                    value={form.venue_address}
                    onChange={(e) => setForm({ ...form, venue_address: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
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
                  disabled={submitMutation.isPending || !form.customer_id || !form.event_date || !form.guest_count}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {submitMutation.isPending ? 'Scheduling…' : 'Schedule Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
