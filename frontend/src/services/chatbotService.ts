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
  Etiqueta: string;
  Intent: string;
  Activa: boolean;
}

export interface BotMenuDto {
  TituloMenu: string;
  Opciones: BotMenuItemDto[];
}

export interface BotHorarioDto {
  HoraInicio: string;
  HoraFin: string;
  DiasActivos: boolean[];
  MensajeFueraHorario: string;
}

export interface BotMensajesDto {
  Bienvenida: string;
  Despedida: string;
  NoEntendido: string;
  EscaladoAgente: string;
}

export interface BotConfigDto {
  Menu: BotMenuDto;
  Horario: BotHorarioDto;
  Mensajes: BotMensajesDto;
  PalabrasClave: string[];
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

// ── Funciones ──────────────────────────────────────────────────────────────────

const B = '/conversaciones';

export const chatbotService = {
  // US-BOT-01: bandeja unificada
  getConversaciones: async (
    page = 1, limit = 20, soloEscaladas = false,
  ): Promise<{ Items: ConversationListItemDto[]; Total: number }> => {
    const res = await api.get(B, { params: { page, limit, soloEscaladas } });
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

  // US-BOT-07: historial por cliente
  getClientHistory: async (phone: string): Promise<ClientConversationHistoryDto> => {
    const res = await api.get(`${B}/cliente/${encodeURIComponent(phone)}`);
    return res.data.data;
  },

  // US-BOT-06/02: config del bot
  getBotConfig: async (): Promise<BotConfigDto> => {
    const res = await api.get('/bot-config');
    return res.data.data;
  },

  updateBotConfig: async (config: BotConfigDto): Promise<BotConfigDto> => {
    const res = await api.put('/bot-config', { Config: config });
    return res.data.data;
  },

  resetBotConfig: async (): Promise<BotConfigDto> => {
    const res = await api.post('/bot-config/reset');
    return res.data.data;
  },

  // ── QR global de la empresa ────────────────────────────────────────────────

  getCompanyQrInfo: async (): Promise<{ HasQr: boolean; Path: string | null; UpdatedAt: string | null }> => {
    const res = await api.get('/bot-config/company-qr/info');
    return res.data.data;
  },

  uploadCompanyQr: async (file: File): Promise<void> => {
    const form = new FormData();
    form.append('file', file);
    await api.post('/bot-config/company-qr', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // ── Documentos RAG ─────────────────────────────────────────────────────────

  ragListDocuments: async (): Promise<RagDocumentDto[]> => {
    const res = await api.get('/rag/documents');
    return (res.data.data ?? res.data) as RagDocumentDto[];
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
