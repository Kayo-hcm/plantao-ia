/* ==========================================================================
   PLANTÃO IA — conquistas (reveladas no fim do jogo, junto com o relatório)
   Cada conquista olha o estado final do hospital (flags das decisões).
   portes: (opcional) só aparece nesses portes.
   ========================================================================== */
(function (G) {
  'use strict';
  function sem(lista, x) { return (lista || []).indexOf(x) < 0; }
  var RA = ['regional', 'alta'], ALTA = ['alta'];

  G.CONQUISTAS = [
    { id: 'regua', icone: 'star', titulo: 'Régua clínica',
      desc: 'Definiu o sucesso pelo paciente, não pela acurácia.',
      ok: function (f) { return f.criterio === 'clinico'; } },
    { id: 'letras', icone: 'report', titulo: 'Leitor de letras miúdas',
      desc: 'Deixou o TriAI Premium (vazamento) e o AcuraMax (acurácia enganosa) fora da mesa.',
      ok: function (f) { return f.shortlist && sem(f.shortlist, 'D') && sem(f.shortlist, 'E'); } },
    { id: 'limiar', icone: 'activity', titulo: 'Mão firme no limiar',
      desc: 'Escolheu o ponto de corte que equilibra pacientes graves encontrados e alarmes falsos.',
      ok: function (f, st) { var t = st.tarefas.M3; return t && t.opt && t.opt.q === 2; } },
    { id: 'humano', icone: 'users', titulo: 'Humano no circuito',
      desc: 'O alerta da urgência tem protocolo, revisão humana e equipe treinada.',
      ok: function (f) { return f.fluxo === 'humano'; } },
    { id: 'vazamento', icone: 'alert', titulo: 'Caçador de vazamentos', portes: RA,
      desc: 'Preparou o histórico do bloco sem informações do futuro e testou respeitando o tempo.',
      ok: function (f) { return f.prep === 'cuidadoso' && (f.valid === 'temporal' || f.valid === 'holdout'); } },
    { id: 'compras', icone: 'box', titulo: 'Estoque sem susto',
      desc: 'Corrigiu a demanda escondida pelas faltas e a dengue não pegou o hospital de surpresa.',
      ok: function (f, st) { return f.prepCompras === 'corrigido' && (st.porte !== 'alta' || f.compra === 'seguranca'); } },
    { id: 'alertas', icone: 'pill', titulo: 'Alerta que importa', portes: RA,
      desc: 'Os alertas de interação passaram a interromper só quando importa — e são levados a sério.',
      ok: function (f, st) { return f.alertasRegra === 'regra' && (st.porte !== 'alta' || f.alertasFarm === 'curada'); } },
    { id: 'anomalia', icone: 'microscope', titulo: 'Anomalia não é culpa', portes: RA,
      desc: 'Investigou com contexto e sigilo antes de acusar alguém.',
      ok: function (f) { return f.anomalia === 'investigar'; } },
    { id: 'transplante', icone: 'heart', titulo: 'Dentro das regras', portes: ALTA,
      desc: 'Usou a IA para apoiar o cuidado no transplante, sem mexer na fila, e validou nos pacientes do hospital.',
      ok: function (f) { return (f.txUso === 'enxerto' || f.txUso === 'oferta') && f.txValid === 'validar'; } },
    { id: 'planoB', icone: 'server', titulo: 'Plano B',
      desc: 'Na crise do sistema, o plantão foi avisado e seguiu com o protocolo manual.',
      ok: function (f) { return f.contingencia === true; } },
    { id: 'lgpd', icone: 'lock', titulo: 'Guardião dos dados',
      desc: 'Pseudonimizou, controlou acessos e não negociou dados de pacientes.',
      ok: function (f) { return f.lgpd === 'pseudo' && f.contrato !== 'dados'; } },
    { id: 'painel', icone: 'chart', titulo: 'Painel que fala',
      desc: 'Escolheu uma ferramenta adequada e quatro gráficos que levam à ação.',
      ok: function (f, st) { var t = st.tarefas.T4; return f.painelBons === 4 && t && t.opt && t.opt.q === 2; } },
    { id: 'deriva', icone: 'refresh', titulo: 'Olho na deriva', portes: RA,
      desc: 'Percebeu que o mundo mudou e ajustou o modelo com testes.',
      ok: function (f, st) { return st.porte === 'alta' ? f.monit === 'painel' : f.deriva === 'recalibrar'; } },
    { id: 'equidade', icone: 'scale', titulo: 'Equidade em primeiro lugar',
      desc: 'Restringiu o modelo ao que foi validado e foi atrás dos grupos mal atendidos.',
      ok: function (f) { return f.vies === 'restringir'; } },
    { id: 'governanca', icone: 'briefcase', titulo: 'Transparência de verdade',
      desc: 'Respondeu ao caso sem alerta com transparência (e, nos hospitais maiores, com um Comitê de IA).',
      ok: function (f, st) { return f.incidente === 'transparencia' && (st.porte === 'essencial' || f.gov === 'comite'); } },
    { id: 'piloto', icone: 'monitor', titulo: 'Começo cuidadoso',
      desc: 'O modelo entrou no plantão em silêncio ou em piloto supervisionado.',
      ok: function (f) { return f.golive === 'silencioso' || f.golive === 'piloto'; } },
    { id: 'olho', icone: 'stethoscope', titulo: 'Olho clínico',
      desc: 'Conduta adequada em pelo menos 8 de cada 10 casos do plantão.',
      ok: function (f, st) { var r = st.casosResumo; return r && r.medicoAvaliados >= 10 && r.medicoAcertos / r.medicoAvaliados >= 0.8; } },
    { id: 'discordar', icone: 'balao', titulo: 'Discordar com razão',
      desc: 'Discordou do modelo, com razão, em pelo menos 3 casos.',
      ok: function (f, st) { return st.casosResumo && st.casosResumo.discordouCerto >= 3; } },
    { id: 'incidente', icone: 'alerta', titulo: 'Pronto para o imprevisto',
      desc: 'Leu os sinais, preparou-se na reunião da semana 2 e atravessou o incidente com poucos danos.',
      ok: function (f, st) {
        if (!f.prepIncidente) return false;
        var bom = false; st.dias.forEach(function (d) { if (d) d.eventos.forEach(function (e) { if (/_fim$/.test(e.id) && e.tom === 'bom') bom = true; }); });
        return bom;
      } },
    { id: 'planos', icone: 'calendario', titulo: 'Equipe que planeja',
      desc: 'As prioridades das três reuniões semanais foram coerentes com o que vinha pela frente.',
      ok: function (f, st) { return ['P1', 'P2', 'P3'].every(function (k) { var t = st.tarefas[k]; return t && t.opt && t.opt.q === 2; }); } },
    { id: 'orcamento', icone: 'moeda', titulo: 'Contas em dia',
      desc: 'Fechou o ciclo sem estourar o orçamento.',
      ok: function (f, st) { return st.ind.orcamento >= 0; } },
    { id: 'dialogo', icone: 'message', titulo: 'Equipe que conversa',
      desc: 'Pelo menos 5 comentários entre colegas no Mural.',
      ok: function (f, st, dados) { return (dados.comentarios || []).length >= 5; } },
    { id: 'escrita', icone: 'book', titulo: 'Porquês bem contados',
      desc: 'Média de pelo menos 25 palavras por justificativa.',
      ok: function (f, st, dados) {
        var js = (dados.decisoes || []).filter(function (d) { return d.tipo === 'decisao'; });
        if (!js.length) return false;
        var tot = js.reduce(function (s, d) { return s + String(d.justificativa || '').trim().split(/\s+/).filter(Boolean).length; }, 0);
        return tot / js.length >= 25;
      } }
  ];

  G.conquistasDe = function (st, dados) {
    return G.CONQUISTAS.filter(function (c) { return !c.portes || c.portes.indexOf(st.porte) >= 0; }).map(function (c) {
      var ok = false;
      try { ok = !!c.ok(st.flags, st, dados || {}); } catch (e) { ok = false; }
      return { id: c.id, icone: c.icone, titulo: c.titulo, desc: c.desc, ok: ok };
    });
  };
})(window.GAME);
