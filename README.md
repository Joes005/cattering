# Plated — Catering Event Management Platform

Plated is a multi-tenant SaaS platform for catering companies to run their full
operation — enquiry → quotation → booking → staffing → execution → invoicing →
feedback — while giving their clients a simple self-serve portal and their staff
a mobile-friendly "today's work" view.

## Roles

| Role | What they get |
|---|---|
| **Admin** | Platform-wide: manage companies, suspend/activate users, view the full audit log. |
| **Company** (owner/manager) | Full run of their own company: events, menus, packages, quotations, staff, inventory, invoices, payments, reports. |
| **Employee** (staff) | A permission-scoped subset of the same company workspace — by default limited to events they're assigned to, their tasks, and their own attendance. |
| **Client** | A simple portal: browse companies, book an event, review and accept quotations, pay, message the caterer, leave feedback. |

Company and Employee share one `company_user` identity — what they can see and do is
governed entirely by permissions (49 keys across 17 modules; see
`backend/app/core/permissions.py`), not a hardcoded role check. A company owner can
grant or revoke individual permissions per employee.

## Tech stack

| Layer | Technology |
|---|---|
| Backend | FastAPI, SQLAlchemy, Alembic, Pydantic |
| Database | PostgreSQL |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| File storage | Local disk in dev, behind a swappable `StorageBackend` interface |
| Frontend | React 18 + Vite, React Router, TanStack Query |
| Styling | Tailwind CSS |
| Charts | Recharts |

## Project structure

```
backend/
  app/
    core/        # settings, JWT/password security, RBAC, notifications, audit log,
                  # event-lifecycle state machine, payment side-effects, file storage
    db/          # SQLAlchemy engine/session
    models/      # ORM models — companies, members, permissions, clients, events,
                  # menus/packages, quotations, staff/tasks/attendance, invoices/
                  # payments, inventory, documents, messages, notifications,
                  # feedback, audit logs
    routers/     # one module per resource; company-scoped and client-scoped
                  # ("me_*") routers are split where the two sides differ
    schemas/     # Pydantic request/response schemas
    main.py      # FastAPI app + router wiring + static file serving
    seed.py      # realistic seed data (admin, 1 company, owner, 5 employees, 5 clients)
  alembic/       # migrations
  requirements.txt
  .env.example

frontend/
  src/
    api/          # one thin fetch wrapper per backend resource
    app/          # the three portal shells (Admin / Company / Client)
    components/   # shared UI: Sidebar, Topbar, NotificationBell, StatusBadge,
                  # Timeline, MessagesThread, KPICard, EmptyState, Skeleton
    context/       AuthContext (user, memberships, current company, permissions)
    lib/           small formatting/lifecycle helpers
    pages/         admin/, company/, client/ — one folder per portal
    router/        RequireAuth / RequirePermission route guards
  vite.config.js   # proxies /api and /files -> http://localhost:8000
```

## Running it locally

### 1. Database
```bash
psql -U postgres -c "CREATE DATABASE plated_v2_db;"
```

### 2. Backend (FastAPI)
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env      # edit DB_*/JWT_SECRET as needed
alembic upgrade head
python -m app.seed        # realistic seed data
uvicorn app.main:app --reload --port 8000
```
API docs: http://localhost:8000/docs

### 3. Frontend (React)
```bash
cd frontend
npm install
npm run dev
```
App: http://localhost:5173

### Seed logins
| Role | Email | Password |
|---|---|---|
| Admin | admin@plated.com | Admin@1234 |
| Company owner | owner@grandregency.com | Owner@123 |
| Employee (manager) | rahul.chef@grandregency.com | Chef@123 |
| Employee (staff) | suresh.service@grandregency.com | Staff@123 |
| Client | marco@plated.com | Seeker@123 |

## Core lifecycle

```
enquiry → quotation_sent → awaiting_approval → advance_pending → confirmed
        → preparation → in_progress → completed
(cancelled / rejected are terminal branches reachable before completion)
```

A quotation being sent auto-advances the event to `awaiting_approval`; a client
accepting it moves the event to `advance_pending`; enough payment being recorded
auto-confirms it. Every transition is recorded to `event_status_history` and
drives the in-app notification center.

## What's implemented

Multi-tenant RBAC · client booking flow · event lifecycle with a full timeline ·
menus & packages with per-guest/flat auto-pricing · quotations (create/send/accept/
reject) · staff assignment with conflict detection · tasks & attendance · invoices
& gateway-agnostic payments · documents (real file upload) · per-event messaging ·
notifications · feedback · inventory with low-stock warnings · reports (sales/
revenue/events) · audit log (platform + company-scoped).

## Not yet built

Dedicated pytest coverage for the RBAC/tenant-isolation matrix, PDF generation for
quotations/invoices, a real payment gateway integration (the payment endpoints are
gateway-agnostic by design — see `backend/app/routers/me_payments.py`), a calendar
view, and a booking-pipeline Kanban board.
