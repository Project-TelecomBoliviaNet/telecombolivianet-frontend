import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('./api', () => ({
  default: {
    get:    vi.fn(),
    put:    vi.fn(),
    post:   vi.fn(),
    patch:  vi.fn(),
    delete: vi.fn(),
  },
}));

import api from './api';
import { paymentService } from './paymentService';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const PAYMENT_ITEM = {
  Id:       'pago-uuid-001',
  ClientId: 'uuid-001',
  Amount:   150,
  PaidAt:   '2026-04-01T08:00:00Z',
  Method:   'Transferencia',
  Status:   'Activo',
};

const PAGED_PAYMENTS = {
  Items:       [PAYMENT_ITEM],
  TotalCount:  1,
  PageNumber:  1,
  PageSize:    20,
  TotalPages:  1,
  HasPreviousPage: false,
  HasNextPage:     false,
};

const WHATSAPP_QUEUE_ITEM = {
  Id:           'wh-uuid-001',
  ClientName:   'Juan Mamani',
  Amount:       150,
  ImageUrl:     'https://storage.bucket/receipt.jpg',
  Status:       'Pendiente',
  ReceivedAt:   '2026-04-27T09:00:00Z',
};

// ── getAll ────────────────────────────────────────────────────────────────────

describe('paymentService.getAll', () => {
  beforeEach(() => vi.clearAllMocks());

  it('TC-PAY-FE-01 — llama GET /payments sin filtros', async () => {
    (api.get as Mock).mockResolvedValueOnce({ data: { data: PAGED_PAYMENTS } });

    await paymentService.getAll({});

    expect(api.get).toHaveBeenCalledWith('/payments', { params: {} });
  });

  it('TC-PAY-FE-02 — pasa filtros de fecha como params', async () => {
    (api.get as Mock).mockResolvedValueOnce({ data: { data: PAGED_PAYMENTS } });

    await paymentService.getAll({ from: '2026-04-01', to: '2026-04-30' });

    expect(api.get).toHaveBeenCalledWith('/payments', {
      params: { from: '2026-04-01', to: '2026-04-30' },
    });
  });

  it('TC-PAY-FE-03 — retorna el resultado paginado', async () => {
    (api.get as Mock).mockResolvedValueOnce({ data: { data: PAGED_PAYMENTS } });

    const result = await paymentService.getAll({});

    expect(result.TotalCount).toBe(1);
    expect(result.Items[0].Id).toBe('pago-uuid-001');
  });
});

// ── getById ───────────────────────────────────────────────────────────────────

describe('paymentService.getById', () => {
  beforeEach(() => vi.clearAllMocks());

  it('TC-PAY-FE-04 — llama GET /payments/:id', async () => {
    (api.get as Mock).mockResolvedValueOnce({ data: { data: PAYMENT_ITEM } });

    await paymentService.getById('pago-uuid-001');

    expect(api.get).toHaveBeenCalledWith('/payments/pago-uuid-001');
  });
});

// ── voidPayment ───────────────────────────────────────────────────────────────

describe('paymentService.voidPayment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('TC-PAY-FE-05 — llama PUT /payments/:id/void con Justification en PascalCase', async () => {
    (api.put as Mock).mockResolvedValueOnce({ data: { data: { InvoicesReverted: 1, Message: 'OK' } } });

    await paymentService.voidPayment('pago-uuid-001', 'Pago duplicado');

    expect(api.put).toHaveBeenCalledWith(
      '/payments/pago-uuid-001/void',
      { Justification: 'Pago duplicado' },
    );
  });
});

// ── checkDuplicate ─────────────────────────────────────────────────────────────

describe('paymentService.checkDuplicate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('TC-PAY-FE-06 — llama GET /payments/check-duplicate con los params correctos', async () => {
    (api.get as Mock).mockResolvedValueOnce({ data: { data: { isDuplicate: false } } });

    await paymentService.checkDuplicate('uuid-001', 150, '2026-04-27');

    expect(api.get).toHaveBeenCalledWith('/payments/check-duplicate', {
      params: { clientId: 'uuid-001', amount: 150, paidAt: '2026-04-27' },
    });
  });
});

// ── WhatsApp queue ────────────────────────────────────────────────────────────

describe('paymentService.getWhatsAppQueue', () => {
  beforeEach(() => vi.clearAllMocks());

  it('TC-PAY-FE-07 — llama GET /payments/whatsapp-queue con paginación', async () => {
    (api.get as Mock).mockResolvedValueOnce({
      data: { data: { items: [WHATSAPP_QUEUE_ITEM], total: 1 } },
    });

    await paymentService.getWhatsAppQueue(1, 20, 'Pendiente');

    expect(api.get).toHaveBeenCalledWith('/payments/whatsapp-queue', {
      params: { page: 1, pageSize: 20, status: 'Pendiente' },
    });
  });
});

describe('paymentService.approveReceipt', () => {
  beforeEach(() => vi.clearAllMocks());

  it('TC-PAY-FE-08 — llama POST /payments/whatsapp-queue/:id/approve con Amount y Method en PascalCase', async () => {
    (api.post as Mock).mockResolvedValueOnce({ data: { data: { PaymentId: 'pago-new' } } });

    const data = {
      Amount:    150,
      Method:    'Transferencia',
      PaidAt:    '2026-04-27',
      InvoiceIds: ['inv-001'],
    };
    await paymentService.approveReceipt('wh-uuid-001', data);

    expect(api.post).toHaveBeenCalledWith(
      '/payments/whatsapp-queue/wh-uuid-001/approve',
      data,
    );
  });
});

describe('paymentService.rejectReceipt', () => {
  beforeEach(() => vi.clearAllMocks());

  it('TC-PAY-FE-09 — llama POST /payments/whatsapp-queue/:id/reject con Reason en PascalCase', async () => {
    (api.post as Mock).mockResolvedValueOnce({});

    await paymentService.rejectReceipt('wh-uuid-001', 'Imagen borrosa');

    expect(api.post).toHaveBeenCalledWith(
      '/payments/whatsapp-queue/wh-uuid-001/reject',
      { Reason: 'Imagen borrosa' },
    );
  });
});

describe('paymentService.getPendingCount', () => {
  beforeEach(() => vi.clearAllMocks());

  it('TC-PAY-FE-10 — llama GET /payments/whatsapp-queue/count y retorna número (Count en PascalCase)', async () => {
    (api.get as Mock).mockResolvedValueOnce({ data: { data: { Count: 5 } } });

    const count = await paymentService.getPendingCount();

    expect(api.get).toHaveBeenCalledWith('/payments/whatsapp-queue/count');
    expect(count).toBe(5);
  });
});

// ── assignClient (BUG-09) ─────────────────────────────────────────────────────

describe('paymentService.assignClient', () => {
  beforeEach(() => vi.clearAllMocks());

  it('TC-PAY-FE-11 — llama POST /payments/whatsapp-queue/:id/assign-client con ClientId en PascalCase', async () => {
    (api.post as Mock).mockResolvedValueOnce({});

    await paymentService.assignClient('wh-uuid-001', 'client-uuid-001');

    expect(api.post).toHaveBeenCalledWith(
      '/payments/whatsapp-queue/wh-uuid-001/assign-client',
      { ClientId: 'client-uuid-001' },
    );
  });

  it('TC-PAY-FE-12 — propaga el error si el servidor responde con fallo', async () => {
    (api.post as Mock).mockRejectedValueOnce({ response: { status: 404 } });

    await expect(paymentService.assignClient('no-existe', 'client-uuid-001')).rejects.toBeTruthy();
  });
});

// ── markNotRelated (BUG-09) ───────────────────────────────────────────────────

describe('paymentService.markNotRelated', () => {
  beforeEach(() => vi.clearAllMocks());

  it('TC-PAY-FE-13 — llama POST /payments/whatsapp-queue/:id/not-related sin body', async () => {
    (api.post as Mock).mockResolvedValueOnce({});

    await paymentService.markNotRelated('wh-uuid-001');

    expect(api.post).toHaveBeenCalledWith('/payments/whatsapp-queue/wh-uuid-001/not-related');
  });
});
