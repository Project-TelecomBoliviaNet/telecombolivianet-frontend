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

// ═══════════════════════════════════════════════════════════════════════════
// BotConfigPage — US-BOT-06 / US-BOT-02
// Configuración del bot: menú, horario, mensajes, palabras clave, QR, RAG
// ═══════════════════════════════════════════════════════════════════════════

type Tab = 'menu' | 'horario' | 'mensajes' | 'palabras' | 'qr' | 'rag';
type QrInfo = { HasQr: boolean; Path: string | null; UpdatedAt: string | null };

const CONFIG_TABS: { key: Tab; label: string }[] = [
  { key: 'menu',     label: 'Menú principal' },
  { key: 'horario',  label: 'Horario' },
  { key: 'mensajes', label: 'Mensajes' },
  { key: 'palabras', label: 'Palabras clave' },
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
    setQrUploading(true); setError(null);
    try {
      await chatbotService.uploadCompanyQr(file);
      setSuccess('QR de pago actualizado correctamente.');
      setTimeout(() => setSuccess(null), 3000);
      await loadQr();
    } catch { setError('Error al subir el QR. Verifica el formato y tamaño.'); }
    finally { setQrUploading(false); if (qrInputRef.current) qrInputRef.current.value = ''; }
  };

  // ── RAG handlers ─────────────────────────────────────────────────────────

  const handleRagUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRagUploading(true); setError(null);
    try {
      await chatbotService.ragUploadDocument(file, ragTitle.trim() || undefined);
      setSuccess('Documento subido y procesado correctamente.');
      setTimeout(() => setSuccess(null), 3000);
      setRagTitle('');
      await loadRag();
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

  const isConfigTab = ['menu', 'horario', 'mensajes', 'palabras'].includes(tab);

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
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Título del menú</label>
            <input
              value={config.Menu.TituloMenu}
              onChange={e => setConfig({ ...config, Menu: { ...config.Menu, TituloMenu: e.target.value } })}
              className="input-field"
              placeholder="¿En qué puedo ayudarte?"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">Opciones del menú</p>
              <button
                onClick={() => setConfig({
                  ...config,
                  Menu: {
                    ...config.Menu,
                    Opciones: [...config.Menu.Opciones,
                      { Numero: String(config.Menu.Opciones.length + 1), Etiqueta: '', Intent: 'MENU', Activa: true }
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
                <div key={i} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg bg-white">
                  <input
                    value={opt.Numero}
                    onChange={e => {
                      const opts = [...config.Menu.Opciones];
                      opts[i] = { ...opts[i], Numero: e.target.value };
                      setConfig({ ...config, Menu: { ...config.Menu, Opciones: opts } });
                    }}
                    className="w-10 text-center text-sm font-bold border border-gray-200 rounded px-1 py-1"
                  />
                  <input
                    value={opt.Etiqueta}
                    onChange={e => {
                      const opts = [...config.Menu.Opciones];
                      opts[i] = { ...opts[i], Etiqueta: e.target.value };
                      setConfig({ ...config, Menu: { ...config.Menu, Opciones: opts } });
                    }}
                    placeholder="Etiqueta"
                    className="flex-1 text-sm border border-gray-200 rounded px-2 py-1.5"
                  />
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
                  <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
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
                    className="text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab Horario ──────────────────────────────────────────────── */}
      {tab === 'horario' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Hora inicio</label>
              <input type="time" value={config.Horario.HoraInicio}
                onChange={e => setConfig({ ...config, Horario: { ...config.Horario, HoraInicio: e.target.value } })}
                className="input-field" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Hora fin</label>
              <input type="time" value={config.Horario.HoraFin}
                onChange={e => setConfig({ ...config, Horario: { ...config.Horario, HoraFin: e.target.value } })}
                className="input-field" />
            </div>
          </div>
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
        </div>
      )}

      {/* ── Tab Mensajes ─────────────────────────────────────────────── */}
      {tab === 'mensajes' && (
        <div className="space-y-4">
          {([
            { key: 'Bienvenida',     label: 'Bienvenida' },
            { key: 'Despedida',      label: 'Despedida' },
            { key: 'NoEntendido',    label: 'No entendido' },
            { key: 'EscaladoAgente', label: 'Escalado a agente' },
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
                Variables: {'{{nombre}}'}, {'{{empresa}}'}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab Palabras clave ─────────────────────────────────────────── */}
      {tab === 'palabras' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Palabras que activan el menú principal del bot (sin importar el contexto de la conversación).
          </p>
          <div className="flex flex-wrap gap-2">
            {config.PalabrasClave.map((kw, i) => (
              <span key={i} className="flex items-center gap-1 px-2.5 py-1 bg-green-50 border border-green-200 rounded-full text-sm text-green-800">
                {kw}
                <button onClick={() => {
                  const kws = config.PalabrasClave.filter((_, j) => j !== i);
                  setConfig({ ...config, PalabrasClave: kws });
                }} className="text-green-500 hover:text-red-500">
                  ✕
                </button>
              </span>
            ))}
            <input
              placeholder="+ agregar palabra…"
              className="px-2.5 py-1 text-sm border border-dashed border-gray-300 rounded-full outline-none focus:border-green-400 w-36"
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ',') {
                  const val = (e.target as HTMLInputElement).value.trim().toLowerCase();
                  if (val && !config.PalabrasClave.includes(val)) {
                    setConfig({ ...config, PalabrasClave: [...config.PalabrasClave, val] });
                    (e.target as HTMLInputElement).value = '';
                  }
                  e.preventDefault();
                }
              }}
            />
          </div>
          <p className="text-xs text-gray-400">Presiona Enter o coma para agregar.</p>
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
              {qrInfo?.HasQr ? (
                <div className="flex gap-6 items-start p-4 border border-green-200 rounded-lg bg-green-50">
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
                    {qrInfo.Path && (
                      <p className="text-xs text-gray-500 break-all">Archivo: {qrInfo.Path}</p>
                    )}
                    {qrInfo.UpdatedAt && (
                      <p className="text-xs text-gray-500">
                        Actualizado: {new Date(qrInfo.UpdatedAt).toLocaleString('es-BO')}
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

              <div className="space-y-1">
                <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg text-white transition-colors ${
                  qrUploading ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                }`}>
                  {qrUploading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Upload className="w-4 h-4" />}
                  {qrInfo?.HasQr ? 'Reemplazar QR' : 'Subir QR'}
                  <input
                    ref={qrInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={qrUploading}
                    onChange={handleQrUpload}
                  />
                </label>
                <p className="text-xs text-gray-400">Formatos permitidos: JPG, PNG, WebP. Tamaño máximo: 5 MB.</p>
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
            <p className="text-sm font-medium text-gray-700">Subir nuevo documento</p>
            <input
              type="text"
              placeholder="Título del documento (opcional)"
              value={ragTitle}
              onChange={e => setRagTitle(e.target.value)}
              className="input-field text-sm"
              disabled={ragUploading}
            />
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
