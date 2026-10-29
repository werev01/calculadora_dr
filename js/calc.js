(function (root) {
// Regras de cálculo da projeção comercial (mensal).
// Funções puras: recebem os números de uma operação e devolvem o resultado.

const CAMPOS = [
  'fixo', 'pct', 'fat',
  'gFixo', 'gPct',
  'vQtd', 'vFixo', 'vPct',
  'crm', 'wpp', 'tel',
];

const n = (v) => (Number.isFinite(+v) ? +v : 0);

function calcularOperacao(op) {
  const fixo = n(op.fixo);
  const pct = n(op.pct) / 100;
  const fat = n(op.fat);
  const gPct = n(op.gPct) / 100;
  const vPct = n(op.vPct) / 100;
  const vQtd = Math.max(0, Math.round(n(op.vQtd)));

  // Receita da WeRev
  const receitaFixa = fixo;
  const receitaVariavel = pct * fat;
  const receita = receitaFixa + receitaVariavel;

  // Custos
  const gestorFixo = n(op.gFixo);
  const gestorComissao = gPct * fat;
  const vendFixo = vQtd * n(op.vFixo);
  // % de cada vendedor sobre a própria venda. Somando todos, a base é o faturamento total.
  const vendComissao = vPct * fat;
  const ferramentas = n(op.crm) + n(op.wpp) + n(op.tel);

  const custosFixos = gestorFixo + vendFixo + ferramentas;
  const custosVariaveis = gestorComissao + vendComissao;
  const custos = custosFixos + custosVariaveis;

  const resultado = receita - custos;
  const margem = receita > 0 ? resultado / receita : null;

  // Ponto de equilíbrio: faturamento do cliente em que resultado = 0
  // fixo + pct*F = custosFixos + (gPct + vPct)*F
  const contribuicao = pct - gPct - vPct; // quanto sobra para a WeRev de cada R$ 1 vendido
  const gap = custosFixos - fixo;          // o que o fixo do cliente não cobre
  let equilibrio;
  if (gap <= 0 && contribuicao >= 0) {
    equilibrio = { tipo: 'coberto', valor: 0 };
  } else if (contribuicao <= 0) {
    equilibrio = { tipo: 'inviavel', valor: null };
  } else {
    equilibrio = { tipo: 'valor', valor: gap / contribuicao };
  }

  return {
    receita, receitaFixa, receitaVariavel,
    custos, custosFixos, custosVariaveis,
    gestor: gestorFixo + gestorComissao,
    gestorFixo, gestorComissao,
    vendedores: vendFixo + vendComissao,
    vendFixo, vendComissao,
    ferramentas,
    resultado, margem,
    contribuicao, equilibrio,
  };
}

function consolidar(ops) {
  const linhas = ops.map((op) => ({ op, r: calcularOperacao(op) }));
  const soma = (k) => linhas.reduce((s, l) => s + l.r[k], 0);
  const receita = soma('receita');
  const custos = soma('custos');
  const resultado = receita - custos;
  return {
    linhas,
    receita,
    custos,
    resultado,
    margem: receita > 0 ? resultado / receita : null,
    fat: ops.reduce((s, op) => s + n(op.fat), 0),
    pessoas: ops.reduce((s, op) => s + Math.max(0, Math.round(n(op.vQtd))) + (n(op.gFixo) > 0 || n(op.gPct) > 0 ? 1 : 0), 0),
  };
}

  const api = { CAMPOS, calcularOperacao, consolidar };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.WeRevCalc = api;
})(typeof window !== 'undefined' ? window : globalThis);
