import React from 'react';
import { useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { OverviewView } from './components/views/OverviewView';
import { MonthlyPerformanceView } from './components/views/MonthlyPerformanceView';
import { AssetPerformanceView } from './components/views/AssetPerformanceView';
import { DetailedAnalysisView } from './components/views/DetailedAnalysisView';
import { DayTradeVsSwingView } from './components/views/DayTradeVsSwingView';
import { MetricsView } from './components/views/MetricsView';
import { TaxAnnualView } from './components/views/TaxAnnualView';
import { OperationsLogView } from './components/views/OperationsLogView';
import { ImportManagementView } from './components/views/ImportManagementView';

export const App: React.FC = () => {
  const { activeTab } = useApp();

  return (
    <div className="min-h-screen bg-[#0b0e16] text-[#e2e8f0] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-[1500px] w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === '🏠 Visão Geral' && <OverviewView />}
        {activeTab === '📈 Performance Mensal' && <MonthlyPerformanceView />}
        {activeTab === '💼 Por Ativo' && <AssetPerformanceView />}
        {activeTab === '📊 Análise' && <DetailedAnalysisView />}
        {activeTab === '⚡ Day Trade vs Swing' && <DayTradeVsSwingView />}
        {activeTab === '🧮 Métricas' && <MetricsView />}
        {activeTab === '📑 IR / Anual' && <TaxAnnualView />}
        {activeTab === '📋 Operações' && <OperationsLogView />}
        {activeTab === '📥 Importar' && <ImportManagementView />}
      </main>

      <footer className="border-t border-[#1e2535] py-4 text-center text-xs text-slate-500">
        MonitorBDRs · Performance — Sistema de Controle Pessoal e Apuração de IR para Operações em Bolsa (B3 e EUA)
      </footer>
    </div>
  );
};

export default App;
