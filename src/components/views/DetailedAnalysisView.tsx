import React from 'react';
import { useApp } from '../../context/AppContext';
import { MetricCard } from '../ui/MetricCard';
import { BarChart } from '../ui/BarChart';
import {
  calculateMarketSummary,
  calculateVolumeMonthly,
  calculateDayOfWeekSummary,
  calculateAssetSummary,
  formatKpi,
  formatCurrency,
} from '../../services/calculations';

export const DetailedAnalysisView: React.FC = () => {
  const { filteredOps, currency } = useApp();

  if (filteredOps.length === 0) {
    return (
      <div className="bg-[#131a2a] border border-[#243049] rounded-2xl p-8 text-center text-slate-400">
        Nenhum dado para o período selecionado.
      </div>
    );
  }

  const volTotal = filteredOps.reduce((acc, o) => acc + (o.valor || 0), 0);
  const comprasOps = filteredOps.filter(o => o.tipo?.startsWith('Compra'));
  const vendasOps = filteredOps.filter(o => o.tipo?.startsWith('Venda'));

  const volCompra = comprasOps.reduce((acc, o) => acc + (o.valor || 0), 0);
  const volVenda = vendasOps.reduce((acc, o) => acc + (o.valor || 0), 0);
  const nOps = filteredOps.length;
  const ticketMedio = nOps ? volTotal / nOps : 0;

  const dtOps = filteredOps.filter(o => o.daytrade === 1).length;
  const swOps = filteredOps.filter(o => o.daytrade === 0).length;
  const uniqueTickers = new Set(filteredOps.map(o => o.ticker)).size;

  const pm = calculateMarketSummary(filteredOps);
  const vm = calculateVolumeMonthly(filteredOps);
  const ds = calculateDayOfWeekSummary(filteredOps);
  const ra = calculateAssetSummary(filteredOps);

  // Market Bar Data
  const marketChartData = pm.map(m => ({
    label: m.mercado,
    value: m.total,
    color: m.total >= 0 ? '#10b981' : '#ef4444',
    secondaryText: `${m.operacoes} ops`,
  }));

  // Volume Bar Data (Compras vs Vendas)
  const volumeChartData = vm.map(v => ({
    label: v.periodo,
    value: v.volume,
    swing: v.compras, // reuse blue
    daytrade: v.vendas, // reuse amber
  }));

  // Day of week Bar Data
  const dowResultData = ds.map(d => ({
    label: d.dia,
    value: d.resultado,
    color: d.resultado >= 0 ? '#10b981' : '#ef4444',
  }));

  const dowOpsData = ds.map(d => ({
    label: d.dia,
    value: d.ops,
    color: '#3b82f6',
  }));

  // Pareto Analysis (Top profitable assets concentrating ~80% of gains)
  const profitableAssets = ra.filter(a => a.total > 0).sort((a, b) => b.total - a.total);
  const totalPositiveGain = profitableAssets.reduce((acc, a) => acc + a.total, 0);

  let runGain = 0;
  let count80 = 0;
  const paretoBars = profitableAssets.slice(0, 15).map((a, i) => {
    runGain += a.total;
    const pct = totalPositiveGain > 0 ? (runGain / totalPositiveGain) * 100 : 0;
    if (pct <= 80) count80 = i + 1;
    return {
      label: a.ticker,
      value: a.total,
      color: '#10b981',
      secondaryText: `${pct.toFixed(0)}% acum.`,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Análise Detalhada</h2>
        <p className="text-xs text-slate-400">Radiografia de volumes, mercados operados e sazonalidade</p>
      </div>

      {/* Row 1 Volume Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard label="Volume Total" value={formatKpi(volTotal, currency)} />
        <MetricCard
          label="Compras"
          value={formatKpi(volCompra, currency)}
          subtext={`${comprasOps.length} operações`}
        />
        <MetricCard
          label="Vendas"
          value={formatKpi(volVenda, currency)}
          subtext={`${vendasOps.length} operações`}
        />
        <MetricCard label="Ticket Médio" value={formatKpi(ticketMedio, currency)} />
      </div>

      {/* Row 2 Ops Breakdown Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard label="Total Operações" value={nOps.toString()} />
        <MetricCard label="Day Trade (ops)" value={dtOps.toString()} deltaType="neutral" />
        <MetricCard label="Swing Trade (ops)" value={swOps.toString()} deltaType="neutral" />
        <MetricCard label="Ativos Distintos" value={uniqueTickers.toString()} />
      </div>

      {/* Resultado por Mercado */}
      <div className="bg-[#101626] border border-[#1e2535] rounded-2xl p-4 sm:p-5">
        <h3 className="text-base font-semibold text-slate-100 mb-1">
          Resultado por Mercado
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Distribuição de ganhos por categoria (Ações, BDRs, FIIs, etc.)
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          <BarChart data={marketChartData} horizontal={true} currency={currency} />

          <div className="overflow-x-auto border border-[#1e2535] rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#141b2d] text-slate-400 uppercase text-[10px] font-semibold border-b border-[#1e2535]">
                <tr>
                  <th className="py-2.5 px-3">Mercado</th>
                  <th className="py-2.5 px-3 text-right">Ops</th>
                  <th className="py-2.5 px-3 text-right">Volume</th>
                  <th className="py-2.5 px-3 text-right">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#182030] font-mono">
                {pm.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#141d33]">
                    <td className="py-2 px-3 font-sans font-medium text-slate-200">
                      {row.mercado}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-400">
                      {row.operacoes}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-400">
                      {formatCurrency(row.volume, currency)}
                    </td>
                    <td className={`py-2 px-3 text-right font-bold ${row.total > 0 ? 'text-emerald-400' : row.total < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                      {formatCurrency(row.total, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Volume Operado por Mês */}
      <div className="bg-[#101626] border border-[#1e2535] rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Volume Operado por Mês
            </h3>
            <p className="text-xs text-slate-400">
              Desdobramento financeiro entre Compras (azul) e Vendas (âmbar)
            </p>
          </div>
        </div>
        <BarChart data={volumeChartData} height={220} currency={currency} stacked={true} />
      </div>

      {/* Sazonalidade: Dia da Semana */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#101626] border border-[#1e2535] rounded-2xl p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-slate-100 mb-1">
            Resultado por Dia da Semana
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            Rentabilidade acumulada em cada dia útil
          </p>
          <BarChart data={dowResultData} height={190} currency={currency} />
        </div>

        <div className="bg-[#101626] border border-[#1e2535] rounded-2xl p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-slate-100 mb-1">
            Operações por Dia da Semana
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            Frequência de negociação ao longo da semana
          </p>
          <BarChart data={dowOpsData} height={190} currency={currency} />
        </div>
      </div>

      {/* Pareto Concentration */}
      {profitableAssets.length > 0 && (
        <div className="bg-[#101626] border border-[#1e2535] rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Concentração do Resultado (Pareto por Ativo)
              </h3>
              <p className="text-xs text-slate-400">
                Os ativos mais lucrativos ordenados por contribuição
              </p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-3 py-1 rounded-full font-mono font-medium">
              Top {count80 || 1} ativos = ~80% do lucro total
            </div>
          </div>
          <BarChart data={paretoBars} horizontal={true} currency={currency} />
          <p className="text-xs text-slate-400 mt-3">
            📌 Regra de Pareto: a maior parte dos retornos positivos provém de um seleto grupo de posições vencedoras.
          </p>
        </div>
      )}
    </div>
  );
};
