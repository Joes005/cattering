import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function roleHome(role) {
  if (role === 'admin') return '/admin';
  if (role === 'company_user') return '/company';
  return '/client';
}

const FEATURES = [
  {
    icon: '🎉',
    title: 'For clients',
    description: 'Book an event in minutes, review a clear quotation, pay securely, and track everything from one page.',
  },
  {
    icon: '🍽️',
    title: 'For catering companies',
    description: 'Run enquiries, quotations, staffing, inventory, invoicing and reports without switching tools.',
  },
  {
    icon: '📋',
    title: 'For your team',
    description: "A mobile-friendly view of today's assignments, tasks, and check-in — nothing they don't need.",
  },
];

const STEPS = ['Enquiry', 'Quotation', 'Approval', 'Advance paid', 'Confirmed', 'Delivered'];

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
            <Link to={roleHome(user.global_role)} className="btn-primary">
              Go to dashboard
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login" className="btn-secondary">
                Log in
              </Link>
              <Link to="/signup" className="btn-primary">
                Book an event
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
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-medium text-brand-700 shadow-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              Catering event management
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight text-neutral-900 sm:text-6xl">
              Run every catered event
              <br />
              <span className="bg-brand-gradient bg-clip-text text-transparent">enquiry to invoice.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-neutral-500">
              Plated connects clients, catering companies, and their staff through one clear booking,
              staffing, and billing workflow.
            </p>
            <div className="mt-9 flex items-center justify-center gap-3">
              <Link to="/signup" className="btn-primary px-6 py-3 text-base">
                Book an event
              </Link>
              <Link to="/login" className="btn-secondary px-6 py-3 text-base">
                Log in
              </Link>
            </div>
            <p className="mt-5 text-sm text-neutral-500">
              Running a catering business?{' '}
              <Link to="/signup/company" className="font-medium text-brand-700 hover:underline">
                Register your company →
              </Link>
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-8">
          <div className="grid gap-5 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 text-xl">
                  {f.icon}
                </div>
                <h3 className="mt-4 text-base font-semibold text-neutral-900">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16">
          <div className="card overflow-x-auto p-6 sm:p-8">
            <p className="mb-6 text-sm font-medium text-neutral-500">The lifecycle, start to finish</p>
            <div className="flex min-w-[560px] items-center">
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
                    <span className="whitespace-nowrap text-xs font-medium text-neutral-600">{step}</span>
                  </div>
                  {i < STEPS.length - 1 && <div className="mx-2 h-px flex-1 bg-neutral-200" />}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-neutral-200/70 py-8 text-center text-sm text-neutral-400">
        Plated — catering event management, done properly.
      </footer>
    </div>
  );
}
