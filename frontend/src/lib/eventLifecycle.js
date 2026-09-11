// Mirrors backend/app/core/event_lifecycle.py — used only to decide which
// "advance to..." buttons to show; the backend is the source of truth and
// re-validates every transition.
export const ALLOWED_TRANSITIONS = {
  enquiry: ['quotation_sent', 'cancelled', 'rejected'],
  quotation_sent: ['awaiting_approval', 'cancelled', 'rejected'],
  awaiting_approval: ['advance_pending', 'cancelled', 'rejected'],
  advance_pending: ['confirmed', 'cancelled'],
  confirmed: ['preparation', 'cancelled'],
  preparation: ['in_progress', 'cancelled'],
  in_progress: ['completed'],
  completed: [],
  cancelled: [],
  rejected: [],
};

// The "forward" progress step (excludes cancel/reject side-branches) shown
// as the primary action; other legal moves are offered as secondary.
export const PRIMARY_NEXT_STATUS = {
  enquiry: 'quotation_sent',
  quotation_sent: 'awaiting_approval',
  awaiting_approval: 'advance_pending',
  advance_pending: 'confirmed',
  confirmed: 'preparation',
  preparation: 'in_progress',
  in_progress: 'completed',
};
