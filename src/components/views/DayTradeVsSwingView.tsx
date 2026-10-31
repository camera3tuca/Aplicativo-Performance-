import React from 'react';
import { useApp } from '../../context/AppContext';
import { MetricCard } from '../ui/MetricCard';
import { BarChart } from '../ui/BarChart';
import { formatKpi, formatPercent } from '../../services/calculations';

export const DayTradeVsSwingView: React.FC = () => {
  const { filteredOps, currency } = useApp();

  if (filteredOps.length === 0) {
    return (
      <div className="bg-[#131a2a] border border-[#243049] rounded-2xl p-8 text-center text-slate-400">
        Nenhum dado para o período selecionado.
      </div>
    );
  }

  const dtTotal = filteredOps.reduce((acc, o) => acc + (o.res_daytrade || 0), 0);
  const swTotal = filteredOps.reduce((acc, o) => acc + (o.res_normal || 0), 0);

  // Closed trades
  const dtClosed = filteredOps.filter(o => o.res_daytrade !== 0);
  const swClosed = filteredOps.filter(o => o.res_normal !== 0);

  const dtWins = dtClosed.filter(o => o.res_daytrade > 0).length;
  const swWins = swClosed.filter(o => o.res_normal > 0).length;

  const dtWinRate = dtClosed.length ? (dtWins / dtClosed.length) * 100 : 0;
  const swWinRate = swClosed.length ? (swWins / swClosed.length) * 100 : 0;

  // Comparison Bar Chart
  const compData = [
    {
      label: 'Day Trade',
      value: dtTotal,
      color: '#f59e0b',
      secondaryText: `${dtClosed.length} trades`,
    },
    {
      label: 'Swing Trade',
      value: swTotal,
      color: '#3b82f6',
      secondaryText: `${swClosed.length} trades`,
    },
  ];

  // DT by month
  const periods = Array.from(new Set(filteredOps.map(o => o.periodo))).sort();
  const dtMonthly = periods.map(p => {
    const sumDt = filteredOps.filter(o => o.periodo === p).reduce((acc, o) => acc + (o.res_daytrade || 0), 0);
    return {
      label: p,
      value: sumDt,
      color: sumDt >= 0 ? '#10b981' : '#ef4444',
    };
  });

  // Swing by month
  const swMonthly = periods.map(p => {
    const sumSw = filteredOps.filter(o => o.periodo === p).reduce((acc, o) => acc + (o.res_normal || 0), 0);
    return {
      label: p,
      value: sumSw,
      color: sumSw >= 0 ? '#10b981' : '#ef4444',
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Day Trade vs Swing Trade</h2>
        <p className="text-xs text-slate-400">Comparativo de performance entre estratégias intradiárias e de posição</p>
      </div>

      {/* 4 Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label="Resultado Day Trade"
          value={formatKpi(dtTotal, currency)}
          deltaType={dtTotal >= 0 ? 'positive' : 'negative'}
        />
        <MetricCard
          label="Win Rate DT"
          value={formatPercent(dtWinRate, false)}
          subtext={`${dtWins} de ${dtClosed.length} trades`}
          deltaType={dtWinRate >= 50 ? 'positive' : 'negative'}
        />
        <MetricCard
          label="Resultado Swing"
          value={formatKpi(swTotal, currency)}
          deltaType={swTotal >= 0 ? 'positive' : 'negative'}
        />
        <MetricCard
          label="Win Rate Swing"
          value={formatPercent(swWinRate, false)}
          subtext={`${swWins} de ${swClosed.length} trades`}
          deltaType={swWinRate >= 50 ? 'positive' : 'negative'}
        />
      </div>

      {/* Strategy Comparison Bar Chart */}
      <div className="bg-[#101626] border border-[#1e2535] rounded-2xl p-4 sm:p-5">
        <h3 className="text-base font-semibold text-slate-100 mb-1">
          Comparativo Geral de Estratégias
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Resultado financeiro acumulado por modalidade
        </p>
        <BarChart data={compData} height={200} currency={currency} />
      </div>

      {/* Monthly side-by-side breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#101626] border border-[#1e2535] rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            <h3 className="text-sm font-semibold text-slate-200">
              Day Trade por Mês
            </h3>
          </div>
          <BarChart data={dtMonthly} height={220} currency={currency} />
        </div>

        <div className="bg-[#101626] border border-[#1e2535] rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
            <h3 className="text-sm font-semibold text-slate-200">
              Swing Trade por Mês
            </h3>
          </div>
          <BarChart data={swMonthly} height={220} currency={currency} />
        </div>
      </div>
    </div>
  );
};
