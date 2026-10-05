/* ==========================================================================
   PLANTÃO IA — aplicação (telas, eventos, sincronização)
   ========================================================================== */
(function (G, E, UI, API, CFG, VIS, ARTE) {
  'use strict';
  var esc = G.esc, ic = UI.ic, px = ARTE.icone;
  var OBRIGATORIA = CFG.JUSTIFICATIVA_OBRIGATORIA !== false;

  var S = {
    sessao: null, dados: null, st: null, eu: null, papeis: [],
    aba: 'mapa', modal: null, virar: {}, indVistos: null, recem: null, transicao: false, labT: null, modalSig: '', drafts: {}, hash: '',
    filtro: { papel: '', dia: '' }, ocupado: false, timer: null, offline: false, zoom: 1, hojeFechado: false,
    primeira: true, prevDec: {}, prevPend: {}, progressoEnviando: false,
    avRasc: null, vestAba: 'rosto'
  };

  /* ---------------- armazenamento seguro ---------------- */
  function lsGet(k) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  function ssGet(k) { try { var v = sessionStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function ssSet(k, v) { try { if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  function salvarSessao(s) { S.sessao = s; ssSet('plantaoia_sessao', s); lsSet('plantaoia_ultima', s); }

  /* ---------------- utilidades ---------------- */
  function porte() { return S.st ? S.st.porte : E.porteDoJogo(S.dados || {}); }
  function nomePapel(r) { return G.papelInfo(r, porte()).nome; }
  function curtoPapel(r) { return G.ROLES[r] ? G.ROLES[r].curto : r; }
  function nomesPapeis(rs) { return rs.map(curtoPapel).join(', '); }
  function funcoesDe(j) { return String((j && j.funcoes) || '').split(',').filter(Boolean); }
  function palavras(t) { t = String(t || '').trim(); return t ? t.split(/\s+/).length : 0; }

  function janela(titulo, icone, corpo, o) {
    o = o || {};
    return '<section class="janela ' + (o.cls || '') + '"' + (o.cor ? ' style="--jc:' + o.cor + '"' : '') + (o.id ? ' id="' + o.id + '"' : '') + '>' +
      '<header class="janela-barra">' + (icone ? '<span class="janela-ic">' + px(icone, 18) + '</span>' : '') + '<h2>' + titulo + '</h2>' +
      (o.fechar ? '<button class="janela-x' + (o.simbolo ? ' minimizar' : '') + '" data-acao="' + o.fechar + '"' + (o.fecharAba ? ' data-aba="' + o.fecharAba + '"' : '') + ' title="' + (o.simbolo ? 'Recolher ou abrir' : 'Fechar') + '" aria-label="' + (o.simbolo ? 'Recolher ou abrir' : 'Fechar') + '">' + (o.simbolo || px('x', 12)) + '</button>' : '') +
      '</header><div class="janela-corpo">' + corpo + '</div></section>';
  }

  /* ---------------- notificações ---------------- */
  function toast(msg, tipo) {
    var box = document.getElementById('toasts');
    var el = document.createElement('div');
    el.className = 'toast ' + (tipo || '');
    el.innerHTML = msg;
    box.appendChild(el);
    while (box.children.length > 3) box.removeChild(box.firstChild);
    setTimeout(function () { el.classList.add('sai'); }, 4800);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 5400);
  }

  /* ---------------- sincronização ---------------- */
  function chamar(acao, payload) {
    return API.chamar(acao, Object.assign({ codigo: S.sessao && S.sessao.codigo, id_jogador: S.sessao && S.sessao.id_jogador }, payload || {}));
  }
  function atualizar() {
    if (!S.sessao) return Promise.resolve();
    return API.chamar('estado', { codigo: S.sessao.codigo, id_jogador: S.sessao.id_jogador }).then(function (d) {
      if (S.offline) { S.offline = false; toast(px('check', 18) + ' Conexão restabelecida.', 'ok'); }
      processar(d);
    }).catch(function (e) {
      if (/não encontrado/i.test(e.message)) { toast(esc(e.message), 'erro'); sair(true); return; }
      if (!S.offline) { S.offline = true; render(); }
    });
  }
  function agendar() {
    clearTimeout(S.timer);
    if (!S.sessao) return;
    var ms = document.hidden ? (CFG.POLL_OCULTO_MS || 60000) : (CFG.POLL_MS || 8000);
    S.timer = setTimeout(function () {
      if (S.st && S.st.aguardandoLiberacao && S.st.proximaLiberacao && Date.now() >= S.st.proximaLiberacao) S.hash = '';
      atualizar().then(agendar, agendar);
    }, ms);
  }
  function processar(d) {
    var h = JSON.stringify(d);
    if (h === S.hash && !S.primeira) return;
    S.hash = h;
    S.dados = d;
    ARTE.registrar(d.jogadores);
    S.eu = (d.jogadores || []).filter(function (j) { return j.id_jogador === S.sessao.id_jogador; })[0] || null;
    if (!S.eu) { toast('Você não está mais neste hospital.', 'erro'); sair(true); return; }
    S.papeis = funcoesDe(S.eu);
    S.st = d.hospital.status === 'lobby' ? null : E.run(d);
    notificar();
    render();
    renderModal(false);
    verificarMarcos();
    enviarProgresso();
    S.primeira = false;
  }
  function notificar() {
    var d = S.dados, novosDec = {}, novosPend = {};
    (d.decisoes || []).forEach(function (x) { if (x.tipo === 'decisao') novosDec['d:' + x.tarefa_id] = x; });
    (d.reunioes || []).forEach(function (x) { novosDec['r:' + x.reuniao_id + ':' + x.funcao] = x; });
    if (S.st) E.pendentesDe(S.st, S.papeis).forEach(function (p) { novosPend[p.task.id + ':' + p.role] = p; });
    if (!S.primeira) {
      Object.keys(novosDec).forEach(function (k) {
        if (S.prevDec[k]) return;
        var x = novosDec[k];
        if (x.id_jogador === S.sessao.id_jogador) return;
        var t = E.taskById(x.tarefa_id || x.reuniao_id, porte());
        toast(UI.rosto(x.jogador, x.funcao, 24) + '<span><b>' + esc(x.jogador) + '</b> ' + (k.charAt(0) === 'd' ? 'decidiu' : 'falou na reunião') + ': ' + esc(t ? t.titulo : '') + '</span>');
      });
      var mudouDia = S.st && S.diaAnterior && S.st.dia !== S.diaAnterior;
      if (!mudouDia) Object.keys(novosPend).forEach(function (k) {
        if (S.prevPend[k]) return;
        toast(px('sino', 24) + '<span>Nova tarefa para você: <b>' + esc(novosPend[k].task.titulo) + '</b></span>', 'destaque');
      });
    }
    S.prevDec = novosDec; S.prevPend = novosPend;
    S.diaAnterior = S.st ? S.st.dia : null;
  }
  function temCrise(dia) {
    var d = S.st && S.st.dias[dia];
    return !!(d && d.eventos.some(function (ev) { return /^e5_crise|_inicio$/.test(ev.id); }));
  }
  function info(n) { return E.infoDia(S.st, n); }
  function verificarMarcos() {
    if (!S.st || !S.dados || S.dados.hospital.status === 'lobby' || S.transicao || S.modal) return;
    var chave = S.sessao.codigo + '_' + S.sessao.id_jogador;
    var visto = lsGet('plantaoia_dia_' + chave) || 0;
    if (S.st.finalizado) {
      if (!lsGet('plantaoia_fim_' + chave)) {
        lsSet('plantaoia_fim_' + chave, 1);
        S.transicao = true;
        VIS.transicaoDia(G.NDIAS, 0, 'Prestação de contas', function () { S.transicao = false; abrirModal({ tipo: 'fim' }); });
      }
      return;
    }
    if (S.st.dia > visto) {
      var dia = S.st.dia;
      lsSet('plantaoia_dia_' + chave, dia);
      S.transicao = true;
      VIS.transicaoDia(visto, dia, info(dia).titulo, function () {
        S.transicao = false;
        abrirModal({ tipo: 'boletim', dia: dia });
        if (temCrise(dia)) VIS.alarme();
      });
      return;
    }
    if (S.st.aguardandoLiberacao && lsGet('plantaoia_pausa_' + chave) !== S.st.dia) {
      lsSet('plantaoia_pausa_' + chave, S.st.dia);
      abrirModal({ tipo: 'pausa' });
    }
  }
  function enviarProgresso() {
    if (!S.st || S.progressoEnviando) return;
    var h = S.dados.hospital;
    if (h.status === 'lobby') return;
    var precisa = S.st.dia > (Number(h.dia_atual) || 0) || (S.st.finalizado && h.status !== 'finalizado');
    if (!precisa) return;
    S.progressoEnviando = true;
    var rc = S.st.casosResumo || {};
    chamar('progresso', { dia: S.st.dia, finalizado: S.st.finalizado, indice: S.st.indice, qualidade: S.st.qualidade, saude: S.st.saude, indicadores: S.st.ind,
      historia: S.st.historia, casos: { testados: rc.n || 0, medico_acertos: rc.medicoAcertos || 0, modelo_acertos: rc.modeloAcertos || 0, discordou: rc.discordou || 0 } })
      .catch(function () { }).then(function () { S.progressoEnviando = false; });
  }
  function sair(silencioso) {
    clearTimeout(S.timer);
    ssSet('plantaoia_sessao', null);
    if (!silencioso) lsSet('plantaoia_ultima', null);
    S.sessao = null; S.dados = null; S.st = null; S.hash = ''; S.primeira = true; S.modal = null; S.aba = 'mapa';
    S.prevDec = {}; S.prevPend = {}; S.avRasc = null;
    render(); renderModal(true);
  }

  /* ---------------- rascunhos (ficam salvos neste navegador) ---------------- */
  function chaveRasc() { return S.sessao ? 'plantaoia_rasc_' + S.sessao.codigo + '_' + S.sessao.id_jogador : null; }
  var timerRasc = null;
  function guardarRascunhos() {
    clearTimeout(timerRasc);
    timerRasc = setTimeout(function () {
      var k = chaveRasc(); if (!k) return;
      var o = {};
      Object.keys(S.drafts).forEach(function (x) { if (x !== 'busca_glossario' && S.drafts[x]) o[x] = S.drafts[x]; });
      lsSet(k, Object.keys(o).length ? o : null);
    }, 600);
  }
  function salvarFoco() {
    var a = document.activeElement;
    if (a && a.dataset && a.dataset.draft) return { k: a.dataset.draft, s: a.selectionStart, e: a.selectionEnd };
    return null;
  }
  function restaurar(raiz, foco) {
    raiz.querySelectorAll('[data-draft]').forEach(function (el) {
      var k = el.dataset.draft;
      if (S.drafts[k] !== undefined && el.value !== S.drafts[k]) el.value = S.drafts[k];
      atualizarContador(k);
    });
    if (foco) {
      var el = raiz.querySelector('[data-draft="' + foco.k + '"]');
      if (el) { el.focus(); try { el.setSelectionRange(foco.s, foco.e); } catch (e) { } }
    }
    var busca = raiz.querySelector('[data-draft="busca_glossario"]');
    if (busca) filtrarGlossario(busca.value);
  }
  function atualizarContador(k) {
    var c = document.querySelector('[data-contador="' + k + '"]');
    if (!c) return;
    var n = palavras(S.drafts[k]);
    c.textContent = n ? n + (n === 1 ? ' palavra' : ' palavras') : 'nenhuma palavra ainda';
    c.parentNode.classList.toggle('ok', n > 0);
  }

  /* ---------------- render principal ---------------- */
  function render() {
    var app = document.getElementById('app');
    var foco = salvarFoco();
    var rolagem = {};
    app.querySelectorAll('[data-rolagem]').forEach(function (el) { rolagem[el.dataset.rolagem] = [el.scrollTop, el.scrollLeft]; });
    var html, antes = S.st && document.querySelector('.iso-mapa') ? VIS.posicoesAvatares() : null;
    if (!S.sessao) html = vHome();
    else if (!S.dados) html = vCarregando();
    else if (S.dados.hospital.status === 'lobby') html = vLobby();
    else html = vJogo();
    app.innerHTML = html;
    app.querySelectorAll('[data-rolagem]').forEach(function (el) { var r = rolagem[el.dataset.rolagem]; if (r) { el.scrollTop = r[0]; el.scrollLeft = r[1]; } });
    document.body.classList.toggle('em-jogo', !!(S.sessao && S.dados && S.dados.hospital.status !== 'lobby'));
    restaurar(app, foco);
    if (antes) VIS.animarCaminhadas(antes);
    animarInds();
    document.title = (S.dados ? S.dados.hospital.nome_hospital + ' · ' : '') + 'Plantão IA';
  }
  function animarInds() {
    if (!S.st || !S.dados || S.dados.hospital.status === 'lobby') { S.indVistos = null; return; }
    var atual = S.st.ind;
    if (!S.indVistos) { S.indVistos = JSON.parse(JSON.stringify(atual)); return; }
    if (S.modal || S.transicao) return;
    G.INDICATORS.forEach(function (i) {
      var de = S.indVistos[i.id], para = atual[i.id];
      if (de === undefined || de === para) return;
      var el = document.querySelector('[data-ind="' + i.id + '"]');
      if (!el) return;
      VIS.animarNumero(el, de, para, function (v) { return UI.fmtInd(i.id, v); });
      var tile = el.closest('.ind');
      if (tile) { tile.classList.remove('pisca-pos', 'pisca-neg'); void tile.offsetWidth; tile.classList.add(para > de ? 'pisca-pos' : 'pisca-neg'); }
      var d = para - de;
      VIS.flutuar(tile, i.curto + ' ' + (d > 0 ? '+' : '') + (i.id === 'orcamento' ? G.fmt(d) : Math.round(d)), d > 0);
    });
    S.indVistos = JSON.parse(JSON.stringify(atual));
  }
  function vCarregando() {
    return '<div class="carregando">' + VIS.nuvens(3) + '<div class="carregando-in">' + px('hotel', 48) + '<p>Abrindo o hospital…</p><div class="barra-carga"><i></i></div></div></div>';
  }
  function bannerDemo() {
    if (!API.demo) return '';
    return '<div class="banner-demo">' + px('ajuda', 18) + '<div><b>Modo demonstração.</b> Os dados ficam só neste navegador — para simular vários jogadores, abra este endereço em outras abas. ' +
      'Para jogar de verdade em grupo, configure a planilha (veja o README). <button class="link" data-acao="apagar-demo">Apagar dados de demonstração</button></div></div>';
  }

  /* ======================================================================
     TELA INICIAL (vista do hospital)
     ====================================================================== */
  function vHome() {
    var params = new URLSearchParams(location.search);
    var cod = (params.get('h') || '').toUpperCase();
    var ultima = lsGet('plantaoia_ultima');
    var h = bannerDemo() + '<header class="cdia-barra"><a href="' + CDIA.site + '" target="_blank" rel="noopener" class="cdia-logo"><img src="img/cdia-horizontal-branco.png" alt="CDIA.Saúde" width="140" height="35"></a>' +
      '<span>Especialização em Ciência de Dados e Inteligência Artificial Aplicadas à Saúde · UPE Caruaru</span></header><div class="home">';
    h += '<section class="hotel-vista">' + VIS.nuvens(6) + '<div class="hv-texto"><h1 class="logo">Plantão <span>IA</span></h1>' +
      '<p class="hv-sub">30 dias para decidir melhor</p><p class="hv-txt">Um jogo cooperativo para <b>2 a 5 pessoas</b>. Vocês assumem o programa de Inteligência Artificial de um hospital por um mês: escolhem modelos, testam o modelo em casos reais do plantão, enfrentam um incidente inesperado — e explicam o porquê de cada decisão.</p>' +
      (ultima && ultima.codigo ? '<button class="btn azul grande" data-acao="continuar">' + px('seta', 18) + 'Continuar como ' + esc(ultima.nome) + '</button><small class="hv-cont">' + esc(ultima.nome_hospital || ultima.codigo) + '</small>' : '') +
      '<a class="btn grande hv-video" href="#video-apresentacao"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>Ver como se joga (vídeo de 1 min)</a>' +
      '</div><div class="hv-predio">' + VIS.predio() + '</div></section>';
    h += '<div class="home-janelas">' +
      janela('Fundar um hospital', 'hotel', '<form data-form="criar"><p class="suave">Uma pessoa do grupo cria o hospital e compartilha o código.</p>' +
        '<label>Nome do hospital<input name="nome_hospital" maxlength="60" required placeholder="Ex.: Hospital Regional do Agreste"></label>' +
        '<label>Seu nome<input name="nome" maxlength="40" required placeholder="Como os colegas vão te ver"></label>' +
        '<button class="btn azul grande" type="submit">' + px('hotel', 18) + 'Criar hospital</button></form>', { cls: 'jan-form' }) +
      janela('Entrar em um hospital', 'equipe', '<form data-form="entrar"><p class="suave">Use o código que o colega compartilhou. Para voltar a um jogo, use o mesmo nome.</p>' +
        '<label>Código do hospital<input name="codigo" maxlength="5" required value="' + esc(cod) + '" placeholder="Ex.: K7Q2M" class="codigo-input"></label>' +
        '<label>Seu nome<input name="nome" maxlength="40" required placeholder="Como os colegas vão te ver"></label>' +
        '<button class="btn navy grande" type="submit">' + px('seta', 18) + 'Entrar</button></form>', { cls: 'jan-form' }) + '</div>';
    h += janela('Como se joga, em pouco mais de um minuto', 'tela', '<div class="video-apres">' +
      '<video controls preload="none" playsinline poster="video/capa.jpg" aria-describedby="transcricao-video">' +
      '<source src="video/plantao-ia-apresentacao.mp4" type="video/mp4">Seu navegador não reproduz vídeos. <a href="video/plantao-ia-apresentacao.mp4">Baixe o vídeo</a>.</video>' +
      '<details class="transcricao" id="transcricao-video"><summary>Ler a transcrição do vídeo</summary><p>' + esc(TRANSCRICAO_VIDEO) + '</p></details></div>', { cls: 'jan-larga', id: 'video-apresentacao' });
    h += janela('Três hospitais, conforme o tamanho da equipe', 'hotel', '<div class="portes">' + G.PORTE_ORDEM.map(function (k) {
      var Pt = G.PORTES[k];
      return '<article class="porte-card porte-' + k + '"><header><b>' + esc(Pt.nome) + '</b><span class="pill">' + esc(Pt.jogadores) + '</span></header><p>' + esc(Pt.resumo) + '</p>' +
        '<div class="porte-funcoes">' + Pt.papeis.map(function (r) { return '<span class="porte-av">' + UI.rosto(r + k, r, 28) + '<small>' + esc(curtoPapel(r)) + '</small></span>'; }).join('') + '</div></article>';
    }).join('') + '</div><p class="suave centro">O porte é definido automaticamente quando o jogo começa: quanto maior a equipe, mais setores, decisões e dependências.</p>', { cls: 'jan-larga' });
    h += janela('Como funciona', 'ajuda', '<div class="como-grid">' +
      passo('equipe', 'Escolham as funções', 'Gestão, Clínica, TI e — nos hospitais maiores — Bloco cirúrgico, Transplantes, Farmácia e Compras. Gestão e Clínica precisam ser pessoas diferentes.') +
      passo('calendario', '30 dias, no ritmo da equipe', 'O dia avança quando as tarefas do dia terminam — até 3 dias de jogo por dia do calendário.') +
      passo('grafico', 'Reunião a cada 7 dias', 'Cada função conta o que fez e o que propõe. A gestão escolhe as prioridades da semana seguinte.') +
      passo('medico', 'Um caso por dia', 'A partir do dia 9, o médico recebe um paciente da urgência por dia e decide se aceita ou não o que o modelo indica — e por quê.') +
      passo('alerta', 'O imprevisto', 'No meio do mês, cada hospital enfrenta um incidente diferente: surto, epidemia, ataque hacker, acidente… Os sinais aparecem antes no jornal.') +
      passo('balao', 'Toda decisão tem um porquê', 'Cada escolha pede uma justificativa — curta ou longa, do seu jeito. A equipe lê, comenta e discute nas reuniões. Tudo vai para a planilha do professor.') +
      passo('jornal', 'Casos reais', 'Cada decisão traz um caso verdadeiro de IA em hospitais — sepse, mamografia, transplante, farmácia, painéis — para conectar o jogo ao mundo real.') +
      passo('trofeu', 'Relatório final', 'No fim do dia 30, o relatório revela o que cada escolha causou, a boa prática de referência e o conceito por trás dela.') +
      '</div>', { cls: 'jan-larga' });
    return h + '</div>' + rodapeCdia();
  }
  var CDIA = { site: 'https://cdiasaude.upecaruaru.com.br/', instagram: 'https://www.instagram.com/cdia.saude/' };
  var TRANSCRICAO_VIDEO = 'Bem-vindo ao Plantão IA! Trinta dias de plantão num hospital que decidiu usar inteligência artificial. ' +
    'Vocês jogam em equipe, de 2 a 5 pessoas. Alguém cria o hospital e compartilha o código; cada um escolhe uma função, monta o avatar e pega o crachá. ' +
    'Todo dia surgem novas tarefas no mapa do hospital. Toda decisão pede uma justificativa: o porquê é o que mais importa. ' +
    'Na primeira semana, a equipe escolhe o modelo de IA que vai apoiar a triagem, compara sensibilidade e especificidade e ajusta o limiar do alerta. ' +
    'A partir do dia 9, chega um paciente por dia. O médico vê a ficha e o escore do modelo, e decide: aceita ou não o alerta? Depois vem o desfecho: acerto, alarme falso ou um caso grave que passou. ' +
    'A cada sete dias, a equipe se reúne, analisa a semana e define prioridades. ' +
    'Na terceira semana, uma crise testa tudo: dengue, enchente, surto respiratório, ataque cibernético, superbactéria ou acidente com múltiplas vítimas. ' +
    'Cada escolha mexe nos indicadores do hospital: segurança, eficiência, confiança, ética e LGPD, dados e orçamento. ' +
    'O Plantão IA faz parte da disciplina Fundamentos de Machine Learning: as decisões e as justificativas da equipe fazem parte da avaliação. ' +
    'Um modelo só é bom quando alguém decide melhor por causa dele. Bom plantão!';
  function rodapeCdia() {
    return '<footer class="rodape-cdia"><div class="rodape-in"><a href="' + CDIA.site + '" target="_blank" rel="noopener" class="cdia-logo"><img src="img/cdia-horizontal-branco.png" alt="CDIA.Saúde" width="180" height="45"></a>' +
      '<p>Conteúdo complementar da disciplina <b>Fundamentos de Machine Learning</b>, por <b>Prof. Kayo Henrique</b>.<small>Especialização em Ciência de Dados e Inteligência Artificial Aplicadas à Saúde · UPE Caruaru</small></p>' +
      '<nav class="rodape-links" aria-label="CDIA.Saúde nas redes"><a href="' + CDIA.instagram + '" target="_blank" rel="noopener" title="Instagram da CDIA.Saúde">' + px('camera', 24) + '<span>Instagram<small>@cdia.saude</small></span></a>' +
      '<a href="' + CDIA.site + '" target="_blank" rel="noopener" title="Site da CDIA.Saúde">' + px('globo', 24) + '<span>Site<small>cdiasaude.upecaruaru.com.br</small></span></a></nav></div></footer>';
  }
  function passo(icone, t, d) { return '<div class="passo">' + px(icone, 36) + '<b>' + esc(t) + '</b><p>' + esc(d) + '</p></div>'; }

  /* ======================================================================
     SALA DE ESPERA
     ====================================================================== */
  function hudSimples() {
    return '<header class="hud simples"><div class="hud-hotel">' + px('hotel', 24) + '<div><b>Plantão IA</b><small>' + esc(S.sessao.nome) + '</small></div></div>' +
      '<div class="hud-acoes"><button class="btn-hud" data-acao="ajuda" title="Como jogar">' + px('ajuda', 24) + '</button><button class="btn-hud" data-acao="sair" title="Sair">' + px('sair', 24) + '</button></div></header>';
  }
  function vLobby() {
    var d = S.dados, h = d.hospital, n = d.jogadores.length;
    var pt = G.porteDe(n), PT = G.PORTES[pt], papeis = PT.papeis;
    var dono = {};
    d.jogadores.forEach(function (j) { funcoesDe(j).forEach(function (f) { dono[f] = j; }); });
    var faltam = papeis.filter(function (r) { return !dono[r]; });
    var conflito = dono.gestao && dono.clinico && dono.gestao.id_jogador === dono.clinico.id_jogador;
    var comFuncao = d.jogadores.filter(function (j) { return funcoesDe(j).some(function (f) { return papeis.indexOf(f) >= 0; }); });
    var semCracha = comFuncao.filter(function (j) { return !ARTE.temAvatar(j); });
    var pode = !faltam.length && !conflito && n >= 2 && !semCracha.length;
    var link = location.origin + location.pathname + '?h=' + h.codigo;
    var tarefas = E.tarefasDoPorte(pt);
    var out = bannerDemo() + hudSimples() + '<div class="lobby">';
    out += janela('Sala de espera · ' + esc(h.nome_hospital), 'hotel',
      '<div class="lobby-topo"><div class="lobby-cena">' + VIS.cenaLobby(d.jogadores, S.sessao.id_jogador) + '</div>' +
      '<div class="lobby-info"><p class="kicker">Código do hospital</p><div class="codigo-grande">' + esc(h.codigo) + '</div>' +
      '<div class="lobby-botoes"><button class="btn" data-acao="copiar" data-texto="' + esc(h.codigo) + '">' + px('copiar', 18) + 'Copiar código</button>' +
      '<button class="btn" data-acao="copiar" data-texto="' + esc(link) + '">' + px('copiar', 18) + 'Copiar link</button></div>' +
      '<div class="porte-atual porte-' + pt + '"><span class="pill">' + n + ' de 5 jogadores</span><b>' + esc(PT.nome) + '</b><p>' + esc(PT.resumo) + '</p>' +
      '<small>' + (n < 5 ? 'Se entrar mais gente, o hospital cresce: ' + (n < 4 ? '4 jogadores → Regional; ' : '') + '5 → Alta Complexidade.' : 'Equipe completa: o hospital mais complexo do jogo.') + '</small></div>' +
      '<ul class="lista-jog">' + d.jogadores.map(function (j) {
        var fs = funcoesDe(j), fora = fs.filter(function (f) { return papeis.indexOf(f) < 0; }), tem = ARTE.temAvatar(j);
        return '<li>' + UI.rosto(j, fs[0] || '', 34) + '<b>' + esc(j.nome) + (j.id_jogador === S.sessao.id_jogador ? ' (você)' : '') + '</b> ' +
          (fs.length ? fs.filter(function (f) { return papeis.indexOf(f) >= 0; }).map(function (f) { return UI.chipPapel(f); }).join('') : '<span class="suave">sem função</span>') +
          (fora.length ? '<span class="pill espera" title="Esta função não existe neste porte">' + esc(nomesPapeis(fora)) + ' (fora deste porte)</span>' : '') +
          '<span class="pill ' + (tem ? 'feito' : 'espera') + '">' + px(tem ? 'cracha' : 'cabide', 14) + (tem ? 'crachá ok' : 'no vestiário') + '</span></li>';
      }).join('') + '</ul></div></div>', { cls: 'jan-larga' });
    out += chegada(papeis);
    out += janela('Escolham as funções', 'equipe', '<div class="papeis-grid" id="funcoes">' + papeis.map(function (r) {
      var R = G.ROLES[r], info = G.papelInfo(r, pt), j = dono[r], meu = j && j.id_jogador === S.sessao.id_jogador;
      var decs = tarefas.filter(function (t) { return t.type === 'decisao' && t.role === r; });
      var reus = tarefas.filter(function (t) { return t.type === 'reuniao' && t.roles.indexOf(r) >= 0; });
      return '<article class="papel' + (j ? ' ocupado' : '') + '" style="--c:' + R.cor + '"><div class="papel-av">' + ARTE.avatarSVG(j ? ARTE.aparencia(j, r) : ARTE.padrao('vaga-' + r, r), 116, { cracha: j && ARTE.temAvatar(j) ? R.cor : false }) + '</div>' +
        '<div class="papel-txt"><header><span class="papel-ic">' + px(UI.pxPapel(r), 22) + '</span><div><h3>' + esc(info.nome) + '</h3>' + (j ? '<span class="dono">' + (meu ? 'Você' : esc(j.nome)) + '</span>' : '<span class="livre">Vaga aberta</span>') + '</div></header>' +
        '<p>' + esc(info.missao) + '</p><p class="conc"><b>Conceitos:</b> ' + esc(info.conceitos) + '</p>' +
        '<details><summary>' + decs.length + ' decisões, ' + reus.length + ' reuniões' + (r === 'clinico' ? ' e 21 casos clínicos' : '') + ' + imprevistos</summary><ol>' +
        decs.map(function (t) { return '<li><small>Dia ' + t.day + '</small> ' + esc(t.titulo) + '</li>'; }).join('') +
        (r === 'clinico' ? '<li><small>Dias 9–29</small> Um caso da urgência por dia: aceitar ou não o que o modelo indica</li>' : '') +
        '<li><small>Semana 3</small> Decisões do incidente (sorteado ao iniciar)</li></ol></details>' +
        '<div class="papel-acoes">' + (meu ? '<button class="btn" data-acao="liberar" data-role="' + r + '">Liberar</button>' :
          (j ? '' : '<button class="btn verde" data-acao="assumir" data-role="' + r + '">Assumir esta função</button>')) + '</div></div></article>';
    }).join('') + '</div><p class="dica">' + px('ajuda', 18) + 'Com menos pessoas que funções, alguém acumula — é só assumir mais de uma.</p>', { cls: 'jan-larga' });
    out += janela('Pronto para o primeiro plantão?', 'estrela', '<div class="iniciar"><ul class="regras">' +
      regra(n >= 2, 'Pelo menos 2 jogadores') +
      regra(!faltam.length, 'Todas as ' + papeis.length + ' funções com responsável' + (faltam.length ? ' (faltam: ' + esc(nomesPapeis(faltam)) + ')' : '')) +
      regra(dono.gestao && dono.clinico && !conflito, 'Gestão e Clínica com pessoas diferentes') +
      regra(comFuncao.length && !semCracha.length, 'Todos com função já pegaram o crachá' + (semCracha.length ? ' (falta: ' + esc(semCracha.map(function (j) { return j.nome; }).join(', ')) + ')' : '')) + '</ul>' +
      '<button class="btn verde grande" data-acao="iniciar"' + (pode ? '' : ' disabled') + '>Iniciar o plantão ' + px('seta', 18) + '</button></div>', { cls: 'jan-larga' });
    return out + '</div>';
  }
  function regra(ok, txt) { return '<li class="' + (ok ? 'ok' : '') + '">' + px(ok ? 'check' : 'relogio', 20) + txt + '</li>'; }

  /** "Sua chegada ao hospital": nome → função → vestiário → crachá. */
  function chegada(papeis) {
    var temFuncao = S.papeis.some(function (r) { return papeis.indexOf(r) >= 0; }), tem = ARTE.temAvatar(S.eu);
    var etapas = [
      ['usuario', 'Nome', esc(S.sessao.nome), true],
      ['maleta', 'Função', temFuncao ? esc(nomesPapeis(S.papeis.filter(function (r) { return papeis.indexOf(r) >= 0; }))) : 'escolha abaixo', temFuncao],
      ['cabide', 'Vestiário', tem ? 'visual pronto' : 'monte seu avatar', tem],
      ['cracha', 'Crachá', tem ? 'na mão!' : 'retire na recepção', tem]
    ];
    var atual = etapas.filter(function (e) { return !e[3]; })[0];
    var passos = '<ol class="etapas">' + etapas.map(function (e, i) {
      return '<li class="' + (e[3] ? 'ok' : (e === atual ? 'atual' : '')) + '"><span class="etapa-ic">' + px(e[3] ? 'check' : e[0], 22) + '</span><span><small>' + (i + 1) + '. ' + e[1] + '</small><b>' + e[2] + '</b></span></li>';
    }).join('') + '</ol>';
    var lado;
    if (tem) {
      lado = '<div class="chegada-cracha"><button class="cracha-mini" data-acao="meu-cracha" title="Ver meu crachá">' + ARTE.cracha(dadosCracha(S.eu), { largura: 132 }) + '</button>' +
        '<div><b>Crachá na mão.</b><p class="suave">Seu visual aparece para a equipe no mapa do hospital.</p><button class="btn" data-acao="meu-cracha">' + px('cracha', 18) + 'Ver crachá</button> <button class="btn" data-acao="vestiario">' + px('cabide', 18) + 'Trocar visual</button></div></div>';
    } else if (!temFuncao) {
      lado = '<div class="chegada-cta"><p>Comece escolhendo sua função logo abaixo. Depois você passa no vestiário, monta seu avatar e retira o crachá.</p><a class="btn azul grande" href="#funcoes">' + px('maleta', 20) + 'Escolher função</a> <button class="btn" data-acao="vestiario">' + px('cabide', 18) + 'Adiantar o vestiário</button></div>';
    } else {
      lado = '<div class="chegada-cta"><p>Agora passe no vestiário: escolha pele, cabelo, roupa e acessórios. Depois é só retirar o crachá na recepção.</p><button class="btn verde grande pulsa" data-acao="vestiario">' + px('cabide', 20) + 'Ir ao vestiário</button></div>';
    }
    return janela('Sua chegada ao hospital', 'cracha', '<div class="chegada">' + passos + lado + '</div>', { cls: 'jan-larga jan-chegada' });
  }

  /* ======================================================================
     JOGO: HUD, palco (mapa) e dock
     ====================================================================== */
  function vJogo() {
    var st = S.st, h = S.dados.hospital, PT = G.PORTES[st.porte];
    var out = bannerDemo();
    out += '<header class="hud"><div class="hud-hotel">' + px('hotel', 28) + '<div><b>' + esc(h.nome_hospital) + '</b><small>' + esc(PT.nome) + ' · código ' + esc(h.codigo) + '</small></div></div>' +
      hudCalendario() +
      '<div class="hud-bolsa">' + bolsa() + '</div>' +
      '<button class="hud-eu" data-acao="meu-cracha" title="Meu crachá">' + UI.rosto(S.eu || S.sessao.nome, S.papeis[0] || '', 36) + '<div><b>' + esc(S.sessao.nome) + '</b><span>' + S.papeis.map(function (p) { return UI.chipPapel(p); }).join('') + '</span></div>' +
      '<span class="hud-cracha">' + px('cracha', 20) + '</span>' + (S.offline ? '<span class="offline" title="Sem conexão — tentando de novo">' + px('alerta', 18) + '</span>' : '') + '</button></header>';
    out += '<main class="palco">' + painelHoje() + '<div class="palco-mapa">' +
      '<div class="mapa-ferramentas"><button class="btn mini" data-acao="zoom" data-z="-1" title="Diminuir">−</button><button class="btn mini" data-acao="zoom" data-z="1" title="Ampliar">+</button>' +
      '<span class="legenda"><i class="lg vez">!</i>sua vez <i class="lg pendente">…</i>em andamento <i class="lg feito">✓</i>feito hoje</span></div>' +
      '<div class="mapa-scroll" data-rolagem="mapa" style="--zoom:' + S.zoom + '">' + VIS.mapa(st, S.dados, S.papeis, S.sessao.id_jogador) + '</div>' +
      salasLista() + '</div>';
    if (S.aba !== 'mapa') out += abaJanela();
    out += '</main>';
    out += dock();
    return out;
  }

  function hudCalendario() {
    var st = S.st, I = info(st.dia), N = G.NDIAS;
    var feitos = st.finalizado ? N : (st.aguardandoLiberacao ? st.dia : st.dia - 1);
    var marcas = G.DIAS_REUNIAO.map(function (d) { return '<span class="hud-marca' + (d <= feitos ? ' ok' : '') + '" style="left:' + (d / N * 100) + '%" title="Reunião da semana ' + (d / 7) + ' (dia ' + d + ')"></span>'; }).join('');
    var txt = st.finalizado ? 'Plantão encerrado' : (I.semana <= 4 ? 'Semana ' + I.semana : 'Fechamento') + ' · Dia ' + st.dia + '/' + N;
    var sub = st.finalizado ? '30 dias concluídos' : (st.aguardandoLiberacao ? 'Dia concluído · o próximo abre amanhã' : I.titulo);
    return '<div class="hud-cal" title="' + esc(txt + ' — ' + sub) + '"><div class="hud-cal-top">' + px('calendario', 20) + '<b>' + esc(txt) + '</b></div>' +
      '<i class="hud-prog"><b style="width:' + (feitos / N * 100) + '%"></b>' + marcas + '</i><small>' + esc(sub) + '</small></div>';
  }

  function bolsa() {
    var st = S.st, base = st.dias[st.dia] ? st.dias[st.dia].indInicio : E.initialInd(st.porte), ini = E.initialInd(st.porte);
    return G.INDICATORS.map(function (i) {
      var v = st.ind[i.id], d = v - base[i.id];
      var pct = i.id === 'orcamento' ? Math.max(0, Math.min(100, v / ini.orcamento * 100)) : v;
      var nivel = i.id === 'orcamento' ? (v < 0 ? 'baixo' : pct < 15 ? 'medio' : 'alto') : (v < 35 ? 'baixo' : v < 60 ? 'medio' : 'alto');
      return '<button class="ind ' + nivel + '" data-acao="aba" data-aba="indicadores" title="' + esc(i.nome + ': ' + i.desc) + '">' + px(i.icone, 18) +
        '<span class="ind-txt"><small>' + esc(i.curto) + '</small><span class="ind-num" data-ind="' + i.id + '">' + UI.fmtInd(i.id, v) + '</span></span>' +
        (d ? '<em class="' + (d > 0 ? 'pos' : 'neg') + '">' + (d > 0 ? '▲' : '▼') + '</em>' : '') + '<i class="ind-barra"><b style="width:' + pct + '%"></b></i></button>';
    }).join('');
  }

  function dock() {
    var pend = E.pendentesDe(S.st, S.papeis).length;
    var itens = [['mapa', 'hotel', 'Hospital', 0], ['tarefas', 'prancheta', 'Tarefas', pend], ['mural', 'balao', 'Mural', 0], ['equipe', 'equipe', 'Equipe', 0],
      ['indicadores', 'grafico', 'Indicadores', 0], ['casos', 'jornal', 'Casos reais', 0], ['glossario', 'livro', 'Glossário', 0], ['relatorio', S.st.finalizado ? 'trofeu' : 'cadeado', 'Relatório', 0]];
    return '<nav class="dock" aria-label="Menu do jogo">' + itens.map(function (a) {
      return '<button class="' + (S.aba === a[0] ? 'ativa' : '') + '" data-acao="aba" data-aba="' + a[0] + '" aria-pressed="' + (S.aba === a[0]) + '">' + px(a[1], 24) + '<span>' + a[2] + '</span>' +
        (a[3] ? '<b class="contagem">' + a[3] + '</b>' : '') + '</button>';
    }).join('') + '<span class="dock-sep"></span><button data-acao="ajuda">' + px('ajuda', 24) + '<span>Ajuda</span></button><button data-acao="sair">' + px('sair', 24) + '<span>Sair</span></button></nav>';
  }

  /* ---- painel "Plantão de hoje" ---- */
  function painelHoje() {
    var st = S.st, D = info(st.dia);
    var doDia = st.tasks.filter(function (t) { return t.day === st.dia; });
    var feitas = doDia.filter(function (t) { return st.tarefas[t.id].status === 'concluida'; }).length;
    var pend = E.pendentesDe(st, S.papeis);
    var c;
    if (st.finalizado) {
      c = '<div class="hoje-dia fim">' + px('trofeu', 36) + '<div><b>Plantão encerrado</b><small>O relatório final mostra o que cada decisão causou.</small></div></div>' +
        '<button class="btn verde grande" data-acao="aba" data-aba="relatorio">' + px('trofeu', 18) + 'Ver relatório final</button>';
    } else if (st.aguardandoLiberacao) {
      c = '<div class="hoje-dia pausa">' + px('relogio', 36) + '<div><b>Dia ' + st.dia + ' concluído!</b><small>O dia ' + (st.dia + 1) + ' abre ' + quandoAbre() + '.</small></div></div>' +
        '<p class="hoje-sub">' + px('calendario', 18) + 'Ritmo do plantão</p><p class="suave">Até ' + (CFG.DIAS_POR_DIA_REAL || 3) + ' dias de jogo por dia do calendário. Enquanto isso, leia as justificativas no <button class="link" data-acao="aba" data-aba="mural">Mural</button>, comente e reveja os casos.</p>' +
        '<button class="btn grande" data-acao="boletim" data-dia="' + st.dia + '">' + px('jornal', 18) + 'Jornal do dia ' + st.dia + '</button>';
    } else {
      c = '<div class="hoje-dia"><span class="hoje-num"><small>DIA</small>' + st.dia + '</span><div><b>' + esc(D.titulo) + '</b><small>' + (D.semana <= 4 ? 'Semana ' + D.semana + ' · ' : '') + esc(D.fase) + '</small></div></div>' +
        '<div class="progresso"><i style="width:' + Math.round(feitas / doDia.length * 100) + '%"></i></div><small class="suave">' + feitas + ' de ' + doDia.length + ' tarefas do dia concluídas</small>';
      if (pend.length) {
        c += '<p class="hoje-sub">' + px('estrela', 18) + 'Sua vez</p><div class="hoje-lista">' + pend.map(function (p) {
          var R = G.ROLES[p.role];
          return '<button class="hoje-item vez" style="--c:' + R.cor + '" data-acao="abrir" data-id="' + p.task.id + '">' + px(p.task.type === 'reuniao' ? 'balao' : UI.pxPapel(p.role), 24) +
            '<span><small>' + esc(p.task.type === 'reuniao' ? 'Reunião' : G.nomeSetor(p.task.setor, st.porte)) + '</small>' + esc(p.task.titulo) + '</span></button>';
        }).join('') + '</div>';
      } else {
        var esperando = [];
        doDia.forEach(function (t) { if (st.tarefas[t.id].status !== 'concluida') E.esperandoPor(st, t).forEach(function (r) { if (esperando.indexOf(r) < 0) esperando.push(r); }); });
        c += '<p class="hoje-sub">' + px('relogio', 18) + 'Aguardando os colegas</p><div class="hoje-espera">' + esperando.map(function (r) {
          var j = st.idx.holder[r];
          return '<span class="esp-item">' + UI.rosto(j ? j.nome : r, r, 24) + '<span><b>' + esc(j ? j.nome : '—') + '</b><small>' + esc(curtoPapel(r)) + '</small></span></span>';
        }).join('') + '</div><p class="dica">' + px('balao', 18) + 'Enquanto isso, leia as justificativas no <button class="link" data-acao="aba" data-aba="mural">Mural</button> e comente.</p>';
      }
      c += '<button class="btn grande" data-acao="boletim" data-dia="' + st.dia + '">' + px('jornal', 18) + 'Jornal do dia</button>';
    }
    return '<aside class="painel-hoje' + (S.hojeFechado ? ' fechado' : '') + '">' + janela('Plantão de hoje' + (pend.length ? ' <span class="contagem">' + pend.length + '</span>' : ''), 'prancheta', c, { cls: 'jan-hoje', fechar: 'hoje-toggle', simbolo: S.hojeFechado ? '+' : '−' }) + '</aside>';
  }

  function quandoAbre() {
    var t = S.st && S.st.proximaLiberacao; if (!t) return 'em breve';
    var d = new Date(t), hoje = new Date();
    var amanha = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1).getTime();
    return d.getTime() <= amanha ? 'amanhã, à meia-noite' : 'em ' + d.toLocaleDateString('pt-BR');
  }

  var STATUS_SALA = { vez: ['vez', 'Sua vez'], pendente: ['pendente', 'Em andamento'], espera: ['espera', 'Aguardando'], feito: ['feito', 'Feito hoje'], crise: ['crise', 'Crise!'] };
  function salasLista() {
    var st = S.st, PT = G.PORTES[st.porte];
    return '<div class="salas-lista">' + PT.salas.map(function (k) {
      var papel = VIS.papelDaSala(k, st.porte), j = papel ? st.idx.holder[papel] : null;
      var stt = VIS.statusSala(st, k, S.papeis); if (VIS.emCrise(st) === k && stt !== 'vez') stt = 'crise';
      var pill = stt ? '<span class="pill ' + STATUS_SALA[stt][0] + '">' + STATUS_SALA[stt][1] + '</span>' : '<span class="pill futura">sem tarefas hoje</span>';
      return '<button class="sala-card" style="--c:' + VIS.corSala(k, st.porte) + '" data-acao="sala" data-sala="' + k + '">' + px(papel ? UI.pxPapel(papel) : 'balao', 24) +
        '<span class="sala-card-txt"><b>' + esc(G.nomeSetor(k, st.porte)) + '</b><small>' + (papel ? esc(curtoPapel(papel)) + ' · ' + esc(j ? j.nome : 'sem responsável') : 'Reuniões da equipe') + '</small></span>' + pill + '</button>';
    }).join('') + '</div>';
  }

  function abaJanela() {
    var defs = {
      tarefas: ['Tarefas', 'prancheta', aTarefas], mural: ['Mural de decisões', 'balao', aMural], equipe: ['Equipe', 'equipe', aEquipe],
      indicadores: ['Indicadores do hospital', 'grafico', aIndicadores], casos: ['Casos reais de IA em hospitais', 'jornal', aCasos],
      glossario: ['Glossário', 'livro', aGlossario], relatorio: ['Relatório final', 'trofeu', aRelatorio]
    };
    var d = defs[S.aba]; if (!d) return '';
    return '<div class="aba-camada">' + janela(d[0], d[1], d[2](), { cls: 'jan-aba' + (S.animarAba ? ' anim' : ''), fechar: 'aba', fecharAba: 'mapa', id: 'jan-aba' }).replace('<div class="janela-corpo">', '<div class="janela-corpo" data-rolagem="aba-' + S.aba + '">') + '</div>';
  }

  /* ---- Tarefas ---- */
  function statusMeu(t, role) {
    var info = S.st.tarefas[t.id];
    if (info.status === 'concluida') return { cls: 'feito', txt: 'Concluída', acao: 'Ver' };
    if (info.status === 'futura') return { cls: 'futura', txt: 'Dia ' + t.day, acao: '' };
    if (t.type === 'reuniao') {
      if (info.contribs && info.contribs[role]) return { cls: 'espera', txt: 'Você já falou · aguardando ' + nomesPapeis(E.esperandoPor(S.st, t)), acao: 'Abrir' };
      if (info.status === 'aguardando') return { cls: 'espera', txt: textoAguardando(t), acao: 'Abrir' };
      if (t.sequencial && role !== t.lider && !(info.contribs && info.contribs[t.lider])) return { cls: 'espera', txt: 'Aguardando a fala de ' + curtoPapel(t.lider), acao: 'Abrir' };
      return { cls: 'vez', txt: 'Sua vez de falar', acao: 'Participar' };
    }
    if (info.status === 'aguardando') return { cls: 'espera', txt: textoAguardando(t), acao: 'Abrir' };
    return { cls: 'vez', txt: 'Sua vez', acao: 'Decidir' };
  }
  function textoAguardando(t) {
    var info = S.st.tarefas[t.id];
    var minhas = (info.aguardando || []).map(function (id) { return E.taskById(id, porte()); }).filter(function (rt) {
      return rt && (rt.type === 'decisao' ? S.papeis.indexOf(rt.role) >= 0 : rt.roles.some(function (r) { return S.papeis.indexOf(r) >= 0; }));
    });
    if (minhas.length) return 'Faça antes: ' + minhas[0].titulo;
    return 'Aguardando ' + nomesPapeis(E.esperandoPor(S.st, t));
  }
  function statusOutro(t) {
    var info = S.st.tarefas[t.id];
    if (info.status === 'concluida') return { cls: 'feito', txt: 'Concluída' + (info.dec ? ' por ' + info.dec.jogador : ''), acao: 'Ver' };
    if (info.status === 'aguardando') return { cls: 'espera', txt: 'Aguardando ' + nomesPapeis(E.esperandoPor(S.st, t)), acao: 'Abrir' };
    return { cls: 'pendente', txt: 'Pendente: ' + nomesPapeis(E.esperandoPor(S.st, t)), acao: 'Abrir' };
  }
  function cartaoTarefa(t, role, stt) {
    var R = G.ROLES[role];
    return '<button class="tarefa ' + stt.cls + '" style="--c:' + R.cor + '" data-acao="abrir" data-id="' + t.id + '">' +
      '<span class="tarefa-ic">' + px(t.type === 'reuniao' ? 'balao' : UI.pxPapel(role), 24) + '</span>' +
      '<span class="tarefa-txt"><small>' + esc(t.type === 'reuniao' ? 'Reunião · ' + curtoPapel(role) : G.nomeSetor(t.setor, porte())) + ' · ' + esc(t.fase) + '</small><b>' + esc(t.titulo) + '</b>' +
      (t.estrutural ? '<em class="estrutural">' + px('estrela', 12) + 'Decisão estrutural</em>' : '') + '</span>' +
      '<span class="tarefa-st"><span class="pill ' + stt.cls + '">' + esc(stt.txt) + '</span>' + (stt.acao ? '<span class="tarefa-acao">' + esc(stt.acao) + ' ' + px('seta', 12) + '</span>' : '') + '</span></button>';
  }
  function aTarefas() {
    var st = S.st, out = '';
    var doDia = st.tasks.filter(function (t) { return t.day === st.dia; });
    if (!st.finalizado) {
      var D = info(st.dia);
      out += '<div class="dia-faixa"><span class="hoje-num"><small>DIA</small>' + st.dia + '</span><div><b>' + esc(D.titulo) + '</b><p>' + esc(D.resumo) + '</p></div></div>';
      if (st.aguardandoLiberacao) out += '<p class="aviso">' + px('relogio', 18) + 'Dia ' + st.dia + ' concluído. O dia ' + (st.dia + 1) + ' abre ' + quandoAbre() + '.</p>';
      var minhas = [];
      doDia.forEach(function (t) {
        if (t.type === 'decisao') { if (S.papeis.indexOf(t.role) >= 0) minhas.push([t, t.role]); }
        else t.roles.forEach(function (r) { if (S.papeis.indexOf(r) >= 0) minhas.push([t, r]); });
      });
      out += '<h3 class="titulo-sec">' + px('estrela', 18) + 'Suas tarefas de hoje</h3>';
      if (!minhas.length) out += '<p class="vazio">Nenhuma tarefa para as suas funções hoje. Aproveite para ler e comentar o Mural.</p>';
      else out += '<div class="tarefas">' + minhas.map(function (m) { return cartaoTarefa(m[0], m[1], statusMeu(m[0], m[1])); }).join('') + '</div>';
      var outras = doDia.filter(function (t) { return t.type === 'decisao' ? S.papeis.indexOf(t.role) < 0 : t.roles.some(function (r) { return S.papeis.indexOf(r) < 0; }); });
      if (outras.length) {
        out += '<h3 class="titulo-sec">' + px('equipe', 18) + 'A equipe hoje</h3><ul class="linhas">' + outras.map(function (t) {
          var info = st.tarefas[t.id], role = t.type === 'decisao' ? t.role : t.lider, s = statusOutro(t);
          return '<li><button class="link-linha" data-acao="abrir" data-id="' + t.id + '">' + UI.chipPapel(role, t.type === 'reuniao' ? 'reunião' : '') + '<span>' + esc(t.titulo) + '</span><span class="pill ' + s.cls + '">' + esc(s.txt) + '</span></button></li>';
        }).join('') + '</ul>';
      }
    }
    var ult = st.finalizado ? G.NDIAS : (st.aguardandoLiberacao ? st.dia : st.dia - 1);
    if (ult >= 1) {
      out += '<h3 class="titulo-sec">' + px('relogio', 18) + 'Dias anteriores</h3>';
      for (var d = ult; d >= 1; d--) {
        if (d === ult || d % 7 === 0) out += '<p class="semana-sep">' + (G.semanaDe(d) <= 4 ? 'Semana ' + G.semanaDe(d) : 'Fechamento') + '</p>';
        out += '<details class="dia-ant"' + (d === ult ? ' open' : '') + '><summary>Dia ' + d + ' — ' + esc(info(d).titulo) + '</summary><ul class="linhas">' +
          st.tasks.filter(function (t) { return t.day === d; }).map(function (t) {
            var info = st.tarefas[t.id], role = t.type === 'decisao' ? t.role : t.lider;
            var e2 = t.type === 'decisao' && info.opt ? '<span class="escolha">' + esc(info.opt.label) + '</span>' : '<span class="escolha">Reunião concluída</span>';
            return '<li><button class="link-linha" data-acao="abrir" data-id="' + t.id + '">' + UI.chipPapel(role) + '<span>' + esc(t.titulo) + '</span>' + e2 + '</button></li>';
          }).join('') + '</ul></details>';
      }
    }
    return out;
  }

  /* ---- Mural ---- */
  function comentariosDe(tipo, id) { return (S.dados.comentarios || []).filter(function (c) { return c.alvo_tipo === tipo && c.alvo_id === id; }); }
  function blocoComentarios(tipo, id, funcao) {
    var cs = comentariosDe(tipo, id), k = 'com_' + tipo + '_' + id;
    return '<div class="comentarios">' + cs.map(function (c) {
      return '<div class="coment">' + UI.rosto(c.jogador, funcoesDe({ funcoes: c.funcao_autor })[0] || '', 24) + '<div><b>' + esc(c.jogador) + '</b> <small>' + UI.quando(c.timestamp) + '</small><p>' + esc(c.comentario) + '</p></div></div>';
    }).join('') +
      '<div class="coment-form"><textarea rows="1" data-draft="' + k + '" placeholder="Comente, pergunte ou discorde com argumentos…"></textarea>' +
      '<button class="btn" data-acao="comentar" data-tipo="' + tipo + '" data-alvo="' + esc(id) + '" data-funcao="' + esc(funcao || '') + '">Comentar</button></div></div>';
  }
  function aMural() {
    var d = S.dados, st = S.st, itens = [], f = S.filtro;
    (d.decisoes || []).forEach(function (x) {
      var t = E.taskById(x.tarefa_id, st.porte);
      itens.push({ ts: x.timestamp, tipo: x.tipo === 'decisao' ? 'decisao' : 'funcao', x: x, t: t, papel: x.funcao, dia: t ? t.day : 0 });
    });
    (d.reunioes || []).forEach(function (x) {
      var t = E.taskById(x.reuniao_id, st.porte);
      itens.push({ ts: x.timestamp, tipo: 'reuniao', x: x, t: t, papel: x.funcao, dia: t ? t.day : 0 });
    });
    itens.sort(function (a, b) { return new Date(b.ts) - new Date(a.ts); });
    var vis = itens.filter(function (i) { return (!f.papel || i.papel === f.papel) && (!f.dia || String(i.dia) === String(f.dia)); });
    var out = '<div class="mural-topo"><p class="suave">Todas as escolhas e justificativas da equipe. Leia, comente e discorde com argumentos — os comentários também vão para a planilha.</p>' +
      '<div class="filtros"><select data-acao-change="filtro-papel"><option value="">Todas as funções</option>' +
      st.roles.map(function (r) { return '<option value="' + r + '"' + (f.papel === r ? ' selected' : '') + '>' + esc(curtoPapel(r)) + '</option>'; }).join('') + '</select>' +
      '<select data-acao-change="filtro-dia"><option value="">Todos os dias</option>' +
      Array.apply(null, { length: G.NDIAS + 1 }).map(function (x, n) { return '<option value="' + n + '"' + (String(f.dia) === String(n) ? ' selected' : '') + '>' + (n ? 'Dia ' + n : 'Escolha de funções') + '</option>'; }).join('') + '</select></div></div>';
    if (!vis.length) return out + '<p class="vazio">Nada por aqui ainda.</p>';
    out += '<div class="mural">' + vis.map(function (i) {
      var x = i.x, R = G.ROLES[i.papel] || { cor: '#888' };
      var cab = '<header>' + UI.rosto(x.jogador, i.papel, 32) + '<div><b>' + esc(x.jogador) + '</b> ' + UI.chipPapel(i.papel) + '<small>' + (i.dia ? 'Dia ' + i.dia + ' · ' : '') + UI.quando(i.ts) + '</small></div></header>';
      if (i.tipo === 'funcao') return '<article class="post funcao" style="--c:' + R.cor + '">' + cab + '<p class="post-titulo">' + (x.tarefa_id === 'TRANSFERENCIA' ? 'Assumiu a função durante o jogo' : 'Assumiu a função') + '</p><div class="post-just">' + UI.paragrafos(x.justificativa) + '</div></article>';
      if (i.tipo === 'decisao') {
        var info = st.tarefas[x.tarefa_id] || {};
        return '<article class="post" style="--c:' + R.cor + '">' + cab + '<button class="post-titulo link" data-acao="abrir" data-id="' + esc(x.tarefa_id) + '">' + esc(i.t ? i.t.titulo : x.tarefa_id) + '</button>' +
          '<p class="post-escolha">' + px('check', 18) + esc(info.opt ? info.opt.label : x.opcao_escolhida) + '</p><div class="post-just">' + UI.paragrafos(x.justificativa) + '</div>' +
          (info.opt && info.opt.consequencia ? '<p class="post-cons"><b>Consequência:</b> ' + esc(info.opt.consequencia) + ' ' + UI.deltas(info.delta, true) + '</p>' : '') +
          blocoComentarios('decisao', x.tarefa_id, x.funcao) + '</article>';
      }
      var alvo = x.reuniao_id + ':' + x.funcao;
      return '<article class="post reuniao" style="--c:' + R.cor + '">' + cab + '<button class="post-titulo link" data-acao="abrir" data-id="' + esc(x.reuniao_id) + '">' + px('balao', 18) + esc(i.t ? i.t.titulo : x.reuniao_id) + '</button>' +
        '<div class="post-just">' + UI.paragrafos(x.contribuicao) + '</div>' + blocoComentarios('reuniao', alvo, x.funcao) + '</article>';
    }).join('') + '</div>';
    return out;
  }

  /* ---- Equipe ---- */
  function aEquipe() {
    var d = S.dados, st = S.st, dono = st.idx.holder;
    var out = '<p class="suave">O quadro de crachás da equipe. Clique no seu para baixar ou trocar o visual.</p><div class="quadro-equipe">' + d.jogadores.map(function (j) {
      var fs = funcoesDe(j), on = VIS.online(j), tem = ARTE.temAvatar(j), eu = j.id_jogador === S.sessao.id_jogador;
      var cartao = tem ? ARTE.cracha(dadosCracha(j), { largura: 168 }) :
        '<div class="cracha-vazio">' + ARTE.avatarSVG(ARTE.aparencia(j, fs[0] || ''), 120) + '<b>' + esc(j.nome) + '</b><small>ainda sem crachá</small></div>';
      return '<div class="membro' + (eu ? ' eu' : '') + '">' + (eu ? '<button class="cracha-mini" data-acao="meu-cracha" title="Meu crachá">' + cartao + '</button>' : cartao) +
        '<span class="ponto ' + (on ? 'on' : '') + '">' + (on ? 'online agora' : 'visto ' + UI.quando(j.ultimo_acesso)) + '</span></div>';
    }).join('') + '</div>';
    out += '<h3 class="titulo-sec">' + px('maleta', 20) + 'Funções e andamento</h3><div class="papeis-grid compacto">' + st.roles.map(function (r) {
      var R = G.ROLES[r], p = st.porPapel[r], j = dono[r], meu = S.papeis.indexOf(r) >= 0, info = G.papelInfo(r, st.porte);
      return '<article class="papel compacto" style="--c:' + R.cor + '"><div class="papel-txt"><header><span class="papel-ic">' + px(UI.pxPapel(r), 22) + '</span><div><h3>' + esc(info.nome) + '</h3><span class="dono">' + (j ? esc(j.nome) : 'sem responsável') + '</span></div></header>' +
        '<div class="progresso"><i style="width:' + (p.decisoes ? Math.round(p.feitas / p.decisoes * 100) : 0) + '%"></i></div><small>' + p.feitas + ' de ' + p.decisoes + ' decisões · ' + p.reunioes + ' falas em reunião</small>' +
        (meu || st.finalizado ? '' : '<div class="papel-acoes"><button class="btn mini" data-acao="assumir" data-role="' + r + '">Assumir esta função</button></div>') + '</div></article>';
    }).join('') + '</div><p class="dica">' + px('ajuda', 18) + 'Se um colega não puder continuar, outro jogador pode assumir a função dele. A transferência fica registrada com justificativa.</p>';
    return out;
  }

  /* ---- Indicadores ---- */
  function aIndicadores() {
    var st = S.st, ini = E.initialInd(st.porte), out = '<div class="inds-grande">';
    G.INDICATORS.forEach(function (i) {
      var serie = [ini[i.id]];
      for (var d = 1; d <= G.NDIAS; d++) { var dia = st.dias[d]; if (!dia) break; if (dia.completo) serie.push(dia.indFim[i.id]); }
      if (!st.finalizado) serie.push(st.ind[i.id]);
      var tot = st.ind[i.id] - ini[i.id];
      out += '<div class="ind-card">' + px(i.icone, 36) + '<div><b>' + esc(i.nome) + '</b><p>' + esc(i.desc) + '</p></div><div class="ind-card-v"><span>' + UI.fmtInd(i.id, st.ind[i.id]) + '</span>' +
        '<small class="' + (tot >= 0 ? 'pos' : 'neg') + '">' + (tot > 0 ? '+' : '') + (i.id === 'orcamento' ? G.fmt(tot) : Math.round(tot)) + ' desde o início</small>' + UI.spark(serie, tot >= 0 ? '#2E7D32' : '#D9443A') + '</div></div>';
    });
    out += '</div>';
    if (st.casosResumo && st.casosResumo.n) out += '<h3 class="titulo-sec">' + px('medico', 18) + 'Casos testados no plantão</h3>' + G.htmlCasos(st.casosResumo, st.flags.shortlist, st.flags.modelo);
    out += '<h3 class="titulo-sec">' + px('relogio', 18) + 'Linha do tempo</h3>';
    var semAtual = 0;
    for (var d = st.dia; d >= 1; d--) {
      var dia = st.dias[d]; if (!dia) continue;
      var sd = G.semanaDe(d);
      if (sd !== semAtual) { if (semAtual) out += '</details>'; semAtual = sd; out += '<details class="semana-bloco"' + (d === st.dia ? ' open' : '') + '><summary>' + (sd <= 4 ? 'Semana ' + sd : 'Fechamento') + '</summary>'; }
      out += '<div class="linha-dia"><h4>Dia ' + d + ' — ' + esc(info(d).titulo) + '</h4>';
      dia.eventos.forEach(function (ev) { out += '<div class="ev ev-' + ev.tom + '">' + px(ev.tom === 'alerta' ? 'alerta' : ev.tom === 'bom' ? 'check' : 'jornal', 18) + '<div><b>' + esc(ev.titulo) + '</b> ' + esc(ev.texto) + ' ' + UI.deltas(ev.delta, true) + '</div></div>'; });
      dia.itens.forEach(function (it) {
        var t = it.task;
        if (t.type === 'decisao') out += '<div class="ev ev-decisao">' + UI.rosto(it.dec.jogador, t.role, 24) + '<div><b>' + esc(t.titulo) + ':</b> ' + esc(it.opt.label) + (it.opt.consequencia ? ' — ' + esc(it.opt.consequencia) : '') + ' ' + UI.deltas(it.delta, true) + '</div></div>';
        else out += '<div class="ev ev-decisao">' + px('balao', 18) + '<div><b>' + esc(t.titulo) + '</b> — concluída. ' + UI.deltas(it.delta, true) + '</div></div>';
      });
      out += '</div>';
    }
    if (semAtual) out += '</details>';
    return out;
  }

  /* ---- Casos reais ---- */
  function aCasos() {
    var st = S.st, lim = st.finalizado ? G.NDIAS : st.dia;
    var com = st.tasks.filter(function (t) { return t.caso; });
    var abertos = com.filter(function (t) { return t.day <= lim; }), fechados = com.length - abertos.length;
    var out = '<p class="suave">Exemplos verdadeiros de como a IA (e os dados) já foram usados — e às vezes falharam — em hospitais. Cada caso está ligado a uma decisão do jogo. Novos casos aparecem a cada dia.</p><div class="casos">';
    abertos.slice().reverse().forEach(function (t) {
      var r = t.type === 'decisao' ? t.role : t.lider;
      out += '<article class="caso-item"><header>' + UI.chipPapel(r) + '<small>Dia ' + t.day + '</small><button class="link" data-acao="abrir" data-id="' + t.id + '">' + esc(t.titulo) + '</button></header>' + UI.caso(t.caso, true) + '</article>';
    });
    out += '</div>';
    if (fechados) out += '<p class="vazio">' + px('cadeado', 18) + ' ' + fechados + (fechados === 1 ? ' caso ainda fechado' : ' casos ainda fechados') + ' — abrem nos próximos dias.</p>';
    return out;
  }

  /* ---- Glossário ---- */
  function aGlossario() {
    var grupos = {};
    Object.keys(G.GLOSSARY).forEach(function (k) { var g = G.GLOSSARY[k]; (grupos[g.grupo] = grupos[g.grupo] || []).push([k, g]); });
    var ordem = (G.GLOSSARY_GRUPOS || Object.keys(grupos)).filter(function (g) { return grupos[g]; });
    var out = '<div class="busca">' + px('lupa', 18) + '<input type="search" data-draft="busca_glossario" placeholder="Buscar conceito (ex.: limiar, mediana, vazamento, nuvem)…"></div>';
    ordem.forEach(function (g) {
      out += '<div class="gl-grupo"><h3>' + esc(g) + '</h3>' + grupos[g].sort(function (a, b) { return a[1].termo.localeCompare(b[1].termo); }).map(function (p) {
        return '<div class="gl-item" data-busca="' + esc((p[1].termo + ' ' + p[1].def + ' ' + (p[1].ex || '')).toLowerCase()) + '"><b>' + esc(p[1].termo) + '</b><p>' + esc(p[1].def) + '</p>' + (p[1].ex ? '<p class="gl-ex">' + px('hotel', 12) + ' <i>' + esc(p[1].ex) + '</i></p>' : '') + '</div>';
      }).join('') + '</div>';
    });
    return out;
  }
  function filtrarGlossario(q) {
    q = String(q || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    document.querySelectorAll('.gl-item').forEach(function (el) {
      var t = el.dataset.busca.normalize('NFD').replace(/[̀-ͯ]/g, '');
      el.style.display = !q || t.indexOf(q) >= 0 ? '' : 'none';
    });
    document.querySelectorAll('.gl-grupo').forEach(function (g) {
      var algum = Array.prototype.some.call(g.querySelectorAll('.gl-item'), function (el) { return el.style.display !== 'none'; });
      g.style.display = algum ? '' : 'none';
    });
  }

  /* ---- Relatório ---- */
  function aRelatorio() {
    var st = S.st;
    if (!st.finalizado) {
      return '<div class="bloqueado">' + px('cadeado', 48) + '<h3>O relatório abre no fim do dia 30</h3>' +
        '<p>Quando a reunião do conselho terminar, vocês verão o índice de maturidade em IA do hospital, o que cada decisão causou, a boa prática de referência e o conceito por trás de cada escolha.</p>' +
        '<p class="suave">Até aqui: ' + Object.keys(st.tarefas).filter(function (k) { return st.tarefas[k].status === 'concluida'; }).length + ' de ' + st.tasks.length + ' tarefas concluídas.</p></div>';
    }
    return '<div class="rel-acoes"><button class="btn" data-acao="imprimir">' + px('impressora', 18) + 'Imprimir ou salvar em PDF</button></div><div class="relatorio">' + UI.relatorio(st, S.dados) + '</div>';
  }

  /* ======================================================================
     JANELAS (modais)
     ====================================================================== */
  function abrirModal(m) { S.modal = m; S.modalSig = ''; S.labT = null; renderModal(true); }
  function fecharModal() { S.modal = null; renderModal(true); animarInds(); verificarMarcos(); }
  function assinaturaModal() {
    var m = S.modal; if (!m) return '';
    if (m.tipo === 'tarefa') {
      var info = S.st && S.st.tarefas[m.id];
      var t = E.taskById(m.id, porte());
      var coms = (S.dados.comentarios || []).filter(function (c) { return String(c.alvo_id).split(':')[0] === m.id; }).length;
      return JSON.stringify([m, info && info.status, info && info.dec && info.dec.opcao_id, info && Object.keys(info.contribs || {}), coms, S.papeis, t && t.type === 'reuniao' ? S.st.flags : null]);
    }
    if (m.tipo === 'funcao') return JSON.stringify([m, S.papeis, S.dados && S.dados.jogadores.map(function (j) { return j.funcoes; })]);
    if (m.tipo === 'sala') return JSON.stringify([m, S.hash.length, S.hash.slice(-200)]);
    return JSON.stringify(m);
  }
  function renderModal(forcar) {
    var raiz = document.getElementById('modal');
    if (!S.modal) { raiz.innerHTML = ''; raiz.className = ''; document.body.classList.remove('com-modal'); return; }
    var sig = assinaturaModal();
    if (!forcar && sig === S.modalSig) return;
    S.modalSig = sig;
    var foco = salvarFoco();
    var scroll = raiz.querySelector('.janela-corpo') ? raiz.querySelector('.janela-corpo').scrollTop : 0;
    var m = S.modal, r;
    try {
      if (m.tipo === 'tarefa') { var t = E.taskById(m.id, porte()); r = t.type === 'reuniao' ? mReuniao(t) : mTarefa(t); }
      else if (m.tipo === 'boletim') r = mBoletim(m.dia);
      else if (m.tipo === 'sala') r = mSala(m.k);
      else if (m.tipo === 'funcao') r = mFuncao(m.role);
      else if (m.tipo === 'fim') r = mFim();
      else if (m.tipo === 'termo') r = mTermo(m.k);
      else if (m.tipo === 'ajuda') r = mAjuda();
      else if (m.tipo === 'confirmar') r = mConfirmar(m);
      else if (m.tipo === 'pausa') r = mPausa();
      else if (m.tipo === 'vestiario') r = mVestiario();
      else if (m.tipo === 'cracha') r = mCracha(m);
    } catch (e) { r = { titulo: 'Ops', icone: 'alerta', html: '<p class="erro-form">Não foi possível abrir: ' + esc(e.message) + '</p>' }; if (window.console) console.error(e); }
    raiz.className = 'aberto';
    document.body.classList.add('com-modal');
    raiz.innerHTML = '<div class="modal-fundo" data-acao="fechar-fundo"></div>' +
      janela(r.titulo, r.icone, r.html, { cls: 'modal-janela ' + (r.cls || '') + (forcar ? ' anim' : ''), cor: r.cor, fechar: 'fechar' }).replace('<section class="janela', '<section role="dialog" aria-modal="true" class="janela');
    restaurar(raiz, foco);
    var lab = raiz.querySelector('.lab');
    if (lab) VIS.atualizarLab(lab, G.MODELS[lab.dataset.labModelo], Number(lab.querySelector('[data-lab-range]').value));
    var corpo = raiz.querySelector('.janela-corpo');
    if (!forcar && corpo) corpo.scrollTop = scroll;
    if (forcar && m.tipo === 'fim') setTimeout(function () { VIS.confete(raiz.querySelector('.modal-janela')); }, 150);
  }

  function chipsConceitos(t) {
    return (t.conceitos || []).filter(function (k) { return G.GLOSSARY[k]; }).map(function (k) {
      return '<button class="chip-conceito" data-acao="termo" data-k="' + k + '">' + px('livro', 12) + esc(G.GLOSSARY[k].termo) + '</button>';
    }).join('');
  }
  function cabecalhoTarefa(t, role) {
    var j = S.st.idx.holder[role];
    return '<header class="m-cab" style="--c:' + G.ROLES[role].cor + '"><div class="m-cab-av">' + ARTE.avatarSVG(ARTE.aparencia(j || role, role), 84) + '</div><div>' +
      '<p class="kicker">Dia ' + t.day + ' de ' + G.NDIAS + ' · ' + esc(t.fase) + '</p><h2>' + esc(t.titulo) + '</h2>' +
      '<p class="m-quem">' + UI.chipPapel(role, t.type === 'reuniao' ? 'reunião' : '') + (t.type === 'decisao' ? ' <span class="suave">' + esc(G.nomeSetor(t.setor, porte())) + ' · ' + esc(nomePapel(role)) + (j ? ' (' + esc(j.nome) + ')' : '') + '</span>' : '') + '</p></div></header>' +
      (t.estrutural ? '<p class="estrutural-banner">' + px('estrela', 18) + 'Decisão estrutural: mexe no contexto de todos os setores até o fim do jogo.</p>' : '');
  }

  var LIMIAR_VALOR = { baixo: 10, medio: 25, alto: 50 };
  function citacao(ctx, id, papel) {
    var r = ctx.reu(id); var x = r && r[papel];
    if (!x) return '';
    return '<blockquote class="citacao"><span>' + esc(x.jogador) + ' (' + esc(curtoPapel(papel)) + ') na reunião:</span>' + esc(x.contribuicao) + '</blockquote>';
  }
  function contextoTarefa(t, ctx) {
    var caso = UI.caso(t.caso);
    var ap = t.apresentacao;
    if (ap === 'caso') {
      var inf = S.st.tarefas[t.id];
      return '<div class="m-contexto">' + VIS.blocoCaso(t, E.leituraCaso(S.st, t.id), { revelar: inf && inf.status === 'concluida' }) + '</div>';
    }
    if (ap === 'g2' || ap === 'm2' || ap === 'lab') {
      var m = G.MODELS[ctx.flags.modelo];
      var intro = {
        g2: '<p>Cinco soluções prometem prever <b>quem vai piorar (UTI ou óbito em 48 horas)</b> a partir dos dados da triagem. Na urgência, <b>8 em cada 100 pacientes</b> pioram.</p>' +
          '<p>Leve <b>três</b> modelos à mesa do corpo clínico — arraste as cartas ou use “Levar à mesa”. Cada piloto custa 20% da licença anual. Vire as cartas: as letras miúdas importam.</p>',
        m2: '<p>A gestão trouxe três candidatos. Agora a decisão é clínica: <b>qual deles o plantão vai realmente usar?</b> Vire cada carta para ver se ele explica o alerta, quanto demora e quantos alertas gera num plantão de 300 pacientes (24 vão piorar).</p>' + citacao(ctx, 'R1', 'gestao'),
        lab: '<p>O <b>' + esc(m ? m.nome : 'modelo') + '</b> calcula uma chance de piora para cada paciente; o limiar decide a partir de que chance o alerta toca. Arraste o controle e veja o que acontece com os 300 pacientes de um plantão.</p>'
      }[ap];
      return '<div class="m-contexto">' + caso + intro + '<details class="tabela-ref"><summary>Ver a tabela completa</summary>' + t.contexto(ctx) + '</details></div>';
    }
    return '<div class="m-contexto">' + caso + t.contexto(ctx) + '</div>';
  }
  function textoEscolhaLab() {
    var s = S.drafts.sel_M3;
    return s ? px('check', 18) + 'Ponto escolhido para o protocolo: <b>' + esc(G.LIMIAR_NOME[s]) + '</b>' : px('ajuda', 18) + 'Arraste o controle ou toque num ponto testado para escolher.';
  }
  function blocoVisual(t, ctx, info, editavel) {
    var feito = info.status === 'concluida', ap = t.apresentacao;
    var selTxt = feito ? String(info.dec.opcao_id) : String(S.drafts['sel_' + t.id] || '');
    if (ap === 'g2') return VIS.blocoG2(selTxt.split(',').filter(Boolean), S.virar, editavel, ctx);
    if (ap === 'm2') {
      var ids = ctx.flags.shortlist || [];
      return ids.length ? VIS.blocoM2(ids, selTxt, S.virar, editavel, ctx) : '';
    }
    if (ap === 'lab') {
      var m = G.MODELS[ctx.flags.modelo]; if (!m) return '';
      var v = feito ? (LIMIAR_VALOR[info.dec.opcao_id] || 25) : (S.labT || LIMIAR_VALOR[S.drafts.sel_M3] || 25);
      return VIS.labLimiar(m, v, editavel) + (editavel ? '<p class="lab-escolha" data-lab-escolha>' + textoEscolhaLab() + '</p>' : '');
    }
    if (ap === 'cartas') return VIS.blocoCartas(t, E.getOptions(t, ctx), selTxt, S.virar, editavel, ctx);
    if (ap === 'painel') return VIS.blocoPainel(E.getOptions(t, ctx), selTxt.split(',').filter(Boolean), editavel);
    return '';
  }
  function substituirBloco(tid) {
    var el = document.querySelector('#modal .mesa-bloco[data-bloco="' + tid + '"]');
    if (!el) return;
    var t = E.taskById(tid, porte());
    var tmp = document.createElement('div');
    tmp.innerHTML = blocoVisual(t, E.ctxFor(S.st, tid), S.st.tarefas[tid], true);
    el.parentNode.replaceChild(tmp.firstChild, el);
    var e2 = document.getElementById('erro_' + tid); if (e2) e2.textContent = '';
  }
  function caixaJustificativa(k, rotulo, dica, ph) {
    return '<label class="lbl-just" for="txt_' + k + '">' + px('balao', 18) + rotulo + '</label><p class="dica-just">' + dica + '</p>' +
      '<textarea id="txt_' + k + '" rows="4" data-draft="' + k + '" placeholder="' + esc(ph) + '"></textarea>' +
      '<div class="contador"><span data-contador="' + k + '">nenhuma palavra ainda</span>' + (OBRIGATORIA ? ' · sem tamanho mínimo' : ' · opcional') + '</div>';
  }

  function mTarefa(t) {
    var st = S.st, info = st.tarefas[t.id], ctx = E.ctxFor(st, t.id);
    var meu = S.papeis.indexOf(t.role) >= 0, visual = !!t.apresentacao && t.apresentacao !== 'caso';
    var R = G.ROLES[t.role];
    var out = { titulo: (t.apresentacao === 'caso' ? 'Caso do dia' : (t.estrutural ? 'Decisão estrutural' : (t.historia ? 'Incidente' : 'Decisão'))) + ' · ' + esc(G.nomeSetor(t.setor, st.porte)), icone: t.apresentacao === 'caso' ? 'medico' : UI.pxPapel(t.role), cor: R.cor, cls: 'larga' + (t.apresentacao === 'caso' ? ' modal-caso' : '') };
    var h = cabecalhoTarefa(t, t.role) + contextoTarefa(t, ctx);
    if (info.status === 'concluida') {
      if (visual) h += blocoVisual(t, ctx, info, false);
      h += '<div class="resultado' + (S.recem === t.id ? ' recem' : '') + '"><div class="res-top">' + UI.rosto(info.dec.jogador, t.role, 28) + '<b>' + esc(info.dec.jogador) + '</b><small>decidiu ' + UI.quando(info.dec.timestamp) + '</small></div>' +
        '<p class="res-escolha">' + px('check', 18) + esc(info.opt.label) + '</p>' +
        '<div class="res-just"><span>Por quê</span>' + UI.paragrafos(info.dec.justificativa) + '</div>' +
        (info.opt.consequencia ? '<div class="res-cons"><span>O que aconteceu</span><p>' + esc(info.opt.consequencia) + '</p>' + UI.deltas(info.delta) + '</div>' : '') +
        (t.apresentacao === 'caso' && info.opt.comentario ? '<div class="res-licao"><span>O que este caso ensina</span><p>' + esc(info.opt.comentario) + '</p>' + UI.badgeQ(info.opt.q) + '</div>' : '') + '</div>';
      h += '<div class="m-conceitos"><span>Conceitos em jogo:</span>' + chipsConceitos(t) + '</div>';
      h += '<h3 class="m-sub">' + px('balao', 18) + 'Comentários da equipe</h3>' + blocoComentarios('decisao', t.id, t.role);
      out.html = h; return out;
    }
    if (info.status === 'futura') { out.html = h + '<p class="aviso">' + px('cadeado', 18) + 'Esta tarefa abre no dia ' + t.day + '.</p>'; return out; }
    if (!meu) {
      var j = st.idx.holder[t.role];
      if (visual && info.status !== 'aguardando') h += blocoVisual(t, ctx, info, false);
      out.html = h + '<p class="aviso">' + px('ajuda', 18) + 'Esta decisão é de <b>' + esc(nomePapel(t.role)) + '</b>' + (j ? ' (' + esc(j.nome) + ')' : '') +
        '. Você vai ler a escolha e a justificativa assim que forem registradas.</p><div class="m-conceitos"><span>Conceitos em jogo:</span>' + chipsConceitos(t) + '</div>';
      return out;
    }
    if (info.status === 'aguardando') { out.html = h + '<p class="aviso">' + px('relogio', 18) + 'Aguardando ' + esc(nomesPapeis(E.esperandoPor(st, t))) + '. Assim que a etapa anterior terminar, esta decisão abre para você.</p>'; return out; }
    h += '<div class="pergunta">' + px('ajuda', 24) + '<span>' + esc(t.pergunta) + (t.multi ? ' <small>(' + (t.multi.min === t.multi.max ? 'escolha exatamente ' + t.multi.max : 'escolha de ' + t.multi.min + ' a ' + t.multi.max) + ')</small>' : '') + '</span></div>';
    if (visual) h += blocoVisual(t, ctx, info, true);
    else {
      var opts = E.getOptions(t, ctx), tipo = t.multi ? 'checkbox' : 'radio';
      var sel = String(S.drafts['sel_' + t.id] || '').split(',').filter(Boolean);
      h += '<div class="opcoes" data-task="' + t.id + '">' + opts.map(function (o) {
        var custo = o.custo > 0 ? px('moeda', 12) + 'Custo: ' + G.fmt(o.custo) : '';
        return '<label class="opcao"><input type="' + tipo + '" name="opt_' + t.id + '" value="' + esc(o.id) + '" data-acao-change="sel" data-task="' + t.id + '"' + (sel.indexOf(String(o.id)) >= 0 ? ' checked' : '') + '>' +
          '<span class="opcao-marca"></span><span class="opcao-txt"><b>' + esc(o.label) + '</b>' + (o.detalhe ? '<small>' + esc(o.detalhe) + '</small>' : '') +
          (custo ? '<em class="custo">' + custo + '</em>' : '') + '</span></label>';
      }).join('') + '</div>';
    }
    h += '<div class="m-conceitos"><span>Conceitos em jogo:</span>' + chipsConceitos(t) + '</div>';
    h += (t.apresentacao === 'caso' ?
      caixaJustificativa('just_' + t.id, 'Por que você aceita ou não?', 'O que no paciente confirma ou contradiz o modelo? Algum dado que o modelo não vê? Pode ser curto — o professor vai ler.', 'Aceito / não aceito porque…') :
      caixaJustificativa('just_' + t.id, 'Por que você escolheu isso?', 'Do seu jeito, curto ou longo: o que pesou na escolha, que risco você aceita e como isso afeta os colegas. A equipe e o professor vão ler.', 'Escolhi esta opção porque…')) +
      '<p class="erro-form" id="erro_' + t.id + '"></p>' +
      '<div class="m-acoes"><button class="btn verde grande" data-acao="decidir" data-id="' + t.id + '">' + px('check', 18) + 'Confirmar decisão</button></div>';
    out.html = h; return out;
  }

  function mReuniao(t) {
    var st = S.st, info = st.tarefas[t.id], ctx = E.ctxFor(st, t.id);
    var out = { titulo: 'Reunião · ' + esc(t.roles.map(curtoPapel).join(' × ')), icone: 'balao', cor: '#5979AA', cls: 'larga' };
    var h = cabecalhoTarefa(t, t.lider);
    if (info.status === 'futura') { out.html = h + '<div class="m-contexto">' + t.contexto(ctx) + '</div><p class="aviso">' + px('cadeado', 18) + 'Esta reunião acontece no dia ' + t.day + '.</p>'; return out; }
    if (info.status === 'aguardando') h += '<p class="aviso">' + px('relogio', 18) + 'A reunião começa quando ' + esc(nomesPapeis(E.esperandoPor(st, t))) + ' terminar a etapa anterior.</p>';
    h += VIS.cenaReuniao(t, info, st.idx.holder, S.papeis, st);
    h += '<div class="m-contexto">' + t.contexto(ctx) + '</div>';
    h += '<h3 class="m-sub">' + px('balao', 18) + 'Falas da reunião</h3><div class="falas">';
    t.roles.forEach(function (r) {
      var R = G.ROLES[r], c = info.contribs && info.contribs[r], j = st.idx.holder[r];
      var meu = S.papeis.indexOf(r) >= 0;
      var liberado = info.status !== 'aguardando' && (!t.sequencial || r === t.lider || (info.contribs && info.contribs[t.lider]));
      h += '<div class="fala" id="fala-' + t.id + '-' + r + '" style="--c:' + R.cor + '"><div class="fala-av">' + UI.rosto(j ? j.nome : r, r, 36) + '</div><div class="fala-corpo"><div class="fala-top"><b>' + esc(j ? j.nome : '—') + '</b>' + UI.chipPapel(r) + (r === t.lider && t.sequencial ? '<small>abre a reunião</small>' : '') + '</div>' +
        '<p class="fala-prompt">' + esc(E.promptDe(st, t, r)) + '</p>';
      if (c) h += '<div class="fala-txt">' + UI.paragrafos(c.contribuicao) + '<small>' + UI.quando(c.timestamp) + '</small></div>';
      else if (meu && liberado) {
        var k = 'reu_' + t.id + '_' + r;
        h += '<textarea rows="4" data-draft="' + k + '" placeholder="Sua fala como ' + esc(R.curto) + '…"></textarea>' +
          '<div class="contador"><span data-contador="' + k + '">nenhuma palavra ainda</span> · sem tamanho mínimo</div>' +
          '<p class="erro-form" id="erro_' + t.id + '_' + r + '"></p>' +
          '<div class="m-acoes"><button class="btn verde" data-acao="contribuir" data-id="' + t.id + '" data-role="' + r + '">' + px('balao', 18) + 'Registrar fala</button></div>';
      } else if (meu) h += '<p class="suave">' + px('relogio', 12) + ' Aguarde a fala de ' + esc(curtoPapel(t.lider)) + '.</p>';
      else h += '<p class="suave">' + px('relogio', 12) + ' Aguardando ' + esc(j ? j.nome : R.curto) + '.</p>';
      h += '</div></div>';
    });
    h += '</div><div class="m-conceitos"><span>Conceitos em jogo:</span>' + chipsConceitos(t) + '</div>';
    out.html = h; return out;
  }

  function mBoletim(dia) {
    var st = S.st, D = E.infoDia(st, dia), info = st.dias[dia], crise = temCrise(dia);
    var h = (crise ? '<div class="crise-faixa">' + px('alerta', 24) + 'Alerta: crise no hospital</div>' : '') +
      '<div class="jornal"><header class="jornal-cab"><small>Edição do dia ' + dia + ' de ' + G.NDIAS + ' · ' + (D.semana <= 4 ? 'semana ' + D.semana + ' · ' : '') + esc(G.PORTES[st.porte].nome) + '</small><h2>Jornal do ' + esc(S.dados.hospital.nome_hospital) + '</h2><p>' + esc(D.titulo) + ' — ' + esc(D.fase) + '</p></header>';
    if (dia === 1) h += '<div class="intro">' + G.INTRO(S.dados.hospital.nome_hospital, st.porte) + '</div>';
    h += '<p class="jornal-lead">' + esc(D.resumo) + '</p>';
    if (info && info.eventos.length) {
      h += '<h3>O que aconteceu desde ontem</h3><div class="noticias">' + info.eventos.map(function (ev) {
        return '<article class="noticia ev-' + ev.tom + (ev.historia ? ' ev-historia' : '') + '">' + px(ev.tom === 'alerta' ? 'alerta' : ev.tom === 'bom' ? 'check' : 'jornal', 24) + '<div><b>' + esc(ev.titulo) + '</b><p>' + esc(ev.texto) + '</p>' + UI.deltas(ev.delta, true) + '</div></article>';
      }).join('') + '</div>';
    } else if (dia > 1) h += '<p class="suave">Nenhuma ocorrência relevante desde ontem.</p>';
    if (G.DIAS_REUNIAO.indexOf(dia) >= 0) h += '<p class="nota">' + px('balao', 16) + ' Hoje tem <b>reunião semanal</b>: cada função conta o que fez e o que propõe; depois, a gestão escolhe as prioridades da próxima semana.</p>';
    if (dia === 9) h += '<p class="nota">' + px('medico', 16) + ' A partir de hoje, o médico recebe <b>um caso real por dia</b> e decide se aceita ou não o que o modelo indica.</p>';
    h += '<h3>Hoje no hospital</h3><ul class="hoje">' + st.tasks.filter(function (t) { return t.day === dia; }).map(function (t) {
      var role = t.type === 'decisao' ? t.role : t.lider, j = st.idx.holder[role];
      var minha = t.type === 'decisao' ? S.papeis.indexOf(t.role) >= 0 : t.roles.some(function (r) { return S.papeis.indexOf(r) >= 0; });
      return '<li class="' + (minha ? 'minha' : '') + '">' + UI.rosto(j ? j.nome : role, role, 24) + UI.chipPapel(role, t.type === 'reuniao' ? 'reunião' : '') + '<span>' + esc(t.titulo) + '</span>' + (minha ? '<em>você</em>' : '') + '</li>';
    }).join('') + '</ul><div class="m-acoes"><button class="btn verde grande" data-acao="fechar">Começar o dia ' + px('seta', 18) + '</button></div></div>';
    return { titulo: 'Jornal do hospital', icone: 'jornal', cor: crise ? '#9E2A22' : '#1A335B', cls: crise ? 'crise' : '', html: h };
  }

  function mSala(k) {
    var st = S.st, papel = VIS.papelDaSala(k, st.porte), cor = VIS.corSala(k, st.porte), j = papel ? st.idx.holder[papel] : null;
    var info = papel ? G.papelInfo(papel, st.porte) : null;
    var h = VIS.cenaSala(k, st, S.dados, S.sessao.id_jogador);
    h += '<div class="sala-info"><p class="kicker">' + esc(info ? info.nome : 'Espaço da equipe') + '</p>' + (j ? '<p class="sala-dono">' + UI.rosto(j.nome, papel, 24) + '<b>' + esc(j.nome) + '</b>' + (VIS.online(j) ? ' · online agora' : ' · visto ' + UI.quando(j.ultimo_acesso)) + '</p>' : '') +
      '<p>' + esc(info ? info.missao : 'Onde as funções se encontram para apresentar decisões e dar retorno. Cada reunião pede a fala de cada função envolvida — em algumas, quem abre precisa falar primeiro.') + '</p></div>';
    var hoje = st.finalizado ? [] : VIS.tarefasDaSala(st, k);
    h += '<h3 class="m-sub">' + px('estrela', 18) + 'Hoje nesta sala</h3>';
    if (!hoje.length) h += '<p class="suave">Nenhuma tarefa aqui hoje.</p>';
    else h += '<div class="tarefas">' + hoje.map(function (t) {
      var r = t.type === 'decisao' ? t.role : (t.roles.filter(function (x) { return S.papeis.indexOf(x) >= 0; })[0] || t.lider);
      return cartaoTarefa(t, r, S.papeis.indexOf(r) >= 0 ? statusMeu(t, r) : statusOutro(t));
    }).join('') + '</div>';
    var hist = st.tasks.filter(function (t) {
      if (!(st.finalizado || t.day < st.dia)) return false;
      return k === 'reunioes' ? t.type === 'reuniao' : (t.type === 'decisao' && t.setor === k);
    });
    if (hist.length) {
      h += '<h3 class="m-sub">' + px('relogio', 18) + 'O que já foi decidido aqui</h3><ul class="linhas">' + hist.map(function (t) {
        var inf = st.tarefas[t.id];
        var txt = t.type === 'decisao' && inf.opt ? '<span class="escolha">' + esc(inf.opt.label) + '</span>' : '<span class="escolha">Reunião concluída</span>';
        return '<li><button class="link-linha" data-acao="abrir" data-id="' + t.id + '"><span class="pill futura">Dia ' + t.day + '</span><span>' + esc(t.titulo) + '</span>' + txt + '</button></li>';
      }).join('') + '</ul>';
    }
    return { titulo: esc(G.nomeSetor(k, st.porte)), icone: papel ? UI.pxPapel(papel) : 'balao', cor: cor, cls: 'sala-modal', html: h };
  }

  function mFuncao(role) {
    var R = G.ROLES[role], emJogo = S.dados.hospital.status !== 'lobby';
    var pt = emJogo ? S.st.porte : G.porteDe(S.dados.jogadores.length), info = G.papelInfo(role, pt);
    var j = S.st ? S.st.idx.holder[role] : null, k = 'funcao_' + role;
    var h = '<div class="funcao-topo" style="--c:' + R.cor + '"><div class="funcao-av">' + ARTE.avatarSVG(ARTE.temAvatar(S.eu) ? ARTE.aparencia(S.eu, role) : ARTE.padrao(S.sessao.nome, role), 132) + '</div><div><h2>' + esc(info.nome) + '</h2><p>' + esc(info.missao) + '</p><p class="suave"><b>Conceitos que você vai usar:</b> ' + esc(info.conceitos) + '</p></div></div>';
    if (emJogo && j) h += '<p class="aviso alerta">' + px('alerta', 18) + 'Esta função está com <b>' + esc(j.nome) + '</b>. Assuma só se o colega não puder continuar — a transferência fica registrada.</p>';
    h += caixaJustificativa(k, 'Por que você assume esta função?', 'Seu perfil, sua experiência ou o que quer aprender — pode ser em poucas palavras. Também vai para a planilha.', 'Assumo esta função porque…') +
      '<p class="erro-form" id="erro_funcao"></p><div class="m-acoes"><button class="btn" data-acao="fechar">Cancelar</button><button class="btn verde" data-acao="confirmar-funcao" data-role="' + role + '">' + px('check', 18) + 'Assumir função</button></div>';
    return { titulo: 'Assumir função', icone: UI.pxPapel(role), cor: R.cor, html: h };
  }

  function mFim() {
    var st = S.st, f = UI.faixa(st.indice);
    var h = '<div class="fim-modal"><div class="rel-indice ' + f.cls + '">' + px('trofeu', 48) + '<span class="rel-num">' + st.indice + '</span><span class="rel-lbl">Índice de maturidade em IA</span></div>' +
      '<h2>30 dias de plantão!</h2><p class="rel-faixa">' + esc(f.nome) + '</p><p>O conselho ouviu todas as funções. O relatório final mostra o que cada decisão causou, como o modelo se saiu nos casos do plantão, a boa prática de referência e o conceito por trás de cada escolha.</p>' +
      '<div class="m-acoes centro"><button class="btn verde grande" data-acao="ver-relatorio">Ver relatório final ' + px('seta', 18) + '</button></div>' +
      UI.conquistas(st, S.dados, true, true) + '</div>';
    return { titulo: 'Fim do plantão', icone: 'trofeu', cor: '#B7791F', html: h };
  }
  function mTermo(k) {
    var g = G.GLOSSARY[k];
    return { titulo: 'Glossário', icone: 'livro', html: '<div class="termo"><p class="kicker">' + esc(g.grupo) + '</p><h2>' + esc(g.termo) + '</h2><p>' + esc(g.def) + '</p>' + (g.ex ? '<p class="gl-ex">' + px('hotel', 18) + ' <i>' + esc(g.ex) + '</i></p>' : '') +
      '<div class="m-acoes"><button class="btn" data-acao="voltar-modal">Voltar</button></div></div>' };
  }
  function mAjuda() {
    var h = '<div class="ajuda"><ol>' +
      '<li>' + px('hotel', 24) + '<span><b>O mapa é o seu hospital.</b> Salas com <b>!</b> amarelo têm uma tarefa sua. Clique na sala, no painel “Plantão de hoje” ou na aba Tarefas para decidir.</span></li>' +
      '<li>' + px('balao', 24) + '<span><b>Toda decisão pede um porquê</b> — sem tamanho mínimo: escreva do seu jeito. Vai para o Mural e para a planilha do professor.</span></li>' +
      '<li>' + px('equipe', 24) + '<span><b>Tarefas dependem umas das outras.</b> A clínica só escolhe o modelo depois da reunião em que a gestão apresenta os candidatos.</span></li>' +
      '<li>' + px('relogio', 24) + '<span><b>O dia avança</b> quando todas as tarefas do dia terminam — até ' + (CFG.DIAS_POR_DIA_REAL || 3) + ' dias de jogo por dia do calendário. São 30 dias. O jornal da manhã mostra o que as decisões provocaram.</span></li>' +
      '<li>' + px('calendario', 24) + '<span><b>A cada 7 dias</b>, uma reunião semanal: cada função conta o que fez e o que propõe, e a gestão escolhe as prioridades da semana seguinte.</span></li>' +
      '<li>' + px('medico', 24) + '<span><b>Do dia 9 ao 29</b>, o médico recebe um caso da urgência por dia: vê o paciente e o que o modelo indicou, aceita ou não — e explica por quê. Depois, descobre o que aconteceu.</span></li>' +
      '<li>' + px('alerta', 24) + '<span><b>No meio do mês</b>, um incidente diferente para cada hospital. Os sinais aparecem antes, no jornal: quem lê e se prepara sofre menos.</span></li>' +
      '<li>' + px('grafico', 24) + '<span><b>Os indicadores</b> (no alto da tela) mostram o estado do hospital. Não dá para ganhar tudo: há trocas.</span></li>' +
      '<li>' + px('jornal', 24) + '<span><b>Casos reais</b> acompanham as decisões: exemplos verdadeiros de IA em hospitais, para conectar o jogo ao mundo.</span></li>' +
      '<li>' + px('trofeu', 24) + '<span><b>No fim do dia 30</b>, o relatório revela a boa prática de cada decisão e o conceito por trás dela.</span></li></ol>' +
      '<p class="suave">O tamanho do hospital acompanha a equipe: 2–3 pessoas jogam o Hospital Essencial; 4, o Regional; 5, o de Alta Complexidade. Tudo fica salvo na planilha do professor: para voltar de outro aparelho, entre com o código e o mesmo nome. Textos que você está escrevendo ficam guardados neste navegador até você enviar.</p>' +
      '<div class="m-acoes"><button class="btn verde" data-acao="fechar">Entendi</button></div></div>';
    return { titulo: 'Como jogar', icone: 'ajuda', html: h };
  }
  function mPausa() {
    var st = S.st;
    var h = '<div class="pausa-modal">' + px('relogio', 56) + '<h2>Dia ' + st.dia + ' concluído!</h2>' +
      '<p>Vocês jogaram todos os dias liberados até agora. O plantão do <b>dia ' + (st.dia + 1) + '</b> abre ' + quandoAbre() + '.</p>' +
      '<p class="suave">O jogo vai até o dia 30, com até ' + (CFG.DIAS_POR_DIA_REAL || 3) + ' dias de jogo por dia do calendário — tempo para ler, comentar e pensar nas decisões.</p>' +
      '<ul class="pausa-dicas"><li>' + px('balao', 18) + 'Leia e comente as justificativas no Mural.</li><li>' + px('jornal', 18) + 'Releia o jornal: os sinais do que vem por aí aparecem antes.</li><li>' + px('livro', 18) + 'Revise os conceitos no Glossário.</li></ul>' +
      '<div class="m-acoes centro"><button class="btn verde" data-acao="fechar">Entendi</button> <button class="btn" data-acao="ir-mural">Ir para o Mural</button></div></div>';
    return { titulo: 'Até amanhã!', icone: 'calendario', cor: '#1A335B', html: h };
  }
  function mConfirmar(m) {
    return { titulo: esc(m.titulo), icone: 'alerta', html: '<div class="confirmar"><p>' + esc(m.texto) + '</p><div class="m-acoes"><button class="btn" data-acao="fechar">Cancelar</button>' +
      '<button class="btn vermelho" data-acao="' + esc(m.acao) + '">' + esc(m.botao) + '</button></div></div>' };
  }

  /* ======================================================================
     VESTIÁRIO E CRACHÁ
     ====================================================================== */
  function avatarAtual() {
    if (S.eu && ARTE.temAvatar(S.eu)) return ARTE.normalizar(S.eu.avatar);
    return ARTE.padrao(S.sessao.nome, S.papeis[0] || '');
  }
  function abrirVestiario() { S.avRasc = S.avRasc || avatarAtual(); abrirModal({ tipo: 'vestiario' }); }
  function refazerModal() { S.modalSig = ''; renderModal(false); }
  function dataBR(ts) { var d = ts ? new Date(ts) : new Date(); if (isNaN(d)) d = new Date(); return d.toLocaleDateString('pt-BR'); }
  function slug(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cracha'; }
  /** Dados para desenhar o crachá de um jogador (avatar opcional para a prévia). */
  function dadosCracha(j, avatar) {
    var pt = porte(), papeisPorte = G.PORTES[pt].papeis;
    var fs = funcoesDe(j).filter(function (r) { return papeisPorte.indexOf(r) >= 0; });
    return {
      nome: j ? j.nome : S.sessao.nome, hospital: S.dados.hospital.nome_hospital, codigo: S.dados.hospital.codigo, id: j ? j.id_jogador : '',
      avatar: avatar || ARTE.aparencia(j, fs[0] || ''), emissao: dataBR(avatar ? null : j && j.cracha_em),
      papeis: fs.map(function (r) { return { nome: G.papelInfo(r, pt).nome, curto: G.ROLES[r].curto, cor: G.ROLES[r].cor }; })
    };
  }

  var ABAS_VEST = [
    ['rosto', 'Rosto', 'sorriso', ['pele', 'oculos', 'barba']],
    ['cabelo', 'Cabelo', 'paleta', ['cabelo', 'corCabelo']],
    ['roupa', 'Roupa', 'cabide', ['roupa', 'corRoupa']],
    ['extras', 'Acessórios', 'estrela', ['acessorio']]
  ];
  var NOME_CAMPO = { pele: 'Tom de pele', oculos: 'Óculos', barba: 'Barba e bigode', cabelo: 'Penteado', corCabelo: 'Cor do cabelo', roupa: 'Estilo de roupa', corRoupa: 'Cor da roupa', acessorio: 'Acessório' };
  var FOCO_CAMPO = { oculos: 'rosto', barba: 'rosto', cabelo: 'cabeca', roupa: 'corpo', acessorio: 'busto' };
  function mVestiario() {
    var a = S.avRasc || (S.avRasc = avatarAtual());
    var papel = S.papeis[0] || '', R = G.ROLES[papel], cor = R ? R.cor : '#5779AA';
    var aba = ABAS_VEST.filter(function (x) { return x[0] === S.vestAba; })[0] || ABAS_VEST[0];
    var h = '<div class="vest" style="--c:' + cor + '">';
    h += '<div class="vest-palco"><div class="vest-holofote"></div><div class="vest-av">' + ARTE.avatarSVG(a, 290) + '</div>' +
      '<div class="vest-nome"><b>' + esc(S.sessao.nome) + '</b>' + (S.papeis.length ? S.papeis.map(function (r) { return UI.chipPapel(r); }).join('') : '<span class="pill">função a definir</span>') + '</div>' +
      '<button class="btn mini" data-acao="av-aleatorio">' + px('dado', 16) + 'Sortear um visual</button></div>';
    h += '<div class="vest-painel"><nav class="vest-abas" role="tablist">' + ABAS_VEST.map(function (x) {
      return '<button role="tab" aria-selected="' + (x === aba) + '" class="' + (x === aba ? 'ativa' : '') + '" data-acao="av-aba" data-aba="' + x[0] + '">' + px(x[2], 20) + '<span>' + x[1] + '</span></button>';
    }).join('') + '</nav><div class="vest-grupos">';
    aba[3].forEach(function (k) {
      var ehCor = !!ARTE.OPCOES[k][0].cor;
      h += '<div class="vest-grupo"><h4>' + NOME_CAMPO[k] + '</h4><div class="' + (ehCor ? 'vest-cores' : 'vest-ops') + '">' + ARTE.OPCOES[k].map(function (o) {
        var sel = a[k] === o.id;
        if (ehCor) return '<button class="vest-cor' + (sel ? ' sel' : '') + '" style="--sw:' + o.cor + '" data-acao="av-set" data-k="' + k + '" data-v="' + o.id + '" title="' + esc(o.nome) + '" aria-label="' + esc(o.nome) + '" aria-pressed="' + sel + '"></button>';
        var teste = Object.assign({}, a); teste[k] = o.id;
        return '<button class="vest-op' + (sel ? ' sel' : '') + '" data-acao="av-set" data-k="' + k + '" data-v="' + o.id + '" aria-pressed="' + sel + '">' + ARTE.miniatura(teste, FOCO_CAMPO[k]) + '<span>' + esc(o.nome) + '</span></button>';
      }).join('') + '</div></div>';
    });
    h += '</div></div></div>';
    h += '<div class="m-acoes vest-rodape"><span class="suave">' + px('ajuda', 16) + ' Dá para trocar o visual depois, a qualquer momento.</span><button class="btn verde grande" data-acao="av-gerar">' + px('cracha', 20) + 'Gerar meu crachá</button></div>';
    return { titulo: 'Vestiário', icone: 'cabide', cor: '#1A335B', cls: 'larga vest-modal', html: h };
  }

  function mCracha(m) {
    var previa = !!m.previa, j = S.eu, tem = ARTE.temAvatar(j);
    var d = dadosCracha(j, previa ? S.avRasc : null), cor = d.papeis[0] ? d.papeis[0].cor : '#5779AA';
    var h = '<div class="cracha-tela' + (previa ? ' previa' : '') + '" style="--c:' + cor + '"><div class="cracha-cena"><div class="cracha-pendurado"><span class="cracha-cordao"></span><div class="cracha-card">' + ARTE.cracha(d, { largura: 280 }) + '<i class="brilho"></i></div></div></div>';
    h += '<div class="cracha-txt">';
    if (previa) {
      h += '<p class="kicker">Recepção · ' + esc(S.dados.hospital.nome_hospital) + '</p><h2>' + (tem ? 'Crachá atualizado!' : 'Seu crachá está pronto!') + '</h2>' +
        '<p>Confira foto, nome e função. Ao pegar o crachá, você entra oficialmente na equipe do programa de IA — e seu visual aparece para os colegas no mapa do hospital.</p>' +
        (d.papeis.length ? '' : '<p class="aviso">' + px('ajuda', 18) + 'Você ainda não escolheu uma função. O crachá se atualiza sozinho quando escolher.</p>') +
        '<p class="erro-form" id="erro_cracha"></p><div class="cracha-botoes"><button class="btn verde grande" data-acao="pegar-cracha">' + px('cracha', 20) + (tem ? 'Atualizar meu crachá' : 'Pegar crachá e entrar') + '</button>' +
        '<button class="btn" data-acao="voltar-vestiario">' + px('cabide', 18) + 'Voltar ao vestiário</button>' +
        '<button class="btn" data-acao="baixar-cracha" data-previa="1">' + px('download', 18) + 'Baixar (PNG)</button></div>';
    } else {
      h += '<p class="kicker">' + esc(G.PORTES[porte()].nome) + '</p><h2>Meu crachá</h2><p>Baixe como imagem para usar como foto de perfil ou registro da turma. Se trocar de função, o crachá se atualiza sozinho.</p>' +
        '<div class="cracha-botoes"><button class="btn azul grande" data-acao="baixar-cracha">' + px('download', 20) + 'Baixar crachá (PNG)</button>' +
        '<button class="btn" data-acao="vestiario">' + px('cabide', 18) + 'Trocar visual</button></div>';
    }
    h += '</div></div>';
    return { titulo: previa ? 'Recepção: retirada do crachá' : 'Meu crachá', icone: 'cracha', cor: '#1A335B', cls: 'cracha-modal', html: h };
  }

  function pegarCracha(btn) {
    var a = S.avRasc; if (!a) return;
    if (!ocupar(btn, 'Emitindo…')) return;
    erroEm('erro_cracha', '');
    chamar('salvarAvatar', { avatar: JSON.stringify(a) }).then(function () {
      liberar();
      var card = document.querySelector('#modal .cracha-pendurado');
      if (card && !VIS.reduzido) card.classList.add('pegou');
      setTimeout(function () {
        S.avRasc = null; S.modal = null; renderModal(true);
        toast(px('cracha', 24) + ' Crachá na mão! Bem-vindo(a) à equipe.', 'ok');
        atualizar();
      }, VIS.reduzido ? 0 : 750);
    }).catch(function (e) { liberar(btn); erroEm('erro_cracha', e.message); });
  }
  function baixarCracha(btn) {
    var d = dadosCracha(S.eu, btn.dataset.previa ? S.avRasc : null);
    ARTE.baixarPNG(ARTE.cracha(d), 'cracha-' + slug(d.nome) + '.png').then(function () {
      toast(px('download', 22) + ' Crachá baixado.', 'ok');
    }, function (e) { toast(esc(e.message), 'erro'); });
  }

  /* ======================================================================
     AÇÕES
     ====================================================================== */
  function erroEm(id, msg) { var el = document.getElementById(id); if (el) el.textContent = msg; else if (msg) toast(esc(msg), 'erro'); }
  function ocupar(btn, txt) {
    if (S.ocupado) return false;
    S.ocupado = true;
    if (btn) { btn.disabled = true; btn.dataset.txt = btn.innerHTML; btn.innerHTML = '<span class="giro"></span>' + esc(txt || 'Enviando…'); }
    return true;
  }
  function liberar(btn) { S.ocupado = false; if (btn && btn.dataset.txt) { btn.disabled = false; btn.innerHTML = btn.dataset.txt; } }

  function decidir(btn) {
    var t = E.taskById(btn.dataset.id, porte()), st = S.st;
    var sel = String(S.drafts['sel_' + t.id] || '').split(',').filter(Boolean);
    var just = (S.drafts['just_' + t.id] || '').trim();
    if (t.multi) {
      if (sel.length < t.multi.min || sel.length > t.multi.max) return erroEm('erro_' + t.id, t.multi.min === t.multi.max ? 'Escolha exatamente ' + t.multi.max + ' opções.' : 'Escolha de ' + t.multi.min + ' a ' + t.multi.max + ' opções.');
    } else if (sel.length !== 1) return erroEm('erro_' + t.id, 'Escolha uma opção.');
    if (OBRIGATORIA && !just) return erroEm('erro_' + t.id, 'Escreva o porquê da sua escolha — pode ser curto.');
    var ctx = E.ctxFor(st, t.id);
    var ordem = E.getOptions(t, ctx).map(function (o) { return String(o.id); });
    sel.sort(function (a, b) { return ordem.indexOf(a) - ordem.indexOf(b); });
    var opt = E.resolveOption(t, ctx, sel.join(','));
    if (!ocupar(btn, 'Registrando…')) return;
    erroEm('erro_' + t.id, '');
    var payload = {
      tarefa_id: t.id, tarefa_titulo: t.titulo, dia: t.day, funcao: t.role, opcao_id: sel.join(','),
      opcao_escolhida: opt.label, justificativa: just, referencia: E.qLabel(opt.q)
    };
    if (t.apresentacao === 'caso') {
      var rc = E.registroCaso(st, t.id, sel[0]);
      if (rc) payload.caso = {
        caso_id: rc.caso_id, paciente: rc.paciente, historia: rc.historia, modelo: rc.semModelo ? 'sem modelo' : (G.MODELS[rc.modelo] || {}).nome || rc.modelo,
        escore: rc.escore, limiar: rc.limiar, fase: rc.fase, alerta_modelo: rc.semModelo ? '' : (rc.alerta ? 'alerta' : 'sem alerta'),
        decisao_medico: rc.semModelo ? (rc.escalou ? 'encaminhou (sem modelo)' : 'fluxo comum (sem modelo)') : (rc.aceitou ? 'aceitou' : 'recusou'),
        desfecho_real: rc.grave ? 'grave (UTI/óbito em 48h)' : 'não grave', medico_acertou: rc.medicoAcertou === null ? 'caso ambíguo' : (rc.medicoAcertou ? 'sim' : 'não'),
        modelo_acertou: rc.modeloAcertou === null ? '' : (rc.modeloAcertou ? 'sim' : 'não')
      };
    }
    chamar('decidir', payload).then(function () {
      delete S.drafts['sel_' + t.id]; delete S.drafts['just_' + t.id]; guardarRascunhos();
      S.recem = t.id; setTimeout(function () { S.recem = null; }, 2500);
      toast(px('check', 24) + ' Decisão registrada.', 'ok');
      liberar(); return atualizar();
    }).catch(function (e) { liberar(btn); erroEm('erro_' + t.id, e.message); });
  }
  function contribuir(btn) {
    var t = E.taskById(btn.dataset.id, porte()), r = btn.dataset.role, k = 'reu_' + t.id + '_' + r;
    var txt = (S.drafts[k] || '').trim();
    if (OBRIGATORIA && !txt) return erroEm('erro_' + t.id + '_' + r, 'Escreva sua fala — pode ser curta.');
    if (!ocupar(btn, 'Registrando…')) return;
    erroEm('erro_' + t.id + '_' + r, '');
    chamar('contribuir', { reuniao_id: t.id, reuniao_titulo: t.titulo, dia: t.day, funcao: r, contribuicao: txt }).then(function () {
      delete S.drafts[k]; guardarRascunhos(); toast(px('balao', 24) + ' Fala registrada.', 'ok'); liberar(); return atualizar();
    }).catch(function (e) { liberar(btn); erroEm('erro_' + t.id + '_' + r, e.message); });
  }
  function comentar(btn) {
    var tipo = btn.dataset.tipo, alvo = btn.dataset.alvo, k = 'com_' + tipo + '_' + alvo;
    var txt = (S.drafts[k] || '').trim();
    if (!txt) return toast('Escreva o comentário antes de enviar.', 'erro');
    if (!ocupar(btn, '…')) return;
    chamar('comentar', { alvo_tipo: tipo, alvo_id: alvo, alvo_funcao: btn.dataset.funcao, comentario: txt }).then(function () {
      delete S.drafts[k]; liberar(); return atualizar();
    }).catch(function (e) { liberar(btn); toast(esc(e.message), 'erro'); });
  }
  function confirmarFuncao(btn) {
    var r = btn.dataset.role, k = 'funcao_' + r, txt = (S.drafts[k] || '').trim();
    if (OBRIGATORIA && !txt) return erroEm('erro_funcao', 'Conte, mesmo que em poucas palavras, por que você assume esta função.');
    if (!ocupar(btn, 'Registrando…')) return;
    chamar('assumirFuncao', { funcao: r, justificativa: txt }).then(function () {
      delete S.drafts[k]; liberar(); S.modal = null; renderModal(true); toast(px(UI.pxPapel(r), 24) + ' Agora você é ' + esc(curtoPapel(r)) + '.', 'ok');
      return atualizar().then(function () {
        if (S.dados && S.dados.hospital.status === 'lobby' && !ARTE.temAvatar(S.eu) && !S.modal) abrirVestiario();
      });
    }).catch(function (e) { liberar(btn); erroEm('erro_funcao', e.message); });
  }
  function copiar(txt) {
    var ok = function () { toast(px('copiar', 24) + ' Copiado: ' + esc(txt), 'ok'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, function () { prompt('Copie:', txt); });
    else { var ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); ok(); } catch (e) { } document.body.removeChild(ta); }
  }
  function entrarComSessao(s) {
    salvarSessao(s);
    S.dados = null; S.primeira = true; S.hash = ''; S.aba = 'mapa';
    S.drafts = lsGet(chaveRasc()) || {};
    render();
    atualizar().then(agendar, agendar);
  }
  function escolherLimiar(lab, de, para) {
    var m = G.MODELS[lab.dataset.labModelo];
    S.labT = para;
    S.drafts.sel_M3 = VIS.NOME_FAIXA[para];
    VIS.animarRange(lab, m, de, para);
    var e = document.querySelector('[data-lab-escolha]'); if (e) e.innerHTML = textoEscolhaLab();
    var e2 = document.getElementById('erro_M3'); if (e2) e2.textContent = '';
  }

  document.addEventListener('submit', function (ev) {
    var f = ev.target; if (!f.dataset.form) return;
    ev.preventDefault();
    var dados = {}; new FormData(f).forEach(function (v, k) { dados[k] = String(v).trim(); });
    var btn = f.querySelector('button[type=submit]');
    if (!ocupar(btn, f.dataset.form === 'criar' ? 'Criando…' : 'Entrando…')) return;
    var p = f.dataset.form === 'criar' ? API.chamar('criarHospital', dados) : API.chamar('entrar', { codigo: dados.codigo.toUpperCase(), nome: dados.nome });
    p.then(function (r) {
      liberar(); entrarComSessao({ codigo: r.codigo, id_jogador: r.id_jogador, nome: r.nome, nome_hospital: r.nome_hospital });
      if (r.retomado) toast('Bem-vindo(a) de volta, ' + esc(r.nome) + '!', 'ok');
    }).catch(function (e) { liberar(btn); toast(esc(e.message), 'erro'); });
  });

  document.addEventListener('input', function (ev) {
    var el = ev.target;
    if (el.matches && el.matches('[data-lab-range]')) {
      var lab = el.closest('.lab');
      S.labT = Number(el.value);
      VIS.atualizarLab(lab, G.MODELS[lab.dataset.labModelo], S.labT);
      return;
    }
    if (el.dataset && el.dataset.draft) {
      S.drafts[el.dataset.draft] = el.value;
      guardarRascunhos();
      atualizarContador(el.dataset.draft);
      if (el.dataset.draft === 'busca_glossario') filtrarGlossario(el.value);
      if (el.tagName === 'TEXTAREA' && el.rows <= 1) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 160) + 'px'; }
    }
  });

  document.addEventListener('change', function (ev) {
    var el = ev.target, a = el.dataset && el.dataset.acaoChange;
    if (el.matches && el.matches('[data-lab-range]')) { var v = Number(el.value); escolherLimiar(el.closest('.lab'), v, VIS.maisProximo(v)); return; }
    if (!a) return;
    if (a === 'sel') {
      var t = E.taskById(el.dataset.task, porte());
      var marcados = Array.prototype.map.call(document.querySelectorAll('input[name="opt_' + t.id + '"]:checked'), function (i) { return i.value; });
      if (t.multi && marcados.length > t.multi.max) {
        el.checked = false;
        marcados = marcados.filter(function (v) { return v !== el.value; });
        toast('Escolha no máximo ' + t.multi.max + '.', 'erro');
      }
      S.drafts['sel_' + t.id] = marcados.join(',');
      var e2 = document.getElementById('erro_' + t.id); if (e2) e2.textContent = '';
    } else if (a === 'filtro-papel') { S.filtro.papel = el.value; render(); }
    else if (a === 'filtro-dia') { S.filtro.dia = el.value; render(); }
  });

  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-acao]');
    if (!el) return;
    var a = el.dataset.acao;
    switch (a) {
      case 'continuar': var u = lsGet('plantaoia_ultima'); if (u) entrarComSessao(u); break;
      case 'sair': abrirModal({ tipo: 'confirmar', titulo: 'Sair do hospital?', texto: 'Seu progresso fica salvo. Para voltar, entre com o código do hospital e o mesmo nome.', acao: 'sair-ok', botao: 'Sair' }); break;
      case 'sair-ok': S.modal = null; sair(false); break;
      case 'apagar-demo': abrirModal({ tipo: 'confirmar', titulo: 'Apagar dados de demonstração?', texto: 'Todos os hospitais criados neste navegador em modo demonstração serão apagados.', acao: 'apagar-demo-ok', botao: 'Apagar' }); break;
      case 'apagar-demo-ok': API.apagarDemo(); lsSet('plantaoia_ultima', null); S.modal = null; sair(true); toast('Dados de demonstração apagados.', 'ok'); break;
      case 'copiar': copiar(el.dataset.texto); break;
      case 'assumir': abrirModal({ tipo: 'funcao', role: el.dataset.role }); break;
      case 'confirmar-funcao': confirmarFuncao(el); break;
      case 'liberar':
        if (!ocupar(el, '…')) return;
        chamar('liberarFuncao', { funcao: el.dataset.role }).then(function () { liberar(); return atualizar(); }).catch(function (e) { liberar(el); toast(esc(e.message), 'erro'); });
        break;
      case 'iniciar':
        if (!ocupar(el, 'Iniciando…')) return;
        chamar('iniciar', {}).then(function () { liberar(); return atualizar(); }).catch(function (e) { liberar(el); toast(esc(e.message), 'erro'); });
        break;
      case 'aba': S.aba = el.dataset.aba || 'mapa'; S.animarAba = true; render(); S.animarAba = false; break;
      case 'hoje-toggle': S.hojeFechado = !S.hojeFechado; render(); break;
      case 'zoom': S.zoom = Math.max(1, Math.min(2.2, S.zoom + (Number(el.dataset.z) > 0 ? 0.4 : -0.4))); render(); break;
      case 'abrir': abrirModal({ tipo: 'tarefa', id: el.dataset.id }); break;
      case 'boletim': abrirModal({ tipo: 'boletim', dia: Number(el.dataset.dia) }); break;
      case 'termo': S.modalAnterior = S.modal; abrirModal({ tipo: 'termo', k: el.dataset.k }); break;
      case 'voltar-modal': var ant = S.modalAnterior; S.modalAnterior = null; if (ant && ant.tipo !== 'termo') abrirModal(ant); else fecharModal(); break;
      case 'ajuda': abrirModal({ tipo: 'ajuda' }); break;
      case 'vestiario': abrirVestiario(); break;
      case 'av-aba': S.vestAba = el.dataset.aba; refazerModal(); break;
      case 'av-set': if (S.avRasc) { S.avRasc[el.dataset.k] = el.dataset.v; refazerModal(); } break;
      case 'av-aleatorio': S.avRasc = ARTE.aleatorio(Date.now() + S.sessao.nome); refazerModal(); break;
      case 'av-gerar': abrirModal({ tipo: 'cracha', previa: true }); break;
      case 'voltar-vestiario': abrirModal({ tipo: 'vestiario' }); break;
      case 'pegar-cracha': pegarCracha(el); break;
      case 'meu-cracha': if (ARTE.temAvatar(S.eu)) abrirModal({ tipo: 'cracha' }); else abrirVestiario(); break;
      case 'baixar-cracha': baixarCracha(el); break;
      case 'fechar': fecharModal(); break;
      case 'fechar-fundo': if (S.modal && S.modal.tipo !== 'funcao') fecharModal(); break;
      case 'decidir': decidir(el); break;
      case 'contribuir': contribuir(el); break;
      case 'comentar': comentar(el); break;
      case 'ver-relatorio': S.aba = 'relatorio'; S.modal = null; renderModal(true); render(); break;
      case 'ir-mural': S.aba = 'mural'; S.modal = null; renderModal(true); render(); break;
      case 'imprimir': window.print(); break;
      case 'sala': abrirModal({ tipo: 'sala', k: el.dataset.sala }); break;
      case 'carta-virar': {
        var kv = el.dataset.tid + ':' + el.dataset.m; S.virar[kv] = !S.virar[kv];
        var c = el.closest('.carta'); if (c) c.classList.toggle('virada', !!S.virar[kv]);
        break;
      }
      case 'carta-mesa': {
        var selG = String(S.drafts.sel_G2 || '').split(',').filter(Boolean), mk = el.dataset.m, pos = selG.indexOf(mk);
        if (pos >= 0) selG.splice(pos, 1);
        else if (selG.length >= 3) { toast('A mesa já tem 3 modelos. Tire um antes de trazer outro.', 'erro'); break; }
        else selG.push(mk);
        S.drafts.sel_G2 = selG.join(','); substituirBloco('G2');
        break;
      }
      case 'carta-escolher': S.drafts['sel_' + el.dataset.tid] = el.dataset.m; substituirBloco(el.dataset.tid); break;
      case 'painel-por': {
        var selP = String(S.drafts.sel_T6 || '').split(',').filter(Boolean), id = el.dataset.m, pp = selP.indexOf(id);
        if (pp >= 0) selP.splice(pp, 1);
        else if (selP.length >= 4) { toast('O painel já tem 4 gráficos. Tire um antes de colocar outro.', 'erro'); break; }
        else selP.push(id);
        S.drafts.sel_T6 = selP.join(','); substituirBloco('T6');
        break;
      }
      case 'lab-snap': { var labEl = el.closest('.lab'), rg = labEl.querySelector('[data-lab-range]'); escolherLimiar(labEl, Number(rg.value), Number(el.dataset.v)); break; }
      case 'ir-fala': {
        var alvo = document.getElementById(el.dataset.alvo);
        if (alvo) { alvo.scrollIntoView({ behavior: VIS.reduzido ? 'auto' : 'smooth', block: 'center' }); alvo.classList.remove('destaca'); void alvo.offsetWidth; alvo.classList.add('destaca'); }
        break;
      }
    }
  });

  /* arrastar cartas para a mesa do corpo clínico */
  document.addEventListener('dragstart', function (ev) {
    var c = ev.target.closest && ev.target.closest('.carta[draggable="true"]');
    if (!c) return;
    ev.dataTransfer.setData('text/plain', c.dataset.carta);
    ev.dataTransfer.effectAllowed = 'move';
    c.classList.add('arrastando');
    var mesa = document.querySelector('#modal .mesa'); if (mesa) mesa.classList.add('pronta');
  });
  document.addEventListener('dragend', function () {
    document.querySelectorAll('.arrastando').forEach(function (c) { c.classList.remove('arrastando'); });
    document.querySelectorAll('.mesa.pronta, .mesa.alvo').forEach(function (m) { m.classList.remove('pronta', 'alvo'); });
  });
  document.addEventListener('dragover', function (ev) { var z = ev.target.closest && ev.target.closest('.mesa'); if (!z) return; ev.preventDefault(); z.classList.add('alvo'); });
  document.addEventListener('dragleave', function (ev) { var z = ev.target.closest && ev.target.closest('.mesa'); if (z && !z.contains(ev.relatedTarget)) z.classList.remove('alvo'); });
  document.addEventListener('drop', function (ev) {
    var z = ev.target.closest && ev.target.closest('.mesa');
    if (!z) return;
    ev.preventDefault();
    var mk = ev.dataTransfer.getData('text/plain');
    var selG = String(S.drafts.sel_G2 || '').split(',').filter(Boolean);
    if (!G.MODELS[mk] || selG.indexOf(mk) >= 0) return;
    if (selG.length >= 3) { toast('A mesa já tem 3 modelos. Tire um antes de trazer outro.', 'erro'); return; }
    selG.push(mk); S.drafts.sel_G2 = selG.join(','); substituirBloco('G2');
  });

  document.addEventListener('keydown', function (ev) {
    var alvo = ev.target.closest && ev.target.closest('[data-acao="sala"]');
    if ((ev.key === 'Enter' || ev.key === ' ') && alvo && alvo.tagName !== 'BUTTON') { ev.preventDefault(); abrirModal({ tipo: 'sala', k: alvo.getAttribute('data-sala') }); return; }
    if (ev.key === 'Escape') {
      if (S.modal && S.modal.tipo !== 'funcao') fecharModal();
      else if (!S.modal && S.aba !== 'mapa' && S.st) { S.aba = 'mapa'; render(); }
    }
  });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && S.sessao) atualizar().then(agendar, agendar); else agendar(); });
  window.addEventListener('storage', function (ev) { if (API.demo && S.sessao && ev.key && ev.key.indexOf('plantaoia_demo_db') === 0) atualizar(); });

  /* ---------------- início ---------------- */
  var s = ssGet('plantaoia_sessao');
  if (s && s.codigo) entrarComSessao(s);
  else render();
})(window.GAME, window.ENGINE, window.UI, window.API, window.CONFIG, window.VIS, window.ARTE);
