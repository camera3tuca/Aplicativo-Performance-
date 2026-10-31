export type BrokerType = 'B3' | 'Nomad';

export interface Operation {
  id: number;
  periodo: string; // YYYY-MM
  mercado: string;
  ticker: string;
  data: string; // DD/MM/YY
  tipo: string; // Compra, Venda, Compra DayTrade, Venda DayTrade, Dividendo
  daytrade: number; // 1 or 0
  quantidade: number;
  preco: number;
  valor: number;
  res_daytrade: number;
  res_normal: number;
  res_outros: number;
  arquivo?: string;
  _iso?: string; // YYYY-MM-DD
  _venda_bruta?: number;
  _comissao?: number;
  _sell_date?: string;
  _lotes?: [string, number, number][]; // [data_aquisicao, qtd, custo_usd]
}

export interface NomadTrade {
  lado: 'BUY' | 'SELL';
  trade_date: string;
  settle_date: string;
  symbol: string;
  nome: string;
  quantidade: number;
  preco: number;
  valor: number;
  comissao: number;
}

export interface NomadDividend {
  data: string;
  symbol: string;
  valor: number;
}

export interface NomadPosition {
  symbol: string;
  nome: string;
  quantidade: number;
  custo_total: number;
  custo_medio: number;
  lotes: [string, number, number][];
}

export interface ExtratoMensalData {
  res_acoes_c?: number;
  res_acoes_d?: number;
  res_liquido_c?: number;
  res_liquido_d?: number;
  neg_anterior_c?: number;
  neg_anterior_d?: number;
  prej_compensar_c?: number;
  prej_compensar_d?: number;
  alienacoes?: number;
  imp_devido_c?: number;
  imp_devido_d?: number;
  imp_pagar_c?: number;
  imp_pagar_d?: number;
}

export interface BemDireito {
  mercado: string;
  grupo: string;
  codigo: string;
  ticker: string;
  cnpj: string;
  discriminacao: string;
  v_ant: number;
  v_atual: number;
}

export interface DividendoInforme {
  tipo: string;
  fonte: string;
  cnpj: string;
  valor: number;
}

export interface JCPInforme {
  cnpj: string;
  fonte: string;
  valor: number;
}

export interface InformeData {
  ano: string;
  bens_direitos: BemDireito[];
  dividendos: DividendoInforme[];
  jcp: JCPInforme[];
  ir_retido: number;
}

export interface MonthlySummary {
  periodo: string;
  normal: number;
  daytrade: number;
  outros: number;
  total: number;
  acumulado: number;
}

export interface AssetSummary {
  ticker: string;
  mercado: string;
  normal: number;
  daytrade: number;
  outros: number;
  total: number;
  operacoes: number;
}

export interface MarketSummary {
  mercado: string;
  normal: number;
  daytrade: number;
  outros: number;
  total: number;
  operacoes: number;
  volume: number;
}

export interface TradingMetrics {
  trades: number;
  win_rate: number;
  ganhos: number;
  perdas: number;
  payoff: number | null;
  fator_lucro: number | null;
  media_ganho: number;
  media_perda: number;
  maior_ganho: number;
  maior_perda: number;
  expectativa: number;
  max_drawdown: number;
  melhor_sequencia: number;
  pior_sequencia: number;
  tempo_medio_swing: number;
  mais_longa_dias: number;
  fechadas_le1_dia: number;
}

export interface PtaxRates {
  [dateIso: string]: {
    compra: number;
    venda: number;
  };
}

export interface InitialDataset {
  b3Ops: Operation[];
  nomadOps: Operation[];
  nomadTrades: NomadTrade[];
  nomadDivs: NomadDividend[];
  nomadPosicoes: NomadPosition[];
  extratosIr: Record<string, ExtratoMensalData>;
  informes: Record<string, InformeData>;
  ptaxCache: PtaxRates;
  processedFiles: { nome: string; tipo: string; processadoEm: string }[];
}
