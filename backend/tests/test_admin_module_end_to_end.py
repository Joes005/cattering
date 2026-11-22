import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def get_admin_token():
    res = client.post("/api/auth/admin/login", json={"email": "admin@plated.com", "password": "Admin@1234"})
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    return res.json()["token"]


def test_admin_stats_and_charts():
    token = get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Stats
    stats_res = client.get("/api/admin/stats", headers=headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert "total_employers" in stats
    assert "total_subscriptions" in stats
    assert "total_commissions" in stats
    assert "open_disputes" in stats

    # 2. Charts
    rev_res = client.get("/api/admin/charts/revenue", headers=headers)
    assert rev_res.status_code == 200
    assert len(rev_res.json()) > 0

    events_res = client.get("/api/admin/charts/events", headers=headers)
    assert events_res.status_code == 200
    assert len(events_res.json()) > 0


def test_admin_user_management():
    token = get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. List users
    users_res = client.get("/api/admin/users", headers=headers)
    assert users_res.status_code == 200
    users = users_res.json()
    assert len(users) > 0

    # 2. Filter users by role
    emp_res = client.get("/api/admin/users?role=employee", headers=headers)
    assert emp_res.status_code == 200
    for u in emp_res.json():
        assert u["role"] == "employee"

    # 3. Toggle user status on a non-admin user
    target_user = next((u for u in users if u["role"] != "admin"), None)
    if target_user:
        status_res = client.patch(
            f"/api/admin/users/{target_user['id']}/status",
            headers=headers,
            json={"status": "suspended"},
        )
        assert status_res.status_code == 200
        assert status_res.json()["status"] == "suspended"

        # Re-activate
        reactivate_res = client.patch(
            f"/api/admin/users/{target_user['id']}/status",
            headers=headers,
            json={"status": "active"},
        )
        assert reactivate_res.status_code == 200
        assert reactivate_res.json()["status"] == "active"


def test_admin_employer_approval_and_status():
    token = get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. List employers
    employers_res = client.get("/api/admin/employers", headers=headers)
    assert employers_res.status_code == 200
    employers = employers_res.json()
    assert len(employers) > 0
    first_emp = employers[0]

    # Verify enriched owner details exist in schema
    assert "owner_id" in first_emp
    assert "owner_name" in first_emp

    # 2. Test status toggle
    toggle_res = client.patch(
        f"/api/admin/employers/{first_emp['id']}/status",
        headers=headers,
        json={"status": "approved"},
    )
    assert toggle_res.status_code == 200
    assert toggle_res.json()["status"] == "approved"

    # 3. Test alias endpoint POST
    alias_res = client.post(f"/api/admin/employers/{first_emp['id']}/approve", headers=headers)
    assert alias_res.status_code == 200


def test_admin_subscription_management():
    token = get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. List plans (seeded in migration)
    plans_res = client.get("/api/admin/subscriptions/plans", headers=headers)
    assert plans_res.status_code == 200
    plans = plans_res.json()
    assert len(plans) >= 4

    # 2. Create custom plan
    unique_code = f"custom_plan_{int(datetime.now().timestamp())}"
    new_plan_payload = {
        "code": unique_code,
        "name": "Custom Enterprise Plan",
        "description": "High throughput plan for hotel chains",
        "monthly_price": 9999.0,
        "annual_price": 99990.0,
        "max_active_events_per_month": 500,
        "max_customers": 5000,
        "max_job_postings_per_month": 500,
        "custom_branding": True,
        "analytics_tier": "custom",
    }
    create_res = client.post("/api/admin/subscriptions/plans", headers=headers, json=new_plan_payload)
    assert create_res.status_code == 201
    created_plan = create_res.json()
    assert created_plan["code"] == unique_code

    # 3. Update plan
    update_res = client.patch(
        f"/api/admin/subscriptions/plans/{created_plan['id']}",
        headers=headers,
        json={"name": "Updated Enterprise Plan"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Updated Enterprise Plan"

    # 4. Override company subscription
    employers = client.get("/api/admin/employers", headers=headers).json()
    if employers:
        override_payload = {
            "company_id": employers[0]["id"],
            "plan_id": created_plan["id"],
            "billing_cycle": "monthly",
            "status": "active",
            "duration_days": 60,
        }
        override_res = client.post("/api/admin/subscriptions/override", headers=headers, json=override_payload)
        assert override_res.status_code == 200
        assert override_res.json()["status"] == "active"


def test_admin_commission_management():
    token = get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. List commission rules
    rules_res = client.get("/api/admin/commissions/rules", headers=headers)
    assert rules_res.status_code == 200
    rules = rules_res.json()
    assert len(rules) >= 2

    # 2. Create new commission rule
    new_rule_payload = {
        "commission_type": "catering_booking",
        "name": "VIP Wedding Commission",
        "calculation_mode": "percentage",
        "rate": 12.5,
        "flat_fee": 500.0,
    }
    create_res = client.post("/api/admin/commissions/rules", headers=headers, json=new_rule_payload)
    assert create_res.status_code == 201
    created_rule = create_res.json()
    assert created_rule["rate"] == 12.5

    # 3. Update rule
    update_res = client.patch(
        f"/api/admin/commissions/rules/{created_rule['id']}",
        headers=headers,
        json={"rate": 14.0},
    )
    assert update_res.status_code == 200
    assert update_res.json()["rate"] == 14.0

    # 4. View ledger
    ledger_res = client.get("/api/admin/commissions/ledger", headers=headers)
    assert ledger_res.status_code == 200


def test_admin_disputes_and_settings():
    token = get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Platform Settings
    settings_res = client.get("/api/admin/settings", headers=headers)
    assert settings_res.status_code == 200
    settings = settings_res.json()
    assert len(settings) > 0

    # Update a setting
    patch_res = client.patch(
        "/api/admin/settings/platform_name",
        headers=headers,
        json={"value": "PLATED Pro", "description": "Updated brand name"},
    )
    assert patch_res.status_code == 200

    # 2. Disputes List
    disputes_res = client.get("/api/admin/disputes", headers=headers)
    assert disputes_res.status_code == 200

    # 3. Audit Logs
    audit_res = client.get("/api/admin/audit-logs", headers=headers)
    assert audit_res.status_code == 200
    assert len(audit_res.json()) > 0

