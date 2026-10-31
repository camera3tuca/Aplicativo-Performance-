import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UploadCloud, FileText, CheckCircle2, RotateCcw, AlertCircle, FileCheck } from 'lucide-react';

export const ImportManagementView: React.FC = () => {
  const { processedFiles, importPdfFiles, resetToInitialData, b3Ops, nomadOps } = useApp();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).filter(f => f.name.toLowerCase().endsWith('.pdf'));

    if (files.length === 0) {
      setStatusMessage({ text: 'Por favor, selecione arquivos em formato PDF.', isError: true });
      return;
    }

    setIsProcessing(true);
    setStatusMessage(null);

    try {
      const res = await importPdfFiles(files);
      setStatusMessage({ text: res.message, isError: !res.success });
    } catch (err: any) {
      setStatusMessage({ text: `Erro no processamento: ${err.message || 'Falha ao ler PDFs'}`, isError: true });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Importar Relatórios</h2>
          <p className="text-xs text-slate-400">
            Envie relatórios da B3 (MyCapital) ou Nomad (EUA) para sincronização automática
          </p>
        </div>
        <button
          onClick={() => {
            if (window.confirm('Tem certeza que deseja restaurar os dados originais do repositório?')) {
              resetToInitialData();
              setStatusMessage({ text: 'Dados restaurados para o padrão com sucesso.' });
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1a2236] hover:bg-[#222c44] border border-[#2e3b52] text-xs font-semibold text-slate-300 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
          <span>Restaurar Dados Originais</span>
        </button>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-xs ${
            statusMessage.isError
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}
        >
          {statusMessage.isError ? (
            <AlertCircle className="w-5 h-5 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
            : 'border-[#2a3548] bg-[#131a2b] hover:border-blue-500/50'
        }`}
      >
        <div className="max-w-md mx-auto flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
            <UploadCloud className={`w-7 h-7 ${isProcessing ? 'animate-bounce' : ''}`} />
          </div>

          <h3 className="text-base font-semibold text-white mb-1">
            {isProcessing ? 'Processando PDFs...' : 'Arraste seus relatórios em PDF aqui'}
          </h3>
          <p className="text-xs text-slate-400 mb-5 leading-relaxed">
            Suporta relatórios <b>MyCapital</b> ("Operações no mês", "Extrato Mensal de Resultados", "Informe de Rendimentos") e <b>Nomad</b> ("Account Statement"). O tipo é identificado automaticamente!
          </p>

          <label className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold text-xs shadow-lg shadow-blue-600/30 transition-all">
            <FileText className="w-4 h-4" />
            <span>Selecionar Arquivos (PDF)</span>
            <input
              type="file"
              multiple
              accept=".pdf"
              className="hidden"
              onChange={e => handleFiles(e.target.files)}
              disabled={isProcessing}
            />
          </label>
        </div>
      </div>

      {/* Summary Box */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#101626] border border-[#1e2535] rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Base B3 (MyCapital)</div>
            <div className="text-base font-bold text-white font-mono">
              {b3Ops.length} operações cadastradas
            </div>
          </div>
        </div>

        <div className="bg-[#101626] border border-[#1e2535] rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Base Nomad (EUA)</div>
            <div className="text-base font-bold text-white font-mono">
              {nomadOps.length} operações apuradas
            </div>
          </div>
        </div>
      </div>

      {/* Guia Passo a Passo para Novos Meses */}
      <div className="bg-[#101626] border border-[#1e2535] rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <span>💡 Como obter e adicionar os relatórios a cada virada de mês</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-[#141b2d] border border-[#1e2535] rounded-xl p-4 space-y-2">
            <div className="font-semibold text-blue-400 flex items-center gap-1.5">
              <span>1. B3 · MyCapital</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              No portal MyCapital, acesse <b>Relatórios → "Operações no mês"</b> (ou "Extrato Mensal de Resultados"). Baixe o PDF e arraste aqui. O relatório já vem com os resultados contábeis de Swing, Day Trade e Proventos apurados!
            </p>
          </div>

          <div className="bg-[#141b2d] border border-[#1e2535] rounded-xl p-4 space-y-2">
            <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
              <span>2. EUA · Nomad</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              No app ou site da Nomad, acesse <b>Perfil → Documentos → Extratos de Investimentos</b> e baixe o <b>Account Statement</b> mensal. O app faz o pareamento FIFO automático de compras/vendas e registra dividendos.
            </p>
          </div>

          <div className="bg-[#141b2d] border border-[#1e2535] rounded-xl p-4 space-y-2">
            <div className="font-semibold text-amber-400 flex items-center gap-1.5">
              <span>3. Lançamento Manual</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Deseja registrar uma compra ou venda pontual no mesmo dia sem esperar o fechamento do mês? Vá na aba <b>📋 Operações</b> e clique em <b>+ Nova Operação</b> para adicionar diretamente na carteira!
            </p>
          </div>
        </div>
      </div>

      {/* Processed Files List */}
      <div className="bg-[#101626] border border-[#1e2535] rounded-2xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-[#1e2535] bg-[#141b2d] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">
            Relatórios Processados no Sistema ({processedFiles.length})
          </h3>
          <span className="text-xs text-slate-400">Histórico de importações</span>
        </div>

        <div className="divide-y divide-[#182030] max-h-96 overflow-y-auto">
          {processedFiles.map((file, idx) => (
            <div key={idx} className="p-3 px-4 flex items-center justify-between text-xs hover:bg-[#141d33] transition-colors">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-200">{file.nome}</div>
                  <div className="text-[11px] text-slate-400">{file.tipo}</div>
                </div>
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                {file.processadoEm}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
