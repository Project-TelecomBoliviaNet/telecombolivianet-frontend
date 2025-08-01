import { useState, useCallback, useEffect } from 'react';
import { invoiceService } from '@/services/invoiceService';
import type { InvoiceMonthStatsDto, DeudorDto } from '@/types/invoice.types';

interface InvoiceDataState {
  stats:    InvoiceMonthStatsDto | null;
  deudores: DeudorDto[];
  loading:  boolean;
  error:    string;
  reload:   () => void;
}

export function useInvoiceData(
  statsYear:       number,
  statsMonth:      number,
  debouncedSearch: string,
  dateFrom?:       string,
  dateTo?:         string,
): InvoiceDataState {
  const [stats,    setStats]    = useState<InvoiceMonthStatsDto | null>(null);
  const [deudores, setDeudores] = useState<DeudorDto[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  const loadData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [statsData, deudoresData] = await Promise.all([
        invoiceService.getStats(statsYear, statsMonth),
        invoiceService.getDeudores(debouncedSearch || undefined, dateFrom, dateTo),
      ]);
      setStats(statsData);
      setDeudores(deudoresData);
    } catch {
      setError('Error al cargar los datos.');
    } finally {
      setLoading(false);
    }
  }, [statsYear, statsMonth, debouncedSearch, dateFrom, dateTo]);

  useEffect(() => { loadData(); }, [loadData]);

  return { stats, deudores, loading, error, reload: loadData };
}
