import { useState, useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';
import {
  DashboardIcon,
  CalendarIcon,
  UsersIcon,
  StaffIcon,
  MenuIcon,
  PackageIcon,
  ChartBarIcon,
  SubscriptionIcon,
  SettingsIcon,
} from '../components/Icons';

export default function CompanyPortal() {
  const { company } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = useMemo(
    () => [
      { to: '/employer', label: 'Dashboard', icon: DashboardIcon, end: true },
      { to: '/employer/events', label: 'Events & Catering', icon: CalendarIcon },
      { to: '/employer/customers', label: 'Client CRM', icon: UsersIcon },
      { to: '/employer/workforce', label: 'Workforce Marketplace', icon: StaffIcon },
      { to: '/employer/menus', label: 'Menus & Packages', icon: MenuIcon },
      { to: '/employer/inventory', label: 'Equipment & Stock', icon: PackageIcon },
      { to: '/employer/reports', label: 'Financial Reports', icon: ChartBarIcon },
      { to: '/employer/subscription', label: 'SaaS Subscription', icon: SubscriptionIcon },
      { to: '/employer/settings', label: 'Business Settings', icon: SettingsIcon },
    ],
    []
  );

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 antialiased overflow-hidden">
      <Sidebar
        brand={company?.name || 'Catering Business'}
        items={navItems}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar
          title={company?.name || 'Employer Operations'}
          onToggleMobile={() => setMobileOpen((o) => !o)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
