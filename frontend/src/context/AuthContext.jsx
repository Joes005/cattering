import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null); // { user, memberships, permissions }
  const [currentCompanyId, setCurrentCompanyId] = useState(
    () => localStorage.getItem('currentCompanyId') || null
  );
  const [loading, setLoading] = useState(true);

  function applySession(data) {
    setSession(data);
    const firstCompanyId = data.memberships?.[0]?.company_id || null;
    setCurrentCompanyId((prev) => {
      const stillValid = data.memberships?.some((m) => m.company_id === prev);
      const next = stillValid ? prev : firstCompanyId;
      if (next) localStorage.setItem('currentCompanyId', next);
      else localStorage.removeItem('currentCompanyId');
      return next;
    });
  }

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me', true)
      .then(applySession)
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const data = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    applySession(data);
    return data;
  }

  async function signup(payload) {
    const data = await api.post('/auth/signup', payload);
    localStorage.setItem('token', data.token);
    applySession(data);
    return data;
  }

  async function signupCompany(payload) {
    const data = await api.post('/auth/company-signup', payload);
    localStorage.setItem('token', data.token);
    applySession(data);
    return data;
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('currentCompanyId');
    setSession(null);
    setCurrentCompanyId(null);
  }

  async function refresh() {
    const data = await api.get('/auth/me', true);
    applySession(data);
    return data;
  }

  const currentMembership = useMemo(
    () => session?.memberships?.find((m) => m.company_id === currentCompanyId) || null,
    [session, currentCompanyId]
  );

  const permissions = useMemo(() => {
    if (!session) return new Set();
    if (session.user.global_role === 'company_user') {
      return new Set(currentMembership?.permissions || []);
    }
    return new Set(session.permissions || []);
  }, [session, currentMembership]);

  function hasPermission(key) {
    return permissions.has(key);
  }

  const value = {
    user: session?.user || null,
    memberships: session?.memberships || [],
    currentCompanyId,
    currentMembership,
    setCurrentCompanyId: (id) => {
      localStorage.setItem('currentCompanyId', id);
      setCurrentCompanyId(id);
    },
    permissions,
    hasPermission,
    loading,
    login,
    signup,
    signupCompany,
    logout,
    refresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
