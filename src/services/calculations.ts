import { Operation, MonthlySummary, AssetSummary, MarketSummary, TradingMetrics } from '../types';

export function formatCurrency(value: number | undefined | null, currency: 'R$' | 'US$' = 'R$'): string {
  if (value === undefined || value === null || isNaN(value)) return `${currency} 0,00`;
  const absVal = Math.abs(value);
  const formatted = absVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (value < 0) {
    return `- ${currency} ${formatted}`;
  }
  return `${currency} ${formatted}`;
}

export function formatKpi(value: number | undefined | null, currency: 'R$' | 'US$' = 'R$'): string {
  if (value === undefined || value === null || isNaN(value)) return `${currency} 0,00`;
  const absVal = Math.abs(value);
  const formatted = absVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return value >= 0 ? `${currency} ${formatted}` : `- ${currency} ${formatted}`;
}

export function formatPercent(value: number, sign = true): string {
  if (isNaN(value)) return '0,0%';
  const prefix = sign && value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(1).replace('.', ',')}%`;
}

export function parseDateBR(dateStr: string): Date | null {
  // DD/MM/YY or DD/MM/YYYY
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  let year = parseInt(parts[2], 10);
  if (year < 100) year += 2000;
  return new Date(year, month, day);
}

export function calculateMonthlySummary(ops: Operation[]): MonthlySummary[] {
  if (!ops.length) return [];
  const map: Record<string, { normal: number; daytrade: number; outros: number }> = {};

  for (const op of ops) {
    const p = op.periodo || 'Indefinido';
    if (!map[p]) map[p] = { normal: 0, daytrade: 0, outros: 0 };
    map[p].normal += op.res_normal || 0;
    map[p].daytrade += op.res_daytrade || 0;
    map[p].outros += op.res_outros || 0;
  }

  const sortedPeriods = Object.keys(map).sort();
  let acum = 0;
  const result: MonthlySummary[] = [];

  for (const p of sortedPeriods) {
    const m = map[p];
    const normal = Math.round(m.normal * 100) / 100;
    const daytrade = Math.round(m.daytrade * 100) / 100;
    const outros = Math.round(m.outros * 100) / 100;
    const total = Math.round((normal + daytrade + outros) * 100) / 100;
    acum = Math.round((acum + total) * 100) / 100;
    result.push({
      periodo: p,
      normal,
      daytrade,
      outros,
      total,
      acumulado: acum,
    });
  }

  return result;
}

export function calculateAssetSummary(ops: Operation[]): AssetSummary[] {
  if (!ops.length) return [];
  const map: Record<string, { ticker: string; mercado: string; normal: number; daytrade: number; outros: number; count: number }> = {};

  for (const op of ops) {
    const key = `${op.ticker}_${op.mercado || 'Outros'}`;
    if (!map[key]) {
      map[key] = {
        ticker: op.ticker || 'N/A',
        mercado: op.mercado || 'Geral',
        normal: 0,
        daytrade: 0,
        outros: 0,
        count: 0,
      };
    }
    map[key].normal += op.res_normal || 0;
    map[key].daytrade += op.res_daytrade || 0;
    map[key].outros += op.res_outros || 0;
    map[key].count += 1;
  }

  const items: AssetSummary[] = Object.values(map).map(m => {
    const normal = Math.round(m.normal * 100) / 100;
    const daytrade = Math.round(m.daytrade * 100) / 100;
    const outros = Math.round(m.outros * 100) / 100;
    const total = Math.round((normal + daytrade + outros) * 100) / 100;
    return {
      ticker: m.ticker,
      mercado: m.mercado,
      normal,
      daytrade,
      outros,
      total,
      operacoes: m.count,
    };
  });

  return items.sort((a, b) => b.total - a.total);
}

export function calculateMarketSummary(ops: Operation[]): MarketSummary[] {
  if (!ops.length) return [];
  const map: Record<string, { mercado: string; normal: number; daytrade: number; outros: number; volume: number; count: number }> = {};

  for (const op of ops) {
    const m = op.mercado || 'Outros';
    if (!map[m]) {
      map[m] = { mercado: m, normal: 0, daytrade: 0, outros: 0, volume: 0, count: 0 };
    }
    map[m].normal += op.res_normal || 0;
    map[m].daytrade += op.res_daytrade || 0;
    map[m].outros += op.res_outros || 0;
    map[m].volume += op.valor || 0;
    map[m].count += 1;
  }

  return Object.values(map)
    .map(m => ({
      mercado: m.mercado,
      normal: Math.round(m.normal * 100) / 100,
      daytrade: Math.round(m.daytrade * 100) / 100,
      outros: Math.round(m.outros * 100) / 100,
      total: Math.round((m.normal + m.daytrade + m.outros) * 100) / 100,
      volume: Math.round(m.volume * 100) / 100,
      operacoes: m.count,
    }))
    .sort((a, b) => b.total - a.total);
}

export function calculateVolumeMonthly(ops: Operation[]) {
  const map: Record<string, { periodo: string; volume: number; compras: number; vendas: number; ops: number }> = {};

  for (const op of ops) {
    const p = op.periodo || 'Indefinido';
    if (!map[p]) map[p] = { periodo: p, volume: 0, compras: 0, vendas: 0, ops: 0 };
    const val = op.valor || 0;
    map[p].volume += val;
    map[p].ops += 1;
    if (op.tipo?.startsWith('Compra')) {
      map[p].compras += val;
    } else if (op.tipo?.startsWith('Venda')) {
      map[p].vendas += val;
    }
  }

  return Object.values(map).sort((a, b) => a.periodo.localeCompare(b.periodo));
}

export function calculateDayOfWeekSummary(ops: Operation[]) {
  const days = [
    { dow: 1, dia: 'Seg', resultado: 0, volume: 0, ops: 0 },
    { dow: 2, dia: 'Ter', resultado: 0, volume: 0, ops: 0 },
    { dow: 3, dia: 'Qua', resultado: 0, volume: 0, ops: 0 },
    { dow: 4, dia: 'Qui', resultado: 0, volume: 0, ops: 0 },
    { dow: 5, dia: 'Sex', resultado: 0, volume: 0, ops: 0 },
  ];

  for (const op of ops) {
    const d = parseDateBR(op.data);
    if (!d) continue;
    const dow = d.getDay(); // 0 is Sunday, 1 is Monday ... 5 is Friday
    const target = days.find(x => x.dow === dow);
    if (target) {
      target.resultado += (op.res_normal || 0) + (op.res_daytrade || 0);
      target.volume += op.valor || 0;
      target.ops += 1;
    }
  }

  return days.map(d => ({
    ...d,
    resultado: Math.round(d.resultado * 100) / 100,
    volume: Math.round(d.volume * 100) / 100,
  }));
}

export function calculateMetrics(ops: Operation[]): TradingMetrics {
  // Closed trades are lines that realized results: res_normal != 0 or res_daytrade != 0
  const closed = ops.filter(o => (o.res_normal !== 0 || o.res_daytrade !== 0));
  if (!closed.length) {
    return {
      trades: 0,
      win_rate: 0,
      ganhos: 0,
      perdas: 0,
      payoff: null,
      fator_lucro: null,
      media_ganho: 0,
      media_perda: 0,
      maior_ganho: 0,
      maior_perda: 0,
      expectativa: 0,
      max_drawdown: 0,
      melhor_sequencia: 0,
      pior_sequencia: 0,
      tempo_medio_swing: 0,
      mais_longa_dias: 0,
      fechadas_le1_dia: 0,
    };
  }

  const results = closed.map(o => (o.res_normal || 0) + (o.res_daytrade || 0));
  const ganhos = results.filter(r => r > 0);
  const perdas = results.filter(r => r < 0);

  const somaGanhos = ganhos.reduce((a, b) => a + b, 0);
  const somaPerdasAbs = Math.abs(perdas.reduce((a, b) => a + b, 0));

  const win_rate = results.length ? (ganhos.length / results.length) * 100 : 0;
  const media_ganho = ganhos.length ? somaGanhos / ganhos.length : 0;
  const media_perda = perdas.length ? -somaPerdasAbs / perdas.length : 0;
  const payoff = ganhos.length && perdas.length ? media_ganho / Math.abs(media_perda) : null;
  const fator_lucro = somaPerdasAbs > 0 ? somaGanhos / somaPerdasAbs : null;
  const maior_ganho = results.length ? Math.max(...results) : 0;
  const maior_perda = results.length ? Math.min(...results) : 0;
  const expectativa = results.length ? results.reduce((a, b) => a + b, 0) / results.length : 0;

  // Max Drawdown on monthly accumulation
  const monthly = calculateMonthlySummary(ops);
  let pico = -Infinity;
  let max_drawdown = 0;
  for (const m of monthly) {
    pico = Math.max(pico, m.acumulado);
    max_drawdown = Math.min(max_drawdown, m.acumulado - pico);
  }

  // Sequences
  let melhor_seq = 0;
  let pior_seq = 0;
  let cur_w = 0;
  let cur_l = 0;
  for (const r of results) {
    if (r > 0) {
      cur_w++;
      cur_l = 0;
    } else if (r < 0) {
      cur_l++;
      cur_w = 0;
    } else {
      cur_w = 0;
      cur_l = 0;
    }
    melhor_seq = Math.max(melhor_seq, cur_w);
    pior_seq = Math.max(pior_seq, cur_l);
  }

  // Swing holding time via FIFO
  const swingOps = ops.filter(o => o.daytrade === 0);
  const filas: Record<string, { date: Date; q: number }[]> = {};
  let totalDias = 0;
  let totalQtd = 0;
  let maisLonga = 0;
  let curtas = 0;

  for (const op of swingOps) {
    const d = parseDateBR(op.data);
    if (!d) continue;
    const ticker = op.ticker;
    if (!filas[ticker]) filas[ticker] = [];
    const q = Math.abs(op.quantidade || 0);
    if (q <= 0) continue;

    if (op.tipo?.startsWith('Compra')) {
      filas[ticker].push({ date: d, q });
    } else if (op.tipo?.startsWith('Venda')) {
      let rem = q;
      while (rem > 0 && filas[ticker].length > 0) {
        const head = filas[ticker][0];
        const m = Math.min(rem, head.q);
        const diffDays = Math.max(0, Math.round((d.getTime() - head.date.getTime()) / (1000 * 60 * 60 * 24)));
        totalDias += m * diffDays;
        totalQtd += m;
        maisLonga = Math.max(maisLonga, diffDays);
        if (diffDays <= 1) curtas++;
        head.q -= m;
        rem -= m;
        if (head.q <= 1e-9) filas[ticker].shift();
      }
    }
  }

  const tempo_medio_swing = totalQtd > 0 ? totalDias / totalQtd : 0;

  return {
    trades: closed.length,
    win_rate,
    ganhos: ganhos.length,
    perdas: perdas.length,
    payoff,
    fator_lucro,
    media_ganho,
    media_perda,
    maior_ganho,
    maior_perda,
    expectativa,
    max_drawdown,
    melhor_sequencia: melhor_seq,
    pior_sequencia: pior_seq,
    tempo_medio_swing,
    mais_longa_dias: maisLonga,
    fechadas_le1_dia: curtas,
  };
}

export function calculateEstimatedIR(monthly: MonthlySummary[]) {
  const ALIQ_SWING = 0.15;
  const ALIQ_DT = 0.20;
  const DARF_MINIMO = 10.0;

  let prej_sw = 0;
  let prej_dt = 0;
  const rows: {
    periodo: string;
    normal: number;
    daytrade: number;
    darf_swing: number;
    darf_dt: number;
    darf: number;
    abaixo_minimo: boolean;
    prej_swing_acum: number;
    prej_dt_acum: number;
  }[] = [];

  for (const r of monthly) {
    let darf_sw = 0;
    let darf_dt = 0;

    // Swing
    if (r.normal < 0) {
      prej_sw += -r.normal;
    } else {
      const comp = Math.min(prej_sw, r.normal);
      prej_sw -= comp;
      const trib_sw = r.normal - comp;
      darf_sw = trib_sw * ALIQ_SWING;
    }

    // Day Trade
    if (r.daytrade < 0) {
      prej_dt += -r.daytrade;
    } else {
      const comp = Math.min(prej_dt, r.daytrade);
      prej_dt -= comp;
      const trib_dt = r.daytrade - comp;
      darf_dt = trib_dt * ALIQ_DT;
    }

    const darf = darf_sw + darf_dt;
    rows.push({
      periodo: r.periodo,
      normal: r.normal,
      daytrade: r.daytrade,
      darf_swing: Math.round(darf_sw * 100) / 100,
      darf_dt: Math.round(darf_dt * 100) / 100,
      darf: Math.round(darf * 100) / 100,
      abaixo_minimo: darf > 0 && darf < DARF_MINIMO,
      prej_swing_acum: Math.round(prej_sw * 100) / 100,
      prej_dt_acum: Math.round(prej_dt * 100) / 100,
    });
  }

  return rows;
}
