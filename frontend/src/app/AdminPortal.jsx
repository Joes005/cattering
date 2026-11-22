import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: '📊', end: true },
  { to: '/admin/companies', label: 'Catering Businesses', icon: '🏢' },
  { to: '/admin/users', label: 'Platform Users', icon: '👥' },
  { to: '/admin/employees', label: 'Workforce Roster', icon: '🧑‍🍳' },
  { to: '/admin/subscriptions', label: 'SaaS Subscriptions', icon: '💳' },
  { to: '/admin/commissions', label: 'Commissions', icon: '📈' },
  { to: '/admin/transactions', label: 'Transactions', icon: '💰' },
  { to: '/admin/disputes', label: 'Disputes & Support', icon: '⚖️' },
  { to: '/admin/settings', label: 'Global Settings', icon: '⚙️' },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: '📋' },
];

export default function AdminPortal() {
  return (
    <div className="flex h-screen bg-canvas">
      <Sidebar brand="Plated Admin" items={NAV_ITEMS} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title="Plated Platform Administration" />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
