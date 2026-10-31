import React from 'react';
import { useApp } from '../../context/AppContext';
import { BarChart } from '../ui/BarChart';
import { calculateMonthlySummary, formatCurrency } from '../../services/calculations';
import { downloadCsv } from '../../services/exportService';
import { Download } from 'lucide-react';

export const MonthlyPerformanceView: React.FC = () => {
  const { filteredOps, currency } = useApp();

  const rm = calculateMonthlySummary(filteredOps);

  if (rm.length === 0) {
    return (
      <div className="bg-[#131a2a] border border-[#243049] rounded-2xl p-8 text-center text-slate-400">
        Nenhum dado mensal carregado.
      </div>
    );
  }

  const barData = rm.map(r => ({
    label: r.periodo,
    value: r.total,
    color: r.total >= 0 ? '#10b981' : '#ef4444',
  }));

  const handleExportCsv = () => {
    const rows = rm.map(r => ({
      Mês: r.periodo,
      Swing: r.normal,
      'Day Trade': r.daytrade,
      Proventos: r.outros,
      Total: r.total,
      Acumulado: r.acumulado,
    }));
    downloadCsv(rows, 'performance_mensal.csv');
  };

  const getResultColor = (val: number) => {
    if (val > 0) return 'text-emerald-400 font-bold';
    if (val < 0) return 'text-rose-400 font-bold';
    return 'text-slate-400 font-medium';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Performance Mensal</h2>
          <p className="text-xs text-slate-400">Detalhamento dos resultados realizados mês a mês</p>
        </div>
        <button
          onClick={handleExportCsv}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#1a2236] hover:bg-[#222c44] border border-[#2e3b52] text-xs font-semibold text-slate-200 transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-blue-400" />
          <span>Baixar CSV</span>
        </button>
      </div>

      {/* Monthly Table */}
      <div className="bg-[#101626] border border-[#1e2535] rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#141b2d] text-slate-400 uppercase text-[11px] font-semibold border-b border-[#1e2535]">
              <tr>
                <th className="py-3 px-4">Mês</th>
                <th className="py-3 px-4 text-right">Swing</th>
                <th className="py-3 px-4 text-right">Day Trade</th>
                <th className="py-3 px-4 text-right">Proventos</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-right">Acumulado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#182030] font-mono">
              {rm.map((row, idx) => (
                <tr key={idx} className="hover:bg-[#141d33] transition-colors">
                  <td className="py-2.5 px-4 font-sans font-semibold text-slate-200">
                    {row.periodo}
                  </td>
                  <td className={`py-2.5 px-4 text-right ${getResultColor(row.normal)}`}>
                    {formatCurrency(row.normal, currency)}
                  </td>
                  <td className={`py-2.5 px-4 text-right ${getResultColor(row.daytrade)}`}>
                    {formatCurrency(row.daytrade, currency)}
                  </td>
                  <td className={`py-2.5 px-4 text-right ${getResultColor(row.outros)}`}>
                    {formatCurrency(row.outros, currency)}
                  </td>
                  <td className={`py-2.5 px-4 text-right ${getResultColor(row.total)}`}>
                    {formatCurrency(row.total, currency)}
                  </td>
                  <td className={`py-2.5 px-4 text-right font-bold ${row.acumulado >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(row.acumulado, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bar Chart: Resultado Total por Mês */}
      <div className="bg-[#101626] border border-[#1e2535] rounded-2xl p-4 sm:p-5">
        <h3 className="text-base font-semibold text-slate-100 mb-1">
          Resultado Total por Mês
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Barras verdes indicam meses lucrativos e vermelhas meses em prejuízo
        </p>
        <BarChart data={barData} height={240} currency={currency} />
      </div>
    </div>
  );
};
