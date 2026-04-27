/**
 * MainLayout — shell de la aplicación.
 *
 * Renderiza la barra lateral con navegación y el <Outlet> de React Router
 * donde se montan las páginas internas.
 */

import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, CreditCard, Ticket,
  Settings, LogOut, MessageSquare, Bot, Building2,
  ChevronLeft, ChevronRight, ArrowLeftRight, Bell,
  ClipboardList, Menu, X,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/authService';
import type { UserRole } from '@/types/auth.types';

// ── Nav items ─────────────────────────────────────────────────────────────────

interface NavItem {
  to:           string;
  label:        string;
  icon:         React.ReactNode;
  roles?:       UserRole[];
  exact?:       boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard',            label: 'Dashboard',       icon: <LayoutDashboard className="w-4 h-4" />,  exact: true },
  { to: '/clients',              label: 'Clientes',        icon: <Users className="w-4 h-4" />,            roles: ['Admin', 'Tecnico'] },
  { to: '/plans',                label: 'Planes',          icon: <Building2 className="w-4 h-4" />,        roles: ['Admin'] },
  { to: '/invoices',             label: 'Facturación',     icon: <FileText className="w-4 h-4" />,         roles: ['Admin'] },
  { to: '/payments',             label: 'Pagos',           icon: <CreditCard className="w-4 h-4" />,       roles: ['Admin'] },
  { to: '/cash-close',           label: 'Cierre de Caja',  icon: <ClipboardList className="w-4 h-4" />,   roles: ['Admin'] },
  { to: '/annual-report',        label: 'Reporte Anual',   icon: <ClipboardList className="w-4 h-4" />,   roles: ['Admin', 'SocioLectura'] },
  { to: '/tickets',              label: 'Tickets',         icon: <Ticket className="w-4 h-4" />,           roles: ['Admin', 'Tecnico'] },
  { to: '/instalaciones',        label: 'Instalaciones',   icon: <Building2 className="w-4 h-4" />,        roles: ['Admin', 'Tecnico'] },
  { to: '/plan-changes',         label: 'Cambio de Plan',  icon: <ArrowLeftRight className="w-4 h-4" />,   roles: ['Admin'] },
  { to: '/conversaciones',       label: 'Conversaciones',  icon: <MessageSquare className="w-4 h-4" /> },
  { to: '/bot-config',           label: 'Bot Config',      icon: <Bot className="w-4 h-4" />,              roles: ['Admin'] },
  { to: '/notifications/config', label: 'Notificaciones',  icon: <Bell className="w-4 h-4" />,             roles: ['Admin'] },
  { to: '/users',                label: 'Usuarios',        icon: <Users className="w-4 h-4" />,            roles: ['Admin'] },
  { to: '/audit-logs',           label: 'Auditoría',       icon: <ClipboardList className="w-4 h-4" />,   roles: ['Admin'] },
  { to: '/settings',             label: 'Configuración',   icon: <Settings className="w-4 h-4" />,         roles: ['Admin'] },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function MainLayout() {
  const navigate    = useNavigate();
  const role        = useAuthStore((s) => s.role);
  const fullName    = useAuthStore((s) => s.fullName);
  const clearSession = useAuthStore((s) => s.clearSession);

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try { await authService.logout(); } catch { /* silent — network may be down */ }
    clearSession();
    navigate('/login', { replace: true });
  };

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || (role && item.roles.includes(role))
  );

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-blue-600 text-white'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
        {!collapsed && (
          <span className="font-bold text-gray-900 text-base truncate">TelecomBoliviaNet</span>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="hidden lg:flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={linkClass}
            onClick={() => setMobileOpen(false)}
          >
            <span className="shrink-0">{item.icon}</span>
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-gray-200 space-y-1">
        <NavLink
          to="/profile"
          className={linkClass}
          onClick={() => setMobileOpen(false)}
        >
          <span className="shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
            {fullName?.slice(0, 2).toUpperCase() ?? '??'}
          </span>
          {!collapsed && <span className="truncate text-xs">{fullName}</span>}
        </NavLink>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* ── Desktop sidebar ──────────────────────────────────────────────── */}
      <aside
        className={`hidden lg:flex flex-col bg-white border-r border-gray-200 transition-all duration-200 ${
          collapsed ? 'w-16' : 'w-56'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* ── Mobile overlay ───────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile sidebar ───────────────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-56 bg-white border-r border-gray-200 flex flex-col lg:hidden transform transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-20">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-md text-gray-500 hover:text-gray-800 hover:bg-gray-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold text-gray-900 text-sm">TelecomBoliviaNet</span>
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
