import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { adminApi } from '../api/adminApi';
import {
  DashboardIcon,
  BuildingIcon,
  UsersIcon,
  StaffIcon,
  SubscriptionIcon,
  CommissionIcon,
  TransactionIcon,
  DisputeIcon,
  SettingsIcon,
  AuditIcon,
} from '../components/Icons';

export default function AdminPortal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch pending items for badge counters
  const { data: stats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminApi.getStats,
    refetchInterval: 30000,
  });

  const pendingApprovalsCount = stats?.pending_employers || 0;
  const openDisputesCount = stats?.open_disputes || 0;

  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: DashboardIcon, end: true },
    {
      to: '/admin/companies',
      label: 'Catering Businesses',
      icon: BuildingIcon,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null,
      badgeColor: 'bg-amber-500 text-white',
    },
    { to: '/admin/users', label: 'Platform Users', icon: UsersIcon },
    { to: '/admin/employees', label: 'Workforce Roster', icon: StaffIcon },
    { to: '/admin/subscriptions', label: 'SaaS Subscriptions', icon: SubscriptionIcon },
    { to: '/admin/commissions', label: 'Commissions & Ledger', icon: CommissionIcon },
    { to: '/admin/transactions', label: 'Transactions', icon: TransactionIcon },
    {
      to: '/admin/disputes',
      label: 'Disputes & Support',
      icon: DisputeIcon,
      badge: openDisputesCount > 0 ? openDisputesCount : null,
      badgeColor: 'bg-rose-500 text-white',
    },
    { to: '/admin/settings', label: 'Global Settings', icon: SettingsIcon },
    { to: '/admin/audit-logs', label: 'Audit Logs', icon: AuditIcon },
  ];

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 antialiased overflow-hidden">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200/80 bg-white transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-sm shadow-sm ring-2 ring-emerald-500/20">
              P
            </div>
            <div>
              <span className="font-bold tracking-tight text-slate-900 text-base">PLATED</span>
              <span className="ml-1.5 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                Governance
              </span>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 md:hidden"
          >
            ✕
          </button>
        </div>

        {/* Super Admin Status Banner */}
        <div className="mx-4 mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-semibold tracking-wide uppercase text-emerald-800">
              Master Admin Console
            </span>
          </div>
          <p className="mt-1 text-[11px] text-emerald-700 leading-snug">
            Platform-wide governance across catering businesses, users & workforce.
          </p>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `group relative flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-emerald-50/80 text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                          isActive
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-800'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold leading-tight ${item.badgeColor}`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Admin User Footer Profile Card */}
        <div className="border-t border-slate-100 p-3">
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-700 font-bold text-xs text-white uppercase">
                {user?.full_name?.[0] || 'A'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-slate-900">{user?.full_name || 'Platform Administrator'}</p>
                <p className="truncate text-[10px] text-slate-500 font-mono">{user?.email || 'admin@plated.com'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-rose-600 transition shadow-2xs"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md md:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Governance Portal</span>
              <span className="text-slate-300">/</span>
              <h1 className="text-sm font-bold text-slate-900">Platform Command Suite</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span className="text-[11px] font-semibold text-slate-600">Database & API Live</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-emerald-100/70 px-2.5 py-1 text-xs font-bold text-emerald-800">
                Super Admin
              </span>
            </div>
          </div>
        </header>

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
