# MonitorBDRs · Performance

Dashboard analítico e sistema de controle pessoal para operações na bolsa de valores (B3 e Nomad / EUA), apuração de resultados fiscais e preparação completa para a declaração de Imposto de Renda.

## 🚀 Funcionalidades

- **Multi-Corretora:**
  - 🇧🇷 **B3 (MyCapital):** Ações, BDRs, FIIs, ETFs, Opções e Termo com resultados apurados oficiais (Swing, Day Trade e Proventos).
  - 🇺🇸 **EUA (Nomad):** Ações e dividendos em moeda estrangeira, apuração FIFO e cálculo de ganho de capital sob a Lei 14.754/2023.
- **Painéis e Visualizações:**
  - **🏠 Visão Geral:** Métricas consolidada de resultado líquido, win rate, trades fechados, melhor/pior mês, curva acumulada e desdobramento mensal.
  - **📈 Performance Mensal:** Tabela detalhada e gráfico interativo por mês.
  - **💼 Por Ativo:** Ranking de melhores e piores ativos, busca rápida e exportação CSV.
  - **📊 Análise Detalhada:** Volumes comprados/vendidos, ticket médio, Pareto de concentração (80/20) e sazonalidade por dia da semana.
  - **⚡ Day Trade vs Swing:** Comparativo direto de estratégias, taxas de acerto e resultados mensais.
  - **🧮 Métricas Avançadas:** Payoff, Fator de Lucro, Expectativa matemática, Drawdown máximo, tempo médio de holding e histograma de retornos.
  - **📑 IR / Anual:** Geração de memórias de cálculo, apuração oficial com prejuízos a compensar, Bens e Direitos, dividendos isentos e exportação para Excel (.xlsx) pronta para o programa da Receita Federal.
  - **📋 Operações:** Registro completo com múltiplos filtros (mês, ativo, tipo), exclusão e cadastro manual de novas operações.
  - **📥 Importar:** Upload de novos relatórios em PDF com drag-and-drop e leitura direta no navegador.

## 🛠️ Tecnologias

- **React 18** com **TypeScript**
- **Vite** para build e dev server
- **Tailwind CSS v4** para design financeiro escuro responsivo
- **PDF.js (`pdfjs-dist`)** para extração precisa de dados dos PDFs
- **SheetJS (`xlsx`)** para exportação de planilhas Excel multi-abas
- **Lucide React** para iconografia

## 💻 Como Rodar

```bash
npm install
npm run dev
```

Acesse em `http://localhost:3000`.
