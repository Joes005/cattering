from app.models.models import EventStatus

# Legal forward transitions for the event/booking lifecycle (spec §14).
# CANCELLED and REJECTED are terminal branches reachable from any
# pre-COMPLETED state; COMPLETED, CANCELLED and REJECTED are terminal.
ALLOWED_TRANSITIONS: dict[EventStatus, set[EventStatus]] = {
    EventStatus.enquiry: {EventStatus.quotation_sent, EventStatus.cancelled, EventStatus.rejected},
    EventStatus.quotation_sent: {EventStatus.awaiting_approval, EventStatus.cancelled, EventStatus.rejected},
    EventStatus.awaiting_approval: {EventStatus.advance_pending, EventStatus.cancelled, EventStatus.rejected},
    EventStatus.advance_pending: {EventStatus.confirmed, EventStatus.cancelled},
    EventStatus.confirmed: {EventStatus.preparation, EventStatus.cancelled},
    EventStatus.preparation: {EventStatus.in_progress, EventStatus.cancelled},
    EventStatus.in_progress: {EventStatus.completed},
    EventStatus.completed: set(),
    EventStatus.cancelled: set(),
    EventStatus.rejected: set(),
}


def is_transition_allowed(from_status: EventStatus, to_status: EventStatus) -> bool:
    return to_status in ALLOWED_TRANSITIONS.get(from_status, set())
