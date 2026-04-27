import { useState } from 'react';
import { Loader2, Play } from 'lucide-react';

const MONTHS = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

interface Props {
  onConfirm: (year: number, month: number) => void;
  onClose:   () => void;
  running:   boolean;
}

export function RunJobModal({ onConfirm, onClose, running }: Props) {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Re-ejecutar job del mes</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600">
            Genera las facturas del mes seleccionado para clientes instalados hasta esa fecha.
            Los clientes ya facturados ese mes son omitidos. El primer mes de cada cliente
            se calcula de forma proporcional. Usar solo si el job automático no se ejecutó.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Año</label>
              <input type="number" className="input-field"
                value={year} min={2024} max={2100}
                onChange={e => setYear(parseInt(e.target.value))} />
            </div>
            <div>
              <label className="label">Mes</label>
              <select className="input-field"
                value={month} onChange={e => setMonth(parseInt(e.target.value))}>
                {MONTHS.slice(1).map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button
              disabled={running}
              onClick={() => onConfirm(year, month)}
              className="btn-primary flex-1"
            >
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {running ? 'Ejecutando...' : 'Ejecutar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
