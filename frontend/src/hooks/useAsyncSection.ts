/**
 * US-D12 · Hook genérico con retry automático
 * - Reintenta hasta MAX_RETRIES veces con backoff de RETRY_DELAY_MS
 * - Aísla errores por sección (un error no bloquea las demás)
 * - Expone estado: 'loading' | 'success' | 'error'
 * - Limpio en desmontaje: cancela timers y evita setState sobre componente desmontado
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const MAX_RETRIES    = 2;
const RETRY_DELAY_MS = 3000;

type Status = 'loading' | 'success' | 'error';

interface UseAsyncSectionResult<T> {
  data:   T | null;
  status: Status;
  retry:  () => void;
}

export function useAsyncSection<T>(
  fetcher: () => Promise<T>
): UseAsyncSectionResult<T> {
  const [data,   setData]   = useState<T | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  const retryCount  = useRef(0);
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetcherRef  = useRef(fetcher);
  const mountedRef  = useRef(true); // track mount state to avoid setState after unmount

  // Keep fetcherRef current whenever fetcher identity changes
  useEffect(() => { fetcherRef.current = fetcher; }, [fetcher]);

  const load = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    retryCount.current = 0;

    // Only update state if still mounted
    if (mountedRef.current) setStatus('loading');

    const attempt = () => {
      fetcherRef.current()
        .then(result => {
          if (!mountedRef.current) return; // component unmounted — bail out
          setData(result);
          setStatus('success');
        })
        .catch(() => {
          if (!mountedRef.current) return; // component unmounted — bail out
          if (retryCount.current < MAX_RETRIES) {
            retryCount.current++;
            timerRef.current = setTimeout(attempt, RETRY_DELAY_MS);
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
