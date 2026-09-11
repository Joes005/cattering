import { useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';

export default function CompanyPortal() {
  const { hasPermission, currentMembership } = useAuth();

  const navItems = useMemo(
    () =>
      [
        { to: '/company', label: 'Dashboard', icon: '\u{1F4CA}', end: true, show: true },
        { to: '/company/events', label: 'Events', icon: '\u{1F4C5}', show: hasPermission('events.view') },
        { to: '/company/menus', label: 'Menus & Packages', icon: '\u{1F37D}\u{FE0F}', show: hasPermission('menus.view') },
        { to: '/company/clients', label: 'Clients', icon: '\u{1F465}', show: hasPermission('clients.view') },
        { to: '/company/employees', label: 'Employees', icon: '\u{1F9D1}‍\u{1F373}', show: hasPermission('employees.view') },
        { to: '/company/inventory', label: 'Inventory', icon: '\u{1F4E6}', show: hasPermission('inventory.view') },
        { to: '/company/reports', label: 'Reports', icon: '\u{1F4C8}', show: hasPermission('reports.view') },
        { to: '/company/audit-log', label: 'Audit Log', icon: '\u{1F4CB}', show: hasPermission('audit_logs.view') },
        { to: '/company/settings', label: 'Settings', icon: '\u{2699}\u{FE0F}', show: hasPermission('settings.view') },
      ].filter((item) => item.show),
    [hasPermission]
  );

  return (
    <div className="flex h-screen bg-canvas">
      <Sidebar brand={currentMembership?.company_name || 'Plated'} items={navItems} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={currentMembership?.company_name || 'Company'} companySwitcher />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
