/**
 * ZonasBars — Barras horizontales por zona geográfica.
 *
 * Props:
 *  zonas — Array of ClientesPorZonaDto
 */

import type { ClientesPorZonaDto } from '@/services/dashboardService';

interface ZonasBarsProps {
  zonas: ClientesPorZonaDto[];
}

export default function ZonasBars({ zonas }: ZonasBarsProps) {
  if (!zonas || zonas.length === 0) {
    return (
      <div className="flex items-center justify-center h-20 text-xs text-gray-400">
        Sin datos de zonas
      </div>
    );
  }

  const maxTotal = Math.max(...zonas.map((z) => z.Total), 1);

  return (
    <div className="space-y-2.5">
      {zonas.map((z) => {
        const pctActivos  = z.Total > 0 ? (z.Activos  / z.Total) * 100 : 0;
        const pctDeuda    = z.Total > 0 ? (z.ConDeuda / z.Total) * 100 : 0;
        const barWidth    = (z.Total / maxTotal) * 100;

        return (
          <div key={z.Zona}>
            {/* Name + counts */}
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs font-medium text-gray-700 truncate max-w-[50%]">
                {z.Zona}
              </span>
              <div className="flex items-center gap-2 text-[10px] text-gray-400 shrink-0">
                <span className="text-green-600 font-medium">{z.Activos} activos</span>
                {z.ConDeuda > 0 && (
                  <span className="text-red-500 font-medium">{z.ConDeuda} con deuda</span>
                )}
                <span className="text-gray-500">{z.Total} total</span>
              </div>
            </div>

            {/* Stacked bar */}
            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full flex rounded-full overflow-hidden"
                style={{ width: `${barWidth}%` }}
              >
                <div
                  className="bg-green-500 h-full"
                  style={{ width: `${pctActivos}%` }}
                />
                <div
                  className="bg-red-400 h-full"
                  style={{ width: `${pctDeuda}%` }}
                />
                <div className="bg-gray-300 h-full flex-1" />
              </div>
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="flex items-center gap-4 pt-1">
        {[
          { color: 'bg-green-500', label: 'Activos' },
          { color: 'bg-red-400',   label: 'Con deuda' },
          { color: 'bg-gray-300',  label: 'Otros' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <span className={`w-2.5 h-2.5 rounded-sm ${color}`} />
            <span className="text-[10px] text-gray-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
