from datetime import datetime, timedelta, timezone
from app.core.security import hash_password
from app.db.database import SessionLocal
from app.models.models import (
    ApplicationStatus,
    AssignmentStatus,
    Attendance,
    AttendanceStatus,
    CateringRequirement,
    Company,
    CompanyStatus,
    Customer,
    EmployeeAssignment,
    EmployeeEarning,
    EmployeeProfile,
    Event,
    EventStatus,
    EventTask,
    Invoice,
    InvoiceItem,
    InvoiceStatus,
    JobApplication,
    JobPosting,
    JobPostingStatus,
    MenuCategory,
    MenuItem,
    MenuVegType,
    Package,
    PackageItem,
    Payment,
    PaymentStatus,
    PaymentType,
    PayoutStatus,
    PricingType,
    Quotation,
    QuotationItem,
    QuotationStatus,
    TaskPhase,
    TaskStatus,
    User,
    UserRole,
    UserStatus,
)

db = SessionLocal()


def get_or_create_user(full_name, email, password, role, phone="+91-98400-00000"):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            full_name=full_name,
            email=email,
            password_hash=hash_password(password),
            role=role,
            phone=phone,
            status=UserStatus.active,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user.role = role
        user.status = UserStatus.active
        db.commit()
    return user


def main():
    print("Seeding Plated 3-Role Architecture...")

    # 1. Admin
    admin = get_or_create_user("Priya Nathan", "admin@plated.com", "Admin@1234", UserRole.admin, "+91-98400-00001")

    # 2. Approved Employer & Company
    owner = get_or_create_user("Arun Kumar", "owner@grandregency.com", "Owner@123", UserRole.employer, "+91-98400-10001")
    company = db.query(Company).filter(Company.slug == "grand-regency-catering").first()
    if not company:
        company = Company(
            owner_id=owner.id,
            name="Grand Regency Catering",
            slug="grand-regency-catering",
            business_type="Full-Service Catering",
            business_address="12, Cathedral Road, Gopalapuram, Chennai, Tamil Nadu 600086",
            gst_number="33AAAAA0000A1Z5",
            description="Premium South & North Indian catering for weddings, corporate galas, and celebrations.",
            currency="INR",
            status=CompanyStatus.approved,
            approved_at=datetime.now(timezone.utc),
            approved_by=admin.id,
        )
        db.add(company)
        db.commit()
        db.refresh(company)
    else:
        company.owner_id = owner.id
        company.status = CompanyStatus.approved
        db.commit()

    # 3. Pending Employer for Admin Approval testing
    pending_owner = get_or_create_user("Vikramaditya Rao", "newcaterer@plated.com", "Caterer@123", UserRole.employer, "+91-98400-10099")
    pending_company = db.query(Company).filter(Company.slug == "spice-valley-catering").first()
    if not pending_company:
        pending_company = Company(
            owner_id=pending_owner.id,
            name="Spice Valley Catering",
            slug="spice-valley-catering",
            business_type="Boutique Catering",
            business_address="44, Race Course Road, Coimbatore, Tamil Nadu",
            gst_number="33BBBBB1111B2Z6",
            description="Authentic Kongu and Chettinad traditional banquets.",
            currency="INR",
            status=CompanyStatus.pending_approval,
        )
        db.add(pending_company)
        db.commit()

    # 4. Independent Employees (Workforce)
    staff_data = [
        ("Rahul Menon", "rahul.chef@grandregency.com", "Chef@123", ["Executive Chef", "Menu Planning", "Culinary"], 6.0, "+91-98400-10002", "Senior culinary chef with luxury hotel experience."),
        ("Suresh Babu", "suresh.service@grandregency.com", "Staff@123", ["Head Server", "Banquet Hospitality", "Table Setup"], 3.5, "+91-98400-10004", "Dedicated service captain with 100+ wedding events managed."),
        ("Divya Shree", "divya.kitchen@grandregency.com", "Staff@123", ["Kitchen Assistant", "Food Prep", "Hygiene"], 2.0, "+91-98400-10005", "Fast-paced kitchen prep and live counter support."),
        ("Kavitha Raj", "kavitha.ops@grandregency.com", "Ops@1234", ["Floor Manager", "Guest Relations", "Logistics"], 4.0, "+91-98400-10003", "Operations coordinator ensuring seamless buffet flows."),
    ]

    employee_profiles = {}
    for full_name, email, password, skills, exp, phone, bio in staff_data:
        u = get_or_create_user(full_name, email, password, UserRole.employee, phone)
        ep = db.query(EmployeeProfile).filter(EmployeeProfile.user_id == u.id).first()
        if not ep:
            ep = EmployeeProfile(
                user_id=u.id,
                location="Chennai, Tamil Nadu",
                skills=skills,
                work_experience_years=exp,
                preferred_work_type="flexible",
                availability_status="available",
                bio=bio,
                rating=4.9,
                total_completed_events=12,
            )
            db.add(ep)
            db.commit()
            db.refresh(ep)
        else:
            ep.skills = skills
            ep.work_experience_years = exp
            ep.bio = bio
            db.commit()
        employee_profiles[email] = ep

    # 5. Customers (Business records owned by Grand Regency Catering)
    customers_data = [
        ("Marco & Elena Rossi", "marco@plated.com", "+91-98400-20001", "Villa 4, ECR Beach Road, Chennai", "High profile wedding reception"),
        ("Infosys Chennai HR", "hr.events@infosys-demo.com", "+91-98400-20002", "Mahindra World City, Chengalpattu", "Annual leadership banquet"),
        ("Meera Krishnan", "meera.k@plated.com", "+91-98400-20003", "Anna Nagar West, Chennai", "Traditional engagement feast"),
    ]
    customer_records = {}
    for name, email, phone, addr, notes in customers_data:
        cust = db.query(Customer).filter(Customer.company_id == company.id, Customer.email == email).first()
        if not cust:
            cust = Customer(company_id=company.id, name=name, email=email, phone=phone, address=addr, notes=notes)
            db.add(cust)
            db.commit()
            db.refresh(cust)
        customer_records[email] = cust

    # 6. Menus & Packages for Grand Regency
    cat_starters = db.query(MenuCategory).filter(MenuCategory.company_id == company.id, MenuCategory.name == "Starters").first()
    if not cat_starters:
        cat_starters = MenuCategory(company_id=company.id, name="Starters", sort_order=1)
        db.add(cat_starters)
        db.commit()
        db.refresh(cat_starters)

    item1 = db.query(MenuItem).filter(MenuItem.company_id == company.id, MenuItem.name == "Paneer Tikka Royale").first()
    if not item1:
        item1 = MenuItem(
            company_id=company.id,
            category_id=cat_starters.id,
            name="Paneer Tikka Royale",
            description="Clay-oven roasted cottage cheese infused with saffron and spices.",
            veg_type=MenuVegType.veg,
            price=250.0,
        )
        db.add(item1)
        db.commit()
        db.refresh(item1)

    pkg = db.query(Package).filter(Package.company_id == company.id, Package.name == "Royal Heritage Banquet").first()
    if not pkg:
        pkg = Package(
            company_id=company.id,
            name="Royal Heritage Banquet",
            description="Grand 5-course wedding celebration menu.",
            pricing_type=PricingType.per_guest,
            price=1200.0,
            min_guests=100,
        )
        db.add(pkg)
        db.commit()
        db.refresh(pkg)

    # 7. Events for Grand Regency
    event1 = db.query(Event).filter(Event.company_id == company.id, Event.title == "Marco & Elena Wedding Reception").first()
    if not event1:
        event1 = Event(
            company_id=company.id,
            customer_id=customer_records["marco@plated.com"].id,
            created_by=owner.id,
            title="Marco & Elena Wedding Reception",
            event_type="Wedding",
            event_date=datetime.now(timezone.utc) + timedelta(days=5),
            start_time=datetime.now(timezone.utc).replace(hour=18, minute=30),
            end_time=datetime.now(timezone.utc).replace(hour=23, minute=0),
            guest_count=350,
            venue_name="Taj Fisherman's Cove Resort",
            venue_address="Covelong Beach, ECR, Chennai",
            catering_requirement=CateringRequirement.mixed,
            special_instructions="Live tandoor and dessert stations required.",
            status=EventStatus.confirmed,
        )
        db.add(event1)
        db.commit()
        db.refresh(event1)

    # 8. Workforce Marketplace: Job Postings
    jp1 = db.query(JobPosting).filter(JobPosting.event_id == event1.id, JobPosting.role_title == "Banquet Server").first()
    if not jp1:
        jp1 = JobPosting(
            company_id=company.id,
            event_id=event1.id,
            role_title="Banquet Server",
            description="Professional banquet service for luxury wedding reception. Black & white formal attire required.",
            required_count=6,
            filled_count=1,
            shift_start=event1.event_date.replace(hour=17, minute=0),
            shift_end=event1.event_date.replace(hour=23, minute=30),
            pay_rate=950.0,
            pay_type="fixed_shift",
            location="Taj Fisherman's Cove, ECR, Chennai",
            status=JobPostingStatus.open,
        )
        db.add(jp1)
        db.commit()
        db.refresh(jp1)

    jp2 = db.query(JobPosting).filter(JobPosting.event_id == event1.id, JobPosting.role_title == "Sous Chef").first()
    if not jp2:
        jp2 = JobPosting(
            company_id=company.id,
            event_id=event1.id,
            role_title="Sous Chef",
            description="Assisting Head Chef with live tandoor and main buffet execution.",
            required_count=2,
            filled_count=1,
            shift_start=event1.event_date.replace(hour=15, minute=0),
            shift_end=event1.event_date.replace(hour=23, minute=0),
            pay_rate=1800.0,
            pay_type="fixed_shift",
            location="Taj Fisherman's Cove, ECR, Chennai",
            status=JobPostingStatus.open,
        )
        db.add(jp2)
        db.commit()
        db.refresh(jp2)

    # 9. Marketplace Applications & Assignments
    suresh_prof = employee_profiles["suresh.service@grandregency.com"]
    app1 = db.query(JobApplication).filter(JobApplication.job_posting_id == jp1.id, JobApplication.employee_id == suresh_prof.id).first()
    if not app1:
        app1 = JobApplication(
            job_posting_id=jp1.id,
            employee_id=suresh_prof.id,
            cover_note="Available for evening banquet shift. Have worked at Fisherman's Cove previously.",
            status=ApplicationStatus.accepted,
            employer_notes="Accepted based on strong previous ratings.",
            applied_at=datetime.now(timezone.utc) - timedelta(days=2),
            reviewed_at=datetime.now(timezone.utc) - timedelta(days=1),
        )
        db.add(app1)
        db.commit()

    asg1 = db.query(EmployeeAssignment).filter(EmployeeAssignment.event_id == event1.id, EmployeeAssignment.employee_id == suresh_prof.id).first()
    if not asg1:
        asg1 = EmployeeAssignment(
            company_id=company.id,
            event_id=event1.id,
            job_posting_id=jp1.id,
            employee_id=suresh_prof.id,
            event_role="Banquet Server",
            shift_start=jp1.shift_start,
            shift_end=jp1.shift_end,
            agreed_pay=950.0,
            status=AssignmentStatus.confirmed,
            notes="Assigned to Main Hall Buffet Area",
        )
        db.add(asg1)
        db.commit()
        db.refresh(asg1)

        att1 = Attendance(
            assignment_id=asg1.id,
            check_in=jp1.shift_start,
            check_out=jp1.shift_end,
            hours_worked=6.5,
            status=AttendanceStatus.present,
            verified_by_employer=True,
            notes="Excellent guest feedback received.",
        )
        db.add(att1)

        earn1 = EmployeeEarning(
            assignment_id=asg1.id,
            employee_id=suresh_prof.id,
            company_id=company.id,
            amount=950.0,
            status=PayoutStatus.approved,
        )
        db.add(earn1)
        db.commit()

    # 10. Open application for testing
    divya_prof = employee_profiles["divya.kitchen@grandregency.com"]
    app2 = db.query(JobApplication).filter(JobApplication.job_posting_id == jp1.id, JobApplication.employee_id == divya_prof.id).first()
    if not app2:
        app2 = JobApplication(
            job_posting_id=jp1.id,
            employee_id=divya_prof.id,
            cover_note="Available for server and counter support.",
            status=ApplicationStatus.applied,
            applied_at=datetime.now(timezone.utc) - timedelta(hours=6),
        )
        db.add(app2)
        db.commit()

    # 11. Invoicing & Quotations
    q1 = db.query(Quotation).filter(Quotation.event_id == event1.id).first()
    if not q1:
        q1 = Quotation(
            event_id=event1.id,
            company_id=company.id,
            quote_number="QT-2026-001",
            status=QuotationStatus.accepted,
            subtotal=420000.0,
            discount=20000.0,
            tax_percent=5.0,
            service_charge=15000.0,
            delivery_charge=5000.0,
            advance_amount=150000.0,
            total=420000.0,
            created_by=owner.id,
        )
        db.add(q1)
        db.commit()
        db.refresh(q1)
        db.add(QuotationItem(quotation_id=q1.id, description="Royal Heritage Banquet (350 Guests)", quantity=350, unit_price=1200.0, line_total=420000.0))
        db.commit()

    inv1 = db.query(Invoice).filter(Invoice.event_id == event1.id).first()
    if not inv1:
        inv1 = Invoice(
            event_id=event1.id,
            company_id=company.id,
            invoice_number="INV-2026-001",
            status=InvoiceStatus.partially_paid,
            subtotal=400000.0,
            tax=20000.0,
            discount=0.0,
            total=420000.0,
            due_date=event1.event_date.date(),
        )
        db.add(inv1)
        db.commit()
        db.refresh(inv1)
        db.add(InvoiceItem(invoice_id=inv1.id, description="Catering Services for 350 Guests", quantity=350, rate=1200.0, amount=420000.0))
        db.add(Payment(invoice_id=inv1.id, event_id=event1.id, company_id=company.id, amount=150000.0, type=PaymentType.advance, status=PaymentStatus.paid))
        db.commit()

    print("\n✅ Seed complete for the 3-Role Architecture.")
    print("--------------------------------------------------")
    print("1. Platform Admin:     admin@plated.com / Admin@1234")
    print("2. Approved Employer:  owner@grandregency.com / Owner@123 (Grand Regency Catering)")
    print("3. Pending Employer:   newcaterer@plated.com / Caterer@123 (Spice Valley Catering)")
    print("4. Freelance Employee: suresh.service@grandregency.com / Staff@123 (Server)")
    print("5. Freelance Employee: rahul.chef@grandregency.com / Chef@123 (Chef)")
    print("--------------------------------------------------")


if __name__ == "__main__":
    main()
