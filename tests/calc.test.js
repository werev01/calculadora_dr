// Rodar com: node --test tests/calc.test.js
const test = require('node:test');
const assert = require('node:assert');
const { calcularOperacao, consolidar } = require('../js/calc.js');

const exemplo = { fixo: 5000, pct: 10, fat: 200000, gFixo: 4000, gPct: 1, vQtd: 3, vFixo: 2000, vPct: 3, crm: 500, wpp: 800, tel: 400 };

test('receita, custos e resultado do exemplo', () => {
  const r = calcularOperacao(exemplo);
  assert.strictEqual(r.receita, 25000);
  assert.strictEqual(r.custos, 19700);
  assert.strictEqual(r.resultado, 5300);
  assert.ok(Math.abs(r.margem - 0.212) < 1e-9);
});

test('ponto de equilíbrio zera o resultado', () => {
  const r = calcularOperacao(exemplo);
  assert.strictEqual(r.equilibrio.tipo, 'valor');
  const noEquilibrio = calcularOperacao({ ...exemplo, fat: r.equilibrio.valor });
  assert.ok(Math.abs(noEquilibrio.resultado) < 1e-6);
});

test('comissões >= % da WeRev não tem equilíbrio', () => {
  const r = calcularOperacao({ ...exemplo, pct: 4 });
  assert.strictEqual(r.equilibrio.tipo, 'inviavel');
});

test('fixo cobrindo a estrutura', () => {
  const r = calcularOperacao({ ...exemplo, fixo: 20000 });
  assert.strictEqual(r.equilibrio.tipo, 'coberto');
});

test('consolidado soma as operações', () => {
  const c = consolidar([exemplo, exemplo, { ...exemplo, fat: 0 }]);
  assert.strictEqual(c.receita, 25000 * 2 + 5000);
  assert.strictEqual(c.resultado, c.receita - c.custos);
});
