import { fmtBs } from '@/utils/dashboardFormatters';
import { SkeletonChart, ErrorSection } from './SkeletonCard';
import SectionCard from './SectionCard';
import { AlertTriangle } from 'lucide-react';
import type { AgingCarteraDto } from '@/services/dashboardService';

type Status = 'loading' | 'error' | 'success';

const BUCKET_STYLES: Record<string, { bar: string; badge: string; text: string }> = {
  '0-30':  { bar: 'bg-yellow-400', badge: 'bg-yellow-100 text-yellow-800', text: 'text-yellow-700' },
  '31-60': { bar: 'bg-orange-400', badge: 'bg-orange-100 text-orange-800', text: 'text-orange-700' },
  '61-90': { bar: 'bg-red-400',    badge: 'bg-red-100 text-red-800',       text: 'text-red-700'    },
  '+90':   { bar: 'bg-red-700',    badge: 'bg-red-200 text-red-900',       text: 'text-red-900 font-bold' },
};

export default function DashboardAgingSection({
  data, status, onRetry,
}: { data: AgingCarteraDto | null; status: Status; onRetry: () => void }) {
  if (status === 'loading') return <SkeletonChart />;
  if (status === 'error')   return <ErrorSection title="No se pudo cargar el aging de cartera." onRetry={onRetry} />;
  if (!data) return null;

  const maxMonto = Math.max(...data.Buckets.map(b => b.MontoTotal), 1);

  return (
    <SectionCard
      title="Aging de Cartera"
      icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
      subtitle={`${data.TotalFacturas} facturas vencidas · ${fmtBs(data.TotalCartera)} total`}
    >
      <div className="space-y-3">
        {data.Buckets.map(b => {
          const styles = BUCKET_STYLES[b.Rango] ?? BUCKET_STYLES['0-30'];
          const pct    = data.TotalCartera > 0 ? Math.round(b.MontoTotal / data.TotalCartera * 100) : 0;
          return (
            <div key={b.Rango} className="flex items-center gap-3">
              <div className={`text-xs font-bold w-12 text-right ${styles.text}`}>{b.Rango}d</div>
              <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all ${styles.bar}`}
                  style={{ width: `${(b.MontoTotal / maxMonto) * 100}%` }}
                />
              </div>
              <div className="text-sm font-semibold text-gray-800 w-24 text-right">{fmtBs(b.MontoTotal)}</div>
              <div className="text-xs text-gray-400 w-14 text-right">{pct}%</div>
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${styles.badge}`}>
                {b.ClientesCount} cli.
              </span>
            </div>
          );
        })}
        {data.TotalFacturas === 0 && (
          <p className="text-sm text-green-600 text-center py-2">Sin cartera vencida ✓</p>
        )}
      </div>
    </SectionCard>
  );
}
