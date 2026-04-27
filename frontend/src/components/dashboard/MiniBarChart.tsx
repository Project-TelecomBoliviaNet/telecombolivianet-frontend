/**
 * MiniBarChart — Gráfico de barras simple para tendencia mensual.
 */

import type { TendenciaMes } from '@/services/dashboardService';

interface MiniBarChartProps {
  meses:  TendenciaMes[];
  height?: number;
}

export default function MiniBarChart({ meses, height = 160 }: MiniBarChartProps) {
  if (!meses || meses.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs text-gray-400"
        style={{ height }}
      >
        Sin datos
      </div>
    );
  }

  const max = Math.max(...meses.map((m) => m.Total), 1);
  const fmtBs = (v: number) =>
    `Bs ${v.toLocaleString('es-BO', { minimumFractionDigits: 0 })}`;

  return (
    <div style={{ height }} className="flex items-end gap-1.5">
      {meses.map((m) => {
        const pct = Math.max((m.Total / max) * 100, 2);
        return (
          <div key={m.Mes} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
            {/* Tooltip */}
            <div className="hidden group-hover:flex flex-col items-center pointer-events-none">
              <div className="bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap">
                {fmtBs(m.Total)}
                <br />
                <span className="text-gray-300">{m.Cantidad} pagos</span>
              </div>
              <div className="w-1.5 h-1.5 bg-gray-800 rotate-45 -mt-[3px]" />
            </div>

            {/* Bar */}
            <div
              className="w-full rounded-t-md bg-blue-500 hover:bg-blue-600 transition-colors cursor-default"
              style={{ height: `${pct}%` }}
            />

            {/* Label */}
            <span className="text-[10px] text-gray-400 truncate max-w-full px-0.5 leading-none">
              {m.Mes}
            </span>
          </div>
        );
      })}
    </div>
  );
}
