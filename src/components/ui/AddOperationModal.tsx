import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, PlusCircle } from 'lucide-react';

interface AddOperationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddOperationModal: React.FC<AddOperationModalProps> = ({ isOpen, onClose }) => {
  const { broker, addOperation } = useApp();

  const [ticker, setTicker] = useState('');
  const [dataStr, setDataStr] = useState(() => {
    const today = new Date();
    const d = String(today.getDate()).padStart(2, '0');
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const y = String(today.getFullYear()).slice(2);
    return `${d}/${m}/${y}`;
  });
  const [mercado, setMercado] = useState(broker === 'B3' ? 'Ações' : 'Ações EUA');
  const [tipo, setTipo] = useState<'Compra' | 'Venda' | 'Compra DayTrade' | 'Venda DayTrade' | 'Dividendo'>('Compra');
  const [quantidade, setQuantidade] = useState('10');
  const [preco, setPreco] = useState('25.50');
  const [resultado, setResultado] = useState('0.00');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = parseFloat(quantidade) || 0;
    const p = parseFloat(preco) || 0;
    const res = parseFloat(resultado) || 0;
    const isDt = tipo.includes('DayTrade') ? 1 : 0;
    const isDiv = tipo === 'Dividendo';

    // Parse period YYYY-MM
    let periodo = '2026-10';
    if (dataStr.includes('/')) {
      const parts = dataStr.split('/');
      if (parts.length === 3) {
        let year = parseInt(parts[2], 10);
        if (year < 100) year += 2000;
        periodo = `${year}-${parts[1].padStart(2, '0')}`;
      }
    }

    addOperation({
      periodo,
      mercado,
      ticker: ticker.toUpperCase().trim() || 'ATIVO',
      data: dataStr,
      tipo,
      daytrade: isDt,
      quantidade: q,
      preco: p,
      valor: q * p,
      res_daytrade: isDt ? res : 0,
      res_normal: !isDt && !isDiv ? res : 0,
      res_outros: isDiv ? res : 0,
      arquivo: 'Lançamento Manual',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#131a2a] border border-[#243049] rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-[#1e2535]">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">
              Nova Operação ({broker === 'B3' ? 'B3 · Brasil' : 'Nomad · EUA'})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Ticker / Código
              </label>
              <input
                type="text"
                required
                placeholder={broker === 'B3' ? 'Ex: PETR4, AAPL34' : 'Ex: AAPL, NVDA'}
                value={ticker}
                onChange={e => setTicker(e.target.value)}
                className="w-full bg-[#1a2236] border border-[#2a3548] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Data (DD/MM/AA)
              </label>
              <input
                type="text"
                required
                placeholder="Ex: 31/10/26"
                value={dataStr}
                onChange={e => setDataStr(e.target.value)}
                className="w-full bg-[#1a2236] border border-[#2a3548] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Mercado
              </label>
              <select
                value={mercado}
                onChange={e => setMercado(e.target.value)}
                className="w-full bg-[#1a2236] border border-[#2a3548] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                {broker === 'B3' ? (
                  <>
                    <option value="Ações">Ações</option>
                    <option value="BDR">BDR</option>
                    <option value="FII">FII (Fundos Imobiliários)</option>
                    <option value="ETF">ETF</option>
                    <option value="Opções">Opções</option>
                    <option value="Termo">Termo</option>
                  </>
                ) : (
                  <>
                    <option value="Ações EUA">Ações EUA</option>
                    <option value="ETF EUA">ETF EUA</option>
                    <option value="ADR">ADR</option>
                  </>
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Tipo de Operação
              </label>
              <select
                value={tipo}
                onChange={e => setTipo(e.target.value as any)}
                className="w-full bg-[#1a2236] border border-[#2a3548] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="Compra">Compra (Swing)</option>
                <option value="Venda">Venda (Swing)</option>
                <option value="Compra DayTrade">Compra Day Trade</option>
                <option value="Venda DayTrade">Venda Day Trade</option>
                <option value="Dividendo">Provento / Dividendo</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Quantidade
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={quantidade}
                onChange={e => setQuantidade(e.target.value)}
                className="w-full bg-[#1a2236] border border-[#2a3548] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Preço ({broker === 'B3' ? 'R$' : 'US$'})
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={preco}
                onChange={e => setPreco(e.target.value)}
                className="w-full bg-[#1a2236] border border-[#2a3548] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Resultado ({broker === 'B3' ? 'R$' : 'US$'})
              </label>
              <input
                type="number"
                step="any"
                value={resultado}
                onChange={e => setResultado(e.target.value)}
                className="w-full bg-[#1a2236] border border-[#2a3548] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#1e2535]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-lg shadow-blue-600/30 transition-all"
            >
              Salvar Operação
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
