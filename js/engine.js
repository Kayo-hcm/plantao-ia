/* ==========================================================================
   PLANTÃO IA — motor do jogo (versão de 30 dias)
   Recalcula, de forma determinística, todo o estado do hospital a partir da
   lista de decisões e contribuições gravadas na planilha. Assim, todos os
   jogadores (e o painel do professor) veem exatamente o mesmo hospital.

   O que define a jornada de cada hospital:
     · porte (essencial, regional, alta) — tamanho da equipe
     · história (um dos 6 incidentes) — sorteada ao iniciar o jogo
     · semente (tirada do código) — dia do incidente, incidentes menores,
       ordem dos casos diários e pequenos acontecimentos
   Ritmo: o dia avança quando a equipe termina as tarefas do dia, com limite
   de CONFIG.DIAS_POR_DIA_REAL dias de jogo por dia do calendário.
   ========================================================================== */
window.ENGINE = (function (G, CFG) {
  'use strict';
  CFG = CFG || {};
  var NDIAS = G.NDIAS || 30;

  function val(x, ctx) { return typeof x === 'function' ? x(ctx) : x; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function uniq(a) { var o = []; a.forEach(function (x) { if (x && o.indexOf(x) < 0) o.push(x); }); return o; }
  function diasPorDiaReal() { var v = Number(CFG.DIAS_POR_DIA_REAL); return isNaN(v) ? 3 : v; }

  /* ---------------- plano do jogo (história + semente) ---------------- */
  function historiaValida(h) { return !!(h && G.HISTORIAS && G.HISTORIAS[h]); }
  function planoDoJogo(data) {
    var h = (data && data.hospital) || {};
    var porte = porteDoJogo(data);
    var codigo = String(h.codigo || h.nome_hospital || 'TESTE');
    var semente = G.hash(codigo);
    var ordem = G.HISTORIA_ORDEM || [];
    var historia = historiaValida(h.historia) ? h.historia : (ordem.length ? ordem[semente % ordem.length] : null);
    var H = historia ? G.HISTORIAS[historia] : null;
    var rand = G.rng(semente ^ 0x9E3779B9);
    var I0 = 15 + (semente % 2);
    // incidentes menores: dois, sem repetir e fora da lista da história
    var pool = (G.INCIDENTES_MENORES || []).filter(function (x) { return !H || (H.excluir || []).indexOf(x) < 0; });
    pool = G.embaralhar(pool, rand);
    var dias1 = [9, 10, 12, 13], dias2 = [23, 24, 26, 27];
    var menores = {};
    if (pool[0]) menores[pool[0]] = dias1[Math.floor(rand() * dias1.length)];
    if (pool[1]) menores[pool[1]] = dias2[Math.floor(rand() * dias2.length)];
    // casos do dia 9 ao 29: os 4 da história nos dias I0+1 a I0+4, os genéricos no resto
    var genericos = G.embaralhar((G.CASOS || []).map(function (c) { return c.id; }), rand), gi = 0;
    var casos = {};
    for (var d = 9; d <= 29; d++) {
      var rel = d - I0;
      if (H && rel >= 1 && rel <= 4 && H.casos[rel - 1]) casos[d] = H.casos[rel - 1].id;
      else casos[d] = genericos[gi++ % genericos.length];
    }
    // pequenos acontecimentos
    var sort = G.embaralhar((G.EVENTOS_SORTEADOS || []).map(function (e) { return e.id; }), rand);
    var sorteados = {};
    (G.DIAS_SORTEADOS || []).forEach(function (dia, i) { if (sort[i]) sorteados[sort[i]] = dia; });
    return { porte: porte, historia: historia, semente: semente, I0: I0, menores: menores, casos: casos, sorteados: sorteados,
      chave: porte + '|' + historia + '|' + semente };
  }

  /* ---------------- tarefas resolvidas para o jogo ---------------- */
  var cacheT = {}, cacheE = {}, listaAtual = null, planoAtual = null;

  function diaDaTarefa(t, plano) {
    if (t.historia) return plano.I0 + (t.rel || 0);
    if (t.menor) return (plano.menores[t.menor] || 0) + (t.rel || 0);
    if (G.CAL_TAREFAS && G.CAL_TAREFAS[t.id] !== undefined) return G.CAL_TAREFAS[t.id];
    return typeof t.day === 'object' ? t.day[plano.porte] : t.day;
  }

  function resolverTarefa(t, plano) {
    var porte = plano.porte, P = G.PORTES[porte];
    var r = Object.assign({}, t);
    r.day = diaDaTarefa(t, plano);
    if (t.type === 'decisao') {
      r.role = P.setor[t.setor];
    } else {
      var setores = t.todos ? [] : (t.setores || []);
      r.roles = t.todos ? P.papeis.slice() : uniq(setores.map(function (s) { return P.setor[s]; }));
      r.lider = P.setor[t.lider] || r.roles[0];
      if (r.roles.indexOf(r.lider) > 0) { r.roles.splice(r.roles.indexOf(r.lider), 1); r.roles.unshift(r.lider); }
      var pr = {};
      r.roles.forEach(function (role) {
        if (t.promptsPapel && t.promptsPapel[role]) { pr[role] = t.promptsPapel[role]; return; }
        for (var i = 0; i < setores.length; i++) {
          if (P.setor[setores[i]] === role && t.prompts && t.prompts[setores[i]]) { pr[role] = t.prompts[setores[i]]; return; }
        }
        pr[role] = 'Dê sua contribuição para a reunião.';
      });
      r.promptsPorPapel = pr;
      r.setoresDoPapel = {};
      r.roles.forEach(function (role) { r.setoresDoPapel[role] = setores.filter(function (s) { return P.setor[s] === role; }); });
    }
    return r;
  }

  function tarefasDoJogo(plano) {
    if (cacheT[plano.chave]) return cacheT[plano.chave];
    var porte = plano.porte;
    var lista = G.TASKS.filter(function (t) {
      if (t.portes && t.portes.indexOf(porte) < 0) return false;
      if (t.historia && t.historia !== plano.historia) return false;
      if (t.menor && !plano.menores[t.menor]) return false;
      return true;
    }).map(function (t) { return resolverTarefa(t, plano); });
    Object.keys(plano.casos).forEach(function (d) {
      var c = G.caso(plano.casos[d]);
      if (c) lista.push(resolverTarefa(G.tarefaCaso(Number(d), c), plano));
    });
    lista = lista.filter(function (t) { return t.day >= 1 && t.day <= NDIAS; });
    var ids = lista.map(function (t) { return t.id; });
    lista.forEach(function (t) { t.requires = (t.requires || []).filter(function (id) { return ids.indexOf(id) >= 0; }); });
    var ordem = G.ROLE_ORDER;
    lista.sort(function (a, b) {
      if (a.day !== b.day) return a.day - b.day;
      if ((a.ordem || 0) !== (b.ordem || 0)) return (a.ordem || 0) - (b.ordem || 0);
      if (a.type !== b.type) return a.type === 'decisao' ? -1 : 1;
      var ra = ordem.indexOf(a.role || a.lider), rb = ordem.indexOf(b.role || b.lider);
      return ra - rb;
    });
    cacheT[plano.chave] = lista;
    return lista;
  }

  function diaDoEvento(ev, plano) {
    if (ev.historia) return ev.historia === plano.historia ? plano.I0 + ev.rel : 0;
    if (ev.menor) return plano.menores[ev.menor] ? plano.menores[ev.menor] + (ev.rel || 0) : 0;
    if (ev.sorteado) return plano.sorteados[ev.id] || 0;
    var c = G.CAL_EVENTOS ? G.CAL_EVENTOS[ev.id] : undefined;
    if (typeof c === 'number') return c;
    if (typeof c === 'string' && /^I\+\d+$/.test(c)) return plano.I0 + Number(c.slice(2));
    return ev.day;
  }
  function eventosDoJogo(plano) {
    if (cacheE[plano.chave]) return cacheE[plano.chave];
    var porDia = {};
    var todos = G.EVENTS.concat((G.EVENTOS_SORTEADOS || []).map(function (e) {
      return Object.assign({ sorteado: true, when: function () { return true; } }, e);
    }));
    todos.forEach(function (ev) {
      if (ev.portes && ev.portes.indexOf(plano.porte) < 0) return;
      var d = diaDoEvento(ev, plano);
      if (!d || d < 1 || d > NDIAS) return;
      (porDia[d] = porDia[d] || []).push(ev);
    });
    cacheE[plano.chave] = porDia;
    return porDia;
  }

  /** Tarefas-base de um porte (sem história nem casos): para a sala de espera. */
  function tarefasDoPorte(porte) {
    porte = G.PORTES[porte] ? porte : 'regional';
    var plano = { porte: porte, historia: null, semente: 1, I0: 15, menores: {}, casos: {}, sorteados: {}, chave: 'base|' + porte };
    return tarefasDoJogo(plano);
  }

  function taskById(id) {
    var lista = listaAtual || [];
    for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i];
    for (var j = 0; j < G.TASKS.length; j++) if (G.TASKS[j].id === id) return G.TASKS[j];
    return null;
  }

  /** Porte do jogo: o gravado no início ou, no saguão, o que a equipe atual formaria. */
  function porteDoJogo(data) {
    var h = (data && data.hospital) || {};
    if (h.porte && G.PORTES[h.porte]) return h.porte;
    var n = (data && data.jogadores ? data.jogadores.length : 0) || 0;
    return G.porteDe(n);
  }

  function initialInd(porte) {
    var ind = {};
    G.INDICATORS.forEach(function (i) { ind[i.id] = i.inicial; });
    ind.orcamento = G.orcamentoInicial(porte || 'regional');
    return ind;
  }

  function applyFx(ind, fx, custo, porte) {
    var before = clone(ind);
    if (custo) ind.orcamento -= custo;
    var esc = (G.escalaDe ? G.escalaDe(porte) : G.ESCALA) || { ganho: 1, perda: 1 };
    Object.keys(fx || {}).forEach(function (k) {
      if (!(k in ind)) return;
      var v = Number(fx[k]) || 0;
      if (k !== 'orcamento') v = Math.round(v * (v > 0 ? esc.ganho : esc.perda) * 10) / 10;
      ind[k] = Math.round((ind[k] + v) * 10) / 10;
      if (k !== 'orcamento') ind[k] = Math.max(0, Math.min(100, ind[k]));
    });
    var delta = {};
    Object.keys(ind).forEach(function (k) {
      var d = Math.round((ind[k] - before[k]) * 10) / 10;
      if (d) delta[k] = d;
    });
    return delta;
  }

  function normOpt(o, ctx) {
    if (!o) return null;
    var q = typeof o.q === 'function' ? o.q(ctx) : o.q;
    return {
      id: o.id, label: val(o.label, ctx), detalhe: val(o.detalhe, ctx) || '',
      custo: G.custo(Number(val(o.custo, ctx)) || 0, ctx.porte),
      fx: val(o.fx, ctx) || {}, flags: val(o.flags, ctx) || {},
      q: q === undefined ? null : q,
      consequencia: val(o.consequencia, ctx) || '', comentario: val(o.comentario, ctx) || ''
    };
  }

  function opcoesBrutas(task, ctx, filtrar) {
    var lista = val(task.opcoes, ctx) || [];
    if (!filtrar) return lista;
    return lista.filter(function (o) { return !o.portes || o.portes.indexOf(ctx.porte) >= 0; });
  }

  function getOptions(task, ctx) {
    if (task.type !== 'decisao') return [];
    return opcoesBrutas(task, ctx, true).map(function (o) {
      return { id: o.id, label: val(o.label, ctx), detalhe: val(o.detalhe, ctx) || '', custo: G.custo(Number(val(o.custo, ctx)) || 0, ctx.porte),
        carta: o.carta || null, grafico: o.grafico || null };
    });
  }

  function resolveOption(task, ctx, opcaoId, textoGravado) {
    var opt = null;
    try {
      if (task.multi) {
        var ids = String(opcaoId || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        var r = task.combinar(ctx, ids);
        r.id = ids.join(',');
        opt = normOpt(r, ctx);
      } else {
        var lista = opcoesBrutas(task, ctx, false), raw = null;
        for (var i = 0; i < lista.length; i++) if (String(lista[i].id) === String(opcaoId)) raw = lista[i];
        opt = normOpt(raw, ctx);
      }
    } catch (e) { opt = null; }
    if (!opt) opt = { id: opcaoId, label: textoGravado || String(opcaoId), detalhe: '', custo: 0, fx: {}, flags: {}, q: null, consequencia: '', comentario: '' };
    return opt;
  }

  /** Índices a partir dos dados brutos vindos do servidor. */
  function indexar(data) {
    var decMap = {}, reuMap = {}, holder = {};
    (data.decisoes || []).forEach(function (d) {
      if (d.tipo && d.tipo !== 'decisao') return;
      if (!decMap[d.tarefa_id]) decMap[d.tarefa_id] = d;
    });
    (data.reunioes || []).forEach(function (r) {
      reuMap[r.reuniao_id] = reuMap[r.reuniao_id] || {};
      if (!reuMap[r.reuniao_id][r.funcao]) reuMap[r.reuniao_id][r.funcao] = r;
    });
    (data.jogadores || []).forEach(function (j) {
      String(j.funcoes || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean)
        .forEach(function (f) { holder[f] = j; });
    });
    return { decMap: decMap, reuMap: reuMap, holder: holder };
  }

  function makeCtx(snap, idx, hospitalNome, porte, plano) {
    return {
      flags: snap.flags, ind: snap.ind, hospital: hospitalNome, porte: porte,
      historia: plano ? plano.historia : null, I0: plano ? plano.I0 : null,
      semana: snap.semana || null, casosResumo: snap.casosResumo || null, dia: snap.dia || null,
      dec: function (id) { return idx.decMap[id] || null; },
      reu: function (id) { return idx.reuMap[id] || null; },
      jogadorDe: function (role) { return idx.holder[role] ? idx.holder[role].nome : ''; }
    };
  }

  function isDone(task, idx) {
    if (task.type === 'decisao') return !!idx.decMap[task.id];
    var c = idx.reuMap[task.id] || {};
    return task.roles.every(function (r) { return !!c[r]; });
  }

  /* ---------------- limite de dias por dia do calendário ---------------- */
  function inicioDoDia(t) { var d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); }
  function limiteDeDias(h, agora) {
    var dpr = diasPorDiaReal();
    if (!dpr || dpr <= 0 || !h || !h.iniciado_em) return { limite: NDIAS, proxima: null };
    var ini = new Date(h.iniciado_em);
    if (isNaN(ini.getTime())) return { limite: NDIAS, proxima: null };
    var hoje = inicioDoDia(agora), corridos = Math.max(0, Math.round((hoje - inicioDoDia(ini)) / 86400000));
    var lim = Math.min(NDIAS, dpr * (corridos + 1) + (Number(h.bonus_dias) || 0));
    return { limite: lim, proxima: hoje + 86400000 };
  }

  /* ---------------- balanço da semana ---------------- */
  function resumoSemana(n, dias, ind, casos, flagsAtual) {
    var de = (n - 1) * 7 + 1, ate = Math.min(n * 7, dias.length - 1);
    var ini = dias[de] ? dias[de].indInicio : clone(ind);
    var decs = [], evs = [];
    for (var d = de; d <= ate; d++) {
      var dia = dias[d]; if (!dia) continue;
      dia.eventos.forEach(function (e) { evs.push({ titulo: e.titulo, tom: e.tom }); });
      dia.itens.forEach(function (it) {
        if (it.task.type === 'decisao' && it.task.apresentacao !== 'caso') decs.push({ titulo: it.task.titulo, role: it.task.role, label: it.opt.label });
      });
    }
    return { n: n, de: de, ate: ate, indInicio: clone(ini), indFim: clone(ind), decisoes: decs, eventos: evs, casos: G.resumoCasos(casos) };
  }

  /** Executa o jogo inteiro e devolve o estado atual. */
  function run(data, agora) {
    agora = agora || Date.now();
    var plano = planoDoJogo(data);
    var porte = plano.porte;
    var TASKS = tarefasDoJogo(plano);
    var EVS = eventosDoJogo(plano);
    listaAtual = TASKS; planoAtual = plano;
    var idx = indexar(data);
    var h = data.hospital || {};
    var nome = h.nome_hospital || 'Hospital';
    var ind = initialInd(porte);
    var flags = {};
    var ctx = makeCtx({ flags: flags, ind: ind }, idx, nome, porte, plano);
    var lim = limiteDeDias(h, agora);
    var dias = [null];
    var snaps = {};
    var tarefas = {};
    var casos = [];
    var diaAtual = 1, finalizado = false, aguardandoLiberacao = false;

    for (var d = 1; d <= NDIAS; d++) {
      if (d > lim.limite) { diaAtual = d - 1; aguardandoLiberacao = true; break; }
      var dia = { n: d, eventos: [], itens: [], indInicio: clone(ind), indFim: null, completo: false };
      dias.push(dia);
      (EVS[d] || []).forEach(function (ev) {
        var ok = false;
        try { ok = !!ev.when(ctx); } catch (e) { ok = false; }
        if (!ok) return;
        var delta = applyFx(ind, val(ev.fx, ctx) || {}, 0, porte);
        var fl = val(ev.flags, ctx);
        if (fl) Object.assign(flags, fl);
        dia.eventos.push({ id: ev.id, titulo: val(ev.titulo, ctx), texto: val(ev.texto, ctx), tom: val(ev.tom, ctx) || 'info', setor: ev.setor || null, delta: delta,
          historia: !!ev.historia, menor: !!ev.menor });
      });
      dia.indAposEventos = clone(ind);
      var flagsDia = clone(flags);

      var doDia = TASKS.filter(function (t) { return t.day === d; });
      doDia.forEach(function (t) {
        var ehCaso = t.apresentacao === 'caso';
        var snap = { flags: clone(ehCaso ? flagsDia : flags), ind: clone(ind), dia: d, casosResumo: G.resumoCasos(casos) };
        if (t.semanal) snap.semana = resumoSemana(t.semanal, dias, ind, casos, flags);
        snaps[t.id] = snap;
        var ctxT = ehCaso ? makeCtx({ flags: snap.flags, ind: ind, dia: d }, idx, nome, porte, plano) : ctx;
        var info = { status: 'pendente', delta: null, opt: null, dec: null, contribs: idx.reuMap[t.id] || {} };
        if (t.type === 'decisao') {
          var rec = idx.decMap[t.id];
          if (rec) {
            var opt = resolveOption(t, ctxT, rec.opcao_id, rec.opcao_escolhida);
            var delta = applyFx(ind, opt.fx, opt.custo, porte);
            Object.assign(flags, opt.flags);
            info.status = 'concluida'; info.opt = opt; info.delta = delta; info.dec = rec;
            if (ehCaso) { info.caso = G.registroCaso(ctxT, d, t.paciente, rec.opcao_id); casos.push(info.caso); }
            dia.itens.push({ task: t, opt: opt, delta: delta, dec: rec });
          }
        } else if (isDone(t, idx)) {
          var dl = applyFx(ind, val(t.fx, ctx) || {}, 0, porte);
          info.status = 'concluida'; info.delta = dl;
          dia.itens.push({ task: t, delta: dl, contribs: idx.reuMap[t.id] });
        }
        tarefas[t.id] = info;
      });

      dia.indFim = clone(ind);
      dia.completo = doDia.every(function (t) { return isDone(t, idx); });
      if (!dia.completo) { diaAtual = d; break; }
      if (d === NDIAS) { diaAtual = NDIAS; finalizado = true; }
    }

    // Status das tarefas do dia atual e dos futuros
    var diaAberto = aguardandoLiberacao ? diaAtual : diaAtual;
    TASKS.forEach(function (t) {
      var info = tarefas[t.id] || { status: 'futura', contribs: {} };
      if (t.day > diaAberto) info.status = 'futura';
      else if (info.status !== 'concluida') {
        var reqOk = t.requires.every(function (rid) { var rt = taskById(rid); return rt && isDone(rt, idx); });
        info.status = reqOk ? 'disponivel' : 'aguardando';
        info.aguardando = reqOk ? [] : t.requires.filter(function (rid) { var rt = taskById(rid); return !(rt && isDone(rt, idx)); });
        if (t.type === 'reuniao' && reqOk && Object.keys(info.contribs || {}).length) info.status = 'em_andamento';
      }
      tarefas[t.id] = info;
    });

    // Placar (casos diários pesam metade de uma decisão)
    var roles = G.papeisDoPorte(porte);
    var qsum = 0, qn = 0, porPapel = {};
    roles.forEach(function (r) { porPapel[r] = { decisoes: 0, feitas: 0, q2: 0, q1: 0, q0: 0, qsum: 0, qn: 0, reunioes: 0, casos: 0, casosFeitos: 0 }; });
    TASKS.forEach(function (t) {
      var info = tarefas[t.id];
      if (t.type === 'decisao') {
        var p = porPapel[t.role]; if (!p) return;
        var peso = t.peso || 1, ehCaso = t.apresentacao === 'caso';
        if (ehCaso) p.casos++; else p.decisoes++;
        if (info.status === 'concluida') {
          if (ehCaso) p.casosFeitos++; else p.feitas++;
          var q = info.opt.q;
          if (q !== null && q !== undefined) { qsum += q * peso; qn += peso; p.qsum += q * peso; p.qn += peso; if (!ehCaso) p['q' + q]++; }
        }
      } else {
        t.roles.forEach(function (r) { if (porPapel[r] && info.contribs && info.contribs[r]) porPapel[r].reunioes++; });
      }
    });
    var qualidade = qn ? Math.round(qsum / (2 * qn) * 100) : 0;
    var nb = G.INDICATORS.filter(function (i) { return i.id !== 'orcamento'; });
    var saude = Math.round(nb.reduce(function (s, i) { return s + ind[i.id]; }, 0) / nb.length - (ind.orcamento < 0 ? 5 : 0));
    saude = Math.max(0, Math.min(100, saude));
    var indice = Math.round(0.6 * qualidade + 0.4 * saude);

    return {
      porte: porte, roles: roles, tasks: TASKS, plano: plano, historia: plano.historia, I0: plano.I0, ndias: NDIAS,
      ind: ind, flags: flags, dia: diaAtual, finalizado: finalizado, dias: dias,
      aguardandoLiberacao: aguardandoLiberacao, limiteDias: lim.limite, proximaLiberacao: aguardandoLiberacao ? lim.proxima : null,
      tarefas: tarefas, snaps: snaps, idx: idx, hospitalNome: nome, casos: casos, casosResumo: G.resumoCasos(casos),
      qualidade: qualidade, saude: saude, indice: indice, porPapel: porPapel
    };
  }

  /** Contexto (estado do hospital no momento da tarefa) para mostrar o enunciado. */
  function ctxFor(state, taskId) {
    var snap = state.snaps[taskId] || { flags: clone(state.flags), ind: clone(state.ind), casosResumo: state.casosResumo };
    return makeCtx({ flags: clone(snap.flags), ind: clone(snap.ind), semana: snap.semana, casosResumo: snap.casosResumo, dia: snap.dia }, state.idx, state.hospitalNome, state.porte, state.plano);
  }

  /** Texto da pergunta de uma reunião para uma função. */
  function promptDe(state, task, role) {
    var p = task.promptsPorPapel ? task.promptsPorPapel[role] : '';
    return val(p, ctxFor(state, task.id)) || '';
  }

  /** O que o jogador (com suas funções) pode fazer agora. */
  function pendentesDe(state, roles) {
    var out = [];
    state.tasks.forEach(function (t) {
      var info = state.tarefas[t.id];
      if (!info || (info.status !== 'disponivel' && info.status !== 'em_andamento')) return;
      if (t.type === 'decisao') {
        if (roles.indexOf(t.role) >= 0) out.push({ task: t, role: t.role });
      } else {
        t.roles.forEach(function (r) {
          if (roles.indexOf(r) < 0) return;
          if (info.contribs && info.contribs[r]) return;
          if (t.sequencial && r !== t.lider && !(info.contribs && info.contribs[t.lider])) return;
          out.push({ task: t, role: r });
        });
      }
    });
    return out;
  }

  /** Quem a tarefa está esperando (para a lista da equipe). */
  function esperandoPor(state, task) {
    var info = state.tarefas[task.id];
    if (!info) return [];
    if (info.status === 'aguardando') {
      return (info.aguardando || []).map(function (rid) {
        var rt = taskById(rid); return rt ? (rt.type === 'decisao' ? rt.role : rt.lider) : null;
      }).filter(Boolean);
    }
    if (task.type === 'decisao') return info.status === 'concluida' ? [] : [task.role];
    return task.roles.filter(function (r) { return !(info.contribs && info.contribs[r]); });
  }

  /** Registro do caso que o médico está prestes a decidir (para enviar à planilha). */
  function registroCaso(state, taskId, opcaoId) {
    var t = taskById(taskId); if (!t || t.apresentacao !== 'caso') return null;
    return G.registroCaso(ctxFor(state, taskId), t.day, t.paciente, opcaoId);
  }
  function leituraCaso(state, taskId) {
    var t = taskById(taskId); if (!t || t.apresentacao !== 'caso') return null;
    return G.leituraCaso(ctxFor(state, taskId), t.day, t.paciente);
  }
  function infoDia(state, n) { return G.infoDia(n, state ? { historia: state.historia, I0: state.I0 } : null); }

  function qLabel(q) { return G.Q_LABEL[q === undefined ? null : q]; }

  return {
    run: run, ctxFor: ctxFor, getOptions: getOptions, resolveOption: resolveOption,
    pendentesDe: pendentesDe, esperandoPor: esperandoPor, taskById: taskById, promptDe: promptDe,
    qLabel: qLabel, initialInd: initialInd, applyFx: applyFx,
    tarefasDoPorte: tarefasDoPorte, porteDoJogo: porteDoJogo, planoDoJogo: planoDoJogo,
    registroCaso: registroCaso, leituraCaso: leituraCaso, infoDia: infoDia, limiteDeDias: limiteDeDias,
    NDIAS: NDIAS
  };
})(window.GAME, window.CONFIG);
