import api from './api';
import type { AuditLogDto, PagedResult, ApiResponse } from '@/types/auth.types';

export interface AuditLogFilter {
  userId?:    string;
  action?:    string;
  from?:      string;
  to?:        string;
  pageNumber?: number;
  pageSize?:   number;
}

export const auditService = {
  // US-09 · Consultar log con filtros
  getAll: async (filter: AuditLogFilter = {}): Promise<PagedResult<AuditLogDto>> => {
    const res = await api.get<ApiResponse<PagedResult<AuditLogDto>>>(
      '/audit-logs', { params: filter }
    );
    return res.data.data!;
  },
};
