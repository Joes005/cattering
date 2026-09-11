import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

export default function Topbar({ title, companySwitcher = false }) {
  const { user, memberships, currentCompanyId, setCurrentCompanyId, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-neutral-200/70 bg-white/80 px-4 backdrop-blur-md md:px-6">
      <h1 className="text-lg font-semibold tracking-tight text-neutral-900">{title}</h1>

      <div className="flex items-center gap-3">
        {companySwitcher && memberships.length > 1 && (
          <select
            className="input w-auto text-sm"
            value={currentCompanyId || ''}
            onChange={(e) => setCurrentCompanyId(e.target.value)}
          >
            {memberships.map((m) => (
              <option key={m.company_id} value={m.company_id}>
                {m.company_name}
              </option>
            ))}
          </select>
        )}

        <NotificationBell />

        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-full border border-neutral-200 py-1 pl-1 pr-3 text-sm hover:bg-neutral-50"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-gradient text-xs font-semibold text-white">
              {user?.full_name?.[0]?.toUpperCase() || '?'}
            </span>
            <span className="hidden text-neutral-700 sm:inline">{user?.full_name}</span>
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-10 mt-2 w-44 rounded-xl border border-neutral-200 bg-white py-1 shadow-card-hover">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/account');
                }}
                className="block w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
              >
                Account settings
              </button>
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
