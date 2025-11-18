import { useEffect, useState, useCallback, useRef, KeyboardEvent } from 'react';
import {
  MessageSquare, Loader2,
  ArrowUpRight, Search, RefreshCw, Send, UserCheck, Bot, Wifi, WifiOff,
  ImageOff, Mic, Image, X, ZoomIn,
} from 'lucide-react';
import {
  chatbotService,
  type ConversationListItemDto,
  type ConversationDetailDto,
  type ConversationMessageDto,
  type ConversationStatsDto,
} from '@/services/chatbotService';
import { useAdminHub } from '@/hooks/useAdminHub';
import { useAuthContext } from '@/contexts/AuthContext';

// ── helpers ────────────────────────────────────────────────────────────────

const fmtTime = (d: string) => new Date(d).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });

function fmtRelative(d: string): string {
  const diffMs  = Date.now() - new Date(d).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1)  return 'ahora';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24)   return `hace ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7)    return `hace ${diffD} d`;
  return new Date(d).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit' });
}

function getInitials(name: string | null, phone: string): string {
  if (!name) return phone.slice(-2);
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-green-600', 'bg-purple-500', 'bg-orange-500',
  'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-red-500',
];
function avatarColor(phone: string): string {
  let hash = 0;
  for (const ch of phone) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

type BandejaTab = 'sin-responder' | 'en-atencion' | 'escaladas' | 'todas';

const TAB_LABELS: Record<BandejaTab, string> = {
  'sin-responder': 'Sin responder',
  'en-atencion':   'En atención',
  'escaladas':     'Escaladas',
  'todas':         'Todas',
};

const LS_KEY = 'conv_last_read';

function loadUnreadMap(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); }
  catch { return {}; }
}

// ═══════════════════════════════════════════════════════════════════════════
// ConversacionesPage — US-BOT-01
// ═══════════════════════════════════════════════════════════════════════════

export default function ConversacionesPage() {
  useAuthContext();
  const [tab, setTab]                     = useState<BandejaTab>('sin-responder');
  const [conversations, setConversations] = useState<ConversationListItemDto[]>([]);
  const [total, setTotal]                 = useState(0);
  const [stats, setStats]                 = useState<ConversationStatsDto | null>(null);
  const [loading, setLoading]             = useState(true);
  const [selected, setSelected]           = useState<string | null>(null);
  const [detail, setDetail]               = useState<ConversationDetailDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch]               = useState('');
  const [page, setPage]                   = useState(1);
  const [error, setError]                 = useState<string | null>(null);
  const [messageText, setMessageText]     = useState('');
  const [sending, setSending]             = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [lightboxUrl, setLightboxUrl]     = useState<string | null>(null);
  const messagesEndRef                    = useRef<HTMLDivElement>(null);
  const textareaRef                       = useRef<HTMLTextAreaElement>(null);

  // ── Unread tracking ──────────────────────────────────────────────────────
  // Maps phone → ISO timestamp of when the admin last read that conversation.
  const [unreadMap, setUnreadMap] = useState<Record<string, string>>(loadUnreadMap);

  // Ref so interval callbacks always see the current selected phone without
  // being recreated every time selected changes.
  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selected;

  // ── SignalR: actualización en tiempo real ─────────────────────────────────
  const { status: hubStatus } = useAdminHub({
    onBotEvent: useCallback(() => {
      // Cualquier evento del bot (nuevo mensaje, escalación) → refresca sidebar
      loadSilentRef.current?.();
    }, []),
  });

  // Ref para usar loadSilent dentro del callback de SignalR sin recrear el hook
  const loadSilentRef = useRef<(() => void) | null>(null);

  // ── Data loading ─────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [convRes, statsRes] = await Promise.all([
        chatbotService.getConversaciones(page, 30, tab),
        chatbotService.getStats(),
      ]);
      setConversations(convRes.Items);
      setTotal(convRes.Total);
      setStats(statsRes);
    } catch {
      setError('Error al cargar las conversaciones.');
    } finally { setLoading(false); }
  }, [tab, page]);

  // Silent variant — no loading spinner, usado por polling y SignalR.
  const loadSilent = useCallback(async () => {
    try {
      const [convRes, statsRes] = await Promise.all([
        chatbotService.getConversaciones(page, 30, tab),
        chatbotService.getStats(),
      ]);
      setConversations(convRes.Items);
      setTotal(convRes.Total);
      setStats(statsRes);
    } catch { /* silent */ }
  }, [tab, page]);

  // Mantener ref actualizada para el callback de SignalR
  useEffect(() => { loadSilentRef.current = loadSilent; }, [loadSilent]);

  useEffect(() => { load(); }, [load]);

  // Seed unreadMap on first load: any conversation not yet tracked gets its
  // current UpdatedAt stored, so only *new* messages trigger the badge.
  useEffect(() => {
    if (loading || conversations.length === 0) return;
    setUnreadMap(prev => {
      let changed = false;
      const next = { ...prev };
      for (const conv of conversations) {
        if (!(conv.PhoneNumber in next)) {
          next[conv.PhoneNumber] = conv.UpdatedAt;
          changed = true;
        }
      }
      if (changed) {
        localStorage.setItem(LS_KEY, JSON.stringify(next));
        return next;
      }
      return prev;
    });
  }, [loading, conversations]);

  // Poll sidebar cada 15 s como respaldo (SignalR es el canal principal).
  useEffect(() => {
    const id = setInterval(loadSilent, 15_000);
    return () => clearInterval(id);
  }, [loadSilent]);

  // Silently refresh the open conversation every 10 s.
  useEffect(() => {
    if (!selected) return;
    const id = setInterval(async () => {
      const phone = selectedRef.current;
      if (!phone) return;
      try {
        const d = await chatbotService.getConversacion(phone);
        setDetail(d);
      } catch { /* silent */ }
    }, 10_000);
    return () => clearInterval(id);
  }, [selected]);

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [detail?.Messages]);

  // ── Unread helpers ────────────────────────────────────────────────────────

  const markAsRead = useCallback((phone: string) => {
    const ts = new Date().toISOString();
    setUnreadMap(prev => {
      const next = { ...prev, [phone]: ts };
      localStorage.setItem(LS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isUnread = (conv: ConversationListItemDto): boolean => {
    if (conv.PhoneNumber === selected) return false;
    const lastRead = unreadMap[conv.PhoneNumber];
    if (!lastRead) return false; // not yet seeded — treat as read
    return new Date(conv.UpdatedAt) > new Date(lastRead);
  };

  // ── Actions ───────────────────────────────────────────────────────────────

  const reloadDetail = async (phone: string) => {
    setDetailLoading(true);
    try {
      const d = await chatbotService.getConversacion(phone);
      setDetail(d);
    } catch {
      setError('Error al actualizar la conversación.');
    } finally { setDetailLoading(false); }
  };

  const handleTakeover = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      await chatbotService.tomarConversacion(selected);
      await reloadDetail(selected);
      textareaRef.current?.focus();
    } catch {
      setError('Error al tomar la conversación.');
    } finally { setActionLoading(false); }
  };

  const handleRelease = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      await chatbotService.devolverConversacion(selected);
      await reloadDetail(selected);
    } catch {
      setError('Error al devolver la conversación al bot.');
    } finally { setActionLoading(false); }
  };

  const handleSend = async () => {
    if (!selected || !messageText.trim() || sending) return;
    setSending(true);
    const text = messageText.trim();
    setMessageText('');
    try {
      await chatbotService.sendMessage(selected, text);
      await reloadDetail(selected);
    } catch {
      setMessageText(text);
      setError('Error al enviar el mensaje.');
    } finally { setSending(false); }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSelectConv = async (phone: string) => {
    setSelected(phone);
    markAsRead(phone);
    setDetailLoading(true);
    try {
      const d = await chatbotService.getConversacion(phone);
      setDetail(d);
    } catch {
      setError('Error al cargar la conversación.');
    } finally { setDetailLoading(false); }
  };

  // ── Derived state ─────────────────────────────────────────────────────────

  const filtered = conversations.filter(c =>
    !search ||
    c.ClientName?.toLowerCase().includes(search.toLowerCase()) ||
    c.PhoneNumber.includes(search)
  );

  const escaladas   = conversations.filter(c => c.IsEscalated).length;
  const totalUnread = conversations.filter(isUnread).length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* ── Sidebar bandeja ───────────────────────────────────────────── */}
      <div className="w-80 border-r border-gray-200 flex flex-col bg-white">
        {/* Header + stats */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-green-600" /> WhatsApp
              {totalUnread > 0 && (
                <span className="ml-1 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {totalUnread}
                </span>
              )}
            </h2>
            <div className="flex items-center gap-1.5">
              <span title={hubStatus === 'connected' ? 'Tiempo real activo' : 'Tiempo real desconectado'}>
                {hubStatus === 'connected'
                  ? <Wifi    className="w-3.5 h-3.5 text-green-500" />
                  : <WifiOff className="w-3.5 h-3.5 text-gray-400"  />}
              </span>
              <button onClick={load} className="text-gray-400 hover:text-gray-600">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {stats && (
            <div className="grid grid-cols-2 gap-2">
              {[
                { l: 'Hoy',      v: stats.HoyConversaciones },
                { l: 'Escaladas', v: stats.Escaladas, red: stats.Escaladas > 0 },
              ].map(s => (
                <div key={s.l} className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className={`text-lg font-bold ${s.red ? 'text-red-600' : 'text-gray-800'}`}>{s.v}</p>
                  <p className="text-xs text-gray-400">{s.l}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {(Object.keys(TAB_LABELS) as BandejaTab[]).map(t => (
            <button key={t}
              onClick={() => { setTab(t); setPage(1); setSelected(null); setDetail(null); }}
              className={`flex-1 px-2 py-2 text-xs font-medium whitespace-nowrap transition-colors relative ${
                tab === t ? 'text-green-700 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {TAB_LABELS[t]}
              {t === 'escaladas' && escaladas > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                  {escaladas}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Búsqueda */}
        <div className="px-3 py-2 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o teléfono…"
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="p-4 text-center text-red-500 text-sm">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-sm">Sin conversaciones.</div>
          ) : (
            filtered.map(conv => (
              <ConvListItem
                key={conv.Id}
                conv={conv}
                selected={selected === conv.PhoneNumber}
                unread={isUnread(conv)}
                onClick={() => handleSelectConv(conv.PhoneNumber)}
              />
            ))
          )}
        </div>

        {/* Paginación */}
        {total > 30 && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 text-xs text-gray-500">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="px-2 py-1 border rounded disabled:opacity-40">← Ant</button>
            <span>{page}</span>
            <button disabled={page * 30 >= total} onClick={() => setPage(p => p + 1)}
              className="px-2 py-1 border rounded disabled:opacity-40">Sig →</button>
          </div>
        )}
      </div>

      {/* ── Área de chat ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-[#f0f2f5]">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-200" />
              <p className="text-sm">Selecciona una conversación para verla</p>
            </div>
          </div>
        ) : detailLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : detail ? (
          <>
            {/* Chat header */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full ${avatarColor(detail.PhoneNumber)} flex items-center justify-center text-white text-xs font-bold select-none`}>
                {getInitials(detail.ClientName, detail.PhoneNumber)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900">
                  {detail.ClientName ?? detail.PhoneNumber}
                </p>
                <p className="text-xs text-gray-400 flex items-center gap-2">
                  {detail.PhoneNumber}
                  {detail.IsEscalated && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">
                      Escalada {detail.AgentName ? `→ ${detail.AgentName}` : ''}
                    </span>
                  )}
                </p>
              </div>

              {/* Botón Tomar / Devolver */}
              {detail.IsEscalated ? (
                <button
                  onClick={handleRelease}
                  disabled={actionLoading}
                  title="Devolver la conversación al bot"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  {actionLoading
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Bot className="w-3.5 h-3.5" />}
                  Devolver al bot
                </button>
              ) : (
                <button
                  onClick={handleTakeover}
                  disabled={actionLoading}
                  title="Tomar el control de esta conversación"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {actionLoading
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <UserCheck className="w-3.5 h-3.5" />}
                  Tomar conversación
                </button>
              )}
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {detail.Messages.map(msg => (
                <ChatBubble key={msg.Id} msg={msg} onImageClick={setLightboxUrl} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de respuesta — solo cuando el agente tiene el control */}
            {detail.IsEscalated && (
              <>
              {/* Banner informativo: bot silenciado */}
              <div className="mx-4 mb-2 mt-1 flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700">
                <Bot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500" />
                <span>
                  <span className="font-semibold">Bot silenciado</span> — el agente tiene el control de esta conversación.
                  Pulsa <span className="font-semibold">Devolver al bot</span> para reactivarlo.
                </span>
              </div>
              <div className="bg-white border-t border-gray-200 px-4 py-3 flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe un mensaje… (Enter para enviar, Shift+Enter para nueva línea)"
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 max-h-32 overflow-y-auto"
                  style={{ minHeight: '40px' }}
                />
                <button
                  onClick={handleSend}
                  disabled={!messageText.trim() || sending}
                  className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {sending
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Send className="w-4 h-4" />}
                </button>
              </div>
              </>
            )}
          </>
        ) : null}
      </div>
    </div>

    {/* ── Lightbox ─────────────────────────────────────────────────────── */}
    {lightboxUrl && (
      <div
        className="fixed inset-0 z-[200] bg-black/85 flex items-center justify-center"
        onClick={() => setLightboxUrl(null)}
        onKeyDown={e => e.key === 'Escape' && setLightboxUrl(null)}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
      >
        <button
          onClick={() => setLightboxUrl(null)}
          className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/40 rounded-full p-1.5 transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>
        <a
          href={lightboxUrl}
          target="_blank"
          rel="noreferrer"
          onClick={e => e.stopPropagation()}
          className="absolute top-4 left-4 text-white/80 hover:text-white bg-black/40 rounded-full p-1.5 transition-colors"
          aria-label="Abrir en nueva pestaña"
        >
          <ArrowUpRight className="w-5 h-5" />
        </a>
        <img
          src={lightboxUrl}
          alt="Vista ampliada"
          className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
          onClick={e => e.stopPropagation()}
        />
      </div>
    )}
    </>
  );
}

// ── Subcomponentes ────────────────────────────────────────────────────────────

function ConvListItem({
  conv, selected, unread, onClick,
}: {
  conv: ConversationListItemDto;
  selected: boolean;
  unread: boolean;
  onClick: () => void;
}) {
  const initials = getInitials(conv.ClientName, conv.PhoneNumber);
  const color    = avatarColor(conv.PhoneNumber);

  return (
    <div
      onClick={onClick}
      className={`flex items-start gap-3 px-3 py-3 cursor-pointer border-b border-gray-50 transition-colors ${
        selected ? 'bg-green-50 border-l-2 border-l-green-500' : 'hover:bg-gray-50'
      }`}
    >
      {/* Avatar con iniciales + punto no leído */}
      <div className="relative shrink-0">
        <div className={`w-9 h-9 rounded-full ${color} flex items-center justify-center text-white text-xs font-bold select-none`}>
          {initials}
        </div>
        {unread && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <p className={`text-sm truncate ${unread ? 'font-semibold text-gray-900' : 'font-medium text-gray-900'}`}>
            {conv.ClientName ?? conv.PhoneNumber}
          </p>
          <span className={`text-xs shrink-0 ml-1 ${unread ? 'text-green-600 font-semibold' : 'text-gray-400'}`}>
            {fmtRelative(conv.UpdatedAt)}
          </span>
        </div>
        {conv.UltimoMensaje ? (
          <p className={`text-xs truncate flex items-center gap-1 ${unread ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
            {conv.UltimoMensaje.startsWith('[Imagen]') || conv.UltimoMensaje.startsWith('📷') ? (
              <><Image className="w-3 h-3 shrink-0" /><span>Foto</span></>
            ) : conv.UltimoMensaje.startsWith('[Audio]') || conv.UltimoMensaje.startsWith('🎤') ? (
              <><Mic className="w-3 h-3 shrink-0" /><span>Audio</span></>
            ) : (
              conv.UltimoMensaje
            )}
          </p>
        ) : (
          <p className="text-xs text-gray-300 truncate italic">Sin mensajes</p>
        )}
        {conv.IsEscalated && (
          <span className="inline-flex items-center gap-0.5 text-xs bg-orange-50 text-orange-600 px-1.5 rounded font-medium mt-0.5">
            <ArrowUpRight className="w-3 h-3" /> Escalada
          </span>
        )}
      </div>
    </div>
  );
}

function ChatBubble({ msg, onImageClick }: { msg: ConversationMessageDto; onImageClick?: (url: string) => void }) {
  const [imgError, setImgError] = useState(false);
  const [blobUrl, setBlobUrl]   = useState<string | null>(null);

  useEffect(() => {
    if (!msg.MediaUrl) return;
    const isNgrok = /ngrok/.test(msg.MediaUrl);
    if (!isNgrok) return;
    let objectUrl: string | null = null;
    fetch(msg.MediaUrl, { headers: { 'ngrok-skip-browser-warning': 'true' } })
      .then(r => r.blob())
      .then(blob => { objectUrl = URL.createObjectURL(blob); setBlobUrl(objectUrl); })
      .catch(() => setImgError(true));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [msg.MediaUrl]);

  const resolvedImgUrl = blobUrl ?? msg.MediaUrl ?? '';
  const isUser  = msg.Role === 'user';
  const isAdmin = msg.Role === 'admin';
  const isAudio = msg.MediaType === 'audio' && !!msg.MediaUrl;
  const isImage = (msg.MediaType === 'image' || msg.MediaType === 'sticker') && !!msg.MediaUrl;

  const bubbleBg =
    isUser  ? 'bg-white text-gray-800 rounded-tl-sm' :
    isAdmin ? 'bg-blue-600 text-white rounded-tr-sm' :
              'bg-[#dcf8c6] text-gray-800 rounded-tr-sm';

  return (
    <div className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[70%] rounded-2xl shadow-sm overflow-hidden ${bubbleBg} ${isImage ? 'p-1' : 'px-3 py-2'}`}>
        {isAdmin && !isImage && (
          <p className="text-xs font-semibold mb-0.5 opacity-80">Agente</p>
        )}

        {isImage ? (
          <div className="relative">
            {imgError ? (
              <div className="flex flex-col items-center justify-center gap-1 w-48 h-32 bg-gray-100 text-gray-400 rounded-xl">
                <ImageOff className="w-6 h-6" />
                <span className="text-xs">Imagen no disponible</span>
                <a href={msg.MediaUrl!} target="_blank" rel="noreferrer"
                  className="text-xs text-blue-500 underline">Abrir enlace</a>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onImageClick?.(resolvedImgUrl)}
                className="group relative block focus:outline-none"
              >
                <img
                  src={resolvedImgUrl}
                  alt="Imagen"
                  className="rounded-xl max-w-[240px] max-h-64 object-cover block"
                  onError={() => setImgError(true)}
                />
                <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <ZoomIn className="w-7 h-7 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            )}
            {msg.Content && (
              <p className={`text-sm whitespace-pre-wrap leading-relaxed px-2 pt-1.5 pb-0.5 ${isUser ? 'text-gray-800' : ''}`}>
                {msg.Content}
              </p>
            )}
            <p className={`text-right text-xs px-2 pb-1 ${isUser ? 'text-gray-400' : 'opacity-60'}`}>
              {fmtTime(msg.CreatedAt)}
            </p>
          </div>
        ) : isAudio ? (
          <>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Mic className="w-3.5 h-3.5 opacity-60 shrink-0" />
              <audio controls src={msg.MediaUrl!} className="max-w-[220px]" style={{ height: '32px' }} />
            </div>
            <p className={`text-right text-xs mt-0.5 ${isUser ? 'text-gray-400' : 'opacity-60'}`}>
              {fmtTime(msg.CreatedAt)}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.Content}</p>
            <p className={`text-right text-xs mt-0.5 ${isUser ? 'text-gray-400' : 'opacity-60'}`}>
              {fmtTime(msg.CreatedAt)}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
