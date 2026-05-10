import { buildDonutSegments } from '@/utils/svgMath';

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

  const cx         = size / 2;
  const cy         = size / 2;
  const R          = size * 0.4;
  const r          = size * 0.25;
  const strokeW    = R - r;
  const ringRadius = (R + r) / 2;
  const segments   = buildDonutSegments(slices, ringRadius);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background ring */}
        <circle
          cx={cx} cy={cy} r={ringRadius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeW}
        />

        {/* Segments */}
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r={ringRadius}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeW}
            strokeDasharray={seg.dashArray}
            strokeDashoffset={seg.dashOffset}
            strokeLinecap="butt"
          />
        ))}

        {/* Center label */}
        {label && (
          <>
            <text x={cx} y={cy - 2} textAnchor="middle" dominantBaseline="auto"
              style={{ fontSize: size * 0.14, fontWeight: 700 }} fill="#111827">
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
        {slices.map(s => (
          <div key={s.label} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-[10px] text-gray-500">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
