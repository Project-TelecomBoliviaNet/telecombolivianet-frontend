import { AlertTriangle } from 'lucide-react';
import type { TicketListItemDto, SlaAlertsDto, SlaAlertItemDto } from '@/types/ticket.types';

// ── Constantes compartidas ────────────────────────────────────────────────────

export const TICKET_TYPES: Record<string, string> = {
  SoporteTecnico: 'Soporte Técnico', InstalacionNueva: 'Instalación Nueva',
  CambioPlan: 'Cambio de Plan', TvCable: 'TV Cable',
  ReactivacionServicio: 'Reactivación', BajaServicio: 'Baja de Servicio',
  RecoleccionEquipo: 'Recolección Equipo',
};
export const PRIORITIES  = ['Critica', 'Alta', 'Media', 'Baja'];
export const STATUSES    = ['Abierto', 'EnProceso', 'EnVisita', 'PendienteCliente', 'Resuelto', 'Cerrado'];
export const KANBAN_ORDER  = ['Abierto', 'EnProceso', 'EnVisita', 'PendienteCliente', 'Resuelto', 'Cerrado'];
export const KANBAN_LABELS: Record<string, string> = {
  Abierto: 'Abierto', EnProceso: 'En Proceso',
  EnVisita: 'En Visita',
  PendienteCliente: 'En Espera Cliente',
  Resuelto: 'Resuelto', Cerrado: 'Cerrado',
};
export const KANBAN_COLORS: Record<string, { border: string; head: string }> = {
  Abierto:          { border: 'border-blue-300 bg-blue-50',      head: 'bg-blue-100 text-blue-800' },
  EnProceso:        { border: 'border-yellow-300 bg-yellow-50',  head: 'bg-yellow-100 text-yellow-800' },
  EnVisita:         { border: 'border-indigo-300 bg-indigo-50',  head: 'bg-indigo-100 text-indigo-800' },
  PendienteCliente: { border: 'border-purple-300 bg-purple-50',  head: 'bg-purple-100 text-purple-800' },
  Resuelto:         { border: 'border-green-300 bg-green-50',    head: 'bg-green-100 text-green-800' },
  Cerrado:          { border: 'border-gray-200 bg-gray-50',      head: 'bg-gray-100 text-gray-600' },
};
export const STATUS_LABELS: Record<string, string> = {
  EnProceso:        'Marcar En Proceso',
  EnVisita:         'Marcar En Visita',
  PendienteCliente: 'Poner en espera',
  Resuelto:         'Marcar Resuelto',
  Cerrado:          'Cerrar Ticket',
  Abierto:          'Reabrir',
};
export const NEXT_STATUS: Record<string, string[]> = {
  Abierto:           ['EnProceso', 'PendienteCliente'],
  EnProceso:         ['EnVisita', 'Resuelto', 'PendienteCliente'],
  EnVisita:          ['EnProceso', 'Resuelto'],
  PendienteCliente:  ['EnProceso'],
  Resuelto:          ['Cerrado', 'EnProceso'],
  Cerrado:           [],
};

// ── Formateadores ─────────────────────────────────────────────────────────────

export function fmtMs(ms: number): string {
  const s = Math.floor(ms / 1000), m = Math.floor(s / 60);
  const h = Math.floor(m / 60),    d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}

export function fmtMinutes(min: number): string {
  const h = Math.floor(min / 60), m = min % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export function getSlaInfo(t: TicketListItemDto) {
  const now = Date.now();
  if (t.Status === 'Resuelto' || t.Status === 'Cerrado') {
    if (t.ResolvedAt) {
      const ms = new Date(t.ResolvedAt).getTime() - new Date(t.CreatedAt).getTime();
      const ok = t.SlaCompliant;
      return {
        label: `Resuelto en ${fmtMs(ms)}`,
        color: ok === true ? 'text-green-600' : ok === false ? 'text-red-500' : 'text-gray-500',
        badge: ok === true ? 'CUMPLIDO' : ok === false ? 'INCUMPLIDO' : null as string | null,
      };
    }
    return { label: 'Cerrado', color: 'text-gray-400', badge: null as string | null };
  }
  if (t.Status === 'PendienteCliente') {
    return { label: 'SLA en pausa — esperando cliente', color: 'text-purple-600', badge: 'EN PAUSA' as string | null };
  }
  if (t.Status === 'EnVisita') {
    return { label: 'Técnico en visita técnica', color: 'text-indigo-600', badge: 'EN VISITA' as string | null };
  }
  if (!t.DueDate) {
    const elapsed = now - new Date(t.CreatedAt).getTime();
    return { label: `Abierto hace ${fmtMs(elapsed)}`, color: 'text-gray-500', badge: null as string | null };
  }
  const due = new Date(t.DueDate).getTime(), total = due - new Date(t.CreatedAt).getTime(), diff = due - now;
  if (diff < 0)
    return { label: `SLA vencido hace ${fmtMs(-diff)}`, color: 'text-red-600 font-semibold', badge: 'VENCIDO' as string | null };
  const pct   = total > 0 ? diff / total : 1;
  const color = pct > 0.50 ? 'text-green-600' : pct > 0.25 ? 'text-yellow-600 font-medium' : 'text-orange-500 font-semibold';
  return { label: `Vence en ${fmtMs(diff)}`, color, badge: null as string | null };
}

// ── Badges JSX ────────────────────────────────────────────────────────────────

export function priorityBadge(p: string) {
  const map: Record<string, string> = {
    Critica: 'bg-red-100 text-red-800', Alta: 'bg-orange-100 text-orange-800',
    Media: 'bg-yellow-100 text-yellow-800', Baja: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[p] ?? 'bg-gray-100'}`}>
      {p}
    </span>
  );
}

export function statusBadge(s: string) {
  const cls: Record<string, string> = {
    Abierto:          'bg-blue-100 text-blue-700',
    EnProceso:        'bg-yellow-100 text-yellow-700',
    EnVisita:         'bg-indigo-100 text-indigo-700',
    PendienteCliente: 'bg-purple-100 text-purple-700',
    Resuelto:         'bg-green-100 text-green-700',
    Cerrado:          'bg-gray-100 text-gray-500',
  };
  const labels: Record<string, string> = {
    Abierto:          'Abierto',
    EnProceso:        'En Proceso',
    EnVisita:         'En Visita',
    PendienteCliente: 'En Espera',
    Resuelto:         'Resuelto',
    Cerrado:          'Cerrado',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls[s] ?? 'bg-gray-100'}`}>
      {labels[s] ?? s}
    </span>
  );
}

export function typeBadge(t: string) {
  const colors: Record<string, string> = {
    SoporteTecnico:      'bg-blue-100 text-blue-800',
    InstalacionNueva:    'bg-green-100 text-green-800',
    CambioPlan:          'bg-orange-100 text-orange-800',
    TvCable:             'bg-purple-100 text-purple-800',
    ReactivacionServicio:'bg-teal-100 text-teal-800',
    BajaServicio:        'bg-red-100 text-red-700',
    RecoleccionEquipo:   'bg-gray-100 text-gray-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[t] ?? 'bg-gray-100 text-gray-600'}`}>
      {TICKET_TYPES[t] ?? t}
    </span>
  );
}

export function commentTypeBadge(type: string) {
  if (type === 'RespuestaCliente')
    return <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Respuesta cliente</span>;
  if (type === 'CausaRaiz')
    return <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">Causa raíz</span>;
  return <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">Nota interna</span>;
}

// ── SLA Alerts Banner (movido desde DashboardPage) ────────────────────────────

type SlaLevel = 'Breached' | 'Warning' | 'Attention';

interface SlaLevelStyle { bg: string; dot: string; text: string; label: string; }

export const SLA_LEVEL_STYLES: Record<SlaLevel, SlaLevelStyle> = {
  Breached:  { bg: 'bg-red-50 border-red-200',       dot: 'bg-red-500',    text: 'text-red-700',    label: 'SLA VENCIDO'    },
  Warning:   { bg: 'bg-orange-50 border-orange-200',  dot: 'bg-orange-500', text: 'text-orange-700', label: '>75% consumido' },
  Attention: { bg: 'bg-yellow-50 border-yellow-200',  dot: 'bg-yellow-400', text: 'text-yellow-800', label: '>50% consumido' },
};

export const SLA_PRIO_BADGE: Record<string, string> = {
  Critica: 'bg-red-600 text-white', Alta: 'bg-orange-500 text-white',
  Media: 'bg-yellow-400 text-gray-900', Baja: 'bg-gray-200 text-gray-700',
};

export function fmtSlaTime(minutesLeft: number, level: SlaLevel): string {
  if (level === 'Breached') {
    const over = -minutesLeft;
    const h = Math.floor(over / 60);
    const m = over % 60;
    return h > 0 ? `vencido hace ${h}h ${m}m` : `vencido hace ${over}m`;
  }
  const h = Math.floor(minutesLeft / 60);
  const m = minutesLeft % 60;
  return h > 0 ? `vence en ${h}h ${m}m` : `vence en ${minutesLeft}m`;
}

function SlaAlertRow({ item, onNavigate }: { item: SlaAlertItemDto; onNavigate: () => void }) {
  const s = SLA_LEVEL_STYLES[item.Level];
  const minutesLeft = Math.round((new Date(item.DueDate).getTime() - Date.now()) / 60000);
  const prioBadge   = SLA_PRIO_BADGE[item.Priority] ?? 'bg-gray-200 text-gray-700';

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${s.bg} cursor-pointer hover:brightness-95 transition-all`}
      onClick={onNavigate}
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
      <span className={`text-xs font-mono shrink-0 ${s.text}`}>{item.TicketNumber || '#—'}</span>
      <span className={`text-xs px-1.5 py-0.5 rounded font-semibold shrink-0 ${prioBadge}`}>{item.Priority}</span>
      <span className="text-xs font-medium text-gray-800 truncate flex-1">{item.Subject}</span>
      <span className="text-xs text-gray-500 shrink-0 hidden sm:block truncate max-w-[100px]">{item.ClientName}</span>
      <span className={`text-xs font-semibold shrink-0 ${s.text}`}>{fmtSlaTime(minutesLeft, item.Level)}</span>
      <span className="text-xs text-gray-400 shrink-0">{item.PctElapsed}%</span>
    </div>
  );
}

interface SlaAlertsBannerProps { alerts: SlaAlertsDto; onNavigate: () => void; }

export function SlaAlertsBanner({ alerts, onNavigate }: SlaAlertsBannerProps) {
  const total = alerts.Breached.length + alerts.Warning.length + alerts.Attention.length;
  if (total === 0) return null;

  const groups = [
    { key: 'Breached'  as SlaLevel, items: alerts.Breached  },
    { key: 'Warning'   as SlaLevel, items: alerts.Warning   },
    { key: 'Attention' as SlaLevel, items: alerts.Attention },
  ].filter(g => g.items.length > 0);

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/50 overflow-hidden shadow-sm mb-4">
      <div className="flex items-center justify-between px-4 py-3 bg-red-50 border-b border-red-100">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span className="text-sm font-semibold text-red-800">
            Alertas SLA — {total} ticket{total !== 1 ? 's' : ''} requieren atención
          </span>
          {alerts.Breached.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white">
              {alerts.Breached.length} vencido{alerts.Breached.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div className="p-3 space-y-4">
        {groups.map(({ key, items }) => {
          const s = SLA_LEVEL_STYLES[key];
          return (
            <div key={key}>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-1.5 flex items-center gap-1.5 ${s.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                {s.label} · {items.length} ticket{items.length !== 1 ? 's' : ''}
              </p>
              <div className="space-y-1">
                {items.slice(0, 5).map(item => (
                  <SlaAlertRow key={item.Id} item={item} onNavigate={onNavigate} />
                ))}
                {items.length > 5 && (
                  <button className={`text-xs ${s.text} hover:underline pl-2`} onClick={onNavigate}>
                    Ver {items.length - 5} más →
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
