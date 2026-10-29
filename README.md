# Calculadora de projeção comercial | WeRev

Ferramenta interna para projetar o resultado mensal da WeRev em operações comerciais terceirizadas. Cada operação tem sua receita e seus custos; o consolidado soma todas.

Site estático (HTML, CSS e JavaScript puro). Sem build, sem servidor, sem dependências.

## Como usar

1. Defina quantas operações quer projetar no seletor "Operações projetadas" (ou use **Duplicar** em um card).
2. Preencha receita e custos de cada uma. Os resultados atualizam enquanto você digita.
3. O consolidado no fim da página mostra o total da WeRev e o peso de cada operação.
4. **Copiar link do cenário** gera uma URL com todos os números. Quem abrir vê exatamente o mesmo cenário.

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

## Estrutura

```
index.html          página e template do card de operação
css/styles.css      identidade visual WeRev
js/calc.js          fórmulas (funções puras, testáveis)
js/app.js           interface, estado, link compartilhável
tests/calc.test.js  testes das fórmulas
```

Para mudar uma regra de cálculo, edite só `js/calc.js` e rode os testes:

```
node --test tests/calc.test.js
```

## Publicação (GitHub Pages)

Settings → Pages → Source: "Deploy from a branch" → Branch `main`, pasta `/ (root)`.

Observação: o site publicado no Pages é acessível a quem tiver a URL (a página tem `noindex` para não aparecer no Google). Os números reais nunca ficam no repositório nem no site: ficam no navegador de quem usa ou dentro do link copiado.

## Identidade visual

Cores do rebranding de 28/10/2026: navy `#1f2b38`, whiskey `#844420`, taupe `#8e6e59`, linen `#e6dfdd`, cinza `#c6c6c6`.
Tipografia: Arsenal (Google Fonts) nos títulos. Neue Montreal não está no Google Fonts; o texto usa Inter como substituta até os arquivos da fonte serem adicionados.
