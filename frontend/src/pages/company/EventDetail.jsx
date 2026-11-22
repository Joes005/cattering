import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '../../api/events';
import { quotationsApi } from '../../api/quotations';
import { packagesApi } from '../../api/menus';
import { staffApi, tasksApi } from '../../api/staff';
import { membersApi } from '../../api/members';
import { invoicesApi, paymentsApi } from '../../api/invoices';
import { messagesApi } from '../../api/messages';
import { feedbackApi, documentsApi } from '../../api/misc';
import StatusBadge from '../../components/StatusBadge';
import Timeline from '../../components/Timeline';
import MessagesThread from '../../components/MessagesThread';
import { SkeletonCard, SkeletonRows } from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import { ALLOWED_TRANSITIONS, PRIMARY_NEXT_STATUS } from '../../lib/eventLifecycle';
import { humanize } from '../../lib/format';
import { useAuth } from '../../context/AuthContext';

export default function CompanyEventDetail() {
  const { eventId } = useParams();
  const { currentCompanyId, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');

  const { data: event, isLoading, isError, error: loadError } = useQuery({
    queryKey: ['events', currentCompanyId, eventId],
    queryFn: () => eventsApi.getForCompany(currentCompanyId, eventId),
    enabled: !!currentCompanyId,
  });

  const statusMutation = useMutation({
    mutationFn: (nextStatus) => eventsApi.updateStatus(currentCompanyId, eventId, { status: nextStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', currentCompanyId, eventId] });
      queryClient.invalidateQueries({ queryKey: ['events', currentCompanyId] });
      setError('');
    },
    onError: (err) => setError(err.message),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (isError || !event) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Link to="/company/events" className="text-sm text-neutral-500 hover:text-neutral-800">
          ← Back to events
        </Link>
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError?.message || 'Unable to load this event.'}
        </p>
      </div>
    );
  }

  const canUpdate = hasPermission('events.update');
  const primaryNext = PRIMARY_NEXT_STATUS[event.status];
  const otherOptions = (ALLOWED_TRANSITIONS[event.status] || []).filter((s) => s !== primaryNext);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link to="/company/events" className="text-sm text-neutral-500 hover:text-neutral-800">
        ← Back to events
      </Link>

      <div className="card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">{event.title}</h2>
            <p className="text-sm text-neutral-500">{event.customer?.name || event.client?.name || 'Customer'}</p>
          </div>
          <StatusBadge status={event.status} />
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
          <Field label="Event date" value={new Date(event.event_date).toLocaleString()} />
          <Field label="Guests" value={event.guest_count} />
          <Field label="Venue" value={event.venue_name || '—'} />
          <Field label="Catering" value={humanize(event.catering_requirement)} />
        </dl>

        {event.special_instructions && (
          <div className="mt-4 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-600">{event.special_instructions}</div>
        )}

        {canUpdate && (primaryNext || otherOptions.length > 0) && (
          <div className="mt-5 space-y-2">
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <div className="flex flex-wrap gap-2">
              {primaryNext && (
                <button
                  className="btn-primary"
                  disabled={statusMutation.isPending}
                  onClick={() => statusMutation.mutate(primaryNext)}
                >
                  Move to {humanize(primaryNext)}
                </button>
              )}
              {otherOptions.map((opt) => (
                <button
                  key={opt}
                  className="btn-secondary"
                  disabled={statusMutation.isPending}
                  onClick={() => statusMutation.mutate(opt)}
                >
                  {humanize(opt)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <QuotationsSection eventId={eventId} guestCount={event.guest_count} />
      <InvoicesPaymentsSection eventId={eventId} />
      <StaffSection eventId={eventId} />
      <TasksSection eventId={eventId} />
      <DocumentsSection eventId={eventId} />
      <MessagesThread
        queryKey={['messages', currentCompanyId, eventId]}
        listFn={() => messagesApi.listForCompany(currentCompanyId, eventId)}
        sendFn={(payload) => messagesApi.sendForCompany(currentCompanyId, eventId, payload)}
      />
      {event.status === 'completed' && <FeedbackSection eventId={eventId} />}

      <div className="card p-6">
        <h3 className="mb-4 text-sm font-semibold text-neutral-900">Timeline</h3>
        <Timeline history={event.status_history} />
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-neutral-400">{label}</dt>
      <dd className="font-medium text-neutral-900">{value}</dd>
    </div>
  );
}

const EMPTY_QUOTE_FORM = { package_id: '', discount: '', tax_percent: '', service_charge: '', delivery_charge: '', advance_amount: '' };

function QuotationsSection({ eventId, guestCount }) {
  const { currentCompanyId, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_QUOTE_FORM);
  const [error, setError] = useState('');

  const canCreate = hasPermission('quotes.create');

  const { data: quotations, isLoading } = useQuery({
    queryKey: ['quotations', currentCompanyId, eventId],
    queryFn: () => quotationsApi.listForCompany(currentCompanyId, eventId),
    enabled: !!currentCompanyId,
  });
  const { data: packages } = useQuery({
    queryKey: ['packages', currentCompanyId],
    queryFn: () => packagesApi.list(currentCompanyId),
    enabled: !!currentCompanyId && canCreate,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      quotationsApi.create(currentCompanyId, eventId, {
        items: [{ package_id: form.package_id }],
        discount: Number(form.discount) || 0,
        tax_percent: Number(form.tax_percent) || 0,
        service_charge: Number(form.service_charge) || 0,
        delivery_charge: Number(form.delivery_charge) || 0,
        advance_amount: Number(form.advance_amount) || 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations', currentCompanyId, eventId] });
      setShowForm(false);
      setForm(EMPTY_QUOTE_FORM);
      setError('');
    },
    onError: (err) => setError(err.message),
  });

  const sendMutation = useMutation({
    mutationFn: (quotationId) => quotationsApi.send(currentCompanyId, eventId, quotationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations', currentCompanyId, eventId] });
      queryClient.invalidateQueries({ queryKey: ['events', currentCompanyId, eventId] });
    },
  });

  const selectedPackage = packages?.find((p) => p.id === form.package_id);

  return (
    <div className="card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-900">Quotations</h3>
        {canCreate && (
          <button className="btn-secondary text-xs" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancel' : '+ New quotation'}
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="mb-4 grid gap-3 rounded-lg border border-neutral-200 p-4 sm:grid-cols-2"
        >
          {error && <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="sm:col-span-2">
            <label className="label">Package</label>
            <select
              required
              className="input"
              value={form.package_id}
              onChange={(e) => setForm({ ...form, package_id: e.target.value })}
            >
              <option value="">Select a package…</option>
              {(packages || []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — ₹{p.price} {p.pricing_type === 'per_guest' ? '/ guest' : 'flat'}
                </option>
              ))}
            </select>
            {selectedPackage?.pricing_type === 'per_guest' && (
              <p className="mt-1 text-xs text-neutral-400">
                Priced for {guestCount} guests = ₹{(selectedPackage.price * guestCount).toLocaleString()}
              </p>
            )}
          </div>
          <div>
            <label className="label">Discount (₹)</label>
            <input type="number" min={0} className="input" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
          </div>
          <div>
            <label className="label">Tax (%)</label>
            <input
              type="number"
              min={0}
              className="input"
              value={form.tax_percent}
              onChange={(e) => setForm({ ...form, tax_percent: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Service charge (₹)</label>
            <input
              type="number"
              min={0}
              className="input"
              value={form.service_charge}
              onChange={(e) => setForm({ ...form, service_charge: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Delivery charge (₹)</label>
            <input
              type="number"
              min={0}
              className="input"
              value={form.delivery_charge}
              onChange={(e) => setForm({ ...form, delivery_charge: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Advance amount required (₹)</label>
            <input
              type="number"
              min={0}
              className="input"
              value={form.advance_amount}
              onChange={(e) => setForm({ ...form, advance_amount: e.target.value })}
            />
          </div>
          <button type="submit" disabled={createMutation.isPending} className="btn-primary sm:col-span-2 sm:w-fit">
            {createMutation.isPending ? 'Creating…' : 'Create quotation'}
          </button>
        </form>
      )}

      {isLoading ? (
        <SkeletonRows rows={2} />
      ) : quotations.length === 0 ? (
        <EmptyState title="No quotations yet" description="Create a quotation once you know what the client wants." />
      ) : (
        <div className="divide-y divide-neutral-100">
          {quotations.map((q) => (
            <div key={q.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-neutral-900">{q.quote_number}</p>
                <p className="text-xs text-neutral-500">Total ₹{q.total.toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={q.status} />
                {q.status === 'draft' && canCreate && (
                  <button
                    className="btn-primary text-xs"
                    disabled={sendMutation.isPending}
                    onClick={() => sendMutation.mutate(q.id)}
                  >
                    Send to client
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StaffSection({ eventId }) {
  const { currentCompanyId } = useAuth();

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['event-assignments', currentCompanyId, eventId],
    queryFn: () => staffApi.list(currentCompanyId, eventId),
    enabled: !!currentCompanyId,
  });

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">Workforce & Event Staff</h3>
          <p className="text-xs text-neutral-500">Confirmed workforce assignments for this catering event</p>
        </div>
        <Link
          to="/employer/workforce"
          className="rounded-lg bg-brand-50 border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition"
        >
          + Hire Staff in Marketplace
        </Link>
      </div>

      {isLoading ? (
        <SkeletonRows rows={2} />
      ) : !assignments || assignments.length === 0 ? (
        <EmptyState
          title="No staff assigned yet"
          description="Post a shift in the Workforce Marketplace to recruit waiters, chefs, and bartenders for this event."
        />
      ) : (
        <div className="divide-y divide-neutral-100">
          {assignments.map((a) => (
            <div key={a.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p className="font-semibold text-neutral-900">{a.employee?.full_name}</p>
                <p className="text-xs text-neutral-500">
                  Role: {a.role} · Agreed: ₹{a.agreed_pay_rate}/hr
                  {a.employee?.phone && ` · 📞 ${a.employee.phone}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={a.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const TASK_PHASES = ['pre_event', 'event_day', 'post_event'];

function TasksSection({ eventId }) {
  const { currentCompanyId, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [phase, setPhase] = useState('pre_event');
  const [assignedTo, setAssignedTo] = useState('');

  const canEdit = hasPermission('tasks.update');

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['event-tasks', currentCompanyId, eventId],
    queryFn: () => tasksApi.list(currentCompanyId, eventId),
    enabled: !!currentCompanyId,
  });

  const { data: assignments } = useQuery({
    queryKey: ['event-assignments', currentCompanyId, eventId],
    queryFn: () => staffApi.list(currentCompanyId, eventId),
    enabled: !!currentCompanyId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      tasksApi.create(currentCompanyId, eventId, {
        title,
        phase,
        assigned_to_user_id: assignedTo || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-tasks', currentCompanyId, eventId] });
      setTitle('');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ taskId, status }) => tasksApi.update(currentCompanyId, eventId, taskId, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['event-tasks', currentCompanyId, eventId] }),
  });

  const memberName = (userId) => {
    const asgn = (assignments || []).find((a) => a.employee_id === userId);
    return asgn?.employee?.full_name || 'Assigned Staff';
  };

  return (
    <div className="card p-6">
      <h3 className="mb-4 text-sm font-semibold text-neutral-900">Tasks</h3>

      {canEdit && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-neutral-200 p-4"
        >
          <div className="min-w-[200px] flex-1">
            <label className="label">Task</label>
            <input required className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="label">Phase</label>
            <select className="input" value={phase} onChange={(e) => setPhase(e.target.value)}>
              {TASK_PHASES.map((p) => (
                <option key={p} value={p}>
                  {humanize(p)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Assign to</label>
            <select className="input" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
              <option value="">Unassigned</option>
              {(assignments || []).map((asgn) => (
                <option key={asgn.employee_id} value={asgn.employee_id}>
                  {asgn.employee?.full_name} ({asgn.role})
                </option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={createMutation.isPending} className="btn-primary">
            {createMutation.isPending ? 'Adding…' : 'Add task'}
          </button>
        </form>
      )}

      {isLoading ? (
        <SkeletonRows rows={2} />
      ) : tasks.length === 0 ? (
        <EmptyState title="No tasks yet" description="Break the event down into pre-event, day-of, and post-event tasks." />
      ) : (
        <div className="divide-y divide-neutral-100">
          {tasks.map((t) => (
            <label key={t.id} className="flex items-center gap-3 py-3 text-sm">
              <input
                type="checkbox"
                checked={t.status === 'done'}
                disabled={!canEdit}
                onChange={(e) => toggleMutation.mutate({ taskId: t.id, status: e.target.checked ? 'done' : 'todo' })}
                className="h-4 w-4 accent-brand-600"
              />
              <span className={t.status === 'done' ? 'text-neutral-400 line-through' : 'text-neutral-800'}>{t.title}</span>
              <span className="text-xs text-neutral-400">{humanize(t.phase)}</span>
              {(t.assigned_to_user_id || t.assigned_to) && (
                <span className="ml-auto text-xs text-neutral-500">
                  {memberName(t.assigned_to_user_id || t.assigned_to)}
                </span>
              )}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

const PAYMENT_TYPES = ['advance', 'partial', 'final', 'refund'];

function InvoicesPaymentsSection({ eventId }) {
  const { currentCompanyId, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [paymentForm, setPaymentForm] = useState({ amount: '', type: 'advance', method: '' });
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const canCreateInvoice = hasPermission('invoices.create');
  const canRecordPayment = hasPermission('payments.create');

  const { data: quotations } = useQuery({
    queryKey: ['quotations', currentCompanyId, eventId],
    queryFn: () => quotationsApi.listForCompany(currentCompanyId, eventId),
    enabled: !!currentCompanyId,
  });
  const { data: invoices, isLoading: loadingInvoices } = useQuery({
    queryKey: ['invoices', currentCompanyId, eventId],
    queryFn: () => invoicesApi.listForCompany(currentCompanyId, eventId),
    enabled: !!currentCompanyId,
  });
  const { data: payments, isLoading: loadingPayments } = useQuery({
    queryKey: ['payments', currentCompanyId, eventId],
    queryFn: () => paymentsApi.listForCompany(currentCompanyId, eventId),
    enabled: !!currentCompanyId,
  });

  const acceptedQuotation = quotations?.find((q) => q.status === 'accepted');

  const createInvoiceMutation = useMutation({
    mutationFn: () => invoicesApi.createFromQuotation(currentCompanyId, eventId, acceptedQuotation.id, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices', currentCompanyId, eventId] }),
  });
  const sendInvoiceMutation = useMutation({
    mutationFn: (invoiceId) => invoicesApi.send(currentCompanyId, eventId, invoiceId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices', currentCompanyId, eventId] }),
  });
  const recordPaymentMutation = useMutation({
    mutationFn: () => paymentsApi.record(currentCompanyId, eventId, { ...paymentForm, amount: Number(paymentForm.amount) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', currentCompanyId, eventId] });
      queryClient.invalidateQueries({ queryKey: ['invoices', currentCompanyId, eventId] });
      queryClient.invalidateQueries({ queryKey: ['events', currentCompanyId, eventId] });
      setShowPaymentForm(false);
      setPaymentForm({ amount: '', type: 'advance', method: '' });
    },
  });

  if (loadingInvoices || loadingPayments) return <SkeletonRows rows={2} />;

  return (
    <div className="card p-6">
      <h3 className="mb-4 text-sm font-semibold text-neutral-900">Invoices &amp; payments</h3>

      {invoices.length === 0 ? (
        canCreateInvoice && acceptedQuotation ? (
          <button className="btn-primary mb-4" disabled={createInvoiceMutation.isPending} onClick={() => createInvoiceMutation.mutate()}>
            {createInvoiceMutation.isPending ? 'Generating…' : `Generate invoice from ${acceptedQuotation.quote_number}`}
          </button>
        ) : (
          <p className="mb-4 text-sm text-neutral-500">An invoice can be generated once a quotation is accepted.</p>
        )
      ) : (
        <div className="mb-4 divide-y divide-neutral-100">
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-neutral-900">{inv.invoice_number}</p>
                <p className="text-xs text-neutral-500">
                  Total ₹{inv.total.toLocaleString()} · Paid ₹{inv.amount_paid.toLocaleString()} · Balance ₹{inv.balance_due.toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={inv.status} />
                {inv.status === 'draft' && canCreateInvoice && (
                  <button className="btn-secondary text-xs" onClick={() => sendInvoiceMutation.mutate(inv.id)}>
                    Send
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {canRecordPayment && (
        <div className="mb-4">
          {!showPaymentForm ? (
            <button className="btn-secondary text-xs" onClick={() => setShowPaymentForm(true)}>
              + Record payment
            </button>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                recordPaymentMutation.mutate();
              }}
              className="flex flex-wrap items-end gap-2 rounded-lg border border-neutral-200 p-3"
            >
              <div>
                <label className="label">Amount (₹)</label>
                <input
                  type="number"
                  required
                  min={1}
                  className="input"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Type</label>
                <select className="input" value={paymentForm.type} onChange={(e) => setPaymentForm({ ...paymentForm, type: e.target.value })}>
                  {PAYMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {humanize(t)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Method</label>
                <input
                  className="input"
                  placeholder="cash / bank transfer"
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                />
              </div>
              <button type="submit" disabled={recordPaymentMutation.isPending} className="btn-primary">
                Record
              </button>
            </form>
          )}
        </div>
      )}

      {payments.length === 0 ? (
        <p className="text-sm text-neutral-500">No payments recorded yet.</p>
      ) : (
        <div className="divide-y divide-neutral-100">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-neutral-700">
                {humanize(p.type)} · {p.provider}
              </span>
              <span className="font-medium text-neutral-900">₹{p.amount.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const DOC_TYPES = ['quotation', 'contract', 'invoice', 'receipt', 'menu_pdf', 'other'];

function DocumentsSection({ eventId }) {
  const { currentCompanyId, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [type, setType] = useState('other');
  const [visibility, setVisibility] = useState('client');
  const [error, setError] = useState('');

  const canUpload = hasPermission('documents.upload');

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents', currentCompanyId, eventId],
    queryFn: () => documentsApi.listForEvent(currentCompanyId, eventId),
    enabled: !!currentCompanyId,
  });

  const uploadMutation = useMutation({
    mutationFn: () => documentsApi.upload(currentCompanyId, { file, type, visibility, eventId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', currentCompanyId, eventId] });
      setFile(null);
      setError('');
    },
    onError: (err) => setError(err.message),
  });

  return (
    <div className="card p-6">
      <h3 className="mb-4 text-sm font-semibold text-neutral-900">Documents</h3>

      {canUpload && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (file) uploadMutation.mutate();
          }}
          className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-neutral-200 p-3"
        >
          {error && <p className="w-full rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div>
            <label className="label">File</label>
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm" />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
              {DOC_TYPES.map((t) => (
                <option key={t} value={t}>
                  {humanize(t)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Visible to</label>
            <select className="input" value={visibility} onChange={(e) => setVisibility(e.target.value)}>
              <option value="client">Client</option>
              <option value="internal">Internal only</option>
            </select>
          </div>
          <button type="submit" disabled={!file || uploadMutation.isPending} className="btn-primary">
            {uploadMutation.isPending ? 'Uploading…' : 'Upload'}
          </button>
        </form>
      )}

      {isLoading ? (
        <SkeletonRows rows={1} />
      ) : documents.length === 0 ? (
        <p className="text-sm text-neutral-500">No documents uploaded yet.</p>
      ) : (
        <div className="divide-y divide-neutral-100">
          {documents.map((doc) => (
            <a
              key={doc.id}
              href={doc.file_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between py-2 text-sm hover:bg-neutral-50"
            >
              <span className="text-neutral-700">
                📄 {humanize(doc.type)} {doc.visibility === 'internal' && <span className="text-xs text-neutral-400">(internal)</span>}
              </span>
              <span className="text-xs text-neutral-400">{new Date(doc.created_at).toLocaleDateString()}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function FeedbackSection({ eventId }) {
  const { currentCompanyId } = useAuth();
  const { data: feedback, isLoading } = useQuery({
    queryKey: ['feedback', currentCompanyId, eventId],
    queryFn: () => feedbackApi.getForCompany(currentCompanyId, eventId),
    enabled: !!currentCompanyId,
  });

  if (isLoading) return null;

  return (
    <div className="card p-6">
      <h3 className="mb-4 text-sm font-semibold text-neutral-900">Client feedback</h3>
      {!feedback ? (
        <p className="text-sm text-neutral-500">The client hasn't left feedback yet.</p>
      ) : (
        <div className="space-y-2 text-sm">
          <p className="text-2xl font-semibold text-brand-700">{feedback.overall_rating} / 5</p>
          <div className="flex gap-4 text-neutral-500">
            {feedback.food_rating && <span>Food: {feedback.food_rating}/5</span>}
            {feedback.service_rating && <span>Service: {feedback.service_rating}/5</span>}
            {feedback.staff_rating && <span>Staff: {feedback.staff_rating}/5</span>}
          </div>
          {feedback.comment && <p className="mt-2 rounded-lg bg-neutral-50 p-3 text-neutral-700">"{feedback.comment}"</p>}
        </div>
      )}
    </div>
  );
}
