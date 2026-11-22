import uuid
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import get_db
from app.models.models import CompanyStatus

client = TestClient(app)


def test_employer_multi_business_and_subscription_flow():
    uid = uuid.uuid4().hex[:8]
    employer_email = f"caterer_{uid}@platedtest.com"
    password = "Password@123"

    # 1. Register new employer with their initial catering company
    reg_payload = {
        "full_name": f"Chef Ramesh {uid}",
        "email": employer_email,
        "password": password,
        "phone": "9876543210",
        "business_name": f"Ramesh Banquets {uid}",
        "business_type": "Catering",
        "business_address": "123 Marina Beach Road, Chennai",
        "gst_number": f"33ABCDE{uid.upper()}1Z5",
        "currency": "INR",
    }
    reg_res = client.post("/api/auth/employer/register", json=reg_payload)
    assert reg_res.status_code in [200, 201], f"Registration failed: {reg_res.text}"
    data = reg_res.json()
    assert data["role"] == "employer"
    company_1 = data["company"]
    assert company_1 is not None
    assert company_1["name"] == f"Ramesh Banquets {uid}"
    company_1_id = company_1["id"]

    # 2. Login as employer - verify token and companies list returned
    login_res = client.post("/api/auth/employer/login", json={"email": employer_email, "password": password})
    assert login_res.status_code == 200
    login_data = login_res.json()
    token = login_data["token"]
    assert "companies" in login_data
    assert len(login_data["companies"]) >= 1
    assert login_data["companies"][0]["id"] == company_1_id

    headers = {"Authorization": f"Bearer {token}"}

    # Verify /auth/me returns the companies list
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["companies"] is not None
    assert any(c["id"] == company_1_id for c in me_data["companies"])

    # 3. Register a SECOND catering business under the same employer account
    biz_2_payload = {
        "name": f"Ramesh Coastal Kitchen {uid}",
        "business_type": "Cloud Kitchen",
        "business_address": "45 Besant Nagar, Chennai",
        "gst_number": f"33XYZWE{uid.upper()}1Z8",
        "description": "Specializing in coastal seafood catering and boxed meal delivery",
        "currency": "INR",
    }
    biz_2_res = client.post("/api/companies", json=biz_2_payload, headers=headers)
    assert biz_2_res.status_code == 201, f"Registering 2nd business failed: {biz_2_res.text}"
    company_2 = biz_2_res.json()
    company_2_id = company_2["id"]
    assert company_2["name"] == f"Ramesh Coastal Kitchen {uid}"
    assert company_2_id != company_1_id

    # 4. List my businesses via GET /api/companies/my-businesses
    my_biz_res = client.get("/api/companies/my-businesses", headers=headers)
    assert my_biz_res.status_code == 200
    my_businesses = my_biz_res.json()
    assert len(my_businesses) >= 2
    my_biz_ids = [b["id"] for b in my_businesses]
    assert company_1_id in my_biz_ids
    assert company_2_id in my_biz_ids

    # Admin approves both companies (verifying the integrated platform governance)
    admin_res = client.post("/api/auth/admin/login", json={"email": "admin@plated.com", "password": "Admin@1234"})
    assert admin_res.status_code == 200
    admin_headers = {"Authorization": f"Bearer {admin_res.json()['token']}"}

    appr1 = client.patch(f"/api/admin/employers/{company_1_id}/approval", headers=admin_headers, json={"status": "approved"})
    assert appr1.status_code == 200
    appr2 = client.patch(f"/api/admin/employers/{company_2_id}/approval", headers=admin_headers, json={"status": "approved"})
    assert appr2.status_code == 200

    # 5. Create customer contact under Company 1
    cust_1_res = client.post(
        f"/api/companies/{company_1_id}/customers",
        headers=headers,
        json={"name": "Kavitha Sharma", "email": f"kavitha_{uid}@example.com", "phone": "9998887771"},
    )
    assert cust_1_res.status_code == 201, f"Failed creating customer in company 1: {cust_1_res.text}"
    cust_1_id = cust_1_res.json()["id"]

    # Create event under Company 1
    event_1_res = client.post(
        f"/api/companies/{company_1_id}/events",
        headers=headers,
        json={
            "customer_id": cust_1_id,
            "title": "Kavitha Wedding Reception",
            "event_type": "Wedding",
            "event_date": datetime.now(timezone.utc).isoformat(),
            "guest_count": 250,
            "venue_name": "ITC Grand Chola, Chennai",
            "catering_requirement": "mixed",
        },
    )
    assert event_1_res.status_code == 201, f"Failed creating event in company 1: {event_1_res.text}"

    # Verify Company 1 events list has the event
    list_events_1 = client.get(f"/api/companies/{company_1_id}/events", headers=headers)
    assert list_events_1.status_code == 200
    assert len(list_events_1.json()) == 1
    assert list_events_1.json()[0]["title"] == "Kavitha Wedding Reception"

    # Verify Company 2 events list is empty (strict tenant isolation!)
    list_events_2 = client.get(f"/api/companies/{company_2_id}/events", headers=headers)
    assert list_events_2.status_code == 200
    assert len(list_events_2.json()) == 0

    # 6. Create customer and event under Company 2
    cust_2_res = client.post(
        f"/api/companies/{company_2_id}/customers",
        headers=headers,
        json={"name": "Suresh Raina", "email": f"suresh_{uid}@example.com", "phone": "9998887772"},
    )
    assert cust_2_res.status_code == 201
    cust_2_id = cust_2_res.json()["id"]

    event_2_res = client.post(
        f"/api/companies/{company_2_id}/events",
        headers=headers,
        json={
            "customer_id": cust_2_id,
            "title": "Corporate Gala Dinner",
            "event_type": "Corporate Event",
            "event_date": datetime.now(timezone.utc).isoformat(),
            "guest_count": 100,
            "venue_name": "Tidel Park Auditorium",
            "catering_requirement": "non_veg",
        },
    )
    assert event_2_res.status_code == 201

    # Verify Company 2 now has exactly 1 event
    list_events_2_after = client.get(f"/api/companies/{company_2_id}/events", headers=headers)
    assert list_events_2_after.status_code == 200
    assert len(list_events_2_after.json()) == 1
    assert list_events_2_after.json()[0]["title"] == "Corporate Gala Dinner"

    # 7. Check SaaS Subscription Status for Company 1
    sub_1_res = client.get(f"/api/companies/{company_1_id}/subscription", headers=headers)
    assert sub_1_res.status_code == 200, f"Get subscription failed: {sub_1_res.text}"
    sub_1 = sub_1_res.json()
    assert sub_1["events_used_this_month"] >= 1
    assert sub_1["customers_count"] >= 1
    assert "plan" in sub_1

    # 8. Upgrade Company 1 subscription to 'growth' plan (annual)
    upgrade_res = client.post(
        f"/api/companies/{company_1_id}/subscription/subscribe",
        headers=headers,
        json={"plan_code": "growth", "billing_cycle": "annual", "payment_reference": "TEST_STRIPE_CH_123"},
    )
    assert upgrade_res.status_code == 200, f"Subscription upgrade failed: {upgrade_res.text}"
    sub_upgraded = upgrade_res.json()
    assert sub_upgraded["has_active_subscription"] is True
    assert sub_upgraded["status"] == "active"
    assert sub_upgraded["plan"]["code"] == "growth"
    assert sub_upgraded["max_events_limit"] == 50
    assert sub_upgraded["max_customers_limit"] == 500
    assert sub_upgraded["max_job_postings_limit"] == 100
    assert sub_upgraded["custom_branding"] is True

    # 9. Tenant Isolation & Access Control Security Check:
    # A different employer cannot access Company 1 or Company 2 subscription
    other_uid = uuid.uuid4().hex[:8]
    other_reg = client.post(
        "/api/auth/employer/register",
        json={
            "full_name": f"Chef Vikram {other_uid}",
            "email": f"vikram_{other_uid}@platedtest.com",
            "password": "Password@123",
            "phone": "9887766554",
            "business_name": f"Vikram Catering {other_uid}",
            "business_address": "88 Anna Nagar, Chennai",
        },
    )
    assert other_reg.status_code in [200, 201]
    other_token = other_reg.json()["token"]
    other_headers = {"Authorization": f"Bearer {other_token}"}

    # Other employer attempting to view company 1's subscription must fail (404/403)
    unauth_sub = client.get(f"/api/companies/{company_1_id}/subscription", headers=other_headers)
    assert unauth_sub.status_code in [403, 404]

    # Other employer attempting to upgrade company 1's subscription must fail (403/404)
    unauth_upgrade = client.post(
        f"/api/companies/{company_1_id}/subscription/subscribe",
        headers=other_headers,
        json={"plan_code": "business", "billing_cycle": "monthly"},
    )
    assert unauth_upgrade.status_code in [403, 404]
