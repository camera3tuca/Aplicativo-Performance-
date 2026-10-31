import React from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../services/calculations';
import { Calendar, ChevronRight } from 'lucide-react';

const TABS = [
  '🏠 Visão Geral',
  '📈 Performance Mensal',
  '💼 Por Ativo',
  '📊 Análise',
  '⚡ Day Trade vs Swing',
  '🧮 Métricas',
  '📑 IR / Anual',
  '📋 Operações',
  '📥 Importar',
];

export const Navbar: React.FC = () => {
  const {
    broker,
    setBroker,
    activeTab,
    setActiveTab,
    currency,
    filteredOps,
    allPeriods,
    selectedPeriodRange,
    setSelectedPeriodRange,
  } = useApp();

  const totalAcum = filteredOps.reduce(
    (acc, o) => acc + (o.res_normal || 0) + (o.res_daytrade || 0) + (o.res_outros || 0),
    0
  );
  const nUniqueMonths = new Set(filteredOps.map(o => o.periodo)).size;

  return (
    <header className="border-b border-[#1e2535] bg-[#0b0e16]/95 backdrop-blur-md sticky top-0 z-30 pt-3 pb-2 px-4 sm:px-6 max-w-[1500px] mx-auto w-full">
      {/* Top Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📊</span>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>MonitorBDRs</span>
              <span className="text-slate-500 font-normal">·</span>
              <span className="text-blue-400 font-semibold">Performance</span>
            </h1>
            <p className="text-xs text-slate-400">Controle Pessoal de Operações na Bolsa de Valores</p>
          </div>
        </div>

        {/* Broker Switcher */}
        <div className="flex items-center gap-1.5 bg-[#131a2b] p-1 rounded-xl border border-[#243049] self-start md:self-auto">
          <button
            onClick={() => setBroker('B3')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              broker === 'B3'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🇧🇷 B3 · MyCapital
          </button>
          <button
            onClick={() => setBroker('Nomad')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              broker === 'Nomad'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🇺🇸 EUA · Nomad
          </button>
        </div>
      </div>

      {/* Subheader: Totals overview */}
      <div className="flex flex-wrap items-center justify-between gap-2 py-1 text-xs text-slate-400 border-t border-[#161d2d]">
        <div className="flex items-center gap-2">
          <span>{filteredOps.length} operações</span>
          <span>·</span>
          <span>{nUniqueMonths} meses</span>
          <span>·</span>
          <span>acumulado</span>
          <span
            className={`font-mono font-bold text-sm ${
              totalAcum >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatCurrency(totalAcum, currency)}
          </span>
        </div>

        {/* Period Range selector */}
        {allPeriods.length > 1 && (
          <div className="flex items-center gap-2 bg-[#131a2a] px-2.5 py-1 rounded-lg border border-[#243049]">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[11px] text-slate-400">Período:</span>
            <select
              value={selectedPeriodRange[0] || allPeriods[0]}
              onChange={e => setSelectedPeriodRange([e.target.value, selectedPeriodRange[1]])}
              className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer"
            >
              {allPeriods.map(p => (
                <option key={`start-${p}`} value={p} className="bg-[#141b2d] text-white">
                  {p}
                </option>
              ))}
            </select>
            <ChevronRight className="w-3 h-3 text-slate-500" />
            <select
              value={selectedPeriodRange[1] || allPeriods[allPeriods.length - 1]}
              onChange={e => setSelectedPeriodRange([selectedPeriodRange[0], e.target.value])}
              className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer"
            >
              {allPeriods.map(p => (
                <option key={`end-${p}`} value={p} className="bg-[#141b2d] text-white">
                  {p}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Navigation Tabs (Horizontal pills matching the original app) */}
      <nav className="flex items-center gap-1.5 overflow-x-auto py-2 no-scrollbar scroll-smooth">
        {TABS.map(tab => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-[#131a2a] border border-[#243049] text-slate-300 hover:border-blue-500/50 hover:bg-[#18223a]'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
