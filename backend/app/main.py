from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.database import Base, engine
from app.routers import auth, bookings, categories, events, messages, packages, payments, reviews, search, vendors

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Plated API", description="Event & catering vendor booking platform", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(vendors.router)
app.include_router(packages.router)
app.include_router(categories.router)
app.include_router(events.router)
app.include_router(bookings.router)
app.include_router(messages.router)
app.include_router(reviews.router)
app.include_router(payments.router)
app.include_router(search.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "platform": "Plated"}
