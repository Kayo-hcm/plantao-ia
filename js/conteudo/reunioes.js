/* ==========================================================================
   PLANTÃO IA — reuniões
   Cada reunião lista os SETORES que participam; o motor converte setores em
   funções conforme o porte (duas salas da mesma função = uma participação).
   prompts: por setor (ou por função em promptsPapel), texto ou função(ctx).
   ========================================================================== */
(function (G) {
  'use strict';
  var TODOS = G.TODOS, RA = ['regional', 'alta'], ALTA = ['alta'], REG = ['regional'];
  var M = G.MODELS, esc = G.esc;
  function trecho(ctx, id) {
    var d = ctx.dec(id); if (!d || !d.justificativa) return '';
    return '<blockquote class="citacao"><span>' + esc(d.jogador) + ' escreveu:</span>' + esc(d.justificativa) + '</blockquote>';
  }
  function modeloAtual(ctx) { return M[ctx.flags.modelo] || null; }

  G.TASKS.push(

    {
      id: 'R1', type: 'reuniao', day: 2, portes: TODOS, requires: ['G2'],
      setores: ['diretoria', 'urgencia'], lider: 'diretoria', sequencial: true,
      titulo: 'Reunião: a gestão apresenta os modelos ao corpo clínico',
      fase: 'Reunião gestão × corpo clínico',
      contexto: function (ctx) {
        var ids = ctx.flags.shortlist || [];
        if (!ids.length) return '<p>Aguardando a seleção dos modelos pela gestão.</p>';
        return '<p>A gestão escolheu três modelos e agora apresenta a escolha ao corpo clínico, que dá o retorno antes de decidir.</p>' +
          G.tbl(['Modelo', 'Como funciona', 'Acurácia', 'Sensibilidade', 'Especificidade', 'Custo/ano'], ids.map(function (k) {
            var m = M[k]; return ['<b>' + m.nome + '</b>', m.tecnica, m.acc + '%', m.sens + '%', m.esp + '%', G.fmtc(ctx, m.custo)];
          })) + trecho(ctx, 'G2');
      },
      prompts: {
        diretoria: 'Apresente os três modelos ao corpo clínico: por que estes três, o que pesou (custo, acertos, alarmes falsos, onde foi testado) e por que os outros dois ficaram de fora.',
        urgencia: 'Dê seu retorno à gestão: que dúvidas o plantão tem sobre esses modelos? O que falta saber para decidir (o motivo do alerta, quantos alarmes falsos, que dados ele exige)?'
      },
      fx: { confianca: 3 },
      conceitos: ['explicabilidade', 'sensibilidade', 'especificidade'],
      conceito: 'A escolha de um modelo clínico é compartilhada: a gestão filtra por custo, desempenho e risco; o corpo clínico decide pelo que funciona no plantão.',
      ra: ['RA6']
    },

    {
      id: 'R2', type: 'reuniao', day: 4, portes: REG, requires: ['M3'],
      setores: ['ti', 'urgencia'], lider: 'ti', sequencial: true,
      titulo: 'Reunião técnica: como o alerta entra no plantão',
      fase: 'Reunião TI × corpo clínico',
      contexto: function (ctx) {
        var m = modeloAtual(ctx);
        return '<p>Antes da implantação, a TI e o corpo clínico combinam como o alerta vai funcionar na prática.</p><ul>' +
          '<li>Onde roda: <b>' + (G.INFRA_NOME[ctx.flags.infra] || '—') + '</b></li>' +
          '<li>Modelo: <b>' + (m ? m.nome : '—') + '</b> · limiar: <b>' + (G.LIMIAR_NOME[ctx.flags.limiar] || '—') + '</b> (~' + (ctx.flags.alertasUrg || '—') + ' alertas por plantão)</li>' +
          '<li>Como os dados chegam: <b>' + ({ manual: 'planilha semanal', etl: 'carga noturna', fhir: 'tempo real (FHIR)', redigitacao: 'redigitação pela enfermagem' }[ctx.flags.pipeline] || '—') + '</b></li></ul>';
      },
      prompts: {
        ti: 'Explique ao corpo clínico onde o modelo vai rodar, quanto tempo o alerta leva para aparecer e o que acontece se o sistema cair.',
        urgencia: 'Diga à TI o que o plantão precisa: em que tela o alerta deve aparecer, quem recebe e o que é inaceitável (atraso, alarmes demais, redigitar dados).'
      },
      fx: { confianca: 3, eficiencia: 1 },
      conceitos: ['humano_no_circuito', 'continuidade', 'fadiga_alarmes'],
      conceito: 'A integração ao dia a dia faz parte do modelo: o tempo de resposta, a disponibilidade e a tela em que o alerta aparece decidem se ele será usado.',
      ra: ['RA8']
    },

    {
      id: 'RP', type: 'reuniao', day: 4, portes: ALTA, requires: ['F4'],
      setores: ['farmacia', 'urgencia'], lider: 'farmacia', sequencial: true,
      titulo: 'Reunião: farmácia e corpo clínico afinam os alertas',
      fase: 'Reunião farmácia × corpo clínico',
      contexto: function (ctx) {
        var a = { generica: 'base genérica (todos os alertas)', curada: 'base revisada por farmacêuticos', farmaceutico: 'revisão humana de todas as prescrições', chatbot: 'chatbot de IA generativa' }[ctx.flags.alertasFarm] || '—';
        var r = { regra: 'só graves interrompem, com motivo para ignorar', ml_ignorados: 'IA que esconde os alertas mais ignorados', vermelho: 'todos maiores e vermelhos', uti: 'só nas UTIs, com dupla checagem' }[ctx.flags.alertasRegra] || '—';
        return '<p>A farmácia apresenta ao corpo clínico como ficarão os alertas de interação medicamentosa.</p><ul><li>Sistema: <b>' + a + '</b></li><li>Regra para interromper: <b>' + r + '</b></li></ul>' + trecho(ctx, 'F4');
      },
      prompts: {
        farmacia: 'Apresente a nova regra dos alertas: o que vai interromper a prescrição, o que vira só aviso e como vocês vão medir se está funcionando.',
        urgencia: 'Dê o retorno do corpo clínico: os alertas que ficaram fazem sentido no plantão? Que situação ainda preocupa vocês?'
      },
      fx: { confianca: 3, seguranca: 1 },
      conceitos: ['fadiga_alarmes', 'interacao_medicamentosa', 'apoio_decisao'],
      conceito: 'Um sistema de alertas é desenhado junto com quem recebe os alertas: relevância, momento e o que fazer quando o alerta aparece.',
      ra: ['RA6']
    },

    {
      id: 'RT', type: 'reuniao', day: 5, portes: ALTA, requires: ['TX2'],
      setores: ['transplante', 'diretoria', 'especialidades'], lider: 'transplante', sequencial: true,
      titulo: 'Reunião: a IA no transplante, diante da diretoria e da direção clínica',
      fase: 'Reunião transplante × diretoria × direção clínica',
      contexto: function (ctx) {
        var u = { fila: 'reordenar a fila (redirecionado)', enxerto: 'risco de perda do órgão', oferta: 'avaliação de órgãos ofertados', importado: 'modelo americano (redirecionado)' }[ctx.flags.txUso] || '—';
        var v = { usar: 'usar como está', validar: 'validação local e ajuste', treinar: 'treinar do zero com 420 pacientes', pesquisa: 'só em pesquisa' }[ctx.flags.txValid] || '—';
        return '<p>A equipe de transplante apresenta o projeto e o resultado da validação.</p><ul><li>Uso da IA: <b>' + u + '</b></li><li>Validação: <b>' + v + '</b></li></ul>' + trecho(ctx, 'TX2');
      },
      prompts: {
        transplante: 'Apresente o projeto: o que o modelo faz, o que ele NÃO faz (a fila segue as regras do Sistema Nacional de Transplantes) e como foi validado nos pacientes do hospital.',
        diretoria: 'Que garantias a diretoria exige antes de aprovar o uso (validação, responsável, comunicação aos pacientes)?',
        especialidades: 'Como a direção clínica vai acompanhar o uso do modelo e que limites de uso devem aparecer para a equipe?'
      },
      fx: { confianca: 2, conformidade: 2 },
      conceitos: ['validacao_externa', 'governanca', 'apoio_decisao'],
      conceito: 'Em áreas sensíveis como transplantes, a IA apoia decisões dentro de regras públicas, com validação local, responsáveis definidos e limites de uso claros.',
      ra: ['RA8']
    },

    {
      id: 'R4', type: 'reuniao', day: 6, portes: RA, requires: ['E5'],
      setores: ['especialidades', 'urgencia', 'diretoria'], lider: 'especialidades', sequencial: true,
      titulo: 'Reunião: o modelo funciona igual para todos?',
      fase: 'Reunião direção clínica × gestão',
      contexto: function (ctx) {
        var e = G.espAtual(ctx);
        return '<p>A direção clínica apresenta à gestão a análise por grupo de pacientes do modelo de <b>' + e.nome.toLowerCase() + '</b>.</p>' + trecho(ctx, 'E5');
      },
      prompts: {
        especialidades: 'Apresente o resultado por grupo de pacientes e a decisão tomada. Quem pode ser prejudicado, e por quê? Como o plantão deve agir com esses pacientes?',
        urgencia: 'Como o plantão deve agir com os pacientes desses grupos? O que precisa aparecer na tela?',
        diretoria: 'Que recursos e regras a gestão vai garantir para corrigir o problema?'
      },
      fx: { confianca: 3, conformidade: 2 },
      conceitos: ['vies', 'equidade', 'governanca'],
      conceito: 'Viés é um problema do sistema, não só do modelo: dados, uso clínico e gestão precisam responder juntos.',
      ra: ['RA7', 'RA8']
    },

    {
      id: 'RB', type: 'reuniao', day: 6, portes: TODOS, requires: ['T6'],
      setores: ['ti', 'diretoria'], lider: 'ti', sequencial: true,
      titulo: 'Reunião: a TI apresenta o painel de indicadores',
      fase: 'Reunião TI × gestão · Visualização de dados',
      contexto: function (ctx) {
        var ferr = G.FERRAMENTAS[ctx.flags.dashboard] || '—';
        var vis = (ctx.flags.painel || []).map(function (k) { var v = G.VISUALIZACOES[k]; return v ? '<li>' + v.label + '</li>' : ''; }).join('');
        return '<p>A TI apresenta à diretoria o painel que será aberto toda manhã.</p><p>Ferramenta: <b>' + ferr + '</b></p>' +
          (vis ? '<p>Gráficos escolhidos:</p><ul>' + vis + '</ul>' : '') + trecho(ctx, 'T6');
      },
      prompts: {
        ti: 'Apresente o painel: por que cada gráfico, como cada indicador é calculado (de onde vem o dado, a partir de que momento conta a espera) e de quanto em quanto tempo atualiza.',
        diretoria: 'Que decisão você vai tomar olhando este painel? Falta algum indicador? Qual gráfico você ainda não entendeu?'
      },
      fx: { confianca: 2, dados: 2 },
      conceitos: ['dashboard', 'kpi', 'fonte_unica', 'visualizacao'],
      conceito: 'Um painel só é útil se quem decide entende cada número e sabe como ele é calculado. Definir o indicador junto com a gestão vale mais que qualquer gráfico bonito.',
      ra: ['RA5']
    },

    {
      id: 'R5', type: 'reuniao', day: 7, portes: TODOS, todos: true, lider: 'diretoria', sequencial: false,
      titulo: 'Reunião do conselho: prestação de contas',
      fase: 'Reunião final · todas as funções',
      contexto: function (ctx) {
        var H = G.historiaDe ? G.historiaDe(ctx) : null;
        return '<p>Fim do primeiro mês do programa' + (H ? ', que incluiu o incidente “' + G.esc(H.nome) + '”' : '') + '. Cada função presta contas ao conselho do hospital. Saldo do orçamento: <b>' + G.fmt(ctx.ind.orcamento) + '</b>.</p>' +
          (G.htmlCasos && ctx.casosResumo && ctx.casosResumo.n ? '<p><b>Os casos testados no plantão:</b></p>' + G.htmlCasos(ctx.casosResumo, ctx.flags.shortlist, ctx.flags.modelo) : '') +
          '<p>Depois desta reunião, o <b>relatório final</b> mostrará o que cada decisão causou e o conceito por trás dela.</p>';
      },
      promptsPapel: {
        gestao: function (ctx) {
          return 'Apresente ao conselho o balanço do programa: o critério de sucesso foi atingido? Qual decisão da gestão' + (ctx.porte === 'alta' ? '' : ' (incluindo compras)') + ' mais influenciou o resultado — e qual conceito de IA ou ciência de dados pesou mais nela?';
        },
        clinico: function (ctx) {
          return 'Depois dos casos testados no plantão, o modelo da urgência ajudou a decidir melhor? Conte um caso em que você aceitou e um em que discordou — e por quê. E sobre o modelo de ' + G.espAtual(ctx).nome.toLowerCase() + ': para quem ele funciona e para quem ainda não?';
        },
        ti: 'Avalie a infraestrutura depois da crise da semana 2 e do incidente do mês: você manteria a escolha? E o painel da gestão: que decisão ele já ajudou a tomar?',
        operacoes: 'A previsão do bloco mudou alguma escala? E na farmácia: os alertas e a rastreabilidade ficaram mais seguros? Qual foi o maior risco que você enfrentou?',
        cirurgia: 'A previsão do bloco mudou alguma escala? Como a IA está sendo usada no transplante, e que limite você não deixaria ninguém ultrapassar?',
        farmacia: 'A previsão de compras evitou falta ou desperdício? Os alertas de interação ficaram mais úteis? O que a rastreabilidade revelou?'
      },
      fx: { confianca: 2 },
      conceitos: ['crispdm', 'responsabilidade'],
      conceito: 'O CRISP-DM é um ciclo: a prestação de contas fecha uma volta e abre a próxima, começando de novo pelo entendimento do problema.',
      ra: ['RA3', 'RA8']
    }
  );
})(window.GAME);
