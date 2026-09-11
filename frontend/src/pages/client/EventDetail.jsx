import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '../../api/events';
import { quotationsApi } from '../../api/quotations';
import { invoicesApi, paymentsApi } from '../../api/invoices';
import { messagesApi } from '../../api/messages';
import { feedbackApi, documentsApi } from '../../api/misc';
import StatusBadge from '../../components/StatusBadge';
import Timeline from '../../components/Timeline';
import MessagesThread from '../../components/MessagesThread';
import { SkeletonCard, SkeletonRows } from '../../components/Skeleton';
import { humanize } from '../../lib/format';

const CANCELLABLE = new Set(['enquiry', 'quotation_sent', 'awaiting_approval']);

export default function ClientEventDetail() {
  const { eventId } = useParams();
  const queryClient = useQueryClient();
  const { data: event, isLoading, isError, error } = useQuery({
    queryKey: ['me', 'events', eventId],
    queryFn: () => eventsApi.getMine(eventId),
  });

  const cancelMutation = useMutation({
    mutationFn: () => eventsApi.cancelMine(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'events', eventId] });
      queryClient.invalidateQueries({ queryKey: ['me', 'events'] });
    },
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
        <Link to="/client" className="text-sm text-neutral-500 hover:text-neutral-800">
          ← Back to my events
        </Link>
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error?.message || 'Unable to load this event.'}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link to="/client" className="text-sm text-neutral-500 hover:text-neutral-800">
        ← Back to my events
      </Link>

      <div className="card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">{event.title}</h2>
            <p className="text-sm text-neutral-500">{event.company.name}</p>
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

        {CANCELLABLE.has(event.status) && (
          <button
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
            className="btn-danger mt-5"
          >
            {cancelMutation.isPending ? 'Cancelling…' : 'Cancel this request'}
          </button>
        )}
      </div>

      <QuotationsSection eventId={eventId} />
      <InvoicesPaymentsSection eventId={eventId} />
      <DocumentsSection eventId={eventId} companyId={event.company_id} />
      <MessagesThread
        queryKey={['me', 'messages', eventId]}
        listFn={() => messagesApi.listMine(eventId)}
        sendFn={(payload) => messagesApi.sendMine(eventId, payload)}
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

function QuotationsSection({ eventId }) {
  const queryClient = useQueryClient();
  const { data: quotations, isLoading } = useQuery({
    queryKey: ['me', 'quotations', eventId],
    queryFn: () => quotationsApi.listMine(eventId),
  });

  const acceptMutation = useMutation({
    mutationFn: (quotationId) => quotationsApi.accept(eventId, quotationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'quotations', eventId] });
      queryClient.invalidateQueries({ queryKey: ['me', 'events', eventId] });
    },
  });
  const rejectMutation = useMutation({
    mutationFn: (quotationId) => quotationsApi.reject(eventId, quotationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'quotations', eventId] });
      queryClient.invalidateQueries({ queryKey: ['me', 'events', eventId] });
    },
  });

  if (isLoading) return <SkeletonRows rows={1} />;
  if (!quotations || quotations.length === 0) return null;

  return (
    <div className="space-y-4">
      {quotations.map((q) => (
        <div key={q.id} className="card p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-500">Quotation {q.quote_number}</p>
              <p className="text-2xl font-semibold text-neutral-900">₹{q.total.toLocaleString()}</p>
            </div>
            <StatusBadge status={q.status} />
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <Field label="Subtotal" value={`₹${q.subtotal.toLocaleString()}`} />
            <Field label="Discount" value={`₹${q.discount.toLocaleString()}`} />
            <Field label="Tax" value={`${q.tax_percent}%`} />
            <Field label="Service charge" value={`₹${q.service_charge.toLocaleString()}`} />
            <Field label="Delivery charge" value={`₹${q.delivery_charge.toLocaleString()}`} />
            <Field label="Advance required" value={`₹${q.advance_amount.toLocaleString()}`} />
          </dl>

          {q.status === 'sent' && (
            <div className="mt-5 flex gap-3">
              <button
                className="btn-primary"
                disabled={acceptMutation.isPending || rejectMutation.isPending}
                onClick={() => acceptMutation.mutate(q.id)}
              >
                Accept quotation
              </button>
              <button
                className="btn-secondary"
                disabled={acceptMutation.isPending || rejectMutation.isPending}
                onClick={() => rejectMutation.mutate(q.id)}
              >
                Reject
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function InvoicesPaymentsSection({ eventId }) {
  const queryClient = useQueryClient();
  const [payAmount, setPayAmount] = useState('');
  const [error, setError] = useState('');

  const { data: invoices, isLoading: loadingInvoices } = useQuery({
    queryKey: ['me', 'invoices', eventId],
    queryFn: () => invoicesApi.listMine(eventId),
  });
  const { data: payments, isLoading: loadingPayments } = useQuery({
    queryKey: ['me', 'payments', eventId],
    queryFn: () => paymentsApi.listMine(eventId),
  });

  const payMutation = useMutation({
    mutationFn: () => paymentsApi.pay(eventId, { amount: Number(payAmount), type: 'advance' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'payments', eventId] });
      queryClient.invalidateQueries({ queryKey: ['me', 'invoices', eventId] });
      queryClient.invalidateQueries({ queryKey: ['me', 'events', eventId] });
      setPayAmount('');
      setError('');
    },
    onError: (err) => setError(err.message),
  });

  if (loadingInvoices || loadingPayments) return <SkeletonRows rows={1} />;
  if (!invoices || invoices.length === 0) return null;

  return (
    <div className="card p-6">
      <h3 className="mb-4 text-sm font-semibold text-neutral-900">Invoice &amp; payments</h3>

      {invoices.map((inv) => (
        <div key={inv.id} className="mb-4 rounded-lg border border-neutral-200 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-neutral-900">{inv.invoice_number}</p>
            <StatusBadge status={inv.status} />
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
            <Field label="Total" value={`₹${inv.total.toLocaleString()}`} />
            <Field label="Paid" value={`₹${inv.amount_paid.toLocaleString()}`} />
            <Field label="Balance due" value={`₹${inv.balance_due.toLocaleString()}`} />
          </dl>
        </div>
      ))}

      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (payAmount) payMutation.mutate();
        }}
        className="flex flex-wrap items-end gap-2"
      >
        <div>
          <label className="label">Amount to pay (₹)</label>
          <input
            type="number"
            min={1}
            required
            className="input"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
          />
        </div>
        <button type="submit" disabled={payMutation.isPending} className="btn-primary">
          {payMutation.isPending ? 'Processing…' : 'Pay now'}
        </button>
      </form>

      {payments && payments.length > 0 && (
        <div className="mt-4 divide-y divide-neutral-100 border-t border-neutral-100 pt-3">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-neutral-600">{humanize(p.type)}</span>
              <span className="font-medium text-neutral-900">₹{p.amount.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const STARS = [1, 2, 3, 4, 5];

function FeedbackSection({ eventId }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ overall_rating: 0, food_rating: 0, service_rating: 0, comment: '' });
  const [justSubmitted, setJustSubmitted] = useState(false);

  const { data: existingFeedback, isLoading } = useQuery({
    queryKey: ['me', 'feedback', eventId],
    queryFn: () => feedbackApi.getMine(eventId),
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      feedbackApi.submitMine(eventId, {
        overall_rating: form.overall_rating,
        food_rating: form.food_rating || null,
        service_rating: form.service_rating || null,
        comment: form.comment || null,
      }),
    onSuccess: () => {
      setJustSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ['me', 'feedback', eventId] });
      queryClient.invalidateQueries({ queryKey: ['me', 'events', eventId] });
    },
  });

  if (isLoading) return null;

  if (justSubmitted || existingFeedback) {
    return (
      <div className="card p-6 text-center">
        <p className="text-2xl">🎉</p>
        <p className="mt-2 text-sm font-medium text-neutral-900">Thanks for your feedback!</p>
        {existingFeedback && (
          <p className="mt-1 text-sm text-neutral-500">You rated this event {existingFeedback.overall_rating} / 5.</p>
        )}
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h3 className="mb-4 text-sm font-semibold text-neutral-900">How was your event?</h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (form.overall_rating) submitMutation.mutate();
        }}
        className="space-y-4"
      >
        <StarField label="Overall" value={form.overall_rating} onChange={(v) => setForm({ ...form, overall_rating: v })} />
        <StarField label="Food" value={form.food_rating} onChange={(v) => setForm({ ...form, food_rating: v })} />
        <StarField label="Service" value={form.service_rating} onChange={(v) => setForm({ ...form, service_rating: v })} />
        <div>
          <label className="label">Comments</label>
          <textarea
            rows={3}
            className="input"
            value={form.comment}
            onChange={(e) => setForm({ ...form, comment: e.target.value })}
          />
        </div>
        <button type="submit" disabled={!form.overall_rating || submitMutation.isPending} className="btn-primary">
          {submitMutation.isPending ? 'Submitting…' : 'Submit feedback'}
        </button>
      </form>
    </div>
  );
}

function StarField({ label, value, onChange }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex gap-1">
        {STARS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`text-2xl ${n <= value ? 'text-amber-400' : 'text-neutral-200'}`}
            aria-label={`${n} star`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

function DocumentsSection({ eventId, companyId }) {
  const { data: documents, isLoading } = useQuery({
    queryKey: ['client-documents', eventId],
    queryFn: () => documentsApi.listForEvent(companyId, eventId),
    enabled: !!companyId,
  });

  if (isLoading || !documents || documents.length === 0) return null;

  return (
    <div className="card p-6">
      <h3 className="mb-4 text-sm font-semibold text-neutral-900">Documents</h3>
      <div className="divide-y divide-neutral-100">
        {documents.map((doc) => (
          <a
            key={doc.id}
            href={doc.file_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between py-2 text-sm hover:bg-neutral-50"
          >
            <span className="text-neutral-700">📄 {humanize(doc.type)}</span>
            <span className="text-xs text-neutral-400">{new Date(doc.created_at).toLocaleDateString()}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
