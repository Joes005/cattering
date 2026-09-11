import { humanize } from '../lib/format';

const TONE_STYLES = {
  neutral: 'bg-neutral-100 text-neutral-600',
  blue: 'bg-blue-50 text-blue-700',
  amber: 'bg-amber-50 text-amber-700',
  brand: 'bg-brand-100 text-brand-700',
  red: 'bg-red-50 text-red-700',
};

const TONE_DOT = {
  neutral: 'bg-neutral-400',
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  brand: 'bg-brand-600',
  red: 'bg-red-500',
};

const STATUS_TONES = {
  // events
  enquiry: 'neutral',
  quotation_sent: 'blue',
  awaiting_approval: 'amber',
  advance_pending: 'amber',
  confirmed: 'brand',
  preparation: 'blue',
  in_progress: 'blue',
  completed: 'brand',
  cancelled: 'red',
  rejected: 'red',
  // quotations / invoices / payments
  draft: 'neutral',
  sent: 'blue',
  accepted: 'brand',
  paid: 'brand',
  partially_paid: 'amber',
  overdue: 'red',
  pending: 'amber',
  failed: 'red',
  refunded: 'neutral',
  expired: 'neutral',
  // generic active/inactive
  active: 'brand',
  inactive: 'neutral',
  suspended: 'red',
  todo: 'neutral',
  done: 'brand',
  present: 'brand',
  late: 'amber',
  absent: 'red',
};

export default function StatusBadge({ status }) {
  const tone = STATUS_TONES[status] || 'neutral';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${TONE_STYLES[tone]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[tone]}`} />
      {humanize(status)}
    </span>
  );
}
