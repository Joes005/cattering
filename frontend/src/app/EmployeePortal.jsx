import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';
import {
  DashboardIcon,
  SearchIcon,
  CalendarIcon,
  ClockIcon,
  CurrencyIcon,
  DocumentTextIcon,
  UsersIcon,
} from '../components/Icons';

const NAV_ITEMS = [
  { to: '/employee', label: 'Dashboard', icon: DashboardIcon, end: true },
  { to: '/employee/jobs', label: 'Find Catering Shifts', icon: SearchIcon },
  { to: '/employee/schedule', label: 'Work Schedule', icon: CalendarIcon },
  { to: '/employee/attendance', label: 'Digital Attendance', icon: ClockIcon },
  { to: '/employee/earnings', label: 'My Earnings', icon: CurrencyIcon },
  { to: '/employee/applications', label: 'My Applications', icon: DocumentTextIcon },
  { to: '/employee/profile', label: 'Workforce Profile', icon: UsersIcon },
];

export default function EmployeePortal() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 antialiased overflow-hidden">
      <Sidebar
        brand="Workforce Portal"
        items={NAV_ITEMS}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar
          title={`Staff: ${user?.full_name || 'Professional'}`}
          onToggleMobile={() => setMobileOpen((o) => !o)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
