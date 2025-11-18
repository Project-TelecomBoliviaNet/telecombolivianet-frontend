import api from './api';

// ── M10: Tipos ────────────────────────────────────────────────────────────────

export interface ConversationListItemDto {
  Id: string;
  PhoneNumber: string;
  ClientId: string | null;
  ClientName: string | null;
  IsEscalated: boolean;
  AgentName: string | null;
  EscaladoAt: string | null;
  UpdatedAt: string;
  CreatedAt: string;
  UltimoMensaje: string | null;
  TotalMessages: number;
}

export interface ConversationMessageDto {
  Id: string;
  Role: 'user' | 'bot' | 'admin';
  Source: string | null;
  Content: string;
  CreatedAt: string;
  MediaUrl: string | null;
  MediaType: string | null;
}

export interface ConversationDetailDto {
  Id: string;
  PhoneNumber: string;
  ClientId: string | null;
  ClientName: string | null;
  IsEscalated: boolean;
  AgentName: string | null;
  Messages: ConversationMessageDto[];
}

export interface ConversationStatsDto {
  TotalConversaciones: number;
  Escaladas: number;
  HoyConversaciones: number;
  HoyMensajes: number;
}

export interface ClientConversationHistoryDto {
  PhoneNumber: string;
  Conversaciones: ConversationListItemDto[];
}

// ── Bot Config ────────────────────────────────────────────────────────────────

export interface BotMenuItemDto {
  Numero: string;
  Etiqueta: string;       // título del row en WhatsApp (máx 24 chars)
  Intent: string;
  Activa: boolean;
  Descripcion?: string;   // subtítulo del row en WhatsApp (máx 72 chars)
  SoloCliente: boolean;   // si true, solo se muestra a clientes identificados
}

export interface BotMenuDto {
  TituloMenu: string;
  Opciones: BotMenuItemDto[];
  TituloBoton: string;    // label del botón que abre la lista
  TituloSeccion: string;  // título de la sección dentro de la lista
}

export interface BotHorarioDto {
  HoraInicio: string;
  HoraFin: string;
  DiasActivos: boolean[];
  MensajeFueraHorario: string;
}

export interface BotMensajesDto {
  Bienvenida:          string;
  BienvenidaProspecto: string;
  NoEntendido:         string;
  EscaladoAgente:      string;
}

export interface BotConfigDto {
  Menu: BotMenuDto;
  Horario: BotHorarioDto;
  Mensajes: BotMensajesDto;
}

export const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export const INTENTS_DISPONIBLES = [
  { value: 'CONSULTA_DEUDA',        label: 'Consultar deuda' },
  { value: 'SOLICITAR_QR',          label: 'Solicitar QR de pago' },
  { value: 'SIN_CONEXION',          label: 'Reportar sin conexión' },
  { value: 'VELOCIDAD_LENTA',       label: 'Velocidad lenta' },
  { value: 'PROBLEMA_ROUTER',       label: 'Problema con router' },
  { value: 'SOLICITAR_AGENTE',      label: 'Hablar con agente' },
  { value: 'SOLICITAR_INSTALACION', label: 'Nueva instalación' },
  { value: 'CONSULTA_PERIODO',      label: 'Consultar periodo factura' },
  { value: 'MENU',                  label: 'Volver al menú' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeBotConfig(raw: BotConfigDto): BotConfigDto {
  return {
    Menu: {
      TituloMenu:    raw?.Menu?.TituloMenu    ?? '',
      TituloBoton:   raw?.Menu?.TituloBoton   ?? 'Ver opciones',
      TituloSeccion: raw?.Menu?.TituloSeccion ?? 'Servicios disponibles',
      Opciones: Array.isArray(raw?.Menu?.Opciones)
        ? raw.Menu.Opciones.map(o => ({
            ...o,
            Descripcion: o.Descripcion ?? '',
            SoloCliente: o.SoloCliente ?? false,
          }))
        : [],
    },
    Horario: {
      HoraInicio:          raw?.Horario?.HoraInicio ?? '08:00',
      HoraFin:             raw?.Horario?.HoraFin    ?? '20:00',
      DiasActivos:         Array.isArray(raw?.Horario?.DiasActivos) ? raw.Horario.DiasActivos
                           : [true, true, true, true, true, false, false],
      MensajeFueraHorario: raw?.Horario?.MensajeFueraHorario ?? '',
    },
    Mensajes: {
      Bienvenida:          raw?.Mensajes?.Bienvenida          ?? '',
      BienvenidaProspecto: raw?.Mensajes?.BienvenidaProspecto ?? '',
      NoEntendido:         raw?.Mensajes?.NoEntendido          ?? '',
      EscaladoAgente:      raw?.Mensajes?.EscaladoAgente      ?? '',
    },
  };
}

// ── Funciones ──────────────────────────────────────────────────────────────────

const B = '/conversaciones';

export const chatbotService = {
  // US-BOT-01: bandeja unificada
  getConversaciones: async (
    page = 1, limit = 20, tab = 'todas',
  ): Promise<{ Items: ConversationListItemDto[]; Total: number }> => {
    const soloEscaladas = tab === 'escaladas';
    const res = await api.get(B, { params: { page, limit, soloEscaladas, tab } });
    return res.data.data;
  },

  getConversacion: async (phone: string): Promise<ConversationDetailDto> => {
    const res = await api.get(`${B}/${encodeURIComponent(phone)}`);
    return res.data.data;
  },

  getStats: async (): Promise<ConversationStatsDto> => {
    const res = await api.get(`${B}/stats`);
    return res.data.data;
  },

  // Intervención de agente
  tomarConversacion: async (phone: string): Promise<void> => {
    await api.post(`${B}/${encodeURIComponent(phone)}/tomar`);
  },

  devolverConversacion: async (phone: string): Promise<void> => {
    await api.post(`${B}/${encodeURIComponent(phone)}/devolver`);
  },

  sendMessage: async (phone: string, text: string): Promise<void> => {
    await api.post(`${B}/${encodeURIComponent(phone)}/responder`, { Texto: text });
  },

  // US-BOT-07: historial por cliente
  getClientHistory: async (phone: string): Promise<ClientConversationHistoryDto> => {
    const res = await api.get(`${B}/cliente/${encodeURIComponent(phone)}`);
    return res.data.data;
  },

  // US-BOT-06/02: config del bot
  getBotConfig: async (): Promise<BotConfigDto> => {
    const res = await api.get('/bot-config');
    return normalizeBotConfig(res.data.data);
  },

  updateBotConfig: async (config: BotConfigDto): Promise<BotConfigDto> => {
    const res = await api.put('/bot-config', { Config: config });
    return normalizeBotConfig(res.data.data);
  },

  resetBotConfig: async (): Promise<BotConfigDto> => {
    const res = await api.post('/bot-config/reset');
    return normalizeBotConfig(res.data.data);
  },

  // ── QR global de la empresa ────────────────────────────────────────────────

  getCompanyQrInfo: async (): Promise<{
    HasQr: boolean;
    Path: string | null;
    UpdatedAt: string | null;
    ExpiresAt: string | null;
    DaysRemaining: number | null;
  }> => {
    const res = await api.get('/bot-config/company-qr/info');
    return res.data.data;
  },

  uploadCompanyQr: async (file: File, expiresAt: string): Promise<void> => {
    const form = new FormData();
    form.append('file', file);
    form.append('expiresAt', expiresAt);
    await api.post('/bot-config/company-qr', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // ── Documentos RAG ─────────────────────────────────────────────────────────

  ragListDocuments: async (): Promise<RagDocumentDto[]> => {
    const res = await api.get('/rag/documents');
    const data = res.data.data ?? res.data;
    const docs: RagDocumentDto[] = Array.isArray(data) ? data
      : Array.isArray(data?.documents) ? data.documents
      : [];
    return docs.map((d: any) => ({
      id:         d.id,
      title:      d.title,
      fileName:   d.originalFilename ?? d.fileName ?? '',
      chunkCount: d.chunkCount ?? 0,
      createdAt:  d.createdAt,
      fileSize:   d.fileSize,
    }));
  },

  ragUploadDocument: async (file: File, title?: string): Promise<void> => {
    const form = new FormData();
    form.append('file', file);
    if (title) form.append('title', title);
    await api.post('/rag/documents', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  ragDeleteDocument: async (id: string): Promise<void> => {
    await api.delete(`/rag/documents/${id}`);
  },
};

export interface RagDocumentDto {
  id: string;
  title: string;
  fileName: string;
  chunkCount: number;
  createdAt: string;
  fileSize?: number;
}
