from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.database import Base, engine
from app.routers import (
    admin,
    audit_logs,
    auth,
    companies,
    customer_portal,
    customers,
    documents,
    events,
    feedback,
    inventory,
    invoices,
    marketplace,
    menus,
    messages,
    notifications,
    packages,
    payments,
    quotations,
    reports,
    tasks,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Plated API",
    description="Multi-Tenant Catering Business Management & Workforce Marketplace Platform (3-Role Architecture)",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.CLIENT_URL, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authentication & Registration (Admin, Employer, Employee)
app.include_router(auth.router)

# Platform Administration (Admin role)
app.include_router(admin.router)

# Employer Catering Management (Employer role)
app.include_router(companies.router)
app.include_router(customers.router)
app.include_router(events.router)
app.include_router(marketplace.employer_router)
app.include_router(marketplace.direct_employer_router)
app.include_router(quotations.router)
app.include_router(invoices.router)
app.include_router(payments.router)
app.include_router(menus.router)
app.include_router(packages.router)
app.include_router(packages.public_router)
app.include_router(inventory.router)
app.include_router(tasks.router)
app.include_router(reports.router)

# Employee Workforce Marketplace (Employee role)
app.include_router(marketplace.employee_router)

# Customer Discovery & Event Bookings (Customer role)
app.include_router(customer_portal.router)

# Communication, Files & Governance
app.include_router(documents.company_router)
app.include_router(documents.global_router)
app.include_router(messages.router)
app.include_router(notifications.router)
app.include_router(feedback.router)
app.include_router(audit_logs.router)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "platform": "Plated",
        "roles": ["admin", "employer", "employee", "customer"],
        "architecture": "4-role-hybrid-saas-marketplace",
    }
