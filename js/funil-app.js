(function () {
  'use strict';

  const F = window.WeRevFunil;
  const STORAGE_KEY = 'werev-funil-v1';
  const ABA_KEY = 'werev-aba';
  const MAX_OPS = 20;
  const MAX_ETAPAS = 10;
  const NOME_PRIMEIRA = 'Total de leads';
  const NOME_ULTIMA = 'Compradores comercial';

  // ---------- Formatação ----------
  const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const fmtInt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
  const fmtNum = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
  const fmtPct = new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 2 });

  const brl = (v) => (v === null || !Number.isFinite(v) ? '–' : fmtBRL.format(Math.round(v)));
  const int = (v) => (v === null || !Number.isFinite(v) ? '–' : fmtInt.format(Math.round(v)));
  const pct = (v) => (v === null || !Number.isFinite(v) ? '–' : fmtPct.format(v));

  function parseNumero(texto) {
    let s = String(texto == null ? '' : texto).trim().replace(/[^\d,.\-]/g, '');
    if (!s) return 0;
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    const v = parseFloat(s);
    return Number.isFinite(v) ? Math.max(0, v) : 0;
  }

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- Estado ----------
  let seq = 0;
  const novoId = () => 'f' + Date.now().toString(36) + (seq++);

  function opPadrao(i) {
    return {
      id: novoId(),
      nome: 'Lançamento ' + i,
      leads: 10000,
      etapas: [
        { id: novoId(), nome: 'Leads ao vivo', taxa: 30 },
        { id: novoId(), nome: NOME_ULTIMA, taxa: 5 },
      ],
      ticket: 2000,
      meta: 500000,
    };
  }

  function clonar(op, nome) {
    return {
      ...op,
      id: novoId(),
      nome: nome !== undefined ? nome : op.nome,
      etapas: op.etapas.map((e) => ({ ...e, id: novoId() })),
    };
  }

  const num = (v) => (Number.isFinite(+v) && +v >= 0 ? +v : 0);

  function normalizar(lista) {
    if (!Array.isArray(lista) || !lista.length) return null;
    return lista.slice(0, MAX_OPS).map((o, i) => {
      let etapas = Array.isArray(o.etapas) ? o.etapas.slice(0, MAX_ETAPAS) : [];
      etapas = etapas.map((e) => ({
        id: novoId(),
        nome: typeof e.nome === 'string' ? e.nome.slice(0, 60) : 'Etapa',
        taxa: num(e.taxa),
      }));
      if (!etapas.length) etapas = [{ id: novoId(), nome: NOME_ULTIMA, taxa: 0 }];
      etapas[etapas.length - 1].nome = NOME_ULTIMA;
      return {
        id: novoId(),
        nome: typeof o.nome === 'string' ? o.nome.slice(0, 80) : 'Lançamento ' + (i + 1),
        leads: num(o.leads),
        etapas,
        ticket: num(o.ticket),
        meta: num(o.meta),
      };
    });
  }

  function codificar(ops) {
    const enxuto = ops.map((o) => ({
      nome: o.nome, leads: o.leads, ticket: o.ticket, meta: o.meta,
      etapas: o.etapas.map((e) => ({ nome: e.nome, taxa: e.taxa })),
    }));
    return btoa(unescape(encodeURIComponent(JSON.stringify(enxuto)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decodificar(str) {
    try {
      return JSON.parse(decodeURIComponent(escape(atob(str.replace(/-/g, '+').replace(/_/g, '/')))));
    } catch (e) {
      return null;
    }
  }

  // Este script roda antes do app.js, que limpa o hash depois de ler.
  const hash = location.hash;
  const paramHash = (k) => {
    const m = hash.match(new RegExp('[#&]' + k + '=([^&]+)'));
    return m ? m[1] : null;
  };

  function carregar() {
    const f = paramHash('f');
    if (f) {
      const daUrl = normalizar(decodificar(f));
      if (daUrl) return daUrl;
    }
    try {
      const salvo = normalizar(JSON.parse(localStorage.getItem(STORAGE_KEY)));
      if (salvo) return salvo;
    } catch (e) { /* storage indisponível */ }
    return [opPadrao(1)];
  }

  const state = { ops: carregar() };

  function salvar() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.ops)); } catch (e) { /* ignora */ }
  }

  // ---------- Abas ----------
  function setAba(nome) {
    if (nome !== 'funil') nome = 'resultado';
    document.body.dataset.aba = nome;
    document.querySelectorAll('[data-painel]').forEach((el) => { el.hidden = el.dataset.painel !== nome; });
    document.querySelectorAll('.aba').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.aba === nome)));
    try { localStorage.setItem(ABA_KEY, nome); } catch (e) { /* ignora */ }
  }

  document.querySelectorAll('.aba').forEach((b) => b.addEventListener('click', () => {
    setAba(b.dataset.aba);
    window.scrollTo({ top: 0 });
  }));

  let abaInicial = paramHash('t');
  if (!abaInicial) { try { abaInicial = localStorage.getItem(ABA_KEY); } catch (e) { /* ignora */ } }
  setAba(abaInicial);

  // ---------- Render ----------
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const elFunis = $('#funis');
  const elQtd = $('#f-qtd-ops');

  function htmlCard(op) {
    const ultima = op.etapas.length;
    let etapas = `
      <div class="etapa etapa-topo" data-i="0">
        <div class="etapa-barra"><div class="etapa-fill"></div></div>
        <span class="etapa-nome-fixo">${NOME_PRIMEIRA}</span>
        <div class="in in-qtd"><input data-f="qtd" data-i="0" inputmode="numeric" aria-label="${NOME_PRIMEIRA}"></div>
      </div>`;
    op.etapas.forEach((e, j) => {
      const i = j + 1;
      const final = i === ultima;
      const podeIncluir = op.etapas.length < MAX_ETAPAS;
      etapas += `
      <div class="passagem">
        <span class="seta" aria-hidden="true"></span>
        <div class="in in-taxa"><input data-f="taxa" data-i="${i}" inputmode="decimal" aria-label="Taxa de passagem para ${esc(e.nome)}"><i>%</i></div>
        <span class="passagem-l">passam</span>
        ${podeIncluir ? `<button type="button" class="link link-add" data-acao="add-etapa" data-i="${i}">+ incluir etapa aqui</button>` : ''}
      </div>
      <div class="etapa${final ? ' etapa-final' : ''}" data-i="${i}">
        <div class="etapa-barra"><div class="etapa-fill"></div></div>
        ${final
          ? `<span class="etapa-nome-fixo">${NOME_ULTIMA}</span>`
          : `<input class="etapa-nome" data-f="nome" data-i="${i}" aria-label="Nome da etapa" placeholder="Nome da etapa">`}
        <div class="in in-qtd"><input data-f="qtd" data-i="${i}" inputmode="numeric" aria-label="Quantidade em ${esc(e.nome)}"></div>
        ${final ? '' : `<button type="button" class="etapa-rem" data-acao="rem-etapa" data-i="${i}" aria-label="Remover etapa" title="Remover etapa">×</button>`}
      </div>`;
    });

    return `
    <article class="op funil-op" data-id="${op.id}">
      <div class="op-head">
        <input class="op-nome" data-f="opnome" aria-label="Nome da operação" placeholder="Nome da operação">
        <div class="op-acoes">
          <button type="button" class="link" data-acao="duplicar">Duplicar</button>
          <button type="button" class="link link-perigo" data-acao="remover" ${state.ops.length <= 1 ? 'disabled' : ''}>Remover</button>
        </div>
      </div>
      <div class="op-corpo">
        <div class="op-inputs">
          <fieldset>
            <legend>Funil do lançamento</legend>
            <div class="funil-lista">${etapas}</div>
          </fieldset>
          <fieldset>
            <legend>Ticket</legend>
            <div class="grid g2">
              <label class="campo"><span>Ticket médio</span><div class="in"><i>R$</i><input data-f="ticket" inputmode="decimal"></div><small>multiplica os compradores</small></label>
            </div>
          </fieldset>
        </div>
        <aside class="op-res">
          <div class="res-final">
            <span>Faturamento bruto</span>
            <b data-r="fat"></b>
            <span class="margem" data-r="fatNota"></span>
          </div>
          <div class="res-bloco">
            <div class="res-linha res-forte"><span>Compradores</span><b data-r="compradores"></b></div>
            <div class="res-linha res-sub"><span>Conversão total</span><span data-r="conversao"></span></div>
            <div class="res-linha res-sub"><span>Ticket médio</span><span data-r="ticket"></span></div>
          </div>
          <div class="reverso">
            <span class="eq-l">Funil reverso</span>
            <label class="reverso-meta">
              <span>Meta de faturamento</span>
              <div class="in in-escuro"><i>R$</i><input data-f="meta" inputmode="decimal" placeholder="0"></div>
            </label>
            <ol class="reverso-lista" data-r="reverso"></ol>
            <span class="eq-n" data-r="reversoNota"></span>
          </div>
        </aside>
      </div>
    </article>`;
  }

  function renderTudo() {
    elFunis.innerHTML = state.ops.map(htmlCard).join('');
    state.ops.forEach((op) => {
      const card = $(`.funil-op[data-id="${op.id}"]`, elFunis);
      $('[data-f="opnome"]', card).value = op.nome;
      $$('[data-f="nome"]', card).forEach((inp) => { inp.value = op.etapas[+inp.dataset.i - 1].nome; });
    });
    elQtd.value = state.ops.length;
    $('#f-qtd-menos').disabled = state.ops.length <= 1;
    $('#f-qtd-mais').disabled = state.ops.length >= MAX_OPS;
    atualizar();
  }

  // Escreve o valor formatado em todos os campos numéricos, menos no que está sendo digitado.
  function preencherCampos(card, op, r) {
    $$('input[data-f]', card).forEach((inp) => {
      if (inp === document.activeElement) return;
      const f = inp.dataset.f;
      const i = +inp.dataset.i;
      if (f === 'qtd') inp.value = int(r.q[i]);
      else if (f === 'taxa') inp.value = fmtNum.format(op.etapas[i - 1].taxa);
      else if (f === 'ticket') inp.value = op.ticket ? fmtNum.format(op.ticket) : '';
      else if (f === 'meta') inp.value = op.meta ? fmtNum.format(op.meta) : '';
    });
  }

  function atualizar() {
    const cons = F.consolidarFunil(state.ops);

    cons.linhas.forEach(({ op, r }) => {
      const card = $(`.funil-op[data-id="${op.id}"]`, elFunis);
      if (!card) return;
      preencherCampos(card, op, r);

      // Barras do funil (escala raiz quadrada para as etapas finais continuarem visíveis)
      $$('.etapa', card).forEach((el) => {
        const i = +el.dataset.i;
        const prop = r.leads > 0 ? r.q[i] / r.leads : 0;
        $('.etapa-fill', el).style.width = (r.leads > 0 ? Math.max(4, Math.sqrt(prop) * 100) : 0) + '%';
      });

      const set = (k, v) => { const el = $(`[data-r="${k}"]`, card); if (el) el.textContent = v; };
      set('fat', brl(r.faturamento));
      set('fatNota', 'por lançamento');
      set('compradores', int(r.compradores));
      set('conversao', pct(r.conversao));
      set('ticket', brl(r.ticket));

      // Reverso
      const lista = $('[data-r="reverso"]', card);
      const rev = r.reverso;
      const nomes = [NOME_PRIMEIRA, ...op.etapas.map((e) => e.nome || 'Etapa')];
      if (!(op.meta > 0)) {
        lista.innerHTML = '';
        set('reversoNota', 'Informe uma meta para ver quantos leads são necessários.');
      } else if (!(op.ticket > 0)) {
        lista.innerHTML = '';
        set('reversoNota', 'Preencha o ticket médio para calcular o reverso.');
      } else {
        lista.innerHTML = nomes.slice().reverse().map((nome, k) => {
          const i = nomes.length - 1 - k;
          const v = rev.q[i];
          return `<li class="${i === 0 ? 'rev-leads' : ''}"><span>${esc(nome)}</span><b>${v === null ? '–' : int(v)}</b></li>`;
        }).join('');
        if (rev.leads === null) {
          set('reversoNota', 'Alguma taxa está zerada: não tem como chegar na meta.');
        } else {
          const falta = rev.leads - r.leads;
          set('reversoNota', falta > 0.5
            ? `Faltam ${int(falta)} leads em relação ao funil atual.`
            : 'O funil atual já bate a meta.');
        }
      }
    });

    // Consolidado
    const n = state.ops.length;
    $('#f-cons-n').textContent = n === 1 ? '1 operação' : n + ' operações';
    $('#fc-leads').textContent = int(cons.leads);
    $('#fc-compradores').textContent = int(cons.compradores);
    $('#fc-conversao').textContent = pct(cons.conversao);
    $('#fc-ticket').textContent = brl(cons.ticket);
    $('#fc-fat').textContent = brl(cons.faturamento);

    const tbody = $('#fc-linhas');
    tbody.innerHTML = cons.linhas.map(({ op, r }) => `
      <tr>
        <td class="nome">${esc(op.nome || 'Sem nome')}</td>
        <td class="num">${int(r.leads)}</td>
        <td class="num">${int(r.compradores)}</td>
        <td class="num">${pct(r.conversao)}</td>
        <td class="num">${brl(r.ticket)}</td>
        <td class="num">${brl(r.faturamento)}</td>
        <td class="num">${op.meta > 0 ? brl(op.meta) : '–'}</td>
        <td class="num">${op.meta > 0 ? int(r.reverso.leads) : '–'}</td>
      </tr>`).join('');
    $('#ft-leads').textContent = int(cons.leads);
    $('#ft-compradores').textContent = int(cons.compradores);
    $('#ft-conversao').textContent = pct(cons.conversao);
    $('#ft-ticket').textContent = brl(cons.ticket);
    $('#ft-fat').textContent = brl(cons.faturamento);
    $('#ft-meta').textContent = cons.meta > 0 ? brl(cons.meta) : '–';
    $('#ft-leads-meta').textContent = cons.meta > 0 ? int(cons.leadsMeta) : '–';

    $('#fbf-fat').textContent = brl(cons.faturamento);
    $('#fbf-info').textContent = int(cons.compradores) + ' compradores de ' + int(cons.leads) + ' leads · ' + (n === 1 ? '1 operação' : n + ' operações');

    salvar();
  }

  // ---------- Eventos ----------
  const opDoEl = (el) => state.ops.find((o) => o.id === el.closest('.funil-op').dataset.id);

  elFunis.addEventListener('input', (e) => {
    const inp = e.target.closest('input[data-f]');
    if (!inp) return;
    const op = opDoEl(inp);
    if (!op) return;
    const f = inp.dataset.f;
    const i = +inp.dataset.i;
    if (f === 'opnome') op.nome = inp.value;
    else if (f === 'nome') op.etapas[i - 1].nome = inp.value;
    else if (f === 'ticket') op.ticket = parseNumero(inp.value);
    else if (f === 'meta') op.meta = parseNumero(inp.value);
    else if (f === 'taxa') op.etapas[i - 1].taxa = parseNumero(inp.value);
    else if (f === 'qtd') {
      const v = parseNumero(inp.value);
      if (i === 0) op.leads = v;
      else {
        const q = F.quantidades(op);
        op.etapas[i - 1].taxa = F.taxaParaQuantidade(q[i - 1], v);
      }
    }
    atualizar();
  });

  elFunis.addEventListener('focusout', (e) => {
    const inp = e.target.closest('input[data-f]');
    if (!inp || inp.dataset.f === 'opnome' || inp.dataset.f === 'nome') return;
    // Depois que o foco sai, reescreve o campo já formatado.
    requestAnimationFrame(() => atualizar());
  });

  elFunis.addEventListener('focusin', (e) => {
    const inp = e.target.closest('.in input');
    if (inp) requestAnimationFrame(() => inp.select());
  });

  elFunis.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-acao]');
    if (!btn) return;
    const card = btn.closest('.funil-op');
    const idx = state.ops.findIndex((o) => o.id === card.dataset.id);
    if (idx < 0) return;
    const op = state.ops[idx];
    const acao = btn.dataset.acao;
    let foco = null;

    if (acao === 'duplicar' && state.ops.length < MAX_OPS) {
      const copia = clonar(op, op.nome + ' (cópia)');
      state.ops.splice(idx + 1, 0, copia);
      renderTudo();
      const novo = $(`.funil-op[data-id="${copia.id}"]`, elFunis);
      if (novo) { novo.scrollIntoView({ behavior: 'smooth', block: 'start' }); $('.op-nome', novo).focus(); }
      return;
    }
    if (acao === 'remover' && state.ops.length > 1) {
      state.ops.splice(idx, 1);
      renderTudo();
      return;
    }
    if (acao === 'add-etapa' && op.etapas.length < MAX_ETAPAS) {
      // Nova etapa entra com 100% para não alterar o resultado até você preencher.
      const i = +btn.dataset.i;
      op.etapas.splice(i - 1, 0, { id: novoId(), nome: 'Nova etapa', taxa: 100 });
      foco = `.funil-op[data-id="${op.id}"] [data-f="nome"][data-i="${i}"]`;
    }
    if (acao === 'rem-etapa') {
      // Ao remover, junta as duas taxas na etapa seguinte para manter o número de compradores.
      const i = +btn.dataset.i;
      const atual = op.etapas[i - 1];
      const prox = op.etapas[i];
      if (atual && prox) {
        prox.taxa = (atual.taxa * prox.taxa) / 100;
        op.etapas.splice(i - 1, 1);
      }
    }
    renderTudo();
    if (foco) { const el = $(foco); if (el) { el.focus(); el.select(); } }
  });

  function definirQuantidade(qtd) {
    qtd = Math.min(MAX_OPS, Math.max(1, Math.round(qtd) || 1));
    while (state.ops.length < qtd) {
      const ultima = state.ops[state.ops.length - 1];
      state.ops.push(ultima ? clonar(ultima, 'Lançamento ' + (state.ops.length + 1)) : opPadrao(1));
    }
    if (state.ops.length > qtd) state.ops.length = qtd;
    renderTudo();
  }

  $('#f-qtd-menos').addEventListener('click', () => definirQuantidade(state.ops.length - 1));
  $('#f-qtd-mais').addEventListener('click', () => {
    definirQuantidade(state.ops.length + 1);
    const ult = $$('.funil-op', elFunis).pop();
    if (ult) ult.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  elQtd.addEventListener('change', () => definirQuantidade(+elQtd.value));

  renderTudo();

  const barra = $('#f-barra-fixa');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      barra.classList.toggle('oculta', entry.isIntersecting);
    }, { threshold: 0.15 }).observe($('#f-consolidado'));
  }

  // Usado pelo app.js (link do cenário e botão Recomeçar)
  window.WeRevFunil = Object.assign(window.WeRevFunil || {}, {
    codificarEstado: () => codificar(state.ops),
    abaAtual: () => document.body.dataset.aba || 'resultado',
    recomecar: () => { state.ops = [opPadrao(1)]; renderTudo(); },
  });
})();
