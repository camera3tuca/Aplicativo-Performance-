import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { BrokerType, Operation, NomadTrade, NomadDividend, NomadPosition, ExtratoMensalData, InformeData, PtaxRates } from '../types';
import { initialData } from '../data/seedData';
import { parsePdfFile } from '../services/pdfParser';

const STORAGE_KEY = 'monitor_bdrs_portfolio_data_v1';

interface AppContextType {
  broker: BrokerType;
  setBroker: (b: BrokerType) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currency: 'R$' | 'US$';
  b3Ops: Operation[];
  nomadOps: Operation[];
  nomadTrades: NomadTrade[];
  nomadDivs: NomadDividend[];
  nomadPosicoes: NomadPosition[];
  extratosIr: Record<string, ExtratoMensalData>;
  informes: Record<string, InformeData>;
  ptaxCache: PtaxRates;
  processedFiles: { nome: string; tipo: string; processadoEm: string }[];
  allPeriods: string[];
  selectedPeriodRange: [string, string];
  setSelectedPeriodRange: (range: [string, string]) => void;
  currentOps: Operation[]; // all ops for current broker
  filteredOps: Operation[]; // filtered by selectedPeriodRange
  addOperation: (op: Omit<Operation, 'id'>) => void;
  deleteOperation: (id: number) => void;
  importPdfFiles: (files: File[]) => Promise<{ success: boolean; message: string }>;
  resetToInitialData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [broker, setBroker] = useState<BrokerType>('B3');
  const [activeTab, setActiveTab] = useState<string>('🏠 Visão Geral');

  // Stored state
  const [b3Ops, setB3Ops] = useState<Operation[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_b3Ops`);
      return saved ? JSON.parse(saved) : initialData.b3Ops;
    } catch {
      return initialData.b3Ops;
    }
  });

  const [nomadOps, setNomadOps] = useState<Operation[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_nomadOps`);
      return saved ? JSON.parse(saved) : initialData.nomadOps;
    } catch {
      return initialData.nomadOps;
    }
  });

  const [nomadTrades, setNomadTrades] = useState<NomadTrade[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_nomadTrades`);
      return saved ? JSON.parse(saved) : initialData.nomadTrades;
    } catch {
      return initialData.nomadTrades;
    }
  });

  const [nomadDivs, setNomadDivs] = useState<NomadDividend[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_nomadDivs`);
      return saved ? JSON.parse(saved) : initialData.nomadDivs;
    } catch {
      return initialData.nomadDivs;
    }
  });

  const [nomadPosicoes, setNomadPosicoes] = useState<NomadPosition[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_nomadPosicoes`);
      return saved ? JSON.parse(saved) : initialData.nomadPosicoes;
    } catch {
      return initialData.nomadPosicoes;
    }
  });

  const [extratosIr, setExtratosIr] = useState<Record<string, ExtratoMensalData>>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_extratosIr`);
      return saved ? JSON.parse(saved) : initialData.extratosIr;
    } catch {
      return initialData.extratosIr;
    }
  });

  const [informes, setInformes] = useState<Record<string, InformeData>>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_informes`);
      return saved ? JSON.parse(saved) : initialData.informes;
    } catch {
      return initialData.informes;
    }
  });

  const [ptaxCache, setPtaxCache] = useState<PtaxRates>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_ptaxCache`);
      return saved ? JSON.parse(saved) : initialData.ptaxCache;
    } catch {
      return initialData.ptaxCache;
    }
  });

  const [processedFiles, setProcessedFiles] = useState<{ nome: string; tipo: string; processadoEm: string }[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_processedFiles`);
      return saved ? JSON.parse(saved) : initialData.processedFiles;
    } catch {
      return initialData.processedFiles;
    }
  });

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_b3Ops`, JSON.stringify(b3Ops));
      localStorage.setItem(`${STORAGE_KEY}_nomadOps`, JSON.stringify(nomadOps));
      localStorage.setItem(`${STORAGE_KEY}_nomadTrades`, JSON.stringify(nomadTrades));
      localStorage.setItem(`${STORAGE_KEY}_nomadDivs`, JSON.stringify(nomadDivs));
      localStorage.setItem(`${STORAGE_KEY}_nomadPosicoes`, JSON.stringify(nomadPosicoes));
      localStorage.setItem(`${STORAGE_KEY}_extratosIr`, JSON.stringify(extratosIr));
      localStorage.setItem(`${STORAGE_KEY}_informes`, JSON.stringify(informes));
      localStorage.setItem(`${STORAGE_KEY}_ptaxCache`, JSON.stringify(ptaxCache));
      localStorage.setItem(`${STORAGE_KEY}_processedFiles`, JSON.stringify(processedFiles));
    } catch (e) {
      console.warn('Storage limit or quota exceeded', e);
    }
  }, [b3Ops, nomadOps, nomadTrades, nomadDivs, nomadPosicoes, extratosIr, informes, ptaxCache, processedFiles]);

  const currency: 'R$' | 'US$' = broker === 'B3' ? 'R$' : 'US$';
  const currentOps = useMemo(() => (broker === 'B3' ? b3Ops : nomadOps), [broker, b3Ops, nomadOps]);

  // Available periods for the current broker
  const allPeriods = useMemo(() => {
    const set = new Set<string>();
    for (const op of currentOps) {
      if (op.periodo) set.add(op.periodo);
    }
    return Array.from(set).sort();
  }, [currentOps]);

  // Selected period range [ini, fim]
  const [selectedPeriodRange, setSelectedPeriodRange] = useState<[string, string]>(() => {
    if (allPeriods.length > 0) {
      return [allPeriods[0], allPeriods[allPeriods.length - 1]];
    }
    return ['', ''];
  });

  // Auto-sync period range when switching broker
  useEffect(() => {
    if (allPeriods.length > 0) {
      setSelectedPeriodRange([allPeriods[0], allPeriods[allPeriods.length - 1]]);
    } else {
      setSelectedPeriodRange(['', '']);
    }
  }, [broker, allPeriods]);

  // Filtered ops by period
  const filteredOps = useMemo(() => {
    if (!selectedPeriodRange[0] || !selectedPeriodRange[1]) return currentOps;
    return currentOps.filter(
      op => op.periodo >= selectedPeriodRange[0] && op.periodo <= selectedPeriodRange[1]
    );
  }, [currentOps, selectedPeriodRange]);

  const addOperation = (op: Omit<Operation, 'id'>) => {
    const newOp: Operation = {
      ...op,
      id: Date.now() + Math.random(),
    };
    if (broker === 'B3') {
      setB3Ops(prev => [newOp, ...prev]);
    } else {
      setNomadOps(prev => [newOp, ...prev]);
    }
  };

  const deleteOperation = (id: number) => {
    if (broker === 'B3') {
      setB3Ops(prev => prev.filter(o => o.id !== id));
    } else {
      setNomadOps(prev => prev.filter(o => o.id !== id));
    }
  };

  const resetToInitialData = () => {
    setB3Ops(initialData.b3Ops);
    setNomadOps(initialData.nomadOps);
    setNomadTrades(initialData.nomadTrades);
    setNomadDivs(initialData.nomadDivs);
    setNomadPosicoes(initialData.nomadPosicoes);
    setExtratosIr(initialData.extratosIr);
    setInformes(initialData.informes);
    setPtaxCache(initialData.ptaxCache);
    setProcessedFiles(initialData.processedFiles);
    localStorage.clear();
  };

  const importPdfFiles = async (files: File[]) => {
    let newB3OpsCount = 0;
    let newNomadTradesCount = 0;
    let newExtratosCount = 0;
    let newInformesCount = 0;

    const newProcessed: { nome: string; tipo: string; processadoEm: string }[] = [];

    for (const file of files) {
      try {
        const res = await parsePdfFile(file);
        const dateStr = new Date().toISOString().slice(0, 10);

        if (res.fileType === 'B3_OPS' && res.b3Ops?.length) {
          // Remove existing ops from same file if any, and append new
          setB3Ops(prev => [
            ...prev.filter(o => o.arquivo !== file.name),
            ...res.b3Ops!,
          ]);
          newB3OpsCount += res.b3Ops.length;
          newProcessed.push({ nome: file.name, tipo: 'Operações B3 (MyCapital)', processadoEm: dateStr });
        } else if (res.fileType === 'NOMAD_STMT') {
          if (res.nomadTrades?.length) {
            setNomadTrades(prev => [...prev, ...res.nomadTrades!]);
            newNomadTradesCount += res.nomadTrades.length;
          }
          if (res.nomadDivs?.length) {
            setNomadDivs(prev => [...prev, ...res.nomadDivs!]);
          }
          newProcessed.push({ nome: file.name, tipo: 'Extrato Nomad (Ações EUA)', processadoEm: dateStr });
        } else if (res.fileType === 'EXTRATO_IR' && res.extratos) {
          setExtratosIr(prev => ({ ...prev, ...res.extratos }));
          newExtratosCount += Object.keys(res.extratos).length;
          newProcessed.push({ nome: file.name, tipo: 'Extrato Mensal IR (MyCapital)', processadoEm: dateStr });
        } else if (res.fileType === 'INFORME_IR' && res.informe) {
          setInformes(prev => ({ ...prev, [res.informe!.ano]: res.informe! }));
          newInformesCount += 1;
          newProcessed.push({ nome: file.name, tipo: `Informe de Rendimentos (${res.informe.ano})`, processadoEm: dateStr });
        }
      } catch (err) {
        console.error(`Erro ao importar ${file.name}:`, err);
      }
    }

    if (newProcessed.length > 0) {
      setProcessedFiles(prev => [...newProcessed, ...prev]);
    }

    const parts: string[] = [];
    if (newB3OpsCount) parts.push(`${newB3OpsCount} operações B3`);
    if (newNomadTradesCount) parts.push(`${newNomadTradesCount} trades Nomad`);
    if (newExtratosCount) parts.push(`${newExtratosCount} meses de extrato IR`);
    if (newInformesCount) parts.push(`${newInformesCount} informe anual`);

    return {
      success: parts.length > 0,
      message: parts.length > 0 ? `Importado com sucesso: ${parts.join(', ')}.` : 'Nenhum dado novo encontrado nos arquivos.',
    };
  };

  return (
    <AppContext.Provider
      value={{
        broker,
        setBroker,
        activeTab,
        setActiveTab,
        currency,
        b3Ops,
        nomadOps,
        nomadTrades,
        nomadDivs,
        nomadPosicoes,
        extratosIr,
        informes,
        ptaxCache,
        processedFiles,
        allPeriods,
        selectedPeriodRange,
        setSelectedPeriodRange,
        currentOps,
        filteredOps,
        addOperation,
        deleteOperation,
        importPdfFiles,
        resetToInitialData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
