import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Loader2, AlertCircle, Save, RotateCcw, Bell,
  MessageSquare, ChevronDown, ChevronUp, Eye, EyeOff,
  Send, Users, Plus, Trash2, CheckCircle2, XCircle, Filter,
  Tag, Zap, Copy, ArrowUp, ArrowDown, ExternalLink,
} from 'lucide-react';
import ConfirmDialog, { type ConfirmState, CONFIRM_CLOSED } from '@/components/shared/ConfirmDialog';
import {
  getNotifConfigs, updateNotifConfigs,
  getPlantillas, updatePlantilla, restorePlantilla,
  getSegments, createSegment, updateSegment, deleteSegment, previewSegment,
  envioMasivo, previewPlantilla,
  ALL_VARIABLES, NOTIF_TYPE_LABELS, NOTIF_TYPES_ACTIVOS, HSM_STATUS_COLORS, CATEGORIA_LABELS,
  type NotifConfigDto, type NotifPlantillaDto, type NotifType,
  type PlantillaCategoria, type HsmStatus,
  type NotifSegmentDto, type SegmentConditionGroup, type SegmentCondition, type SegmentCampo,
} from '@/services/notificationService';

// ═══════════════════════════════════════════════════════════════════════════════
// Constantes
// ═══════════════════════════════════════════════════════════════════════════════

const DELAY_OPTIONS = [
  { value: 0,     label: 'Inmediato (0s)' },
  { value: 3600,  label: '1 hora' },
  { value: 10800, label: '3 horas' },
  { value: 21600, label: '6 horas' },
  { value: 86400, label: '24 horas' },
];

const ALL_TIPOS = NOTIF_TYPES_ACTIVOS;

const CATEGORIAS: PlantillaCategoria[] = ['Cobro','Bienvenida','Tecnico','Ticket','General'];
const HSM_STATUSES: HsmStatus[] = ['Aprobada','Pendiente','Rechazada'];
const CAMPOS_SEGMENTO: { value: SegmentCampo; label: string }[] = [
  { value: 'deuda',     label: 'Deuda (Bs.)' },
  { value: 'dias_mora', label: 'Días de mora' },
  { value: 'zona',      label: 'Zona' },
  { value: 'plan',      label: 'Plan' },
  { value: 'estado',    label: 'Estado' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Subcomponente: WhatsApp Bubble Preview (US-NOT-PREVIEW)
// ═══════════════════════════════════════════════════════════════════════════════

function WhatsAppBubble({ texto, variablesNoEncontradas }: { texto: string; variablesNoEncontradas: string[] }) {
  const rendered = texto.split('\n').map((line, i) => {
    // Bold: *text*
    const parts = line.split(/(\*[^*]+\*)/g);
    return (
      <p key={i} className={i > 0 ? 'mt-1' : ''}>
        {parts.map((part, j) =>
          part.startsWith('*') && part.endsWith('*')
            ? <strong key={j}>{part.slice(1, -1)}</strong>
            : <span key={j}>{part}</span>
        )}
      </p>
    );
  });

  return (
    <div className="bg-[#ECE5DD] rounded-xl p-4 min-h-[160px]">
      <div className="flex justify-end">
        <div className="bg-[#DCF8C6] rounded-lg rounded-tr-none p-3 max-w-[85%] shadow-sm text-sm text-gray-800 leading-relaxed">
          {rendered}
          <div className="text-right text-xs text-gray-400 mt-1">12:00 ✓✓</div>
        </div>
      </div>
      {variablesNoEncontradas.length > 0 && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          <strong>Variables sin datos:</strong> {variablesNoEncontradas.join(', ')}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Subcomponente: Constructor de Segmento (US-NOT-02)
// ═══════════════════════════════════════════════════════════════════════════════

function SegmentBuilder({
  reglas, onChange,
}: {
  reglas: SegmentConditionGroup[];
  onChange: (r: SegmentConditionGroup[]) => void;
}) {
  const addGroup = () =>
    onChange([...reglas, { Condiciones: [{ Campo: 'zona', Operador: '=', Valor: '' }] }]);

  const removeGroup = (gi: number) =>
    onChange(reglas.filter((_, i) => i !== gi));

  const addCond = (gi: number) => {
    const next = reglas.map((g, i) => i === gi
      ? { ...g, Condiciones: [...g.Condiciones, { Campo: 'zona' as SegmentCampo, Operador: '=' as const, Valor: '' }] }
      : g);
    onChange(next);
  };

  const removeCond = (gi: number, ci: number) => {
    const next = reglas.map((g, i) => i === gi
      ? { ...g, Condiciones: g.Condiciones.filter((_, j) => j !== ci) }
      : g);
    onChange(next.filter(g => g.Condiciones.length > 0));
  };

  const updateCond = (gi: number, ci: number, field: keyof SegmentCondition, val: string) => {
    const next = reglas.map((g, i) => i === gi
      ? {
          ...g,
          Condiciones: g.Condiciones.map((c, j) => j === ci ? { ...c, [field]: val } : c),
        }
      : g);
    onChange(next);
  };

  const numericCampos: SegmentCampo[] = ['deuda', 'dias_mora'];
  const allOps = ['=', '!=', '>', '<', '>=', '<='];
  const strOps = ['=', '!='];

  return (
    <div className="space-y-3">
      {reglas.map((grupo, gi) => (
        <div key={gi} className="border border-blue-200 rounded-lg p-3 bg-blue-50/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
              {gi === 0 ? 'Grupo 1' : `O bien... Grupo ${gi + 1}`}
            </span>
            {reglas.length > 1 && (
              <button onClick={() => removeGroup(gi)} className="text-red-500 hover:text-red-700">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {grupo.Condiciones.map((cond, ci) => (
            <div key={ci} className="flex items-center gap-2 mb-2">
              {ci > 0 && (
                <span className="text-xs font-medium text-gray-500 w-6">Y</span>
              )}
              <select
                value={cond.Campo}
                onChange={e => updateCond(gi, ci, 'Campo', e.target.value)}
                className="text-xs border rounded px-2 py-1 bg-white"
              >
                {CAMPOS_SEGMENTO.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <select
                value={cond.Operador}
                onChange={e => updateCond(gi, ci, 'Operador', e.target.value)}
                className="text-xs border rounded px-2 py-1 bg-white w-14"
              >
                {(numericCampos.includes(cond.Campo) ? allOps : strOps).map(op => (
                  <option key={op} value={op}>{op}</option>
                ))}
              </select>
              <input
                value={cond.Valor}
                onChange={e => updateCond(gi, ci, 'Valor', e.target.value)}
                placeholder="valor"
                className="text-xs border rounded px-2 py-1 bg-white flex-1 min-w-0"
              />
              <button onClick={() => removeCond(gi, ci)} className="text-red-400 hover:text-red-600 shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button
            onClick={() => addCond(gi)}
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1"
          >
            <Plus className="w-3 h-3" /> Agregar condición AND
          </button>
        </div>
      ))}
      <button
        onClick={addGroup}
        className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 border border-dashed border-indigo-300 rounded px-3 py-1.5 w-full justify-center"
      >
        <Plus className="w-3 h-3" /> Agregar grupo OR
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Página principal
// ═══════════════════════════════════════════════════════════════════════════════

type Tab = 'triggers' | 'plantillas' | 'segmentos' | 'envio';

export default function NotificationsConfigPage() {
  const [activeTab, setActiveTab] = useState<Tab>('triggers');
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState<string | null>(null);
  const [confirmDialog,  setConfirmDialog]  = useState<ConfirmState>(CONFIRM_CLOSED);
  const [confirmRunning, setConfirmRunning] = useState(false);
  const closeConfirm = () => { setConfirmDialog(CONFIRM_CLOSED); setConfirmRunning(false); };

  // ── Triggers ──
  const [configs, setConfigs]       = useState<NotifConfigDto[]>([]);
  const [horaServer, setHoraServer] = useState('');
  const [expandedTrigger, setExpandedTrigger] = useState<NotifType | null>(null);
  const [savingTriggers, setSavingTriggers]   = useState(false);
  const [confirmSuspension, setConfirmSuspension] = useState(false);

  // ── Plantillas ──
  const [plantillas, setPlantillas]   = useState<NotifPlantillaDto[]>([]);
  const [selectedTipo, setSelectedTipo] = useState<NotifType>('SUSPENSION');
  const [textoEdit, setTextoEdit]     = useState('');
  const [categoriaEdit, setCategoriaEdit] = useState<PlantillaCategoria>('General');
  const [hsmEdit, setHsmEdit]         = useState<HsmStatus>('Pendiente');
  const [filterCategoria, setFilterCategoria] = useState<PlantillaCategoria | ''>('');
  const [filterHsm, setFilterHsm]     = useState<HsmStatus | ''>('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<{ texto: string; vars: string[] } | null>(null);
  const [savingPlantilla, setSavingPlantilla] = useState(false);
  const previewTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // US-META: configuración Meta template
  const [metaTemplateNameEdit, setMetaTemplateNameEdit] = useState('');
  const [metaLanguageCodeEdit, setMetaLanguageCodeEdit] = useState('es');
  const [metaParamOrderEdit, setMetaParamOrderEdit]     = useState<string[]>([]);

  // ── Segmentos ──
  const [segments, setSegments]         = useState<NotifSegmentDto[]>([]);
  const [segmentForm, setSegmentForm]   = useState<{ Nombre: string; Descripcion: string; Reglas: SegmentConditionGroup[] } | null>(null);
  const [editSegId, setEditSegId]       = useState<string | null>(null);
  const [segPreviewCount, setSegPreviewCount] = useState<number | null>(null);
  const [savingSegment, setSavingSegment]     = useState(false);

  // ── Envío masivo ──
  const [envioTipo, setEnvioTipo]         = useState<NotifType>('SUSPENSION');
  const [envioSegId, setEnvioSegId]       = useState<string>('');
  const [envioResult, setEnvioResult]     = useState<{ Enviados: number; OmitidosAntispam: number; SinTelefono: number } | null>(null);
  const [sendingMasivo, setSendingMasivo] = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [cfgData, pltData, segData] = await Promise.all([
        getNotifConfigs(),
        getPlantillas(),
        getSegments(),
      ]);
      setConfigs(cfgData.Configs);
      setHoraServer(cfgData.HoraServidorLocal);
      setPlantillas(pltData);
      setSegments(segData);

      // Pre-cargar plantilla seleccionada
      const p = pltData.find(p => p.Tipo === selectedTipo);
      if (p) {
        setTextoEdit(p.Texto);
        setCategoriaEdit(p.Categoria);
        setHsmEdit(p.HsmStatus);
        setMetaTemplateNameEdit(p.MetaTemplateName ?? '');
        setMetaLanguageCodeEdit(p.MetaLanguageCode ?? 'es');
        try { setMetaParamOrderEdit(p.MetaParamOrder ? JSON.parse(p.MetaParamOrder) : []); }
        catch { setMetaParamOrderEdit([]); }
      }
    } catch {
      setError('Error al cargar la configuración.');
    } finally {
      setLoading(false);
    }
  }, [selectedTipo]);

  // Reload solo plantillas + segmentos sin tocar los configs de triggers (evita
  // perder cambios no guardados en triggers cuando se restaura plantilla o guarda segmento).
  const reloadPlantillasAndSegments = useCallback(async () => {
    try {
      const [pltData, segData] = await Promise.all([getPlantillas(), getSegments()]);
      setPlantillas(pltData);
      setSegments(segData);
      const p = pltData.find(p => p.Tipo === selectedTipo);
      if (p) {
        setTextoEdit(p.Texto);
        setCategoriaEdit(p.Categoria);
        setHsmEdit(p.HsmStatus);
        setMetaTemplateNameEdit(p.MetaTemplateName ?? '');
        setMetaLanguageCodeEdit(p.MetaLanguageCode ?? 'es');
        try { setMetaParamOrderEdit(p.MetaParamOrder ? JSON.parse(p.MetaParamOrder) : []); }
        catch { setMetaParamOrderEdit([]); }
      }
    } catch { /* silencioso — no interrumpir la acción principal */ }
  }, [selectedTipo]);

  useEffect(() => { loadAll(); }, []);

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  // ── Triggers ─────────────────────────────────────────────────────────────

  const handleSaveTriggers = async () => {
    setSavingTriggers(true);
    try {
      await updateNotifConfigs(configs, confirmSuspension);
      showSuccess('Triggers actualizados correctamente.');
      setConfirmSuspension(false);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (msg?.includes('X-Confirm-Suspension')) {
        setConfirmSuspension(true);
        setError('⚠️ El trigger de Suspensión es crítico. Confirma la desactivación marcando el checkbox y guardando de nuevo.');
      } else {
        setError('Error al guardar triggers.');
      }
    } finally {
      setSavingTriggers(false);
    }
  };

  const updateConfig = (tipo: NotifType, field: keyof NotifConfigDto, value: unknown) => {
    setConfigs(prev => prev.map(c => c.Tipo === tipo ? { ...c, [field]: value } : c));
  };

  // ── Plantillas + Preview ──────────────────────────────────────────────────

  const handleSelectTipo = (tipo: NotifType) => {
    setSelectedTipo(tipo);
    const p = plantillas.find(p => p.Tipo === tipo);
    if (p) {
      setTextoEdit(p.Texto);
      setCategoriaEdit(p.Categoria);
      setHsmEdit(p.HsmStatus);
      setMetaTemplateNameEdit(p.MetaTemplateName ?? '');
      setMetaLanguageCodeEdit(p.MetaLanguageCode ?? 'es');
      try {
        setMetaParamOrderEdit(p.MetaParamOrder ? JSON.parse(p.MetaParamOrder) : []);
      } catch { setMetaParamOrderEdit([]); }
    }
    setPreviewData(null);
  };

  const triggerPreview = (texto: string) => {
    if (previewTimeout.current) clearTimeout(previewTimeout.current);
    previewTimeout.current = setTimeout(async () => {
      try {
        const result = await previewPlantilla(texto);
        setPreviewData({ texto: result.TextoRenderizado, vars: result.VariablesNoEncontradas });
      } catch { /* ignore */ }
    }, 600);
  };

  const handleTextoChange = (val: string) => {
    setTextoEdit(val);
    if (showPreview) triggerPreview(val);
  };

  const insertVariable = (variable: string) => {
    setTextoEdit(prev => prev + variable);
  };

  const handleSavePlantilla = async () => {
    setSavingPlantilla(true);
    try {
      const metaName  = metaTemplateNameEdit.trim() || null;
      const metaLang  = metaLanguageCodeEdit || 'es';
      const metaOrder = metaParamOrderEdit.length > 0 ? JSON.stringify(metaParamOrderEdit) : null;
      await updatePlantilla(selectedTipo, textoEdit, categoriaEdit, hsmEdit, metaName, metaLang, metaOrder);
      setPlantillas(prev => prev.map(p =>
        p.Tipo === selectedTipo
          ? { ...p, Texto: textoEdit, Categoria: categoriaEdit, HsmStatus: hsmEdit,
              MetaTemplateName: metaName, MetaLanguageCode: metaLang, MetaParamOrder: metaOrder }
          : p));
      showSuccess('Plantilla guardada correctamente.');
    } catch { setError('Error al guardar plantilla.'); }
    finally { setSavingPlantilla(false); }
  };

  // US-META: helpers para editar el orden de parámetros
  const addMetaParam    = () => setMetaParamOrderEdit((prev: string[]) => [...prev, '']);
  const removeMetaParam = (i: number) => setMetaParamOrderEdit((prev: string[]) => prev.filter((_: string, idx: number) => idx !== i));
  const updateMetaParam = (i: number, val: string) =>
    setMetaParamOrderEdit((prev: string[]) => prev.map((p: string, idx: number) => idx === i ? val : p));
  const moveMetaParam = (i: number, dir: -1 | 1) => {
    const next = [...metaParamOrderEdit];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setMetaParamOrderEdit(next);
  };

  const handleRestorePlantilla = () => {
    setConfirmDialog({
      open: true, variant: 'warning',
      title: 'Restaurar plantilla',
      message: '¿Restaurar el texto por defecto? Se perderá el texto actual.',
      confirmLabel: 'Restaurar',
      onConfirm: async () => {
        setConfirmRunning(true);
        try {
          await restorePlantilla(selectedTipo);
          await reloadPlantillasAndSegments();
          showSuccess('Plantilla restaurada.');
          closeConfirm();
        } catch { setError('Error al restaurar.'); closeConfirm(); }
      },
    });
  };

  const filteredPlantillas = plantillas.filter(p =>
    (!filterCategoria || p.Categoria === filterCategoria) &&
    (!filterHsm || p.HsmStatus === filterHsm)
  );

  // ── Segmentos ─────────────────────────────────────────────────────────────

  const initNewSegment = () => {
    setEditSegId(null);
    setSegmentForm({ Nombre: '', Descripcion: '', Reglas: [{ Condiciones: [{ Campo: 'zona', Operador: '=', Valor: '' }] }] });
    setSegPreviewCount(null);
  };

  const editSegment = (seg: NotifSegmentDto) => {
    setEditSegId(seg.Id);
    setSegmentForm({ Nombre: seg.Nombre, Descripcion: seg.Descripcion ?? '', Reglas: seg.Reglas });
    setSegPreviewCount(seg.ClientesEstimados ?? null);
  };

  const handlePreviewSegment = async () => {
    if (!segmentForm) return;
    try {
      const res = await previewSegment(segmentForm);
      setSegPreviewCount(res.ClientesCoinciden);
    } catch { setError('Error al calcular preview.'); }
  };

  const handleSaveSegment = async () => {
    if (!segmentForm) return;
    if (!segmentForm.Nombre.trim()) { setError('El nombre del segmento es requerido.'); return; }
    setSavingSegment(true);
    try {
      if (editSegId) {
        await updateSegment(editSegId, segmentForm);
      } else {
        await createSegment(segmentForm);
      }
      await reloadPlantillasAndSegments();
      setSegmentForm(null);
      setEditSegId(null);
      showSuccess(editSegId ? 'Segmento actualizado.' : 'Segmento creado.');
    } catch { setError('Error al guardar segmento.'); }
    finally { setSavingSegment(false); }
  };

  const handleDeleteSegment = (id: string, nombre: string) => {
    setConfirmDialog({
      open: true, variant: 'danger',
      title: 'Eliminar segmento',
      message: `¿Eliminar el segmento "${nombre}"?`,
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        setConfirmRunning(true);
        try {
          await deleteSegment(id);
          setSegments(prev => prev.filter(s => s.Id !== id));
          showSuccess('Segmento eliminado.');
          closeConfirm();
        } catch { setError('Error al eliminar segmento.'); closeConfirm(); }
      },
    });
  };

  // ── Envío masivo ──────────────────────────────────────────────────────────

  const handleEnvioMasivo = () => {
    setConfirmDialog({
      open: true, variant: 'warning',
      title: 'Envío masivo',
      message: `¿Enviar notificación "${NOTIF_TYPE_LABELS[envioTipo]}" al segmento seleccionado?\nEsta acción enviará mensajes WhatsApp a múltiples clientes.`,
      confirmLabel: 'Enviar',
      onConfirm: async () => {
        setConfirmRunning(true);
        setSendingMasivo(true);
        setEnvioResult(null);
        try {
          const res = await envioMasivo(envioTipo, envioSegId || undefined);
          setEnvioResult(res);
          closeConfirm();
        } catch { setError('Error al iniciar envío masivo.'); closeConfirm(); }
        finally { setSendingMasivo(false); }
      },
    });
  };

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Bell className="w-6 h-6 text-indigo-600" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Notificaciones WhatsApp</h1>
          <p className="text-sm text-gray-500">Hora servidor Bolivia: {horaServer}</p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <CheckCircle2 className="w-4 h-4" /> {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          { key: 'triggers',   label: 'Triggers',   icon: Zap },
          { key: 'plantillas', label: 'Plantillas',  icon: MessageSquare },
          { key: 'segmentos',  label: 'Segmentos',   icon: Filter },
          { key: 'envio',      label: 'Envío Masivo', icon: Send },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Triggers (US-NOT-04) ─────────────────────────────────────── */}
      {activeTab === 'triggers' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Activa o desactiva cada trigger y configura su ventana horaria y plantilla asociada.
          </p>

          {configs.map(cfg => {
            const expanded = expandedTrigger === cfg.Tipo;
            const plantilla = plantillas.find(p => p.Tipo === cfg.Tipo);
            return (
              <div key={cfg.Tipo} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedTrigger(expanded ? null : cfg.Tipo)}
                >
                  {/* Toggle */}
                  <button
                    onClick={e => { e.stopPropagation(); updateConfig(cfg.Tipo, 'Activo', !cfg.Activo); }}
                    className={`shrink-0 w-10 h-5 rounded-full transition-colors ${cfg.Activo ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <span className={`block w-4 h-4 bg-white rounded-full shadow mx-0.5 transition-transform ${cfg.Activo ? 'translate-x-5' : ''}`} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900">{NOTIF_TYPE_LABELS[cfg.Tipo]}</p>
                    {plantilla && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${HSM_STATUS_COLORS[plantilla.HsmStatus]}`}>
                          HSM: {plantilla.HsmStatus}
                        </span>
                        <span className="text-xs text-gray-400">{CATEGORIA_LABELS[plantilla.Categoria]}</span>
                      </div>
                    )}
                  </div>
                  {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>

                {expanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-gray-100 grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">Delay</label>
                      <select
                        value={cfg.DelaySegundos}
                        onChange={e => updateConfig(cfg.Tipo, 'DelaySegundos', +e.target.value)}
                        className="w-full border rounded px-2 py-1.5 text-sm"
                      >
                        {DELAY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">Ventana horaria</label>
                      <div className="flex items-center gap-2">
                        <input type="time" value={cfg.HoraInicio}
                          onChange={e => updateConfig(cfg.Tipo, 'HoraInicio', e.target.value)}
                          className="border rounded px-2 py-1.5 text-sm flex-1" />
                        <span className="text-gray-400 text-xs">–</span>
                        <input type="time" value={cfg.HoraFin}
                          onChange={e => updateConfig(cfg.Tipo, 'HoraFin', e.target.value)}
                          className="border rounded px-2 py-1.5 text-sm flex-1" />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-gray-600 block mb-1">Plantilla asociada (US-NOT-04)</label>
                      <select
                        value={cfg.PlantillaId ?? ''}
                        onChange={e => updateConfig(cfg.Tipo, 'PlantillaId', e.target.value || null)}
                        className="w-full border rounded px-2 py-1.5 text-sm"
                      >
                        <option value="">— Usar plantilla del mismo tipo —</option>
                        {plantillas.filter(p => p.HsmStatus !== 'Rechazada').map(p => (
                          <option key={p.Id} value={p.Id}>{NOTIF_TYPE_LABELS[p.Tipo]} — {p.Texto.slice(0, 50)}…</option>
                        ))}
                      </select>
                    </div>
                    {cfg.Tipo === 'SUSPENSION' && !cfg.Activo && (
                      <div className="col-span-2">
                        <label className="flex items-center gap-2 text-sm text-red-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={confirmSuspension}
                            onChange={e => setConfirmSuspension(e.target.checked)}
                            className="accent-red-600"
                          />
                          Confirmo que quiero desactivar el trigger crítico de Suspensión
                        </label>
                      </div>
                    )}
                    {cfg.DiasAntes !== null && (
                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">Días antes del vencimiento</label>
                        <input type="number" min={1} value={cfg.DiasAntes ?? 1}
                          onChange={e => updateConfig(cfg.Tipo, 'DiasAntes', +e.target.value)}
                          className="w-full border rounded px-2 py-1.5 text-sm" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <div className="flex justify-end">
            <button
              onClick={handleSaveTriggers}
              disabled={savingTriggers}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {savingTriggers ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar triggers
            </button>
          </div>
        </div>
      )}

      {/* ── Tab: Plantillas (US-NOT-03 / US-NOT-VARS / US-NOT-PREVIEW) ──────── */}
      {activeTab === 'plantillas' && (
        <div className="grid grid-cols-3 gap-5">
          {/* Lista de plantillas */}
          <div className="col-span-1 space-y-2">
            {/* Filtros US-NOT-03 */}
            <div className="flex gap-2">
              <select
                value={filterCategoria}
                onChange={e => setFilterCategoria(e.target.value as PlantillaCategoria | '')}
                className="flex-1 border rounded px-2 py-1.5 text-xs"
              >
                <option value="">Todas las categorías</option>
                {CATEGORIAS.map(c => <option key={c} value={c}>{CATEGORIA_LABELS[c]}</option>)}
              </select>
              <select
                value={filterHsm}
                onChange={e => setFilterHsm(e.target.value as HsmStatus | '')}
                className="flex-1 border rounded px-2 py-1.5 text-xs"
              >
                <option value="">Todos los HSM</option>
                {HSM_STATUSES.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>

            {filteredPlantillas.map(p => (
              <button
                key={p.Tipo}
                onClick={() => handleSelectTipo(p.Tipo)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                  selectedTipo === p.Tipo
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-900'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium truncate">{NOTIF_TYPE_LABELS[p.Tipo]}</span>
                  {/* US-NOT-03: badge HSM */}
                  <span className={`text-xs px-1.5 py-0.5 rounded border font-medium shrink-0 ml-1 ${HSM_STATUS_COLORS[p.HsmStatus]}`}>
                    {p.HsmStatus === 'Rechazada' && <XCircle className="w-3 h-3 inline mr-0.5" />}
                    {p.HsmStatus}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Tag className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-500">{CATEGORIA_LABELS[p.Categoria]}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Editor */}
          <div className="col-span-2 space-y-3">
            {/* Controles Categoria + HSM (US-NOT-03) */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-600 block mb-1">Categoría</label>
                <select
                  value={categoriaEdit}
                  onChange={e => setCategoriaEdit(e.target.value as PlantillaCategoria)}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                >
                  {CATEGORIAS.map(c => <option key={c} value={c}>{CATEGORIA_LABELS[c]}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-600 block mb-1">Estado HSM</label>
                <select
                  value={hsmEdit}
                  onChange={e => setHsmEdit(e.target.value as HsmStatus)}
                  className={`w-full border rounded px-2 py-1.5 text-sm ${HSM_STATUS_COLORS[hsmEdit]}`}
                >
                  {HSM_STATUSES.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>

            {/* US-NOT-03: advertencia si Rechazada */}
            {hsmEdit === 'Rechazada' && (
              <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
                <XCircle className="w-3.5 h-3.5 shrink-0" />
                Esta plantilla está Rechazada y no puede activarse en triggers.
              </div>
            )}

            {/* US-META: Configuración Meta WhatsApp Business API */}
            <details className="border border-green-200 rounded-lg bg-green-50/30" open={!!metaTemplateNameEdit}>
              <summary className="px-3 py-2 text-xs font-semibold text-green-800 cursor-pointer hover:bg-green-50 flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" />
                Configuración Meta WhatsApp Business API
                {metaTemplateNameEdit
                  ? <span className="ml-auto text-green-700 font-mono">{metaTemplateNameEdit}</span>
                  : <span className="ml-auto text-amber-600 font-normal">Sin configurar — usa texto libre (sesión 24h)</span>
                }
              </summary>
              <div className="px-3 pb-3 pt-2 space-y-3">
                <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                  <strong>Importante:</strong> crea el template en{' '}
                  <span className="font-mono">business.facebook.com → WhatsApp Manager → Message Templates</span>
                  {' '}antes de configurarlo aquí. El template debe estar aprobado por Meta y el nombre debe coincidir exactamente.
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">
                      Nombre del template en Meta
                    </label>
                    <input
                      type="text"
                      value={metaTemplateNameEdit}
                      onChange={e => setMetaTemplateNameEdit(e.target.value.toLowerCase().replace(/\s/g, '_'))}
                      placeholder="ej: recordatorio_r1"
                      className="w-full border rounded px-2 py-1.5 text-sm font-mono"
                    />
                    <p className="text-xs text-gray-400 mt-0.5">snake_case, minúsculas</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">
                      Idioma
                    </label>
                    <select
                      value={metaLanguageCodeEdit}
                      onChange={e => setMetaLanguageCodeEdit(e.target.value)}
                      className="w-full border rounded px-2 py-1.5 text-sm"
                    >
                      <option value="es">es — Español</option>
                      <option value="es_419">es_419 — Español (Latinoamérica)</option>
                      <option value="es_MX">es_MX — Español (México)</option>
                      <option value="es_AR">es_AR — Español (Argentina)</option>
                      <option value="en_US">en_US — English (US)</option>
                    </select>
                  </div>
                </div>

                {/* Orden de parámetros */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-gray-600">
                      Parámetros posicionales ({"{{1}}"}, {"{{2}}"}, …)
                    </label>
                    <button
                      onClick={addMetaParam}
                      className="flex items-center gap-1 text-xs text-green-700 hover:text-green-900 border border-green-300 rounded px-2 py-0.5"
                    >
                      <Plus className="w-3 h-3" /> Agregar
                    </button>
                  </div>
                  {metaParamOrderEdit.length === 0 && (
                    <p className="text-xs text-gray-400 italic">
                      Sin parámetros — agrega los que usa tu template en Meta.
                    </p>
                  )}
                  <div className="space-y-1.5">
                    {metaParamOrderEdit.map((param, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-500 w-8 shrink-0 text-right">
                          {`{{${i + 1}}}`}
                        </span>
                        <select
                          value={param}
                          onChange={e => updateMetaParam(i, e.target.value)}
                          className="flex-1 border rounded px-2 py-1 text-xs font-mono"
                        >
                          <option value="">— seleccionar variable —</option>
                          {ALL_VARIABLES.map(v => (
                            <option key={v.variable} value={v.variable.replace(/\{|\}/g, '')}>
                              {v.variable} — {v.descripcion}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => moveMetaParam(i, -1)}
                          disabled={i === 0}
                          className="text-gray-400 hover:text-gray-700 disabled:opacity-30"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveMetaParam(i, 1)}
                          disabled={i === metaParamOrderEdit.length - 1}
                          className="text-gray-400 hover:text-gray-700 disabled:opacity-30"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => removeMetaParam(i)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {metaParamOrderEdit.length > 0 && (
                    <p className="text-xs text-gray-400 mt-1.5">
                      El template en Meta debe tener <strong>{metaParamOrderEdit.length}</strong> variable(s) en el body: {Array.from({ length: metaParamOrderEdit.length }, (_, i) => `{{${i + 1}}}`).join(', ')}
                    </p>
                  )}
                </div>

                {/* Resumen del estado */}
                {metaTemplateNameEdit && (
                  <div className={`flex items-center gap-2 p-2 rounded text-xs border ${
                    hsmEdit === 'Aprobada'
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : hsmEdit === 'Pendiente'
                      ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    {hsmEdit === 'Aprobada'
                      ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      : <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    }
                    {hsmEdit === 'Aprobada'
                      ? `Listo: el worker enviará como template "${metaTemplateNameEdit}" con ${metaParamOrderEdit.length} parámetro(s).`
                      : hsmEdit === 'Pendiente'
                      ? 'Pendiente de aprobación en Meta. El worker usará texto libre hasta que cambies el estado a Aprobada.'
                      : 'Template rechazado por Meta. Corrígelo en Business Manager y vuelve a solicitar aprobación.'
                    }
                  </div>
                )}
              </div>
            </details>

            {/* Editor de texto */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-600">Texto de la plantilla</label>
                <button
                  onClick={() => { setShowPreview(!showPreview); if (!showPreview) triggerPreview(textoEdit); }}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                >
                  {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showPreview ? 'Ocultar preview' : 'Vista previa'}
                </button>
              </div>
              <textarea
                value={textoEdit}
                onChange={e => handleTextoChange(e.target.value)}
                rows={showPreview ? 6 : 9}
                className="w-full border rounded-lg px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="Escribe el texto de la plantilla..."
              />
            </div>

            {/* US-NOT-PREVIEW: Burbuja WhatsApp */}
            {showPreview && previewData && (
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> Vista previa — estilo WhatsApp
                </p>
                <WhatsAppBubble
                  texto={previewData.texto}
                  variablesNoEncontradas={previewData.vars}
                />
              </div>
            )}

            {/* US-NOT-VARS: Panel de variables */}
            <details className="border border-gray-200 rounded-lg">
              <summary className="px-3 py-2 text-xs font-medium text-gray-600 cursor-pointer hover:bg-gray-50">
                Variables disponibles (clic para insertar)
              </summary>
              <div className="p-3 grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                {ALL_VARIABLES.map(v => (
                  <button
                    key={v.variable}
                    onClick={() => insertVariable(v.variable)}
                    className="flex items-start gap-2 text-left px-2 py-1.5 rounded hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition-colors group"
                    title={v.descripcion}
                  >
                    <Copy className="w-3 h-3 text-indigo-400 mt-0.5 shrink-0 group-hover:text-indigo-600" />
                    <div>
                      <span className="text-xs font-mono text-indigo-700">{v.variable}</span>
                      <p className="text-xs text-gray-400 leading-tight">{v.descripcion}</p>
                    </div>
                  </button>
                ))}
              </div>
            </details>

            {/* Acciones */}
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={handleRestorePlantilla}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Restaurar por defecto
              </button>
              <button
                onClick={handleSavePlantilla}
                disabled={savingPlantilla}
                className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
              >
                {savingPlantilla ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Guardar plantilla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Segmentos (US-NOT-02) ─────────────────────────────────────── */}
      {activeTab === 'segmentos' && (
        <div className="grid grid-cols-2 gap-5">
          {/* Lista */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Segmentos guardados</h3>
              <button
                onClick={initNewSegment}
                className="flex items-center gap-1 text-xs bg-indigo-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-indigo-700"
              >
                <Plus className="w-3.5 h-3.5" /> Nuevo segmento
              </button>
            </div>
            {segments.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No hay segmentos creados.</p>
            )}
            {segments.map(seg => (
              <div key={seg.Id} className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{seg.Nombre}</p>
                    {seg.Descripcion && <p className="text-xs text-gray-500 truncate">{seg.Descripcion}</p>}
                    <p className="text-xs text-indigo-600 mt-1">
                      <Users className="w-3 h-3 inline mr-0.5" />
                      {seg.ClientesEstimados !== null ? `~${seg.ClientesEstimados} clientes` : '—'}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => editSegment(seg)} className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded">
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDeleteSegment(seg.Id, seg.Nombre)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Formulario */}
          {segmentForm ? (
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-800">
                {editSegId ? 'Editar segmento' : 'Nuevo segmento'}
              </h3>
              <input
                value={segmentForm.Nombre}
                onChange={e => setSegmentForm({ ...segmentForm, Nombre: e.target.value })}
                placeholder="Nombre del segmento*"
                className="w-full border rounded px-3 py-2 text-sm"
              />
              <input
                value={segmentForm.Descripcion}
                onChange={e => setSegmentForm({ ...segmentForm, Descripcion: e.target.value })}
                placeholder="Descripción (opcional)"
                className="w-full border rounded px-3 py-2 text-sm"
              />

              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">
                  Reglas — grupos OR, condiciones AND
                </p>
                <SegmentBuilder
                  reglas={segmentForm.Reglas}
                  onChange={r => setSegmentForm({ ...segmentForm, Reglas: r })}
                />
              </div>

              {/* Preview count */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePreviewSegment}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 border border-indigo-200 px-2.5 py-1.5 rounded-lg"
                >
                  <Eye className="w-3.5 h-3.5" /> Calcular clientes
                </button>
                {segPreviewCount !== null && (
                  <span className="text-sm font-semibold text-indigo-700">
                    <Users className="w-3.5 h-3.5 inline mr-1" />
                    {segPreviewCount} clientes coinciden
                  </span>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-1">
                <button
                  onClick={() => { setSegmentForm(null); setEditSegId(null); }}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveSegment}
                  disabled={savingSegment}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
                >
                  {savingSegment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Guardar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
              Selecciona o crea un segmento para editarlo
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Envío Masivo (US-NOT-ANTISPAM) ───────────────────────────── */}
      {activeTab === 'envio' && (
        <div className="max-w-lg space-y-4">
          <p className="text-sm text-gray-600">
            Envía una notificación de forma masiva. El sistema omite clientes que ya recibieron
            el mismo tipo de mensaje en las últimas <strong>24 horas</strong> (anti-spam).
          </p>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Tipo de notificación</label>
            <select
              value={envioTipo}
              onChange={e => setEnvioTipo(e.target.value as NotifType)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              {ALL_TIPOS.map(t => (
                <option key={t} value={t}>{NOTIF_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Segmento destinatarios
            </label>
            <select
              value={envioSegId}
              onChange={e => setEnvioSegId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Todos los clientes activos</option>
              {segments.map(s => (
                <option key={s.Id} value={s.Id}>
                  {s.Nombre} {s.ClientesEstimados !== null ? `(~${s.ClientesEstimados})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Plantilla preview */}
          {(() => {
            const p = plantillas.find(p => p.Tipo === envioTipo);
            if (!p) return null;
            return (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-gray-600">Plantilla que se enviará:</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${HSM_STATUS_COLORS[p.HsmStatus]}`}>
                    {p.HsmStatus}
                  </span>
                </div>
                {p.HsmStatus === 'Rechazada' && (
                  <p className="text-xs text-red-600 mb-1">⚠️ Esta plantilla está rechazada. Actualiza su estado antes de enviar.</p>
                )}
                <p className="text-xs text-gray-700 whitespace-pre-line line-clamp-3">{p.Texto}</p>
              </div>
            );
          })()}

          <button
            onClick={handleEnvioMasivo}
            disabled={sendingMasivo || plantillas.find(p => p.Tipo === envioTipo)?.HsmStatus === 'Rechazada'}
            className="flex items-center gap-2 w-full justify-center bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            {sendingMasivo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sendingMasivo ? 'Enviando...' : 'Iniciar envío masivo'}
          </button>

          {/* Resultado (US-NOT-ANTISPAM) */}
          {envioResult && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-1">
              <p className="text-sm font-semibold text-green-800">Envío completado</p>
              <div className="grid grid-cols-3 gap-2 text-center mt-2">
                <div className="bg-white rounded-lg p-2 border border-green-100">
                  <p className="text-2xl font-bold text-green-700">{envioResult.Enviados}</p>
                  <p className="text-xs text-gray-500">Enviados</p>
                </div>
                <div className="bg-white rounded-lg p-2 border border-yellow-100">
                  <p className="text-2xl font-bold text-yellow-600">{envioResult.OmitidosAntispam}</p>
                  <p className="text-xs text-gray-500">Anti-spam</p>
                </div>
                <div className="bg-white rounded-lg p-2 border border-gray-100">
                  <p className="text-2xl font-bold text-gray-500">{envioResult.SinTelefono}</p>
                  <p className="text-xs text-gray-500">Sin teléfono</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog state={confirmDialog} onClose={closeConfirm} running={confirmRunning} />
    </div>
  );
}
