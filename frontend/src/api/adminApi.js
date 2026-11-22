import { api } from './client';

export const adminApi = {
  // Analytics & Dashboard
  getStats: () => api.get('/admin/stats', true),
  getRevenueChart: () => api.get('/admin/charts/revenue', true),
  getEventsChart: () => api.get('/admin/charts/events', true),

  // Employers & Businesses
  listEmployers: (status = null) =>
    api.get(status && status !== 'all' ? `/admin/employers?status=${status}` : '/admin/employers', true),
  getEmployer: (companyId) => api.get(`/admin/employers/${companyId}`, true),
  approveEmployer: (companyId) =>
    api.patch(`/admin/employers/${companyId}/approval`, { status: 'approved' }, true),
  rejectEmployer: (companyId, reason = '') =>
    api.patch(`/admin/employers/${companyId}/approval`, { status: 'rejected', rejection_reason: reason }, true),
  suspendEmployer: (companyId) =>
    api.patch(`/admin/employers/${companyId}/status`, { status: 'suspended' }, true),
  activateEmployer: (companyId) =>
    api.patch(`/admin/employers/${companyId}/status`, { status: 'approved' }, true),

  // Users (All 4 roles)
  listUsers: (role = null, status = null, search = '') => {
    const params = new URLSearchParams();
    if (role && role !== 'all') params.append('role', role);
    if (status && status !== 'all') params.append('status', status);
    if (search) params.append('search', search);
    const qs = params.toString();
    return api.get(qs ? `/admin/users?${qs}` : '/admin/users', true);
  },
  setUserStatus: (userId, status) =>
    api.patch(`/admin/users/${userId}/status`, { status }, true),

  // Workforce / Employees
  listEmployees: () => api.get('/admin/employees', true),
  suspendEmployee: (userId) =>
    api.patch(`/admin/employees/${userId}/status`, { status: 'suspended' }, true),
  activateEmployee: (userId) =>
    api.patch(`/admin/employees/${userId}/status`, { status: 'active' }, true),

  // SaaS Subscriptions
  listSubscriptionPlans: () => api.get('/admin/subscriptions/plans', true),
  createSubscriptionPlan: (payload) => api.post('/admin/subscriptions/plans', payload, true),
  updateSubscriptionPlan: (planId, payload) => api.patch(`/admin/subscriptions/plans/${planId}`, payload, true),
  listSubscriptions: (status = null) =>
    api.get(status && status !== 'all' ? `/admin/subscriptions?status_filter=${status}` : '/admin/subscriptions', true),
  overrideSubscription: (payload) => api.post('/admin/subscriptions/override', payload, true),

  // Marketplace Commissions
  listCommissionRules: () => api.get('/admin/commissions/rules', true),
  createCommissionRule: (payload) => api.post('/admin/commissions/rules', payload, true),
  updateCommissionRule: (ruleId, payload) => api.patch(`/admin/commissions/rules/${ruleId}`, payload, true),
  listCommissionLedger: (settled = null) =>
    api.get(settled !== null ? `/admin/commissions/ledger?settled=${settled}` : '/admin/commissions/ledger', true),
  settleCommission: (ledgerId) => api.post(`/admin/commissions/settle/${ledgerId}`, undefined, true),

  // Transactions & Financials
  listTransactions: (type = null, status = null) => {
    const params = new URLSearchParams();
    if (type && type !== 'all') params.append('transaction_type', type);
    if (status && status !== 'all') params.append('status', status);
    const qs = params.toString();
    return api.get(qs ? `/admin/transactions?${qs}` : '/admin/transactions', true);
  },
  refundTransaction: (transactionId) => api.post(`/admin/transactions/${transactionId}/refund`, undefined, true),

  // Disputes & Arbitration
  listDisputes: (status = null) =>
    api.get(status && status !== 'all' ? `/admin/disputes?status=${status}` : '/admin/disputes', true),
  getDispute: (disputeId) => api.get(`/admin/disputes/${disputeId}`, true),
  postDisputeMessage: (disputeId, payload) => api.post(`/admin/disputes/${disputeId}/messages`, payload, true),
  resolveDispute: (disputeId, payload) => api.patch(`/admin/disputes/${disputeId}/resolve`, payload, true),

  // Platform Settings & Governance
  listPlatformSettings: () => api.get('/admin/settings', true),
  updatePlatformSetting: (key, value, description) =>
    api.patch(`/admin/settings/${key}`, { value, description }, true),

  // Events & Audit Logs
  listEvents: () => api.get('/admin/events', true),
  listAuditLogs: () => api.get('/admin/audit-logs', true),
};

export const adminUsersApi = {
  list: () => adminApi.listEmployees(),
  suspend: (userId) => adminApi.suspendEmployee(userId),
  activate: (userId) => adminApi.activateEmployee(userId),
};
