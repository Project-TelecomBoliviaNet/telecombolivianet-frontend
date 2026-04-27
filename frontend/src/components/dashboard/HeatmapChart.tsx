/**
 * HeatmapChart — Heatmap 24h x 3 métricas (Pagos / Tickets / WhatsApp).
 *
 * Props:
 *  data — Array of ActividadHoraDto (from dashboardService)
 */

import type { ActividadHoraDto } from '@/services/dashboardService';

interface HeatmapChartProps {
  data: ActividadHoraDto[];
}

const METRICS: { key: keyof ActividadHoraDto; label: string; color: string }[] = [
  { key: 'Pagos',    label: 'Pagos',    color: 'bg-blue-500'  },
  { key: 'Tickets',  label: 'Tickets',  color: 'bg-orange-400'},
  { key: 'WhatsApp', label: 'WhatsApp', color: 'bg-green-500' },
];

function intensity(value: number, max: number): string {
  if (max === 0 || value === 0) return 'opacity-10';
  const pct = value / max;
  if (pct < 0.2)  return 'opacity-20';
  if (pct < 0.4)  return 'opacity-40';
  if (pct < 0.6)  return 'opacity-60';
  if (pct < 0.8)  return 'opacity-80';
  return 'opacity-100';
}

export default function HeatmapChart({ data }: HeatmapChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-xs text-gray-400">
        Sin datos de actividad
      </div>
    );
  }

  // Sort by hour ascending
  const sorted = [...data].sort((a, b) => a.Hora - b.Hora);

  const maxPagos    = Math.max(...sorted.map((d) => d.Pagos),    1);
  const maxTickets  = Math.max(...sorted.map((d) => d.Tickets),  1);
  const maxWhatsApp = Math.max(...sorted.map((d) => d.WhatsApp), 1);
  const maxByKey: Record<string, number> = {
    Pagos:    maxPagos,
    Tickets:  maxTickets,
    WhatsApp: maxWhatsApp,
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[480px]">
        {/* Hour labels */}
        <div className="flex items-center gap-0.5 mb-1 pl-16">
          {sorted.map((d) => (
            <div
              key={d.Hora}
              className="flex-1 text-center text-[9px] text-gray-400"
            >
              {d.Hora === 0 ? '0h' : d.Hora % 4 === 0 ? `${d.Hora}h` : ''}
            </div>
          ))}
        </div>

        {/* Rows */}
        {METRICS.map(({ key, label, color }) => (
          <div key={key} className="flex items-center gap-0.5 mb-1">
            <span className="w-16 text-[10px] text-gray-500 shrink-0">{label}</span>
            {sorted.map((d) => {
              const val = d[key] as number;
              return (
                <div
                  key={d.Hora}
                  className={`flex-1 h-5 rounded-sm ${color} ${intensity(val, maxByKey[key]!)} cursor-default`}
                  title={`${d.Hora}:00 — ${val} ${label.toLowerCase()}`}
                />
              );
            })}
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center gap-3 mt-2 pl-16">
          <span className="text-[10px] text-gray-400">Menos</span>
          {['opacity-20', 'opacity-40', 'opacity-60', 'opacity-80', 'opacity-100'].map((o) => (
            <div key={o} className={`w-4 h-3 rounded-sm bg-blue-500 ${o}`} />
          ))}
          <span className="text-[10px] text-gray-400">Más</span>
        </div>
      </div>
    </div>
  );
}
