// Rodar com: node --test tests/funil.test.js
const test = require('node:test');
const assert = require('node:assert');
const F = require('../js/funil.js');

const perto = (a, b) => Math.abs(a - b) < 1e-6;

const exemplo = {
  leads: 10000,
  etapas: [{ nome: 'Leads ao vivo', taxa: 30 }, { nome: 'Compradores comercial', taxa: 5 }],
  ticket: 2000,
  meta: 500000,
};

test('funil do exemplo', () => {
  const r = F.calcularFunil(exemplo);
  assert.ok(perto(r.q[1], 3000));
  assert.ok(perto(r.compradores, 150));
  assert.ok(perto(r.faturamento, 300000));
  assert.ok(perto(r.conversao, 0.015));
});

test('funil reverso chega nos leads necessários', () => {
  const r = F.calcularFunil(exemplo).reverso;
  assert.ok(perto(r.compradores, 250));
  assert.ok(perto(r.q[1], 5000));
  assert.ok(perto(r.leads, 16666.6666667));
  // ida e volta: com os leads do reverso, o funil bate a meta
  const ida = F.calcularFunil({ ...exemplo, leads: r.leads });
  assert.ok(perto(ida.faturamento, 500000));
});

test('taxa zero deixa o reverso sem resposta', () => {
  const r = F.reverso({ ...exemplo, etapas: [{ taxa: 0 }, { taxa: 5 }] });
  assert.strictEqual(r.leads, null);
  assert.ok(perto(r.q[1], 5000));
});

test('preencher pela quantidade ajusta a taxa', () => {
  assert.ok(perto(F.taxaParaQuantidade(3000, 200), 6.6666666667));
  assert.strictEqual(F.taxaParaQuantidade(0, 200), 0);
});

test('etapa extra no meio', () => {
  const op = { ...exemplo, etapas: [{ taxa: 30 }, { taxa: 50 }, { taxa: 10 }] };
  const r = F.calcularFunil(op);
  assert.ok(perto(r.compradores, 150));
});

test('consolidado soma leads, compradores e faturamento', () => {
  const c = F.consolidarFunil([exemplo, { ...exemplo, leads: 5000, ticket: 1000 }]);
  assert.ok(perto(c.leads, 15000));
  assert.ok(perto(c.compradores, 225));
  assert.ok(perto(c.faturamento, 375000));
  assert.ok(perto(c.ticket, 375000 / 225));
  assert.ok(perto(c.conversao, 225 / 15000));
});
