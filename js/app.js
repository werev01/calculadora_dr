(function () {
  'use strict';

  const { calcularOperacao, consolidar } = window.WeRevCalc;
  const STORAGE_KEY = 'werev-projecao-v1';
  const MAX_OPS = 20;

  // ---------- Formatação ----------
  const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const fmtNum = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
  const fmtPct = new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });

  const brl = (v) => fmtBRL.format(Math.round(v) || 0);
  const pct = (v) => (v === null || !Number.isFinite(v) ? '–' : fmtPct.format(v));

  // Aceita "5000", "5.000", "5.000,50", "2,5", "2.5"
  function parseNumero(texto) {
    if (texto === null || texto === undefined) return 0;
    let s = String(texto).trim().replace(/[^\d,.\-]/g, '');
    if (!s) return 0;
    if (s.includes(',')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) {
      s = s.replace(/\./g, '');
    }
    const v = parseFloat(s);
    return Number.isFinite(v) ? v : 0;
  }

  function formatarCampo(valor, tipo) {
    if (!valor) return '';
    if (tipo === 'int') return String(Math.max(0, Math.round(valor)));
    return fmtNum.format(valor);
  }

  // ---------- Estado ----------
  let seq = 0;
  const novoId = () => 'op' + Date.now().toString(36) + (seq++);

  function opPadrao(i) {
    return {
      id: novoId(),
      nome: 'Operação ' + i,
      fixo: 5000, pct: 10, fat: 200000,
      gFixo: 4000, gPct: 1,
      vQtd: 3, vFixo: 2000, vPct: 3,
      crm: 500, wpp: 800, tel: 400,
    };
  }

  function opVazia(i) {
    return {
      id: novoId(), nome: 'Operação ' + i,
      fixo: 0, pct: 0, fat: 0, gFixo: 0, gPct: 0,
      vQtd: 0, vFixo: 0, vPct: 0, crm: 0, wpp: 0, tel: 0,
    };
  }

  function normalizar(lista) {
    if (!Array.isArray(lista) || !lista.length) return null;
    return lista.slice(0, MAX_OPS).map((o, i) => {
      const base = opVazia(i + 1);
      const out = { ...base };
      Object.keys(base).forEach((k) => {
        if (k === 'id') return;
        if (k === 'nome') out.nome = typeof o.nome === 'string' ? o.nome.slice(0, 80) : base.nome;
        else out[k] = Number.isFinite(+o[k]) ? +o[k] : 0;
      });
      return out;
    });
  }

  // Link compartilhável: estado em base64 no hash da URL
  function codificar(ops) {
    const enxuto = ops.map(({ id, ...resto }) => resto);
    const json = JSON.stringify(enxuto);
    return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decodificar(str) {
    try {
      const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(decodeURIComponent(escape(atob(b64))));
    } catch (e) {
      return null;
    }
  }

  function carregar() {
    const m = location.hash.match(/[#&]c=([^&]+)/);
    if (m) {
      const daUrl = normalizar(decodificar(m[1]));
      if (daUrl) {
        history.replaceState(null, '', location.pathname + location.search);
        return { ops: daUrl, origem: 'link' };
      }
    }
    try {
      const salvo = normalizar(JSON.parse(localStorage.getItem(STORAGE_KEY)));
      if (salvo) return { ops: salvo, origem: 'local' };
    } catch (e) { /* storage indisponível */ }
    return { ops: [opPadrao(1)], origem: 'padrao' };
  }

  function salvar() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.ops)); } catch (e) { /* ignora */ }
  }

  const inicial = carregar();
  const state = { ops: inicial.ops };

  // ---------- DOM ----------
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  const elOps = $('#operacoes');
  const tpl = $('#tpl-op');
  const elQtd = $('#qtd-ops');

  function montarCard(op) {
    const frag = tpl.content.cloneNode(true);
    const card = $('.op', frag);
    card.dataset.id = op.id;

    $$('[data-campo]', card).forEach((input) => {
      const campo = input.dataset.campo;
      if (campo === 'nome') {
        input.value = op.nome;
      } else {
        input.value = formatarCampo(op[campo], input.dataset.tipo);
        input.placeholder = '0';
      }
    });
    return card;
  }

  function renderTudo() {
    elOps.innerHTML = '';
    state.ops.forEach((op) => elOps.appendChild(montarCard(op)));
    $$('.op', elOps).forEach((card) => {
      $('[data-acao="remover"]', card).disabled = state.ops.length <= 1;
    });
    elQtd.value = state.ops.length;
    $('#qtd-menos').disabled = state.ops.length <= 1;
    $('#qtd-mais').disabled = state.ops.length >= MAX_OPS;
    atualizarResultados();
  }

  function setTexto(card, chave, texto, classe) {
    const el = $(`[data-r="${chave}"]`, card);
    if (!el) return;
    el.textContent = texto;
    if (classe !== undefined) el.className = classe;
  }

  function sinal(v) {
    if (v < -0.5) return 'neg';
    if (v > 0.5) return 'pos';
    return '';
  }

  function textoEquilibrio(r) {
    const eq = r.equilibrio;
    if (eq.tipo === 'coberto') {
      return { v: 'Já coberto', nota: 'O fixo do cliente paga toda a estrutura, qualquer venda é lucro.' };
    }
    if (eq.tipo === 'inviavel') {
      return { v: 'Sem equilíbrio', nota: 'As comissões da equipe são iguais ou maiores que o % da WeRev: quanto mais vende, mais perde.' };
    }
    return { v: brl(eq.valor), nota: 'de faturamento do cliente para a operação empatar.' };
  }

  function atualizarResultados() {
    const cons = consolidar(state.ops);

    cons.linhas.forEach(({ op, r }) => {
      const card = $(`.op[data-id="${op.id}"]`, elOps);
      if (!card) return;
      ['receita', 'receitaFixa', 'receitaVariavel', 'custos', 'gestor', 'vendedores', 'ferramentas']
        .forEach((k) => setTexto(card, k, brl(r[k])));
      setTexto(card, 'resultado', brl(r.resultado), sinal(r.resultado));
      setTexto(card, 'margem', r.margem === null ? 'sem receita' : 'margem ' + pct(r.margem), 'margem ' + sinal(r.resultado));
      const eq = textoEquilibrio(r);
      setTexto(card, 'equilibrio', eq.v, 'eq-v ' + (r.equilibrio.tipo === 'inviavel' ? 'neg' : ''));
      setTexto(card, 'equilibrioNota', eq.nota);
      card.classList.toggle('op-neg', r.resultado < -0.5);
    });

    // Consolidado
    const n = state.ops.length;
    $('#cons-n').textContent = n === 1 ? '1 operação' : n + ' operações';
    $('#c-receita').textContent = brl(cons.receita);
    $('#c-custos').textContent = brl(cons.custos);
    const cRes = $('#c-resultado');
    cRes.textContent = brl(cons.resultado);
    cRes.className = 'kpi-v ' + sinal(cons.resultado);
    $('#c-margem').textContent = pct(cons.margem);

    const maxAbs = Math.max(1, ...cons.linhas.map((l) => Math.abs(l.r.resultado)));
    const tbody = $('#c-linhas');
    tbody.innerHTML = '';
    cons.linhas.forEach(({ op, r }) => {
      const tr = document.createElement('tr');
      const larg = Math.round((Math.abs(r.resultado) / maxAbs) * 100);
      tr.innerHTML = `
        <td class="nome"></td>
        <td class="num">${brl(op.fat)}</td>
        <td class="num">${brl(r.receita)}</td>
        <td class="num">${brl(r.custos)}</td>
        <td class="num ${sinal(r.resultado)}">${brl(r.resultado)}</td>
        <td class="num">${pct(r.margem)}</td>
        <td class="barra-col"><div class="barra"><div class="barra-fill ${r.resultado < 0 ? 'neg' : ''}" style="width:${larg}%"></div></div></td>`;
      $('.nome', tr).textContent = op.nome || 'Sem nome';
      tbody.appendChild(tr);
    });
    $('#t-fat').textContent = brl(cons.fat);
    $('#t-receita').textContent = brl(cons.receita);
    $('#t-custos').textContent = brl(cons.custos);
    const tRes = $('#t-resultado');
    tRes.textContent = brl(cons.resultado);
    tRes.className = 'num ' + sinal(cons.resultado);
    $('#t-margem').textContent = pct(cons.margem);

    const bf = $('#bf-resultado');
    bf.textContent = brl(cons.resultado);
    bf.className = 'bf-v ' + sinal(cons.resultado);
    $('#bf-margem').textContent = cons.margem === null ? '' : 'margem ' + pct(cons.margem) + ' · ' + (n === 1 ? '1 operação' : n + ' operações');

    salvar();
  }

  // ---------- Ações ----------
  function definirQuantidade(qtd) {
    qtd = Math.min(MAX_OPS, Math.max(1, Math.round(qtd) || 1));
    while (state.ops.length < qtd) {
      const ultima = state.ops[state.ops.length - 1];
      const nova = ultima ? { ...ultima, id: novoId(), nome: 'Operação ' + (state.ops.length + 1) } : opPadrao(1);
      state.ops.push(nova);
    }
    if (state.ops.length > qtd) state.ops.length = qtd;
    renderTudo();
  }

  elOps.addEventListener('input', (e) => {
    const input = e.target.closest('[data-campo]');
    if (!input) return;
    const card = input.closest('.op');
    const op = state.ops.find((o) => o.id === card.dataset.id);
    if (!op) return;
    const campo = input.dataset.campo;
    op[campo] = campo === 'nome' ? input.value : parseNumero(input.value);
    atualizarResultados();
  });

  elOps.addEventListener('focusout', (e) => {
    const input = e.target.closest('[data-campo]');
    if (!input || input.dataset.campo === 'nome') return;
    const op = state.ops.find((o) => o.id === input.closest('.op').dataset.id);
    if (op) input.value = formatarCampo(op[input.dataset.campo], input.dataset.tipo);
  });

  elOps.addEventListener('focusin', (e) => {
    const input = e.target.closest('input[data-tipo]');
    if (input) requestAnimationFrame(() => input.select());
  });

  elOps.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-acao]');
    if (!btn) return;
    const card = btn.closest('.op');
    const idx = state.ops.findIndex((o) => o.id === card.dataset.id);
    if (idx < 0) return;
    if (btn.dataset.acao === 'duplicar' && state.ops.length < MAX_OPS) {
      const copia = { ...state.ops[idx], id: novoId(), nome: state.ops[idx].nome + ' (cópia)' };
      state.ops.splice(idx + 1, 0, copia);
      renderTudo();
      const novo = $(`.op[data-id="${copia.id}"]`, elOps);
      if (novo) {
        novo.scrollIntoView({ behavior: 'smooth', block: 'start' });
        $('.op-nome', novo).focus();
      }
    } else if (btn.dataset.acao === 'remover' && state.ops.length > 1) {
      state.ops.splice(idx, 1);
      renderTudo();
    }
  });

  $('#qtd-menos').addEventListener('click', () => definirQuantidade(state.ops.length - 1));
  $('#qtd-mais').addEventListener('click', () => {
    definirQuantidade(state.ops.length + 1);
    const ult = $$('.op', elOps).pop();
    if (ult) ult.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  elQtd.addEventListener('change', () => definirQuantidade(+elQtd.value));

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('on'), 2600);
  }

  $('#btn-link').addEventListener('click', async () => {
    const funil = window.WeRevFunil && window.WeRevFunil.codificarEstado;
    let url = location.origin + location.pathname + '#c=' + codificar(state.ops);
    if (funil) url += '&f=' + funil() + '&t=' + window.WeRevFunil.abaAtual();
    try {
      await navigator.clipboard.writeText(url);
      toast('Link copiado. Quem abrir vê exatamente este cenário, nas duas abas.');
    } catch (e) {
      window.prompt('Copie o link do cenário:', url);
    }
  });

  $('#btn-reset').addEventListener('click', () => {
    if (window.WeRevFunil && window.WeRevFunil.abaAtual() === 'funil') {
      window.WeRevFunil.recomecar();
      toast('Funil reiniciado com o exemplo.');
      return;
    }
    state.ops = [opPadrao(1)];
    renderTudo();
    toast('Cenário reiniciado com o exemplo.');
  });

  renderTudo();
  if (inicial.origem === 'link') toast('Cenário carregado a partir do link.');

  // Mostra a barra fixa só quando o consolidado não está visível
  const barra = $('#barra-fixa');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      barra.classList.toggle('oculta', entry.isIntersecting);
    }, { threshold: 0.15 }).observe($('#consolidado'));
  }
})();
