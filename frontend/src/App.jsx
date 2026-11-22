import { Routes, Route, Navigate } from 'react-router-dom';
import { RequireAuth } from './router/guards';

import AdminPortal from './app/AdminPortal';
import CompanyPortal from './app/CompanyPortal';
import EmployeePortal from './app/EmployeePortal';
import CustomerPortal from './app/CustomerPortal';

import Home from './pages/Home';
import Login from './pages/Login';
import AdminLogin from './pages/admin/AdminLogin';
import EmployerLogin from './pages/employer/EmployerLogin';
import EmployerRegister from './pages/employer/EmployerRegister';
import EmployeeLogin from './pages/employee/EmployeeLogin';
import EmployeeRegister from './pages/employee/EmployeeRegister';
import CustomerLogin from './pages/customer/CustomerLogin';
import CustomerRegister from './pages/customer/CustomerRegister';
import Signup from './pages/Signup';
import CompanySignup from './pages/CompanySignup';
import Account from './pages/Account';
import NotFound from './pages/NotFound';

import AdminDashboard from './pages/admin/Dashboard';
import AdminCompanies from './pages/admin/Companies';
import AdminUsers from './pages/admin/Users';
import AdminEmployees from './pages/admin/Employees';
import AdminSubscriptions from './pages/admin/Subscriptions';
import AdminCommissions from './pages/admin/Commissions';
import AdminTransactions from './pages/admin/Transactions';
import AdminDisputes from './pages/admin/Disputes';
import AdminSettings from './pages/admin/Settings';
import AdminAuditLogs from './pages/admin/AuditLogs';

import CompanyDashboard from './pages/company/Dashboard';
import CompanyCustomers from './pages/company/Customers';
import CompanyEmployees from './pages/company/Employees';
import CompanySettings from './pages/company/Settings';
import CompanyEvents from './pages/company/Events';
import CompanyEventDetail from './pages/company/EventDetail';
import CompanyMenusPackages from './pages/company/MenusPackages';
import CompanyInventory from './pages/company/Inventory';
import CompanyReports from './pages/company/Reports';
import CompanyAuditLogs from './pages/company/AuditLogs';
import CompanySubscription from './pages/company/Subscription';

import EmployeeDashboard from './pages/employee/Dashboard';
import EmployeeJobs from './pages/employee/Jobs';
import EmployeeSchedule from './pages/employee/Schedule';
import EmployeeAttendance from './pages/employee/Attendance';
import EmployeeEarnings from './pages/employee/Earnings';
import EmployeeApplications from './pages/employee/Applications';
import EmployeeProfile from './pages/employee/Profile';

import CustomerDashboard from './pages/customer/Dashboard';
import CustomerCaterers from './pages/customer/Caterers';
import CustomerBookEvent from './pages/customer/BookEvent';
import CustomerEvents from './pages/customer/Events';
import CustomerEventDetail from './pages/customer/EventDetail';
import CustomerInvoices from './pages/customer/Invoices';
import CustomerProfile from './pages/customer/Profile';

export default function App() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/employer/login" element={<EmployerLogin />} />
      <Route path="/register/employer" element={<EmployerRegister />} />
      <Route path="/employee/login" element={<EmployeeLogin />} />
      <Route path="/register/employee" element={<EmployeeRegister />} />
      <Route path="/customer/login" element={<CustomerLogin />} />
      <Route path="/register/customer" element={<CustomerRegister />} />

      {/* Legacy URL redirects */}
      <Route path="/signup" element={<Signup />} />
      <Route path="/signup/company" element={<CompanySignup />} />

      {/* Authenticated Account Page */}
      <Route
        path="/account"
        element={
          <RequireAuth>
            <div className="mx-auto max-w-2xl px-4 py-10">
              <Account />
            </div>
          </RequireAuth>
        }
      />

      {/* ROLE 1: ADMIN PORTAL */}
      <Route
        path="/admin"
        element={
          <RequireAuth roles={['admin']}>
            <AdminPortal />
          </RequireAuth>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="companies" element={<AdminCompanies />} />
        <Route path="employers" element={<AdminCompanies />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="employees" element={<AdminEmployees />} />
        <Route path="subscriptions" element={<AdminSubscriptions />} />
        <Route path="commissions" element={<AdminCommissions />} />
        <Route path="transactions" element={<AdminTransactions />} />
        <Route path="disputes" element={<AdminDisputes />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="audit-logs" element={<AdminAuditLogs />} />
      </Route>

      {/* ROLE 2: EMPLOYER PORTAL */}
      <Route
        path="/employer"
        element={
          <RequireAuth roles={['employer', 'company_user']}>
            <CompanyPortal />
          </RequireAuth>
        }
      >
        <Route index element={<CompanyDashboard />} />
        <Route path="events" element={<CompanyEvents />} />
        <Route path="events/:eventId" element={<CompanyEventDetail />} />
        <Route path="customers" element={<CompanyCustomers />} />
        <Route path="clients" element={<CompanyCustomers />} />
        <Route path="workforce" element={<CompanyEmployees />} />
        <Route path="employees" element={<CompanyEmployees />} />
        <Route path="menus" element={<CompanyMenusPackages />} />
        <Route path="inventory" element={<CompanyInventory />} />
        <Route path="reports" element={<CompanyReports />} />
        <Route path="subscription" element={<CompanySubscription />} />
        <Route path="audit-log" element={<CompanyAuditLogs />} />
        <Route path="settings" element={<CompanySettings />} />
      </Route>

      {/* Backward-compatible /company alias for employer */}
      <Route path="/company/*" element={<Navigate to="/employer" replace />} />

      {/* ROLE 3: EMPLOYEE PORTAL */}
      <Route
        path="/employee"
        element={
          <RequireAuth roles={['employee']}>
            <EmployeePortal />
          </RequireAuth>
        }
      >
        <Route index element={<EmployeeDashboard />} />
        <Route path="jobs" element={<EmployeeJobs />} />
        <Route path="schedule" element={<EmployeeSchedule />} />
        <Route path="attendance" element={<EmployeeAttendance />} />
        <Route path="earnings" element={<EmployeeEarnings />} />
        <Route path="applications" element={<EmployeeApplications />} />
        <Route path="profile" element={<EmployeeProfile />} />
      </Route>

      {/* ROLE 4: CUSTOMER PORTAL */}
      <Route
        path="/customer"
        element={
          <RequireAuth roles={['customer']}>
            <CustomerPortal />
          </RequireAuth>
        }
      >
        <Route index element={<CustomerDashboard />} />
        <Route path="caterers" element={<CustomerCaterers />} />
        <Route path="book" element={<CustomerBookEvent />} />
        <Route path="events" element={<CustomerEvents />} />
        <Route path="events/:eventId" element={<CustomerEventDetail />} />
        <Route path="invoices" element={<CustomerInvoices />} />
        <Route path="profile" element={<CustomerProfile />} />
      </Route>

      {/* Legacy client portal redirects */}
      <Route path="/client/*" element={<Navigate to="/customer" replace />} />

      {/* 404 Fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
