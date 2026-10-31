import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { MetricCard } from '../ui/MetricCard';
import { formatCurrency, formatKpi } from '../../services/calculations';
import { downloadMultiSheetExcel } from '../../services/exportService';
import { fetchPtaxFromBcb } from '../../services/ptaxService';
import { Download, RefreshCw, FileSpreadsheet, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const TaxAnnualView: React.FC = () => {
  const {
    broker,
    filteredOps,
    nomadOps,
    nomadPosicoes,
    extratosIr,
    informes,
    ptaxCache,
    currency,
  } = useApp();

  // Mode for Nomad currency conversion
  const [conversionMode, setConversionMode] = useState<'USD' | 'MANUAL' | 'PTAX'>('PTAX');
  const [manualRate, setManualRate] = useState<number>(5.35);
  const [localPtax, setLocalPtax] = useState(ptaxCache);
  const [isLoadingPtax, setIsLoadingPtax] = useState(false);

  // ---------------- B3 TAX VIEW ----------------
  const b3Years = useMemo(() => {
    const map: Record<string, { ano: string; normal: number; daytrade: number; outros: number; ops: number }> = {};
    for (const op of filteredOps) {
      const ano = op.periodo ? op.periodo.slice(0, 4) : '2026';
      if (!map[ano]) map[ano] = { ano, normal: 0, daytrade: 0, outros: 0, ops: 0 };
      map[ano].normal += op.res_normal || 0;
      map[ano].daytrade += op.res_daytrade || 0;
      map[ano].outros += op.res_outros || 0;
      map[ano].ops += 1;
    }
    return Object.values(map).sort((a, b) => a.ano.localeCompare(b.ano));
  }, [filteredOps]);

  // Official IR months present in system
  const periodsInSystem = useMemo(() => new Set(filteredOps.map(o => o.periodo)), [filteredOps]);
  const officialIrMonths = useMemo(() => {
    return Object.keys(extratosIr)
      .filter(p => periodsInSystem.has(p))
      .sort();
  }, [extratosIr, periodsInSystem]);

  const officialIrRows = useMemo(() => {
    return officialIrMonths.map(p => {
      const d = extratosIr[p] || {};
      const impPagar = (d.imp_pagar_c || 0) + (d.imp_pagar_d || 0);
      return {
        mes: p,
        swing: d.res_acoes_c || 0,
        daytrade: d.res_acoes_d || 0,
        prejSwing: d.prej_compensar_c || 0,
        prejDt: d.prej_compensar_d || 0,
        impostoPagar: impPagar,
      };
    });
  }, [officialIrMonths, extratosIr]);

  const ultIrRow = officialIrRows[officialIrRows.length - 1];
  const totalImpostoPagar = officialIrRows.reduce((acc, r) => acc + r.impostoPagar, 0);

  // Proventos / Dividendos from operations
  const proventosPorAtivo = useMemo(() => {
    const map: Record<string, { ticker: string; mercado: string; valor: number }> = {};
    for (const op of filteredOps) {
      if (op.res_outros) {
        const k = `${op.ticker}_${op.mercado}`;
        if (!map[k]) map[k] = { ticker: op.ticker, mercado: op.mercado, valor: 0 };
        map[k].valor += op.res_outros;
      }
    }
    return Object.values(map).sort((a, b) => b.valor - a.valor);
  }, [filteredOps]);

  // Informe data
  const informeYears = Object.keys(informes).sort();
  const latestInforme = informeYears.length ? informes[informeYears[informeYears.length - 1]] : null;

  const handleDownloadExcelB3 = () => {
    const instrucoes = [
      {
        Aba: 'Renda Variável',
        'Ficha no programa DIRPF': 'Renda Variável → Operações Comuns / Day-Trade',
        'Como Preencher': 'Lance o resultado líquido de cada mês apurado pelo MyCapital. Prejuízos a compensar abatem meses seguintes.',
      },
      {
        Aba: 'Bens e Direitos',
        'Ficha no programa DIRPF': 'Bens e Direitos',
        'Como Preencher': 'Informe um ativo por linha com Grupo, Código, CNPJ, Discriminação e valor de custo em 31/12.',
      },
      {
        Aba: 'Rendimentos Isentos',
        'Ficha no programa DIRPF': 'Rendimentos Isentos e Não Tributáveis',
        'Como Preencher': 'Dividendos (cód 09), bonificações (cód 18) e lucros isentos em vendas até R$ 20k/mês (cód 20).',
      },
      {
        Aba: 'JCP',
        'Ficha no programa DIRPF': 'Rendimentos Sujeitos à Tributação Exclusiva',
        'Como Preencher': 'Juros sobre Capital Próprio (cód 10) por fonte pagadora / CNPJ.',
      },
    ];

    const rvData = officialIrRows.map(r => ({
      Mês: r.mes,
      'Operações Comuns (15%)': r.swing,
      'Day Trade (20%)': r.daytrade,
      'Prej. Comum a compensar': r.prejSwing,
      'Prej. DT a compensar': r.prejDt,
      'Imposto a Pagar': r.impostoPagar,
    }));

    const bdData = latestInforme
      ? latestInforme.bens_direitos.map(b => ({
          Ano: latestInforme.ano,
          Mercado: b.mercado,
          Grupo: b.grupo,
          Código: b.codigo,
          Ticker: b.ticker,
          CNPJ: b.cnpj,
          Discriminação: b.discriminacao,
          [`Situação em 31/12/${parseInt(latestInforme.ano) - 1}`]: b.v_ant,
          [`Situação em 31/12/${latestInforme.ano}`]: b.v_atual,
        }))
      : [];

    const divData = latestInforme
      ? latestInforme.dividendos.map(d => ({
          Tipo: d.tipo,
          Fonte: d.fonte,
          CNPJ: d.cnpj,
          'Valor (R$)': d.valor,
        }))
      : proventosPorAtivo.map(p => ({
          Ativo: p.ticker,
          Mercado: p.mercado,
          'Valor (R$)': p.valor,
        }));

    const jcpData = latestInforme
      ? latestInforme.jcp.map(j => ({
          Fonte: j.fonte,
          CNPJ: j.cnpj,
          'Valor (R$)': j.valor,
        }))
      : [];

    downloadMultiSheetExcel(
      [
        { name: 'Instruções', data: instrucoes },
        { name: 'Renda Variável', data: rvData },
        { name: 'Bens e Direitos', data: bdData },
        { name: 'Rendimentos Isentos', data: divData },
        { name: 'JCP', data: jcpData },
      ],
      'IR_B3_MyCapital.xlsx'
    );
  };

  // ---------------- NOMAD TAX VIEW ----------------
  const vendasRaw = useMemo(() => nomadOps.filter(o => o.tipo?.startsWith('Venda')), [nomadOps]);
  const divsRaw = useMemo(() => nomadOps.filter(o => o.tipo === 'Dividendo'), [nomadOps]);

  // Fetch PTAX online
  const handleFetchPtax = async () => {
    setIsLoadingPtax(true);
    const dates = new Set<string>();
    vendasRaw.forEach(v => {
      if (v._iso) dates.add(v._iso);
      if (v._lotes) v._lotes.forEach(l => dates.add(l[0]));
    });
    divsRaw.forEach(d => {
      if (d._iso) dates.add(d._iso);
    });
    nomadPosicoes.forEach(p => {
      p.lotes.forEach(l => dates.add(l[0]));
    });

    const updated = await fetchPtaxFromBcb(Array.from(dates), localPtax);
    setLocalPtax(updated);
    setIsLoadingPtax(false);
  };

  const getTaxa = (isoDate: string | undefined, lado: 'compra' | 'venda'): number | null => {
    if (conversionMode === 'USD') return null;
    if (conversionMode === 'MANUAL') return manualRate;
    if (isoDate && localPtax[isoDate]) {
      return localPtax[isoDate][lado];
    }
    return manualRate > 0 ? manualRate : null;
  };

  const calcCustoRs = (lotes: [string, number, number][]): number | null => {
    if (conversionMode === 'USD') return null;
    let total = 0;
    for (const [dataIso, , custoUsd] of lotes) {
      // Aquisição -> PTAX de VENDA
      const t = getTaxa(dataIso, 'venda');
      if (t === null) return null;
      total += custoUsd * t;
    }
    return total;
  };

  // Bens e Direitos Nomad
  const bensDireitosNomad = useMemo(() => {
    return nomadPosicoes.map(p => {
      const custoRs = calcCustoRs(p.lotes);
      let disc = `${p.quantidade.toFixed(5)} ação(ões) de ${p.nome} (${p.symbol}), negociadas em bolsa dos EUA, sob custódia da Apex Clearing Corp. por meio da corretora Nomad (conta NTKY749). Custo médio de aquisição US$ ${p.custo_total.toFixed(2)}`;
      if (custoRs !== null) {
        disc += ` (R$ ${custoRs.toFixed(2)} pela PTAX das datas de compra)`;
      }
      disc += '.';

      return {
        grupo: '03 - Participações Societárias',
        codigo: '01 - Ações (inclusive as listadas em bolsa)',
        pais: '249 - Estados Unidos',
        discriminacao: disc,
        anoAnt: 0.0,
        anoAtual: custoRs !== null ? Math.round(custoRs * 100) / 100 : null,
        symbol: p.symbol,
        quantidade: Math.round(p.quantidade * 100000) / 100000,
        custoUsd: Math.round(p.custo_total * 100) / 100,
      };
    });
  }, [nomadPosicoes, conversionMode, localPtax, manualRate]);

  // Ganhos de capital Nomad
  const ganhosNomad = useMemo(() => {
    return vendasRaw.map(o => {
      const brutoUsd = o._venda_bruta || o.valor;
      const commUsd = o._comissao || 0;
      const resUsd = (o.res_normal || 0) + (o.res_daytrade || 0);
      const custoUsd = brutoUsd - commUsd - resUsd;

      let vendaRs: number | null = null;
      let custoRs: number | null = null;
      let ganhoRs: number | null = null;

      if (conversionMode !== 'USD') {
        const tc = getTaxa(o._iso, 'compra'); // Alienação -> PTAX COMPRA
        if (tc !== null) {
          vendaRs = brutoUsd * tc;
          const commRs = commUsd * tc;
          custoRs = o._lotes ? calcCustoRs(o._lotes) : custoUsd * tc;
          if (custoRs !== null) {
            ganhoRs = vendaRs - commRs - custoRs;
          }
        }
      }

      return {
        data: o.data,
        periodo: o.periodo,
        ativo: o.ticker,
        quantidade: o.quantidade,
        vendaUsd: Math.round(brutoUsd * 100) / 100,
        custoUsd: Math.round(custoUsd * 100) / 100,
        ganhoUsd: Math.round(resUsd * 100) / 100,
        vendaRs: vendaRs !== null ? Math.round(vendaRs * 100) / 100 : null,
        custoRs: custoRs !== null ? Math.round(custoRs * 100) / 100 : null,
        ganhoRs: ganhoRs !== null ? Math.round(ganhoRs * 100) / 100 : null,
      };
    });
  }, [vendasRaw, conversionMode, localPtax, manualRate]);

  // Consolidado por Mês Nomad
  const nomadMonthlyCapitalGains = useMemo(() => {
    const map: Record<string, { periodo: string; vendaUsd: number; ganhoUsd: number; vendaRs: number; ganhoRs: number }> = {};
    for (const g of ganhosNomad) {
      if (!map[g.periodo]) map[g.periodo] = { periodo: g.periodo, vendaUsd: 0, ganhoUsd: 0, vendaRs: 0, ganhoRs: 0 };
      map[g.periodo].vendaUsd += g.vendaUsd;
      map[g.periodo].ganhoUsd += g.ganhoUsd;
      if (g.vendaRs !== null) map[g.periodo].vendaRs += g.vendaRs;
      if (g.ganhoRs !== null) map[g.periodo].ganhoRs += g.ganhoRs;
    }
    return Object.values(map).sort((a, b) => a.periodo.localeCompare(b.periodo));
  }, [ganhosNomad]);

  // Rendimentos Anuais (Lei 14.754/2023 - 15%)
  const nomadAnnualTax = useMemo(() => {
    const years = Array.from(new Set(nomadMonthlyCapitalGains.map(m => m.periodo.slice(0, 4)))).sort();
    return years.map(ano => {
      const sub = nomadMonthlyCapitalGains.filter(m => m.periodo.startsWith(ano));
      const totalUsd = sub.reduce((acc, m) => acc + m.ganhoUsd, 0);
      const totalRs = sub.reduce((acc, m) => acc + m.ganhoRs, 0);
      const imposto = totalRs > 0 ? totalRs * 0.15 : 0;
      return {
        ano,
        totalUsd: Math.round(totalUsd * 100) / 100,
        totalRs: Math.round(totalRs * 100) / 100,
        imposto15: Math.round(imposto * 100) / 100,
      };
    });
  }, [nomadMonthlyCapitalGains]);

  const handleDownloadExcelNomad = () => {
    const instrucoes = [
      {
        Aba: 'Bens e Direitos',
        'Ficha no programa DIRPF': 'Bens e Direitos',
        'Como Preencher': 'Um item por ativo. Grupo 03, Código 01, Localização 249 EUA. Cole a discriminação.',
      },
      {
        Aba: 'Rendimentos (anual)',
        'Ficha no programa DIRPF': 'Rendimentos Tributáveis - Aplicações Financeiras no Exterior (15%)',
        'Como Preencher': 'Informe o resultado anual em R$ conforme Lei 14.754/2023. O programa calcula os 15%.',
      },
      {
        Aba: 'Ganhos Mensais',
        'Ficha no programa DIRPF': 'Memória de Cálculo',
        'Como Preencher': 'Detalhamento mensal das vendas para comprovação.',
      },
      {
        Aba: 'Vendas (detalhe)',
        'Ficha no programa DIRPF': 'Memória de Cálculo FIFO',
        'Como Preencher': 'Cada alienação realizada pareada com lotes de compra por FIFO.',
      },
      {
        Aba: 'Dividendos',
        'Ficha no programa DIRPF': 'Rendimentos recebidos do exterior (Carnê-leão)',
        'Como Preencher': 'Dividendos em US$ convertidos pela PTAX de compra da data.',
      },
    ];

    const bdSheet = bensDireitosNomad.map(b => ({
      Grupo: b.grupo,
      Código: b.codigo,
      'País': b.pais,
      Ativo: b.symbol,
      Quantidade: b.quantidade,
      'Custo US$': b.custoUsd,
      'Situação em 31/12 Anterior': b.anoAnt,
      'Situação em 31/12 Atual (R$)': b.anoAtual,
      Discriminação: b.discriminacao,
    }));

    const rendSheet = nomadAnnualTax.map(a => ({
      Ano: a.ano,
      'Resultado US$': a.totalUsd,
      'Resultado R$': a.totalRs,
      'Imposto 15% (R$)': a.imposto15,
    }));

    const gcmSheet = nomadMonthlyCapitalGains.map(m => ({
      Mês: m.periodo,
      'Alienações US$': m.vendaUsd,
      'Resultado US$': m.ganhoUsd,
      'Alienações R$': m.vendaRs,
      'Resultado R$': m.ganhoRs,
    }));

    const gcSheet = ganhosNomad.map(g => ({
      Data: g.data,
      Ativo: g.ativo,
      Quantidade: g.quantidade,
      'Venda US$': g.vendaUsd,
      'Custo US$': g.custoUsd,
      'Ganho US$': g.ganhoUsd,
      'Venda R$': g.vendaRs,
      'Custo R$': g.custoRs,
      'Ganho R$': g.ganhoRs,
    }));

    const divSheet = divsRaw.map(d => {
      const tc = getTaxa(d._iso, 'compra');
      return {
        Data: d.data,
        Ativo: d.ticker,
        'Valor US$': d.res_outros,
        'Valor R$': tc !== null ? Math.round(d.res_outros * tc * 100) / 100 : null,
      };
    });

    downloadMultiSheetExcel(
      [
        { name: 'Instruções', data: instrucoes },
        { name: 'Bens e Direitos', data: bdSheet },
        { name: 'Rendimentos (anual)', data: rendSheet },
        { name: 'Ganhos Mensais', data: gcmSheet },
        { name: 'Vendas (detalhe)', data: gcSheet },
        { name: 'Dividendos', data: divSheet },
      ],
      'IR_Nomad_2026.xlsx'
    );
  };

  // Render Nomad
  if (broker === 'Nomad') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Imposto de Renda · Nomad (EUA)</h2>
            <p className="text-xs text-slate-400">
              Apuração de Ganho de Capital, Dividendos e Bens e Direitos sob a Lei 14.754/2023
            </p>
          </div>
          <button
            onClick={handleDownloadExcelNomad}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-xs font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Baixar Planilha Completa (Excel)</span>
          </button>
        </div>

        {/* Câmbio Mode Selector */}
        <div className="bg-[#101626] border border-[#1e2535] rounded-2xl p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">
                Conversão Cambial para Reais (R$)
              </h3>
              <p className="text-xs text-slate-400">
                A Receita exige PTAX de venda na aquisição e PTAX de compra na alienação/dividendo
              </p>
            </div>
            <div className="flex items-center gap-2 bg-[#161d30] p-1 rounded-xl border border-[#243049]">
              {(['USD', 'MANUAL', 'PTAX'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setConversionMode(mode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    conversionMode === mode
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {mode === 'USD'
                    ? 'Somente US$'
                    : mode === 'MANUAL'
                    ? 'Câmbio Manual'
                    : 'Automático (PTAX/BCB)'}
                </button>
              ))}
            </div>
          </div>

          {conversionMode === 'MANUAL' && (
            <div className="mt-4 pt-4 border-t border-[#1e2535] flex items-center gap-3">
              <span className="text-xs text-slate-300">Cotação fixa USD→BRL:</span>
              <input
                type="number"
                step="0.01"
                value={manualRate}
                onChange={e => setManualRate(parseFloat(e.target.value) || 0)}
                className="w-28 bg-[#1a2236] border border-[#2a3548] rounded-xl px-3 py-1 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          {conversionMode === 'PTAX' && (
            <div className="mt-4 pt-4 border-t border-[#1e2535] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="text-slate-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>
                  PTAX vinculada para {Object.keys(localPtax).length} datas de negociação.
                </span>
              </div>
              <button
                onClick={handleFetchPtax}
                disabled={isLoadingPtax}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1a2236] hover:bg-[#222c44] border border-[#2a3548] text-slate-300 font-medium disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPtax ? 'animate-spin text-blue-400' : ''}`} />
                <span>{isLoadingPtax ? 'Consultando BCB...' : 'Atualizar PTAX do Banco Central'}</span>
              </button>
            </div>
          )}
        </div>

        {/* 1. Rendimentos Anuais (Lei 14.754) */}
        <div className="bg-[#101626] border border-[#1e2535] rounded-2xl p-4 sm:p-5">
          <h3 className="text-base font-semibold text-slate-100 mb-1">
            1 · Rendimentos Anuais no Exterior (Lei 14.754/2023 - 15%)
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Declarados no programa DIRPF em "Rendimentos Tributáveis - Aplicações Financeiras no Exterior"
          </p>
          <div className="overflow-x-auto border border-[#1e2535] rounded-xl">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#141b2d] text-slate-400 uppercase text-[10px] font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Ano</th>
                  <th className="py-2.5 px-4 text-right">Resultado (US$)</th>
                  <th className="py-2.5 px-4 text-right">Resultado (R$)</th>
                  <th className="py-2.5 px-4 text-right">Imposto Devido 15% (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#182030] font-mono">
                {nomadAnnualTax.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#141d33]">
                    <td className="py-2.5 px-4 font-sans font-bold text-slate-200">{row.ano}</td>
                    <td className={`py-2.5 px-4 text-right ${row.totalUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatCurrency(row.totalUsd, 'US$')}
                    </td>
                    <td className={`py-2.5 px-4 text-right font-bold ${row.totalRs >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatCurrency(row.totalRs, 'R$')}
                    </td>
                    <td className="py-2.5 px-4 text-right text-amber-400 font-bold">
                      {formatCurrency(row.imposto15, 'R$')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. Bens e Direitos Nomad */}
        <div className="bg-[#101626] border border-[#1e2535] rounded-2xl p-4 sm:p-5">
          <h3 className="text-base font-semibold text-slate-100 mb-1">
            2 · Bens e Direitos — Posições em Carteira
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Grupo 03 - Participações Societárias · Código 01 - Ações · País 249 Estados Unidos
          </p>
          <div className="overflow-x-auto border border-[#1e2535] rounded-xl max-h-96">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#141b2d] text-slate-400 uppercase text-[10px] font-semibold sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Ativo</th>
                  <th className="py-2.5 px-3 text-right">Qtd</th>
                  <th className="py-2.5 px-3 text-right">Custo US$</th>
                  <th className="py-2.5 px-3 text-right">Custo em 31/12 (R$)</th>
                  <th className="py-2.5 px-4">Discriminação pronta para a DIRPF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#182030] font-mono">
                {bensDireitosNomad.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#141d33]">
                    <td className="py-2.5 px-3 font-bold text-slate-100">{row.symbol}</td>
                    <td className="py-2.5 px-3 text-right text-slate-300">{row.quantidade}</td>
                    <td className="py-2.5 px-3 text-right text-slate-300">{formatCurrency(row.custoUsd, 'US$')}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                      {row.anoAtual !== null ? formatCurrency(row.anoAtual, 'R$') : '—'}
                    </td>
                    <td className="py-2.5 px-4 font-sans text-slate-300 text-[11px] leading-relaxed max-w-md">
                      {row.discriminacao}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Warning Callout */}
        <div className="bg-[#161d30] border border-[#243049] border-l-4 border-l-amber-500 rounded-xl p-4 text-xs text-slate-300 leading-relaxed flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <b>Material de apoio — confira com seu contador.</b> Investimentos no exterior seguem a{' '}
            <b>Lei 14.754/2023</b>: os resultados são apurados <b>anualmente</b> e tributados à alíquota de <b>15%</b> na Declaração de Ajuste Anual (DAA). Custos de aquisição e apuração de resultado usam o método <b>FIFO</b> com cotação PTAX oficial do Banco Central.
          </div>
        </div>
      </div>
    );
  }

  // ---------------- B3 TAX VIEW RENDER ----------------
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Imposto de Renda · B3 (MyCapital)</h2>
          <p className="text-xs text-slate-400">
            Apuração oficial de Renda Variável, compensação de prejuízos acumulados e Informe Anual
          </p>
        </div>
        <button
          onClick={handleDownloadExcelB3}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-xs font-semibold text-white shadow-lg shadow-blue-600/20 transition-all"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Baixar Planilha Completa para IR (Excel)</span>
        </button>
      </div>

      {/* Annual Summary Table */}
      <div className="bg-[#101626] border border-[#1e2535] rounded-2xl p-4 sm:p-5">
        <h3 className="text-base font-semibold text-slate-100 mb-3">
          Resultado Geral por Ano
        </h3>
        <div className="overflow-x-auto border border-[#1e2535] rounded-xl">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#141b2d] text-slate-400 uppercase text-[10px] font-semibold">
              <tr>
                <th className="py-2.5 px-4">Ano</th>
                <th className="py-2.5 px-4 text-right">Operações</th>
                <th className="py-2.5 px-4 text-right">Swing (Normal)</th>
                <th className="py-2.5 px-4 text-right">Day Trade</th>
                <th className="py-2.5 px-4 text-right">Proventos</th>
                <th className="py-2.5 px-4 text-right">Resultado Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#182030] font-mono">
              {b3Years.map((row, idx) => {
                const total = row.normal + row.daytrade + row.outros;
                return (
                  <tr key={idx} className="hover:bg-[#141d33]">
                    <td className="py-2.5 px-4 font-sans font-bold text-slate-200">{row.ano}</td>
                    <td className="py-2.5 px-4 text-right text-slate-300">{row.ops}</td>
                    <td className={`py-2.5 px-4 text-right ${row.normal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatCurrency(row.normal, currency)}
                    </td>
                    <td className={`py-2.5 px-4 text-right ${row.daytrade >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatCurrency(row.daytrade, currency)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-emerald-400">
                      {formatCurrency(row.outros, currency)}
                    </td>
                    <td className={`py-2.5 px-4 text-right font-bold ${total >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatCurrency(total, currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official MyCapital Monthly Tax Extraction */}
      {officialIrRows.length > 0 && (
        <div className="bg-[#101626] border border-[#1e2535] rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                1 · Renda Variável (Mensal) — Apuração Oficial MyCapital
              </h3>
              <p className="text-xs text-slate-400">
                Extrato Mensal de Resultados oficial com abatimento de prejuízos acumulados anteriores
              </p>
            </div>
            <span className="text-[11px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full font-medium">
              Oficial Receita Federal
            </span>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4">
            <MetricCard
              label="Imposto a Pagar (Período)"
              value={formatKpi(totalImpostoPagar, 'R$')}
              deltaType={totalImpostoPagar > 0 ? 'negative' : 'positive'}
            />
            <MetricCard
              label="Prej. Swing a Compensar"
              value={formatKpi(ultIrRow ? ultIrRow.prejSwing : 0, 'R$')}
              subtext="Abate lucros futuros (15%)"
            />
            <MetricCard
              label="Prej. Day Trade a Compensar"
              value={formatKpi(ultIrRow ? ultIrRow.prejDt : 0, 'R$')}
              subtext="Abate lucros futuros (20%)"
            />
            <MetricCard
              label="Posição Atualizada"
              value={ultIrRow ? ultIrRow.mes : '—'}
              subtext="Último mês apurado"
            />
          </div>

          <div className="overflow-x-auto border border-[#1e2535] rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#141b2d] text-slate-400 uppercase text-[10px] font-semibold border-b border-[#1e2535]">
                <tr>
                  <th className="py-2.5 px-3">Mês</th>
                  <th className="py-2.5 px-3 text-right">Swing (15%)</th>
                  <th className="py-2.5 px-3 text-right">Day Trade (20%)</th>
                  <th className="py-2.5 px-3 text-right">Prej. Comum a Compensar</th>
                  <th className="py-2.5 px-3 text-right">Prej. DT a Compensar</th>
                  <th className="py-2.5 px-3 text-right">Imposto a Pagar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#182030] font-mono">
                {officialIrRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#141d33]">
                    <td className="py-2 px-3 font-sans font-semibold text-slate-200">{row.mes}</td>
                    <td className={`py-2 px-3 text-right ${row.swing > 0 ? 'text-emerald-400' : row.swing < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                      {formatCurrency(row.swing, 'R$')}
                    </td>
                    <td className={`py-2 px-3 text-right ${row.daytrade > 0 ? 'text-emerald-400' : row.daytrade < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                      {formatCurrency(row.daytrade, 'R$')}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-300">
                      {formatCurrency(row.prejSwing, 'R$')}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-300">
                      {formatCurrency(row.prejDt, 'R$')}
                    </td>
                    <td className={`py-2 px-3 text-right font-bold ${row.impostoPagar > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                      {formatCurrency(row.impostoPagar, 'R$')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Bens e Direitos (do Informe MyCapital) */}
      {latestInforme && (
        <div className="bg-[#101626] border border-[#1e2535] rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                2 · Bens e Direitos — Informe de Rendimentos Anual ({latestInforme.ano})
              </h3>
              <p className="text-xs text-slate-400">
                Posições oficiais em 31/12 com CNPJ, grupo e discriminação
              </p>
            </div>
            {latestInforme.ir_retido > 0 && (
              <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full font-mono">
                IR Retido Fonte (Lei 11.033): {formatCurrency(latestInforme.ir_retido, 'R$')}
              </span>
            )}
          </div>

          <div className="overflow-x-auto border border-[#1e2535] rounded-xl max-h-96">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#141b2d] text-slate-400 uppercase text-[10px] font-semibold sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Ticker</th>
                  <th className="py-2.5 px-3">CNPJ</th>
                  <th className="py-2.5 px-3 text-right">31/12/{parseInt(latestInforme.ano) - 1}</th>
                  <th className="py-2.5 px-3 text-right">31/12/{latestInforme.ano}</th>
                  <th className="py-2.5 px-4">Discriminação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#182030] font-mono">
                {latestInforme.bens_direitos.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#141d33]">
                    <td className="py-2 px-3 text-slate-400">{row.grupo}-{row.codigo}</td>
                    <td className="py-2 px-3 font-bold text-slate-100">{row.ticker}</td>
                    <td className="py-2 px-3 text-slate-400">{row.cnpj || '—'}</td>
                    <td className="py-2 px-3 text-right text-slate-400">{formatCurrency(row.v_ant, 'R$')}</td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-400">
                      {formatCurrency(row.v_atual, 'R$')}
                    </td>
                    <td className="py-2 px-4 font-sans text-slate-300 text-[11px] leading-relaxed max-w-md">
                      {row.discriminacao}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Rendimentos Isentos e JCP */}
      {latestInforme && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#101626] border border-[#1e2535] rounded-2xl p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-slate-100 mb-2">
              3 · Rendimentos Isentos e Não Tributáveis
            </h3>
            <div className="space-y-2">
              {latestInforme.dividendos.map((div, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 bg-[#141b2d] rounded-xl border border-[#1e2535] text-xs">
                  <div>
                    <div className="font-semibold text-slate-200">{div.fonte}</div>
                    <div className="text-[10px] text-slate-400 font-mono">Cód {div.tipo} · {div.cnpj}</div>
                  </div>
                  <div className="font-mono text-emerald-400 font-bold">
                    {formatCurrency(div.valor, 'R$')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#101626] border border-[#1e2535] rounded-2xl p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-slate-100 mb-2">
              4 · JCP — Tributação Exclusiva (Cód. 10)
            </h3>
            {latestInforme.jcp.length > 0 ? (
              <div className="space-y-2">
                {latestInforme.jcp.map((jcp, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-[#141b2d] rounded-xl border border-[#1e2535] text-xs">
                    <div>
                      <div className="font-semibold text-slate-200">{jcp.fonte}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{jcp.cnpj}</div>
                    </div>
                    <div className="font-mono text-amber-400 font-bold">
                      {formatCurrency(jcp.valor, 'R$')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-4">Nenhum JCP registrado no informe.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
