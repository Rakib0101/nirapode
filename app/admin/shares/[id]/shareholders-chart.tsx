"use client";

import { useState } from "react";

type Holder = { name: string; quantity: number };

type Props = {
  holders: Holder[];
  availableShares: number;
};

// Validated categorical palette (dataviz skill reference) — fixed order, never
// cycled. Slot 7 (violet) is reserved for the "other holders" bucket; the
// "Available" (unsold) bucket uses a neutral gray since it isn't an identity.
const SLOT_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300"];
const OTHER_COLOR = "#4a3aa7";
const AVAILABLE_COLOR = "#d4d4d2";
const TOP_N = 6;

export function ShareholdersChart({ holders, availableShares }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);

  const sorted = [...holders].sort((a, b) => b.quantity - a.quantity);
  const top = sorted.slice(0, TOP_N);
  const rest = sorted.slice(TOP_N);
  const restTotal = rest.reduce((sum, h) => sum + h.quantity, 0);
  const soldTotal = sorted.reduce((sum, h) => sum + h.quantity, 0);
  // Chart total is sold + available (not the project's nominal totalShares) —
  // keeps every slice's percentage summing to exactly 100% even if those two
  // figures have drifted apart (e.g. demo data, or shares still in transfer).
  const chartTotal = soldTotal + Math.max(availableShares, 0);

  type Segment = { label: string; value: number; color: string };
  const segments: Segment[] = [
    ...top.map((h, i) => ({ label: h.name, value: h.quantity, color: SLOT_COLORS[i] })),
    ...(rest.length > 0 ? [{ label: `${rest.length} other holder${rest.length > 1 ? "s" : ""}`, value: restTotal, color: OTHER_COLOR }] : []),
    ...(availableShares > 0 ? [{ label: "Available (unsold)", value: availableShares, color: AVAILABLE_COLOR }] : []),
  ];

  if (chartTotal === 0 || segments.length === 0) {
    return null;
  }

  const size = 180;
  const strokeWidth = 28;
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  let cumulative = 0;
  const arcs = segments.map((seg, i) => {
    const fraction = seg.value / chartTotal;
    const dash = fraction * circumference;
    const gap = circumference - dash;
    // Small 2px surface gap between adjacent slices.
    const offset = -cumulative * circumference;
    cumulative += fraction;
    return { ...seg, i, dash, gap, offset };
  });

  const activeSeg = hovered != null ? segments[hovered] : null;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <g transform={`rotate(-90 ${cx} ${cy})`}>
            {arcs.map((a) => (
              <circle
                key={a.i}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={a.color}
                strokeWidth={hovered === a.i ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={`${Math.max(a.dash - 2, 0)} ${a.gap + 2}`}
                strokeDashoffset={a.offset}
                strokeLinecap="butt"
                onMouseEnter={() => setHovered(a.i)}
                onMouseLeave={() => setHovered(null)}
                className="cursor-pointer transition-[stroke-width] duration-150"
              />
            ))}
          </g>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {activeSeg ? (
            <>
              <p className="text-xl font-bold text-foreground">{((activeSeg.value / chartTotal) * 100).toFixed(1)}%</p>
              <p className="text-[11px] text-muted-foreground px-4 text-center line-clamp-2">{activeSeg.label}</p>
            </>
          ) : (
            <>
              <p className="text-xl font-bold text-foreground">{chartTotal.toLocaleString()}</p>
              <p className="text-[11px] text-muted-foreground">Total Shares</p>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 w-full space-y-1.5">
        {segments.map((seg, i) => (
          <div
            key={i}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            className={`flex items-center gap-2 text-xs rounded-md px-1.5 py-1 -mx-1.5 transition-colors cursor-default ${hovered === i ? "bg-muted" : ""}`}
          >
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-foreground font-medium truncate flex-1">{seg.label}</span>
            <span className="text-muted-foreground shrink-0">
              {seg.value.toLocaleString()} · {((seg.value / chartTotal) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
