import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/NotificationBell';

export default function ClientPortal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-10 border-b border-neutral-200/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <NavLink to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-gradient text-sm font-bold text-white shadow-glow">
                P
              </div>
              <span className="text-base font-semibold tracking-tight text-neutral-900">Plated</span>
            </NavLink>
            <nav className="hidden gap-4 text-sm font-medium text-neutral-600 sm:flex">
              <NavLink to="/client" end className={({ isActive }) => (isActive ? 'text-brand-700' : 'hover:text-neutral-900')}>
                My events
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <NotificationBell />
            <span className="hidden text-neutral-500 sm:inline">Hi, {user?.full_name?.split(' ')[0]}</span>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="btn-secondary"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
