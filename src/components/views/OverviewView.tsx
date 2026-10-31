import React from 'react';
import { useApp } from '../../context/AppContext';
import { MetricCard } from '../ui/MetricCard';
import { AreaChart } from '../ui/AreaChart';
import { BarChart } from '../ui/BarChart';
import {
  calculateMonthlySummary,
  calculateMetrics,
  formatKpi,
  formatPercent,
} from '../../services/calculations';

export const OverviewView: React.FC = () => {
  const { filteredOps, currency, setActiveTab } = useApp();

  if (filteredOps.length === 0) {
    return (
      <div className="bg-[#131a2a] border border-[#243049] rounded-2xl p-8 text-center my-6">
        <p className="text-slate-400 mb-4">Nenhum dado encontrado para o período selecionado.</p>
        <button
          onClick={() => setActiveTab('📥 Importar')}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-colors"
        >
          Ir para Importar Relatórios
        </button>
      </div>
    );
  }

  const rm = calculateMonthlySummary(filteredOps);
  const m = calculateMetrics(filteredOps);

  const normal = filteredOps.reduce((acc, o) => acc + (o.res_normal || 0), 0);
  const dt = filteredOps.reduce((acc, o) => acc + (o.res_daytrade || 0), 0);
  const prov = filteredOps.reduce((acc, o) => acc + (o.res_outros || 0), 0);
  const liq = normal + dt + prov;

  let melhorMes = { periodo: 'N/A', total: 0 };
  let piorMes = { periodo: 'N/A', total: 0 };

  if (rm.length > 0) {
    melhorMes = [...rm].sort((a, b) => b.total - a.total)[0];
    piorMes = [...rm].sort((a, b) => a.total - b.total)[0];
  }

  // Data for Area Chart (Acumulado)
  const areaData = rm.map(r => ({
    label: r.periodo,
    value: r.acumulado,
  }));

  // Data for Stacked Bar Chart
  const barData = rm.map(r => ({
    label: r.periodo,
    value: r.total,
    swing: r.normal,
    daytrade: r.daytrade,
    outros: r.outros,
  }));

  return (
    <div className="space-y-6">
      {/* KPI Grid Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label="Resultado Líquido"
          value={formatKpi(liq, currency)}
          delta={liq >= 0 ? 'Lucro Acumulado' : 'Prejuízo Acumulado'}
          deltaType={liq >= 0 ? 'positive' : 'negative'}
        />
        <MetricCard
          label="Swing (Normal)"
          value={formatKpi(normal, currency)}
          deltaType={normal >= 0 ? 'positive' : 'negative'}
        />
        <MetricCard
          label="Day Trade"
          value={formatKpi(dt, currency)}
          deltaType={dt >= 0 ? 'positive' : 'negative'}
        />
        <MetricCard
          label="Proventos / Div."
          value={formatKpi(prov, currency)}
          deltaType={prov > 0 ? 'positive' : 'neutral'}
        />
      </div>

      {/* KPI Grid Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label="Win Rate"
          value={formatPercent(m.win_rate, false)}
          subtext={`${m.ganhos} vitórias / ${m.perdas} derrotas`}
          deltaType={m.win_rate >= 50 ? 'positive' : 'negative'}
        />
        <MetricCard
          label="Trades Fechados"
          value={m.trades.toString()}
          subtext={`Expectativa: ${formatKpi(m.expectativa, currency)}`}
        />
        <MetricCard
          label="Melhor Mês"
          value={melhorMes.periodo}
          subtext={formatKpi(melhorMes.total, currency)}
          deltaType="positive"
        />
        <MetricCard
          label="Pior Mês"
          value={piorMes.periodo}
          subtext={formatKpi(piorMes.total, currency)}
          deltaType="negative"
        />
      </div>

      {/* Chart 1: Curva de Resultado Acumulado */}
      <div className="bg-[#101626] border border-[#1e2535] rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#1e2535] mb-4 gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Curva de Resultado Acumulado
            </h3>
            <p className="text-xs text-slate-400">
              Evolução patrimonial líquida ao longo dos meses operados
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400">Total final: </span>
            <span className={`font-mono text-sm font-bold ${liq >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatKpi(liq, currency)}
            </span>
          </div>
        </div>
        <AreaChart data={areaData} height={260} currency={currency} color="#3b82f6" />
      </div>

      {/* Chart 2: Resultado por Mês */}
      <div className="bg-[#101626] border border-[#1e2535] rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#1e2535] mb-4 gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Resultado por Mês
            </h3>
            <p className="text-xs text-slate-400">
              Desdobramento mensal entre Swing Trade, Day Trade e Proventos
            </p>
          </div>
        </div>
        <BarChart data={barData} height={260} currency={currency} stacked={true} />
      </div>
    </div>
  );
};
