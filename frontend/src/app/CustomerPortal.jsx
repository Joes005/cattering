import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/customer', label: 'Dashboard', icon: '📊', end: true },
  { to: '/customer/caterers', label: 'Explore Caterers', icon: '🍽️' },
  { to: '/customer/book', label: 'Request Catering', icon: '📅' },
  { to: '/customer/events', label: 'My Bookings', icon: '🎉' },
  { to: '/customer/invoices', label: 'Invoices & Payments', icon: '💳' },
  { to: '/customer/profile', label: 'My Profile', icon: '👤' },
];

export default function CustomerPortal() {
  const { user } = useAuth();

  return (
    <div className="flex h-screen bg-canvas">
      <Sidebar brand="Plated Catering Client" items={NAV_ITEMS} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={`Welcome, ${user?.full_name || 'Valued Customer'}`} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

