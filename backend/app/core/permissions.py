"""Central permission catalog and default role → permission bundles.

This is the single source of truth for every permission key in the system
(seeded into the `permissions` table by `app/seed.py`) and for what each
`EmploymentRole` gets by default (seeded into `role_permissions`). Company
owners can grant/revoke individual keys per employee via
`member_permission_overrides` on top of these defaults.
"""

from app.models.models import EmploymentRole

# (key, module, description)
PERMISSIONS: list[tuple[str, str, str]] = [
    ("users.view", "users", "View platform users"),
    ("users.create", "users", "Create platform users"),
    ("users.update", "users", "Update platform users"),
    ("users.delete", "users", "Suspend/delete platform users"),
    ("companies.view", "companies", "View companies (platform-wide)"),
    ("companies.create", "companies", "Create companies"),
    ("companies.update", "companies", "Update company profile/status"),
    ("clients.view", "clients", "View client CRM records"),
    ("clients.create", "clients", "Create client CRM records"),
    ("clients.update", "clients", "Update client CRM records"),
    ("clients.delete", "clients", "Delete client CRM records"),
    ("events.view", "events", "View events/bookings"),
    ("events.create", "events", "Create events/bookings"),
    ("events.update", "events", "Update events/bookings"),
    ("events.delete", "events", "Cancel/delete events"),
    ("events.assign", "events", "Assign staff to events"),
    ("quotes.view", "quotes", "View quotations"),
    ("quotes.create", "quotes", "Create quotations"),
    ("quotes.update", "quotes", "Edit quotations"),
    ("quotes.approve", "quotes", "Approve/reject quotations"),
    ("menus.view", "menus", "View menus and packages"),
    ("menus.create", "menus", "Create menu items/packages"),
    ("menus.update", "menus", "Update menu items/packages"),
    ("menus.delete", "menus", "Delete menu items/packages"),
    ("employees.view", "employees", "View employees"),
    ("employees.create", "employees", "Add employees"),
    ("employees.update", "employees", "Update employees/permissions"),
    ("employees.assign", "employees", "Assign employees to events"),
    ("tasks.view", "tasks", "View event tasks"),
    ("tasks.update", "tasks", "Update task status"),
    ("attendance.view", "attendance", "View attendance"),
    ("attendance.update", "attendance", "Check in/out"),
    ("payments.view", "payments", "View payments"),
    ("payments.create", "payments", "Record payments"),
    ("payments.refund", "payments", "Issue refunds"),
    ("invoices.view", "invoices", "View invoices"),
    ("invoices.create", "invoices", "Create/send invoices"),
    ("invoices.update", "invoices", "Update invoices"),
    ("inventory.view", "inventory", "View inventory"),
    ("inventory.update", "inventory", "Update inventory/transactions"),
    ("documents.view", "documents", "View documents"),
    ("documents.upload", "documents", "Upload documents"),
    ("messages.view", "messages", "View event messages"),
    ("messages.send", "messages", "Send event messages"),
    ("reports.view", "reports", "View operational reports"),
    ("reports.financial", "reports", "View financial/profitability reports"),
    ("settings.view", "settings", "View company settings"),
    ("settings.update", "settings", "Update company settings"),
    ("audit_logs.view", "audit_logs", "View audit logs"),
]

PERMISSION_KEYS = {key for key, _, _ in PERMISSIONS}

_OWNER_MANAGER_KEYS = PERMISSION_KEYS - {
    # platform-only keys never granted at the company level
    "users.view", "users.create", "users.update", "users.delete",
    "companies.view", "companies.create", "companies.update",
}

_STAFF_KEYS = {
    "events.view",
    "menus.view",
    "tasks.view", "tasks.update",
    "attendance.view", "attendance.update",
    "invoices.view",
    "documents.view",
    "messages.view", "messages.send",
    "inventory.view",
}

DEFAULT_ROLE_PERMISSIONS: dict[EmploymentRole, set[str]] = {
    EmploymentRole.owner: _OWNER_MANAGER_KEYS,
    EmploymentRole.manager: _OWNER_MANAGER_KEYS,
    EmploymentRole.staff: _STAFF_KEYS,
}

# Fixed, non-configurable permission set for the `client` global role — a
# client only ever acts on their own resources, enforced separately by
# ownership checks (see app/core/security.py: ensure_owns_or_404).
CLIENT_PERMISSIONS = {
    "events.view", "events.create",
    "quotes.view", "quotes.approve",
    "menus.view",
    "payments.view", "payments.create",
    "invoices.view",
    "documents.view",
    "messages.view", "messages.send",
}
