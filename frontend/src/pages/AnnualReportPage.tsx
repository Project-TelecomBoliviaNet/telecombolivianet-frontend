import { useEffect, useState, useCallback } from 'react';
import { Loader2, AlertCircle, FileSpreadsheet, FileText } from 'lucide-react';
import { invoiceService } from '@/services/invoiceService';
import { planService } from '@/services/clientService';
import { PaymentModal } from '@/components/clients/PaymentModal';
import { useAuthStore } from '@/store/authStore';
import { usePageTitle } from '@/hooks/usePageTitle';
import type { AnnualReportRowDto, AnnualReportCellDto } from '@/types/invoice.types';
import type { PlanDto } from '@/types/client.types';
import type { InvoiceDto } from '@/types/client.types';

// ── Helpers ───────────────────────────────────────────────────────────────────
const MONTH_SHORT = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
                     'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const cellStyle = (status: string): string => {
  const map: Record<string, string> = {
    Pagada:     'bg-green-100 text-green-800 border-green-200',
    Pendiente:  'bg-amber-100 text-amber-800 border-amber-200',
    Vencida:    'bg-red-100 text-red-800 border-red-200',
    Anulada:    'bg-gray-100 text-gray-400 border-gray-200',
    NoAplica:   'bg-gray-50 text-gray-300 border-gray-100',
    NoGenerada: 'bg-gray-50 text-gray-300 border-gray-100',
  };
  return map[status] ?? 'bg-white text-gray-300 border-gray-100';
};

function Cell({ cell, isAdmin, onPay }: {
  cell: AnnualReportCellDto;
  isAdmin: boolean;
  onPay: (cell: AnnualReportCellDto) => void;
}) {
  const clickable = isAdmin && (cell.Status === 'Pendiente' || cell.Status === 'Vencida')
                    && cell.InvoiceId !== null;
  return (
    <td
      className={`border border-gray-200 text-center align-middle p-1.5
        ${cellStyle(cell.Status)}
        ${clickable ? 'cursor-pointer hover:brightness-95 transition-all' : ''}`}
      title={clickable ? 'Clic para registrar pago' : undefined}
      onClick={clickable ? () => onPay(cell) : undefined}
    >
      {cell.Status === 'NoAplica' || cell.Status === 'NoGenerada' ? (
        <span className="text-xs">—</span>
      ) : (
        <div>
          <p className="text-xs font-medium leading-tight">
            Bs.{cell.Amount.toLocaleString('es-BO', { minimumFractionDigits: 0 })}
          </p>
          {cell.PaidAt && (
            <p className="text-xs opacity-70 leading-tight mt-0.5">
              {new Date(cell.PaidAt).toLocaleDateString('es-BO', { day:'2-digit', month:'2-digit' })}
            </p>
          )}
          {cell.PaymentMethod && (
            <p className="text-xs opacity-60 leading-tight">{cell.PaymentMethod.slice(0,3)}</p>
          )}
        </div>
      )}
    </td>
  );
}

export default function AnnualReportPage() {
  usePageTitle('Reporte Anual');
  const isAdmin = useAuthStore(s => s.isAdmin); // FIX-25
  const now = new Date();

  const [year,   setYear]   = useState(now.getFullYear());
  const [rows,   setRows]   = useState<AnnualReportRowDto[]>([]);
  const [plans,  setPlans]  = useState<PlanDto[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  // US-D11 AC-05 · estado de carga de exportación
  const [exportingCsv,  setExportingCsv]  = useState(false);
  const [exportingPdf,  setExportingPdf]  = useState(false);

  const [zone,       setZone]       = useState('');
  const [planId,     setPlanId]     = useState('');
  const [debtFilter, setDebtFilter] = useState('all');
  const [sortBy,     setSortBy]     = useState('code');

  // Modal de pago
  const [payCell,    setPayCell]    = useState<AnnualReportCellDto | null>(null);
  const [payClientId, setPayClientId] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await invoiceService.getAnnualReport({
        year, zone: zone || undefined, planId: planId || undefined,
        debtFilter: debtFilter !== 'all' ? debtFilter : undefined,
        sortBy,
      });
      setRows(data);
    } catch {
      setError('Error al cargar el reporte anual.');
    } finally {
      setLoading(false);
    }
  }, [year, zone, planId, debtFilter, sortBy]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { planService.getAll(true).then(setPlans).catch(() => {}); }, []);

  // ── Exportar CSV (US-24/US-27) · US-D11 AC-05: spinner en botón ────────────
  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      const header = ['TBN','Cliente','Zona','Plan','Inst.',...MONTH_SHORT.slice(1)].join(',');
      const csv = rows.map(row => {
        const cells = row.Cells.map(c =>
          c.Status === 'NoAplica' || c.Status === 'NoGenerada' ? '-' : c.Status.slice(0, 3)
        );
        return [row.TbnCode, `"${row.ClientName}"`, `"${row.Zone}"`,
                `"${row.PlanName}"`, ...cells].join(',');
      });
      const blob = new Blob([[header, ...csv].join('\n')],
        { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `ReporteAnual_${year}.csv`;
      a.click();
    } finally {
      setExportingCsv(false);
    }
  };

  // ── Exportar PDF (US-24/US-27) · US-D11 AC-05: spinner en botón ────────────
  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const colorMap: Record<string, string> = {
        Pagada: '#d1fae5', Pendiente: '#fef3c7',
        Vencida: '#fee2e2', Anulada: '#f3f4f6',
      };
      const cols = ['TBN','Cliente','Zona','Plan','Inst.',...MONTH_SHORT.slice(1)];
      const headerRow = cols.map(c => `<th>${c}</th>`).join('');
      const bodyRows  = rows.map(r =>
        `<tr><td>${r.TbnCode}</td><td>${r.ClientName}</td>
         <td>${r.Zone}</td><td>${r.PlanName}</td>
         ${r.Cells.map(c => {
           const bg = colorMap[c.Status] ?? '#f9fafb';
           const txt = c.Status === 'NoAplica' || c.Status === 'NoGenerada' ? '—' : c.Status.slice(0,3);
           return `<td style="background:${bg};text-align:center">${txt}</td>`;
         }).join('')}</tr>`
      ).join('');
      const html = `<html><head><title>Reporte ${year}</title>
        <style>body{font-family:sans-serif;font-size:10px}
        table{border-collapse:collapse;width:100%}
        th,td{border:1px solid #ddd;padding:3px 5px}
        th{background:#f0f0f0}</style></head>
        <body><h2>Reporte Anual de Pagos — ${year}</h2>
        <p>Generado: ${new Date().toLocaleString('es-BO')} · ${rows.length} clientes</p>
        <table><thead><tr>${headerRow}</tr></thead>
        <tbody>${bodyRows}</tbody></table></body></html>`;
      const w = window.open('', '_blank');
      w?.document.write(html); w?.document.close(); w?.print();
    } finally {
      setExportingPdf(false);
    }
  };

  // ── Construir InvoiceDto para el PaymentModal ─────────────────────────────
  const buildCellInvoice = (cell: AnnualReportCellDto): InvoiceDto => ({
    Id: cell.InvoiceId!, Type: 'Mensualidad', Status: cell.Status as any,
    Year: year, Month: cell.Month, Amount: cell.Amount,
    IssuedAt: '', DueDate: '', Notes: null,
  });

  // ── Leyenda de colores ────────────────────────────────────────────────────
  const legend = [
    { label: 'Pagada',    cls: 'bg-green-100 border-green-200' },
    { label: 'Pendiente', cls: 'bg-amber-100 border-amber-200' },
    { label: 'Vencida',   cls: 'bg-red-100 border-red-200'    },
    { label: 'Anulada',   cls: 'bg-gray-100 border-gray-200'  },
    { label: 'No aplica', cls: 'bg-gray-50 border-gray-100'   },
  ];

  return (
    <div className="p-6 max-w-full">

      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reporte anual de pagos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {rows.length} clientes · año {year}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleExportCsv}
            disabled={exportingCsv || loading}
            className="btn-secondary text-sm"
          >
            {exportingCsv
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando...</>
              : <><FileSpreadsheet className="w-4 h-4" /> Excel (CSV)</>
            }
          </button>
          <button
            onClick={handleExportPdf}
            disabled={exportingPdf || loading}
            className="btn-secondary text-sm"
          >
            {exportingPdf
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando...</>
              : <><FileText className="w-4 h-4" /> PDF</>
            }
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-4 mb-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className="label text-xs">Año</label>
          <input type="number" className="input-field w-24"
            value={year} min={2024} max={2100}
            onChange={e => setYear(parseInt(e.target.value))} />
        </div>
        <div>
          <label className="label text-xs">Zona</label>
          <input type="text" className="input-field w-36"
            placeholder="Loma Linda..." value={zone}
            onChange={e => setZone(e.target.value)} />
        </div>
        <div>
          <label className="label text-xs">Plan</label>
          <select className="input-field" value={planId}
            onChange={e => setPlanId(e.target.value)}>
            <option value="">Todos</option>
            {plans.map(p => <option key={p.Id} value={p.Id}>{p.Name}</option>)}
          </select>
        </div>
        <div>
          <label className="label text-xs">Deuda</label>
          <select className="input-field" value={debtFilter}
            onChange={e => setDebtFilter(e.target.value)}>
            <option value="all">Todos</option>
            <option value="paid">Al día</option>
            <option value="debt">Con deuda</option>
          </select>
        </div>
        <div>
          <label className="label text-xs">Ordenar</label>
          <select className="input-field" value={sortBy}
            onChange={e => setSortBy(e.target.value)}>
            <option value="code">Por código TBN</option>
            <option value="name">Por nombre</option>
          </select>
        </div>
        <button onClick={() => { setZone(''); setPlanId(''); setDebtFilter('all'); setSortBy('code'); }}
          className="btn-secondary text-sm">Limpiar</button>
      </div>

      {/* Leyenda */}
      <div className="flex gap-3 flex-wrap mb-4">
        {legend.map(l => (
          <div key={l.label} className="flex items-center gap-1.5 text-xs text-gray-600">
            <div className={`w-4 h-4 rounded border ${l.cls}`} />
            {l.label}
          </div>
        ))}
        {isAdmin() && (
          <span className="text-xs text-blue-600 italic">
            · Clic en celda pendiente/vencida para registrar pago
          </span>
        )}
      </div>

      {loading ? (
        /* US-D11 AC-03: skeleton de filas con texto "Generando reporte..." */
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            Generando reporte...
          </div>
          <table className="w-full text-xs">
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  {Array.from({ length: 17 }).map((_, j) => (
                    <td key={j} className="px-3 py-2">
                      <div className="h-3 rounded bg-gray-200 animate-pulse motion-reduce:animate-none"
                        style={{ width: j < 4 ? '80%' : '60%' }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : error ? (
        /* US-D12 AC-04: error con ícono + mensaje + botón Reintentar */
        <div className="card p-8 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-sm text-gray-600">No se pudo generar el reporte. Intenta de nuevo.</p>
          <button onClick={load} className="btn-secondary text-xs px-3 py-1.5">
            Reintentar
          </button>
        </div>
      ) : (
        <div className="card overflow-auto">
          <table className="text-xs border-collapse min-w-max">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-600 sticky left-0 bg-gray-50 z-10 min-w-20">TBN</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-600 sticky left-20 bg-gray-50 z-10 min-w-36">Cliente</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-600 min-w-24">Zona</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-600 min-w-20">Plan</th>
                {/* Encabezados de meses */}
                {['Inst.', ...MONTH_SHORT.slice(1)].map(m => (
                  <th key={m} className="border border-gray-200 px-2 py-2 text-center font-medium text-gray-600 min-w-16">
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={17} className="text-center py-10 text-gray-400">
                    No hay datos con los filtros aplicados
                  </td>
                </tr>
              ) : rows.map(row => (
                <tr key={row.ClientId} className="hover:bg-blue-50/30 transition-colors">
                  <td className="border border-gray-200 px-3 py-1.5 font-mono text-blue-700 font-medium sticky left-0 bg-white z-10">
                    {row.TbnCode}
                  </td>
                  <td className="border border-gray-200 px-3 py-1.5 font-medium text-gray-900 sticky left-20 bg-white z-10">
                    {row.ClientName}
                  </td>
                  <td className="border border-gray-200 px-3 py-1.5 text-gray-500">{row.Zone}</td>
                  <td className="border border-gray-200 px-3 py-1.5 text-gray-500">{row.PlanName}</td>
                  {row.Cells.map(cell => (
                    <Cell
                      key={cell.Month}
                      cell={cell}
                      isAdmin={isAdmin()}
                      onPay={(c) => {
                        setPayCell(c);
                        setPayClientId(row.ClientId);
                      }}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de pago desde el reporte */}
      {payCell && payCell.InvoiceId && (
        <PaymentModal
          clientId={payClientId}
          invoices={[buildCellInvoice(payCell)]}
          preselected={payCell.InvoiceId}
          onSuccess={() => { setPayCell(null); load(); }}
          onClose={() => setPayCell(null)}
        />
      )}
    </div>
  );
}
