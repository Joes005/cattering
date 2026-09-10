# Plated — Event Catering Marketplace

Plated connects **event organizers** (planning a wedding, corporate event, birthday, etc.) with
**catering vendors** — the same way a wedding organizer sources and books caterers for you, but
self-serve and online.

## Concept

| Old version (see `legacy/`)                  | This version                                                      |
|-----------------------------------------------|--------------------------------------------------------------------|
| Job board: caterers post jobs, staff apply    | Event marketplace: organizers plan an event, browse vendors, request quotes, and book |
| Node.js + Express + plain HTML/JS             | **FastAPI (Python)** + **React (Vite)**                            |

The old Express/HTML "Plated" jobs board is preserved untouched under [`legacy/`](legacy/) for
reference — nothing there was deleted.

## How the flow works (mirrors a real wedding organizer)

1. **Organizer** creates an **Event** (type, date, guest count, budget, notes).
2. Organizer browses **Vendors** (caterers) and their **Packages** (menus/pricing), filtered by
   city, cuisine, budget, and guest count.
3. Organizer sends a **booking request** for a package against their event.
4. **Vendor** responds with a **quote** (price).
5. Organizer **accepts** the quote and pays a deposit (Stripe checkout, or a stub flow if Stripe
   isn't configured).
6. After the event, the booking is marked **completed** and the organizer leaves a **review**,
   which updates the vendor's public rating.

## Tech stack

| Layer     | Technology                                  |
|-----------|----------------------------------------------|
| Frontend  | React 18 + Vite, React Router                 |
| Backend   | FastAPI, SQLAlchemy, Pydantic                 |
| Database  | PostgreSQL                                    |
| Auth      | JWT (python-jose) + bcrypt (passlib)          |
| Payments  | Stripe Checkout (optional — stubs out locally without keys) |

## Project structure

```
backend/
  app/
    core/        # settings, JWT/password security
    db/          # SQLAlchemy engine/session
    models/      # ORM models: User, VendorProfile, Package, Event, Booking, Review, Message, Payment
    schemas/     # Pydantic request/response schemas
    routers/     # auth, vendors, packages, events, bookings, categories, reviews, payments, search, messages
    main.py      # FastAPI app + router wiring
    seed.py      # sample data
  requirements.txt
  .env.example

frontend/
  src/
    api/client.js          # fetch wrapper
    context/AuthContext.jsx
    components/            # Navbar, VendorCard, PackageCard, StatusBadge, ProtectedRoute
    pages/                 # Home, Login, Signup, VendorSearch, VendorProfile,
                            # CreateEvent, OrganizerDashboard, VendorDashboard
  vite.config.js            # proxies /api -> http://localhost:8000

legacy/                     # untouched original Express + HTML/JS version
```

## Running it locally

### 1. Database
```bash
# Using local peer-auth Postgres (no password needed over the unix socket):
psql -U postgres -c "CREATE DATABASE plated_v2_db;"
```
If your Postgres requires a TCP password instead, set `DB_HOST=localhost` and `DB_PASSWORD=...`
in `backend/.env` (see `backend/.env.example`).

### 2. Backend (FastAPI)
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then edit DB_* / JWT_SECRET as needed
python -m app.seed     # creates tables + sample data
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
| Role      | Email                    | Password      |
|-----------|--------------------------|---------------|
| Admin     | admin@plated.com         | Admin@1234    |
| Vendor    | hr@grandregency.com      | Vendor@123    |
| Organizer | marco@plated.com         | Seeker@123    |

## Feature roadmap (researched from wedding/event marketplaces like The Knot, WeddingWire, Zola)

Implemented:
- Vendor discovery with filters (city, cuisine, price, guest count)
- Event creation + booking request → quote → accept → pay → complete → review flow
- Vendor dashboard: profile, packages, incoming requests
- Organizer dashboard: events, bookings, payments, reviews

Good next additions:
- Vendor availability calendar (block out already-booked dates)
- In-app messaging thread per booking (the `Message` model already exists — needs UI)
- Multi-vendor events (decor, photography, music alongside catering)
- Vendor analytics (leads, response time, view counts) — a common driver of vendor retention
- Image galleries / uploads for vendor profiles and packages
