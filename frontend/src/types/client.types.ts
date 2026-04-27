// ── Planes ────────────────────────────────────────────────────────────────────

export interface PlanDto {
  Id:           string;
  Name:         string;
  SpeedMb:      number;
  MonthlyPrice: number;
  IsActive:     boolean;
  DisplayLabel: string;
}

// ── Clientes ──────────────────────────────────────────────────────────────────

export type ClientStatus = 'Activo' | 'Suspendido' | 'DadoDeBaja';

export interface ClientListItemDto {
  Id:            string;
  TbnCode:       string;
  FullName:      string;
  Zone:          string;
  PhoneMain:     string;
  PlanName:      string;
  HasTvCable:    boolean;
  Status:        ClientStatus;
  TotalDebt:     number;
  PendingMonths: number;
  CreditBalance: number;     // US-PAG-CREDITO
  Email?:        string;     // US-CLI-01
}

export interface ClientDetailDto {
  Id:                string;
  TbnCode:           string;
  FullName:          string;
  IdentityCard:      string;
  PhoneMain:         string;
  PhoneSecondary:    string | null;
  Zone:              string;
  Street:            string | null;
  LocationRef:       string | null;
  GpsLatitude:       number | null;
  GpsLongitude:      number | null;
  WinboxNumber:      string;
  InstallationDate:  string;
  InstalledByUserId: string;
  InstalledByName:   string;
  Plan:              PlanDto;
  HasTvCable:        boolean;
  OnuSerialNumber:   string | null;
  Status:            ClientStatus;
  SuspendedAt:       string | null;
  CancelledAt:       string | null;
  TotalDebt:         number;
  PendingMonths:     number;
  CreditBalance:     number;
  Email?:            string;
  LastPaymentDate:   string | null;
  InstallationPaid:  boolean;
  CreatedAt:         string;
}

// ── Facturas ──────────────────────────────────────────────────────────────────

export type InvoiceStatus = 'Pendiente' | 'Pagada' | 'Vencida' | 'Anulada';
export type InvoiceType   = 'Mensualidad' | 'Instalacion';

export interface InvoiceDto {
  Id:       string;
  Type:     InvoiceType;
  Status:   InvoiceStatus;
  Year:     number;
  Month:    number;
  Amount:   number;
  IssuedAt: string;
  DueDate:  string;
  Notes:    string | null;
}

export interface PaymentSummaryDto {
  Id:                    string;
  Amount:                number;
  Method:                string;
  Bank:                  string | null;
  PaidAt:                string;
  RegisteredAt:          string;
  RegisteredByName:      string;
  FromWhatsApp:          boolean;
  ReceiptImageUrl:       string | null;
  PhysicalReceiptNumber: string | null;
  CanVoid:               boolean;
  IsVoided:              boolean;
  CoveredMonths:         string[];
}

export interface InvoiceGridDto {
  Invoices:        InvoiceDto[];
  Payments:        PaymentSummaryDto[];
  TotalDebt:       number;
  PendingMonths:   number;
  CreditBalance:   number;
  Email?:          string;
  LastPaymentDate: string | null;
}

// ── Pagos ─────────────────────────────────────────────────────────────────────

export type PaymentMethod = 'Efectivo' | 'DepositoBancario' | 'QR';

export interface RegisterPaymentRequest {
  ClientId:              string;
  Amount:                number;
  Method:                PaymentMethod;
  Bank?:                 string;
  PaidAt:                string;
  PhysicalReceiptNumber?: string;
  InvoiceIds:            string[];
  ConfirmedDuplicate?:   boolean;
}

// ── Registro de cliente ───────────────────────────────────────────────────────

export interface RegisterClientRequest {
  FullName:              string;
  IdentityCard:          string;
  PhoneMain:             string;
  PhoneSecondary?:       string;
  Zone:                  string;
  Street?:               string;
  LocationRef?:          string;
  GpsLatitude?:          number;
  GpsLongitude?:         number;
  WinboxNumber:          string;
  InstallationDate:      string;
  InstalledByUserId:     string;
  PlanId:                string;
  HasTvCable:            boolean;
  OnuSerialNumber?:      string;
  InstallationCost:      number;
  PaidInstallation:      boolean;
  PaidFirstMonth:        boolean;
  PaymentMethod?:        PaymentMethod;
  Bank?:                 string;
  PhysicalReceiptNumber?: string;
}

export interface UpdateClientRequest {
  FullName:          string;
  IdentityCard:      string;
  PhoneMain:         string;
  PhoneSecondary?:   string;
  Zone:              string;
  Street?:           string;
  LocationRef?:      string;
  GpsLatitude?:      number;
  GpsLongitude?:     number;
  WinboxNumber:      string;
  PlanId:            string;
  HasTvCable:        boolean;
  OnuSerialNumber?:  string;
}

// ── QR de pago ────────────────────────────────────────────────────────────────

export interface ClientQrInfoDto {
  ImageUrl:       string;
  UploadedAt:     string;
  ExpiresAt:      string | null;
  DaysUntilExpiry: number | null;
}

// ── Solicitudes de cambio de plan ─────────────────────────────────────────────

export interface PlanChangeRequestDto {
  Id:            string;
  PlanAnterior:  string;
  PlanNuevo:     string;
  SolicitadoAt:  string;
  Notes:         string | null;
  ClienteTbn?:    string;
  ClienteNombre?: string;
  FechaEfectiva?: string;
}

// ── Filtros ───────────────────────────────────────────────────────────────────

export interface ClientFilterDto {
  Search?:      string;
  Status?:      string;
  PlanId?:      string;
  DebtFilter?:  string;
  SortBy?:      string;
  PageNumber?:  number;
  PageSize?:    number;
}
