import uuid
import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_employee_full_lifecycle_end_to_end():
    uid = uuid.uuid4().hex[:8]

    # ─────────────────────────────────────────────────────────────────────────
    # 1. SETUP APPROVED EMPLOYER & POST OPEN MARKETPLACE SHIFT
    # ─────────────────────────────────────────────────────────────────────────
    employer_email = f"caterer_{uid}@platedtest.com"
    emp_reg = client.post(
        "/api/auth/employer/register",
        json={
            "full_name": f"Chef Ananthan {uid}",
            "email": employer_email,
            "password": "Password@123",
            "phone": "9876543211",
            "business_name": f"Ananthan Grand Banquets {uid}",
            "business_type": "Catering",
            "business_address": "ECR Road, Chennai",
        },
    )
    assert emp_reg.status_code in [200, 201]
    employer_token = emp_reg.json()["token"]
    employer_headers = {"Authorization": f"Bearer {employer_token}"}
    company_id = emp_reg.json()["company"]["id"]

    # Admin approves employer company
    admin_login = client.post("/api/auth/admin/login", json={"email": "admin@plated.com", "password": "Admin@1234"})
    assert admin_login.status_code == 200
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['token']}"}
    appr = client.patch(f"/api/admin/employers/{company_id}/approval", headers=admin_headers, json={"status": "approved"})
    assert appr.status_code == 200

    # Employer creates event & customer
    cust_res = client.post(
        f"/api/companies/{company_id}/customers",
        headers=employer_headers,
        json={"name": f"Client {uid}", "email": f"client_{uid}@example.com", "phone": "9898989898"},
    )
    assert cust_res.status_code == 201
    cust_id = cust_res.json()["id"]

    event_start = datetime.now(timezone.utc) + timedelta(days=2)
    event_res = client.post(
        f"/api/companies/{company_id}/events",
        headers=employer_headers,
        json={
            "customer_id": cust_id,
            "title": f"Grand Reception {uid}",
            "event_type": "Wedding",
            "event_date": event_start.isoformat(),
            "guest_count": 300,
            "catering_requirement": "mixed",
        },
    )
    assert event_res.status_code == 201
    event_id = event_res.json()["id"]

    # Employer posts an open job posting for Head Chef
    shift_start = event_start.replace(hour=10, minute=0, second=0, microsecond=0)
    shift_end = shift_start + timedelta(hours=6)
    job_res = client.post(
        f"/api/companies/{company_id}/marketplace/jobs",
        headers=employer_headers,
        json={
            "event_id": event_id,
            "role_title": "Head Chef",
            "required_count": 2,
            "shift_start": shift_start.isoformat(),
            "shift_end": shift_end.isoformat(),
            "pay_rate": 350.0,
            "location": "Chennai Banquet Center",
            "notes": "Experience in South Indian & Chettinad feasts required",
        },
    )
    assert job_res.status_code == 201
    job_id = job_res.json()["id"]

    # ─────────────────────────────────────────────────────────────────────────
    # 2. EMPLOYEE REGISTRATION & AUTHENTICATION
    # ─────────────────────────────────────────────────────────────────────────
    employee_email = f"worker_{uid}@platedtest.com"
    worker_reg = client.post(
        "/api/auth/employee/register",
        json={
            "full_name": f"Karthik Chef {uid}",
            "email": employee_email,
            "password": "Password@123",
            "phone": "9123456789",
            "location": "Chennai, Tamil Nadu",
            "skills": ["Head Chef", "Tandoor / Grill"],
            "work_experience_years": 4.5,
            "preferred_work_type": "flexible",
            "bio": "Experienced banquet chef with over 4 years of luxury wedding catering experience.",
        },
    )
    assert worker_reg.status_code in [200, 201]
    worker_data = worker_reg.json()
    assert worker_data["role"] == "employee"
    assert worker_data["employee_profile"] is not None
    employee_profile_id = worker_data["employee_profile"]["id"]

    # Employee login
    worker_login = client.post(
        "/api/auth/employee/login",
        json={"email": employee_email, "password": "Password@123"},
    )
    assert worker_login.status_code == 200
    employee_token = worker_login.json()["token"]
    employee_headers = {"Authorization": f"Bearer {employee_token}"}

    # ─────────────────────────────────────────────────────────────────────────
    # 3. PROFILE MANAGEMENT (GET & PATCH & PUT)
    # ─────────────────────────────────────────────────────────────────────────
    prof_res = client.get("/api/employee/profile", headers=employee_headers)
    assert prof_res.status_code == 200
    assert prof_res.json()["work_experience_years"] == 4.5

    update_res = client.patch(
        "/api/employee/profile",
        headers=employee_headers,
        json={"hourly_rate": 400.0, "is_available": True, "skills": ["Head Chef", "Tandoor / Grill", "Pastry / Sweets"]},
    )
    assert update_res.status_code == 200
    assert "Pastry / Sweets" in update_res.json()["skills"]

    # ─────────────────────────────────────────────────────────────────────────
    # 4. MARKETPLACE SHIFT DISCOVERY
    # ─────────────────────────────────────────────────────────────────────────
    jobs_list_res = client.get("/api/employee/jobs?role=Head+Chef", headers=employee_headers)
    assert jobs_list_res.status_code == 200
    jobs_found = jobs_list_res.json()
    assert any(j["id"] == job_id for j in jobs_found)

    job_detail_res = client.get(f"/api/employee/jobs/{job_id}", headers=employee_headers)
    assert job_detail_res.status_code == 200
    assert job_detail_res.json()["pay_rate"] == 350.0

    # ─────────────────────────────────────────────────────────────────────────
    # 5. SHIFT APPLICATION & PREVENT DUPLICATES
    # ─────────────────────────────────────────────────────────────────────────
    apply_res = client.post(
        f"/api/employee/jobs/{job_id}/apply",
        headers=employee_headers,
        json={"cover_note": "I have managed wedding feasts for over 500 guests."},
    )
    assert apply_res.status_code == 201
    application_id = apply_res.json()["id"]

    # Duplicate application check
    dup_apply = client.post(
        f"/api/employee/jobs/{job_id}/apply",
        headers=employee_headers,
        json={"cover_note": "Applying again"},
    )
    assert dup_apply.status_code == 409

    # Check submitted applications
    my_apps = client.get("/api/employee/applications", headers=employee_headers)
    assert my_apps.status_code == 200
    assert any(a["id"] == application_id for a in my_apps.json())

    # ─────────────────────────────────────────────────────────────────────────
    # 6. EMPLOYER REVIEW & APPLICATION ACCEPTANCE
    # ─────────────────────────────────────────────────────────────────────────
    accept_res = client.patch(
        f"/api/companies/{company_id}/marketplace/applications/{application_id}",
        headers=employer_headers,
        json={"status": "accepted"},
    )
    assert accept_res.status_code == 200
    assert accept_res.json()["status"] == "accepted"

    # ─────────────────────────────────────────────────────────────────────────
    # 7. CONFIRMED SHIFT SCHEDULE & DIGITAL ATTENDANCE
    # ─────────────────────────────────────────────────────────────────────────
    schedule_res = client.get("/api/employee/schedule", headers=employee_headers)
    assert schedule_res.status_code == 200
    schedule = schedule_res.json()
    assert len(schedule) >= 1
    my_assignment = next(s for s in schedule if s["event_id"] == event_id)
    assignment_id = my_assignment["id"]
    assert my_assignment["agreed_pay"] == 350.0
    assert my_assignment["status"] == "confirmed"

    # Employee Check-In
    check_in_res = client.post(
        f"/api/employee/assignments/{assignment_id}/check-in",
        headers=employee_headers,
        json={"notes": "Arrived at venue on time"},
    )
    assert check_in_res.status_code == 200

    # Verify assignment status is in_progress
    sched_in_prog = client.get("/api/employee/schedule", headers=employee_headers)
    curr_asg = next(s for s in sched_in_prog.json() if s["id"] == assignment_id)
    assert curr_asg["status"] == "in_progress"

    # Employee Check-Out
    check_out_res = client.post(
        f"/api/employee/assignments/{assignment_id}/check-out",
        headers=employee_headers,
        json={"notes": "Shift completed successfully"},
    )
    assert check_out_res.status_code == 200

    # Verify assignment status is completed
    sched_done = client.get("/api/employee/schedule", headers=employee_headers)
    curr_asg_done = next(s for s in sched_done.json() if s["id"] == assignment_id)
    assert curr_asg_done["status"] == "completed"

    # Check attendance history
    att_history = client.get("/api/employee/attendance", headers=employee_headers)
    assert att_history.status_code == 200
    assert len(att_history.json()) >= 1

    # ─────────────────────────────────────────────────────────────────────────
    # 8. PAYOUT APPROVAL & CONSOLIDATED EARNINGS
    # ─────────────────────────────────────────────────────────────────────────
    # Employer verifies attendance and approves payout
    employer_payouts = client.get(f"/api/companies/{company_id}/marketplace/earnings", headers=employer_headers)
    assert employer_payouts.status_code == 200
    payout_records = employer_payouts.json()
    assert len(payout_records) >= 1
    earning_id = payout_records[0]["id"]

    # Employer settles payout
    settle_res = client.patch(
        f"/api/companies/{company_id}/marketplace/earnings/{earning_id}/status",
        headers=employer_headers,
        json={"status": "paid", "payment_reference": f"UPI_TXN_{uid}"},
    )
    assert settle_res.status_code == 200
    assert settle_res.json()["status"] == "paid"

    # Employee queries consolidated earnings summary
    earnings_res = client.get("/api/employee/earnings", headers=employee_headers)
    assert earnings_res.status_code == 200
    payout_records = earnings_res.json()
    assert isinstance(payout_records, list)
    assert len(payout_records) >= 1
    payout_item = payout_records[0]
    assert payout_item["status"] == "paid"
    assert payout_item["payment_reference"] == f"UPI_TXN_{uid}"
    assert "event_title" in payout_item

    # Also test the summary endpoint
    summary_res = client.get("/api/employee/earnings/summary", headers=employee_headers)
    assert summary_res.status_code == 200
    earnings_summary = summary_res.json()
    assert "total_earnings" in earnings_summary
    assert "paid_out" in earnings_summary
    assert earnings_summary["paid_out"] > 0
    assert len(earnings_summary["payouts"]) >= 1

    # ─────────────────────────────────────────────────────────────────────────
    # 9. ROLE BOUNDARY SECURITY
    # ─────────────────────────────────────────────────────────────────────────
    # Employee cannot access admin or employer management endpoints
    unauth_admin = client.get("/api/admin/stats", headers=employee_headers)
    assert unauth_admin.status_code == 403

    unauth_employer = client.get(f"/api/companies/{company_id}/subscription", headers=employee_headers)
    assert unauth_employer.status_code in [403, 404]
