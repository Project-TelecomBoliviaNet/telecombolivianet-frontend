import { Banknote } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SectionCard from './SectionCard';
import { SkeletonChart, ErrorSection } from './SkeletonCard';
import { fmtBs } from '@/utils/dashboardFormatters';
import type { DashPagosDto } from '@/services/dashboardService';

type Status = 'loading' | 'error' | 'success';

export default function DashboardPagosSection({ dashPagos, status, onRetry }: {
  dashPagos: DashPagosDto | null; status: Status; onRetry: () => void;
}) {
  const navigate = useNavigate();

  if (status === 'loading') return <SkeletonChart />;
  if (status === 'error') return <ErrorSection title="Cobros" onRetry={onRetry} />;
  if (!dashPagos) return null;

  return (
    <SectionCard title="Cobros del mes" icon={<Banknote className="w-4 h-4 text-green-600" />}
      badge="Ver reporte" onBadgeClick={() => navigate('/payments')}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { l: 'Total hoy', v: fmtBs(dashPagos.TotalHoy), s: `${dashPagos.CountHoy} pagos` },
          { l: 'Total mes', v: fmtBs(dashPagos.TotalMes), s: `${dashPagos.CountMes} pagos` },
        ].map(({ l, v, s }) => (
          <div key={l} className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-400 mb-1">{l}</p>
            <p className="text-lg font-bold text-gray-900">{v}</p>
            <p className="text-xs text-gray-400">{s}</p>
          </div>
        ))}
        {dashPagos.PorMetodo.slice(0, 2).map(m => (
          <div key={m.Metodo} className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-400 mb-1">{m.Metodo}</p>
            <p className="text-lg font-bold text-gray-900">{fmtBs(m.Monto)}</p>
            <p className="text-xs text-gray-400">{m.PctMonto}%</p>
          </div>
        ))}
      </div>
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
  );
}
