import * as pdfjsLib from 'pdfjs-dist';
import { Operation, NomadTrade, NomadDividend, ExtratoMensalData, InformeData } from '../types';

// Set up worker
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
} catch (e) {
  // worker fallback
}

function parseBrNum(str: string | undefined): number {
  if (!str) return 0;
  let s = str.trim();
  const isNeg = s.startsWith('(') && s.endsWith(')');
  s = s.replace(/[()]/g, '').replace(/\./g, '').replace(',', '.').trim();
  const val = parseFloat(s);
  if (isNaN(val)) return 0;
  return isNeg ? -val : val;
}

function parseUsNum(str: string | undefined): number {
  if (!str) return 0;
  const s = str.replace(/,/g, '').trim();
  const val = parseFloat(s);
  return isNaN(val) ? 0 : val;
}

const _MERCADOS = new Set([
  'Ações', 'Açoes', 'ETF', 'BDR', 'FII', 'Opções', 'Opçoes',
  'Fundos Imobiliários', 'Fundos Imobiliarios', 'Fiagro', 'Termo'
]);

const _COL_X = [
  ['data', 0, 55],
  ['mov', 55, 170],
  ['op_qtd', 170, 225],
  ['op_preco', 225, 276],
  ['op_valor', 276, 311],
  ['cu_preco', 311, 366],
  ['cu_valor', 366, 405],
  ['abertura', 405, 465],
  ['baixa', 465, 511],
  ['sa_qtd', 511, 566],
  ['sa_preco', 566, 621],
  ['sa_valor', 621, 658],
  ['daytrade', 658, 716],
  ['normal', 716, 776],
  ['outros', 776, 860],
] as const;

function getColName(x: number) {
  for (const [name, a, b] of _COL_X) {
    if (x >= a && x < b) return name;
  }
  return null;
}

export interface ParsedPdfResult {
  fileType: 'B3_OPS' | 'NOMAD_STMT' | 'EXTRATO_IR' | 'INFORME_IR' | 'UNKNOWN';
  fileName: string;
  b3Ops?: Operation[];
  nomadTrades?: NomadTrade[];
  nomadDivs?: NomadDividend[];
  extratos?: Record<string, ExtratoMensalData>;
  informe?: InformeData;
}

export async function parsePdfFile(file: File): Promise<ParsedPdfResult> {
  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);
  const doc = await pdfjsLib.getDocument({ data }).promise;

  // Read header from first page
  const page1 = await doc.getPage(1);
  const text1 = await page1.getTextContent();
  const fullText1 = text1.items.map((i: any) => i.str).join(' ');

  const isNomad = fullText1.includes('Nomad Investment Services') || fullText1.includes('TRADING ACTIVITIES');
  const isExtrato = fullText1.includes('Extrato Mensal de Resultados');
  const isInforme = fullText1.includes('Informe de Rendimentos para Declaração');
  const isMyCapitalOps = fullText1.includes('Operações no mês') || fullText1.includes('Resultado no mês');

  if (isNomad) {
    const trades: NomadTrade[] = [];
    const dividendos: NomadDividend[] = [];
    const capacitySet = new Set(['AGENCY', 'PRINCIPAL']);

    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const lines: Record<number, { str: string; x: number }[]> = {};

      content.items.forEach((it: any) => {
        if (!it.str.trim()) return;
        const y = Math.round(it.transform[5]);
        if (!lines[y]) lines[y] = [];
        lines[y].push({ str: it.str, x: it.transform[4] });
      });

      for (const y of Object.keys(lines).sort((a, b) => Number(b) - Number(a))) {
        const items = lines[Number(y)].sort((a, b) => a.x - b.x);
        const text = items.map(i => i.str).join(' ').trim();
        const tk = text.split(/\s+/);

        if (tk.length >= 9 && (tk[0] === 'BUY' || tk[0] === 'SELL') && capacitySet.has(tk[tk.length - 1])) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(tk[1]) || !/^\d{4}-\d{2}-\d{2}$/.test(tk[2])) continue;

          const symbol = tk[tk.length - 8];
          const qty = parseUsNum(tk[tk.length - 7]);
          const price = parseUsNum(tk[tk.length - 6]);
          const net = parseUsNum(tk[tk.length - 5]);
          const comm = parseUsNum(tk[tk.length - 4]) || 0;
          const nome = tk.slice(3, tk.length - 8).join(' ');

          if (qty && price) {
            trades.push({
              lado: tk[0] as 'BUY' | 'SELL',
              trade_date: tk[1],
              settle_date: tk[2],
              symbol,
              nome,
              quantidade: Math.abs(qty),
              preco: price,
              valor: net !== 0 ? Math.abs(net) : Math.abs(qty) * price,
              comissao: comm,
            });
          }
        } else if (tk.length >= 6 && tk[1] === 'CASH_DIVIDEND' && /^\d{4}-\d{2}-\d{2}$/.test(tk[0])) {
          const valor = parseUsNum(tk[tk.length - 2]);
          let symbol = '';
          for (let i = tk.length - 3; i >= 0; i--) {
            if (/^[A-Z]{1,6}$/.test(tk[i])) {
              symbol = tk[i];
              break;
            }
          }
          if (valor > 0) {
            dividendos.push({ data: tk[0], symbol, valor });
          }
        }
      }
    }
    return {
      fileType: 'NOMAD_STMT',
      fileName: file.name,
      nomadTrades: trades,
      nomadDivs: dividendos,
    };
  }

  if (isExtrato) {
    const _MESES_NUM: Record<string, number> = {
      Janeiro: 1, Fevereiro: 2, Março: 3, Marco: 3, Abril: 4,
      Maio: 5, Junho: 6, Julho: 7, Agosto: 8, Setembro: 9,
      Outubro: 10, Novembro: 11, Dezembro: 12,
    };
    const _EXTRATO_ROWS: Record<string, string> = {
      'Alienações': 'alienacoes',
      '01-Mercado': 'res_acoes',
      '14-RESULTADO': 'res_liquido',
      '15-Resultado': 'neg_anterior',
      '17-Prejuízo': 'prej_compensar',
      '19-IMPOSTO': 'imp_devido',
      '25-Imposto': 'imp_pagar',
    };
    const numre = /^\(?[\d.]+,\d{2}\)?$/;
    let ano = '';
    const dados: Record<string, ExtratoMensalData> = {};

    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const ws = content.items.map((it: any) => ({
        text: it.str.trim(),
        y: it.transform[4],
        x: it.transform[5],
      })).filter((w: any) => w.text);

      if (!ano) {
        const full = ws.map((w: any) => w.text).join(' ');
        const ma = full.match(/Ano:\s*(\d{4})/);
        if (ma) ano = ma[1];
      }

      const comuns = ws.filter((w: any) => w.text === 'Comuns' && Math.abs(w.y - 91.68) < 5).map((w: any) => w.x).sort((a: number, b: number) => a - b);
      const dts = ws.filter((w: any) => w.text === 'Day Trade' && Math.abs(w.y - 91.68) < 5).map((w: any) => w.x).sort((a: number, b: number) => a - b);
      const meses = ws.filter((w: any) => _MESES_NUM[w.text] && Math.abs(w.y - 78.57) < 5).map((w: any) => ({ text: w.text, x: w.x })).sort((a: any, b: any) => a.x - b.x);

      const cols: { mes: string; tipo: 'c' | 'd'; x: number }[] = [];
      const n = Math.min(comuns.length, dts.length, meses.length);
      for (let i = 0; i < n; i++) {
        cols.push({ mes: meses[i].text, tipo: 'c', x: comuns[i] });
        cols.push({ mes: meses[i].text, tipo: 'd', x: dts[i] });
      }

      const rowtops: Record<string, number> = {};
      for (const w of ws) {
        for (const [pref, key] of Object.entries(_EXTRATO_ROWS)) {
          if (w.text.startsWith(pref) && !rowtops[key]) {
            rowtops[key] = w.y;
          }
        }
      }

      for (const w of ws) {
        if (!numre.test(w.text)) continue;
        let bestKey: string | null = null;
        let bestDistY = 999;
        for (const [k, y] of Object.entries(rowtops)) {
          const dist = Math.abs(y - w.y);
          if (dist < bestDistY) {
            bestDistY = dist;
            bestKey = k;
          }
        }
        if (bestDistY > 4 || !bestKey) continue;

        let bestCol: { mes: string; tipo: 'c' | 'd'; x: number } | null = null;
        let bestDistX = 999;
        for (const col of cols) {
          const dist = Math.abs(col.x - w.x);
          if (dist < bestDistX) {
            bestDistX = dist;
            bestCol = col;
          }
        }
        if (bestDistX > 45 || !bestCol || !ano) continue;

        const mNum = String(_MESES_NUM[bestCol.mes]).padStart(2, '0');
        const periodo = `${ano}-${mNum}`;
        if (!dados[periodo]) dados[periodo] = {};
        const val = parseBrNum(w.text);
        if (bestKey === 'alienacoes') {
          dados[periodo].alienacoes = val;
        } else {
          (dados[periodo] as any)[`${bestKey}_${bestCol.tipo}`] = val;
        }
      }
    }

    return {
      fileType: 'EXTRATO_IR',
      fileName: file.name,
      extratos: dados,
    };
  }

  if (isInforme) {
    let ano = '';
    const bens: any[] = [];
    const dividendos: any[] = [];
    const jcp: any[] = [];
    let ir_retido = 0;
    let secao: 'bd' | 'jcp' | null = null;
    let cur: any = null;

    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const lines: Record<number, { str: string; x: number }[]> = {};

      content.items.forEach((it: any) => {
        if (!it.str.trim()) return;
        const y = page.rotate === 90 ? it.transform[4] : page.getViewport({ scale: 1 }).height - it.transform[5];
        const x = page.rotate === 90 ? it.transform[5] : it.transform[4];
        const roundedY = Math.round(y / 3) * 3;
        if (!lines[roundedY]) lines[roundedY] = [];
        lines[roundedY].push({ str: it.str, x });
      });

      for (const y of Object.keys(lines).sort((a, b) => Number(a) - Number(b))) {
        const items = lines[Number(y)].sort((a, b) => a.x - b.x);
        const s = items.map(i => i.str).join(' ').trim();
        if (!s) continue;

        if (!ano) {
          const ma = s.match(/[Aa]no[- ]calendário de (\d{4})/);
          if (ma) ano = ma[1];
        }

        if (s.startsWith('Mercado Grupo Código')) {
          secao = 'bd';
          cur = null;
          continue;
        }

        if (s.includes('Juros Sobre o Capital') || s.includes('Juros Sobre Capital')) {
          secao = 'jcp';
          cur = null;
          continue;
        }

        if (s.includes('IR Retido na Fonte') && s.includes('11.033')) {
          const m = s.match(/R\$\s*([\d.]+,\d{2})/);
          if (m) ir_retido = parseBrNum(m[1]);
        }

        const mdiv = s.match(/^(09|18|20)-/);
        if (mdiv) {
          const tipo = mdiv[1];
          const mv = s.match(/[\d.]+,\d{2}/g);
          const val = mv ? parseBrNum(mv[mv.length - 1]) : 0;
          const mc = s.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
          const cnpj = mc ? mc[0] : '';
          let fonte = s.slice(mdiv[0].length).trim();
          if (cnpj) fonte = fonte.split(cnpj)[0].trim();
          dividendos.push({ tipo, fonte, cnpj, valor: val });
          continue;
        }

        if (secao === 'bd') {
          if (s.startsWith('Total:')) {
            secao = null;
            cur = null;
            continue;
          }
          const tk = s.split(/\s+/);
          if (tk[0] === 'Vista' && tk.length >= 6 && /^\d+$/.test(tk[1])) {
            const v_ant = parseBrNum(tk[tk.length - 2]);
            const v_atual = parseBrNum(tk[tk.length - 1]);
            const cnpj = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(tk[4]) ? tk[4] : '';
            const i0 = cnpj ? 5 : 4;
            const disc = tk.slice(i0, tk.length - 2).join(' ');
            cur = {
              mercado: tk[0],
              grupo: tk[1],
              codigo: tk[2],
              ticker: tk[3],
              cnpj,
              discriminacao: disc,
              v_ant,
              v_atual,
            };
            bens.push(cur);
          } else if (cur !== null) {
            cur.discriminacao = (cur.discriminacao + ' ' + s).trim();
          }
        } else if (secao === 'jcp') {
          const mj = s.match(/^(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\s+(.+?)\s+([\d.]+,\d{2})$/);
          if (mj) {
            jcp.push({
              cnpj: mj[1],
              fonte: mj[2].trim(),
              valor: parseBrNum(mj[3]),
            });
          } else if (s.startsWith('Total') || s.includes('ATENÇÃO')) {
            secao = null;
          }
        }
      }
    }

    return {
      fileType: 'INFORME_IR',
      fileName: file.name,
      informe: {
        ano: ano || '2025',
        bens_direitos: bens,
        dividendos,
        jcp,
        ir_retido,
      },
    };
  }

  // Otherwise, default to MyCapital operations
  const ops: Operation[] = [];
  let periodo: string | null = null;
  let mercadoAtual: string | null = null;
  let tickerAtual: string | null = null;

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const lines: Record<number, { str: string; x: number }[]> = {};

    content.items.forEach((it: any) => {
      if (!it.str.trim()) return;
      const visualY = page.rotate === 90 ? it.transform[4] : page.getViewport({ scale: 1 }).height - it.transform[5];
      const visualX = page.rotate === 90 ? it.transform[5] : it.transform[4];
      const roundedY = Math.round(visualY / 3) * 3;
      if (!lines[roundedY]) lines[roundedY] = [];
      lines[roundedY].push({ str: it.str, x: visualX });
    });

    for (const y of Object.keys(lines).sort((a, b) => Number(a) - Number(b))) {
      const items = lines[Number(y)].sort((a, b) => a.x - b.x);
      const text = items.map(i => i.str).join(' ').trim();

      if (!periodo) {
        const mp = text.match(/de\s+\d{2}\/(\d{2})\/(\d{4})\s+at[ée]/);
        if (mp) periodo = `${mp[2]}-${mp[1]}`;
      }

      if (_MERCADOS.has(text)) {
        mercadoAtual = text;
        continue;
      }

      const matchAtivo = text.match(/^([A-Z0-9]{4,6})\s+[A-Z0-9]{2,6}$/);
      if (matchAtivo && !text.startsWith('Total') && !text.startsWith('Data') && !text.startsWith('Mercado')) {
        tickerAtual = matchAtivo[1];
        continue;
      }

      const cells: Record<string, string> = {};
      items.forEach(it => {
        const col = getColName(it.x);
        if (col) {
          cells[col] = (cells[col] ? cells[col] + ' ' : '') + it.str;
        }
      });

      const dataStr = cells['data']?.trim();
      if (!dataStr || !/^\d{2}\/\d{2}\/\d{2}$/.test(dataStr)) continue;
      if (text.includes('Saldo Anterior')) continue;

      const mov = cells['mov']?.trim() || '';
      const isDayTrade = mov.includes('DayTrade');
      const op_qtd = parseBrNum(cells['op_qtd']);
      const op_preco = parseBrNum(cells['op_preco']);
      let op_valor = parseBrNum(cells['op_valor']);
      if (!op_valor && op_qtd && op_preco) op_valor = op_qtd * op_preco;

      const res_daytrade = parseBrNum(cells['daytrade']);
      const res_normal = parseBrNum(cells['normal']);
      const res_outros = parseBrNum(cells['outros']);

      ops.push({
        id: Date.now() + Math.random(),
        periodo: periodo || '2026-01',
        mercado: mercadoAtual || 'Ações',
        ticker: tickerAtual || 'ATIVO',
        data: dataStr,
        tipo: mov,
        daytrade: isDayTrade ? 1 : 0,
        quantidade: Math.abs(op_qtd),
        preco: op_preco,
        valor: Math.abs(op_valor),
        res_daytrade,
        res_normal,
        res_outros,
        arquivo: file.name,
      });
    }
  }

  return {
    fileType: isMyCapitalOps || ops.length > 0 ? 'B3_OPS' : 'UNKNOWN',
    fileName: file.name,
    b3Ops: ops,
  };
}
