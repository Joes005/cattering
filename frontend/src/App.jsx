import { Routes, Route, Navigate } from 'react-router-dom';
import { RequireAuth, RequirePermission } from './router/guards';

import AdminPortal from './app/AdminPortal';
import CompanyPortal from './app/CompanyPortal';
import ClientPortal from './app/ClientPortal';

import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import CompanySignup from './pages/CompanySignup';
import Account from './pages/Account';
import NotFound from './pages/NotFound';

import AdminDashboard from './pages/admin/Dashboard';
import AdminCompanies from './pages/admin/Companies';
import AdminUsers from './pages/admin/Users';
import AdminAuditLogs from './pages/admin/AuditLogs';

import CompanyDashboard from './pages/company/Dashboard';
import CompanyClients from './pages/company/Clients';
import CompanyEmployees from './pages/company/Employees';
import CompanySettings from './pages/company/Settings';
import CompanyEvents from './pages/company/Events';
import CompanyEventDetail from './pages/company/EventDetail';
import CompanyMenusPackages from './pages/company/MenusPackages';
import CompanyInventory from './pages/company/Inventory';
import CompanyReports from './pages/company/Reports';
import CompanyAuditLogs from './pages/company/AuditLogs';

import ClientDashboard from './pages/client/Dashboard';
import BookEvent from './pages/client/BookEvent';
import ClientEventDetail from './pages/client/EventDetail';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/signup/company" element={<CompanySignup />} />

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
        <Route path="users" element={<AdminUsers />} />
        <Route path="audit-logs" element={<AdminAuditLogs />} />
      </Route>

      <Route
        path="/company"
        element={
          <RequireAuth roles={['company_user']}>
            <CompanyPortal />
          </RequireAuth>
        }
      >
        <Route index element={<CompanyDashboard />} />
        <Route
          path="events"
          element={
            <RequirePermission permission="events.view" fallback={<Navigate to="/company" replace />}>
              <CompanyEvents />
            </RequirePermission>
          }
        />
        <Route
          path="events/:eventId"
          element={
            <RequirePermission permission="events.view" fallback={<Navigate to="/company" replace />}>
              <CompanyEventDetail />
            </RequirePermission>
          }
        />
        <Route
          path="menus"
          element={
            <RequirePermission permission="menus.view" fallback={<Navigate to="/company" replace />}>
              <CompanyMenusPackages />
            </RequirePermission>
          }
        />
        <Route
          path="clients"
          element={
            <RequirePermission permission="clients.view" fallback={<Navigate to="/company" replace />}>
              <CompanyClients />
            </RequirePermission>
          }
        />
        <Route
          path="employees"
          element={
            <RequirePermission permission="employees.view" fallback={<Navigate to="/company" replace />}>
              <CompanyEmployees />
            </RequirePermission>
          }
        />
        <Route
          path="inventory"
          element={
            <RequirePermission permission="inventory.view" fallback={<Navigate to="/company" replace />}>
              <CompanyInventory />
            </RequirePermission>
          }
        />
        <Route
          path="reports"
          element={
            <RequirePermission permission="reports.view" fallback={<Navigate to="/company" replace />}>
              <CompanyReports />
            </RequirePermission>
          }
        />
        <Route
          path="audit-log"
          element={
            <RequirePermission permission="audit_logs.view" fallback={<Navigate to="/company" replace />}>
              <CompanyAuditLogs />
            </RequirePermission>
          }
        />
        <Route
          path="settings"
          element={
            <RequirePermission permission="settings.view" fallback={<Navigate to="/company" replace />}>
              <CompanySettings />
            </RequirePermission>
          }
        />
      </Route>

      <Route
        path="/client"
        element={
          <RequireAuth roles={['client']}>
            <ClientPortal />
          </RequireAuth>
        }
      >
        <Route index element={<ClientDashboard />} />
        <Route path="book" element={<BookEvent />} />
        <Route path="events/:eventId" element={<ClientEventDetail />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
