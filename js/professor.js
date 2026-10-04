/* ==========================================================================
   PLANTÃO IA — painel do professor
   Lista os hospitais (grupos) e mostra o relatório completo de cada um,
   mesmo antes do fim do jogo. Os dados brutos ficam na planilha.
   ========================================================================== */
(function (G, E, UI, API, CFG) {
  'use strict';
  var esc = G.esc, ic = UI.ic;
  var P = { chave: '', lista: null, codigo: null, dados: null, st: null, carregando: false, historias: null };
  function nomeHistoria(k) { var H = G.HISTORIAS && G.HISTORIAS[k]; return H ? H.nome : (k || '—'); }
  try { P.chave = sessionStorage.getItem('plantaoia_prof') || ''; } catch (e) { }

  function toast(msg, tipo) {
    var el = document.createElement('div'); el.className = 'toast ' + (tipo || ''); el.innerHTML = msg;
    document.getElementById('toasts').appendChild(el);
    setTimeout(function () { el.classList.add('sai'); }, 4500);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 5200);
  }

  function janela(titulo, icone, corpo) {
    return '<section class="janela"><header class="janela-barra"><span class="janela-ic">' + ic(icone) + '</span><h2>' + titulo + '</h2></header><div class="janela-corpo">' + corpo + '</div></section>';
  }
  function topo() {
    return (API.demo ? '<div class="banner-demo">' + ic('info') + '<div><b>Modo demonstração.</b> Mostrando os hospitais criados neste navegador. Configure a URL do Apps Script em js/config.js para ver os grupos reais.</div></div>' : '') +
      '<header class="hud simples"><div class="hud-hotel"><img src="img/cdia-simbolo-branco.png" alt="" width="48" height="21"><div><b>Painel do professor</b><small>Plantão IA · CDIA.Saúde</small></div></div>' +
      '<div class="hud-acoes"><a class="btn mini" href="index.html">' + ic('hotel') + 'Ir para o jogo</a>' +
      (P.chave || API.demo ? '<button class="btn-hud" data-acao="sair" title="Sair">' + ic('sair', '', 24) + '</button>' : '') + '</div></header>';
  }

  function render() {
    var app = document.getElementById('app'), h = topo();
    if (!API.demo && !P.chave) h += vLogin();
    else if (P.codigo) h += vHospital();
    else h += vLista();
    app.innerHTML = h;
  }

  function vLogin() {
    return '<div class="prof" style="max-width:480px;margin-top:40px">' + janela('Acesso do professor', 'cadeado', '<form data-form="login">' +
      '<p class="suave">Digite a CHAVE_PROFESSOR definida no Code.gs do Apps Script.</p>' +
      '<label>Chave<input name="chave" type="password" required autocomplete="current-password"></label>' +
      '<button class="btn navy" type="submit">Entrar</button></form>') + '</div>';
  }

  function vLista() {
    var h = '<div class="prof"><section class="janela"><header class="janela-barra"><span class="janela-ic">' + ic('hotel') + '</span><h2>Hospitais (grupos)</h2></header><div class="janela-corpo"><div class="mural-topo"><p class="suave">Clique em um hospital para ver o relatório completo, inclusive durante o jogo. Notas e comentários vão nas colunas nota_professor e comentario_professor da planilha.</p>' +
      '<div class="filtros"><button class="btn mini" data-acao="recarregar">' + ic('refresh') + 'Atualizar</button></div></div>' +
      '<form data-form="codigo" style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-bottom:10px"><label style="flex:1;margin:0">Abrir pelo código<input name="codigo" maxlength="5" class="codigo-input" placeholder="K7Q2M"></label><button class="btn navy" type="submit">Abrir</button></form>';
    if (P.lista === null) return h + '<p class="vazio">Carregando…</p></div></section></div>';
    if (!P.lista.length) return h + '<p class="vazio">Nenhum hospital criado ainda.</p></div></section></div>';
    var est = { lobby: 'Sala de espera', em_jogo: 'Em jogo', finalizado: 'Finalizado' };
    var PT = { essencial: 'Essencial', regional: 'Regional', alta: 'Alta complex.' };
    var uso = {}; (G.HISTORIA_ORDEM || []).forEach(function (k) { uso[k] = 0; });
    P.lista.forEach(function (x) { if (x.historia && x.status !== 'lobby' && uso[x.historia] !== undefined) uso[x.historia]++; });
    h += '<div class="prof-historias">' + (G.HISTORIA_ORDEM || []).map(function (k) {
      var H = G.HISTORIAS[k];
      return '<span class="prof-hist" style="--c:' + H.cor + '">' + window.ARTE.icone(H.icone, 18) + '<b>' + esc(H.nome) + '</b><em>' + uso[k] + ' grupo' + (uso[k] === 1 ? '' : 's') + '</em></span>';
    }).join('') + '</div><p class="suave">O sorteio ao iniciar o plantão escolhe entre as histórias menos usadas. Antes de um grupo iniciar, você pode fixar a história dele.</p>';
    h += '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Código</th><th>Hospital</th><th>Porte</th><th>História</th><th>Situação</th><th>Dia</th><th>Jogadores</th><th>Registros</th><th>Casos</th><th>Falas</th><th>Coment.</th><th>Índice</th><th></th></tr></thead><tbody>' +
      P.lista.slice().reverse().map(function (x) {
        var hist = x.status === 'lobby' ? selHistoria(x.codigo, x.historia) : esc(nomeHistoria(x.historia));
        return '<tr><td><b>' + esc(x.codigo) + '</b></td><td>' + esc(x.nome_hospital) + '<br><small>por ' + esc(x.criado_por || '') + ' · ' + UI.quando(x.criado_em) + '</small></td><td>' + esc(PT[x.porte] || '—') + '</td><td>' + hist + '</td><td>' + esc(est[x.status] || x.status) + '</td>' +
          '<td>' + (x.dia_atual ? esc(x.dia_atual) + '/' + G.NDIAS : '—') + (Number(x.bonus_dias) ? '<br><small>+' + x.bonus_dias + ' liberados</small>' : '') + '</td>' +
          '<td>' + x.jogadores + '</td><td>' + x.decisoes + '</td><td>' + (x.casos || 0) + '</td><td>' + x.reunioes + '</td><td>' + x.comentarios + '</td><td>' + esc(x.indice_maturidade || '—') + '</td>' +
          '<td><button class="btn mini" data-acao="abrir" data-codigo="' + esc(x.codigo) + '">Abrir</button></td></tr>';
      }).join('') + '</tbody></table></div></div></section></div>';
    return h;
  }

  function selHistoria(codigo, atual) {
    return '<select data-acao-change="historia" data-codigo="' + esc(codigo) + '"><option value="">Sorteio equilibrado</option>' + (G.HISTORIA_ORDEM || []).map(function (k) {
      return '<option value="' + k + '"' + (atual === k ? ' selected' : '') + '>' + esc(G.HISTORIAS[k].nome) + '</option>';
    }).join('') + '</select>';
  }
  function vHospital() {
    var h = '<div class="prof"><div class="rel-acoes" style="justify-content:space-between"><button class="btn mini" data-acao="voltar">← Todos os hospitais</button>' +
      '<span><button class="btn mini" data-acao="atualizar">' + ic('refresh') + 'Atualizar</button> <button class="btn mini" data-acao="imprimir">' + ic('impressora') + 'Imprimir</button></span></div>';
    if (!P.dados) return h + '<p class="vazio">Carregando…</p></div>';
    var d = P.dados, hosp = d.hospital;
    if (hosp.status === 'lobby') {
      return h + janela(esc(hosp.nome_hospital) + ' (' + esc(hosp.codigo) + ')', 'hotel', '<p>Este grupo ainda está na sala de espera (' + d.jogadores.length + ' jogadores).</p>' +
        '<p><label>História (incidente) deste grupo: ' + selHistoria(hosp.codigo, hosp.historia) + '</label></p><p class="suave">Se ficar em “Sorteio equilibrado”, a história é sorteada quando o grupo iniciar o plantão. Os alunos não veem a história antes de o incidente começar.</p>' + jogadores(d)) + '</div>';
    }
    var st = P.st;
    var decs = (d.decisoes || []).filter(function (x) { return x.tipo === 'decisao'; });
    var palavras = decs.concat(d.reunioes || []).map(function (x) { return String(x.justificativa || x.contribuicao || '').trim().split(/\s+/).filter(Boolean).length; });
    var media = palavras.length ? Math.round(palavras.reduce(function (a, b) { return a + b; }, 0) / palavras.length) : 0;
    var H = G.HISTORIAS && G.HISTORIAS[st.historia], rc = st.casosResumo || {};
    var ritmo = st.finalizado ? '' : '<div class="prof-ritmo"><span>' + (st.aguardandoLiberacao ? 'Concluiu os dias liberados (até o dia ' + st.limiteDias + ').' : 'Liberados até o dia ' + st.limiteDias + '.') +
      ' Dias extras: <b>' + (Number(hosp.bonus_dias) || 0) + '</b></span> <button class="btn mini" data-acao="liberar" data-dias="3">Liberar +3 dias</button> <button class="btn mini" data-acao="liberar" data-dias="-3"' + (Number(hosp.bonus_dias) ? '' : ' disabled') + '>Retirar 3</button></div>';
    h += janela(esc(hosp.nome_hospital) + ' · ' + esc(hosp.codigo), 'hotel', '<p class="kicker">' + esc(G.PORTES[st.porte].nome) + ' · ' + (st.finalizado ? 'finalizado' : 'dia ' + st.dia + ' de ' + G.NDIAS) +
      (H ? ' · história: <b>' + esc(H.nome) + '</b> (incidente no dia ' + st.I0 + ')' : '') + '</p>' + ritmo +
      '<div class="rel-kpis"><div><b>' + decs.filter(function (x) { return !/^K\d+$/.test(x.tarefa_id); }).length + '/' + st.tasks.filter(function (t) { return t.type === 'decisao' && t.apresentacao !== 'caso'; }).length + '</b><span>decisões</span></div>' +
      '<div><b>' + (rc.n || 0) + '/21</b><span>casos testados<br><small>' + (rc.medicoAvaliados ? Math.round(rc.medicoAcertos / rc.medicoAvaliados * 100) + '% de condutas adequadas' : '—') + '</small></span></div>' +
      '<div><b>' + (d.reunioes || []).length + '</b><span>falas em reunião</span></div><div><b>' + (d.comentarios || []).length + '</b><span>comentários</span></div><div><b>' + media + '</b><span>palavras por<br>justificativa (média)</span></div></div>' +
      jogadores(d));
    var funcoes = (d.decisoes || []).filter(function (x) { return x.tipo === 'funcao'; });
    if (funcoes.length) {
      h += '<section class="rel-bloco"><h3>' + ic('users') + 'Escolha das funções</h3>' + funcoes.map(function (x) {
        return '<div class="rel-item" style="--c:' + (G.ROLES[x.funcao] || {}).cor + '"><header>' + UI.chipPapel(x.funcao, x.jogador) + '<b>' + (x.tarefa_id === 'TRANSFERENCIA' ? 'Transferência de função' : 'Assumiu a função') + '</b><small class="suave">' + UI.quando(x.timestamp) + '</small></header>' + UI.paragrafos(x.justificativa) + '</div>';
      }).join('') + '</section>';
    }
    h += '<div class="relatorio">' + UI.relatorio(st, d, { parcial: !st.finalizado }) + '</div>';
    if ((d.comentarios || []).length) {
      h += '<section class="rel-bloco"><h3>' + ic('message') + 'Comentários entre colegas</h3>' + d.comentarios.map(function (c) {
        var t = E.taskById(String(c.alvo_id).split(':')[0], st.porte);
        return '<div class="coment"><b>' + esc(c.jogador) + '</b> sobre <i>' + esc(t ? t.titulo : c.alvo_id) + '</i> <small>' + UI.quando(c.timestamp) + '</small><p>' + esc(c.comentario) + '</p></div>';
      }).join('') + '</section>';
    }
    return h + '</div>';
  }

  function jogadores(d) {
    return '<ul class="lista-jog" style="margin-top:10px">' + d.jogadores.map(function (j) {
      return '<li>' + UI.rosto(j, String(j.funcoes || '').split(',')[0], 34) + '<b>' + esc(j.nome) + '</b>' + String(j.funcoes || '').split(',').filter(Boolean).map(function (f) { return UI.chipPapel(f); }).join('') + '<small>visto ' + UI.quando(j.ultimo_acesso) + '</small></li>';
    }).join('') + '</ul>';
  }

  function carregarLista() {
    P.lista = null; render();
    API.chamar('professorListar', { chave: P.chave }).then(function (r) { P.lista = r.hospitais || []; render(); })
      .catch(function (e) {
        toast(esc(e.message), 'erro');
        if (/chave/i.test(e.message)) { P.chave = ''; try { sessionStorage.removeItem('plantaoia_prof'); } catch (x) { } }
        P.lista = []; render();
      });
  }

  function abrir(codigo) {
    P.codigo = codigo.toUpperCase(); P.dados = null; P.st = null; render();
    API.chamar('estado', { codigo: P.codigo }).then(function (d) {
      window.ARTE.registrar(d.jogadores);
      P.dados = d; P.st = d.hospital.status === 'lobby' ? null : E.run(d); render(); window.scrollTo(0, 0);
    }).catch(function (e) { toast(esc(e.message), 'erro'); P.codigo = null; render(); });
  }

  document.addEventListener('submit', function (ev) {
    var f = ev.target; ev.preventDefault();
    var v = new FormData(f);
    if (f.dataset.form === 'login') {
      P.chave = String(v.get('chave') || '').trim();
      try { sessionStorage.setItem('plantaoia_prof', P.chave); } catch (e) { }
      render(); carregarLista();
    } else if (f.dataset.form === 'codigo') {
      var c = String(v.get('codigo') || '').trim(); if (c) abrir(c);
    }
  });
  document.addEventListener('change', function (ev) {
    var el = ev.target; if (!el.dataset || el.dataset.acaoChange !== 'historia') return;
    var cod = el.dataset.codigo;
    API.chamar('professorDefinirHistoria', { chave: P.chave, codigo: cod, historia: el.value }).then(function () {
      toast('História de ' + esc(cod) + ': ' + esc(el.value ? nomeHistoria(el.value) : 'sorteio equilibrado') + '.', 'ok');
      if (P.codigo) abrir(P.codigo); else carregarLista();
    }).catch(function (e) { toast(esc(e.message), 'erro'); if (P.codigo) abrir(P.codigo); else carregarLista(); });
  });
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-acao]'); if (!el) return;
    switch (el.dataset.acao) {
      case 'abrir': abrir(el.dataset.codigo); break;
      case 'voltar': P.codigo = null; P.dados = null; render(); carregarLista(); break;
      case 'atualizar': abrir(P.codigo); break;
      case 'recarregar': carregarLista(); break;
      case 'imprimir': window.print(); break;
      case 'liberar':
        API.chamar('professorLiberarDias', { chave: P.chave, codigo: P.codigo, dias: Number(el.dataset.dias) }).then(function (r) {
          toast('Dias extras para ' + esc(P.codigo) + ': ' + r.bonus_dias + '.', 'ok'); abrir(P.codigo);
        }).catch(function (e) { toast(esc(e.message), 'erro'); });
        break;
      case 'sair': P.chave = ''; try { sessionStorage.removeItem('plantaoia_prof'); } catch (e) { } P.codigo = null; render(); break;
    }
  });

  render();
  if (API.demo || P.chave) carregarLista();
})(window.GAME, window.ENGINE, window.UI, window.API, window.CONFIG);
