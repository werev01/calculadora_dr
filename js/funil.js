(function (root) {
// Regras de cálculo do funil comercial (por lançamento).
// Uma operação tem: total de leads, etapas (cada uma com a taxa de passagem
// a partir da etapa anterior; a última é sempre "Compradores comercial"),
// ticket médio e, opcional, uma meta de faturamento para o funil reverso.

const n = (v) => (Number.isFinite(+v) ? +v : 0);

// Quantidade em cada etapa. Índice 0 = total de leads.
function quantidades(op) {
  const q = [Math.max(0, n(op.leads))];
  (op.etapas || []).forEach((e, i) => q.push(q[i] * (n(e.taxa) / 100)));
  return q;
}

// Taxa que leva a etapa anterior até a quantidade informada (preenchimento pelo número).
function taxaParaQuantidade(qAnterior, qDesejada) {
  if (!(qAnterior > 0)) return 0;
  return (Math.max(0, n(qDesejada)) / qAnterior) * 100;
}

// Funil reverso: parte da meta e sobe etapa por etapa até os leads.
// Retorna null em cada etapa onde alguma taxa abaixo dela é zero (não dá para atingir).
function reverso(op) {
  const meta = n(op.meta);
  const ticket = n(op.ticket);
  const etapas = op.etapas || [];
  const q = new Array(etapas.length + 1).fill(null);
  if (!(meta > 0) || !(ticket > 0)) return { q, compradores: null, leads: null };
  q[etapas.length] = meta / ticket;
  for (let i = etapas.length; i >= 1; i--) {
    const taxa = n(etapas[i - 1].taxa) / 100;
    if (q[i] === null || !(taxa > 0)) break;
    q[i - 1] = q[i] / taxa;
  }
  return { q, compradores: q[etapas.length], leads: q[0] };
}

function calcularFunil(op) {
  const q = quantidades(op);
  const leads = q[0];
  const compradores = q[q.length - 1];
  const ticket = Math.max(0, n(op.ticket));
  const faturamento = compradores * ticket;
  const conversao = leads > 0 ? compradores / leads : null;
  return { q, leads, compradores, ticket, faturamento, conversao, reverso: reverso(op) };
}

function consolidarFunil(ops) {
  const linhas = ops.map((op) => ({ op, r: calcularFunil(op) }));
  const soma = (f) => linhas.reduce((s, l) => s + f(l), 0);
  const leads = soma((l) => l.r.leads);
  const compradores = soma((l) => l.r.compradores);
  const faturamento = soma((l) => l.r.faturamento);
  const meta = soma((l) => n(l.op.meta));
  const leadsMetaOk = linhas.every((l) => !(n(l.op.meta) > 0) || l.r.reverso.leads !== null);
  return {
    linhas, leads, compradores, faturamento, meta,
    leadsMeta: leadsMetaOk ? soma((l) => l.r.reverso.leads || 0) : null,
    conversao: leads > 0 ? compradores / leads : null,
    ticket: compradores > 0 ? faturamento / compradores : null,
  };
}

const api = { quantidades, taxaParaQuantidade, reverso, calcularFunil, consolidarFunil };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
else root.WeRevFunil = Object.assign(root.WeRevFunil || {}, api);
})(typeof window !== 'undefined' ? window : globalThis);
