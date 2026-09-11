import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function RequireAuth({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoading />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.global_role)) return <Navigate to="/" replace />;

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
    <div className="flex h-screen items-center justify-center text-sm text-neutral-500">
      Loading…
    </div>
  );
}
