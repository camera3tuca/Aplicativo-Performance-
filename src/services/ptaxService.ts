import { PtaxRates } from '../types';

const BASE_BCB = 'https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata';

function formatBcbDate(iso: string): string {
  // YYYY-MM-DD -> MM-DD-YYYY
  const [y, m, d] = iso.split('-');
  return `${m}-${d}-${y}`;
}

export async function fetchPtaxFromBcb(dates: string[], initialCache: PtaxRates = {}): Promise<PtaxRates> {
  const result: PtaxRates = { ...initialCache };
  const missing = dates.filter(d => !result[d]);

  if (missing.length === 0) {
    return result;
  }

  try {
    const sorted = [...missing].sort();
    const minDate = new Date(sorted[0]);
    // Subtract 10 days to cover holidays and weekends
    minDate.setDate(minDate.getDate() - 10);
    const iniIso = minDate.toISOString().slice(0, 10);
    const fimIso = sorted[sorted.length - 1];

    const url = `${BASE_BCB}/CotacaoDolarPeriodo(dataInicial=@i,dataFinalCotacao=@f)?@i='${formatBcbDate(iniIso)}'&@f='${formatBcbDate(fimIso)}'&$format=json&$select=cotacaoCompra,cotacaoVenda,dataHoraCotacao`;

    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    const items = (json.value || []).sort((a: any, b: any) => a.dataHoraCotacao.localeCompare(b.dataHoraCotacao));

    const serie = items.map((it: any) => ({
      date: it.dataHoraCotacao.slice(0, 10),
      compra: parseFloat(it.cotacaoCompra),
      venda: parseFloat(it.cotacaoVenda),
    }));

    for (const d of missing) {
      let par = null;
      for (const s of serie) {
        if (s.date <= d) {
          par = { compra: s.compra, venda: s.venda };
        } else {
          break;
        }
      }
      if (par) {
        result[d] = par;
      }
    }
  } catch (err) {
    console.warn('Falha ao buscar PTAX online do BCB, usando cotações locais:', err);
  }

  return result;
}
