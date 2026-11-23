import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';
import {
  DashboardIcon,
  BuildingIcon,
  CalendarIcon,
  SparklesIcon,
  CurrencyIcon,
  UsersIcon,
} from '../components/Icons';

const NAV_ITEMS = [
  { to: '/customer', label: 'Dashboard', icon: DashboardIcon, end: true },
  { to: '/customer/caterers', label: 'Explore Caterers', icon: BuildingIcon },
  { to: '/customer/book', label: 'Request Catering', icon: SparklesIcon },
  { to: '/customer/events', label: 'My Bookings', icon: CalendarIcon },
  { to: '/customer/invoices', label: 'Invoices & Payments', icon: CurrencyIcon },
  { to: '/customer/profile', label: 'My Client Profile', icon: UsersIcon },
];

export default function CustomerPortal() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 antialiased overflow-hidden">
      <Sidebar
        brand="Plated Client"
        items={NAV_ITEMS}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar
          title={`Welcome, ${user?.full_name || 'Client'}`}
          onToggleMobile={() => setMobileOpen((o) => !o)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
