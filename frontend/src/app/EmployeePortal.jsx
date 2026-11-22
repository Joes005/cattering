import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/employee', label: 'Dashboard', icon: '📊', end: true },
  { to: '/employee/jobs', label: 'Find Catering Shifts', icon: '🔍' },
  { to: '/employee/schedule', label: 'My Schedule', icon: '📅' },
  { to: '/employee/attendance', label: 'Digital Attendance', icon: '⏱️' },
  { to: '/employee/earnings', label: 'My Earnings', icon: '💰' },
  { to: '/employee/applications', label: 'Applications', icon: '📝' },
  { to: '/employee/profile', label: 'Workforce Profile', icon: '👤' },
];

export default function EmployeePortal() {
  const { user } = useAuth();

  return (
    <div className="flex h-screen bg-canvas">
      <Sidebar brand="Plated Workforce" items={NAV_ITEMS} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={`Welcome, ${user?.full_name || 'Staff'}`} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

