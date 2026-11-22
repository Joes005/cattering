import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function roleHome(role) {
  if (role === 'admin') return '/admin';
  if (role === 'employer' || role === 'company_user') return '/employer';
  if (role === 'employee') return '/employee';
  if (role === 'customer') return '/customer';
  return '/login';
}

export function RequireAuth({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoading />;
  if (!user) {
    if (location.pathname.startsWith('/admin')) {
      return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }
    if (location.pathname.startsWith('/employer')) {
      return <Navigate to="/employer/login" state={{ from: location }} replace />;
    }
    if (location.pathname.startsWith('/employee')) {
      return <Navigate to="/employee/login" state={{ from: location }} replace />;
    }
    if (location.pathname.startsWith('/customer')) {
      return <Navigate to="/customer/login" state={{ from: location }} replace />;
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userRole = user.role || user.global_role;
  // Map legacy role name for compatibility
  const normalizedUserRole = userRole === 'company_user' ? 'employer' : userRole;

  if (roles) {
    const normalizedAllowedRoles = roles.map((r) => (r === 'company_user' ? 'employer' : r));
    if (!normalizedAllowedRoles.includes(normalizedUserRole)) {
      return <Navigate to={roleHome(normalizedUserRole)} replace />;
    }
  }

  return children;
}

export function RequirePermission({ permission, children, fallback = null }) {
  const { hasPermission, loading } = useAuth();

  if (loading) return <FullPageLoading />;
  if (!hasPermission(permission)) return fallback;

  return children;
}

export function FullPageLoading() {
  return (
    <div className="flex h-screen items-center justify-center text-sm font-medium text-neutral-500">
      <div className="flex items-center gap-2">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        Loading Plated…
      </div>
    </div>
  );
}
