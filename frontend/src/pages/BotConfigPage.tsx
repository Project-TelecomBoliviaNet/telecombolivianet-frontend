import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Save, RotateCcw, Loader2, AlertCircle, CheckCircle2,
  Plus, Trash2, Bot, Upload, FileText, Image as ImageIcon,
} from 'lucide-react';
import {
  chatbotService,
  DIAS_SEMANA, INTENTS_DISPONIBLES,
  type BotConfigDto, type RagDocumentDto,
} from '@/services/chatbotService';
import api from '@/services/api';
import ConfirmDialog, { type ConfirmState, CONFIRM_CLOSED } from '@/components/shared/ConfirmDialog';

// ─── Replica la lógica isWithinSchedule del chatbot para preview en vivo ──
function computeIsActive(horario: { HoraInicio: string; HoraFin: string; DiasActivos: boolean[] }): boolean {
  const now      = new Date();
  const jsDay    = now.getDay();                     // 0=Dom…6=Sáb
  const cfgIndex = jsDay === 0 ? 6 : jsDay - 1;     // Dom→6, Lun→0…Sáb→5
  if (!horario.DiasActivos[cfgIndex]) return false;
  const [sh, sm] = horario.HoraInicio.split(':').map(Number);
  const [eh, em] = horario.HoraFin.split(':').map(Number);
  const cur      = now.getHours() * 60 + now.getMinutes();
  return cur >= sh * 60 + sm && cur < eh * 60 + em;
}

// ═══════════════════════════════════════════════════════════════════════════
// BotConfigPage — US-BOT-06 / US-BOT-02
// Configuración del bot: menú, horario, mensajes, QR, RAG
// ═══════════════════════════════════════════════════════════════════════════

type Tab = 'menu' | 'horario' | 'mensajes' | 'qr' | 'rag';
type QrInfo = {
  HasQr: boolean;
  Path: string | null;
  UpdatedAt: string | null;
  ExpiresAt: string | null;
  DaysRemaining: number | null;
};

const CONFIG_TABS: { key: Tab; label: string }[] = [
  { key: 'menu',     label: 'Menú principal' },
  { key: 'horario',  label: 'Horario' },
  { key: 'mensajes', label: 'Mensajes' },
  { key: 'qr',       label: 'QR de pago' },
  { key: 'rag',      label: 'Documentos IA' },
];

export default function BotConfigPage() {
  const [config, setConfig]   = useState<BotConfigDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tab, setTab]         = useState<Tab>('menu');
  const [confirmDialog,  setConfirmDialog]  = useState<ConfirmState>(CONFIRM_CLOSED);
  const [confirmRunning, setConfirmRunning] = useState(false);

  // QR state
  const [qrInfo,      setQrInfo]      = useState<QrInfo | null>(null);
  const [qrLoading,   setQrLoading]   = useState(false);
  const [qrUploading, setQrUploading] = useState(false);
  const [qrBlobUrl,   setQrBlobUrl]   = useState<string | null>(null);
  const [qrExpiresAt, setQrExpiresAt] = useState('');
  const qrInputRef = useRef<HTMLInputElement>(null);

  // RAG state
  const [ragDocs,      setRagDocs]      = useState<RagDocumentDto[]>([]);
  const [ragLoading,   setRagLoading]   = useState(false);
  const [ragUploading, setRagUploading] = useState(false);
  const [ragTitle,     setRagTitle]     = useState('');
  const ragInputRef = useRef<HTMLInputElement>(null);

  const closeConfirm = () => { setConfirmDialog(CONFIRM_CLOSED); setConfirmRunning(false); };

  // ── Carga de config del bot ──────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try { setConfig(await chatbotService.getBotConfig()); }
    catch { setError('Error al cargar la configuración.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Carga según pestaña ──────────────────────────────────────────────────

  const loadQr = useCallback(async () => {
    setQrLoading(true);
    try {
      const info = await chatbotService.getCompanyQrInfo();
      setQrInfo(info);
      if (info.HasQr) {
        const res = await api.get('/bot-config/company-qr', { responseType: 'blob' });
        const url = URL.createObjectURL(res.data as Blob);
        setQrBlobUrl(prev => { if (prev) URL.revokeObjectURL(prev); return url; });
      } else {
        setQrBlobUrl(null);
      }
    } catch { setError('Error al cargar info del QR.'); }
    finally { setQrLoading(false); }
  }, []);

  const loadRag = useCallback(async () => {
    setRagLoading(true);
    try { setRagDocs(await chatbotService.ragListDocuments()); }
    catch { setError('Error al cargar documentos.'); }
    finally { setRagLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === 'qr')  loadQr();
    if (tab === 'rag') loadRag();
  }, [tab, loadQr, loadRag]);

  useEffect(() => () => { if (qrBlobUrl) URL.revokeObjectURL(qrBlobUrl); }, []);

  // ── Guardar / Restaurar config ───────────────────────────────────────────

  const handleSave = async () => {
    if (!config) return;

    // Validaciones antes de guardar
    if (tab === 'menu') {
      const activas = config.Menu.Opciones.filter(o => o.Activa);
      if (activas.length === 0) {
        setError('Debe haber al menos una opción activa en el menú.');
        return;
      }
      const tituloLargo = config.Menu.Opciones.find(o => o.Etiqueta.length > 24);
      if (tituloLargo) {
        setError(`La etiqueta "${tituloLargo.Etiqueta}" supera los 24 caracteres permitidos por WhatsApp.`);
        return;
      }
      const descLarga = config.Menu.Opciones.find(o => (o.Descripcion?.length ?? 0) > 72);
      if (descLarga) {
        setError(`La descripción de "${descLarga.Etiqueta}" supera los 72 caracteres permitidos por WhatsApp.`);
        return;
      }
    }

    setSaving(true); setError(null);
    try {
      const saved = await chatbotService.updateBotConfig(config);
      setConfig(saved);
      setSuccess('Configuración guardada correctamente.');
      setTimeout(() => setSuccess(null), 3000);
    } catch { setError('Error al guardar.'); }
    finally { setSaving(false); }
  };

  const handleReset = () => {
    setConfirmDialog({
      open: true, variant: 'warning',
      title: 'Restaurar configuración',
      message: '¿Restaurar la configuración por defecto? Se perderá la configuración actual.',
      confirmLabel: 'Restaurar',
      onConfirm: async () => {
        setConfirmRunning(true);
        try {
          const def = await chatbotService.resetBotConfig();
          setConfig(def);
          setSuccess('Configuración restaurada.');
          setTimeout(() => setSuccess(null), 3000);
          closeConfirm();
        } catch { setError('Error al restaurar.'); closeConfirm(); }
      },
    });
  };

  // ── QR handlers ─────────────────────────────────────────────────────────

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!qrExpiresAt) {
      setError('Debes ingresar la fecha de vencimiento del QR antes de subirlo.');
      if (qrInputRef.current) qrInputRef.current.value = '';
      return;
    }
    setQrUploading(true); setError(null);
    try {
      await chatbotService.uploadCompanyQr(file, qrExpiresAt);
      setSuccess('QR de pago actualizado correctamente.');
      setQrExpiresAt('');
      setTimeout(() => setSuccess(null), 3000);
      await loadQr();
    } catch { setError('Error al subir el QR. Verifica el formato y tamaño.'); }
    finally { setQrUploading(false); if (qrInputRef.current) qrInputRef.current.value = ''; }
  };

  // ── RAG handlers ─────────────────────────────────────────────────────────

  const handleRagUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ragTitle.trim()) {
      setError('El título es obligatorio para indexar el documento.');
      if (ragInputRef.current) ragInputRef.current.value = '';
      return;
    }
    setRagUploading(true); setError(null);
    try {
      await chatbotService.ragUploadDocument(file, ragTitle.trim());
      setSuccess('Documento subido. Indexando chunks en segundo plano...');
      setRagTitle('');
      await loadRag();
      setTimeout(async () => {
        await loadRag();
        setSuccess(prev => prev ? 'Documento subido e indexado correctamente.' : prev);
        setTimeout(() => setSuccess(null), 3000);
      }, 8000);
    } catch { setError('Error al subir el documento.'); }
    finally { setRagUploading(false); if (ragInputRef.current) ragInputRef.current.value = ''; }
  };

  const handleRagDelete = (id: string, fileName: string) => {
    setConfirmDialog({
      open: true, variant: 'danger',
      title: 'Eliminar documento',
      message: `¿Eliminar "${fileName}"? Los chunks vectorizados de este documento también se eliminarán.`,
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        setConfirmRunning(true);
        try {
          await chatbotService.ragDeleteDocument(id);
          setRagDocs(prev => prev.filter(d => d.id !== id));
          setSuccess('Documento eliminado.');
          setTimeout(() => setSuccess(null), 3000);
          closeConfirm();
        } catch { setError('Error al eliminar documento.'); closeConfirm(); }
      },
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading || !config) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
    </div>
  );

  const isConfigTab = ['menu', 'horario', 'mensajes'].includes(tab);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Bot className="w-6 h-6 text-green-600" />
        <h1 className="text-xl font-bold text-gray-900">Configuración del Bot WhatsApp</h1>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          <button onClick={() => setError(null)} className="ml-auto">✕</button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 flex-wrap">
        {CONFIG_TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === key ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab Menú (US-BOT-02) ───────────────────────────────────────── */}
      {tab === 'menu' && (
        <div className="space-y-4">
          {/* Textos del menú */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Botón de apertura</label>
              <input
                value={config.Menu.TituloBoton}
                onChange={e => setConfig({ ...config, Menu: { ...config.Menu, TituloBoton: e.target.value } })}
                className="input-field"
                placeholder="Ver opciones"
                maxLength={20}
              />
              <p className="text-xs text-gray-400 mt-0.5">Máx. 20 caracteres</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Título de sección</label>
              <input
                value={config.Menu.TituloSeccion}
                onChange={e => setConfig({ ...config, Menu: { ...config.Menu, TituloSeccion: e.target.value } })}
                className="input-field"
                placeholder="Servicios disponibles"
                maxLength={24}
              />
              <p className="text-xs text-gray-400 mt-0.5">Máx. 24 caracteres</p>
            </div>
          </div>

          {/* Opciones */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">
                Opciones del menú
                <span className="ml-2 text-xs text-gray-400 font-normal">
                  ({config.Menu.Opciones.filter(o => o.Activa).length} activas)
                </span>
              </p>
              <button
                onClick={() => setConfig({
                  ...config,
                  Menu: {
                    ...config.Menu,
                    Opciones: [...config.Menu.Opciones,
                      { Numero: String(config.Menu.Opciones.length + 1), Etiqueta: '', Intent: 'SOLICITAR_AGENTE', Activa: true, Descripcion: '', SoloCliente: false }
                    ],
                  },
                })}
                className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar opción
              </button>
            </div>
            <div className="space-y-2">
              {config.Menu.Opciones.map((opt, i) => (
                <div key={i} className="p-3 border border-gray-200 rounded-lg bg-white space-y-2">
                  {/* Fila superior: número + etiqueta + intent + activa + eliminar */}
                  <div className="flex items-center gap-2">
                    <input
                      value={opt.Numero}
                      onChange={e => {
                        const opts = [...config.Menu.Opciones];
                        opts[i] = { ...opts[i], Numero: e.target.value };
                        setConfig({ ...config, Menu: { ...config.Menu, Opciones: opts } });
                      }}
                      className="w-8 text-center text-sm font-bold border border-gray-200 rounded px-1 py-1"
                    />
                    <div className="flex-1 relative">
                      <input
                        value={opt.Etiqueta}
                        onChange={e => {
                          const opts = [...config.Menu.Opciones];
                          opts[i] = { ...opts[i], Etiqueta: e.target.value };
                          setConfig({ ...config, Menu: { ...config.Menu, Opciones: opts } });
                        }}
                        placeholder="Etiqueta (máx 24 chars)"
                        maxLength={24}
                        className={`w-full text-sm border rounded px-2 py-1.5 ${opt.Etiqueta.length > 24 ? 'border-red-400' : 'border-gray-200'}`}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-300">
                        {opt.Etiqueta.length}/24
                      </span>
                    </div>
                    <select
                      value={opt.Intent}
                      onChange={e => {
                        const opts = [...config.Menu.Opciones];
                        opts[i] = { ...opts[i], Intent: e.target.value };
                        setConfig({ ...config, Menu: { ...config.Menu, Opciones: opts } });
                      }}
                      className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white"
                    >
                      {INTENTS_DISPONIBLES.map(int => (
                        <option key={int.value} value={int.value}>{int.label}</option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer shrink-0">
                      <input type="checkbox" checked={opt.Activa}
                        onChange={e => {
                          const opts = [...config.Menu.Opciones];
                          opts[i] = { ...opts[i], Activa: e.target.checked };
                          setConfig({ ...config, Menu: { ...config.Menu, Opciones: opts } });
                        }}
                        className="accent-green-600"
                      />
                      Activa
                    </label>
                    <button
                      onClick={() => {
                        const opts = config.Menu.Opciones.filter((_, j) => j !== i);
                        setConfig({ ...config, Menu: { ...config.Menu, Opciones: opts } });
                      }}
                      className="text-gray-400 hover:text-red-600 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {/* Fila inferior: descripción + solo cliente */}
                  <div className="flex items-center gap-2 pl-10">
                    <div className="flex-1 relative">
                      <input
                        value={opt.Descripcion ?? ''}
                        onChange={e => {
                          const opts = [...config.Menu.Opciones];
                          opts[i] = { ...opts[i], Descripcion: e.target.value };
                          setConfig({ ...config, Menu: { ...config.Menu, Opciones: opts } });
                        }}
                        placeholder="Descripción (máx 72 chars)"
                        maxLength={72}
                        className={`w-full text-xs border rounded px-2 py-1.5 text-gray-500 ${(opt.Descripcion?.length ?? 0) > 72 ? 'border-red-400' : 'border-gray-100'}`}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-300">
                        {opt.Descripcion?.length ?? 0}/72
                      </span>
                    </div>
                    <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer shrink-0">
                      <input type="checkbox" checked={opt.SoloCliente ?? false}
                        onChange={e => {
                          const opts = [...config.Menu.Opciones];
                          opts[i] = { ...opts[i], SoloCliente: e.target.checked };
                          setConfig({ ...config, Menu: { ...config.Menu, Opciones: opts } });
                        }}
                        className="accent-blue-600"
                      />
                      Solo clientes
                    </label>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Las opciones marcadas como <strong>Solo clientes</strong> no se muestran a usuarios que aún no están registrados.
            </p>
          </div>
        </div>
      )}

      {/* ── Tab Horario ──────────────────────────────────────────────── */}
      {tab === 'horario' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Hora inicio (formato 24h)</label>
              <input type="time" value={config.Horario.HoraInicio}
                onChange={e => setConfig({ ...config, Horario: { ...config.Horario, HoraInicio: e.target.value } })}
                className="input-field" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Hora fin (formato 24h)</label>
              <input type="time" value={config.Horario.HoraFin}
                onChange={e => setConfig({ ...config, Horario: { ...config.Horario, HoraFin: e.target.value } })}
                className="input-field" />
            </div>
          </div>

          {/* Estado en vivo — actualiza en tiempo real mientras el admin edita */}
          {(() => {
            const active = computeIsActive(config.Horario);
            const now    = new Date();
            const timeStr = now.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false });
            const dayNames = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
            const dayName  = dayNames[now.getDay()];
            return (
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${
                active
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                <span className="text-lg">{active ? '🟢' : '🔴'}</span>
                <div>
                  <p className="font-semibold">
                    Con esta configuración el bot estaría <strong>{active ? 'ACTIVO' : 'INACTIVO'}</strong> ahora mismo
                  </p>
                  <p className="text-xs opacity-75 mt-0.5">
                    Hora actual: {dayName} {timeStr} · Rango configurado: {config.Horario.HoraInicio} – {config.Horario.HoraFin}
                  </p>
                </div>
              </div>
            );
          })()}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Días activos</p>
            <div className="flex gap-2">
              {DIAS_SEMANA.map((dia, i) => (
                <button key={dia}
                  onClick={() => {
                    const dias = [...config.Horario.DiasActivos];
                    dias[i] = !dias[i];
                    setConfig({ ...config, Horario: { ...config.Horario, DiasActivos: dias } });
                  }}
                  className={`w-10 h-10 rounded-full text-sm font-medium border transition-colors ${
                    config.Horario.DiasActivos[i]
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-green-400'
                  }`}
                >
                  {dia}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Mensaje fuera de horario</label>
            <textarea rows={3} value={config.Horario.MensajeFueraHorario}
              onChange={e => setConfig({ ...config, Horario: { ...config.Horario, MensajeFueraHorario: e.target.value } })}
              className="input-field resize-none font-mono text-sm" />
          </div>
          <p className="text-xs text-gray-400 flex items-center gap-1">
            ⏱ Los cambios se reflejan en el chatbot en menos de 1 minuto tras guardar.
          </p>
        </div>
      )}

      {/* ── Tab Mensajes ─────────────────────────────────────────────── */}
      {tab === 'mensajes' && (
        <div className="space-y-4">
          {([
            { key: 'Bienvenida',          label: 'Bienvenida (cliente identificado)' },
            { key: 'BienvenidaProspecto', label: 'Bienvenida (prospecto sin cuenta)' },
            { key: 'NoEntendido',         label: 'Respuesta cuando no entiende' },
            { key: 'EscaladoAgente',      label: 'Escalado a agente' },
          ] as const).map(({ key, label }) => (
            <div key={key}>
              <label className="text-sm font-medium text-gray-700 block mb-1">{label}</label>
              <textarea rows={3}
                value={config.Mensajes[key]}
                onChange={e => setConfig({
                  ...config, Mensajes: { ...config.Mensajes, [key]: e.target.value }
                })}
                className="input-field resize-none font-mono text-sm"
              />
              <p className="text-xs text-gray-400 mt-0.5">
                Variables disponibles: <code>{'{nombre}'}</code>
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab QR de pago ────────────────────────────────────────────── */}
      {tab === 'qr' && (
        <div className="space-y-5">
          <p className="text-sm text-gray-600">
            QR de pago global de la empresa. Se envía a todos los clientes cuando solicitan el código QR de pago por WhatsApp.
          </p>

          {qrLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Banner de alerta de vencimiento */}
              {qrInfo?.DaysRemaining !== null && qrInfo?.DaysRemaining !== undefined && qrInfo.DaysRemaining <= 7 && (
                <div className={`flex items-start gap-2 p-3 rounded-lg text-sm border ${
                  qrInfo.DaysRemaining <= 0
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-amber-50 border-amber-200 text-amber-700'
                }`}>
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    {qrInfo.DaysRemaining <= 0
                      ? `El QR de pago venció hace ${Math.abs(qrInfo.DaysRemaining)} día(s). Los clientes no pueden pagar con QR. Actualízalo de inmediato.`
                      : `El QR de pago vence en ${qrInfo.DaysRemaining} día(s) (${qrInfo.ExpiresAt}). Actualízalo antes de que expire.`}
                  </span>
                </div>
              )}

              {qrInfo?.HasQr ? (
                <div className={`flex gap-6 items-start p-4 border rounded-lg ${
                  (qrInfo.DaysRemaining ?? 999) <= 0 ? 'border-red-200 bg-red-50'
                  : (qrInfo.DaysRemaining ?? 999) <= 7 ? 'border-amber-200 bg-amber-50'
                  : 'border-green-200 bg-green-50'
                }`}>
                  {qrBlobUrl ? (
                    <img
                      src={qrBlobUrl}
                      alt="QR de pago"
                      className="w-40 h-40 object-contain border border-gray-200 rounded-lg bg-white p-1 shrink-0"
                    />
                  ) : (
                    <div className="w-40 h-40 flex items-center justify-center border border-gray-200 rounded-lg bg-white shrink-0">
                      <ImageIcon className="w-8 h-8 text-gray-300" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-green-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> QR configurado
                    </p>
                    {qrInfo.UpdatedAt && (
                      <p className="text-xs text-gray-500">
                        Actualizado: {new Date(qrInfo.UpdatedAt).toLocaleString('es-BO')}
                      </p>
                    )}
                    {qrInfo.ExpiresAt && (
                      <p className={`text-xs font-medium ${
                        (qrInfo.DaysRemaining ?? 999) <= 0 ? 'text-red-600'
                        : (qrInfo.DaysRemaining ?? 999) <= 7 ? 'text-amber-600'
                        : 'text-gray-600'
                      }`}>
                        Vence: {qrInfo.ExpiresAt}
                        {qrInfo.DaysRemaining !== null && (
                          <span className="ml-1">
                            ({qrInfo.DaysRemaining <= 0
                              ? `venció hace ${Math.abs(qrInfo.DaysRemaining)} día(s)`
                              : `${qrInfo.DaysRemaining} día(s) restantes`})
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 gap-2">
                  <ImageIcon className="w-10 h-10" />
                  <p className="text-sm">No hay QR configurado todavía.</p>
                </div>
              )}

              {/* Fecha de vencimiento obligatoria + subir archivo */}
              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-3">
                <p className="text-sm font-medium text-gray-700">
                  {qrInfo?.HasQr ? 'Reemplazar QR' : 'Subir QR de pago'}
                </p>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Fecha de vencimiento del QR <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={qrExpiresAt}
                    min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                    onChange={e => setQrExpiresAt(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                    disabled={qrUploading}
                  />
                  <p className="text-xs text-gray-400 mt-0.5">Fecha en que el QR de tu banco/billetera digital expira</p>
                </div>
                <div className="flex items-center gap-3">
                  <label
                    className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg text-white transition-colors ${
                      qrUploading ? 'bg-green-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                    }`}
                    onClick={e => {
                      if (!qrExpiresAt) {
                        e.preventDefault();
                        setError('Debes ingresar la fecha de vencimiento del QR antes de seleccionar el archivo.');
                      }
                    }}
                  >
                    {qrUploading
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Upload className="w-4 h-4" />}
                    Seleccionar imagen QR
                    <input
                      ref={qrInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={qrUploading}
                      onChange={handleQrUpload}
                    />
                  </label>
                  <span className="text-xs text-gray-400">JPG, PNG, WebP — máx. 5 MB</span>
                </div>
                {!qrExpiresAt && (
                  <p className="text-xs text-amber-600">⚠ Ingresa primero la fecha de vencimiento.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab Documentos IA (RAG) ───────────────────────────────────── */}
      {tab === 'rag' && (
        <div className="space-y-5">
          <p className="text-sm text-gray-600">
            Documentos que entrena al bot con información específica de la empresa (planes, precios, políticas, etc.).
            El bot usa estos documentos para responder preguntas con mayor precisión.
          </p>

          {/* Upload form */}
          <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-3">
            <p className="text-sm font-medium text-gray-700">
              Subir nuevo documento
            </p>
            <div>
              <input
                type="text"
                placeholder="Título del documento (obligatorio)"
                value={ragTitle}
                onChange={e => setRagTitle(e.target.value)}
                className="input-field text-sm"
                disabled={ragUploading}
              />
              <p className="text-xs text-gray-400 mt-0.5">Requerido para indexar el documento</p>
            </div>
            <div className="flex items-center gap-3">
              <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg text-white transition-colors ${
                ragUploading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}>
                {ragUploading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Upload className="w-4 h-4" />}
                Seleccionar archivo
                <input
                  ref={ragInputRef}
                  type="file"
                  accept=".pdf,.txt,.md,.docx"
                  className="hidden"
                  disabled={ragUploading}
                  onChange={handleRagUpload}
                />
              </label>
              <span className="text-xs text-gray-400">PDF, TXT, MD, DOCX — máx. 20 MB</span>
            </div>
          </div>

          {/* Document list */}
          {ragLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            </div>
          ) : ragDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 gap-2">
              <FileText className="w-10 h-10" />
              <p className="text-sm">No hay documentos cargados.</p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium">Título / Archivo</th>
                    <th className="px-4 py-2.5 text-right font-medium">Chunks</th>
                    <th className="px-4 py-2.5 text-right font-medium">Tamaño</th>
                    <th className="px-4 py-2.5 text-right font-medium">Fecha</th>
                    <th className="px-4 py-2.5 text-center font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ragDocs.map(doc => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800 truncate max-w-xs">{doc.title || doc.fileName}</p>
                        {doc.title && (
                          <p className="text-xs text-gray-400 truncate max-w-xs">{doc.fileName}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">{doc.chunkCount}</td>
                      <td className="px-4 py-3 text-right text-gray-500">
                        {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 whitespace-nowrap">
                        {new Date(doc.createdAt).toLocaleDateString('es-BO')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleRagDelete(doc.id, doc.fileName)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          title="Eliminar documento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Acciones — solo para pestañas de configuración del bot */}
      {isConfigTab && (
        <div className="flex items-center gap-3 justify-end pt-2 border-t border-gray-100">
          <button onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
            <RotateCcw className="w-3.5 h-3.5" /> Restaurar defecto
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Guardar configuración
          </button>
        </div>
      )}

      <ConfirmDialog state={confirmDialog} onClose={closeConfirm} running={confirmRunning} />
    </div>
  );
}
