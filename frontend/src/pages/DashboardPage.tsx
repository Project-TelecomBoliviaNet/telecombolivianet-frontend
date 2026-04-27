/**
 * DashboardPage — ISP TelecomBoliviaNet
 * Dashboard completo: Cobros · Tickets · WhatsApp · Clientes · Zonas
 */

import { useState, useCallback, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Settings, Users, Banknote, AlertTriangle, FileCheck,
  Ticket, MessageCircle, Activity, Clock, CheckCircle2, XCircle,
  Receipt, MapPin, Zap, WifiOff, TrendingUp, Timer, Star,
} from 'lucide-react';

import { useAuthStore }        from '@/store/authStore';
import { dashboardService }    from '@/services/dashboardService';
import type {
  DashboardPreferences,
} from '@/services/dashboardService';
import { useAsyncSection }     from '@/hooks/useAsyncSection';

import MiniBarChart            from '@/components/dashboard/MiniBarChart';
import DonutChart              from '@/components/dashboard/DonutChart';
import HeatmapChart            from '@/components/dashboard/HeatmapChart';
import ZonasBars               from '@/components/dashboard/ZonasBars';
import {
  SkeletonKpiCard, SkeletonChart, SkeletonTable, ErrorSection,
} from '@/components/dashboard/SkeletonCard';

// ── Modal de personalización del dashboard ────────────────────────────────────
const PREF_LABELS: { key: keyof DashboardPreferences; label: string; desc: string }[] = [
  { key: 'ShowKpis',         label: 'KPIs principales',       desc: 'Cobros, clientes activos, deuda total' },
  { key: 'ShowTendencia',    label: 'Tendencia de cobros',     desc: 'Gráfico de barras de los últimos meses' },
  { key: 'ShowTickets',      label: 'Tickets de soporte',      desc: 'Estado y distribución de tickets' },
  { key: 'ShowWhatsApp',     label: 'WhatsApp / Comprobantes', desc: 'Actividad del bot y cola de comprobantes' },
  { key: 'ShowDeudores',     label: 'Deudores',                desc: 'Clientes con deuda pendiente' },
  { key: 'ShowZonas',        label: 'Zonas',                   desc: 'Distribución de clientes por zona' },
  { key: 'ShowMetodosPago',  label: 'Métodos de pago',         desc: 'Distribución de cobros por método' },
  { key: 'ShowComprobantes', label: 'Cola de comprobantes',    desc: 'Últimos comprobantes recibidos por bot' },
];

function DashboardCustomizeModal({ open, onClose, prefs, onSave }: {
  open: boolean; onClose: () => void;
  prefs: DashboardPreferences; onSave: (p: DashboardPreferences) => void | Promise<void>;
}) {
  const [local, setLocal]     = useState<DashboardPreferences>(prefs);
  const [saving, setSaving]   = useState(false);

  // Sync when prefs change externally (e.g. first open)
  useEffect(() => { setLocal(prefs); }, [open, prefs]);

  if (!open) return null;

  const toggle = (key: keyof DashboardPreferences) =>
    setLocal(prev => ({ ...prev, [key]: !prev[key] }));

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(local); onClose(); }
    finally { setSaving(false); }
  };

  const allOn  = Object.values(local).every(Boolean);
  const allOff = Object.values(local).every(v => !v);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">Personalizar dashboard</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700">
            <XCircle className="w-4 h-4" />
          </button>
        </div>

        {/* Secciones */}
        <div className="px-5 py-4 space-y-1 max-h-[60vh] overflow-y-auto">
          {/* Seleccionar todo / ninguno */}
          <div className="flex gap-3 mb-3">
            <button
              onClick={() => setLocal(Object.fromEntries(PREF_LABELS.map(p => [p.key, true])) as unknown as DashboardPreferences)}
              disabled={allOn}
              className="text-xs text-blue-600 hover:underline disabled:opacity-40 disabled:no-underline"
            >
              Activar todo
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={() => setLocal(Object.fromEntries(PREF_LABELS.map(p => [p.key, false])) as unknown as DashboardPreferences)}
              disabled={allOff}
              className="text-xs text-gray-500 hover:underline disabled:opacity-40 disabled:no-underline"
            >
              Desactivar todo
            </button>
          </div>

          {PREF_LABELS.map(({ key, label, desc }) => (
            <label
              key={key}
              className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={local[key]}
                onChange={() => toggle(key)}
                className="mt-0.5 w-4 h-4 rounded accent-blue-600 cursor-pointer"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>
            </label>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t bg-gray-50">
          <p className="text-xs text-gray-400">
            {Object.values(local).filter(Boolean).length} de {PREF_LABELS.length} secciones visibles
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Activity className="w-3 h-3 animate-spin" />}
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NoConnectionBanner() { return null; }


// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtBs = (v?: number) =>
  v == null ? '—' : `Bs ${v.toLocaleString('es-BO', { minimumFractionDigits: 0 })}`;

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' }) : '—';

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });

const pctChange = (now: number, prev: number) =>
  prev === 0 ? null : Math.round(((now - prev) / prev) * 100);

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return `${Math.floor(h/24)}d`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const DEFAULT_PREFS: DashboardPreferences = {
  ShowKpis: true, ShowTendencia: true, ShowTickets: true, ShowWhatsApp: true,
  ShowDeudores: true, ShowZonas: true, ShowMetodosPago: true, ShowComprobantes: true,
};

// ── Color maps ────────────────────────────────────────────────────────────────
const PRIO_BADGE: Record<string, string> = {
  Critica: 'bg-red-600 text-white', Alta: 'bg-orange-500 text-white',
  Media: 'bg-yellow-400 text-gray-900', Baja: 'bg-gray-200 text-gray-700',
};
const STATUS_BADGE: Record<string, string> = {
  Abierto: 'text-blue-700 bg-blue-50', EnProceso: 'text-orange-700 bg-orange-50',
  Resuelto: 'text-green-700 bg-green-50', Cerrado: 'text-gray-500 bg-gray-100',
};
const ESTADO_DOT: Record<string, string> = {
  Abierto: '#3b82f6', EnProceso: '#f97316', Resuelto: '#22c55e', Cerrado: '#9ca3af',
};
const TIPO_COLOR: Record<string, string> = {
  SoporteTecnico: '#3b82f6', InstalacionNueva: '#22c55e', CambioPlan: '#f59e0b',
  TvCable: '#8b5cf6', ReactivacionServicio: '#06b6d4',
  BajaServicio: '#ef4444', RecoleccionEquipo: '#6b7280',
};
const METODO_COLOR: Record<string, string> = {
  Efectivo: '#22c55e', DepositoBancario: '#3b82f6', QR: '#f59e0b',
};
const WSP_BADGE: Record<string, string> = {
  Pendiente: 'text-amber-700 bg-amber-50', Aprobado: 'text-green-700 bg-green-50',
  Rechazado: 'text-red-700 bg-red-50',
};

// ── Reusable sub-components ───────────────────────────────────────────────────
function KpiCard({ label, value, icon, sub, subColor = 'text-gray-500', accent }: {
  label: string; value: string; icon: ReactNode; sub?: string;
  subColor?: string; accent?: string;
}) {
  return (
    <div className={`card p-4 flex flex-col gap-1.5 ${accent ? `border-l-4 ${accent}` : ''}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide leading-tight">{label}</p>
        <div className="p-1.5 rounded-lg bg-gray-50">{icon}</div>
      </div>
      <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
      {sub && <p className={`text-xs ${subColor} leading-none`}>{sub}</p>}
    </div>
  );
}

function SectionCard({ title, icon, children, badge, onBadgeClick }: {
  title: string; icon: ReactNode; children: ReactNode;
  badge?: string; onBadgeClick?: () => void;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/80">
        <div className="flex items-center gap-2">{icon}<h3 className="text-sm font-semibold text-gray-800">{title}</h3></div>
        {badge && (
          <button onClick={onBadgeClick} className="text-xs text-blue-600 hover:underline font-medium">{badge}</button>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { userId } = useAuthStore();
  const navigate = useNavigate();
  const [showCustomize, setShowCustomize] = useState(false);
  const [prefs, setPrefs] = useState<DashboardPreferences>(() => {
    try {
      const s = localStorage.getItem(`dash_prefs_${userId}`);
      return s ? JSON.parse(s) : DEFAULT_PREFS;
    } catch { return DEFAULT_PREFS; }
  });

  // ── Fetch hooks ─────────────────────────────────────────────────────────────
  const kpiF      = useCallback(() => dashboardService.getKpis(), []);
  const tendF     = useCallback(() => dashboardService.getTendenciaCobros(6), []);
  const metodF    = useCallback(() => dashboardService.getMetodosPago(), []);
  const tEstF     = useCallback(() => dashboardService.getTicketsEstado(), []);
  const tUrgF     = useCallback(() => dashboardService.getTicketsUrgentes(), []);
  const tTipoF    = useCallback(() => dashboardService.getTicketsPorTipo(), []);
  const tResolF   = useCallback(() => dashboardService.getResolucionPromedio(), []);
  const wspF      = useCallback(() => dashboardService.getWhatsAppActividad(), []);
  const deudF     = useCallback(() => dashboardService.getDeudores(), []);
  const compF     = useCallback(() => dashboardService.getComprobantesRecientes(), []);
  const zonaF     = useCallback(() => dashboardService.getClientesPorZona(), []);
  const heatF     = useCallback(() => dashboardService.getActividadHoras(), []);

  const { data: kpis,    status: kpisS,    retry: kpisR }    = useAsyncSection(kpiF);
  const { data: tend,    status: tendS,    retry: tendR }    = useAsyncSection(tendF);
  const { data: metodos, status: metodS,   retry: metodR }   = useAsyncSection(metodF);
  const { data: tEst,    status: tEstS,    retry: tEstR }    = useAsyncSection(tEstF);
  const { data: tUrg,    status: tUrgS,    retry: tUrgR }    = useAsyncSection(tUrgF);
  const { data: tTipo,   status: tTipoS,   retry: tTipoR }   = useAsyncSection(tTipoF);
  const { data: tResol,  status: tResolS,  retry: tResolR }  = useAsyncSection(tResolF);
  const { data: wsp,     status: wspS,     retry: wspR }     = useAsyncSection(wspF);
  const { data: deudores,status: deudS,    retry: deudR }    = useAsyncSection(deudF);
  const { data: comprob, status: compS,    retry: compR }    = useAsyncSection(compF);
  const { data: zonas,   status: zonaS,    retry: zonaR }    = useAsyncSection(zonaF);
  const { data: heatmap, status: heatS,    retry: heatR }    = useAsyncSection(heatF);

  // M4 hooks
  const pagosF    = useCallback(() => dashboardService.getDashPagos(), []);
  const tMetricF  = useCallback(() => dashboardService.getDashTicketsMetricas(), []);
  const notifF    = useCallback(() => dashboardService.getDashNotifStats(), []);
  const chatbotF  = useCallback(() => dashboardService.getDashChatbotKpis(), []);
  const autoF     = useCallback(() => dashboardService.getDashAutoActions(), []);

  const { data: dashPagos,   status: pagosS }   = useAsyncSection(pagosF);
  const { data: tMetricas,   status: tMetricS }  = useAsyncSection(tMetricF);
  const { data: notifStats,  status: notifS }    = useAsyncSection(notifF);
  const { data: chatbotKpis, status: chatbotS }  = useAsyncSection(chatbotF);
  const { data: autoActions, status: autoS }     = useAsyncSection(autoF);

  const handleSavePrefs = async (p: DashboardPreferences) => {
    await dashboardService.savePreferences(userId!, p);
    localStorage.setItem(`dash_prefs_${userId}`, JSON.stringify(p));
    setPrefs(p);
  };

  const pctCobros = kpis ? pctChange(kpis.CobradoEsteMes, kpis.CobradoMesAnterior) : null;

  const metodoSlices = (metodos ?? []).map(m => ({
    label: m.Metodo, value: m.Cantidad, color: METODO_COLOR[m.Metodo] ?? '#9ca3af',
  }));
  const estadoSlices = (tEst ?? []).map(t => ({
    label: t.Estado, value: t.Total, color: ESTADO_DOT[t.Estado] ?? '#9ca3af',
  }));
  const tipoSlices = (tTipo ?? []).slice(0, 5).map(t => ({
    label: t.Tipo, value: t.Total, color: TIPO_COLOR[t.Tipo] ?? '#9ca3af',
  }));

  const noVisible = Object.values(prefs).every(v => !v);

  return (
    <>
      <NoConnectionBanner />
      <div className="p-5 space-y-5 bg-gray-50 min-h-screen">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl shadow-sm">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Dashboard ISP</h1>
              <p className="text-xs text-gray-400">
                {new Date().toLocaleDateString('es-BO', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
              </p>
            </div>
          </div>
          <button onClick={() => setShowCustomize(true)}
            className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-1.5">
            <Settings className="w-3.5 h-3.5" /> Personalizar
          </button>
        </div>

        {/* ── KPIs ────────────────────────────────────────────────────────── */}
        {prefs.ShowKpis && (
          <section>
            {kpisS === 'loading' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {Array.from({ length: 12 }).map((_, i) => <SkeletonKpiCard key={i} />)}
              </div>
            )}
            {kpisS === 'error' && <ErrorSection title="No se pudieron cargar los KPIs." onRetry={kpisR} />}
            {kpisS === 'success' && kpis && (
              <div className="space-y-3">
                {/* Clientes row */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">👥 Clientes</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <KpiCard label="Activos" value={kpis.ClientesActivos.toLocaleString()}
                      icon={<Users className="w-4 h-4 text-blue-500" />} accent="border-blue-500"
                      sub={`+${kpis.ClientesNuevosMes} nuevos este mes`} subColor="text-green-600" />
                    <KpiCard label="Suspendidos" value={kpis.ClientesSuspendidos.toLocaleString()}
                      icon={<WifiOff className="w-4 h-4 text-amber-500" />} accent="border-amber-400"
                      sub="Pendientes de gestión" subColor="text-amber-600" />
                    <KpiCard label="Con Deuda" value={kpis.ClientesConDeuda.toLocaleString()}
                      icon={<AlertTriangle className="w-4 h-4 text-red-500" />} accent="border-red-500"
                      sub={fmtBs(kpis.MontoDeudaTotal) + ' total'} subColor="text-red-600" />
                  </div>
                </div>
                {/* Cobros row */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">💰 Cobros</p>
                  <div className="grid grid-cols-2 gap-3">
                    <KpiCard label="Cobrado este mes" value={fmtBs(kpis.CobradoEsteMes)}
                      icon={<Banknote className="w-4 h-4 text-green-500" />} accent="border-green-500"
                      sub={pctCobros != null
                        ? `${pctCobros >= 0 ? '▲' : '▼'} ${Math.abs(pctCobros)}% vs mes anterior`
                        : `Mes anterior: ${fmtBs(kpis.CobradoMesAnterior)}`}
                      subColor={pctCobros != null && pctCobros >= 0 ? 'text-green-600' : 'text-red-600'} />
                    <KpiCard label="Comprobantes pendientes" value={kpis.ComprobantesPendientes.toLocaleString()}
                      icon={<FileCheck className="w-4 h-4 text-amber-500" />}
                      accent={kpis.ComprobantesPendientes > 0 ? 'border-amber-400' : 'border-gray-200'}
                      sub={kpis.ComprobantesPendientes > 0 ? 'Por revisar en bandeja WhatsApp' : 'Todo al día ✓'}
                      subColor={kpis.ComprobantesPendientes > 0 ? 'text-amber-600' : 'text-green-600'} />
                  </div>
                </div>
                {/* Tickets row */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">🎫 Tickets</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <KpiCard label="Tickets Activos" value={kpis.TicketsAbiertos.toLocaleString()}
                      icon={<Ticket className="w-4 h-4 text-blue-500" />} accent="border-blue-500"
                      sub={kpis.TicketsCriticos > 0 ? `⚠️ ${kpis.TicketsCriticos} críticos` : 'Sin críticos'}
                      subColor={kpis.TicketsCriticos > 0 ? 'text-red-600 font-semibold' : 'text-green-600'} />
                    <KpiCard label="SLA Vencidos" value={kpis.TicketsSlaVencidos.toLocaleString()}
                      icon={<Timer className="w-4 h-4 text-red-500" />}
                      accent={kpis.TicketsSlaVencidos > 0 ? 'border-red-500' : 'border-gray-200'}
                      sub={kpis.TicketsSlaVencidos > 0 ? 'Requieren atención urgente' : 'Todos en plazo ✓'}
                      subColor={kpis.TicketsSlaVencidos > 0 ? 'text-red-600' : 'text-green-600'} />
                    <KpiCard label="Resueltos hoy" value={kpis.TicketsResueltosHoy.toLocaleString()}
                      icon={<CheckCircle2 className="w-4 h-4 text-green-500" />} accent="border-green-500"
                      sub="Cerrados en el día" subColor="text-green-600" />
                    <KpiCard label="WhatsApp hoy" value={kpis.MensajesWspHoy.toLocaleString()}
                      icon={<MessageCircle className="w-4 h-4 text-green-500" />} accent="border-green-400"
                      sub="Comprobantes recibidos" />
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── Tendencia + Métodos de pago ──────────────────────────────────── */}
        {(prefs.ShowTendencia || prefs.ShowMetodosPago) && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {prefs.ShowTendencia && (
              <div className="lg:col-span-2">
                {tendS === 'loading' && <SkeletonChart />}
                {tendS === 'error' && <ErrorSection title="Error cargando tendencia de cobros." onRetry={tendR} />}
                {tendS === 'success' && tend && (
                  <SectionCard title="Tendencia de Cobros — últimos 6 meses"
                    icon={<Activity className="w-4 h-4 text-blue-500" />}>
                    {tend.Meses.length === 0
                      ? <p className="text-sm text-gray-400 text-center py-10">Sin datos de cobros aún</p>
                      : <MiniBarChart meses={tend.Meses} height={190} />
                    }
                    <p className="text-xs text-gray-400 mt-2">* Cobros verificados · hora Bolivia (UTC-4)</p>
                  </SectionCard>
                )}
              </div>
            )}
            {prefs.ShowMetodosPago && (
              <div>
                {metodS === 'loading' && <SkeletonChart />}
                {metodS === 'error' && <ErrorSection title="Error cargando métodos de pago." onRetry={metodR} />}
                {metodS === 'success' && metodos && (
                  <SectionCard title="Métodos de Pago (mes actual)"
                    icon={<Banknote className="w-4 h-4 text-green-500" />}>
                    <div className="flex flex-col items-center gap-4">
                      <DonutChart slices={metodoSlices} size={110} label="pagos" />
                      <div className="w-full space-y-2">
                        {metodos.map((m, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full inline-block"
                                style={{ backgroundColor: METODO_COLOR[m.Metodo] ?? '#9ca3af' }} />
                              <span className="text-gray-700">{m.Metodo.replace('DepositoBancario', 'Depósito')}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-semibold text-gray-900">{m.Cantidad}</span>
                              <span className="text-gray-400 ml-1.5">{fmtBs(m.Monto)}</span>
                            </div>
                          </div>
                        ))}
                        {metodos.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Sin pagos este mes</p>}
                      </div>
                    </div>
                  </SectionCard>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── PANEL DE TICKETS ─────────────────────────────────────────────── */}
        {prefs.ShowTickets && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest px-3">Panel de Tickets</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            {/* Row 1: Estado dona + Tipo dona + Tiempo resolución */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">

              {/* Estado por estado */}
              <div>
                {tEstS === 'loading' && <SkeletonChart />}
                {tEstS === 'error' && <ErrorSection title="Error cargando estados." onRetry={tEstR} />}
                {tEstS === 'success' && tEst && (
                  <SectionCard title="Por Estado"
                    icon={<Ticket className="w-4 h-4 text-blue-500" />}
                    badge="Ver todos →" onBadgeClick={() => navigate('/tickets')}>
                    <div className="flex flex-col items-center gap-3">
                      <DonutChart slices={estadoSlices} size={100} label="total" />
                      <div className="w-full space-y-1.5">
                        {tEst.map((t, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-xs">
                            <span className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: ESTADO_DOT[t.Estado] ?? '#9ca3af', display:'inline-block' }} />
                            <span className="text-gray-700 flex-1">{t.Estado}</span>
                            <span className="font-bold text-gray-900">{t.Total}</span>
                            {t.Criticos > 0 && <span className="text-red-500">({t.Criticos}⚠)</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </SectionCard>
                )}
              </div>

              {/* Por tipo */}
              <div>
                {tTipoS === 'loading' && <SkeletonChart />}
                {tTipoS === 'error' && <ErrorSection title="Error cargando tipos." onRetry={tTipoR} />}
                {tTipoS === 'success' && tTipo && (
                  <SectionCard title="Por Tipo" icon={<Zap className="w-4 h-4 text-purple-500" />}>
                    <div className="flex flex-col items-center gap-3">
                      <DonutChart slices={tipoSlices} size={100} />
                      <div className="w-full space-y-1.5">
                        {(tTipo ?? []).slice(0, 5).map((t, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-xs">
                            <span className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: TIPO_COLOR[t.Tipo] ?? '#9ca3af', display:'inline-block' }} />
                            <span className="text-gray-700 flex-1 truncate">{t.Tipo.replace(/([A-Z])/g,' $1').trim()}</span>
                            <span className="font-bold text-gray-900">{t.Total}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </SectionCard>
                )}
              </div>

              {/* Tiempo promedio resolución */}
              <div>
                {tResolS === 'loading' && <SkeletonChart />}
                {tResolS === 'error' && <ErrorSection title="Error cargando tiempos." onRetry={tResolR} />}
                {tResolS === 'success' && tResol && (
                  <SectionCard title="Resolución Promedio"
                    icon={<Clock className="w-4 h-4 text-amber-500" />}>
                    {tResol.length === 0
                      ? <p className="text-sm text-gray-400 text-center py-8">Sin tickets resueltos aún</p>
                      : (
                        <div className="space-y-3">
                          {tResol.map((r, i) => {
                            const h = Math.round(r.HorasPromedio);
                            const maxH = Math.max(...tResol.map(x => x.HorasPromedio), 1);
                            const pct  = (r.HorasPromedio / maxH) * 100;
                            const col  = r.Prioridad === 'Critica' ? '#ef4444' : r.Prioridad === 'Alta' ? '#f97316' : r.Prioridad === 'Media' ? '#f59e0b' : '#6b7280';
                            return (
                              <div key={i}>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="font-medium text-gray-700">{r.Prioridad}</span>
                                  <span className="text-gray-500">
                                    <span className="font-bold text-gray-900">{h < 24 ? `${h}h` : `${Math.round(h/24)}d`}</span>
                                    {' '}prom · {r.Cantidad} tickets
                                  </span>
                                </div>
                                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                                  <div style={{ width:`${pct}%`, backgroundColor: col, transition:'width .6s' }} className="h-full rounded-full" />
                                </div>
                              </div>
                            );
                          })}
                          <div className="flex items-center gap-1.5 mt-2">
                            <Star className="w-3 h-3 text-amber-400" />
                            <p className="text-xs text-gray-400">
                              CSAT promedio: {
                                (() => {
                                  // shown from kpis if available
                                  return '—';
                                })()
                              }
                            </p>
                          </div>
                        </div>
                      )
                    }
                  </SectionCard>
                )}
              </div>
            </div>

            {/* Row 2: Tabla de tickets urgentes */}
            <div>
              {tUrgS === 'loading' && <SkeletonTable />}
              {tUrgS === 'error' && <ErrorSection title="Error cargando tickets urgentes." onRetry={tUrgR} />}
              {tUrgS === 'success' && tUrg && (
                <SectionCard title="Tickets Activos — Prioridad Crítica/Alta primero"
                  icon={<AlertTriangle className="w-4 h-4 text-orange-500" />}
                  badge={`Ver todos (${tUrg.length}) →`}
                  onBadgeClick={() => navigate('/tickets')}>
                  {tUrg.length === 0
                    ? <p className="text-sm text-gray-400 text-center py-8">✅ No hay tickets activos</p>
                    : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-400 border-b border-gray-100">
                              {['Cliente','Asunto','Tipo','Prioridad','Estado','Técnico','Abierto','Vence'].map(h => (
                                <th key={h} className="text-left py-2 pr-3 font-medium whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {tUrg.map(t => (
                              <tr key={t.Id}
                                className={`border-b border-gray-50 hover:bg-gray-50 cursor-pointer ${t.SlaVencido ? 'bg-red-50/40' : ''}`}
                                onClick={() => navigate('/tickets')}>
                                <td className="py-2 pr-3 font-medium text-gray-800 truncate max-w-[110px]">{t.ClienteNombre}</td>
                                <td className="py-2 pr-3 text-gray-600 truncate max-w-[130px]">{t.Asunto}</td>
                                <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">{t.Tipo.replace(/([A-Z])/g,' $1').trim()}</td>
                                <td className="py-2 pr-3">
                                  <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${PRIO_BADGE[t.Prioridad] ?? 'bg-gray-100'}`}>
                                    {t.Prioridad}
                                  </span>
                                </td>
                                <td className="py-2 pr-3">
                                  <span className={`px-1.5 py-0.5 rounded text-xs ${STATUS_BADGE[t.Estado] ?? ''}`}>
                                    {t.Estado}
                                  </span>
                                </td>
                                <td className="py-2 pr-3 text-gray-500 truncate max-w-[90px]">{t.Tecnico}</td>
                                <td className="py-2 pr-3 text-gray-400 whitespace-nowrap">{timeAgo(t.CreadoEn)}</td>
                                <td className="py-2">
                                  {t.SlaVencido
                                    ? <span className="text-red-600 font-bold text-xs">🔴 VENCIDO</span>
                                    : t.FechaLimite
                                    ? <span className="text-gray-500 text-xs">{fmtDate(t.FechaLimite)}</span>
                                    : <span className="text-gray-300">—</span>
                                  }
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  }
                </SectionCard>
              )}
            </div>
          </div>
        )}

        {/* ── WhatsApp + Heatmap ───────────────────────────────────────────── */}
        {prefs.ShowWhatsApp && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              {wspS === 'loading' && <SkeletonTable />}
              {wspS === 'error' && <ErrorSection title="Error cargando actividad WhatsApp." onRetry={wspR} />}
              {wspS === 'success' && wsp && (
                <SectionCard title="Actividad WhatsApp hoy"
                  icon={<MessageCircle className="w-4 h-4 text-green-500" />}
                  badge={`${wsp.length} eventos`}>
                  {wsp.length === 0
                    ? <p className="text-sm text-gray-400 text-center py-8">Sin actividad hoy</p>
                    : (
                      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                        {wsp.map((w, i) => (
                          <div key={i} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
                            <span className="text-xs text-gray-400 font-mono w-10 shrink-0">{w.Hora}</span>
                            <p className="text-xs font-medium text-gray-800 flex-1 truncate">{w.ClienteNombre}</p>
                            {w.Monto != null && <span className="text-xs font-bold text-green-700 shrink-0">{fmtBs(w.Monto)}</span>}
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${WSP_BADGE[w.Estado] ?? 'bg-gray-100 text-gray-600'}`}>
                              {w.Estado}
                            </span>
                          </div>
                        ))}
                      </div>
                    )
                  }
                </SectionCard>
              )}
            </div>
            <div>
              {heatS === 'loading' && <SkeletonChart />}
              {heatS === 'error' && <ErrorSection title="Error cargando mapa de actividad." onRetry={heatR} />}
              {heatS === 'success' && heatmap && (
                <SectionCard title="Mapa de Actividad por Hora (hoy)"
                  icon={<Clock className="w-4 h-4 text-purple-500" />}>
                  <HeatmapChart data={heatmap} />
                  <p className="text-xs text-gray-400 mt-3">
                    Pagos <span className="text-blue-500">■</span> · Tickets <span className="text-red-500">■</span> · WhatsApp <span className="text-green-500">■</span> · hora Bolivia
                  </p>
                </SectionCard>
              )}
            </div>
          </div>
        )}

        {/* ── Deudores + Zonas ─────────────────────────────────────────────── */}
        {(prefs.ShowDeudores || prefs.ShowZonas) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {prefs.ShowDeudores && (
              <div>
                {deudS === 'loading' && <SkeletonTable />}
                {deudS === 'error' && <ErrorSection title="Error cargando deudores." onRetry={deudR} />}
                {deudS === 'success' && deudores && (
                  <SectionCard title="Clientes con Deuda Vencida"
                    icon={<XCircle className="w-4 h-4 text-red-500" />}
                    badge={`${deudores.length} clientes`}>
                    {deudores.length === 0
                      ? <p className="text-sm text-gray-400 text-center py-8">✅ Sin deudas vencidas</p>
                      : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-gray-400 border-b border-gray-100">
                                <th className="text-left py-2 pr-2 font-medium">Cliente</th>
                                <th className="text-left py-2 pr-2 font-medium">Zona</th>
                                <th className="text-right py-2 pr-2 font-medium">Deuda</th>
                                <th className="text-right py-2 pr-2 font-medium">Días</th>
                                <th className="text-right py-2 font-medium">Fact.</th>
                              </tr>
                            </thead>
                            <tbody>
                              {deudores.slice(0, 8).map(d => (
                                <tr key={d.ClienteId} className="border-b border-gray-50 hover:bg-red-50/30">
                                  <td className="py-2 pr-2 font-medium text-gray-800 truncate max-w-[100px]">{d.ClienteNombre}</td>
                                  <td className="py-2 pr-2 text-gray-500 truncate max-w-[70px]">{d.Zona}</td>
                                  <td className="py-2 pr-2 text-right font-bold text-red-600">{fmtBs(d.MontoDeuda)}</td>
                                  <td className="py-2 pr-2 text-right">
                                    <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                                      d.DiasVencido > 60 ? 'bg-red-100 text-red-800'
                                      : d.DiasVencido > 30 ? 'bg-orange-100 text-orange-700'
                                      : 'bg-yellow-50 text-yellow-700'}`}>
                                      {d.DiasVencido}d
                                    </span>
                                  </td>
                                  <td className="py-2 text-right text-gray-400">{d.FacturasVencidas}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    }
                  </SectionCard>
                )}
              </div>
            )}
            {prefs.ShowZonas && (
              <div>
                {zonaS === 'loading' && <SkeletonChart />}
                {zonaS === 'error' && <ErrorSection title="Error cargando zonas." onRetry={zonaR} />}
                {zonaS === 'success' && zonas && (
                  <SectionCard title="Clientes por Zona"
                    icon={<MapPin className="w-4 h-4 text-indigo-500" />}>
                    {zonas.length === 0
                      ? <p className="text-sm text-gray-400 text-center py-8">Sin datos de zonas</p>
                      : <ZonasBars zonas={zonas} />
                    }
                  </SectionCard>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Comprobantes recientes ───────────────────────────────────────── */}
        {prefs.ShowComprobantes && (
          <div>
            {compS === 'loading' && <SkeletonTable />}
            {compS === 'error' && <ErrorSection title="Error cargando comprobantes." onRetry={compR} />}
            {compS === 'success' && comprob && (
              <SectionCard title="Últimos Comprobantes Verificados"
                icon={<Receipt className="w-4 h-4 text-blue-500" />}
                badge={`${comprob.length} registros`}>
                {comprob.length === 0
                  ? <p className="text-sm text-gray-400 text-center py-6">Sin comprobantes recientes</p>
                  : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {comprob.map(c => (
                        <div key={c.Id}
                          className="flex flex-col gap-1 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-blue-200 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-green-700">{fmtBs(c.Monto)}</span>
                            <span className="text-xs text-gray-400 font-mono">{fmtTime(c.FechaPago)}</span>
                          </div>
                          <p className="text-xs font-medium text-gray-800 truncate">{c.ClienteNombre}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">{c.Metodo.replace('DepositoBancario','Dep.')}</span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">{c.Estado}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                }
              </SectionCard>
            )}
          </div>
        )}

        {/* Sin secciones */}
        {noVisible && (
          <div className="card p-16 flex flex-col items-center gap-4 text-center">
            <TrendingUp className="w-12 h-12 text-gray-200" />
            <p className="text-gray-400">No hay secciones visibles en el dashboard.</p>
            <button onClick={() => setShowCustomize(true)} className="btn-primary text-sm px-4 py-2">
              Configurar Dashboard
            </button>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          US-DASH-PAGOS · Cobros enriquecidos
          ══════════════════════════════════════════════════════════════════ */}
      {prefs.ShowMetodosPago && (
        <section>
          {pagosS === 'loading' && <SkeletonChart />}
          {pagosS === 'error'   && <ErrorSection title="Cobros" onRetry={() => {}} />}
          {pagosS === 'success' && dashPagos && (
            <SectionCard title="Cobros del mes" icon={<Banknote className="w-4 h-4 text-green-600" />}
              badge="Ver reporte" onBadgeClick={() => navigate('/payments')}>
              {/* KPIs fila */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  { l: 'Total hoy',    v: fmtBs(dashPagos.TotalHoy),   s: `${dashPagos.CountHoy} pagos` },
                  { l: 'Total mes',    v: fmtBs(dashPagos.TotalMes),   s: `${dashPagos.CountMes} pagos` },
                ].map(({ l, v, s }) => (
                  <div key={l} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400 mb-1">{l}</p>
                    <p className="text-lg font-bold text-gray-900">{v}</p>
                    <p className="text-xs text-gray-400">{s}</p>
                  </div>
                ))}
                {/* Por método */}
                {dashPagos.PorMetodo.slice(0, 2).map(m => (
                  <div key={m.Metodo} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400 mb-1">{m.Metodo}</p>
                    <p className="text-lg font-bold text-gray-900">{fmtBs(m.Monto)}</p>
                    <p className="text-xs text-gray-400">{m.PctMonto}%</p>
                  </div>
                ))}
              </div>
              {/* Por operador */}
              {dashPagos.PorOperador.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Por operador</p>
                  <div className="space-y-1.5">
                    {dashPagos.PorOperador.map(op => {
                      const pct = dashPagos.TotalMes > 0 ? (op.Monto / dashPagos.TotalMes * 100) : 0;
                      return (
                        <div key={op.OperadorNombre} className="flex items-center gap-3">
                          <span className="text-xs text-gray-600 w-28 truncate">{op.OperadorNombre}</span>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-medium text-gray-700 w-20 text-right">{fmtBs(op.Monto)}</span>
                          <span className="text-xs text-gray-400 w-10 text-right">{op.Cantidad}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </SectionCard>
          )}
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          US-DASH-TICKETS-M · Métricas de tickets
          ══════════════════════════════════════════════════════════════════ */}
      {prefs.ShowTickets && (
        <section>
          {tMetricS === 'loading' && <SkeletonChart />}
          {tMetricS === 'error'   && <ErrorSection title="Métricas Tickets" onRetry={() => {}} />}
          {tMetricS === 'success' && tMetricas && (
            <SectionCard title="Métricas de Tickets" icon={<Ticket className="w-4 h-4 text-orange-600" />}
              badge="Ver tickets" onBadgeClick={() => navigate('/tickets')}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  { l: 'Abiertos',       v: tMetricas.TotalAbiertos.toString(),      color: 'text-blue-700' },
                  { l: 'En proceso',     v: tMetricas.TotalEnProceso.toString(),     color: 'text-orange-700' },
                  { l: 'SLA vencido',    v: tMetricas.TotalVencidosSla.toString(),   color: tMetricas.TotalVencidosSla > 0 ? 'text-red-700' : 'text-green-700' },
                  { l: 'SLA cumplido',   v: `${tMetricas.SlaCompliancePct}%`,        color: tMetricas.SlaCompliancePct >= 80 ? 'text-green-700' : 'text-red-700' },
                ].map(({ l, v, color }) => (
                  <div key={l} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400 mb-1">{l}</p>
                    <p className={`text-xl font-bold ${color}`}>{v}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <span>Resolución promedio: <strong className="text-gray-800">{tMetricas.ResolucionPromedioHoras}h</strong></span>
                <span>Resueltos este mes: <strong className="text-gray-800">{tMetricas.TotalResueltosMes}</strong></span>
              </div>
              {tMetricas.VencidosSla.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> SLA vencido — requiere atención
                  </p>
                  <div className="space-y-1.5">
                    {tMetricas.VencidosSla.slice(0, 4).map(t => (
                      <div key={t.Id}
                        className="flex items-center justify-between px-3 py-2 bg-red-50 rounded-lg border border-red-100 cursor-pointer hover:bg-red-100"
                        onClick={() => navigate(`/tickets/${t.Id}`)}>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${PRIO_BADGE[t.Prioridad] ?? 'bg-gray-200 text-gray-700'}`}>
                            {t.Prioridad}
                          </span>
                          <span className="text-xs text-gray-700 truncate">{t.Asunto}</span>
                        </div>
                        <span className="text-xs text-red-600 font-medium shrink-0 ml-2">
                          {t.FechaLimite ? `venc. ${fmtDate(t.FechaLimite)}` : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </SectionCard>
          )}
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          US-DASH-NOTIF · Estado de notificaciones
          ══════════════════════════════════════════════════════════════════ */}
      {prefs.ShowWhatsApp && (
        <section>
          {notifS === 'loading' && <SkeletonChart />}
          {notifS === 'error'   && <ErrorSection title="Notificaciones" onRetry={() => {}} />}
          {notifS === 'success' && notifStats && (
            <SectionCard title="Notificaciones WhatsApp (24h)" icon={<MessageCircle className="w-4 h-4 text-green-600" />}
              badge="Configurar" onBadgeClick={() => navigate('/config/notifications')}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  { l: 'Enviadas',   v: notifStats.EnviadasUlt24h.toString(),   color: 'text-green-700' },
                  { l: 'Fallidas',   v: notifStats.FallidasUlt24h.toString(),   color: notifStats.FallidasUlt24h > 0 ? 'text-red-700' : 'text-gray-400' },
                  { l: 'En cola',    v: notifStats.PendientesEnCola.toString(), color: 'text-blue-700' },
                  { l: 'Tasa éxito', v: `${notifStats.TasaExitoUlt24h}%`,       color: notifStats.TasaExitoUlt24h >= 90 ? 'text-green-700' : 'text-red-700' },
                ].map(({ l, v, color }) => (
                  <div key={l} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400 mb-1">{l}</p>
                    <p className={`text-xl font-bold ${color}`}>{v}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                {notifStats.PorTipo.slice(0, 5).map(t => (
                  <div key={t.NotifTipo} className="flex items-center justify-between text-xs px-2 py-1.5 rounded bg-gray-50">
                    <span className="text-gray-600 font-medium truncate">{t.NotifTipo}</span>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <span className="text-green-700 font-medium">✓ {t.Enviadas}</span>
                      {t.Fallidas > 0 && <span className="text-red-600 font-medium">✗ {t.Fallidas}</span>}
                    </div>
                  </div>
                ))}
              </div>
              {notifStats.OmitidosAntispam > 0 && (
                <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> {notifStats.OmitidosAntispam} omitidos por anti-spam
                </p>
              )}
            </SectionCard>
          )}
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          US-DASH-CHATBOT · Métricas chatbot
          ══════════════════════════════════════════════════════════════════ */}
      <section>
        {chatbotS === 'loading' && <SkeletonChart />}
        {chatbotS === 'error'   && <ErrorSection title="Chatbot" onRetry={() => {}} />}
        {chatbotS === 'success' && chatbotKpis && (
          <SectionCard title="Chatbot WhatsApp" icon={<Activity className="w-4 h-4 text-purple-600" />}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {[
                { l: 'Activas ahora',  v: chatbotKpis.ConversacionesActivas.toString() },
                { l: 'Hoy',            v: chatbotKpis.ConversacionesHoy.toString() },
                { l: 'Este mes',       v: chatbotKpis.ConversacionesMes.toString() },
              ].map(({ l, v }) => (
                <div key={l} className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400 mb-1">{l}</p>
                  <p className="text-xl font-bold text-gray-900">{v}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-6 text-sm mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="text-gray-600">Bot resolvió: <strong>{chatbotKpis.TasaResolucionBot}%</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                <span className="text-gray-600">Escalado: <strong>{chatbotKpis.TasaEscaladoHumano}%</strong></span>
              </div>
            </div>
            {chatbotKpis.IntencionesFrecuentes.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Intenciones frecuentes</p>
                <div className="space-y-1.5">
                  {chatbotKpis.IntencionesFrecuentes.map(i => (
                    <div key={i.Intencion} className="flex items-center gap-2 text-xs">
                      <span className="text-gray-600 w-32 truncate">{i.Intencion}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: `${i.PctTotal}%` }} />
                      </div>
                      <span className="text-gray-400 w-10 text-right">{i.Ocurrencias}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          US-DASH-AUTO · Acciones automáticas del día
          ══════════════════════════════════════════════════════════════════ */}
      <section>
        {autoS === 'loading' && <SkeletonChart />}
        {autoS === 'error'   && <ErrorSection title="Acciones Auto" onRetry={() => {}} />}
        {autoS === 'success' && autoActions && (
          <SectionCard title="Acciones automáticas hoy" icon={<Zap className="w-4 h-4 text-indigo-600" />}>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
              {[
                { l: 'Suspensiones',   v: autoActions.SuspensionesHoy,             color: autoActions.SuspensionesHoy > 0 ? 'text-red-600' : 'text-gray-400' },
                { l: 'Reactivaciones', v: autoActions.ReactivacionesHoy,           color: 'text-green-600' },
                { l: 'Facturas emit.', v: autoActions.FacturasEmitidasHoy,         color: 'text-blue-600' },
                { l: 'Recordatorios',  v: autoActions.RecordatoriosEnviadosHoy,    color: 'text-indigo-600' },
                { l: 'Vencidas',       v: autoActions.FacturasVencidasMarcadasHoy, color: autoActions.FacturasVencidasMarcadasHoy > 0 ? 'text-amber-600' : 'text-gray-400' },
              ].map(({ l, v, color }) => (
                <div key={l} className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400 mb-1">{l}</p>
                  <p className={`text-2xl font-bold ${color}`}>{v}</p>
                </div>
              ))}
            </div>
            {autoActions.Recientes.length > 0 && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {autoActions.Recientes.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs px-2 py-1.5 bg-gray-50 rounded-lg">
                    <span className="text-gray-400 shrink-0 font-mono">{fmtTime(a.OcurridoAt)}</span>
                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-medium ${
                      a.AreaModulo === 'Facturación'     ? 'bg-blue-100 text-blue-700' :
                      a.AreaModulo === 'Notificaciones'  ? 'bg-green-100 text-green-700' :
                      a.AreaModulo === 'Clientes'        ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{a.AreaModulo}</span>
                    <span className="text-gray-700 truncate">{a.Detalle || a.Accion}</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        )}
      </section>

      {showCustomize && (
        <DashboardCustomizeModal open={showCustomize} prefs={prefs} onSave={handleSavePrefs} onClose={() => setShowCustomize(false)} />
      )}
    </>
  );
}
