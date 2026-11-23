import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ brand, items, mobileOpen = false, onCloseMobile = () => {} }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleLabels = {
    admin: 'Platform Admin',
    employer: 'Catering Owner',
    company_user: 'Catering Staff',
    employee: 'Workforce Pro',
    customer: 'Event Client',
  };

  const roleColors = {
    admin: 'bg-purple-100 text-purple-800',
    employer: 'bg-blue-100 text-blue-800',
    company_user: 'bg-blue-100 text-blue-800',
    employee: 'bg-emerald-100 text-emerald-800',
    customer: 'bg-amber-100 text-amber-800',
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-68 flex-col border-r border-slate-200/80 bg-white transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 font-black text-sm text-white shadow-xs">
              P
            </div>
            <div className="min-w-0 truncate">
              <span className="block truncate text-sm font-bold text-slate-900">{brand}</span>
              <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                {roleLabels[user?.role] || 'Plated Platform'}
              </span>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 md:hidden text-sm"
          >
            ✕
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
          {items.map((item) => {
            const Icon = typeof item.icon === 'function' ? item.icon : null;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `group relative flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                          isActive
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'
                        }`}
                      >
                        {Icon ? (
                          <Icon className="h-4 w-4" />
                        ) : (
                          <span className="text-sm">{item.icon}</span>
                        )}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className="rounded-full bg-emerald-600 px-1.5 py-0.2 text-[10px] font-bold text-white">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Profile Card & Sign Out */}
        <div className="border-t border-slate-100 p-3">
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 border border-slate-100">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-700 font-bold text-xs text-white uppercase">
                {user?.full_name?.[0] || 'U'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-slate-900">{user?.full_name || 'User'}</p>
                <span
                  className={`inline-block rounded px-1.5 py-0.2 text-[9px] font-semibold uppercase tracking-wider ${
                    roleColors[user?.role] || 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {user?.role || 'Guest'}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-rose-600 transition shadow-2xs"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
