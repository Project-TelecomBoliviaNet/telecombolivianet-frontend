import { MessageCircle, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SectionCard from './SectionCard';
import { SkeletonChart, ErrorSection } from './SkeletonCard';
import type { DashNotifDto } from '@/services/dashboardService';

type Status = 'loading' | 'error' | 'success';

export default function DashboardNotifSection({ notifStats, status, onRetry }: {
  notifStats: DashNotifDto | null; status: Status; onRetry: () => void;
}) {
  const navigate = useNavigate();

  if (status === 'loading') return <SkeletonChart />;
  if (status === 'error') return <ErrorSection title="Notificaciones" onRetry={onRetry} />;
  if (!notifStats) return null;

  return (
    <SectionCard title="Notificaciones WhatsApp (24h)" icon={<MessageCircle className="w-4 h-4 text-green-600" />}
      badge="Configurar" onBadgeClick={() => navigate('/notifications/config')}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { l: 'Enviadas',   v: notifStats.EnviadasUlt24h.toString(),   color: 'text-green-700' },
          { l: 'Fallidas',   v: notifStats.FallidasUlt24h.toString(),   color: notifStats.FallidasUlt24h > 0 ? 'text-red-700' : 'text-gray-400' },
          { l: 'En cola',    v: notifStats.PendientesEnCola.toString(), color: 'text-blue-700' },
          { l: 'Tasa éxito', v: `${notifStats.TasaExitoUlt24h}%`,       color: notifStats.TasaExitoUlt24h >= 90 ? 'text-green-700' : 'text-red-700' },
        ].map(({ l, v, color }) => (
          <div key={l} className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-400 mb-1">{l}</p>
            <p className={`text-xl font-bold ${color}`}>{v}</p>
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        {notifStats.PorTipo.slice(0, 5).map(t => (
          <div key={t.NotifTipo} className="flex items-center justify-between text-xs px-2 py-1.5 rounded bg-gray-50">
            <span className="text-gray-600 font-medium truncate">{t.NotifTipo}</span>
            <div className="flex items-center gap-3 shrink-0 ml-2">
              <span className="text-green-700 font-medium">✓ {t.Enviadas}</span>
              {t.Fallidas > 0 && <span className="text-red-600 font-medium">✗ {t.Fallidas}</span>}
            </div>
          </div>
        ))}
      </div>
      {notifStats.OmitidosAntispam > 0 && (
        <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
          <Zap className="w-3 h-3" /> {notifStats.OmitidosAntispam} omitidos por anti-spam
        </p>
      )}
    </SectionCard>
  );
}
