import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { roleHome } from '../router/guards';

const FEATURES = [
  {
    icon: '🏢',
    title: 'For Catering Employers',
    description:
      'Manage customers, itemized quotations, event schedules, menus, inventory, and hire verified staff directly from the marketplace.',
    link: '/register/employer',
    linkText: 'Register your business →',
  },
  {
    icon: '🧑‍🍳',
    title: 'For Catering Workforce',
    description:
      'Browse catering shifts across multiple employers, apply instantly, check in digitally, and receive verified earnings on time.',
    link: '/register/employee',
    linkText: 'Join the workforce →',
  },
  {
    icon: '✨',
    title: 'For Event Customers',
    description:
      'Browse verified catering teams, request customized menus, review transparent itemized quotations, and pay milestones securely.',
    link: '/register/customer',
    linkText: 'Book a caterer →',
  },
  {
    icon: '🛡️',
    title: 'Platform Administration',
    description:
      'Full multi-tenant governance, employer verification & approval, workforce oversight, platform events, and audit logging.',
    link: '/admin',
    linkText: 'Admin portal →',
  },
];

const STEPS = ['Customer Enquiry', 'Itemized Quotation', 'Staff Marketplace Hiring', 'Event Execution', 'Digital Attendance', 'Invoice & Payouts'];

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-10 border-b border-neutral-200/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-gradient text-sm font-bold text-white shadow-glow">
              P
            </div>
            <span className="text-base font-semibold tracking-tight text-neutral-900">Plated</span>
          </div>
          {user ? (
            <Link to={roleHome(user.role || user.global_role)} className="btn-primary">
              Go to Dashboard
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login" className="btn-secondary">
                Log in
              </Link>
              <Link to="/register/employer" className="btn-primary">
                Register Business
              </Link>
            </div>
          )}
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-brand-radial" />
          <div
            className="pointer-events-none absolute -top-24 right-[-10%] h-80 w-80 rounded-full bg-brand-200/40 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-32 left-[-5%] h-72 w-72 rounded-full bg-brand-100/60 blur-3xl"
            aria-hidden
          />

          <div className="relative mx-auto max-w-3xl px-4 py-24 text-center sm:py-28">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-3.5 py-1 text-xs font-semibold text-brand-700 shadow-soft">
              <span className="h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
              Multi-Tenant Catering OS & Workforce Marketplace
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight text-neutral-900 sm:text-6xl">
              Catering business operations &
              <br />
              <span className="bg-brand-gradient bg-clip-text text-transparent">workforce marketplace.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-neutral-600">
              One unified platform built strictly for Catering Businesses, Independent Catering Staff, Event Customers, and Platform Administrators.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link to="/register/employer" className="btn-primary px-6 py-3 text-base shadow-glow">
                Register as Catering Employer
              </Link>
              <Link to="/register/employee" className="btn-secondary px-6 py-3 text-base border-emerald-300 text-emerald-800 hover:bg-emerald-50">
                Join as Catering Workforce
              </Link>
              <Link to="/register/customer" className="btn-secondary px-6 py-3 text-base border-indigo-300 text-indigo-800 hover:bg-indigo-50">
                Book Catering as Customer
              </Link>
              <Link to="/login" className="rounded-xl px-5 py-3 text-sm font-medium text-neutral-600 hover:text-neutral-900">
                Sign In →
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-12">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-6 flex flex-col justify-between hover:shadow-card-hover transition">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 text-2xl">
                    {f.icon}
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-neutral-900">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-500">{f.description}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-neutral-100">
                  <Link to={f.link} className="text-xs font-semibold text-brand-700 hover:underline">
                    {f.linkText}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16">
          <div className="card overflow-x-auto p-6 sm:p-8">
            <p className="mb-6 text-sm font-semibold uppercase tracking-wider text-neutral-500">
              The Complete Catering & Staffing Lifecycle
            </p>
            <div className="flex min-w-[620px] items-center">
              {STEPS.map((step, i) => (
                <div key={step} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ${
                        i === 0 ? 'bg-brand-gradient text-white shadow-glow' : 'bg-brand-50 text-brand-700'
                      }`}
                    >
                      {i + 1}
                    </div>
                    <span className="whitespace-nowrap text-xs font-medium text-neutral-700">{step}</span>
                  </div>
                  {i < STEPS.length - 1 && <div className="mx-2 h-px flex-1 bg-neutral-200" />}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-neutral-200/70 py-8 text-center text-sm text-neutral-400">
        Plated — Multi-Tenant Catering Business Management & Workforce Marketplace.
      </footer>
    </div>
  );
}
