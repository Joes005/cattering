from app.core.permissions import DEFAULT_ROLE_PERMISSIONS, PERMISSIONS
from app.core.security import effective_permissions, hash_password
from app.db.database import SessionLocal
from app.models.models import (
    Client,
    Company,
    CompanyMember,
    EmploymentRole,
    GlobalRole,
    Permission,
    RolePermission,
    User,
)

db = SessionLocal()


def seed_permissions():
    existing = {p.key for p in db.query(Permission).all()}
    for key, module, description in PERMISSIONS:
        if key not in existing:
            db.add(Permission(key=key, module=module, description=description))
    db.commit()

    permissions_by_key = {p.key: p for p in db.query(Permission).all()}
    existing_role_perms = {(rp.employment_role, rp.permission_id) for rp in db.query(RolePermission).all()}
    for role, keys in DEFAULT_ROLE_PERMISSIONS.items():
        for key in keys:
            perm = permissions_by_key[key]
            if (role, perm.id) not in existing_role_perms:
                db.add(RolePermission(employment_role=role, permission_id=perm.id))
    db.commit()


def get_or_create_user(full_name, email, password, global_role, phone=None):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            full_name=full_name,
            email=email,
            password_hash=hash_password(password),
            global_role=global_role,
            phone=phone,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def main():
    seed_permissions()

    get_or_create_user("Priya Nathan", "admin@plated.com", "Admin@1234", GlobalRole.admin)

    company = db.query(Company).filter(Company.slug == "grand-regency-catering").first()
    if not company:
        company = Company(
            name="Grand Regency Catering",
            slug="grand-regency-catering",
            gst_number="33AAAAA0000A1Z5",
            currency="INR",
        )
        db.add(company)
        db.commit()
        db.refresh(company)

    owner = get_or_create_user("Arun Kumar", "owner@grandregency.com", "Owner@123", GlobalRole.company_user, "+91-98400-10001")
    if not db.query(CompanyMember).filter(CompanyMember.user_id == owner.id, CompanyMember.company_id == company.id).first():
        db.add(CompanyMember(company_id=company.id, user_id=owner.id, employment_role=EmploymentRole.owner, job_title="Founder & Owner"))
        db.commit()

    employees = [
        ("Rahul Menon", "rahul.chef@grandregency.com", "Chef@123", EmploymentRole.manager, "Head Chef", "+91-98400-10002"),
        ("Kavitha Raj", "kavitha.ops@grandregency.com", "Ops@1234", EmploymentRole.manager, "Operations Manager", "+91-98400-10003"),
        ("Suresh Babu", "suresh.service@grandregency.com", "Staff@123", EmploymentRole.staff, "Service Captain", "+91-98400-10004"),
        ("Divya Shree", "divya.kitchen@grandregency.com", "Staff@123", EmploymentRole.staff, "Kitchen Staff", "+91-98400-10005"),
        ("Manoj Kumar", "manoj.delivery@grandregency.com", "Staff@123", EmploymentRole.staff, "Delivery & Setup", "+91-98400-10006"),
    ]
    for full_name, email, password, role, job_title, phone in employees:
        user = get_or_create_user(full_name, email, password, GlobalRole.company_user, phone)
        if not db.query(CompanyMember).filter(CompanyMember.user_id == user.id, CompanyMember.company_id == company.id).first():
            db.add(CompanyMember(company_id=company.id, user_id=user.id, employment_role=role, job_title=job_title))
    db.commit()

    clients_data = [
        ("Marco & Elena Rossi", "marco@plated.com", "Seeker@123", "+91-98400-20001"),
        ("Infosys Chennai HR", "hr.events@infosys-demo.com", "Client@123", "+91-98400-20002"),
        ("Meera Krishnan", "meera.k@plated.com", "Client@123", "+91-98400-20003"),
        ("Ashok Textiles Pvt Ltd", "events@ashoktextiles-demo.com", "Client@123", "+91-98400-20004"),
        ("Lavanya & Karthik", "lavanya.k@plated.com", "Client@123", "+91-98400-20005"),
    ]
    for full_name, email, password, phone in clients_data:
        user = get_or_create_user(full_name, email, password, GlobalRole.client, phone)
        if not db.query(Client).filter(Client.user_id == user.id, Client.company_id == company.id).first():
            db.add(Client(company_id=company.id, user_id=user.id, name=full_name, email=email, phone=phone))
    db.commit()

    print("Seed complete.\n")
    print("Admin login:        admin@plated.com / Admin@1234")
    print("Company owner:      owner@grandregency.com / Owner@123")
    print("Employee (manager): rahul.chef@grandregency.com / Chef@123")
    print("Employee (staff):   suresh.service@grandregency.com / Staff@123")
    print("Client:              marco@plated.com / Seeker@123")

    owner_perms = sorted(effective_permissions(db, owner, company.id))
    print(f"\nOwner effective permissions ({len(owner_perms)}): {owner_perms}")


if __name__ == "__main__":
    main()
