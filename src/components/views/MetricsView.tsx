import React from 'react';
import { useApp } from '../../context/AppContext';
import { MetricCard } from '../ui/MetricCard';
import { BarChart } from '../ui/BarChart';
import {
  calculateMetrics,
  formatKpi,
  formatPercent,
} from '../../services/calculations';

export const MetricsView: React.FC = () => {
  const { filteredOps, currency } = useApp();

  if (filteredOps.length === 0) {
    return (
      <div className="bg-[#131a2a] border border-[#243049] rounded-2xl p-8 text-center text-slate-400">
        Nenhum dado para o período selecionado.
      </div>
    );
  }

  const m = calculateMetrics(filteredOps);

  const closedOps = filteredOps.filter(o => o.res_normal !== 0 || o.res_daytrade !== 0);
  const swWins = closedOps.filter(o => o.res_normal > 0).map(o => o.res_normal);
  const dtWins = closedOps.filter(o => o.res_daytrade > 0).map(o => o.res_daytrade);

  const mediaGanhoSwing = swWins.length ? swWins.reduce((a, b) => a + b, 0) / swWins.length : 0;
  const mediaGanhoDT = dtWins.length ? dtWins.reduce((a, b) => a + b, 0) / dtWins.length : 0;

  // Histogram of results
  const tradeResults = closedOps.map(o => (o.res_normal || 0) + (o.res_daytrade || 0));
  const bins: { label: string; count: number; color: string }[] = [];

  if (tradeResults.length > 0) {
    const minR = Math.min(...tradeResults);
    const maxR = Math.max(...tradeResults);
    const numBins = 16;
    const step = (maxR - minR) / numBins || 1;

    for (let i = 0; i < numBins; i++) {
      const bMin = minR + i * step;
      const bMax = bMin + step;
      const count = tradeResults.filter(r => (i === numBins - 1 ? r >= bMin && r <= bMax : r >= bMin && r < bMax)).length;
      const mid = (bMin + bMax) / 2;
      bins.push({
        label: `${mid >= 0 ? '+' : ''}${mid.toFixed(0)}`,
        count,
        color: mid >= 0 ? '#10b981' : '#ef4444',
      });
    }
  }

  const histogramData = bins.map(b => ({
    label: b.label,
    value: b.count,
    color: b.color,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Métricas de Performance</h2>
        <p className="text-xs text-slate-400">Modelos estatísticos, payoff, drawdown e risco/retorno</p>
      </div>

      {/* Estatística Geral */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Estatística Geral
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard
            label="Win Rate"
            value={formatPercent(m.win_rate, false)}
            deltaType={m.win_rate >= 50 ? 'positive' : 'negative'}
          />
          <MetricCard
            label="Trades Fechados"
            value={m.trades.toString()}
            subtext={`${closedOps.length} apurações`}
          />
          <MetricCard
            label="Payoff"
            value={m.payoff ? m.payoff.toFixed(2) : 'N/A'}
            subtext="Média Ganho / Média Perda"
            deltaType={m.payoff && m.payoff >= 1 ? 'positive' : 'neutral'}
          />
          <MetricCard
            label="Fator de Lucro"
            value={m.fator_lucro ? m.fator_lucro.toFixed(2) : 'N/A'}
            subtext="Soma Lucros / Soma Perdas"
            deltaType={m.fator_lucro && m.fator_lucro >= 1 ? 'positive' : 'negative'}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-3 sm:mt-4">
          <MetricCard
            label="Expectativa / Trade"
            value={formatKpi(m.expectativa, currency)}
            deltaType={m.expectativa >= 0 ? 'positive' : 'negative'}
          />
          <MetricCard
            label="Máx. Drawdown"
            value={formatKpi(m.max_drawdown, currency)}
            deltaType="negative"
            subtext="Rebaixamento máximo"
          />
          <MetricCard
            label="Seq. Vitórias"
            value={`${m.melhor_sequencia} trades`}
            deltaType="positive"
            subtext="Maior sequência de ganhos"
          />
          <MetricCard
            label="Seq. Derrotas"
            value={`${m.pior_sequencia} trades`}
            deltaType="negative"
            subtext="Maior sequência de perdas"
          />
        </div>
      </div>

      {/* Lucros vs Perdas */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Lucros vs Perdas
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard
            label="Operações Ganhas"
            value={m.ganhos.toString()}
            deltaType="positive"
          />
          <MetricCard
            label="Operações Perdidas"
            value={m.perdas.toString()}
            deltaType="negative"
          />
          <MetricCard
            label="Média de Ganho"
            value={formatKpi(m.media_ganho, currency)}
            deltaType="positive"
          />
          <MetricCard
            label="Média de Perda"
            value={formatKpi(m.media_perda, currency)}
            deltaType="negative"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-3 sm:mt-4">
          <MetricCard
            label="Maior Ganho"
            value={formatKpi(m.maior_ganho, currency)}
            deltaType="positive"
          />
          <MetricCard
            label="Maior Perda"
            value={formatKpi(m.maior_perda, currency)}
            deltaType="negative"
          />
          <MetricCard
            label="Média Ganho Swing"
            value={formatKpi(mediaGanhoSwing, currency)}
            deltaType="positive"
          />
          <MetricCard
            label="Média Ganho Day Trade"
            value={formatKpi(mediaGanhoDT, currency)}
            deltaType="positive"
          />
        </div>
      </div>

      {/* Tempo Médio de Permanência */}
      <div className="bg-[#101626] border border-[#1e2535] rounded-2xl p-4 sm:p-5">
        <h3 className="text-base font-semibold text-slate-100 mb-1">
          Tempo Médio de Permanência (Holding Time)
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Day trades são intradiários (0 dias). O tempo de swing é estimado pareando vendas com compras anteriores por FIFO em cada ativo.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <MetricCard
            label="Swing (Médio)"
            value={`${m.tempo_medio_swing.toFixed(1)} dias`}
            subtext="Duração média em carteira"
          />
          <MetricCard
            label="Mais Longa"
            value={`${m.mais_longa_dias} dias`}
            subtext="Posição mantida por mais tempo"
          />
          <MetricCard
            label="Fechadas em ≤1 dia"
            value={`${m.fechadas_le1_dia} lotes`}
            subtext="Operações rápidas de curto prazo"
          />
        </div>
      </div>

      {/* Histograma de Resultados */}
      {histogramData.length > 0 && (
        <div className="bg-[#101626] border border-[#1e2535] rounded-2xl p-4 sm:p-5">
          <h3 className="text-base font-semibold text-slate-100 mb-1">
            Distribuição dos Resultados (Trades Fechados)
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Histograma de frequência de lucros e prejuízos por operação
          </p>
          <BarChart data={histogramData} height={220} currency={currency} />
        </div>
      )}
    </div>
  );
};
