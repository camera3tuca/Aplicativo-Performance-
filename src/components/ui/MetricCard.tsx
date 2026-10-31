import React from 'react';

interface MetricCardProps {
  label: string;
  value: string;
  subtext?: string;
  delta?: string;
  deltaType?: 'positive' | 'negative' | 'neutral';
  tooltip?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  delta,
  deltaType,
  tooltip,
}) => {
  const getDeltaColor = () => {
    if (deltaType === 'positive') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (deltaType === 'negative') return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
  };

  return (
    <div
      title={tooltip}
      className="bg-gradient-to-br from-[#161d30] to-[#131a2a] border border-[#243049] rounded-2xl p-4 shadow-lg flex flex-col justify-between min-h-[104px] hover:border-[#3b82f6]/50 transition-colors duration-200"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[#7c8aa5] text-[0.68rem] font-semibold tracking-wider uppercase">
          {label}
        </span>
        {delta && (
          <span className={`text-[0.72rem] font-medium font-mono px-2 py-0.5 rounded-full border ${getDeltaColor()}`}>
            {delta}
          </span>
        )}
      </div>

      <div className="mt-1">
        <span className="text-[#f8fafc] font-mono text-xl sm:text-2xl font-bold tracking-tight">
          {value}
        </span>
        {subtext && (
          <p className="text-xs text-slate-400 mt-1 font-sans">
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
};
