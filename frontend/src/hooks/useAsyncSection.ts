/**
 * US-D12 · Hook genérico con retry automático
 * - Reintenta hasta MAX_RETRIES veces con backoff de RETRY_DELAY_MS
 * - Aísla errores por sección (un error no bloquea las demás)
 * - Expone estado: 'loading' | 'success' | 'error'
 * - Limpio en desmontaje: cancela timers y evita setState sobre componente desmontado
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const DEFAULT_MAX_RETRIES    = 2;
const DEFAULT_RETRY_DELAY_MS = 3000;

type Status = 'loading' | 'success' | 'error';

interface UseAsyncSectionOptions {
  maxRetries?:   number;
  retryDelayMs?: number;
}

interface UseAsyncSectionResult<T> {
  data:   T | null;
  status: Status;
  retry:  () => void;
}

export function useAsyncSection<T>(
  fetcher: () => Promise<T>,
  options: UseAsyncSectionOptions = {}
): UseAsyncSectionResult<T> {
  const maxRetries   = options.maxRetries   ?? DEFAULT_MAX_RETRIES;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const [data,   setData]   = useState<T | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  const retryCount  = useRef(0);
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetcherRef  = useRef(fetcher);
  const mountedRef  = useRef(true);

  useEffect(() => { fetcherRef.current = fetcher; }, [fetcher]);

  const load = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    retryCount.current = 0;

    if (mountedRef.current) setStatus('loading');

    const attempt = () => {
      fetcherRef.current()
        .then(result => {
          if (!mountedRef.current) return;
          setData(result);
          setStatus('success');
        })
        .catch(() => {
          if (!mountedRef.current) return;
          if (retryCount.current < maxRetries) {
            retryCount.current++;
            timerRef.current = setTimeout(attempt, retryDelayMs);
          } else {
            setStatus('error');
          }
        });
    };

    attempt();
  }, []); // stable — fetcher accessed via ref, state setters are stable

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false; // mark unmounted before cancelling timer
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [load]);

  return { data, status, retry: load };
}
