import React, { useState } from 'react';
import { formatCurrency } from '../../services/calculations';

interface DataPoint {
  label: string;
  value: number;
}

interface AreaChartProps {
  data: DataPoint[];
  height?: number;
  currency?: 'R$' | 'US$';
  color?: string;
}

export const AreaChart: React.FC<AreaChartProps> = ({
  data,
  height = 240,
  currency = 'R$',
  color = '#3b82f6',
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-[240px] flex items-center justify-center text-slate-500 text-sm">
        Sem dados para exibir
      </div>
    );
  }

  const padding = { top: 20, right: 30, bottom: 40, left: 60 };
  const width = 800; // SVG viewBox width

  const values = data.map(d => d.value);
  const minVal = Math.min(0, ...values);
  const maxVal = Math.max(0, ...values);
  const range = maxVal - minVal || 1;

  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const getX = (idx: number) => {
    if (data.length <= 1) return padding.left + innerWidth / 2;
    return padding.left + (idx / (data.length - 1)) * innerWidth;
  };

  const getY = (val: number) => {
    return padding.top + innerHeight - ((val - minVal) / range) * innerHeight;
  };

  const zeroY = getY(0);

  // Generate SVG path for line and area
  const points = data.map((d, i) => `${getX(i)},${getY(d.value)}`);
  const linePath = `M ${points.join(' L ')}`;
  const areaPath = `M ${points.join(' L ')} L ${getX(data.length - 1)},${zeroY} L ${getX(0)},${zeroY} Z`;

  // Y-axis ticks (5 ticks)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(pct => {
    const val = minVal + pct * range;
    return {
      val,
      y: getY(val),
    };
  });

  return (
    <div className="relative w-full bg-[#131a2a]/60 border border-[#1e2535] rounded-xl p-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible select-none"
      >
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0b0e16" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Horizontal gridlines */}
        {yTicks.map((tick, idx) => (
          <g key={idx}>
            <line
              x1={padding.left}
              y1={tick.y}
              x2={width - padding.right}
              y2={tick.y}
              stroke="#1e2535"
              strokeDasharray={tick.val === 0 ? '0' : '3 3'}
              strokeWidth={tick.val === 0 ? 1.5 : 1}
            />
            <text
              x={padding.left - 8}
              y={tick.y + 4}
              textAnchor="end"
              className="text-[10px] fill-slate-500 font-mono"
            >
              {tick.val.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            </text>
          </g>
        ))}

        {/* Filled Area */}
        <path d={areaPath} fill="url(#areaGradient)" />

        {/* Line Stroke */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points & interaction */}
        {data.map((d, i) => {
          const cx = getX(i);
          const cy = getY(d.value);
          const isHovered = hoveredIdx === i;

          return (
            <g key={i}>
              {/* Invisible touch/mouse target */}
              <circle
                cx={cx}
                cy={cy}
                r="16"
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
              <circle
                cx={cx}
                cy={cy}
                r={isHovered ? 5 : 3}
                fill={isHovered ? '#ffffff' : color}
                stroke={color}
                strokeWidth={isHovered ? 2 : 1}
                className="transition-all duration-150 pointer-events-none"
              />
              {/* X label */}
              {data.length <= 16 || i % Math.ceil(data.length / 10) === 0 ? (
                <text
                  x={cx}
                  y={height - 12}
                  textAnchor="middle"
                  className="text-[10px] fill-slate-400 font-mono"
                >
                  {d.label}
                </text>
              ) : null}
            </g>
          );
        })}

        {/* Hover vertical crosshair */}
        {hoveredIdx !== null && (
          <line
            x1={getX(hoveredIdx)}
            y1={padding.top}
            x2={getX(hoveredIdx)}
            y2={height - padding.bottom}
            stroke="#94a3b8"
            strokeDasharray="2 2"
            strokeWidth="1"
          />
        )}
      </svg>

      {/* Hover tooltip */}
      {hoveredIdx !== null && (
        <div
          className="absolute z-10 bg-[#1e2538] border border-[#2e3b52] rounded-lg px-3 py-1.5 shadow-xl pointer-events-none text-xs transform -translate-x-1/2 -translate-y-full"
          style={{
            left: `${((getX(hoveredIdx) - padding.left) / innerWidth) * 85 + 7}%`,
            top: '25%',
          }}
        >
          <div className="font-semibold text-slate-300">{data[hoveredIdx].label}</div>
          <div className="font-mono text-emerald-400 font-bold">
            {formatCurrency(data[hoveredIdx].value, currency)}
          </div>
        </div>
      )}
    </div>
  );
};
