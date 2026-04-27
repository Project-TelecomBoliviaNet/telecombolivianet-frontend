/**
 * SkeletonCard — Loading skeletons and error states for Dashboard sections.
 *
 * Exports:
 *  SkeletonKpiCard  — small KPI card skeleton
 *  SkeletonChart    — chart-area skeleton
 *  SkeletonTable    — table-rows skeleton
 *  ErrorSection     — error state with retry button
 */

interface ErrorSectionProps {
  title:   string;
  onRetry: () => void;
}

// ── Pulse helper ──────────────────────────────────────────────────────────────

const Pulse = ({ className }: { className: string }) => (
  <div className={`animate-pulse rounded bg-gray-200 ${className}`} />
);

// ── Exports ───────────────────────────────────────────────────────────────────

export function SkeletonKpiCard() {
  return (
    <div className="card p-4 space-y-2">
      <Pulse className="h-3 w-20" />
      <Pulse className="h-7 w-28" />
      <Pulse className="h-3 w-16" />
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Pulse className="h-4 w-32" />
        <Pulse className="h-4 w-16" />
      </div>
      <div className="flex items-end gap-2 h-28">
        {[70, 50, 80, 60, 90, 40, 75].map((h, i) => (
          <div
            key={i}
            className="flex-1 animate-pulse rounded-t bg-gray-200"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="card p-5 space-y-3">
      <Pulse className="h-4 w-40" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Pulse className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Pulse className="h-3 w-36" />
            <Pulse className="h-3 w-24" />
          </div>
          <Pulse className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

export function ErrorSection({ title, onRetry }: ErrorSectionProps) {
  return (
    <div className="card p-5 flex flex-col items-center gap-3 text-center">
      <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
        <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-800">Error al cargar: {title}</p>
        <p className="text-xs text-gray-400 mt-0.5">Comprueba la conexión con el servidor.</p>
      </div>
      <button onClick={onRetry} className="btn-secondary text-xs px-3 py-1.5">
        Reintentar
      </button>
    </div>
  );
}
