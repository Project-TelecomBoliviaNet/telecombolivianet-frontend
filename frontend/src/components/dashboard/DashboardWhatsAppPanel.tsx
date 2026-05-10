import { MessageCircle, Clock } from 'lucide-react';
import SectionCard from './SectionCard';
import HeatmapChart from './HeatmapChart';
import { SkeletonTable, SkeletonChart, ErrorSection } from './SkeletonCard';
import { fmtBs, WSP_BADGE } from '@/utils/dashboardFormatters';
import type { WhatsAppActividadDto, ActividadHoraDto } from '@/services/dashboardService';

type Status = 'loading' | 'error' | 'success';

interface Props {
  wsp: WhatsAppActividadDto[] | null;  wspS: Status; wspR: () => void;
  heatmap: ActividadHoraDto[] | null;  heatS: Status; heatR: () => void;
}

export default function DashboardWhatsAppPanel({ wsp, wspS, wspR, heatmap, heatS, heatR }: Props) {
  return (
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
  );
}
