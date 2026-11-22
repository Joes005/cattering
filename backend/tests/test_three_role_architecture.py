import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "admin" in data["roles"] and "employer" in data["roles"] and "employee" in data["roles"]


def test_admin_authentication():
    # 1. Admin login with correct credentials
    res = client.post("/api/auth/admin/login", json={"email": "admin@plated.com", "password": "Admin@1234"})
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "admin"
    assert "token" in data
    admin_token = data["token"]

    # 2. Access Admin stats
    stats_res = client.get("/api/admin/stats", headers={"Authorization": f"Bearer {admin_token}"})
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert "total_employers" in stats
    assert "total_employees" in stats


def test_employer_registration_and_approval_workflow():
    # 1. Register a new catering business
    unique_email = f"caterer_{int(datetime.now().timestamp())}@test.com"
    reg_payload = {
        "full_name": "Ramesh Chef",
        "email": unique_email,
        "password": "Password@123",
        "phone": "+91-98765-43210",
        "business_name": f"Royal Caterers {int(datetime.now().timestamp())}",
        "business_type": "Boutique Catering",
        "business_address": "T. Nagar, Chennai",
        "gst_number": "33ABCDE1234F1Z5",
        "description": "Traditional South Indian wedding catering",
    }
    res = client.post("/api/auth/employer/register", json=reg_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "employer"
    assert data["company"]["status"] == "pending_approval"
    employer_token = data["token"]
    company_id = data["company"]["id"]

    # 2. Verify that pending employer CANNOT access protected business operations
    ev_res = client.get(f"/api/companies/{company_id}/events", headers={"Authorization": f"Bearer {employer_token}"})
    assert ev_res.status_code == 403
    assert "pending Admin review" in ev_res.json()["detail"]

    # 3. Admin logs in and reviews pending registration
    admin_res = client.post("/api/auth/admin/login", json={"email": "admin@plated.com", "password": "Admin@1234"})
    admin_token = admin_res.json()["token"]

    approval_res = client.patch(
        f"/api/admin/employers/{company_id}/approval",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"status": "approved"},
    )
    assert approval_res.status_code == 200
    assert approval_res.json()["status"] == "approved"

    # 4. Now employer can access business operations
    ev_res2 = client.get(f"/api/companies/{company_id}/events", headers={"Authorization": f"Bearer {employer_token}"})
    assert ev_res2.status_code == 200
    assert isinstance(ev_res2.json(), list)


def test_employee_independent_registration_and_profile():
    unique_email = f"worker_{int(datetime.now().timestamp())}@test.com"
    reg_payload = {
        "full_name": "Mani Kandan",
        "email": unique_email,
        "password": "Worker@123",
        "phone": "+91-99887-76655",
        "location": "Velachery, Chennai",
        "skills": ["Bartender", "Banquet Server"],
        "work_experience_years": 3.0,
        "preferred_work_type": "weekend",
        "bio": "Experienced wedding banquet server and live mocktail specialist.",
    }
    res = client.post("/api/auth/employee/register", json=reg_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "employee"
    assert data["employee_profile"]["location"] == "Velachery, Chennai"
    worker_token = data["token"]

    # Access my employee profile
    prof_res = client.get("/api/employee/profile", headers={"Authorization": f"Bearer {worker_token}"})
    assert prof_res.status_code == 200
    assert prof_res.json()["skills"] == ["Bartender", "Banquet Server"]


def test_role_authorization_boundaries():
    # 1. Employee tries to access Admin endpoints
    emp_login = client.post("/api/auth/employee/login", json={"email": "suresh.service@grandregency.com", "password": "Staff@123"})
    assert emp_login.status_code == 200
    emp_token = emp_login.json()["token"]

    admin_attempt = client.get("/api/admin/stats", headers={"Authorization": f"Bearer {emp_token}"})
    assert admin_attempt.status_code == 403

    # 2. Employer tries to access Admin endpoints
    owner_login = client.post("/api/auth/employer/login", json={"email": "owner@grandregency.com", "password": "Owner@123"})
    assert owner_login.status_code == 200
    owner_token = owner_login.json()["token"]

    owner_admin_attempt = client.get("/api/admin/stats", headers={"Authorization": f"Bearer {owner_token}"})
    assert owner_admin_attempt.status_code == 403

    # 3. Employer tries to access Employee endpoints
    owner_emp_attempt = client.get("/api/employee/jobs", headers={"Authorization": f"Bearer {owner_token}"})
    assert owner_emp_attempt.status_code == 403


def test_tenant_isolation_between_employers():
    # Employer 1: Grand Regency Catering
    owner1_res = client.post("/api/auth/employer/login", json={"email": "owner@grandregency.com", "password": "Owner@123"})
    token1 = owner1_res.json()["token"]
    company1_id = owner1_res.json()["company"]["id"]

    # Create a customer and event for Employer 1
    cust_res = client.post(
        f"/api/companies/{company1_id}/customers",
        headers={"Authorization": f"Bearer {token1}"},
        json={"name": "Confidential VIP Customer", "phone": "+91-91234-56789", "email": "vip@secret.com"},
    )
    assert cust_res.status_code == 201
    cust_id = cust_res.json()["id"]

    # Employer 2: Spice Route Events
    owner2_res = client.post("/api/auth/employer/login", json={"email": "owner2@spiceroute-demo.com", "password": "Owner@123"})
    token2 = owner2_res.json()["token"]

    # Employer 2 attempts to view Employer 1's customers -> returns 404 Not Found (strict tenant isolation)
    leak_attempt = client.get(f"/api/companies/{company1_id}/customers/{cust_id}", headers={"Authorization": f"Bearer {token2}"})
    assert leak_attempt.status_code == 404


def test_workforce_marketplace_full_lifecycle():
    # 1. Employer publishes a job posting
    owner_res = client.post("/api/auth/employer/login", json={"email": "owner@grandregency.com", "password": "Owner@123"})
    owner_token = owner_res.json()["token"]
    company_id = owner_res.json()["company"]["id"]

    # Get an event
    events_res = client.get(f"/api/companies/{company_id}/events", headers={"Authorization": f"Bearer {owner_token}"})
    assert events_res.status_code == 200
    event_id = events_res.json()[0]["id"]

    now = datetime.now(timezone.utc)
    job_payload = {
        "event_id": event_id,
        "role_title": "Buffet Captain",
        "description": "Managing live counter buffet service for grand dinner.",
        "required_count": 2,
        "shift_start": (now + timedelta(days=2)).isoformat(),
        "shift_end": (now + timedelta(days=2, hours=6)).isoformat(),
        "pay_rate": 1100.0,
        "pay_type": "fixed_shift",
        "location": "Chennai Grand Hall",
    }
    posting_res = client.post(
        f"/api/companies/{company_id}/marketplace/postings",
        headers={"Authorization": f"Bearer {owner_token}"},
        json=job_payload,
    )
    assert posting_res.status_code == 201
    posting_id = posting_res.json()["id"]

    # 2. Employee browses marketplace and applies
    emp_res = client.post("/api/auth/employee/login", json={"email": "suresh.service@grandregency.com", "password": "Staff@123"})
    emp_token = emp_res.json()["token"]

    browse_res = client.get("/api/employee/jobs", headers={"Authorization": f"Bearer {emp_token}"})
    assert browse_res.status_code == 200
    assert any(j["id"] == posting_id for j in browse_res.json())

    apply_res = client.post(
        f"/api/employee/jobs/{posting_id}/apply",
        headers={"Authorization": f"Bearer {emp_token}"},
        json={"cover_note": "Experienced captain ready for this shift."},
    )
    assert apply_res.status_code == 201
    application_id = apply_res.json()["id"]

    # 3. Employer reviews and accepts application
    review_res = client.patch(
        f"/api/companies/{company_id}/marketplace/applications/{application_id}/review",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={"status": "accepted", "employer_notes": "Great credentials, confirmed."},
    )
    assert review_res.status_code == 200
    assert review_res.json()["status"] == "accepted"

    # 4. Employee checks schedule -> confirmed assignment exists
    sched_res = client.get("/api/employee/schedule", headers={"Authorization": f"Bearer {emp_token}"})
    assert sched_res.status_code == 200
    matching_asg = next((a for a in sched_res.json() if a["job_posting_id"] == posting_id), None)
    assert matching_asg is not None
    assignment_id = matching_asg["id"]

    # 5. Employee checks in and checks out
    check_in_res = client.post(
        "/api/employee/attendance/check",
        headers={"Authorization": f"Bearer {emp_token}"},
        json={"assignment_id": assignment_id, "action": "check_in"},
    )
    assert check_in_res.status_code == 200
    assert check_in_res.json()["check_in"] is not None

    check_out_res = client.post(
        "/api/employee/attendance/check",
        headers={"Authorization": f"Bearer {emp_token}"},
        json={"assignment_id": assignment_id, "action": "check_out"},
    )
    assert check_out_res.status_code == 200
    assert check_out_res.json()["check_out"] is not None

    # 6. Employer verifies attendance and approves shift earnings
    verify_res = client.patch(
        f"/api/companies/{company_id}/marketplace/attendance/{assignment_id}/verify",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={"hours_worked": 6.0, "status": "present", "verified_by_employer": True},
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["verified_by_employer"] is True

    # 7. Employee checks earnings -> earning is approved
    earn_res = client.get("/api/employee/earnings", headers={"Authorization": f"Bearer {emp_token}"})
    assert earn_res.status_code == 200
    matching_earn = next((e for e in earn_res.json() if e["assignment_id"] == assignment_id), None)
    assert matching_earn is not None
    assert matching_earn["status"] == "approved"
    assert matching_earn["amount"] == 1100.0

