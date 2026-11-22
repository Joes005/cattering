import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';
import { companiesApi } from '../api/companies';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [currentCompanyId, setCurrentCompanyIdState] = useState(
    () => localStorage.getItem('currentCompanyId') || null
  );
  const [loading, setLoading] = useState(true);

  function setCurrentCompanyId(id) {
    setCurrentCompanyIdState(id);
    if (id) {
      localStorage.setItem('currentCompanyId', id);
    } else {
      localStorage.removeItem('currentCompanyId');
    }
  }

  function applyUser(userData) {
    if (!userData) {
      setUser(null);
      setCompanies([]);
      setCurrentCompanyId(null);
      return;
    }

    // Ensure backwards compatibility for legacy checks
    const patchedUser = {
      ...userData,
      global_role: userData.role,
    };
    setUser(patchedUser);

    const userCompanies = userData.companies || (userData.company ? [userData.company] : []);
    setCompanies(userCompanies);

    const savedCompanyId = localStorage.getItem('currentCompanyId');
    const isValidSaved = userCompanies.some((c) => c.id === savedCompanyId);

    if (isValidSaved) {
      setCurrentCompanyId(savedCompanyId);
    } else if (userCompanies.length > 0) {
      setCurrentCompanyId(userCompanies[0].id);
    } else {
      setCurrentCompanyId(null);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me', true)
      .then(applyUser)
      .catch(() => {
        localStorage.removeItem('token');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function loginWithToken(token, userPayload) {
    localStorage.setItem('token', token);
    applyUser(userPayload);
    return userPayload;
  }

  // Unified login (detects role automatically)
  async function login(email, password) {
    const data = await api.post('/auth/login', { email, password });
    return loginWithToken(data.access_token || data.token, data.user);
  }

  // Admin dedicated login
  async function loginAdmin(email, password) {
    const data = await api.post('/auth/admin/login', { email, password });
    return loginWithToken(data.access_token || data.token, data.user);
  }

  // Employer dedicated login & registration
  async function loginEmployer(email, password) {
    const data = await api.post('/auth/employer/login', { email, password });
    return loginWithToken(data.access_token || data.token, data.user);
  }

  async function registerEmployer(payload) {
    const data = await api.post('/auth/employer/register', payload);
    return loginWithToken(data.access_token || data.token, data.user);
  }

  // Register additional catering business under same employer
  async function registerAdditionalBusiness(payload) {
    const newCompany = await companiesApi.create(payload);
    setCompanies((prev) => [newCompany, ...prev]);
    setCurrentCompanyId(newCompany.id);
    return newCompany;
  }

  async function refreshBusinesses() {
    try {
      const list = await companiesApi.getMyBusinesses();
      setCompanies(list);
      return list;
    } catch {
      return [];
    }
  }

  // Employee dedicated login & registration
  async function loginEmployee(email, password) {
    const data = await api.post('/auth/employee/login', { email, password });
    return loginWithToken(data.access_token || data.token, data.user);
  }

  async function registerEmployee(payload) {
    const data = await api.post('/auth/employee/register', payload);
    return loginWithToken(data.access_token || data.token, data.user);
  }

  // Customer dedicated login & registration
  async function loginCustomer(email, password) {
    const data = await api.post('/auth/customer/login', { email, password });
    return loginWithToken(data.access_token || data.token, data.user);
  }

  async function registerCustomer(payload) {
    const data = await api.post('/auth/customer/register', payload);
    return loginWithToken(data.access_token || data.token, data.user);
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('currentCompanyId');
    setUser(null);
    setCompanies([]);
    setCurrentCompanyId(null);
  }

  async function refresh() {
    const userData = await api.get('/auth/me', true);
    applyUser(userData);
    return userData;
  }

  // In the clean 3-role architecture, employers own company features
  function hasPermission(_permKey) {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'employer') return true;
    return false;
  }

  const activeCompany = companies.find((c) => c.id === currentCompanyId) || user?.company || null;

  const memberships = companies.map((c) => ({
    company_id: c.id,
    company_name: c.name,
    role: 'owner',
    status: c.status,
  }));

  const currentMembership = memberships.find((m) => m.company_id === currentCompanyId) || memberships[0] || null;

  const value = {
    user,
    company: activeCompany,
    companies,
    employeeProfile: user?.employee_profile || null,
    customerProfile: user?.customer_profile || null,
    memberships,
    currentCompanyId,
    currentMembership,
    setCurrentCompanyId,
    registerAdditionalBusiness,
    refreshBusinesses,
    hasPermission,
    loading,
    login,
    loginAdmin,
    loginEmployer,
    registerEmployer,
    loginEmployee,
    registerEmployee,
    loginCustomer,
    registerCustomer,
    logout,
    refresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
