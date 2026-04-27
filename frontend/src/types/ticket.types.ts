export type TicketStatus   = 'Abierto' | 'EnProceso' | 'Resuelto' | 'Cerrado';
export type TicketPriority = 'Critica' | 'Alta' | 'Media' | 'Baja';
export type TicketType     = 'SoporteTecnico'|'Averia'|'Instalacion'|'Consulta'|'Reclamo'|'Mantenimiento'|'Migracion'|'Bajal'|'InstalacionNueva'|'CambioPlan'|'TvCable'|'ReactivacionServicio'|'BajaServicio'|'RecoleccionEquipo';
export type TicketOrigin   = 'Bot' | 'Manual' | 'Automatico';
export type CommentType    = 'RespuestaCliente' | 'NotaInterna' | 'CausaRaiz';

export interface TicketCommentDto { Id:string; Type:CommentType; Body:string; AuthorName:string; AuthorId:string; CreatedAt:string; }
export interface TicketWorkLogDto  { Id:string; UserName:string; UserId:string; TotalMinutes:number; Notes:string|null; LoggedAt:string; }
export interface TicketVisitDto    { Id:string; ScheduledAt:string; TechnicianName:string|null; TechnicianId:string|null; Observations:string|null; CreatedAt:string; }

export interface TicketListItemDto {
  Id:string; ClientName:string; ClientTbn:string; ClientId:string;
  Subject:string; Type:TicketType; Priority:TicketPriority; Status:TicketStatus; Origin:TicketOrigin;
  Description:string; SupportGroup:string|null;
  AssignedToName:string|null; AssignedToId:string|null; CreatedByName:string;
  CreatedAt:string; DueDate:string|null; ResolvedAt:string|null;
  FirstRespondedAt:string|null; SlaCompliant:boolean|null; CsatScore:number|null; TotalWorkMinutes:number;
  // M9
  TicketNumber:string|null;    // US-TKT-CORRELATIVO
  SlaDeadline:string|null;     // US-TKT-SLA
  AutoAssigned:boolean;        // US-TKT-BALANCEO
}

// M9: Adjunto de ticket
export interface TicketAttachmentDto {
  Id:string; FileName:string; ContentType:string; FileSizeBytes:number;
  Descripcion:string|null; StoragePath:string; SubidoPorNombre:string; SubidoAt:string;
}

// M9: Carga por técnico
export interface TecnicoCargaDto {
  TecnicoId:string; TecnicoNombre:string; TicketsActivos:number; TicketsCriticos:number;
}
export interface BalanceoResumenDto { Tecnicos: TecnicoCargaDto[]; }

export interface TicketDetailDto extends TicketListItemDto {
  AssignedToUserId:string|null; CreatedByUserId:string; ClosedAt:string|null;
  ResolutionMessage:string|null; RootCause:string|null; CsatRespondedAt:string|null;
  Comments:TicketCommentDto[]; WorkLogs:TicketWorkLogDto[]; Visits:TicketVisitDto[];
  WhatsAppWarning?:string|null;
}

export interface TicketKpiDto {
  TotalOpen:number; TotalInProcess:number; TotalResolved:number; TotalClosed:number;
  OverdueSla:number; CreatedToday:number; SlaCompliantCount:number; SlaBreachedCount:number; AvgCsatScore:number|null;
}

export interface TicketFilterRequest {
  Search?:string; Status?:string; Priority?:string; Type?:string;
  AssignedToId?:string; OverdueSla?:boolean;
  DateFrom?:string; DateTo?:string; SlaCompliant?:boolean;
  PageNumber?:number; PageSize?:number;
}

export interface CreateTicketRequest { ClientId:string; Subject:string; Type:string; Priority:string; Description:string; SupportGroup?:string; AssignedToUserId?:string; SlaDurationHours?:number; AutoAssign?:boolean; }
export interface UpdateTicketRequest  { Subject?:string; Description?:string; Priority?:string; SupportGroup?:string; RootCause?:string; }
export interface ChangeTicketStatusRequest { Status:string; ResolutionMessage?:string; }
export interface AssignTicketRequest  { TechnicianId:string; }
export interface AddCommentRequest    { Type:CommentType; Body:string; }
export interface AddWorkLogRequest    { Hours:number; Minutes:number; Notes?:string; }
export interface ScheduleVisitRequest { ScheduledAt:string; TechnicianId?:string; Observations?:string; }
export interface SubmitCsatRequest    { Score:number; }

export interface SlaPlanDto { Id:string; Name:string; Priority:string; FirstResponseMinutes:number; ResolutionMinutes:number; Schedule:string; IsActive:boolean; }
export interface CreateSlaPlanRequest { Name:string; Priority:string; FirstResponseMinutes:number; ResolutionMinutes:number; Schedule:string; }
