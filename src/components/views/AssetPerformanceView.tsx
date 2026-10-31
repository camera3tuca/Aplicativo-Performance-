import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { MetricCard } from '../ui/MetricCard';
import { BarChart } from '../ui/BarChart';
import { calculateAssetSummary, formatCurrency } from '../../services/calculations';
import { downloadCsv } from '../../services/exportService';
import { Download, Search } from 'lucide-react';

export const AssetPerformanceView: React.FC = () => {
  const { filteredOps, currency } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<'total' | 'operacoes' | 'ticker'>('total');
  const [sortAsc, setSortAsc] = useState(false);

  const assets = useMemo(() => calculateAssetSummary(filteredOps), [filteredOps]);

  const lucrativos = assets.filter(a => a.total > 0).length;
  const prejuizo = assets.filter(a => a.total < 0).length;

  const top10 = useMemo(() => {
    return [...assets]
      .filter(a => a.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .map(a => ({
        label: a.ticker,
        value: a.total,
        color: '#10b981',
      }));
  }, [assets]);

  const bot10 = useMemo(() => {
    return [...assets]
      .filter(a => a.total < 0)
      .sort((a, b) => a.total - b.total)
      .slice(0, 10)
      .map(a => ({
        label: a.ticker,
        value: a.total,
        color: '#ef4444',
      }));
  }, [assets]);

  const filteredAssets = useMemo(() => {
    let list = assets;
    if (searchTerm.trim()) {
      const q = searchTerm.toUpperCase().trim();
      list = list.filter(a => a.ticker.includes(q) || a.mercado.toUpperCase().includes(q));
    }
    return list.sort((a, b) => {
      let res = 0;
      if (sortKey === 'total') res = b.total - a.total;
      else if (sortKey === 'operacoes') res = b.operacoes - a.operacoes;
      else res = a.ticker.localeCompare(b.ticker);
      return sortAsc ? -res : res;
    });
  }, [assets, searchTerm, sortKey, sortAsc]);

  const handleExportCsv = () => {
    const rows = filteredAssets.map(a => ({
      Ativo: a.ticker,
      Mercado: a.mercado,
      Operações: a.operacoes,
      Swing: a.normal,
      'Day Trade': a.daytrade,
      Proventos: a.outros,
      Total: a.total,
    }));
    downloadCsv(rows, 'resultado_por_ativo.csv');
  };

  const toggleSort = (key: 'total' | 'operacoes' | 'ticker') => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Resultado por Ativo</h2>
          <p className="text-xs text-slate-400">Classificação individual de lucros e perdas por ticker</p>
        </div>
        <button
          onClick={handleExportCsv}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#1a2236] hover:bg-[#222c44] border border-[#2e3b52] text-xs font-semibold text-slate-200 transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-blue-400" />
          <span>Baixar CSV</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <MetricCard label="Ativos Operados" value={assets.length.toString()} />
        <MetricCard
          label="Lucrativos"
          value={lucrativos.toString()}
          deltaType="positive"
          delta={`${Math.round((lucrativos / (assets.length || 1)) * 100)}%`}
        />
        <MetricCard
          label="Com Prejuízo"
          value={prejuizo.toString()}
          deltaType="negative"
          delta={`${Math.round((prejuizo / (assets.length || 1)) * 100)}%`}
        />
      </div>

      {/* Top 10 vs Bottom 10 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#101626] border border-[#1e2535] rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-emerald-400 font-bold">🏆</span>
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
              Melhores (Top 10)
            </h3>
          </div>
          {top10.length > 0 ? (
            <BarChart data={top10} horizontal={true} currency={currency} />
          ) : (
            <p className="text-xs text-slate-500 py-4">Nenhum ativo com lucro no período.</p>
          )}
        </div>

        <div className="bg-[#101626] border border-[#1e2535] rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-rose-400 font-bold">📉</span>
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
              Piores (Top 10)
            </h3>
          </div>
          {bot10.length > 0 ? (
            <BarChart data={bot10} horizontal={true} currency={currency} />
          ) : (
            <p className="text-xs text-slate-500 py-4">Nenhum ativo com prejuízo no período.</p>
          )}
        </div>
      </div>

      {/* Detail Table */}
      <div className="bg-[#101626] border border-[#1e2535] rounded-2xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-[#1e2535] flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#131a2b]">
          <h3 className="text-sm font-semibold text-slate-200">
            Detalhamento de Ativos ({filteredAssets.length})
          </h3>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar ativo ou mercado..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-[#1a2236] border border-[#2a3548] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#141b2d] text-slate-400 uppercase text-[11px] font-semibold sticky top-0 border-b border-[#1e2535] z-10">
              <tr>
                <th
                  onClick={() => toggleSort('ticker')}
                  className="py-3 px-4 cursor-pointer hover:text-white"
                >
                  Ativo {sortKey === 'ticker' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th className="py-3 px-4">Mercado</th>
                <th
                  onClick={() => toggleSort('operacoes')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-white"
                >
                  Operações {sortKey === 'operacoes' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th className="py-3 px-4 text-right">Swing</th>
                <th className="py-3 px-4 text-right">Day Trade</th>
                <th className="py-3 px-4 text-right">Proventos</th>
                <th
                  onClick={() => toggleSort('total')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-white"
                >
                  Total {sortKey === 'total' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#182030] font-mono">
              {filteredAssets.map((row, idx) => (
                <tr key={idx} className="hover:bg-[#141d33] transition-colors">
                  <td className="py-2.5 px-4 font-bold text-slate-100 font-mono">
                    {row.ticker}
                  </td>
                  <td className="py-2.5 px-4 font-sans text-slate-400">
                    {row.mercado}
                  </td>
                  <td className="py-2.5 px-4 text-right text-slate-300">
                    {row.operacoes}
                  </td>
                  <td className={`py-2.5 px-4 text-right ${row.normal > 0 ? 'text-emerald-400' : row.normal < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {formatCurrency(row.normal, currency)}
                  </td>
                  <td className={`py-2.5 px-4 text-right ${row.daytrade > 0 ? 'text-emerald-400' : row.daytrade < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {formatCurrency(row.daytrade, currency)}
                  </td>
                  <td className={`py-2.5 px-4 text-right ${row.outros > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {formatCurrency(row.outros, currency)}
                  </td>
                  <td className={`py-2.5 px-4 text-right font-bold ${row.total > 0 ? 'text-emerald-400' : row.total < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {formatCurrency(row.total, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
