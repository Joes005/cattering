import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: '\u{1F4CA}', end: true },
  { to: '/admin/companies', label: 'Companies', icon: '\u{1F3E2}' },
  { to: '/admin/users', label: 'Users', icon: '\u{1F465}' },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: '\u{1F4CB}' },
];

export default function AdminPortal() {
  return (
    <div className="flex h-screen bg-canvas">
      <Sidebar brand="Plated Admin" items={NAV_ITEMS} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title="Platform administration" />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
