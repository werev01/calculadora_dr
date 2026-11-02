# Calculadora de projeção comercial | WeRev

Ferramenta interna da WeRev com duas abas:

- **Resultado WeRev:** resultado mensal da WeRev em cada operação terceirizada (receita, custos, margem, ponto de equilíbrio).
- **Funil comercial:** faturamento bruto que o comercial gera em cada lançamento, a partir do funil e das taxas de conversão, com funil reverso a partir de uma meta.

As abas são independentes. Cada uma tem suas operações e seu consolidado.

Site estático (HTML, CSS e JavaScript puro). Sem build, sem servidor, sem dependências.

## Como usar

1. Defina quantas operações quer projetar no seletor "Operações projetadas" (ou use **Duplicar** em um card).
2. Preencha receita e custos de cada uma. Os resultados atualizam enquanto você digita.
3. O consolidado no fim da página mostra o total da WeRev e o peso de cada operação.
4. **Copiar link do cenário** gera uma URL com todos os números das duas abas. Quem abrir vê exatamente o mesmo cenário.
5. **Recomeçar** volta ao exemplo só na aba aberta.

Os dados ficam salvos no navegador de quem está usando. Nada é enviado para servidor.

## Regras de cálculo (mensal, por operação)

```
Receita    = Fixo + (% sobre vendas × Faturamento esperado)

Custos     = Gestor fixo
           + Gestor comissão % × Faturamento
           + Qtd vendedores × Fixo por vendedor
           + Vendedores comissão % × Faturamento
           + CRM + Disparos Wpp + Telefonia

Resultado  = Receita − Custos
Margem     = Resultado ÷ Receita
```

- **Comissão dos vendedores:** cada vendedor recebe o % sobre a própria venda. Como a soma das vendas de todos é o faturamento da operação, o custo total é `% × faturamento`.
- **Ponto de equilíbrio:** faturamento do cliente em que o resultado da operação é zero.
  `(Custos fixos − Fixo do cliente) ÷ (% WeRev − % gestor − % vendedores)`.
  Se as comissões somadas forem iguais ou maiores que o % da WeRev, não existe equilíbrio.
- Sem impostos e sem encargos (equipe PJ). Ferramentas em valor total mensal.

Exemplo: fixo R$ 5.000, 10% sobre R$ 200.000, gestor R$ 4.000 + 1%, 3 vendedores a R$ 2.000 + 3%, CRM R$ 500, disparos R$ 800, telefonia R$ 400.
Receita R$ 25.000, custos R$ 19.700, resultado R$ 5.300 (margem 21,2%), equilíbrio em R$ 111.667 de faturamento.

## Funil comercial (por lançamento)

```
Total de leads × taxa → Leads ao vivo × taxa → ... → Compradores comercial
Faturamento bruto = Compradores comercial × Ticket médio
Conversão total   = Compradores ÷ Total de leads
```

- Preenche pelos dois lados: mudando a taxa, a quantidade se recalcula; digitando a quantidade, a taxa se ajusta. As etapas seguintes mantêm suas taxas.
- "Total de leads" é sempre a primeira etapa e "Compradores comercial" sempre a última. No meio dá para incluir, renomear e remover etapas (até 10).
- Uma etapa nova entra com 100% para não mudar o resultado até ser preenchida. Ao remover uma etapa, a taxa dela é combinada com a da etapa seguinte, mantendo o número de compradores.
- **Funil reverso:** meta ÷ ticket = compradores necessários; daí sobe dividindo pelas taxas até os leads necessários.
- Só entram compradores que passaram pelo time comercial.
- Consolidado: soma leads, compradores e faturamento; conversão e ticket médio são ponderados. Etapas intermediárias não são somadas porque podem ser diferentes em cada operação.

Exemplo: 10.000 leads × 30% = 3.000 ao vivo × 5% = 150 compradores × R$ 2.000 = R$ 300.000. Para uma meta de R$ 500.000 são necessários 16.667 leads.

## Estrutura

```
index.html          página e template do card de operação
css/styles.css      identidade visual WeRev
js/calc.js          fórmulas da aba Resultado (funções puras, testáveis)
js/funil.js         fórmulas do funil
js/app.js           interface da aba Resultado, link compartilhável
js/funil-app.js     interface da aba Funil e troca de abas
tests/              testes das fórmulas
```

Para mudar uma regra de cálculo, edite só `js/calc.js` ou `js/funil.js` e rode os testes:

```
node --test tests/calc.test.js
node --test tests/funil.test.js
```

## Publicação (GitHub Pages)

Settings → Pages → Source: "Deploy from a branch" → Branch `main`, pasta `/ (root)`.

Observação: o site publicado no Pages é acessível a quem tiver a URL (a página tem `noindex` para não aparecer no Google). Os números reais nunca ficam no repositório nem no site: ficam no navegador de quem usa ou dentro do link copiado.

## Identidade visual

Cores do rebranding de 28/10/2026: navy `#1f2b38`, whiskey `#844420`, taupe `#8e6e59`, linen `#e6dfdd`, cinza `#c6c6c6`.
Tipografia: Arsenal (Google Fonts) nos títulos. Neue Montreal não está no Google Fonts; o texto usa Inter como substituta até os arquivos da fonte serem adicionados.
