import { Ticket, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SectionCard from './SectionCard';
import { SkeletonChart, ErrorSection } from './SkeletonCard';
import { fmtDate, PRIO_BADGE } from '@/utils/dashboardFormatters';
import type { DashTicketsMetricasDto } from '@/services/dashboardService';

type Status = 'loading' | 'error' | 'success';

export default function DashboardTicketsMetricas({ tMetricas, status, onRetry }: {
  tMetricas: DashTicketsMetricasDto | null; status: Status; onRetry: () => void;
}) {
  const navigate = useNavigate();

  if (status === 'loading') return <SkeletonChart />;
  if (status === 'error') return <ErrorSection title="Métricas Tickets" onRetry={onRetry} />;
  if (!tMetricas) return null;

  return (
    <SectionCard title="Métricas de Tickets" icon={<Ticket className="w-4 h-4 text-orange-600" />}
      badge="Ver tickets" onBadgeClick={() => navigate('/tickets')}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { l: 'Abiertos',     v: tMetricas.TotalAbiertos.toString(),    color: 'text-blue-700' },
          { l: 'En proceso',   v: tMetricas.TotalEnProceso.toString(),   color: 'text-orange-700' },
          { l: 'SLA vencido',  v: tMetricas.TotalVencidosSla.toString(), color: tMetricas.TotalVencidosSla > 0 ? 'text-red-700' : 'text-green-700' },
          { l: 'SLA cumplido', v: `${tMetricas.SlaCompliancePct}%`,      color: tMetricas.SlaCompliancePct >= 80 ? 'text-green-700' : 'text-red-700' },
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
                onClick={() => navigate('/tickets')}>
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
  );
}
