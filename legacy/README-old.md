# 🍽 Plated — Backend API

Complete REST API for the **Plated** catering jobs marketplace, built to match the frontend exactly.

---

## Tech Stack

| Layer       | Technology              |
|-------------|-------------------------|
| Runtime     | Node.js                 |
| Framework   | Express.js              |
| Database    | PostgreSQL               |
| Auth        | JWT (jsonwebtoken)      |
| Passwords   | bcryptjs                |
| Payments    | Stripe                  |
| Uploads     | Multer                  |
| Validation  | express-validator        |

---

## Project Structure

```
plated-backend/
├── server.js                  ← Entry point
├── package.json
├── .env.example               ← Copy to .env and fill in values
├── db/
│   ├── pool.js                ← PostgreSQL connection
│   ├── migrate.js             ← Creates all tables
│   └── seed.js                ← Sample data (matches frontend)
├── middleware/
│   ├── auth.js                ← JWT authenticate + authorize
│   ├── errorHandler.js        ← Global error handler
│   └── upload.js              ← Multer file uploads
└── routes/
    ├── auth.js                ← Register, login, profile
    ├── jobs.js                ← Job CRUD, save/unsave
    ├── applications.js        ← Apply, review, accept/reject
    ├── talent.js              ← Browse seekers, connect
    ├── categories.js          ← Browse by role
    ├── reviews.js             ← Ratings & reviews
    ├── payments.js            ← Stripe checkout
    └── search.js              ← Search bar (jobs + talent)
```

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment
```bash
cp .env.example .env
# Edit .env with your PostgreSQL credentials and JWT secret
```

### 3. Create database
```sql
-- In psql:
CREATE DATABASE plated_db;
```

### 4. Run migrations
```bash
npm run db:migrate
```

### 5. Seed sample data
```bash
npm run db:seed
```

### 6. Start the server
```bash
npm run dev       # development (nodemon)
npm start         # production
```

Server runs at **http://localhost:5000**

---

## API Reference

### Auth
| Method | Endpoint              | Description            | Auth |
|--------|-----------------------|------------------------|------|
| POST   | /api/auth/register    | Register user          | —    |
| POST   | /api/auth/login       | Login                  | —    |
| GET    | /api/auth/me          | Get own profile        | ✅   |
| PUT    | /api/auth/profile     | Update profile         | ✅   |

### Jobs
| Method | Endpoint                  | Description            | Auth        |
|--------|---------------------------|------------------------|-------------|
| GET    | /api/jobs                 | List jobs (filters)    | —           |
| GET    | /api/jobs/featured        | Featured jobs          | —           |
| GET    | /api/jobs/:id             | Job detail             | —           |
| POST   | /api/jobs                 | Create job             | Employer    |
| PUT    | /api/jobs/:id             | Update job             | Employer    |
| DELETE | /api/jobs/:id             | Delete job             | Employer    |
| POST   | /api/jobs/:id/save        | Save/unsave toggle     | ✅          |
| GET    | /api/jobs/saved/mine      | My saved jobs          | ✅          |
| GET    | /api/jobs/mine/posted     | My posted jobs         | Employer    |

### Applications
| Method | Endpoint                         | Description             | Auth     |
|--------|----------------------------------|-------------------------|----------|
| POST   | /api/applications                | Apply to job            | Seeker   |
| GET    | /api/applications/mine           | My applications         | Seeker   |
| GET    | /api/applications/job/:jobId     | Applicants for job      | Employer |
| GET    | /api/applications/:id            | Single application      | ✅       |
| PATCH  | /api/applications/:id/status     | Accept / Reject         | Employer |
| DELETE | /api/applications/:id            | Withdraw application    | Seeker   |

### Talent
| Method | Endpoint                      | Description           | Auth |
|--------|-------------------------------|-----------------------|------|
| GET    | /api/talent                   | Browse talent         | —    |
| GET    | /api/talent/top               | Top rated (homepage)  | —    |
| GET    | /api/talent/:id               | Seeker profile        | —    |
| POST   | /api/talent/:id/message       | Send connect message  | ✅   |
| GET    | /api/talent/messages/inbox    | Message inbox         | ✅   |

### Categories
| Method | Endpoint           | Description       | Auth  |
|--------|--------------------|-------------------|-------|
| GET    | /api/categories    | All categories    | —     |
| POST   | /api/categories    | Create category   | Admin |

### Reviews
| Method | Endpoint                  | Description        | Auth |
|--------|---------------------------|--------------------|------|
| POST   | /api/reviews              | Leave review       | ✅   |
| GET    | /api/reviews/user/:userId | User's reviews     | —    |

### Search (powers homepage search bar)
| Method | Endpoint      | Params                              |
|--------|---------------|-------------------------------------|
| GET    | /api/search   | q, location, type, mode=jobs/talent |

### Payments
| Method | Endpoint                  | Description           | Auth     |
|--------|---------------------------|-----------------------|----------|
| POST   | /api/payments/checkout    | Create Stripe session | Employer |
| POST   | /api/payments/webhook     | Stripe webhook        | Stripe   |
| GET    | /api/payments/history     | Payment history       | Employer |

---

## Connecting to the Frontend

In your `catering-platform.html`, replace static data with API calls:

```javascript
// Example: fetch featured jobs
const res  = await fetch('http://localhost:5000/api/jobs/featured');
const jobs = await res.json();

// Example: search bar
const res = await fetch(`http://localhost:5000/api/search?q=${keyword}&location=${city}&type=${type}&mode=jobs`);

// Example: login
const res = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
const { token, user } = await res.json();
localStorage.setItem('token', token);

// Example: apply to job (authenticated)
const res = await fetch(`http://localhost:5000/api/applications`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  },
  body: JSON.stringify({ job_id, cover_note })
});
```

---

## Seed Credentials

| Role     | Email                    | Password      |
|----------|--------------------------|---------------|
| Admin    | admin@plated.com         | Admin@1234    |
| Employer | hr@grandregency.com      | Employer@123  |
| Seeker   | marco@plated.com         | Seeker@123    |
