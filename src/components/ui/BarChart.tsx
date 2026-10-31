import React, { useState } from 'react';
import { formatCurrency } from '../../services/calculations';

export interface BarItem {
  label: string;
  value: number; // total or single value
  swing?: number;
  daytrade?: number;
  outros?: number;
  color?: string;
  secondaryText?: string;
}

interface BarChartProps {
  data: BarItem[];
  height?: number;
  currency?: 'R$' | 'US$';
  stacked?: boolean;
  horizontal?: boolean;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  height = 240,
  currency = 'R$',
  stacked = false,
  horizontal = false,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">
        Sem dados para exibir
      </div>
    );
  }

  // ---------------- Horizontal Bar Mode ----------------
  if (horizontal) {
    const maxVal = Math.max(...data.map(d => Math.abs(d.value)), 1);

    return (
      <div className="space-y-2 py-2">
        {data.map((item, idx) => {
          const isPos = item.value >= 0;
          const barPct = Math.min(100, Math.max(4, (Math.abs(item.value) / maxVal) * 100));
          const colorClass = item.color || (isPos ? 'bg-emerald-500' : 'bg-rose-500');

          return (
            <div key={idx} className="flex items-center gap-3 text-xs">
              <div className="w-16 sm:w-20 font-mono font-medium text-slate-300 truncate text-right">
                {item.label}
              </div>
              <div className="flex-1 bg-[#161d30] rounded-md h-5 relative overflow-hidden flex items-center">
                <div
                  className={`h-full rounded-sm transition-all duration-300 ${colorClass}`}
                  style={{ width: `${barPct}%` }}
                />
                <span className="absolute left-2 text-[11px] font-mono font-bold text-white drop-shadow">
                  {formatCurrency(item.value, currency)}
                </span>
              </div>
              {item.secondaryText && (
                <div className="text-[11px] text-slate-400 w-16 text-right font-mono">
                  {item.secondaryText}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ---------------- Vertical / Stacked Bar Mode ----------------
  const padding = { top: 20, right: 20, bottom: 40, left: 55 };
  const width = 800;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  let minVal = 0;
  let maxVal = 0;

  if (stacked) {
    for (const d of data) {
      const pos = (d.swing && d.swing > 0 ? d.swing : 0) +
                  (d.daytrade && d.daytrade > 0 ? d.daytrade : 0) +
                  (d.outros && d.outros > 0 ? d.outros : 0);
      const neg = (d.swing && d.swing < 0 ? d.swing : 0) +
                  (d.daytrade && d.daytrade < 0 ? d.daytrade : 0) +
                  (d.outros && d.outros < 0 ? d.outros : 0);
      maxVal = Math.max(maxVal, pos);
      minVal = Math.min(minVal, neg);
    }
  } else {
    for (const d of data) {
      maxVal = Math.max(maxVal, d.value);
      minVal = Math.min(minVal, d.value);
    }
  }

  const range = maxVal - minVal || 1;

  const getY = (val: number) => {
    return padding.top + innerHeight - ((val - minVal) / range) * innerHeight;
  };

  const zeroY = getY(0);
  const barWidth = Math.max(6, Math.min(32, (innerWidth / data.length) * 0.7));

  return (
    <div className="relative w-full bg-[#131a2a]/60 border border-[#1e2535] rounded-xl p-3">
      {stacked && (
        <div className="flex items-center gap-4 text-xs text-slate-400 mb-2 px-2">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-500 inline-block" />
            <span>Swing</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-500 inline-block" />
            <span>Day Trade</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
            <span>Proventos</span>
          </div>
        </div>
      )}

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
        {/* Zero baseline */}
        <line
          x1={padding.left}
          y1={zeroY}
          x2={width - padding.right}
          y2={zeroY}
          stroke="#334155"
          strokeWidth="1.5"
        />

        {/* Vertical Bars */}
        {data.map((d, i) => {
          const x = padding.left + (i + 0.5) * (innerWidth / data.length);
          const isHovered = hoveredIdx === i;

          if (stacked) {
            const sw = d.swing || 0;
            const dt = d.daytrade || 0;
            const pr = d.outros || 0;

            const swHeight = Math.abs(getY(sw) - zeroY);
            const dtHeight = Math.abs(getY(dt) - zeroY);
            const prHeight = Math.abs(getY(pr) - zeroY);

            const swY = sw >= 0 ? zeroY - swHeight : zeroY;
            const dtY = dt >= 0 ? zeroY - (sw >= 0 ? swHeight : 0) - dtHeight : zeroY + (sw < 0 ? swHeight : 0);
            const prY = pr >= 0 ? dtY - prHeight : dtY + dtHeight;

            return (
              <g
                key={i}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Swing segment */}
                {sw !== 0 && (
                  <rect
                    x={x - barWidth / 2}
                    y={swY}
                    width={barWidth}
                    height={Math.max(1, swHeight)}
                    fill="#3b82f6"
                    opacity={isHovered ? 1 : 0.85}
                  />
                )}
                {/* Day trade segment */}
                {dt !== 0 && (
                  <rect
                    x={x - barWidth / 2}
                    y={dtY}
                    width={barWidth}
                    height={Math.max(1, dtHeight)}
                    fill="#f59e0b"
                    opacity={isHovered ? 1 : 0.85}
                  />
                )}
                {/* Proventos segment */}
                {pr !== 0 && (
                  <rect
                    x={x - barWidth / 2}
                    y={prY}
                    width={barWidth}
                    height={Math.max(1, prHeight)}
                    fill="#10b981"
                    opacity={isHovered ? 1 : 0.85}
                  />
                )}

                {/* X-axis label */}
                <text
                  x={x}
                  y={height - 12}
                  textAnchor="middle"
                  className="text-[10px] fill-slate-400 font-mono"
                >
                  {d.label}
                </text>
              </g>
            );
          }

          // Single bar
          const barHeight = Math.abs(getY(d.value) - zeroY);
          const barY = d.value >= 0 ? zeroY - barHeight : zeroY;
          const barColor = d.color || (d.value >= 0 ? '#10b981' : '#ef4444');

          return (
            <g
              key={i}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <rect
                x={x - barWidth / 2}
                y={barY}
                width={barWidth}
                height={Math.max(2, barHeight)}
                fill={barColor}
                opacity={isHovered ? 1 : 0.85}
                rx="2"
              />
              <text
                x={x}
                y={height - 12}
                textAnchor="middle"
                className="text-[10px] fill-slate-400 font-mono"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Hover tooltip */}
      {hoveredIdx !== null && (
        <div
          className="absolute z-20 bg-[#1e2538] border border-[#2e3b52] rounded-lg p-2.5 shadow-2xl pointer-events-none text-xs transform -translate-x-1/2 -translate-y-full"
          style={{
            left: `${((hoveredIdx + 0.5) / data.length) * 85 + 7}%`,
            top: '30%',
          }}
        >
          <div className="font-semibold text-slate-200 border-b border-slate-700 pb-1 mb-1.5">
            {data[hoveredIdx].label}
          </div>
          {stacked ? (
            <div className="space-y-0.5 font-mono">
              <div className="text-blue-400 flex justify-between gap-3">
                <span>Swing:</span>
                <span>{formatCurrency(data[hoveredIdx].swing || 0, currency)}</span>
              </div>
              <div className="text-amber-400 flex justify-between gap-3">
                <span>Day Trade:</span>
                <span>{formatCurrency(data[hoveredIdx].daytrade || 0, currency)}</span>
              </div>
              <div className="text-emerald-400 flex justify-between gap-3">
                <span>Proventos:</span>
                <span>{formatCurrency(data[hoveredIdx].outros || 0, currency)}</span>
              </div>
              <div className="text-slate-100 font-bold border-t border-slate-700 pt-1 flex justify-between gap-3">
                <span>Total:</span>
                <span>{formatCurrency(data[hoveredIdx].value, currency)}</span>
              </div>
            </div>
          ) : (
            <div className="font-mono text-emerald-400 font-bold">
              {formatCurrency(data[hoveredIdx].value, currency)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
