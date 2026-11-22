import { useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';

export default function CompanyPortal() {
  const { company } = useAuth();

  const navItems = useMemo(
    () => [
      { to: '/employer', label: 'Dashboard', icon: '📊', end: true },
      { to: '/employer/events', label: 'Events', icon: '📅' },
      { to: '/employer/customers', label: 'Customers', icon: '👥' },
      { to: '/employer/workforce', label: 'Workforce Marketplace', icon: '🧑‍🍳' },
      { to: '/employer/menus', label: 'Menus & Packages', icon: '🍽️' },
      { to: '/employer/inventory', label: 'Inventory', icon: '📦' },
      { to: '/employer/reports', label: 'Reports', icon: '📈' },
      { to: '/employer/subscription', label: 'SaaS Subscription', icon: '💳' },
      { to: '/employer/settings', label: 'Settings', icon: '⚙️' },
    ],
    []
  );

  return (
    <div className="flex h-screen bg-canvas">
      <Sidebar brand={company?.name || 'Catering Employer'} items={navItems} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={company?.name || 'Employer Portal'} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
