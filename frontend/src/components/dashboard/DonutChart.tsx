/**
 * DonutChart — Gráfico de dona SVG simple.
 *
 * Props:
 *  slices — Array de { label, value, color }
 *  size   — Diámetro en px (default 100)
 *  label  — Texto central (opcional; si no se pasa, no se muestra)
 */

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  slices: DonutSlice[];
  size?:  number;
  label?: string;
}

export default function DonutChart({ slices, size = 100, label }: DonutChartProps) {
  const total = slices.reduce((s, x) => s + x.value, 0);

  if (total === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs text-gray-400"
        style={{ width: size, height: size }}
      >
        Sin datos
      </div>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const R  = size * 0.4;        // outer radius
  const r  = size * 0.25;       // inner radius (hole)
  const strokeW = R - r;

  // Build arc segments
  const segments: { d: string; color: string; label: string; value: number }[] = [];
  let startAngle = -Math.PI / 2; // start at top

  for (const slice of slices) {
    const angle  = (slice.value / total) * 2 * Math.PI;
    const endA   = startAngle + angle;
    const mid    = (R + r) / 2;

    const x1 = cx + mid * Math.cos(startAngle);
    const y1 = cy + mid * Math.sin(startAngle);
    const x2 = cx + mid * Math.cos(endA);
    const y2 = cy + mid * Math.sin(endA);

    const largeArc = angle > Math.PI ? 1 : 0;

    segments.push({
      d:     `M ${x1} ${y1} A ${mid} ${mid} 0 ${largeArc} 1 ${x2} ${y2}`,
      color: slice.color,
      label: slice.label,
      value: slice.value,
    });

    startAngle = endA;
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background ring */}
        <circle
          cx={cx} cy={cy} r={(R + r) / 2}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeW}
        />

        {/* Segments */}
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r={(R + r) / 2}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeW}
            strokeDasharray={`${(segments[i] ? slices[i]!.value / total : 0) * 2 * Math.PI * ((R + r) / 2)} ${2 * Math.PI * ((R + r) / 2)}`}
            strokeDashoffset={(() => {
              const circumference = 2 * Math.PI * ((R + r) / 2);
              let offset = circumference * 0.25; // rotate to start at top
              for (let j = 0; j < i; j++) {
                offset -= (slices[j]!.value / total) * circumference;
              }
              return offset;
            })()}
            strokeLinecap="butt"
          />
        ))}

        {/* Center label */}
        {label && (
          <>
            <text x={cx} y={cy - 2} textAnchor="middle" dominantBaseline="auto"
              className="text-xs font-bold" style={{ fontSize: size * 0.14, fontWeight: 700 }} fill="#111827">
              {total}
            </text>
            <text x={cx} y={cy + size * 0.08} textAnchor="middle" dominantBaseline="auto"
              style={{ fontSize: size * 0.1 }} fill="#9ca3af">
              {label}
            </text>
          </>
        )}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
        {slices.map((s) => (
          <div key={s.label} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-[10px] text-gray-500">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
