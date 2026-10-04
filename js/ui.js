/* ==========================================================================
   PLANTÃO IA — componentes visuais compartilhados (jogo e painel do professor)
   ========================================================================== */
window.UI = (function (G, E, PIX) {
  'use strict';
  var esc = G.esc;

  /* Ícones vetoriais do jogo (js/arte.js). */
  function ic(nome, cls, tam) { return PIX.icone(nome, tam || 18, 'ic ' + (cls || '')); }

  var PX_PAPEL = { gestao: 'maleta', clinico: 'medico', operacoes: 'caixa', cirurgia: 'bisturi', farmacia: 'pilula', ti: 'servidor' };
  function pxPapel(role) { return PX_PAPEL[role] || 'estrela'; }

  function chipPapel(role, extra) {
    var r = G.ROLES[role]; if (!r) return '';
    return '<span class="chip-papel" style="--c:' + r.cor + '"><span class="chip-ic">' + PIX.icone(pxPapel(role), 13) + '</span>' + esc(r.curto) + (extra ? ' · ' + esc(extra) : '') + '</span>';
  }
  /** Busto do jogador (avatar salvo ou padrão da função), usado em listas, mural e equipe. */
  function rosto(quem, papel, tam) {
    var R = G.ROLES[papel];
    return PIX.rostoSVG(PIX.aparencia(quem, papel), tam || 28, R ? PIX.clarear(R.cor, .78) : '#E3ECF6');
  }

  function fmtInd(id, v) {
    if (id === 'orcamento') return G.fmt(v);
    return String(Math.round(v));
  }

  function deltas(delta, compacto) {
    if (!delta) return '';
    var ks = Object.keys(delta).filter(function (k) { return delta[k]; });
    if (!ks.length) return compacto ? '' : '<span class="delta neutro">sem efeito nos indicadores</span>';
    return ks.map(function (k) {
      var ind = G.INDICATORS.filter(function (i) { return i.id === k; })[0];
      var v = delta[k];
      var txt = k === 'orcamento' ? (v > 0 ? '+' : '') + G.fmt(v) : (v > 0 ? '+' : '') + (Math.abs(v) < 1 ? String(Math.round(v * 10) / 10).replace('.', ',') : Math.round(v));
      return '<span class="delta ' + (v > 0 ? 'pos' : 'neg') + '">' + (ind ? PIX.icone(ind.icone, 12) : '') + esc(ind ? ind.curto : k) + ' ' + txt + '</span>';
    }).join('');
  }

  function badgeQ(q) {
    var cls = q === 2 ? 'q2' : q === 1 ? 'q1' : q === 0 ? 'q0' : 'qn';
    return '<span class="badge-q ' + cls + '">' + esc(E.qLabel(q)) + '</span>';
  }

  function quando(ts) {
    if (!ts) return '';
    var d = new Date(ts); if (isNaN(d)) return '';
    var s = (Date.now() - d.getTime()) / 1000;
    if (s < 45) return 'agora';
    if (s < 3600) return 'há ' + Math.round(s / 60) + ' min';
    if (s < 86400) return 'há ' + Math.round(s / 3600) + ' h';
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function paragrafos(t) {
    return esc(t || '').split(/\n{2,}/).map(function (p) { return '<p>' + p.replace(/\n/g, '<br>') + '</p>'; }).join('');
  }

  function faixa(indice) {
    if (indice >= 80) return { nome: 'Hospital referência em IA responsável', cls: 'q2' };
    if (indice >= 65) return { nome: 'Programa promissor, com lacunas', cls: 'q1' };
    if (indice >= 50) return { nome: 'Aprendizado caro', cls: 'q1' };
    return { nome: 'IA que custou caro e decidiu pouco', cls: 'q0' };
  }

  /** Caixa "Na vida real" com um caso verídico ligado à tarefa. */
  function caso(c, compacto) {
    if (!c) return '';
    return '<aside class="caso-real' + (compacto ? ' compacto' : '') + '"><header>' + PIX.icone('jornal', 18) + '<span>Na vida real</span></header>' +
      '<b>' + esc(c.titulo) + '</b><p>' + esc(c.texto) + '</p>' + (c.fonte ? '<small>Fonte: ' + esc(c.fonte) + '</small>' : '') + '</aside>';
  }

  /** Referência de boa prática para uma tarefa (usada no relatório). */
  function referenciaDe(st, t) {
    if (t.referencia) return t.referencia;
    var ctx = E.ctxFor(st, t.id);
    if (t.multi && t.id === 'T6') return 'Mediana e percentil 90 da espera, mapa de calor da ocupação, barras com meta para a rastreabilidade e dias de cobertura do estoque.';
    if (t.multi && t.id === 'G2') return 'Deixar de fora o TriAI (vazamento: usa o pedido de UTI) e o AcuraMax (acurácia alta com sensibilidade de 15%).';
    var boas = E.getOptions(t, ctx).filter(function (o) {
      var r = E.resolveOption(t, ctx, o.id); return r.q === 2;
    }).map(function (o) { return o.label; });
    if (!boas.length) return 'Sem resposta única: o que conta é a coerência da justificativa com os riscos e com as demais decisões.';
    return boas.join(' · ');
  }

  function spark(valores, cor) {
    if (valores.length < 2) return '';
    var w = 120, h = 32, min = Math.min.apply(null, valores), max = Math.max.apply(null, valores);
    if (max === min) { max += 1; min -= 1; }
    var pts = valores.map(function (v, i) {
      return (i * w / (valores.length - 1)).toFixed(1) + ',' + (h - 3 - (v - min) / (max - min) * (h - 6)).toFixed(1);
    });
    return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true"><polyline fill="none" stroke="' + (cor || 'currentColor') + '" stroke-width="2.5" points="' + pts.join(' ') + '"/></svg>';
  }

  /* ---------------- Relatório final ---------------- */
  function relatorio(st, dados, opts) {
    opts = opts || {};
    var h = '', porte = st.porte, PT = G.PORTES[porte];
    var fx = faixa(st.indice);
    var ini = E.initialInd(porte);
    h += '<section class="rel-topo">' +
      '<div class="rel-indice ' + fx.cls + '">' + PIX.icone('trofeu', 36) + '<span class="rel-num">' + st.indice + '</span><span class="rel-lbl">Índice de maturidade em IA</span></div>' +
      '<div class="rel-resumo"><h2>' + esc(st.hospitalNome) + '</h2><p class="rel-porte">' + esc(PT.nome) + ' · ' + esc(PT.resumo) + '</p><p class="rel-faixa">' + esc(fx.nome) + '</p>' +
      '<div class="rel-kpis">' +
      '<div><b>' + st.qualidade + '%</b><span>Qualidade das decisões<br><small>perto das boas práticas (60% do índice)</small></span></div>' +
      '<div><b>' + st.saude + '</b><span>Saúde do hospital<br><small>média dos indicadores (40% do índice)</small></span></div>' +
      '<div><b>' + G.fmt(st.ind.orcamento) + '</b><span>Saldo do orçamento<br><small>de ' + G.fmt(ini.orcamento) + '</small></span></div>' +
      '</div>' + (opts.parcial ? '<p class="nota alerta">Relatório parcial: o jogo deste hospital ainda está no dia ' + st.dia + '.</p>' : '') +
      '</div></section>';

    h += '<section class="rel-bloco"><h3>' + PIX.icone('grafico', 18) + 'Indicadores: início × fim</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Indicador</th><th>Início</th><th>Fim</th><th>Variação</th></tr></thead><tbody>';
    G.INDICATORS.forEach(function (i) {
      var a = ini[i.id], b = st.ind[i.id], d = b - a;
      h += '<tr><td>' + PIX.icone(i.icone, 12) + ' ' + esc(i.nome) + '</td><td>' + fmtInd(i.id, a) + '</td><td><b>' + fmtInd(i.id, b) + '</b></td><td class="' + (d >= 0 ? 'pos' : 'neg') + '">' +
        (i.id === 'orcamento' ? (d > 0 ? '+' : '') + G.fmt(d) : (d > 0 ? '+' : '') + Math.round(d)) + '</td></tr>';
    });
    h += '</tbody></table></div></section>';

    h += '<section class="rel-bloco"><h3>' + PIX.icone('equipe', 18) + 'Por função</h3><div class="rel-papeis">';
    st.roles.forEach(function (r) {
      var p = st.porPapel[r], R = G.ROLES[r], info = G.papelInfo(r, porte);
      var quem = st.idx.holder[r] ? st.idx.holder[r].nome : '—';
      var pct = p.qn ? Math.round(p.qsum / (2 * p.qn) * 100) : null;
      h += '<div class="rel-papel" style="--c:' + R.cor + '"><div class="rel-papel-top">' + rosto(quem, r, 32) + '<div><b>' + esc(info.nome) + '</b><small>' + esc(quem) + '</small></div></div>' +
        '<div class="rel-barras"><span class="q2">' + p.q2 + ' boa prática</span><span class="q1">' + p.q1 + ' aceitável</span><span class="q0">' + p.q0 + ' risco</span></div>' +
        '<small>' + p.feitas + '/' + p.decisoes + ' decisões' + (p.casos ? ' · ' + p.casosFeitos + '/' + p.casos + ' casos' : '') + ' · ' + p.reunioes + ' falas em reunião' + (pct !== null ? ' · qualidade ' + pct + '%' : '') + '</small></div>';
    });
    h += '</div></section>';

    if (G.conquistasDe) h += '<section class="rel-bloco"><h3>' + PIX.icone('estrela', 18) + 'Conquistas da equipe</h3>' + conquistas(st, dados, false) + '</section>';

    var H = G.HISTORIAS && G.HISTORIAS[st.historia];
    if (H) {
      h += '<section class="rel-bloco"><h3>' + PIX.icone(H.icone || 'alerta', 18) + 'O incidente do mês: ' + esc(H.nome) + '</h3><p>' + esc(H.resumo) + ' Começou no dia ' + st.I0 + '.</p>' +
        (st.flags.prepIncidente ? '<p class="nota bom">A equipe leu os sinais e se preparou na reunião da semana 2.</p>' : '<p class="nota">A equipe não escolheu a preparação para o incidente na reunião da semana 2.</p>') + '</section>';
    }
    var casos = st.tasks.filter(function (t) { return t.apresentacao === 'caso' && st.tarefas[t.id] && st.tarefas[t.id].status === 'concluida'; });
    if (casos.length) {
      h += '<section class="rel-bloco"><h3>' + PIX.icone('medico', 18) + 'Os casos do plantão: o médico testou o modelo</h3>' + (G.htmlCasos ? G.htmlCasos(st.casosResumo, st.flags.shortlist, st.flags.modelo) : '') +
        '<div class="tbl-wrap"><table class="tbl tbl-casos-rel"><thead><tr><th>Dia</th><th>Paciente</th><th>O modelo</th><th>O médico</th><th>Desfecho</th><th>Conduta</th></tr></thead><tbody>' +
        casos.map(function (t) {
          var inf = st.tarefas[t.id], c = inf.caso || {};
          var mod = c.semModelo ? '<span class="suave">sem modelo</span>' : esc((G.MODELS[c.modelo] || {}).nome || c.modelo) + ': ' + c.escore + '% ' + (c.alerta ? '<b>alerta</b>' : 'sem alerta');
          var med = c.semModelo ? (c.escalou ? 'encaminhou' : 'fluxo comum') : (c.aceitou ? 'aceitou' : '<b>discordou</b>');
          return '<tr><td>' + t.day + '</td><td>' + esc(c.paciente || '') + '</td><td>' + mod + '</td><td>' + med + '<details><summary>porquê</summary>' + paragrafos(inf.dec.justificativa) + '</details></td>' +
            '<td>' + (c.grave ? 'grave' : 'não grave') + '</td><td>' + badgeQ(inf.opt.q) + '</td></tr>';
        }).join('') + '</tbody></table></div></section>';
    }

    h += '<section class="rel-bloco"><h3>' + PIX.icone('lupa', 18) + 'Decisão a decisão: o que cada escolha causou</h3>';
    for (var d = 1; d <= (G.NDIAS || 30); d++) {
      var dia = st.dias[d]; if (!dia) break;
      var I = E.infoDia(st, d);
      h += '<div class="rel-dia"><h4>Dia ' + d + ' — ' + esc(I.titulo) + ' <small>' + esc(I.fase) + '</small></h4>';
      if (dia.eventos.length) {
        h += '<div class="rel-eventos">' + dia.eventos.map(function (ev) {
          return '<div class="ev ev-' + ev.tom + '"><b>' + esc(ev.titulo) + '.</b> ' + esc(ev.texto) + ' ' + deltas(ev.delta, true) + '</div>';
        }).join('') + '</div>';
      }
      st.tasks.filter(function (t) { return t.day === d && t.apresentacao !== 'caso'; }).forEach(function (t) {
        var info = st.tarefas[t.id];
        if (t.type === 'decisao') {
          var feito = info && info.status === 'concluida';
          h += '<article class="rel-item" style="--c:' + G.ROLES[t.role].cor + '"><header>' + chipPapel(t.role, feito ? info.dec.jogador : '') + '<b>' + esc(t.titulo) + '</b>' + (feito ? badgeQ(info.opt.q) : '<span class="badge-q qn">Não decidida</span>') + '</header>';
          if (feito) {
            h += '<p class="rel-escolha"><span>Escolha:</span> ' + esc(info.opt.label) + '</p>' +
              '<div class="rel-just"><span>Justificativa</span>' + paragrafos(info.dec.justificativa) + '</div>' +
              (info.opt.consequencia ? '<p class="rel-cons"><span>Consequência:</span> ' + esc(info.opt.consequencia) + ' ' + deltas(info.delta, true) + '</p>' : '') +
              (info.opt.comentario ? '<p class="rel-coment"><span>Leitura de referência:</span> ' + esc(info.opt.comentario) + '</p>' : '');
          }
          h += '<p class="rel-ref"><span>Boa prática:</span> ' + esc(referenciaDe(st, t)) + '</p>' +
            '<p class="rel-conceito"><span>O que estava em jogo:</span> ' + esc(t.conceito) + '</p>' +
            (t.caso ? '<p class="rel-caso"><span>Na vida real:</span> ' + esc(t.caso.titulo) + ' — ' + esc(t.caso.fonte || '') + '</p>' : '') +
            '<p class="rel-ra">' + (t.ra || []).map(function (r) { return '<span title="' + esc(G.RA[r] || '') + '">' + r + '</span>'; }).join('') + '</p></article>';
        } else {
          var c = (info && info.contribs) || {};
          h += '<article class="rel-item reuniao"><header>' + PIX.icone('balao', 18) + '<b>' + esc(t.titulo) + '</b></header>';
          t.roles.forEach(function (r) {
            var x = c[r];
            h += '<div class="rel-fala">' + chipPapel(r, x ? x.jogador : '') + (x ? paragrafos(x.contribuicao) : '<p class="suave">Sem contribuição.</p>') + '</div>';
          });
          h += '</article>';
        }
      });
      h += '</div>';
    }
    h += '</section>';
    h += '<p class="rel-rodape">“' + esc(G.FIO) + '”</p>';
    return h;
  }

  function conquistas(st, dados, animar, soDesbloqueadas) {
    var lista = G.conquistasDe(st, dados || {});
    var n = lista.filter(function (c) { return c.ok; }).length;
    var mostrar = soDesbloqueadas ? lista.filter(function (c) { return c.ok; }) : lista;
    return '<p class="conq-total"><b>' + n + '</b> de ' + lista.length + ' conquistas' + (soDesbloqueadas && n < lista.length ? ' · as demais estão no relatório' : '') + '</p><div class="conquistas' + (animar ? ' animar' : '') + '">' +
      mostrar.map(function (c, i) {
        return '<div class="conq ' + (c.ok ? 'ok' : 'bloq') + '" style="animation-delay:' + (i * 0.12).toFixed(2) + 's">' +
          '<span class="conq-ic">' + PIX.icone(c.ok ? c.icone : 'cadeado', 36) + '</span><div><b>' + esc(c.titulo) + '</b><small>' + esc(c.desc) + '</small></div></div>';
      }).join('') + '</div>';
  }

  return {
    conquistas: conquistas, ic: ic, pxPapel: pxPapel, chipPapel: chipPapel, rosto: rosto, fmtInd: fmtInd, deltas: deltas, badgeQ: badgeQ, quando: quando,
    paragrafos: paragrafos, faixa: faixa, spark: spark, relatorio: relatorio, referenciaDe: referenciaDe, caso: caso
  };
})(window.GAME, window.ENGINE, window.ARTE);
