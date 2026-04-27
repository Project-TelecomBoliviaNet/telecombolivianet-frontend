import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Módulo 1 — Auth
import LoginPage           from '@/pages/LoginPage';
import ChangePasswordPage  from '@/pages/ChangePasswordPage';
import ProfilePage         from '@/pages/ProfilePage';
import UsersPage           from '@/pages/UsersPage';
import AuditLogPage        from '@/pages/AuditLogPage';

// Módulo 2 — Clientes
import ClientsPage         from '@/pages/ClientsPage';
import RegisterClientPage  from '@/pages/RegisterClientPage';
import ClientProfilePage   from '@/pages/ClientProfilePage';
import EditClientPage      from '@/pages/EditClientPage';
import PlansPage           from '@/pages/PlansPage';

// Módulo 3 — Facturación
import InvoicesPage        from '@/pages/InvoicesPage';
import AnnualReportPage    from '@/pages/AnnualReportPage';
import PaymentsPage        from '@/pages/PaymentsPage';
import CashClosePage          from '@/pages/CashClosePage';         // US-PAG-CAJA M2
import ConversacionesPage    from '@/pages/ConversacionesPage';    // US-BOT-01 M10
import BotConfigPage         from '@/pages/BotConfigPage';         // US-BOT-06 M10

// Módulo 7 — Tickets
import TicketsPage         from '@/pages/TicketsPage';

// Módulo 8a — Dashboard
import DashboardPage       from '@/pages/DashboardPage';

// Módulo 8b — Notificaciones WhatsApp
import NotificationsConfigPage from '@/pages/NotificationsConfigPage';

// Módulo Instalaciones
import InstallationsPage from '@/pages/InstallationsPage';

// Módulo Cambio de Plan
import PlanChangePage    from '@/pages/PlanChangePage';

// Configuración
import SettingsPage      from '@/pages/SettingsPage';

// Layout y generales
import MainLayout          from '@/components/layout/MainLayout';
import { ProtectedRoute }  from '@/components/auth/ProtectedRoute';
import { ForbiddenPage }   from '@/pages/PlaceholderPages';
import { AuthProvider }    from '@/contexts/AuthContext';

export default function App() {
  return (
    <AuthProvider>
    <BrowserRouter>
      <Routes>

        {/* Públicas */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/403"   element={<ForbiddenPage />} />

        {/* Cambio de contraseña */}
        <Route path="/change-password" element={
          <ProtectedRoute><ChangePasswordPage /></ProtectedRoute>
        } />

        {/* Protegidas con layout */}
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />

          {/* Dashboard */}
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="profile"   element={<ProfilePage />} />

          {/* Módulo 2 — Clientes */}
          <Route path="clients" element={
            <ProtectedRoute allowedRoles={['Admin','Tecnico']}><ClientsPage /></ProtectedRoute>
          } />
          <Route path="clients/new" element={
            <ProtectedRoute allowedRoles={['Admin','Tecnico']}><RegisterClientPage /></ProtectedRoute>
          } />
          <Route path="clients/:id" element={
            <ProtectedRoute allowedRoles={['Admin','Tecnico']}><ClientProfilePage /></ProtectedRoute>
          } />
          <Route path="clients/:id/edit" element={
            <ProtectedRoute allowedRoles={['Admin']}><EditClientPage /></ProtectedRoute>
          } />

          {/* Módulo 2 — Planes */}
          <Route path="plans" element={
            <ProtectedRoute allowedRoles={['Admin']}><PlansPage /></ProtectedRoute>
          } />

          {/* Módulo 3 — Facturación */}
          <Route path="invoices" element={
            <ProtectedRoute allowedRoles={['Admin']}><InvoicesPage /></ProtectedRoute>
          } />
          <Route path="annual-report" element={
            <ProtectedRoute allowedRoles={['Admin','SocioLectura']}><AnnualReportPage /></ProtectedRoute>
          } />

          {/* Módulo 4 — Pagos */}
          <Route path="payments" element={
            <ProtectedRoute allowedRoles={['Admin']}><PaymentsPage /></ProtectedRoute>
          } />

          {/* Módulo 7 — Tickets */}
          <Route path="tickets" element={
            <ProtectedRoute allowedRoles={['Admin','Tecnico']}><TicketsPage /></ProtectedRoute>
          } />

          {/* Módulo Instalaciones */}
          <Route path="instalaciones" element={
            <ProtectedRoute allowedRoles={['Admin','Tecnico']}><InstallationsPage /></ProtectedRoute>
          } />

          {/* Módulo Cambio de Plan */}
          <Route path="plan-changes" element={
            <ProtectedRoute allowedRoles={['Admin']}><PlanChangePage /></ProtectedRoute>
          } />

          {/* Módulo 8b — Notificaciones WhatsApp */}
          <Route path="notifications/config" element={
            <ProtectedRoute allowedRoles={['Admin']}><NotificationsConfigPage /></ProtectedRoute>
          } />

          {/* Admin */}
          <Route path="users" element={
            <ProtectedRoute allowedRoles={['Admin']}><UsersPage /></ProtectedRoute>
          } />
          <Route path="audit-logs" element={
            <ProtectedRoute allowedRoles={['Admin']}><AuditLogPage /></ProtectedRoute>
          } />
          <Route path="settings" element={
            <ProtectedRoute allowedRoles={['Admin']}><SettingsPage /></ProtectedRoute>
          } />

          {/* Módulo 10 — WhatsApp Bot */}
          <Route path="cash-close"    element={
            <ProtectedRoute allowedRoles={['Admin']}><CashClosePage /></ProtectedRoute>
          } />
          <Route path="conversaciones" element={
            <ProtectedRoute allowedRoles={['Admin']}><ConversacionesPage /></ProtectedRoute>
          } />
          <Route path="bot-config" element={
            <ProtectedRoute allowedRoles={['Admin']}><BotConfigPage /></ProtectedRoute>
          } />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
    </AuthProvider>
  );
}
