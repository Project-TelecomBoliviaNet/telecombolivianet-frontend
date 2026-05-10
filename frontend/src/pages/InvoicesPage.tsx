import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, AlertCircle, Search, Play, FileSpreadsheet, FileText, X,
} from 'lucide-react';
import { extractApiError } from '@/utils/apiError';
import { fmtBsDec } from '@/utils/invoiceFormatters';
import { RunJobModal } from '@/components/invoices/RunJobModal';
import { InvoiceStatsPanel } from '@/components/invoices/InvoiceStatsPanel';
import { DeudorTable } from '@/components/invoices/DeudorTable';
import { PaymentModal } from '@/components/clients/PaymentModal';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useInvoiceData } from '@/hooks/useInvoiceData';
import { invoiceService } from '@/services/invoiceService';
import type { BillingJobResultDto, DeudorDto, InvoiceRangeStatsDto } from '@/types/invoice.types';
import type { InvoiceDto } from '@/types/client.types';

export default function InvoicesPage() {
  usePageTitle('Facturas');
  const now = new Date();

  const [statsYear,  setStatsYear]  = useState(now.getFullYear());
  const [statsMonth, setStatsMonth] = useState(now.getMonth() + 1);
  const [search,          setSearch]          = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateFrom,        setDateFrom]        = useState('');
  const [dateTo,          setDateTo]          = useState('');

  // Rango personalizado de estadísticas
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const [rangeFrom,   setRangeFrom]   = useState(firstOfMonth);
  const [rangeTo,     setRangeTo]     = useState(now.toISOString().split('T')[0]);
  const [rangeStats,  setRangeStats]  = useState<InvoiceRangeStatsDto | null>(null);

  const loadRangeStats = useCallback(async () => {
    if (!rangeFrom || !rangeTo || rangeFrom > rangeTo) return;
    try {
      setRangeStats(await invoiceService.getStatsRange(rangeFrom, rangeTo));
    } catch { /* silencioso */ }
  }, [rangeFrom, rangeTo]);

  useEffect(() => { loadRangeStats(); }, [loadRangeStats]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { stats, deudores, loading, error, reload } = useInvoiceData(
    statsYear, statsMonth, debouncedSearch,
    dateFrom || undefined, dateTo || undefined
  );

  const [showRunJob,     setShowRunJob]     = useState(false);
  const [jobRunning,     setJobRunning]     = useState(false);
  const [jobResult,      setJobResult]      = useState<BillingJobResultDto | null>(null);
  const [actionError,    setActionError]    = useState('');
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPDF,   setExportingPDF]   = useState(false);
  const [payTarget,      setPayTarget]      = useState<DeudorDto | null>(null);

  const handleRunJob = async (y: number, m: number) => {
    setJobRunning(true);
    try {
      const res = await invoiceService.generateManual(y, m);
      setJobResult(res);
      setShowRunJob(false);
      setStatsYear(y); setStatsMonth(m);
      reload();
    } catch (e: unknown) {
      setActionError(extractApiError(e, 'Error al ejecutar la facturación.'));
    } finally {
      setJobRunning(false);
    }
  };

  const handleExportExcel = async () => {
    setExportingExcel(true); setActionError('');
    try { await invoiceService.exportExcel(statsYear, statsMonth); }
    catch { setActionError('Error al generar el Excel.'); }
    finally { setExportingExcel(false); }
  };

  const handleExportPDF = async () => {
    setExportingPDF(true); setActionError('');
    try { await invoiceService.exportPdf(statsYear, statsMonth); }
    catch { setActionError('Error al generar el PDF.'); }
    finally { setExportingPDF(false); }
  };

  const buildInvoiceDtos = (deudor: DeudorDto): InvoiceDto[] =>
    deudor.Facturas.map(f => ({
      Id:       f.Id,
      Type:     'Mensualidad' as any,
      Status:   f.Status as any,
      Year:     f.Year,
      Month:    f.Month,
      Amount:   f.Amount,
      IssuedAt: f.DueDate,
      DueDate:  f.DueDate,
      Notes:    f.Notes,
    }));

  const totalDeuda    = deudores.reduce((s, d) => s + d.TotalDeuda, 0);
  const totalVencidas = deudores.reduce(
    (s, d) => s + d.Facturas.filter(f => f.Status === 'Vencida').length, 0
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Cobranza</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Cobranza pendiente · {deudores.length} clientes · {fmtBsDec(totalDeuda)} total
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowRunJob(true)} className="btn-secondary text-sm">
            <Play className="w-4 h-4" /> Ejecutar facturación
          </button>
          <button onClick={handleExportExcel} disabled={exportingExcel} className="btn-secondary text-sm disabled:opacity-60">
            {exportingExcel
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando...</>
              : <><FileSpreadsheet className="w-4 h-4" /> Excel</>}
          </button>
          <button onClick={handleExportPDF} disabled={exportingPDF} className="btn-secondary text-sm disabled:opacity-60">
            {exportingPDF
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando...</>
              : <><FileText className="w-4 h-4" /> PDF</>}
          </button>
        </div>
      </div>

      <InvoiceStatsPanel
        stats={stats}
        rangeStats={rangeStats}
        deudores={deudores}
        totalDeuda={totalDeuda}
        totalVencidas={totalVencidas}
        statsMonth={statsMonth}
        statsYear={statsYear}
        onMonthChange={setStatsMonth}
        onYearChange={setStatsYear}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        onRangeFromChange={setRangeFrom}
        onRangeToChange={setRangeTo}
      />

      {jobResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 text-sm text-green-800">
          <strong>Facturación {jobResult.Period} completada:</strong>{' '}
          {jobResult.Generated} generadas · {jobResult.Skipped} ya existían ·{' '}
          {jobResult.ExcludedBaja} de baja omitidos
          {jobResult.Errors > 0 && ` · ${jobResult.Errors} errores`}
          <button onClick={() => setJobResult(null)} className="ml-3 text-green-600 hover:text-green-800 font-medium">
            Cerrar
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-lg mb-4">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            className="input-field pl-9 w-full"
            placeholder="Buscar por nombre o código TBN…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <label className="text-xs text-gray-500 whitespace-nowrap">Vencimiento:</label>
          <input
            type="date"
            className="input-field text-sm w-36"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            title="Desde (fecha de vencimiento)"
          />
          <span className="text-gray-400 text-sm">—</span>
          <input
            type="date"
            className="input-field text-sm w-36"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            title="Hasta (fecha de vencimiento)"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="text-gray-400 hover:text-gray-600"
              title="Limpiar filtro de fechas"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando...
        </div>
      ) : (
        <DeudorTable deudores={deudores} onPagar={setPayTarget} />
      )}

      {showRunJob && (
        <RunJobModal
          onConfirm={handleRunJob}
          onClose={() => setShowRunJob(false)}
          running={jobRunning}
        />
      )}

      {payTarget && (
        <PaymentModal
          clientId={payTarget.ClientId}
          invoices={buildInvoiceDtos(payTarget)}
          onSuccess={() => { setPayTarget(null); reload(); }}
          onClose={() => setPayTarget(null)}
        />
      )}

      {actionError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3
          bg-red-700 text-white text-sm px-5 py-3 rounded-xl shadow-lg max-w-sm w-full">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{actionError}</span>
          <button onClick={() => setActionError('')} className="opacity-70 hover:opacity-100">✕</button>
        </div>
      )}
    </div>
  );
}
