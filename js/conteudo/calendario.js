/* ==========================================================================
   PLANTÃO IA — calendário de 30 dias
   · Em que dia cada tarefa e cada evento acontece (G.CAL_TAREFAS, G.CAL_EVENTOS)
   · Reuniões semanais (S1–S4) e planos da semana (P1–P3)
   · Decisões médicas novas: quando ligar o modelo (M6) e se ele fica (M7)
   · Incidentes menores e pequenos acontecimentos sorteados por hospital
   ========================================================================== */
(function (G) {
  'use strict';
  var TODOS = G.TODOS, RA = ['regional', 'alta'];
  var esc = G.esc, M = G.MODELS;
  function modeloAtual(ctx) { return M[ctx.flags.modelo] || null; }
  function tem(lista, x) { return (lista || []).indexOf(x) >= 0; }

  /* ---------------- dia de cada tarefa já existente ---------------- */
  G.CAL_TAREFAS = {
    G1: 1, M1: 1, T1: 1, C2: 1, F1: 1, E1: 1,
    G2: 2, T2: 2, E2: 2, TX1: 2, F2: 2,
    R1: 3, F3: 3, T3: 3, C3: 3, G3: 3,
    M2: 4, C4: 4,
    M3: 5, F4: 5, RP: 5, R2: 5,
    G4: 6, T4: 6, TM: 6,
    G5: 9, M4: 10, TX2: 10, F5: 10, T5: 11, C5: 11, C6: 12, RT: 12,
    E5: 23, T6: 23, R4: 24, RB: 24, M5: 24, G6: 25, F6: 25,
    R5: 30
  };

  /* ---------------- dia de cada evento já existente ----------------
     número = dia fixo · 'I+n' = n dias depois do início do incidente da história */
  G.CAL_EVENTOS = {
    e4_D: 9, e4_E: 9,
    e5_crise_nuvem: 11, e5_crise_local: 11, e5_crise_hibrida: 11,
    e5_manual: 9, e5_etl: 9, e5_redigitacao: 9, e5_gpu: 9, e5_anonimo: 9, e5_silencioso: 9,
    e5_dash_planilha: 8, e5_dash_consultoria: 8, e5_dash_bi_sem: 8, e5_dash_bi_ok: 8, e5_dash_pep: 8,
    e5_alertas_ml: 7, e5_alertas_regra: 7,
    e6_deriva_ok: 24, e6_deriva: 24,
    e6_kfold: 13, e6_vazamento: 13,
    e6_lgpd: 10, e6_terceiro: 10,
    e6_dados_vendidos: 13, e6_robusto: 13, e6_validacao: 13, e6_agenda: 13, e6_barras: 13, e6_sem_mlops: 13,
    e6_pausada: 12,
    e6_dengue_ok: 'I+1', e6_dengue_falta: 'I+1',
    e7_orcamento_ok: 30, e7_orcamento_estouro: 30, e7_comite: 30, e7_sem_gov: 30, e7_painel: 30, e7_anomalia: 30
  };

  /* ---------------- balanço da semana (reuniões S1–S4) ---------------- */
  function pct(a, b) { return b ? Math.round(a / b * 100) + '%' : '—'; }
  G.htmlCasos = function (r, shortlist, emUso) {
    if (!r || !r.n) return '<p class="suave">Nenhum caso testado ainda.</p>';
    var h = '<div class="casos-kpis"><div><b>' + r.n + '</b><span>casos testados</span></div>' +
      '<div><b>' + pct(r.medicoAcertos, r.medicoAvaliados) + '</b><span>condutas adequadas do médico</span></div>' +
      (r.comModelo ? '<div><b>' + pct(r.modeloAcertos, r.comModelo) + '</b><span>acertos do modelo em uso</span></div>' +
        '<div><b>' + r.discordou + '</b><span>vezes em que o médico discordou<br><small>' + r.discordouCerto + ' com razão</small></span></div>' : '') + '</div>';
    var ids = (shortlist || []).filter(function (k) { return r.porModelo[k]; });
    if (ids.length) {
      h += G.tbl(['Modelo', 'Graves reconhecidos', 'Alarmes falsos', 'Acertos no total'], ids.map(function (k) {
        var p = r.porModelo[k];
        return ['<b>' + esc(M[k].nome) + '</b>' + (k === emUso ? ' <small>(em uso)</small>' : ''),
          '<b>' + p.gravesAlerta + ' de ' + p.graves + '</b>', p.falsos + ' em ' + p.naoGraves + ' não graves', p.acertos + ' de ' + p.n + ' (' + pct(p.acertos, p.n) + ')'];
      }), 'tbl-casos');
      h += '<p class="nota">Os outros candidatos não foram usados no plantão: a tabela mostra o que eles <i>teriam</i> indicado nos mesmos pacientes.</p>';
    }
    return h;
  };
  G.htmlSemana = function (ctx) {
    var s = ctx.semana; if (!s) return '';
    var h = '<div class="balanco"><h4>Balanço da semana ' + s.n + ' (dias ' + s.de + ' a ' + s.ate + ')</h4>';
    h += G.tbl(['Indicador', 'Início da semana', 'Agora', 'Variação'], G.INDICATORS.map(function (i) {
      var a = s.indInicio[i.id], b = s.indFim[i.id], d = b - a;
      var f = function (v) { return i.id === 'orcamento' ? G.fmt(v) : Math.round(v); };
      return [esc(i.nome), f(a), '<b>' + f(b) + '</b>', '<span class="' + (d >= 0 ? 'pos' : 'neg') + '">' + (d > 0 ? '+' : '') + (i.id === 'orcamento' ? G.fmt(d) : Math.round(d)) + '</span>'];
    }), 'tbl-balanco');
    if (s.decisoes.length) {
      h += '<p><b>O que a equipe decidiu:</b></p><ul class="balanco-lista">' + s.decisoes.map(function (d) {
        return '<li><span class="pill">' + esc((G.ROLES[d.role] || {}).curto || d.role) + '</span> ' + esc(d.titulo) + ' → <i>' + esc(d.label) + '</i></li>';
      }).join('') + '</ul>';
    }
    if (s.eventos.length) {
      h += '<p><b>O que aconteceu:</b></p><ul class="balanco-lista">' + s.eventos.map(function (e) {
        return '<li class="ev-' + e.tom + '">' + esc(e.titulo) + '</li>';
      }).join('') + '</ul>';
    }
    if (s.casos && s.casos.n) h += '<p><b>Casos testados no plantão (desde o início):</b></p>' + G.htmlCasos(s.casos, ctx.flags.shortlist, ctx.flags.modelo);
    h += '</div>';
    return h;
  };

  function reuniaoSemanal(n, dia, prompts, texto) {
    return {
      id: 'S' + n, type: 'reuniao', day: dia, portes: TODOS, todos: true, lider: 'diretoria', sequencial: false, semanal: n, ordem: -1,
      titulo: 'Reunião da semana ' + n + ': balanço e próximos passos',
      fase: 'Reunião semanal · Balanço e planejamento',
      contexto: function (ctx) { return '<p>' + texto + '</p>' + G.htmlSemana(ctx); },
      promptsPapel: prompts, fx: { confianca: 1 },
      conceitos: ['crispdm', 'monitoramento'],
      conceito: 'Projetos de dados andam em ciclos: olhar o que aconteceu, aprender e replanejar faz parte do CRISP-DM — e é o que transforma um piloto em rotina.'
    };
  }
  function outrosSetores(txt) { return { operacoes: txt, cirurgia: txt, farmacia: txt }; }

  G.TASKS.push(
    reuniaoSemanal(1, 7, Object.assign({
      gestao: 'Abra o balanço da semana 1: o que a equipe decidiu de mais importante e o que preocupa você para a semana em que o modelo entra no plantão?',
      clinico: 'O modelo e o limiar estão escolhidos. O que você precisa ver nos primeiros casos para confiar (ou não) nele?',
      ti: 'Em linguagem simples: os dados e a infraestrutura estão prontos para o modelo rodar no plantão? O que pode dar errado?'
    }, outrosSetores('Como está o seu setor depois da primeira semana e o que precisa de atenção na semana 2?')),
      'Primeira semana concluída. Cada função conta o que fez e o que espera da próxima. Logo depois, a gestão define as duas prioridades da semana 2.'),
    reuniaoSemanal(2, 14, Object.assign({
      gestao: 'Abra o balanço da semana 2: o modelo entrou no plantão e o sistema caiu. O que funcionou, o que não funcionou? Algum sinal no jornal preocupa você?',
      clinico: 'Conte como o modelo se saiu nos casos que você testou: em quais você discordou e por quê? Você confia mais ou menos nele do que na semana passada?',
      ti: 'Depois da queda do sistema: o que a TI aprendeu e o que mudou? Os dados mostram algum sinal que a equipe deveria olhar?'
    }, outrosSetores('O que mudou no seu setor nesta semana e o que você pede à equipe para a semana 3?')),
      'Segunda semana concluída: o modelo já está no plantão. Releiam o jornal dos últimos dias — alguns sinais podem indicar o que vem por aí.'),
    reuniaoSemanal(3, 21, Object.assign({
      gestao: 'Abra o balanço da semana 3: como o hospital respondeu ao incidente? O que vocês fariam diferente?',
      clinico: 'Durante o incidente, o modelo ajudou ou atrapalhou nos casos? O que isso diz sobre usá-lo fora do cenário em que foi treinado?',
      ti: 'O que os sistemas e os dados mostraram durante o incidente? O que faltou?'
    }, outrosSetores('Como o seu setor atravessou o incidente e o que precisa mudar?')),
      'A semana mais difícil do mês terminou. Hora de entender o que o incidente ensinou — sobre o hospital e sobre o modelo.'),
    reuniaoSemanal(4, 28, Object.assign({
      gestao: 'Última reunião antes do conselho: qual é a principal mensagem do mês e o que cada função deve apresentar?',
      clinico: 'Depois de cerca de 20 casos testados: em que tipo de paciente o modelo acerta, em qual erra e o que você recomenda para o próximo mês?',
      ti: 'O que a TI deixa funcionando para o próximo mês (dados, painel, plano B)?'
    }, outrosSetores('Qual é o resultado do seu setor no mês e o que você levaria ao conselho?')),
      'Quatro semanas de plantão. Esta reunião prepara a prestação de contas ao conselho no dia 30.')
  );

  /* ---------------- planos da semana (gestão escolhe 2 de 5) ---------------- */
  function plano(id, dia, req, titulo, contexto, opcoes, bons, comentarioBase) {
    return {
      id: id, setor: 'diretoria', day: dia, portes: TODOS, type: 'decisao', requires: [req], multi: { min: 2, max: 2 },
      titulo: titulo, fase: 'Planejamento da semana · Prioridades',
      contexto: contexto,
      pergunta: 'Quais 2 prioridades a equipe assume para a próxima semana?',
      opcoes: opcoes,
      combinar: function (ctx, ids) {
        var lista = typeof opcoes === 'function' ? opcoes(ctx) : opcoes;
        var fx = {}, flags = {}, custo = 0, labels = [];
        ids.forEach(function (k) {
          var o = lista.filter(function (x) { return x.id === k; })[0]; if (!o) return;
          labels.push(o.label); custo += Number(o.custo) || 0;
          Object.keys(o.fx || {}).forEach(function (f) { fx[f] = (fx[f] || 0) + o.fx[f]; });
          Object.assign(flags, o.flags || {});
        });
        var nb = ids.filter(function (k) { return bons(ctx).indexOf(k) >= 0; }).length;
        var q = nb === 2 ? 2 : (nb === 1 ? 1 : 0);
        return { label: labels.join(' + '), custo: custo, fx: fx, flags: flags, q: q,
          consequencia: nb === 2 ? 'Prioridades claras e coerentes com o que a semana vai exigir.' : (nb === 1 ? 'Uma das prioridades ajuda; a outra dispersa a equipe.' : 'A equipe vai gastar a semana em frentes que não são as mais importantes agora.'),
          comentario: comentarioBase(ctx) };
      },
      conceitos: ['crispdm', 'governanca'],
      conceito: 'Planejar é escolher: com tempo e verba limitados, a equipe precisa priorizar o que reduz o maior risco da próxima etapa.',
      ra: ['RA3', 'RA8']
    };
  }

  G.TASKS.push(
    plano('P1', 7, 'S1', 'Prioridades da semana 2: o modelo entra no plantão',
      function (ctx) {
        var m = modeloAtual(ctx);
        return '<p>Na semana 2, o <b>' + (m ? esc(m.nome) : 'modelo') + '</b> começa a ser usado (o corpo clínico decide como no dia 8), o fluxo do alerta é definido e a TI vai precisar manter tudo no ar.</p>' +
          '<p>Releia as falas da reunião e escolha <b>duas prioridades</b>. Cada uma custa tempo e dinheiro.</p>';
      },
      [
        { id: 'treino', label: 'Treinar a equipe da urgência no uso do alerta', detalhe: 'O que o escore significa, o que fazer quando ele toca e como registrar quando discordar.', custo: 20, fx: { confianca: 3, seguranca: 1 }, flags: { treino: true } },
        { id: 'contingencia', label: 'Ensaiar o plano B: e se o sistema cair?', detalhe: 'Protocolo manual impresso, quem avisa quem, como registrar.', custo: 10, fx: { seguranca: 1, eficiencia: 1 }, flags: { planoB: true } },
        { id: 'integracao', label: 'Reforçar a chegada dos dados da triagem ao modelo', detalhe: 'A TI revisa a integração e a qualidade dos sinais vitais.', custo: 30, fx: { dados: 3, eficiencia: 1 }, flags: { reforcoDados: true } },
        { id: 'campanha', label: 'Campanha interna: cartazes e vídeo anunciando a IA', detalhe: 'Divulga o programa para todo o hospital.', custo: 15, fx: { confianca: 1 }, flags: {} },
        { id: 'congelar', label: 'Congelar gastos na semana para poupar orçamento', detalhe: 'Nenhuma compra ou contratação nova.', custo: -30, fx: { eficiencia: -2, confianca: -1 }, flags: {} }
      ],
      function () { return ['treino', 'contingencia', 'integracao']; },
      function () { return 'Antes de ligar um modelo, o que mais reduz risco é preparar as pessoas (treino), garantir o plano B e cuidar dos dados que chegam ao modelo. Divulgar e economizar podem esperar.'; }),

    plano('P2', 14, 'S2', 'Prioridades da semana 3',
      function (ctx) {
        return '<p>A semana 3 começa amanhã. Releia o jornal dos dias 8 a 14 e as falas da reunião: <b>os sinais apontam para algum risco?</b></p>' +
          '<p>Escolha <b>duas prioridades</b>. Elas valem para os próximos 7 dias.</p>';
      },
      function (ctx) {
        var H = G.HISTORIAS && G.HISTORIAS[ctx.historia];
        var prep = H ? H.preparo : { label: 'Plano de contingência para um pico de atendimentos', detalhe: 'Estoque, escala e fluxo preparados para o pior cenário.' };
        return [
          { id: 'preparo', label: prep.label, detalhe: prep.detalhe, custo: 30, fx: { seguranca: 1 }, flags: { prepIncidente: true } },
          { id: 'revisar', label: 'Revisar com os médicos os casos em que alguém discordou do modelo', detalhe: 'Cada discordância vira aprendizado e dado para melhorar o modelo.', custo: 0, fx: { dados: 2, confianca: 1 }, flags: { revisaoCasos: true } },
          { id: 'escala', label: 'Reforçar a escala de plantonistas por duas semanas', detalhe: 'Mais gente na urgência e na enfermaria.', custo: 60, fx: { eficiencia: 2 }, flags: { escalaExtra: true } },
          { id: 'novo', label: 'Começar a avaliar um segundo modelo de IA para outra área', detalhe: 'Aproveitar o embalo do programa.', custo: 40, fx: { dados: 1, eficiencia: -1 }, flags: { dispersao: true } },
          { id: 'auditoria', label: 'Auditar quem acessou os dados dos pacientes (LGPD)', detalhe: 'Revisar acessos, perfis e registros.', custo: 10, fx: { conformidade: 3 }, flags: {} }
        ];
      },
      function () { return ['preparo', 'revisar', 'escala', 'auditoria']; },
      function (ctx) {
        var H = G.HISTORIAS && G.HISTORIAS[ctx.historia];
        return (H ? 'Os sinais do jornal apontavam para ' + H.alvo + '. ' : '') + 'Preparar-se para o risco anunciado e aprender com as discordâncias costuma valer mais do que abrir uma frente nova.';
      }),

    plano('P3', 21, 'S3', 'Prioridades da semana 4',
      function () {
        return '<p>Última semana antes do conselho. O incidente deixou lições — e o modelo continua no plantão.</p><p>Escolha <b>duas prioridades</b> para os dias 22 a 28.</p>';
      },
      [
        { id: 'grupos', label: 'Revisar o desempenho do modelo por grupo de pacientes', detalhe: 'Idosos, crianças, gestantes, quem chega do interior: ele erra mais em algum grupo?', custo: 20, fx: { dados: 2, conformidade: 2 }, flags: { revisaoGrupos: true } },
        { id: 'licoes', label: 'Registrar as lições do incidente e atualizar os protocolos', detalhe: 'O que funcionou, o que faltou, o que muda.', custo: 10, fx: { confianca: 2, seguranca: 1 }, flags: { licoes: true } },
        { id: 'painel', label: 'Priorizar o painel de indicadores da diretoria', detalhe: 'A TI dedica a semana ao painel.', custo: 20, fx: { eficiencia: 2, dados: 1 }, flags: {} },
        { id: 'expandir', label: 'Levar o modelo da urgência para as enfermarias já na próxima semana', detalhe: 'Mais pacientes cobertos pelo alerta.', custo: 40, fx: { seguranca: -2, confianca: -1 }, flags: { expandir: true } },
        { id: 'cortar', label: 'Reduzir a equipe do programa para economizar', detalhe: 'Menos horas dedicadas ao projeto.', custo: -40, fx: { confianca: -3, dados: -2 }, flags: {} }
      ],
      function () { return ['grupos', 'licoes', 'painel']; },
      function () { return 'Antes de expandir, consolidar: revisar o modelo por grupo de pacientes, transformar o incidente em protocolo e entregar o painel. Levar o modelo a outro cenário sem validar repete o erro do incidente.'; })
  );

  /* ---------------- decisões médicas novas ---------------- */
  G.TASKS.push(
    {
      id: 'M6', setor: 'urgencia', day: 8, portes: TODOS, type: 'decisao',
      titulo: 'Quando e como o modelo entra no plantão?',
      fase: 'CRISP-DM 6 · Implantação',
      contexto: function (ctx) {
        var m = modeloAtual(ctx);
        return '<p>O <b>' + (m ? esc(m.nome) : 'modelo') + '</b> está instalado, com limiar ' + esc((G.LIMIAR_NOME[ctx.flags.limiar] || 'intermediário').toLowerCase()) +
          ' (cerca de <b>' + (ctx.flags.alertasUrg || '—') + ' alertas por plantão</b>). A partir de amanhã, você vai receber <b>um caso real por dia</b> e decidir se aceita ou não o que o modelo indica.</p>' +
          '<p>Falta decidir <b>como ele começa</b>: escondido, num turno ou em todo o plantão.</p>' +
          (ctx.flags.contrato === 'silencioso' ? '<p class="nota">O contrato assinado pela gestão prevê um período de piloto silencioso.</p>' : '') +
          (ctx.flags.treino ? '<p class="nota bom">A equipe da urgência foi treinada no uso do alerta (prioridade da semana).</p>' : '');
      },
      caso: { titulo: 'Primeiro em silêncio, depois no plantão',
        texto: 'Antes de ligar um modelo de piora clínica, muitos hospitais o rodam “em silêncio” (shadow mode): ele calcula o risco de cada paciente, mas ninguém vê. Depois de algumas semanas, a equipe compara o que ele teria dito com o que aconteceu — e só então decide ligar.',
        fonte: 'Prática recomendada em guias de implantação de IA clínica (ex.: diretriz DECIDE-AI, 2022)' },
      pergunta: 'Como o modelo começa?',
      opcoes: function (ctx) {
        var ruim = ctx.flags.modelo === 'D' || ctx.flags.modelo === 'E';
        return [
          { id: 'silencioso', label: 'Uma semana de piloto silencioso: o modelo roda escondido e eu comparo a minha conduta com a dele, caso a caso. Os alertas só aparecem para a equipe depois.',
            fx: { seguranca: 2, confianca: 3, dados: 3 }, flags: { golive: 'silencioso' }, q: 2,
            consequencia: ruim ? 'O piloto silencioso vai mostrar rapidamente o que o modelo faz na vida real — sem que ele mude a conduta de ninguém.' : 'Na semana 2, você testa o modelo caso a caso sem que ele influencie o plantão.',
            comentario: 'Rodar em silêncio mede o desempenho no próprio hospital antes de o alerta influenciar decisões: o jeito mais seguro de começar.' },
          { id: 'piloto', label: 'Ligar só no turno diurno, com um médico de referência acompanhando os alertas e uma conversa curta no fim de cada plantão.',
            custo: 10, fx: { seguranca: 3, confianca: 2, eficiencia: 1 }, flags: { golive: 'piloto' }, q: 2,
            consequencia: 'O alerta começa num turno, com supervisão. Os erros aparecem em escala pequena e são discutidos no mesmo dia.',
            comentario: 'Começar pequeno e supervisionado também é boa prática: limita o dano e acelera o aprendizado.' },
          { id: 'pleno', label: 'Ligar já em todos os plantões: o modelo foi validado e a urgência precisa dele agora.',
            fx: { seguranca: -2, confianca: -3, eficiencia: 2 }, flags: { golive: 'pleno' }, q: 0,
            consequencia: 'O alerta apareceu de uma vez em todos os plantões. Parte da equipe nem sabia o que ele significava.',
            comentario: 'Sem teste local, problemas de integração, de limiar ou de fluxo aparecem direto no paciente — e na confiança da equipe.' }
        ];
      },
      conceitos: ['humano_no_circuito', 'validacao_externa', 'monitoramento'],
      conceito: 'Implantar é um experimento: começar em silêncio ou em pequena escala, medir no próprio hospital e só então ampliar.',
      ra: ['RA6', 'RA8']
    },
    {
      id: 'M7', setor: 'urgencia', day: 22, portes: TODOS, type: 'decisao',
      titulo: 'O modelo fica, troca ou sai?',
      fase: 'Monitoramento · Reavaliação do modelo',
      contexto: function (ctx) {
        var m = modeloAtual(ctx);
        return '<p>Depois de duas semanas de casos testados no plantão — incluindo o incidente —, o corpo clínico precisa decidir o futuro do <b>' + (m ? esc(m.nome) : 'modelo') + '</b>.</p>' +
          G.htmlCasos(ctx.casosResumo, ctx.flags.shortlist, ctx.flags.modelo) +
          (ctx.flags.revisaoCasos ? '<p class="nota bom">A equipe revisou as discordâncias com os médicos: elas viraram dados para recalibrar o modelo.</p>' : '') +
          '<p>A partir de amanhã, os casos já usam a escolha que você fizer hoje.</p>';
      },
      caso: { titulo: 'Desligar também é uma decisão',
        texto: 'Em 2021, a validação independente do modelo de sepse da Epic em Michigan mostrou desempenho bem abaixo do anunciado, e o resultado levou hospitais a reavaliar o alerta. Recalibrar, mudar o limiar ou desligar são decisões legítimas: reavaliar um modelo em uso é parte do ciclo — não um fracasso.',
        fonte: 'Wong et al., JAMA Internal Medicine, 2021' },
      pergunta: 'Qual é a decisão do corpo clínico?',
      opcoes: function (ctx) {
        var atual = ctx.flags.modelo, bomAtual = atual === 'A' || atual === 'C', m = M[atual];
        var nome = m ? m.nome : 'modelo';
        var op = [
          { id: 'manter', label: 'Manter o ' + nome + ' como está.', fx: bomAtual ? { confianca: 1 } : { seguranca: -3, confianca: -2 }, flags: {}, q: bomAtual || atual === 'B' ? 1 : 0,
            consequencia: 'Nada muda no plantão.', comentario: bomAtual ? 'Funciona, mas manter sem recalibrar desperdiça o que os casos e as discordâncias ensinaram.' : 'Os casos mostraram as falhas deste modelo; mantê-lo é aceitar os mesmos erros.' },
          { id: 'recalibrar', label: 'Manter o ' + nome + ', recalibrando com os casos do hospital (inclusive as discordâncias registradas), testar de novo e acompanhar por grupo de pacientes.',
            custo: 30, fx: (atual === 'D' || atual === 'E') ? { dados: 1, seguranca: -2 } : { seguranca: 3, confianca: 3, dados: 3 }, flags: { recalibrado: true }, q: (atual === 'D' || atual === 'E') ? 0 : 2,
            consequencia: 'O modelo foi recalibrado com dados locais e testado antes de voltar.', comentario: (atual === 'D' || atual === 'E') ? 'Recalibrar não corrige um modelo com vazamento ou sem sensibilidade.' : 'Recalibrar com dados locais e acompanhar por grupo é a resposta madura para um modelo que funciona.' }
        ];
        (ctx.flags.shortlist || []).forEach(function (k) {
          if (k === atual) return;
          var x = M[k], bomX = k === 'A' || k === 'C';
          op.push({ id: 'trocar_' + k, label: 'Trocar pelo ' + x.nome + ', que também esteve na bancada de testes.', custo: Math.round(x.custo / 3),
            fx: bomX ? (bomAtual ? { confianca: -1, eficiencia: -1 } : { seguranca: 4, confianca: 2 }) : { seguranca: -3, confianca: -2 }, flags: { modelo: k, recalibrado: false, troca: atual }, q: bomX ? (bomAtual ? 1 : 2) : (k === 'B' ? 1 : 0),
            consequencia: 'O ' + x.nome + ' substitui o ' + nome + ' a partir de amanhã.', comentario: bomX ? (bomAtual ? 'Troca defensável se os casos mostraram vantagem clara; tem custo de reaprendizado para a equipe.' : 'Boa troca: os casos mostraram que o modelo atual falhava onde importa.') : 'Trocar por um modelo pior nos casos testados repete o erro.' });
        });
        op.push({ id: 'desligar', label: 'Desligar o modelo e voltar só ao protocolo de classificação de risco.', fx: bomAtual ? { seguranca: -2, confianca: -2 } : { seguranca: 2 }, flags: { modeloDesligado: true }, q: bomAtual ? 0 : 1,
          consequencia: 'O alerta foi desligado. O plantão volta ao protocolo.', comentario: bomAtual ? 'Desligar um modelo que funciona joga fora o investimento e o aprendizado.' : 'Melhor desligar do que manter um modelo que falha — mas havia alternativa testada na bancada.' });
        return op;
      },
      conceitos: ['monitoramento', 'calibracao', 'deriva'],
      conceito: 'Um modelo em uso precisa ser reavaliado com dados do próprio hospital. Manter, recalibrar, trocar ou desligar são decisões clínicas baseadas em evidência local.',
      ra: ['RA6', 'RA7']
    }
  );

  /* ---------------- incidentes menores (2 por hospital, sorteados) ----------------
     Cada um tem um evento no jornal e uma decisão simples no mesmo dia. */
  G.INCIDENTES_MENORES = ['energia', 'boato', 'versao', 'email', 'luvas', 'plantonistas', 'mp'];
  function menor(id, setor, ev, tarefa) {
    G.EVENTS.push({ id: 'x_' + id, menor: id, rel: 0, tom: 'alerta', setor: setor, when: function () { return true; }, titulo: ev.titulo, texto: ev.texto, fx: ev.fx || {} });
    G.TASKS.push(Object.assign({ id: 'X_' + id, menor: id, rel: 0, setor: setor, portes: TODOS, type: 'decisao', fase: 'Imprevisto do dia' }, tarefa));
  }
  // o arquivo de eventos já carregou G.EVENTS
  G.EVENTS = G.EVENTS || [];

  menor('energia', 'ti', { titulo: 'Faltou energia', texto: 'Uma queda de energia de 20 minutos atingiu o hospital. O gerador demorou a entrar e o servidor da TI desligou de repente.', fx: { eficiencia: -2 } }, {
    titulo: 'A energia caiu: o que a TI faz?',
    contexto: function () { return '<p>O gerador levou 4 minutos para entrar. Os computadores da triagem e o servidor desligaram sem aviso. Ninguém se feriu, mas o susto foi grande.</p>'; },
    pergunta: 'O que você faz?',
    opcoes: [
      { id: 'teste', label: 'Testar o gerador todo mês, colocar nobreak nos equipamentos críticos e fazer uma lista do que religar primeiro.', custo: 25, fx: { seguranca: 2, eficiencia: 2 }, flags: { energia: 'ok' }, q: 2,
        consequencia: 'Teste mensal marcado e nobreaks instalados.', comentario: 'Simples e eficaz: manutenção preventiva e prioridade definida.' },
      { id: 'gerador', label: 'Comprar um gerador maior.', custo: 80, fx: { eficiencia: 1 }, flags: { energia: 'gerador' }, q: 1,
        consequencia: 'O gerador novo chega em um mês.', comentario: 'Gasta mais sem atacar a causa: o gerador atual não era testado.' },
      { id: 'nada', label: 'Nada: foi um caso raro.', fx: { seguranca: -1 }, flags: { energia: 'nada' }, q: 0,
        consequencia: 'Tudo segue como antes.', comentario: 'Falhas raras acontecem — e sem preparo viram crise.' }
    ],
    conceitos: ['continuidade'], conceito: 'Continuidade se faz com manutenção preventiva e prioridades definidas antes da falha.', ra: ['RA8']
  });

  menor('boato', 'diretoria', { titulo: 'Boato no WhatsApp', texto: 'Circula nos grupos da cidade: “No hospital, um robô decide quem vai morrer”. A ouvidoria recebeu 40 ligações.', fx: { confianca: -2 } }, {
    titulo: 'O boato do “robô que decide”',
    contexto: function () { return '<p>A mensagem viralizou com a foto da tela do alerta. Pacientes perguntam na recepção se “a máquina” vai atendê-los.</p>'; },
    pergunta: 'Como a gestão responde?',
    opcoes: [
      { id: 'explicar', label: 'Explicar com transparência: nota simples, vídeo curto com a equipe e cartaz na recepção dizendo que o alerta apoia — quem decide é sempre o profissional.', custo: 5, fx: { confianca: 3, conformidade: 1 }, flags: { boato: 'explicar' }, q: 2,
        consequencia: 'A nota e o vídeo circularam mais que o boato.', comentario: 'Transparência sobre o papel da IA (apoio, não decisão) é a melhor resposta.' },
      { id: 'processar', label: 'Processar quem compartilhou a mensagem.', fx: { confianca: -2 }, flags: { boato: 'processar' }, q: 0,
        consequencia: 'A notícia do processo virou outro boato.', comentario: 'Reação defensiva alimenta a desconfiança.' },
      { id: 'desligar', label: 'Desligar o alerta até o boato passar.', fx: { seguranca: -2, confianca: -1 }, flags: { boato: 'desligar' }, q: 1,
        consequencia: 'O alerta ficou desligado por dois dias.', comentario: 'Acalma no curto prazo, mas confirma o medo e tira uma ferramenta útil do plantão.' }
    ],
    conceitos: ['apoio_decisao', 'governanca'], conceito: 'Comunicar o papel da IA (apoio à decisão, humano no circuito) faz parte da implantação.', ra: ['RA8']
  });

  menor('versao', 'ti', { titulo: 'Versão nova sem aviso', texto: 'O fornecedor atualizou o modelo da urgência durante a madrugada, sem avisar. Os alertas mudaram de padrão.', fx: { confianca: -1 } }, {
    titulo: 'O fornecedor mudou o modelo sem avisar',
    contexto: function (ctx) { return '<p>Desde a atualização, o número de alertas por plantão caiu 20%. O fornecedor diz que “a versão nova é melhor”.</p>' + (ctx.flags.contrato === 'robusto' ? '<p class="nota bom">O contrato negociado pela gestão prevê controle de versões.</p>' : ''); },
    pergunta: 'O que a TI faz?',
    opcoes: [
      { id: 'voltar', label: 'Voltar para a versão anterior até testar a nova e exigir aviso antes de qualquer atualização.', custo: 5, fx: { seguranca: 2, conformidade: 2 }, flags: { versao: 'voltar' }, q: 2,
        consequencia: 'A versão anterior voltou; a nova entra em teste.', comentario: 'Modelo em uso só muda depois de testado: controle de versões é segurança do paciente.' },
      { id: 'aceitar', label: 'Aceitar: deve ser melhor.', fx: { seguranca: -2 }, flags: { versao: 'aceitar' }, q: 0,
        consequencia: 'A versão nova seguiu no ar.', comentario: 'Menos alertas pode significar mais pacientes graves sem alerta.' },
      { id: 'cancelar', label: 'Cancelar o contrato com o fornecedor.', fx: { eficiencia: -2, confianca: -1 }, flags: { versao: 'cancelar' }, q: 1,
        consequencia: 'O jurídico avisa: há multa e o hospital fica sem modelo.', comentario: 'Exagero: o problema é de processo e de contrato, resolvível com controle de versões.' }
    ],
    conceitos: ['monitoramento', 'governanca'], conceito: 'Atualizar um modelo é mudar um dispositivo em uso: precisa de teste, aviso e registro.', ra: ['RA7']
  });

  menor('email', 'ti', { titulo: 'Planilha no e-mail pessoal', texto: 'Um residente mandou para o próprio e-mail pessoal uma planilha com nomes e diagnósticos de pacientes, “para estudar em casa”.', fx: { conformidade: -2 } }, {
    titulo: 'Dados de pacientes no e-mail pessoal',
    contexto: function () { return '<p>O próprio residente avisou, preocupado. A planilha tem 300 pacientes, com nome e diagnóstico.</p>'; },
    pergunta: 'O que você faz?',
    opcoes: [
      { id: 'incidente', label: 'Tratar como incidente: avaliar o risco com o encarregado de dados, apagar as cópias, orientar a equipe e oferecer um ambiente seguro para estudo.', custo: 10, fx: { conformidade: 4, confianca: 1 }, flags: { email: 'incidente' }, q: 2,
        consequencia: 'Incidente registrado e cópias apagadas; os residentes ganharam acesso a dados pseudonimizados.', comentario: 'Responder com processo (avaliar, conter, orientar) e oferecer alternativa segura.' },
      { id: 'punir', label: 'Desligar o residente do programa.', fx: { confianca: -3 }, flags: { email: 'punir' }, q: 0,
        consequencia: 'Ninguém mais vai avisar quando errar.', comentario: 'Punir quem avisa esconde os próximos incidentes.' },
      { id: 'ignorar', label: 'Deixar para lá: foi para estudar.', fx: { conformidade: -3 }, flags: { email: 'ignorar' }, q: 0,
        consequencia: 'A planilha continua no e-mail pessoal.', comentario: 'Dados sensíveis fora do ambiente seguro são incidente de segurança (LGPD).' }
    ],
    conceitos: ['lgpd', 'pseudonimizacao'], conceito: 'Incidentes com dados pessoais pedem avaliação de risco, contenção e orientação — e, se houver risco relevante, comunicação à ANPD e aos titulares.', ra: ['RA8']
  });

  menor('luvas', 'compras', { titulo: 'Entrega atrasada', texto: 'O fornecedor de luvas avisou que a entrega vai atrasar 10 dias.', fx: { eficiencia: -1 } }, {
    titulo: 'As luvas vão atrasar 10 dias',
    contexto: function (ctx) { return '<p>O estoque atual dura 6 dias.</p>' + (ctx.flags.compra === 'seguranca' ? '<p class="nota bom">Há estoque de segurança calculado pela previsão.</p>' : ''); },
    pergunta: 'Como resolver?',
    opcoes: [
      { id: 'plano', label: 'Usar o estoque de segurança, acionar um fornecedor alternativo já cadastrado e revisar a previsão com o novo prazo.', custo: 20, fx: { eficiencia: 2, seguranca: 1 }, flags: { luvas: 'plano' }, q: 2,
        consequencia: 'Não faltou luva.', comentario: 'Estoque de segurança e fornecedor alternativo existem para isto.' },
      { id: 'qualquer', label: 'Comprar do primeiro que aparecer, a qualquer preço.', custo: 50, fx: { eficiencia: 1 }, flags: { luvas: 'qualquer' }, q: 1,
        consequencia: 'Chegaram luvas — caras e de qualidade duvidosa.', comentario: 'Resolve, mas sem critério de preço e qualidade.' },
      { id: 'racionar', label: 'Racionar luvas no plantão.', fx: { seguranca: -3, confianca: -2 }, flags: { luvas: 'racionar' }, q: 0,
        consequencia: 'A equipe reclamou e a CCIH registrou risco.', comentario: 'Racionar EPI transfere o risco para pacientes e profissionais.' }
    ],
    conceitos: ['estoque_seguranca', 'previsao'], conceito: 'Estoque de segurança cobre o erro da previsão e os atrasos de entrega.', ra: ['RA5']
  });

  menor('plantonistas', 'diretoria', { titulo: 'Plantão desfalcado', texto: 'Dois médicos plantonistas faltaram por doença. A urgência está com metade da equipe no turno da noite.', fx: { eficiencia: -2 } }, {
    titulo: 'Metade da equipe na urgência',
    contexto: function () { return '<p>São 19h. A noite promete movimento e não há reposição garantida.</p>'; },
    pergunta: 'O que a gestão faz?',
    opcoes: [
      { id: 'sobreaviso', label: 'Acionar o sobreaviso, remanejar profissionais de setores mais calmos e avisar a regulação para redistribuir as ambulâncias.', custo: 15, fx: { seguranca: 2, eficiencia: 2 }, flags: { plantonistas: 'sobreaviso' }, q: 2,
        consequencia: 'A noite foi pesada, mas segura.', comentario: 'Escala de contingência e comunicação com a rede.' },
      { id: 'modelo', label: 'Deixar o modelo definir sozinho a ordem de atendimento da noite.', fx: { seguranca: -3, conformidade: -2 }, flags: { plantonistas: 'modelo' }, q: 0,
        consequencia: 'O modelo ordenou a fila; dois pacientes atípicos esperaram demais.', comentario: 'Falta de gente não justifica tirar o profissional da decisão.' },
      { id: 'esperar', label: 'Seguir com a equipe que tem e torcer.', fx: { seguranca: -2, confianca: -1 }, flags: { plantonistas: 'esperar' }, q: 0,
        consequencia: 'A espera passou de 4 horas.', comentario: 'Sem plano, o risco vai para os pacientes da sala de espera.' }
    ],
    conceitos: ['humano_no_circuito', 'vies_automacao'], conceito: 'Pressão de trabalho aumenta a tentação de automatizar decisões — e o risco do viés de automação.', ra: ['RA8']
  });

  menor('mp', 'diretoria', { titulo: 'Ofício do Ministério Público', texto: 'O Ministério Público pediu explicações sobre o uso de inteligência artificial na urgência do hospital.', fx: { conformidade: -1 } }, {
    titulo: 'O Ministério Público quer explicações',
    contexto: function (ctx) { return '<p>O ofício pede: que modelos são usados, quem os aprovou, como funcionam e como o médico decide.</p>' + (ctx.flags.gov === 'comite' ? '<p class="nota bom">O Comitê de IA mantém a lista de modelos em uso.</p>' : ''); },
    pergunta: 'Como o hospital responde?',
    opcoes: [
      { id: 'transparente', label: 'Enviar a lista dos modelos em uso, os responsáveis, os resultados por grupo de pacientes e como o médico confirma ou discorda do alerta.', custo: 10, fx: { conformidade: 4, confianca: 1 }, flags: { mp: 'transparente' }, q: 2,
        consequencia: 'O MP arquivou o procedimento e elogiou a transparência.', comentario: 'Governança documentada responde a qualquer auditoria.' },
      { id: 'segredo', label: 'Responder que o funcionamento é segredo industrial do fornecedor.', fx: { conformidade: -4 }, flags: { mp: 'segredo' }, q: 0,
        consequencia: 'O MP abriu inquérito.', comentario: 'O hospital é responsável pelo que usa; segredo do fornecedor não o exime.' },
      { id: 'suspender', label: 'Suspender a IA até o fim do procedimento.', fx: { seguranca: -2, confianca: -2 }, flags: { mp: 'suspender' }, q: 1,
        consequencia: 'A IA ficou suspensa por uma semana.', comentario: 'Prudente, mas desnecessário se a governança estivesse documentada.' }
    ],
    conceitos: ['governanca', 'responsabilidade'], conceito: 'Quem usa IA na assistência precisa saber explicar: o que é, quem aprovou, como funciona e como o profissional decide.', ra: ['RA8']
  });

  /* ---------------- pequenos acontecimentos (4 por hospital, sorteados) ---------------- */
  G.EVENTOS_SORTEADOS = [
    { id: 's_visa', tom: 'bom', setor: 'diretoria', titulo: 'Visita da Vigilância Sanitária', texto: 'A inspeção de rotina elogiou a organização da farmácia e do almoxarifado.', fx: { conformidade: 1 } },
    { id: 's_residentes', tom: 'info', setor: 'urgencia', titulo: 'Chegaram os novos residentes', texto: 'A primeira pergunta deles no plantão: “Esse alerta acerta quanto?”', fx: {} },
    { id: 's_ouvidoria', tom: 'bom', setor: 'diretoria', titulo: 'Elogio na ouvidoria', texto: 'Uma família agradeceu a rapidez no atendimento de um avô que chegou “só cansado” e estava grave.', fx: { confianca: 1 } },
    { id: 's_chuva', tom: 'alerta', setor: 'diretoria', titulo: 'Chuva forte', texto: 'O estacionamento alagou e parte da equipe chegou atrasada.', fx: { eficiencia: -1 } },
    { id: 's_congresso', tom: 'bom', setor: 'reunioes', titulo: 'Trabalho aceito em congresso', texto: 'O resumo com os primeiros resultados do programa de IA foi aceito num congresso nacional.', fx: { confianca: 1 } },
    { id: 's_impressora', tom: 'alerta', setor: 'ti', titulo: 'A impressora da triagem quebrou', texto: 'As pulseiras de classificação foram feitas à mão durante a manhã.', fx: { eficiencia: -1 } },
    { id: 's_imprensa', tom: 'info', setor: 'diretoria', titulo: 'Repórter na recepção', texto: 'Uma rádio local quer saber “como funciona a inteligência artificial do hospital”.', fx: {} },
    { id: 's_doacao', tom: 'bom', setor: 'compras', titulo: 'Doação de monitores', texto: 'Uma empresa da região doou quatro monitores multiparamétricos para a urgência.', fx: { eficiencia: 1 } },
    { id: 's_feriado', tom: 'alerta', setor: 'urgencia', titulo: 'Feriado prolongado', texto: 'A urgência recebeu 30% mais pacientes que o normal no fim de semana.', fx: { eficiencia: -1 } },
    { id: 's_lento', tom: 'alerta', setor: 'ti', titulo: 'Prontuário lento', texto: 'O prontuário ficou lento à tarde; alguns sinais vitais foram digitados com atraso.', fx: { dados: -1 } }
  ];
  G.DIAS_SORTEADOS = [5, 12, 26, 29];

  /* referência de boa prática dos planos semanais (escolha de 2) */
  var REF = {
    P1: 'Duas entre: treinar a equipe da urgência, ensaiar o plano B e reforçar a chegada dos dados ao modelo.',
    P2: 'Preparar-se para o risco que os sinais do jornal anunciavam, junto com revisar as discordâncias, reforçar a escala ou auditar os acessos.',
    P3: 'Duas entre: revisar o modelo por grupo de pacientes, registrar as lições do incidente e entregar o painel da diretoria.'
  };
  G.TASKS.forEach(function (t) { if (REF[t.id]) t.referencia = REF[t.id]; });
})(window.GAME);
