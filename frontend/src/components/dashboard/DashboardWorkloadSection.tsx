import { SkeletonChart, ErrorSection } from './SkeletonCard';
import SectionCard from './SectionCard';
import { HardHat } from 'lucide-react';
import type { WorkloadTecnicosDto } from '@/services/dashboardService';

type Status = 'loading' | 'error' | 'success';

function barColor(tickets: number): string {
  if (tickets >= 10) return 'bg-red-500';
  if (tickets >= 6)  return 'bg-amber-400';
  if (tickets >= 3)  return 'bg-yellow-300';
  return 'bg-green-400';
}

export default function DashboardWorkloadSection({
  data, status, onRetry,
}: { data: WorkloadTecnicosDto | null; status: Status; onRetry: () => void }) {
  if (status === 'loading') return <SkeletonChart />;
  if (status === 'error')   return <ErrorSection title="No se pudo cargar el workload de técnicos." onRetry={onRetry} />;
  if (!data) return null;

  const maxTickets = Math.max(...data.Tecnicos.map(t => t.TicketsActivos), 1);

  return (
    <SectionCard
      title="Carga de Técnicos"
      icon={<HardHat className="w-4 h-4 text-blue-500" />}
      subtitle={data.TotalSinAsignar > 0
        ? `⚠️ ${data.TotalSinAsignar} tickets sin asignar`
        : 'Todos los tickets están asignados ✓'}
    >
      {data.Tecnicos.length === 0 ? (
        <p className="text-sm text-gray-400">Sin tickets activos en este momento.</p>
      ) : (
        <div className="space-y-2.5">
          {data.Tecnicos.map(t => (
            <div key={t.TecnicoNombre} className="flex items-center gap-3">
              <div className="w-28 text-sm text-gray-700 truncate font-medium" title={t.TecnicoNombre}>
                {t.TecnicoNombre}
              </div>
              <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all ${barColor(t.TicketsActivos)}`}
                  style={{ width: `${(t.TicketsActivos / maxTickets) * 100}%` }}
                />
              </div>
              <div className="text-sm font-bold text-gray-800 w-6 text-right">{t.TicketsActivos}</div>
              {t.TicketsCriticos > 0 && (
                <span className="text-xs text-red-600 font-semibold w-10">⚠️ {t.TicketsCriticos}</span>
              )}
              {t.TicketsEnVisita > 0 && (
                <span className="text-xs text-blue-500 w-12">{t.TicketsEnVisita} visita</span>
              )}
              <div className="text-xs text-gray-400 w-16 text-right shrink-0">
                {t.PromedioHorasAbierto}h prom.
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
