import { useEffect, useState, useCallback, useRef } from 'react';
import {
  MessageSquare, Loader2, User,
  ArrowUpRight, Search, RefreshCw,
} from 'lucide-react';
import {
  chatbotService,
  type ConversationListItemDto,
  type ConversationDetailDto,
  type ConversationMessageDto,
  type ConversationStatsDto,
} from '@/services/chatbotService';
import { useAuthContext } from '@/contexts/AuthContext';

// ── helpers ────────────────────────────────────────────────────────────────

const fmtTime = (d: string) => new Date(d).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
const fmtDate = (d: string) => new Date(d).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit' });

type BandejaTab = 'sin-responder' | 'en-atencion' | 'escaladas' | 'todas';

const TAB_LABELS: Record<BandejaTab, string> = {
  'sin-responder': 'Sin responder',
  'en-atencion':   'En atención',
  'escaladas':     'Escaladas',
  'todas':         'Todas',
};

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
  const messagesEndRef                    = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [convRes, statsRes] = await Promise.all([
        chatbotService.getConversaciones(page, 30, tab === 'escaladas'),
        chatbotService.getStats(),
      ]);
      setConversations(convRes.Items);
      setTotal(convRes.Total);
      setStats(statsRes);
    } catch {
      setError('Error al cargar las conversaciones.');
    } finally { setLoading(false); }
  }, [tab, page]);

  useEffect(() => { load(); }, [load]);

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [detail?.Messages]);

  const handleSelectConv = async (phone: string) => {
    setSelected(phone);
    setDetailLoading(true);
    try {
      const d = await chatbotService.getConversacion(phone);
      setDetail(d);
    } catch {
      setError('Error al cargar la conversación.');
    } finally { setDetailLoading(false); }
  };

  // Filtrar por búsqueda local
  const filtered = conversations.filter(c =>
    !search ||
    c.ClientName?.toLowerCase().includes(search.toLowerCase()) ||
    c.PhoneNumber.includes(search)
  );

  // Contar badges por tab
  const escaladas = conversations.filter(c => c.IsEscalated).length;

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* ── Sidebar bandeja ───────────────────────────────────────────── */}
      <div className="w-80 border-r border-gray-200 flex flex-col bg-white">
        {/* Header + stats */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-green-600" /> WhatsApp
            </h2>
            <button onClick={load} className="text-gray-400 hover:text-gray-600">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
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
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
                <User className="w-5 h-5 text-green-700" />
              </div>
              <div>
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
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {detail.Messages.map(msg => (
                <ChatBubble key={msg.Id} msg={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

// ── Subcomponentes ────────────────────────────────────────────────────────────

function ConvListItem({
  conv, selected, onClick,
}: { conv: ConversationListItemDto; selected: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-start gap-3 px-3 py-3 cursor-pointer border-b border-gray-50 transition-colors ${
        selected ? 'bg-green-50 border-l-2 border-l-green-500' : 'hover:bg-gray-50'
      }`}
    >
      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
        <User className="w-4 h-4 text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <p className="text-sm font-medium text-gray-900 truncate">
            {conv.ClientName ?? conv.PhoneNumber}
          </p>
          <span className="text-xs text-gray-400 shrink-0 ml-1">{fmtDate(conv.UpdatedAt)}</span>
        </div>
        {conv.UltimoMensaje && (
          <p className="text-xs text-gray-400 truncate">{conv.UltimoMensaje}</p>
        )}
        {conv.IsEscalated && (
          <span className="text-xs bg-orange-50 text-orange-600 px-1.5 rounded font-medium">
            <ArrowUpRight className="w-3 h-3 inline" /> Escalada
          </span>
        )}
      </div>
    </div>
  );
}

function ChatBubble({ msg }: { msg: ConversationMessageDto }) {
  const isUser  = msg.Role === 'user';
  const isAdmin = msg.Role === 'admin';

  return (
    <div className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[70%] rounded-2xl px-3 py-2 shadow-sm ${
        isUser  ? 'bg-white text-gray-800 rounded-tl-sm' :
        isAdmin ? 'bg-blue-600 text-white rounded-tr-sm' :
                  'bg-[#dcf8c6] text-gray-800 rounded-tr-sm'
      }`}>
        {isAdmin && (
          <p className="text-xs font-semibold mb-0.5 opacity-80">Agente</p>
        )}
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.Content}</p>
        <p className={`text-right text-xs mt-0.5 ${isUser ? 'text-gray-400' : 'opacity-60'}`}>
          {fmtTime(msg.CreatedAt)}
        </p>
      </div>
    </div>
  );
}
