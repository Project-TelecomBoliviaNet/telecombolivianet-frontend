import { Users, Banknote, AlertTriangle, FileCheck, Ticket, MessageCircle, Timer, CheckCircle2, WifiOff, TrendingUp } from 'lucide-react';
import KpiCard from './KpiCard';
import { SkeletonKpiCard, ErrorSection } from './SkeletonCard';
import { fmtBs, pctChange } from '@/utils/dashboardFormatters';
import type { DashboardKpisDto } from '@/services/dashboardService';

type Status = 'loading' | 'error' | 'success';

export default function DashboardKpisSection({ kpis, status, onRetry }: {
  kpis: DashboardKpisDto | null; status: Status; onRetry: () => void;
}) {
  if (status === 'loading') return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {Array.from({ length: 12 }).map((_, i) => <SkeletonKpiCard key={i} />)}
    </div>
  );
  if (status === 'error') return <ErrorSection title="No se pudieron cargar los KPIs." onRetry={onRetry} />;
  if (!kpis) return null;

  const pctCobros  = pctChange(kpis.CobradoEsteMes, kpis.CobradoMesAnterior);
  const crecNeto   = kpis.ClientesNuevosMes - kpis.ClientesCanceladosMes;

  return (
    <div className="space-y-3">
      {/* ── Clientes ── */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">👥 Clientes</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <KpiCard
            label="Activos"
            value={kpis.ClientesActivos.toLocaleString()}
            icon={<Users className="w-4 h-4 text-blue-500" />}
            accent="blue"
            sub={`${crecNeto >= 0 ? '▲' : '▼'} ${Math.abs(crecNeto)} neto · +${kpis.ClientesNuevosMes} altas · −${kpis.ClientesCanceladosMes} bajas`}
            subColor={crecNeto >= 0 ? 'text-green-600' : 'text-red-600'}
          />
          <KpiCard
            label="Suspendidos"
            value={kpis.ClientesSuspendidos.toLocaleString()}
            icon={<WifiOff className="w-4 h-4 text-amber-500" />}
            accent={kpis.ClientesSuspendidos > 0 ? 'amber' : 'gray'}
            sub={kpis.ClientesSuspendidos > 0 ? 'Requieren gestión de pago' : 'Sin suspensiones activas ✓'}
            subColor={kpis.ClientesSuspendidos > 0 ? 'text-amber-600' : 'text-green-600'}
          />
          <KpiCard
            label="Con Deuda"
            value={kpis.ClientesConDeuda.toLocaleString()}
            icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
            accent="red"
            sub={fmtBs(kpis.MontoDeudaTotal) + ' total en cartera'}
            subColor="text-red-600"
          />
        </div>
      </div>

      {/* ── Cobros ── */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">💰 Cobros</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <KpiCard
            label="Cobrado este mes"
            value={fmtBs(kpis.CobradoEsteMes)}
            icon={<Banknote className="w-4 h-4 text-green-500" />}
            accent="green"
            sub={pctCobros != null
              ? `${pctCobros >= 0 ? '▲' : '▼'} ${Math.abs(pctCobros)}% vs mes anterior`
              : `Mes anterior: ${fmtBs(kpis.CobradoMesAnterior)}`}
            subColor={pctCobros != null && pctCobros >= 0 ? 'text-green-600' : 'text-red-600'}
          />
          <KpiCard
            label="ARPU"
            value={fmtBs(kpis.Arpu)}
            icon={<TrendingUp className="w-4 h-4 text-indigo-500" />}
            accent="indigo"
            sub="Ingreso promedio por cliente activo"
          />
          <KpiCard
            label="Comprobantes pendientes"
            value={kpis.ComprobantesPendientes.toLocaleString()}
            icon={<FileCheck className="w-4 h-4 text-amber-500" />}
            accent={kpis.ComprobantesPendientes > 0 ? 'amber' : 'gray'}
            sub={kpis.ComprobantesPendientes > 0 ? 'Por revisar en bandeja WhatsApp' : 'Todo al día ✓'}
            subColor={kpis.ComprobantesPendientes > 0 ? 'text-amber-600' : 'text-green-600'}
          />
        </div>
      </div>

      {/* ── Tickets ── */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">🎫 Tickets</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard
            label="Tickets Activos"
            value={kpis.TicketsAbiertos.toLocaleString()}
            icon={<Ticket className="w-4 h-4 text-blue-500" />}
            accent="blue"
            sub={kpis.TicketsCriticos > 0 ? `⚠️ ${kpis.TicketsCriticos} críticos` : 'Sin críticos'}
            subColor={kpis.TicketsCriticos > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}
          />
          <KpiCard
            label="SLA Vencidos"
            value={kpis.TicketsSlaVencidos.toLocaleString()}
            icon={<Timer className="w-4 h-4 text-red-500" />}
            accent={kpis.TicketsSlaVencidos > 0 ? 'red' : 'gray'}
            sub={kpis.TicketsSlaVencidos > 0 ? 'Requieren atención urgente' : 'Todos en plazo ✓'}
            subColor={kpis.TicketsSlaVencidos > 0 ? 'text-red-600' : 'text-green-600'}
          />
          <KpiCard
            label="Resueltos hoy"
            value={kpis.TicketsResueltosHoy.toLocaleString()}
            icon={<CheckCircle2 className="w-4 h-4 text-green-500" />}
            accent="green"
            sub="Cerrados en el día"
            subColor="text-green-600"
          />
          <KpiCard
            label="WhatsApp hoy"
            value={kpis.MensajesWspHoy.toLocaleString()}
            icon={<MessageCircle className="w-4 h-4 text-green-500" />}
            accent="teal"
            sub="Comprobantes recibidos"
          />
        </div>
      </div>
    </div>
  );
}
