from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.db.database import Base, engine
from app.routers import (
    attendance,
    audit_logs,
    auth,
    clients,
    companies,
    documents,
    events,
    feedback,
    inventory,
    invoices,
    me_events,
    me_invoices,
    me_messages,
    me_payments,
    me_quotations,
    me_work,
    members,
    menus,
    messages,
    notifications,
    packages,
    payments,
    quotations,
    reports,
    staff,
    tasks,
    users,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Plated API",
    description="Multi-tenant catering event management platform",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/files", StaticFiles(directory=settings.UPLOAD_DIR), name="files")

app.include_router(auth.router)
app.include_router(companies.router)
app.include_router(members.router)
app.include_router(clients.router)
app.include_router(events.router)
app.include_router(me_events.router)
app.include_router(menus.router)
app.include_router(packages.router)
app.include_router(packages.public_router)
app.include_router(quotations.router)
app.include_router(me_quotations.router)
app.include_router(staff.router)
app.include_router(tasks.router)
app.include_router(attendance.router)
app.include_router(me_work.router)
app.include_router(invoices.router)
app.include_router(payments.router)
app.include_router(me_invoices.router)
app.include_router(me_payments.router)
app.include_router(documents.router)
app.include_router(messages.router)
app.include_router(me_messages.router)
app.include_router(notifications.router)
app.include_router(feedback.router)
app.include_router(inventory.router)
app.include_router(audit_logs.router)
app.include_router(reports.router)
app.include_router(users.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "platform": "Plated"}
