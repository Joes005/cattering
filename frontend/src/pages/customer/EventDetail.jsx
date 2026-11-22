import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { customerApi } from '../../api/customerApi';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import { SkeletonRows } from '../../components/Skeleton';
import { formatCurrency } from '../../lib/format';

const TIMELINE_STEPS = ['inquiry', 'quoted', 'confirmed', 'in_progress', 'completed'];

export default function CustomerEventDetail() {
  const { eventId } = useParams();
  const queryClient = useQueryClient();

  const [payingInvoice, setPayingInvoice] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('UPI');
  const [payRef, setPayRef] = useState('');
  const [payMsg, setPayMsg] = useState('');

  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState('');

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['customer-event', eventId],
    queryFn: () => customerApi.getEvent(eventId),
  });

  const { data: quotations, isLoading: quotesLoading } = useQuery({
    queryKey: ['customer-quotations', eventId],
    queryFn: () => customerApi.listQuotations(eventId),
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['customer-invoices', eventId],
    queryFn: () => customerApi.listInvoices(eventId),
  });

  const acceptQuoteMutation = useMutation({
    mutationFn: (quoteId) => customerApi.acceptQuotation(eventId, quoteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['customer-quotations', eventId] });
    },
  });

  const payInvoiceMutation = useMutation({
    mutationFn: () =>
      customerApi.payInvoice(payingInvoice.id, {
        amount: parseFloat(payAmount) || payingInvoice.total - (payingInvoice.amount_paid || 0),
        provider: payMethod,
        provider_ref: payRef || `TXN_${Date.now().toString().slice(-6)}`,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-invoices', eventId] });
      setPayMsg('Payment successfully recorded! Receipt updated.');
      setPayingInvoice(null);
      setPayAmount('');
      setPayRef('');
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: () =>
      customerApi.submitFeedback(eventId, {
        rating: feedbackRating,
        comment: feedbackComment,
      }),
    onSuccess: () => {
      setFeedbackSuccess('Thank you! Your feedback has been shared with the catering team.');
      setFeedbackComment('');
    },
  });

  if (eventLoading || quotesLoading || invoicesLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-neutral-200" />
        <SkeletonRows rows={6} />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-neutral-500">Event booking not found.</p>
        <Link to="/customer/events" className="text-xs font-semibold text-brand-700 mt-2 inline-block">
          ← Back to bookings
        </Link>
      </div>
    );
  }

  const currentStepIdx = TIMELINE_STEPS.indexOf(event.status);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Link to="/customer/events" className="text-xs font-semibold text-neutral-500 hover:text-neutral-900">
        ← Back to all bookings
      </Link>

      {/* Header Card */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-neutral-100 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-neutral-900">{event.title}</h2>
              <StatusBadge status={event.status} />
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Event Reference: <span className="font-mono text-neutral-700">{event.id.slice(0, 8)}</span>
            </p>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-medium text-neutral-400">Event Scheduled For</span>
            <p className="text-sm font-bold text-neutral-900">
              {new Date(event.event_date).toLocaleDateString(undefined, {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* Timeline Progression */}
        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">Event Progress</p>
          <div className="grid grid-cols-5 gap-1 text-center">
            {TIMELINE_STEPS.map((step, idx) => {
              const isPassed = currentStepIdx >= idx;
              const isCurrent = currentStepIdx === idx;
              return (
                <div key={step} className="space-y-1">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      isCurrent ? 'bg-brand-600' : isPassed ? 'bg-emerald-500' : 'bg-neutral-200'
                    }`}
                  />
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider block ${
                      isCurrent
                        ? 'text-brand-700'
                        : isPassed
                        ? 'text-neutral-700'
                        : 'text-neutral-400'
                    }`}
                  >
                    {step.replace('_', ' ')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Specifications Grid */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-4 border-t border-neutral-100">
          <div>
            <span className="text-neutral-400 block">Occasion</span>
            <strong className="text-neutral-800">{event.event_type}</strong>
          </div>
          <div>
            <span className="text-neutral-400 block">Guest Count</span>
            <strong className="text-neutral-800">{event.guest_count} guests</strong>
          </div>
          <div>
            <span className="text-neutral-400 block">Dietary Setup</span>
            <strong className="text-neutral-800 capitalize">{event.catering_requirement}</strong>
          </div>
          <div>
            <span className="text-neutral-400 block">Venue Location</span>
            <strong className="text-neutral-800">{event.venue_name || 'To Be Finalized'}</strong>
          </div>
        </div>

        {event.special_instructions && (
          <div className="mt-4 rounded-xl bg-neutral-50 p-3.5 text-xs text-neutral-600 border border-neutral-100">
            <span className="font-bold text-neutral-800">Menu & Service Preferences: </span>
            {event.special_instructions}
          </div>
        )}
      </div>

      {/* Quotations Section */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-neutral-900">Catering Quotations</h3>
            <p className="text-xs text-neutral-500">Review line items, tax, and per-guest pricing proposals</p>
          </div>
        </div>

        {!quotations || quotations.length === 0 ? (
          <EmptyState
            title="Waiting for caterer's quote"
            description="The catering team is currently reviewing your event requirements and preparing a custom quotation."
          />
        ) : (
          <div className="divide-y divide-neutral-100 space-y-3">
            {quotations.map((q) => {
              const isSent = q.status === 'sent';
              const isAccepted = q.status === 'accepted';
              return (
                <div key={q.id} className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-neutral-900">{q.quote_number}</span>
                      <StatusBadge status={q.status} />
                    </div>
                    <p className="text-xs text-neutral-500">
                      Subtotal: {formatCurrency(q.subtotal)}
                      {q.tax_amount > 0 && ` + Tax: ${formatCurrency(q.tax_amount)}`}
                      {q.discount > 0 && ` - Discount: ${formatCurrency(q.discount)}`}
                    </p>
                    <p className="text-sm font-extrabold text-neutral-900">
                      Total: {formatCurrency(q.total)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {isSent && (
                      <button
                        disabled={acceptQuoteMutation.isPending}
                        onClick={() => acceptQuoteMutation.mutate(q.id)}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm transition"
                      >
                        {acceptQuoteMutation.isPending ? 'Confirming…' : '✓ Accept Quote & Confirm Booking'}
                      </button>
                    )}
                    {isAccepted && (
                      <span className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-800">
                        ✓ Accepted by You
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Invoices & Payments Section */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-neutral-900">Milestone Invoices & Billing</h3>
            <p className="text-xs text-neutral-500">Deposit, advance, and final milestone payments</p>
          </div>
        </div>

        {payMsg && (
          <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800">
            ✓ {payMsg}
          </div>
        )}

        {!invoices || invoices.length === 0 ? (
          <EmptyState
            title="No invoices issued yet"
            description="Once you accept a quotation, the caterer will issue invoices for deposit and milestone payments."
          />
        ) : (
          <div className="divide-y divide-neutral-100">
            {invoices.map((inv) => {
              const balance = Math.max(0, inv.total - (inv.amount_paid || 0));
              const isPaid = inv.status === 'paid' || balance === 0;

              return (
                <div key={inv.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-neutral-900">{inv.invoice_number}</span>
                      <StatusBadge status={inv.status} />
                    </div>
                    <p className="text-xs text-neutral-500">
                      Total: {formatCurrency(inv.total)} · Paid:{' '}
                      <strong className="text-emerald-700">{formatCurrency(inv.amount_paid || 0)}</strong>
                      {!isPaid && ` · Due: ${formatCurrency(balance)}`}
                    </p>
                  </div>

                  <div>
                    {!isPaid ? (
                      <button
                        onClick={() => {
                          setPayingInvoice(inv);
                          setPayAmount(balance.toString());
                        }}
                        className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700 shadow-sm transition"
                      >
                        💳 Pay Now ({formatCurrency(balance)})
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-emerald-700">✓ Fully Settled</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pay Modal */}
      {payingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="font-bold text-base text-neutral-900">
                Pay Invoice: {payingInvoice.invoice_number}
              </h3>
              <button onClick={() => setPayingInvoice(null)} className="text-neutral-400 text-lg leading-none">
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                payInvoiceMutation.mutate();
              }}
              className="mt-4 space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Payment Amount (₹)
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  max={payingInvoice.total - (payingInvoice.amount_paid || 0)}
                  className="input text-xs"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Payment Method</label>
                <select
                  className="input text-xs"
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                >
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="Net Banking">Net Banking</option>
                  <option value="Credit / Debit Card">Credit / Debit Card</option>
                  <option value="Direct Bank Transfer">Direct Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Transaction / UTR Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI3829104928"
                  className="input text-xs"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100 mt-4">
                <button
                  type="button"
                  onClick={() => setPayingInvoice(null)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={payInvoiceMutation.isPending}
                  className="rounded-xl bg-brand-600 px-5 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {payInvoiceMutation.isPending ? 'Processing…' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Post-Event Feedback Section */}
      {event.status === 'completed' && (
        <div className="card p-6 border-brand-200 bg-brand-50/20">
          <h3 className="text-base font-bold text-neutral-900 mb-1">Rate Your Catering Experience</h3>
          <p className="text-xs text-neutral-500 mb-4">
            How was the food quality, buffet presentation, and service staff at your celebration?
          </p>

          {feedbackSuccess ? (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800">
              ✓ {feedbackSuccess}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackRating(star)}
                      className={`text-2xl transition ${feedbackRating >= star ? 'text-amber-400' : 'text-neutral-300'}`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="text-xs font-semibold text-neutral-700 self-center ml-2">
                    {feedbackRating} / 5 Stars
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Review Comments</label>
                <textarea
                  rows={2}
                  placeholder="The mutton biryani and live dessert counter were outstanding! Guests were thrilled..."
                  className="input text-xs"
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                />
              </div>

              <button
                disabled={feedbackMutation.isPending}
                onClick={() => feedbackMutation.mutate()}
                className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50 shadow-xs"
              >
                {feedbackMutation.isPending ? 'Submitting…' : 'Submit Review'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

