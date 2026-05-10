import { useState, useCallback } from 'react';
import { LayoutDashboard, Settings, TrendingUp, Activity, Banknote } from 'lucide-react';

import { useAuthStore }      from '@/store/authStore';
import { usePageTitle }      from '@/hooks/usePageTitle';
import { useDashboardStore } from '@/store/dashboardStore';
import { dashboardService }  from '@/services/dashboardService';
import type { DashboardPreferences } from '@/services/dashboardService';
import { useAsyncSection }   from '@/hooks/useAsyncSection';
import { METODO_COLOR }      from '@/utils/dashboardFormatters';

import MiniBarChart          from '@/components/dashboard/MiniBarChart';
import DonutChart            from '@/components/dashboard/DonutChart';
import SectionCard           from '@/components/dashboard/SectionCard';
import { SkeletonChart, ErrorSection } from '@/components/dashboard/SkeletonCard';

import DashboardCustomizeModal  from '@/components/dashboard/DashboardCustomizeModal';
import DashboardKpisSection     from '@/components/dashboard/DashboardKpisSection';
import DashboardTicketsPanel    from '@/components/dashboard/DashboardTicketsPanel';
import DashboardWhatsAppPanel   from '@/components/dashboard/DashboardWhatsAppPanel';
import DashboardDeudoresPanel   from '@/components/dashboard/DashboardDeudoresPanel';
import DashboardComprobantes    from '@/components/dashboard/DashboardComprobantes';
import DashboardPagosSection    from '@/components/dashboard/DashboardPagosSection';
import DashboardTicketsMetricas from '@/components/dashboard/DashboardTicketsMetricas';
import DashboardNotifSection    from '@/components/dashboard/DashboardNotifSection';
import DashboardChatbotSection  from '@/components/dashboard/DashboardChatbotSection';
import DashboardAutoSection          from '@/components/dashboard/DashboardAutoSection';
import DashboardAgingSection         from '@/components/dashboard/DashboardAgingSection';
import DashboardProximosCortSection  from '@/components/dashboard/DashboardProximosCortSection';
import DashboardWorkloadSection      from '@/components/dashboard/DashboardWorkloadSection';

export default function DashboardPage() {
  usePageTitle('Dashboard');
  const userId = useAuthStore(s => s.userId); // FIX-25
  const [showCustomize, setShowCustomize] = useState(false);

  const getPrefs      = useDashboardStore(s => s.getPrefs);
  const storeSetPrefs = useDashboardStore(s => s.setPrefs);
  const prefs = getPrefs(userId ?? '');

  const [tendMeses, setTendMeses] = useState<3 | 6 | 12>(6); // F4: selector de meses

  const kpiF     = useCallback(() => dashboardService.getKpis(), []);
  const tendF    = useCallback(() => dashboardService.getTendenciaCobros(tendMeses), [tendMeses]);
  const metodF   = useCallback(() => dashboardService.getMetodosPago(), []);
  const tEstF    = useCallback(() => dashboardService.getTicketsEstado(), []);
  const tUrgF    = useCallback(() => dashboardService.getTicketsUrgentes(), []);
  const tTipoF   = useCallback(() => dashboardService.getTicketsPorTipo(), []);
  const tResolF  = useCallback(() => dashboardService.getResolucionPromedio(), []);
  const wspF     = useCallback(() => dashboardService.getWhatsAppActividad(), []);
  const deudF    = useCallback(() => dashboardService.getDeudores(), []);
  const compF    = useCallback(() => dashboardService.getComprobantesRecientes(), []);
  const zonaF    = useCallback(() => dashboardService.getClientesPorZona(), []);
  const heatF    = useCallback(() => dashboardService.getActividadHoras(), []);
  const pagosF   = useCallback(() => dashboardService.getDashPagos(), []);
  const tMetricF = useCallback(() => dashboardService.getDashTicketsMetricas(), []);
  const notifF   = useCallback(() => dashboardService.getDashNotifStats(), []);
  const chatbotF = useCallback(() => dashboardService.getDashChatbotKpis(), []);
  const autoF    = useCallback(() => dashboardService.getDashAutoActions(), []);
  const agingF   = useCallback(() => dashboardService.getAgingCartera(), []);
  const cortF    = useCallback(() => dashboardService.getProximosCorte(7), []);
  const workF    = useCallback(() => dashboardService.getWorkloadTecnicos(), []);

  const { data: kpis,        status: kpisS,    retry: kpisR }    = useAsyncSection(kpiF);
  const { data: tend,        status: tendS,    retry: tendR }    = useAsyncSection(tendF);
  const { data: metodos,     status: metodS,   retry: metodR }   = useAsyncSection(metodF);
  const { data: tEst,        status: tEstS,    retry: tEstR }    = useAsyncSection(tEstF);
  const { data: tUrg,        status: tUrgS,    retry: tUrgR }    = useAsyncSection(tUrgF);
  const { data: tTipo,       status: tTipoS,   retry: tTipoR }   = useAsyncSection(tTipoF);
  const { data: tResol,      status: tResolS,  retry: tResolR }  = useAsyncSection(tResolF);
  const { data: wsp,         status: wspS,     retry: wspR }     = useAsyncSection(wspF);
  const { data: deudores,    status: deudS,    retry: deudR }    = useAsyncSection(deudF);
  const { data: comprob,     status: compS,    retry: compR }    = useAsyncSection(compF);
  const { data: zonas,       status: zonaS,    retry: zonaR }    = useAsyncSection(zonaF);
  const { data: heatmap,     status: heatS,    retry: heatR }    = useAsyncSection(heatF);
  const { data: dashPagos,   status: pagosS,   retry: pagosR }   = useAsyncSection(pagosF);
  const { data: tMetricas,   status: tMetricS, retry: tMetricR } = useAsyncSection(tMetricF);
  const { data: notifStats,  status: notifS,   retry: notifR }   = useAsyncSection(notifF);
  const { data: chatbotKpis, status: chatbotS, retry: chatbotR } = useAsyncSection(chatbotF);
  const { data: autoActions, status: autoS,    retry: autoR }    = useAsyncSection(autoF);
  const { data: aging,       status: agingS,   retry: agingR }   = useAsyncSection(agingF);
  const { data: proxCorte,   status: cortS,    retry: cortR }    = useAsyncSection(cortF);
  const { data: workload,    status: workS,    retry: workR }    = useAsyncSection(workF);

  const handleSavePrefs = async (p: DashboardPreferences) => {
    await dashboardService.savePreferences(userId!, p);
    storeSetPrefs(userId ?? '', p);
  };

  const metodoSlices = (metodos ?? []).map(m => ({
    label: m.Metodo, value: m.Cantidad, color: METODO_COLOR[m.Metodo] ?? '#9ca3af',
  }));

  const noVisible = Object.values(prefs).every(v => !v);

  return (
    <>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl shadow-sm shadow-blue-200">
            <LayoutDashboard className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle capitalize">
              {new Date().toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>
        <button onClick={() => setShowCustomize(true)} className="btn-secondary text-xs px-3 py-1.5">
          <Settings className="w-3.5 h-3.5" /> Personalizar
        </button>
      </div>

      <div className="p-5 space-y-5 bg-gray-50 min-h-screen">

        {prefs.ShowKpis && (
          <section>
            <DashboardKpisSection kpis={kpis} status={kpisS} onRetry={kpisR} />
          </section>
        )}

        {(prefs.ShowTendencia || prefs.ShowMetodosPago) && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {prefs.ShowTendencia && (
              <div className="lg:col-span-2">
                {tendS === 'loading' && <SkeletonChart />}
                {tendS === 'error' && <ErrorSection title="Error cargando tendencia de cobros." onRetry={tendR} />}
                {tendS === 'success' && tend && (
                  <SectionCard
                    title={`Tendencia de Cobros — últimos ${tendMeses} meses`}
                    icon={<Activity className="w-4 h-4 text-blue-500" />}
                    headerAction={
                      <select
                        value={tendMeses}
                        onChange={e => setTendMeses(Number(e.target.value) as 3 | 6 | 12)}
                        className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
                      >
                        <option value={3}>3 meses</option>
                        <option value={6}>6 meses</option>
                        <option value={12}>12 meses</option>
                      </select>
                    }
                  >
                    {tend.Meses.length === 0
                      ? <p className="text-sm text-gray-400 text-center py-10">Sin datos de cobros aún</p>
                      : <MiniBarChart meses={tend.Meses} height={190} />
                    }
                    <p className="text-xs text-gray-400 mt-2">* Cobros verificados · hora Bolivia (UTC-4)</p>
                  </SectionCard>
                )}
              </div>
            )}
            {prefs.ShowMetodosPago && (
              <div>
                {metodS === 'loading' && <SkeletonChart />}
                {metodS === 'error' && <ErrorSection title="Error cargando métodos de pago." onRetry={metodR} />}
                {metodS === 'success' && metodos && (
                  <SectionCard title="Métodos de Pago (mes actual)"
                    icon={<Banknote className="w-4 h-4 text-green-500" />}>
                    <div className="flex flex-col items-center gap-4">
                      <DonutChart slices={metodoSlices} size={110} label="pagos" />
                      <div className="w-full space-y-2">
                        {metodos.map((m, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full inline-block"
                                style={{ backgroundColor: METODO_COLOR[m.Metodo] ?? '#9ca3af' }} />
                              <span className="text-gray-700">{m.Metodo.replace('DepositoBancario', 'Depósito')}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-semibold text-gray-900">{m.Cantidad}</span>
                              <span className="text-gray-400 ml-1.5">Bs {m.Monto.toLocaleString('es-BO', { minimumFractionDigits: 0 })}</span>
                            </div>
                          </div>
                        ))}
                        {metodos.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Sin pagos este mes</p>}
                      </div>
                    </div>
                  </SectionCard>
                )}
              </div>
            )}
          </div>
        )}

        {prefs.ShowTickets && (
          <DashboardTicketsPanel
            tEst={tEst}    tEstS={tEstS}   tEstR={tEstR}
            tUrg={tUrg}    tUrgS={tUrgS}   tUrgR={tUrgR}
            tTipo={tTipo}  tTipoS={tTipoS} tTipoR={tTipoR}
            tResol={tResol} tResolS={tResolS} tResolR={tResolR}
          />
        )}

        {prefs.ShowWhatsApp && (
          <DashboardWhatsAppPanel
            wsp={wsp}       wspS={wspS}   wspR={wspR}
            heatmap={heatmap} heatS={heatS} heatR={heatR}
          />
        )}

        {(prefs.ShowDeudores || prefs.ShowZonas) && (
          <DashboardDeudoresPanel
            showDeudores={prefs.ShowDeudores} showZonas={prefs.ShowZonas}
            deudores={deudores} deudS={deudS} deudR={deudR}
            zonas={zonas}       zonaS={zonaS} zonaR={zonaR}
          />
        )}

        {prefs.ShowComprobantes && (
          <DashboardComprobantes comprob={comprob} status={compS} onRetry={compR} />
        )}

        {noVisible && (
          <div className="card p-16 flex flex-col items-center gap-4 text-center">
            <TrendingUp className="w-12 h-12 text-gray-200" />
            <p className="text-gray-400">No hay secciones visibles en el dashboard.</p>
            <button onClick={() => setShowCustomize(true)} className="btn-primary text-sm px-4 py-2">
              Configurar Dashboard
            </button>
          </div>
        )}

        {prefs.ShowMetodosPago && (
          <section>
            <DashboardPagosSection dashPagos={dashPagos} status={pagosS} onRetry={pagosR} />
          </section>
        )}

        {prefs.ShowTickets && (
          <section>
            <DashboardTicketsMetricas tMetricas={tMetricas} status={tMetricS} onRetry={tMetricR} />
          </section>
        )}

        {prefs.ShowWhatsApp && (
          <section>
            <DashboardNotifSection notifStats={notifStats} status={notifS} onRetry={notifR} />
          </section>
        )}

        <section>
          <DashboardChatbotSection chatbotKpis={chatbotKpis} status={chatbotS} onRetry={chatbotR} />
        </section>

        <section>
          <DashboardAutoSection autoActions={autoActions} status={autoS} onRetry={autoR} />
        </section>

        {/* ── F5, F6, F7 — mejoras dashboard ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <DashboardAgingSection data={aging} status={agingS} onRetry={agingR} />
          <DashboardProximosCortSection data={proxCorte} status={cortS} onRetry={cortR} />
        </div>

        <section>
          <DashboardWorkloadSection data={workload} status={workS} onRetry={workR} />
        </section>

      </div>

      {showCustomize && (
        <DashboardCustomizeModal
          open={showCustomize} prefs={prefs}
          onSave={handleSavePrefs} onClose={() => setShowCustomize(false)}
        />
      )}
    </>
  );
}
