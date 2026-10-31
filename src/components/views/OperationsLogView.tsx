import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { MetricCard } from '../ui/MetricCard';
import { AddOperationModal } from '../ui/AddOperationModal';
import { formatCurrency, formatKpi } from '../../services/calculations';
import { downloadCsv } from '../../services/exportService';
import { Download, PlusCircle, Search, Trash2, Filter } from 'lucide-react';

export const OperationsLogView: React.FC = () => {
  const { filteredOps, currency, deleteOperation } = useApp();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState('Todos');
  const [selectedTicker, setSelectedTicker] = useState('Todos');
  const [selectedTipo, setSelectedTipo] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    filteredOps.forEach(o => {
      if (o.periodo) set.add(o.periodo);
    });
    return ['Todos', ...Array.from(set).sort()];
  }, [filteredOps]);

  const availableTickers = useMemo(() => {
    const set = new Set<string>();
    filteredOps.forEach(o => {
      if (o.ticker) set.add(o.ticker);
    });
    return ['Todos', ...Array.from(set).sort()];
  }, [filteredOps]);

  const filteredData = useMemo(() => {
    return filteredOps.filter(o => {
      if (selectedMonth !== 'Todos' && o.periodo !== selectedMonth) return false;
      if (selectedTicker !== 'Todos' && o.ticker !== selectedTicker) return false;
      if (selectedTipo === 'Day Trade' && o.daytrade !== 1) return false;
      if (selectedTipo === 'Swing' && o.daytrade !== 0) return false;
      if (selectedTipo === 'Compra' && !o.tipo?.startsWith('Compra')) return false;
      if (selectedTipo === 'Venda' && !o.tipo?.startsWith('Venda')) return false;
      if (selectedTipo === 'Dividendo' && o.tipo !== 'Dividendo') return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toUpperCase().trim();
        const matches = o.ticker.includes(q) || (o.mercado && o.mercado.toUpperCase().includes(q)) || o.data.includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [filteredOps, selectedMonth, selectedTicker, selectedTipo, searchTerm]);

  // Current filter metrics
  const volCompra = filteredData.filter(o => o.tipo?.startsWith('Compra')).reduce((acc, o) => acc + (o.valor || 0), 0);
  const volVenda = filteredData.filter(o => o.tipo?.startsWith('Venda')).reduce((acc, o) => acc + (o.valor || 0), 0);
  const totalResultado = filteredData.reduce(
    (acc, o) => acc + (o.res_normal || 0) + (o.res_daytrade || 0) + (o.res_outros || 0),
    0
  );

  // Paginated slice
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page]);

  const handleExportCsv = () => {
    const rows = filteredData.map(o => ({
      Data: o.data,
      Período: o.periodo,
      Mercado: o.mercado,
      Ativo: o.ticker,
      Tipo: o.tipo,
      Qtd: o.quantidade,
      Preço: o.preco,
      Valor: o.valor,
      Resultado: (o.res_normal || 0) + (o.res_daytrade || 0) + (o.res_outros || 0),
      Arquivo: o.arquivo || 'Manual',
    }));
    downloadCsv(rows, 'operacoes.csv');
  };

  const getResultColor = (val: number) => {
    if (val > 0) return 'text-emerald-400 font-bold';
    if (val < 0) return 'text-rose-400 font-bold';
    return 'text-slate-400';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Registro de Operações</h2>
          <p className="text-xs text-slate-400">Histórico completo de trades com filtros dinâmicos e controle pessoal</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nova Operação</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1a2236] hover:bg-[#222c44] border border-[#2e3b52] text-xs font-semibold text-slate-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Baixar CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#101626] border border-[#1e2535] rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-blue-400" />
            <span>Mês</span>
          </label>
          <select
            value={selectedMonth}
            onChange={e => {
              setSelectedMonth(e.target.value);
              setPage(1);
            }}
            className="w-full bg-[#161d30] border border-[#243049] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            {availableMonths.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Ativo (Ticker)
          </label>
          <select
            value={selectedTicker}
            onChange={e => {
              setSelectedTicker(e.target.value);
              setPage(1);
            }}
            className="w-full bg-[#161d30] border border-[#243049] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
          >
            {availableTickers.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Tipo
          </label>
          <select
            value={selectedTipo}
            onChange={e => {
              setSelectedTipo(e.target.value);
              setPage(1);
            }}
            className="w-full bg-[#161d30] border border-[#243049] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="Todos">Todos</option>
            <option value="Day Trade">Day Trade</option>
            <option value="Swing">Swing Trade</option>
            <option value="Compra">Somente Compras</option>
            <option value="Venda">Somente Vendas</option>
            <option value="Dividendo">Proventos / Dividendos</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Busca Rápida
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#161d30] border border-[#243049] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Filter Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard label="Operações Filtradas" value={filteredData.length.toString()} />
        <MetricCard label="Volume Comprado" value={formatKpi(volCompra, currency)} />
        <MetricCard label="Volume Vendido" value={formatKpi(volVenda, currency)} />
        <MetricCard
          label="Resultado do Filtro"
          value={formatKpi(totalResultado, currency)}
          deltaType={totalResultado >= 0 ? 'positive' : 'negative'}
        />
      </div>

      {/* Table */}
      <div className="bg-[#101626] border border-[#1e2535] rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#141b2d] text-slate-400 uppercase text-[11px] font-semibold border-b border-[#1e2535]">
              <tr>
                <th className="py-3 px-3">Data</th>
                <th className="py-3 px-3">Mercado</th>
                <th className="py-3 px-3">Ativo</th>
                <th className="py-3 px-3">Tipo</th>
                <th className="py-3 px-3 text-right">Qtd</th>
                <th className="py-3 px-3 text-right">Preço</th>
                <th className="py-3 px-3 text-right">Valor</th>
                <th className="py-3 px-3 text-right">Resultado</th>
                <th className="py-3 px-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#182030] font-mono">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 font-sans">
                    Nenhuma operação corresponde aos filtros aplicados.
                  </td>
                </tr>
              ) : (
                paginatedRows.map(op => {
                  const res = (op.res_normal || 0) + (op.res_daytrade || 0) + (op.res_outros || 0);
                  return (
                    <tr key={op.id} className="hover:bg-[#141d33] transition-colors">
                      <td className="py-2.5 px-3 text-slate-300 font-sans">{op.data}</td>
                      <td className="py-2.5 px-3 text-slate-400 font-sans text-xs">{op.mercado}</td>
                      <td className="py-2.5 px-3 font-bold text-white">{op.ticker}</td>
                      <td className="py-2.5 px-3 font-sans">
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full border ${
                            op.tipo?.includes('DayTrade')
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                              : op.tipo?.startsWith('Compra')
                              ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                              : op.tipo?.startsWith('Venda')
                              ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {op.tipo}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-300">
                        {op.quantidade ? op.quantidade.toLocaleString('pt-BR', { maximumFractionDigits: 5 }) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-300">
                        {op.preco ? formatCurrency(op.preco, currency) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-300">
                        {op.valor ? formatCurrency(op.valor, currency) : '—'}
                      </td>
                      <td className={`py-2.5 px-3 text-right ${getResultColor(res)}`}>
                        {res !== 0 ? formatCurrency(res, currency) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => deleteOperation(op.id)}
                          title="Excluir operação"
                          className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-[#1e2535] flex items-center justify-between text-xs text-slate-400 bg-[#131a2a]">
            <div>
              Mostrando {Math.min(filteredData.length, (page - 1) * pageSize + 1)}–
              {Math.min(filteredData.length, page * pageSize)} de {filteredData.length}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-lg bg-[#1a2236] border border-[#243049] text-slate-300 disabled:opacity-40 hover:bg-slate-700"
              >
                Anterior
              </button>
              <span className="font-mono px-2">
                {page} / {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded-lg bg-[#1a2236] border border-[#243049] text-slate-300 disabled:opacity-40 hover:bg-slate-700"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      <AddOperationModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
};
