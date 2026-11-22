import uuid
import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_customer_full_lifecycle_end_to_end():
    uid = uuid.uuid4().hex[:8]

    # ─────────────────────────────────────────────────────────────────────────
    # 1. SETUP APPROVED EMPLOYER CATERING COMPANY
    # ─────────────────────────────────────────────────────────────────────────
    employer_email = f"caterer_{uid}@platedtest.com"
    emp_reg = client.post(
        "/api/auth/employer/register",
        json={
            "full_name": f"Chef Gautham {uid}",
            "email": employer_email,
            "password": "Password@123",
            "phone": "9876543299",
            "business_name": f"Gautham Epicurean Catering {uid}",
            "business_type": "Catering",
            "business_address": "Indiranagar, Bangalore",
        },
    )
    assert emp_reg.status_code in [200, 201], emp_reg.text
    employer_token = emp_reg.json()["token"]
    employer_headers = {"Authorization": f"Bearer {employer_token}"}
    company_id = emp_reg.json()["company"]["id"]

    # Platform Admin approves employer company
    admin_login = client.post("/api/auth/admin/login", json={"email": "admin@plated.com", "password": "Admin@1234"})
    assert admin_login.status_code == 200, admin_login.text
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['token']}"}

    appr = client.patch(
        f"/api/admin/employers/{company_id}/approval",
        headers=admin_headers,
        json={"status": "approved"},
    )
    assert appr.status_code == 200, appr.text

    # Employer sets up a menu item and package
    menu_res = client.post(
        f"/api/companies/{company_id}/menu-items",
        headers=employer_headers,
        json={
            "name": f"Signature Truffle Pasta {uid}",
            "category": "Main Course",
            "unit_price": 28.50,
            "dietary_flags": ["vegetarian"],
            "is_available": True,
        },
    )
    assert menu_res.status_code in [200, 201], menu_res.text

    pkg_res = client.post(
        f"/api/companies/{company_id}/packages",
        headers=employer_headers,
        json={
            "name": f"Royal Wedding Banquet {uid}",
            "description": "5-course bespoke gourmet dining package",
            "price": 4500.00,
            "min_guests": 50,
            "is_active": True,
        },
    )
    assert pkg_res.status_code in [200, 201], pkg_res.text

    # ─────────────────────────────────────────────────────────────────────────
    # 2. CUSTOMER REGISTRATION & AUTHENTICATION
    # ─────────────────────────────────────────────────────────────────────────
    cust_email = f"customer_{uid}@platedtest.com"
    cust_reg = client.post(
        "/api/auth/customer/register",
        json={
            "full_name": f"Priya Sharma {uid}",
            "email": cust_email,
            "password": "Password@123",
            "phone": "9988776655",
            "city": "Bangalore",
            "default_delivery_address": "42 Lavelle Road, Bangalore",
            "preferred_cuisines": ["Italian", "Mughlai", "Continental"],
        },
    )
    assert cust_reg.status_code in [200, 201], cust_reg.text
    cust_data = cust_reg.json()
    assert cust_data["user"]["role"] == "customer"
    assert cust_data["customer_profile"] is not None
    assert cust_data["customer_profile"]["city"] == "Bangalore"
    customer_token = cust_data["token"]
    cust_headers = {"Authorization": f"Bearer {customer_token}"}

    # Verify Customer Login
    cust_login = client.post(
        "/api/auth/customer/login",
        json={"email": cust_email, "password": "Password@123"},
    )
    assert cust_login.status_code == 200, cust_login.text
    assert cust_login.json()["user"]["role"] == "customer"

    # ─────────────────────────────────────────────────────────────────────────
    # 3. CUSTOMER PROFILE MANAGEMENT
    # ─────────────────────────────────────────────────────────────────────────
    prof_get = client.get("/api/customer/profile", headers=cust_headers)
    assert prof_get.status_code == 200, prof_get.text
    assert prof_get.json()["email"] == cust_email

    prof_update = client.patch(
        "/api/customer/profile",
        headers=cust_headers,
        json={
            "phone": "9123456789",
            "preferred_cuisines": ["Italian", "Mughlai", "Pan-Asian", "Gourmet BBQ"],
        },
    )
    assert prof_update.status_code == 200, prof_update.text
    assert prof_update.json()["phone"] == "9123456789"
    assert "Pan-Asian" in prof_update.json()["preferred_cuisines"]

    # ─────────────────────────────────────────────────────────────────────────
    # 4. BROWSE CATERERS, MENUS & PACKAGES
    # ─────────────────────────────────────────────────────────────────────────
    caterers_res = client.get("/api/customer/caterers", headers=cust_headers)
    assert caterers_res.status_code == 200, caterers_res.text
    caterer_list = caterers_res.json()
    assert any(c["id"] == company_id for c in caterer_list)

    # Get single caterer detail
    cat_detail = client.get(f"/api/customer/caterers/{company_id}", headers=cust_headers)
    assert cat_detail.status_code == 200, cat_detail.text
    assert cat_detail.json()["name"] == f"Gautham Epicurean Catering {uid}"

    # Get menus & packages
    menus = client.get(f"/api/customer/caterers/{company_id}/menus", headers=cust_headers)
    assert menus.status_code == 200, menus.text
    assert len(menus.json()) >= 1

    pkgs = client.get(f"/api/customer/caterers/{company_id}/packages", headers=cust_headers)
    assert pkgs.status_code == 200, pkgs.text
    assert len(pkgs.json()) >= 1

    # ─────────────────────────────────────────────────────────────────────────
    # 5. SUBMIT CATERING EVENT INQUIRY
    # ─────────────────────────────────────────────────────────────────────────
    event_time = datetime.now(timezone.utc) + timedelta(days=14)
    inquiry_res = client.post(
        "/api/customer/inquiries",
        headers=cust_headers,
        json={
            "company_id": company_id,
            "title": f"Anniversary Gala {uid}",
            "event_type": "Anniversary",
            "event_date": event_time.isoformat(),
            "guest_count": 120,
            "venue_name": "Royal Palm Lawns",
            "venue_address": "42 Lavelle Road, Bangalore",
            "catering_requirement": "mixed",
            "dietary_notes": "15 Vegan, 10 Gluten-free",
            "budget": 6000.00,
            "notes": "Outdoor evening dinner with cocktail service.",
        },
    )
    assert inquiry_res.status_code in [200, 201], inquiry_res.text
    event_data = inquiry_res.json()
    event_id = event_data["id"]
    assert event_data["status"] == "enquiry"
    assert event_data["company_id"] == company_id

    # Verify event appears in customer's events list
    cust_events = client.get("/api/customer/events", headers=cust_headers)
    assert cust_events.status_code == 200, cust_events.text
    assert any(ev["id"] == event_id for ev in cust_events.json())

    # Verify event detail
    ev_detail = client.get(f"/api/customer/events/{event_id}", headers=cust_headers)
    assert ev_detail.status_code == 200, ev_detail.text
    assert ev_detail.json()["title"] == f"Anniversary Gala {uid}"

    # ─────────────────────────────────────────────────────────────────────────
    # 6. EMPLOYER GENERATES & SENDS QUOTATION
    # ─────────────────────────────────────────────────────────────────────────
    quote_res = client.post(
        f"/api/companies/{company_id}/events/{event_id}/quotations",
        headers=employer_headers,
        json={
            "title": f"Formal Proposal - Anniversary Gala {uid}",
            "valid_until": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            "items": [
                {
                    "item_name": "5-Course Banquet Service",
                    "quantity": 120,
                    "unit_price": 45.00,
                    "description": "Appetizers, mains, dessert, cocktail mixers",
                },
                {
                    "item_name": "Event Staffing & Table Setup",
                    "quantity": 1,
                    "unit_price": 500.00,
                    "description": "Uniformed servers and setup crew",
                },
            ],
            "tax_rate": 5.0,
            "notes": "Thank you for choosing Gautham Epicurean Catering.",
        },
    )
    assert quote_res.status_code in [200, 201], quote_res.text
    quote_id = quote_res.json()["id"]

    # Employer sends quotation to client
    send_res = client.post(
        f"/api/companies/{company_id}/events/{event_id}/quotations/{quote_id}/send",
        headers=employer_headers,
    )
    assert send_res.status_code == 200, send_res.text

    # ─────────────────────────────────────────────────────────────────────────
    # 7. CUSTOMER REVIEWS & ACCEPTS QUOTATION (CONFIRMS EVENT)
    # ─────────────────────────────────────────────────────────────────────────
    cust_quotes = client.get(f"/api/customer/events/{event_id}/quotations", headers=cust_headers)
    assert cust_quotes.status_code == 200, cust_quotes.text
    quotes_list = cust_quotes.json()
    assert any(q["id"] == quote_id for q in quotes_list)

    # Customer accepts quotation
    accept_res = client.post(
        f"/api/customer/events/{event_id}/quotations/{quote_id}/accept",
        headers=cust_headers,
    )
    assert accept_res.status_code == 200, accept_res.text
    assert accept_res.json()["status"] == "accepted"

    # Verify Event transitioned to 'confirmed'
    ev_refreshed = client.get(f"/api/customer/events/{event_id}", headers=cust_headers)
    assert ev_refreshed.status_code == 200, ev_refreshed.text
    assert ev_refreshed.json()["status"] == "confirmed"

    # ─────────────────────────────────────────────────────────────────────────
    # 8. EMPLOYER ISSUES MILESTONE INVOICE & CUSTOMER PAYS
    # ─────────────────────────────────────────────────────────────────────────
    inv_res = client.post(
        f"/api/companies/{company_id}/events/{event_id}/invoices",
        headers=employer_headers,
        json={
            "invoice_number": f"INV-GALA-{uid}",
            "total_amount": 2000.00,
            "due_date": (datetime.now(timezone.utc) + timedelta(days=5)).isoformat(),
            "notes": "Deposit advance for event date reservation",
            "items": [
                {
                    "item_name": "Advance Reservation Milestone",
                    "quantity": 1,
                    "unit_price": 2000.00,
                    "description": "50% Advance deposit",
                }
            ],
        },
    )
    assert inv_res.status_code in [200, 201], inv_res.text
    invoice_id = inv_res.json()["id"]

    # Customer views invoice
    cust_invoices = client.get("/api/customer/invoices", headers=cust_headers)
    assert cust_invoices.status_code == 200, cust_invoices.text
    assert any(inv["id"] == invoice_id for inv in cust_invoices.json())

    # Customer pays milestone invoice
    pay_res = client.post(
        f"/api/customer/invoices/{invoice_id}/pay",
        headers=cust_headers,
        json={
            "amount": 2000.00,
            "payment_method": "card",
            "reference_note": "Advance deposit via VISA ending 4040",
        },
    )
    assert pay_res.status_code == 200, pay_res.text
    paid_inv = pay_res.json()
    assert float(paid_inv["amount_paid"]) == 2000.00
    assert paid_inv["status"] == "paid"

    # ─────────────────────────────────────────────────────────────────────────
    # 9. CUSTOMER SUBMITS POST-EVENT FEEDBACK & RATING
    # ─────────────────────────────────────────────────────────────────────────
    feedback_res = client.post(
        f"/api/customer/events/{event_id}/feedback",
        headers=cust_headers,
        json={
            "rating": 5,
            "feedback": "Outstanding food presentation and impeccable service. All our guests were delighted!",
        },
    )
    assert feedback_res.status_code == 200, feedback_res.text
    assert feedback_res.json()["status"] == "feedback_received"

    # ─────────────────────────────────────────────────────────────────────────
    # 10. SECURITY & RBAC ISOLATION
    # ─────────────────────────────────────────────────────────────────────────
    # Customer cannot access admin routes
    adm_probe = client.get("/api/admin/users", headers=cust_headers)
    assert adm_probe.status_code == 403, f"Expected 403, got {adm_probe.status_code}"

    # Customer cannot modify employer business settings
    emp_probe = client.patch(f"/api/companies/{company_id}", headers=cust_headers, json={"name": "Hacked Catering"})
    assert emp_probe.status_code in [401, 403], f"Expected 401/403, got {emp_probe.status_code}"

    # Other non-customer (e.g. employer) cannot access customer portal profile
    cust_probe = client.get("/api/customer/profile", headers=employer_headers)
    assert cust_probe.status_code == 403, f"Expected 403, got {cust_probe.status_code}"
