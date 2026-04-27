import type { TicketListItemDto } from '@/types/ticket.types';

// ── Constantes compartidas ────────────────────────────────────────────────────

export const TICKET_TYPES: Record<string, string> = {
  SoporteTecnico: 'Soporte Técnico', InstalacionNueva: 'Instalación Nueva',
  CambioPlan: 'Cambio de Plan', TvCable: 'TV Cable',
  ReactivacionServicio: 'Reactivación', BajaServicio: 'Baja de Servicio',
  RecoleccionEquipo: 'Recolección Equipo',
};
export const PRIORITIES  = ['Critica', 'Alta', 'Media', 'Baja'];
export const STATUSES    = ['Abierto', 'EnProceso', 'Resuelto', 'Cerrado'];
export const KANBAN_ORDER  = ['Abierto', 'EnProceso', 'Resuelto', 'Cerrado'];
export const KANBAN_LABELS: Record<string, string> = {
  Abierto: 'Abierto', EnProceso: 'En Proceso', Resuelto: 'Resuelto', Cerrado: 'Cerrado',
};
export const KANBAN_COLORS: Record<string, { border: string; head: string }> = {
  Abierto:   { border: 'border-blue-300 bg-blue-50',    head: 'bg-blue-100 text-blue-800' },
  EnProceso: { border: 'border-yellow-300 bg-yellow-50', head: 'bg-yellow-100 text-yellow-800' },
  Resuelto:  { border: 'border-green-300 bg-green-50',   head: 'bg-green-100 text-green-800' },
  Cerrado:   { border: 'border-gray-200 bg-gray-50',     head: 'bg-gray-100 text-gray-600' },
};
export const STATUS_LABELS: Record<string, string> = {
  EnProceso: 'Marcar En Proceso', Resuelto: 'Marcar Resuelto',
  Cerrado: 'Cerrar Ticket', Abierto: 'Reabrir',
};
export const NEXT_STATUS: Record<string, string[]> = {
  Abierto:   ['EnProceso'],
  EnProceso: ['Resuelto'],
  Resuelto:  ['Cerrado', 'EnProceso'],
  Cerrado:   [],
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
    Abierto: 'bg-blue-100 text-blue-700', EnProceso: 'bg-yellow-100 text-yellow-700',
    Resuelto: 'bg-green-100 text-green-700', Cerrado: 'bg-gray-100 text-gray-500',
  };
  const labels: Record<string, string> = {
    Abierto: 'Abierto', EnProceso: 'En Proceso', Resuelto: 'Resuelto', Cerrado: 'Cerrado',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls[s] ?? 'bg-gray-100'}`}>
      {labels[s] ?? s}
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
