/* ==========================================================================
   PLANTÃO IA — Corpo clínico: urgência e especialidades
   ========================================================================== */
(function (G) {
  'use strict';
  var TODOS = G.TODOS, RA = ['regional', 'alta'], ALTA = ['alta'], REG = ['regional'];
  var M = G.MODELS, esc = G.esc;
  function modeloAtual(ctx) { return M[ctx.flags.modelo] || null; }
  function fala(ctx, id, papel) {
    var r = ctx.reu(id); var x = r && r[papel];
    if (!x || !x.contribuicao) return '';
    return '<blockquote class="citacao"><span>' + esc(x.jogador) + ' na reunião:</span>' + esc(x.contribuicao) + '</blockquote>';
  }

  /* ---------- especialidades (porte alta) e radiologia (demais portes) ---------- */
  G.ESPECIALIDADES = {
    radiologia: { nome: 'Radiologia', ferramenta: 'apoio ao diagnóstico de pneumonia no raio-X de tórax', dado: '38 mil radiografias com laudo',
      padrao: 'laudo de radiologistas', metrica: 'Sensibilidade (pneumonias encontradas)',
      grupos: [['Geral', '88%'], ['Raio-X portátil de leito (pacientes mais graves)', '71%'], ['Pacientes acima de 75 anos', '76%'], ['Transferidos do interior (outros aparelhos)', '64%']] },
    cardio: { nome: 'Cardiologia', ferramenta: 'ECG com IA para detectar coração fraco (disfunção do ventrículo esquerdo)', dado: '40 mil eletrocardiogramas digitais',
      padrao: 'ecocardiograma (exame de referência)', metrica: 'Sensibilidade (disfunções encontradas)',
      grupos: [['Geral', '88%'], ['Mulheres', '79%'], ['ECGs de aparelhos antigos do interior', '66%'], ['Pacientes acima de 80 anos', '74%']] },
    oftalmo: { nome: 'Oftalmologia', ferramenta: 'rastreio de retinopatia diabética por foto do fundo de olho', dado: '22 mil fotos de fundo de olho',
      padrao: 'leitura por dois oftalmologistas, com um terceiro desempatando', metrica: 'Sensibilidade (retinopatias encontradas)',
      grupos: [['Geral', '90%'], ['Fotos de retinógrafo portátil (interior)', '68%'], ['Pacientes com catarata', '72%'], ['Pacientes acima de 70 anos', '81%']] },
    mama: { nome: 'Mamografia', ferramenta: 'IA como segunda leitura no rastreio de câncer de mama', dado: '55 mil mamografias',
      padrao: 'biópsia ou acompanhamento de 2 anos', metrica: 'Sensibilidade (cânceres encontrados)',
      grupos: [['Geral', '87%'], ['Mamas densas', '71%'], ['Mulheres com menos de 50 anos', '76%'], ['Mamógrafos analógicos digitalizados', '69%']] },
    derma: { nome: 'Dermatologia', ferramenta: 'classificação de lesões de pele por foto', dado: '15 mil fotos de lesões',
      padrao: 'biópsia (exame histopatológico)', metrica: 'Sensibilidade (melanomas encontrados)',
      grupos: [['Geral', '89%'], ['Peles mais escuras (fototipos V e VI)', '61%'], ['Fotos de celular com pouca luz', '70%'], ['Lesões em palmas e plantas', '66%']] },
    escriba: { nome: 'Escriba digital', ferramenta: 'IA generativa que escreve o resumo da consulta a partir da conversa', dado: 'consultas gravadas com consentimento',
      padrao: 'revisão do médico que atendeu', metrica: 'Resumos sem erro relevante',
      grupos: [['Geral', '96%'], ['Pacientes idosos com sotaque regional forte', '89%'], ['Consultas com acompanhante falando junto', '86%'], ['Consultas com termos populares (“gastura”, “espinhela caída”)', '83%']] }
  };
  G.espAtual = function (ctx) { return G.ESPECIALIDADES[ctx.flags.especialidade] || G.ESPECIALIDADES.radiologia; };

  G.TASKS.push(

    /* ------------------------------- DIA 1 ------------------------------- */
    {
      id: 'M1', setor: 'urgencia', day: 1, portes: TODOS, type: 'decisao',
      titulo: 'Que decisão clínica a IA deve apoiar na urgência?',
      fase: 'CRISP-DM · Entendimento do negócio · Tipo de pergunta',
      contexto: function () {
        return '<p>Na chegada, a enfermagem classifica o risco (Protocolo de Manchester). No último ano, <b>31 pacientes classificados como verde ou amarelo pioraram na sala de espera</b> e precisaram de UTI.</p>' +
          '<p>Transforme o problema em uma <b>pergunta para a IA</b>: quem é o paciente, o que se quer prever e <b>em que momento</b> a resposta precisa estar pronta.</p>';
      },
      caso: { titulo: 'Uma ideia brasileira',
        texto: 'Em Curitiba, a plataforma “Laura” — criada depois que uma bebê morreu de sepse — lê dados do prontuário e avisa a equipe sobre pacientes com risco de piora. Ela funciona porque responde a uma pergunta clara, no momento certo.',
        fonte: 'Instituto Laura Fressatto (Curitiba), plataforma em uso desde 2016' },
      pergunta: 'Qual pergunta a frente da urgência vai perseguir?',
      opcoes: [
        { id: 'a', label: 'Na triagem, prever quais pacientes vão precisar de UTI ou morrer nas próximas 48 horas, usando sinais vitais, idade e doenças prévias.',
          fx: { seguranca: 3, confianca: 2 }, flags: { problema: 'deterioracao' }, q: 2,
          consequencia: 'A pergunta ficou clara: quem (todos os triados), o quê (UTI/óbito em 48h) e quando (na triagem).',
          comentario: 'Aprendizado supervisionado de classificação: o “rótulo” é ter ou não piorado. E a resposta fica pronta antes da decisão que ela quer mudar.' },
        { id: 'b', label: 'Agrupar os pacientes da urgência em perfis para conhecer melhor quem nos procura.',
          fx: { dados: 2 }, flags: { problema: 'agrupamento' }, q: 0,
          consequencia: 'Surgem perfis interessantes. Ainda não está claro como isso muda a triagem.',
          comentario: 'Agrupar (aprendizado não supervisionado) ajuda a conhecer a demanda, mas não responde “quem vai piorar?”.' },
        { id: 'c', label: 'Prever quanto tempo cada paciente vai ficar na urgência.', portes: RA,
          fx: { eficiencia: 2 }, flags: { problema: 'permanencia' }, q: 1,
          consequencia: 'A gestão de leitos gostou. Os pacientes que pioram na espera seguem sem resposta.',
          comentario: 'É uma regressão útil para gestão de leitos, mas responde a outra decisão.' },
        { id: 'd', label: 'Prever piora usando também os exames e a evolução das primeiras 24 horas de internação, para ter mais informação.',
          fx: { seguranca: -1 }, flags: { problema: 'tardio' }, q: 0,
          consequencia: 'O modelo terá muita informação. Ninguém percebeu ainda quando ele ficaria pronto.',
          comentario: 'Momento errado: com dados das primeiras 24 horas, a resposta chega quando o paciente já saiu da triagem.' }
      ],
      conceitos: ['tipos_aprendizado', 'classificacao', 'momento_predicao'],
      conceito: 'Toda pergunta para a IA precisa de quatro coisas: o paciente, o que se quer prever, o tipo de tarefa e o momento da predição — que precisa vir antes da decisão.',
      ra: ['RA2', 'RA3']
    },

    {
      id: 'E1', setor: 'especialidades', day: 1, portes: ALTA, type: 'decisao', apresentacao: 'cartas',
      titulo: 'Qual especialidade recebe o próximo projeto de IA?',
      fase: 'Entendimento do negócio · Evidência e aplicabilidade',
      contexto: function () {
        return '<p>Além da urgência, o hospital tem verba para <b>um projeto de IA em uma especialidade</b>. Cada chefe de serviço defendeu o seu. Vire as cartas para ver o que já aconteceu no mundo real com cada tipo de ferramenta.</p>';
      },
      pergunta: 'Qual projeto você escolhe?',
      opcoes: [
        { id: 'cardio', label: 'Cardiologia — ECG com IA', custo: 90, fx: { seguranca: 2, dados: 2 }, flags: { especialidade: 'cardio' }, q: null,
          carta: { icone: 'coracao', cor: '#B4443E', subt: 'Detectar coração fraco num ECG comum',
            atributos: [['Dados disponíveis', '40 mil ECGs digitais'], ['Exame', 'barato e já feito na rotina'], ['Risco', 'falsos positivos geram ecocardiogramas extras']],
            caso: 'Na Mayo Clinic, uma rede neural detectou disfunção do ventrículo esquerdo a partir de um ECG de 12 derivações (Attia et al., Nature Medicine, 2019).' },
          consequencia: 'A cardiologia começou a organizar os ECGs digitais.', comentario: 'Dado já digital e exame barato; o desafio é o volume de ecocardiogramas que os falsos positivos vão pedir.' },
        { id: 'oftalmo', label: 'Oftalmologia — retinopatia diabética', custo: 80, fx: { seguranca: 2, eficiencia: 2 }, flags: { especialidade: 'oftalmo' }, q: null,
          carta: { icone: 'olho', cor: '#2C7A7B', subt: 'Rastrear diabéticos sem esperar o oftalmologista',
            atributos: [['Dados disponíveis', '22 mil fotos de fundo de olho'], ['Benefício', 'acesso no interior'], ['Risco', 'fotos de baixa qualidade']],
            caso: 'Em 2018, o IDx-DR foi o primeiro sistema autônomo autorizado pelo FDA. Mas, na Tailândia, o teste do Google rejeitou mais de 1 em cada 5 fotos por qualidade (Beede et al., 2020).' },
          consequencia: 'A oftalmologia convidou os postos de saúde do interior para o projeto.', comentario: 'Evidência forte e benefício de acesso; a qualidade das fotos no mundo real é o calcanhar de aquiles.' },
        { id: 'mama', label: 'Mamografia — IA como segunda leitura', custo: 110, fx: { eficiencia: 3, seguranca: 1 }, flags: { especialidade: 'mama' }, q: null,
          carta: { icone: 'fita', cor: '#C2557A', subt: 'Dividir a leitura do rastreio com a IA',
            atributos: [['Dados disponíveis', '55 mil mamografias'], ['Benefício', 'menos carga para radiologistas'], ['Risco', 'mamas densas']],
            caso: 'No estudo MASAI (Suécia), a IA no rastreio reduziu em 44% a carga de leitura dos radiologistas sem perder detecção de câncer (Lång et al., Lancet Oncology, 2023).' },
          consequencia: 'A radiologia mamária reuniu exames de cinco anos.', comentario: 'Uma das melhores evidências prospectivas de IA em imagem; exige atenção a mamas densas e a aparelhos antigos.' },
        { id: 'derma', label: 'Dermatologia — lesões de pele por foto', custo: 60, fx: { eficiencia: 2 }, flags: { especialidade: 'derma' }, q: null,
          carta: { icone: 'lupa', cor: '#B7791F', subt: 'Priorizar suspeitas de melanoma',
            atributos: [['Dados disponíveis', '15 mil fotos'], ['Benefício', 'triagem rápida'], ['Risco', 'pior desempenho em pele escura']],
            caso: 'Modelos de dermatologia tiveram desempenho bem pior em peles mais escuras, pouco representadas nos dados de treino (Daneshjou et al., Science Advances, 2022).' },
          consequencia: 'A dermatologia começou a separar as fotos.', comentario: 'Em uma população diversa como a brasileira, o risco de viés por tom de pele é central.' },
        { id: 'escriba', label: 'Escriba digital — IA generativa', custo: 70, fx: { eficiencia: 4, confianca: 2, conformidade: -2 }, flags: { especialidade: 'escriba' }, q: null,
          carta: { icone: 'balao', cor: '#6B4FA0', subt: 'IA escreve o resumo da consulta a partir da conversa',
            atributos: [['Dados', 'consultas gravadas com consentimento'], ['Benefício', 'menos tempo digitando'], ['Risco', 'a IA pode inventar informação']],
            caso: 'Desde 2023, grandes redes de saúde nos EUA adotaram “escribas” de IA. O texto precisa sempre ser revisado: modelos generativos podem incluir informações que não foram ditas.' },
          consequencia: 'Os ambulatórios testam a gravação com consentimento dos pacientes.', comentario: 'Ganho de tempo real, com risco de “alucinação” e de privacidade: revisão médica é obrigatória.' }
      ],
      conceitos: ['evidencia', 'validacao_externa', 'vies', 'ia_generativa'],
      conceito: 'Escolher onde aplicar IA é olhar a evidência (já funcionou em estudos no mundo real?), os dados disponíveis, o benefício para o paciente e o risco específico de cada ferramenta.',
      ra: ['RA6', 'RA8']
    },

    /* ------------------------------- DIA 2 ------------------------------- */
    {
      id: 'E2', setor: 'especialidades', day: 2, portes: ALTA, type: 'decisao',
      titulo: 'Quem define a “verdade” para treinar o modelo?',
      fase: 'CRISP-DM · Entendimento dos dados · Padrão-ouro',
      contexto: function (ctx) {
        var e = G.espAtual(ctx);
        var v = ctx.flags.verba_validacao ? '<p class="nota bom">O comitê aprovou verba para revisão por especialistas.</p>' : '';
        return '<p>Projeto escolhido: <b>' + e.nome + '</b> — ' + e.ferramenta + '. Dados: ' + e.dado + '.</p>' +
          '<p>A IA aprende a imitar a resposta que damos como certa (o <b>rótulo</b>). Numa amostra, dois especialistas discordaram em <b>18% dos casos</b>.</p>' + v;
      },
      caso: { titulo: 'Especialistas também discordam',
        texto: 'Em imagem médica, a concordância entre especialistas é imperfeita. Por isso, estudos de boa qualidade usam o consenso de vários leitores, um exame de referência ou o acompanhamento do paciente como padrão-ouro.',
        fonte: 'Prática recomendada em diretrizes de avaliação de IA diagnóstica' },
      pergunta: 'O que será considerado a resposta certa?',
      opcoes: function (ctx) {
        var e = G.espAtual(ctx);
        return [
          { id: 'um', label: 'A opinião ou laudo de um único especialista, já registrado no prontuário.', custo: 20, fx: { dados: 1 }, flags: { rotulo: 'um' }, q: 1,
            consequencia: 'Base grande e barata — com a discordância de 18% junto.', comentario: 'O modelo aprende também os erros e as divergências de cada leitor.' },
          { id: 'consenso', label: 'O padrão-ouro da especialidade (' + e.padrao + '), com revisão por mais de um especialista.',
            custo: function (c) { return c.flags.verba_validacao ? 40 : 140; }, fx: { dados: 6, confianca: 2 }, flags: { rotulo: 'consenso' }, q: 2,
            consequencia: 'Menos casos, mas confiáveis. Os especialistas aceitaram revisar.', comentario: 'Padrão-ouro de qualidade: menos dados, porém dados em que o modelo pode confiar.' },
          { id: 'cid', label: 'O CID registrado na conta para o faturamento.', custo: 5, fx: { dados: -4 }, flags: { rotulo: 'cid' }, q: 0,
            consequencia: 'Rótulo pronto em um dia.', comentario: 'CID de faturamento segue regras de cobrança, não necessariamente o diagnóstico: é um substituto (proxy) com viés.' },
          { id: 'ia', label: 'A resposta de outro software de IA que o hospital já tem.', custo: 30, fx: { dados: -3 }, flags: { rotulo: 'ia' }, q: 0,
            consequencia: 'Rótulos gerados em escala.', comentario: 'O novo modelo só aprende a copiar o antigo — com os mesmos erros — e nunca poderá superá-lo.' }
        ];
      },
      conceitos: ['rotulo', 'supervisionado', 'vies'],
      conceito: 'No aprendizado supervisionado, o rótulo é a “verdade” que o modelo imita. Se ele é opinião com muita discordância ou um substituto (CID, custo), o modelo aprende o substituto e herda seus vieses.',
      ra: ['RA7']
    },

    /* ------------------------------- DIA 3 ------------------------------- */
    {
      id: 'M2', setor: 'urgencia', day: 3, portes: TODOS, type: 'decisao', apresentacao: 'm2', requires: ['R1'],
      titulo: 'Escolha o modelo que vai para o plantão',
      fase: 'Avaliação · Explicabilidade e aplicabilidade',
      contexto: function (ctx) {
        var ids = ctx.flags.shortlist || [];
        var linhas = ids.map(function (k) {
          var m = M[k], c = G.carga(m.sens, m.esp);
          return ['<b>' + m.nome + '</b>', '<small>' + m.expl + '</small>', m.tempo, '<b>' + G.r0(c.alertas) + '</b> (' + G.r0(c.vp) + ' certos)', G.r1(c.perdidos), G.r0(c.vpp) + '%'];
        });
        return '<p>Num plantão de <b>300 pacientes (24 vão piorar)</b>, cada modelo funciona assim:</p>' +
          G.tbl(['Modelo', 'Explica o alerta?', 'Tempo', 'Alertas por plantão', 'Graves sem alerta', 'Alertas certos (VPP)'], linhas, 'tbl-modelos') + fala(ctx, 'R1', 'gestao');
      },
      caso: { titulo: 'Excelente no laboratório, difícil no posto',
        texto: 'Na Tailândia, um modelo do Google para retinopatia diabética, muito preciso nos testes, encontrou fotos de baixa qualidade e internet lenta nos postos de saúde. O fluxo real decidiu o resultado.',
        fonte: 'Beede et al., CHI 2020' },
      pergunta: 'Qual modelo vai para o plantão?',
      opcoes: function (ctx) {
        var ids = ctx.flags.shortlist || [];
        var d = {
          A: { fx: { seguranca: 6, confianca: 5, eficiencia: 2 }, q: 2, consequencia: 'Os médicos gostaram de ver o motivo de cada alerta na tela.',
            comentario: 'Equilíbrio entre sensibilidade e especificidade, testado no Brasil e explica cada alerta.' },
          B: { fx: { seguranca: 2, confianca: -3 }, q: 1, consequencia: 'Parte do plantão pergunta como confiar num número sem explicação.',
            comentario: 'Bom desempenho, mas caixa-preta, testado só nos EUA e dependente de GPU.' },
          C: { fx: { seguranca: 5, confianca: 6, eficiencia: -1 }, q: 2, consequencia: 'Os médicos conseguem refazer a conta; a enfermagem teme o número de alarmes.',
            comentario: 'Transparência total e teste local; o ponto fraco (mais alarmes falsos) pode ser tratado no limiar e no fluxo.' },
          D: { fx: { seguranca: -4, confianca: -2 }, q: 0, consequencia: 'O TriAI foi escolhido pelos números impressionantes.',
            comentario: 'Os números vinham do treino e de uma variável que denuncia a decisão já tomada (pedido de UTI): vazamento.' },
          E: { fx: { seguranca: -6, confianca: -2, eficiencia: 1 }, q: 0, consequencia: 'O AcuraMax foi escolhido: barato e com acurácia alta.',
            comentario: 'Com sensibilidade de 15%, o modelo quase nunca alerta. A acurácia alta é efeito da baixa prevalência.' }
        };
        return ids.map(function (k) { var m = M[k]; return { id: k, label: m.nome, detalhe: m.tecnica, fx: d[k].fx, flags: { modelo: k }, q: d[k].q, consequencia: d[k].consequencia, comentario: d[k].comentario }; });
      },
      conceitos: ['explicabilidade', 'vpp', 'fadiga_alarmes'],
      conceito: 'Entre modelos parecidos, vence o que cabe no fluxo: explica o alerta de um jeito que o clínico consegue conferir, responde a tempo, usa dados que já existem e gera alertas que o plantão consegue atender.',
      ra: ['RA6']
    },

    /* ------------------------------- DIA 4 ------------------------------- */
    {
      id: 'M3', setor: 'urgencia', day: 4, portes: TODOS, type: 'decisao', apresentacao: 'lab',
      titulo: 'Ajuste o limiar de alerta',
      fase: 'Avaliação · Limiar de decisão',
      contexto: function (ctx) {
        var m = modeloAtual(ctx); if (!m) return '<p>Aguardando a escolha do modelo.</p>';
        var linhas = ['baixo', 'medio', 'alto'].map(function (k) {
          var l = m.limiares[k], c = G.carga(l[0], l[1]);
          return ['<b>' + G.LIMIAR_NOME[k] + '</b>', l[0] + '%', l[1] + '%', G.r0(c.vpp) + '%', '<b>' + G.r0(c.alertas) + '</b>', G.r1(c.perdidos)];
        });
        return '<p>O <b>' + m.nome + '</b> calcula uma chance de piora. O limiar decide a partir de que chance o alerta toca.</p>' +
          G.tbl(['Limiar', 'Sensibilidade', 'Especificidade', 'VPP', 'Alertas/plantão', 'Graves sem alerta'], linhas);
      },
      caso: { titulo: 'Alerta demais vira ruído',
        texto: 'Na validação independente do modelo de sepse da Epic, o alerta tocava para 18% de todos os pacientes internados — muitos alarmes falsos para poucos casos encontrados.',
        fonte: 'Wong et al., JAMA Internal Medicine, 2021' },
      pergunta: 'Qual limiar o plantão vai usar?',
      opcoes: function (ctx) {
        var m = modeloAtual(ctx); if (!m) return [];
        return ['baixo', 'medio', 'alto'].map(function (k) {
          var l = m.limiares[k], c = G.carga(l[0], l[1]);
          var ef = c.alertas > 80 ? -4 : (c.alertas > 50 ? -2 : 2), cf = c.alertas > 80 ? -4 : (c.alertas > 50 ? -1 : 1);
          var coment = {
            baixo: 'Limiar baixo: encontra quase todos, ao preço de muitos alarmes falsos (' + G.r0(c.fp) + ' por plantão). Certo quando perder um paciente grave é o pior erro — se a equipe der conta de responder.',
            medio: 'Limiar intermediário: equilíbrio entre pacientes graves encontrados e carga de alertas.',
            alto: 'Limiar alto: poucos alarmes, mas ' + G.r1(c.perdidos) + ' pacientes graves sem alerta por plantão. Para piora clínica, o falso negativo costuma ser o erro mais caro.'
          };
          if (m.id === 'D') coment[k] += ' Nenhum limiar corrige um modelo com vazamento.';
          if (m.id === 'E') coment[k] += ' Com um modelo tão fraco, nenhum limiar entrega sensibilidade aceitável.';
          return { id: k, label: G.LIMIAR_NOME[k], detalhe: 'Sensibilidade ' + l[0] + '% · especificidade ' + l[1] + '%',
            fx: { seguranca: Math.round((l[0] - 80) / 4), eficiencia: ef, confianca: cf },
            flags: { limiar: k, sensUrg: l[0], espUrg: l[1], alertasUrg: Math.round(c.alertas) }, q: m.qLim[k],
            consequencia: 'Limiar definido: cerca de ' + G.r0(c.alertas) + ' alertas por plantão, ' + G.r0(c.vp) + ' deles certos.', comentario: coment[k] };
        });
      },
      conceitos: ['limiar', 'sensibilidade', 'especificidade', 'vpp', 'fadiga_alarmes'],
      conceito: 'O modelo dá uma chance; o limiar é uma decisão clínica. Baixar o limiar encontra mais pacientes graves e gera mais alarmes falsos; subir faz o contrário.',
      ra: ['RA5', 'RA6']
    },

    /* ------------------------------- DIA 5 ------------------------------- */
    {
      id: 'M4', setor: 'urgencia', day: 5, portes: TODOS, type: 'decisao',
      titulo: 'O que acontece quando o alerta toca?',
      fase: 'Implantação · Humano no circuito',
      contexto: function (ctx) {
        var m = modeloAtual(ctx);
        return '<p>O <b>' + (m ? m.nome : 'modelo') + '</b> vai entrar no plantão, com cerca de <b>' + (ctx.flags.alertasUrg || '—') + ' alertas por plantão</b>. Falta combinar o que acontece quando ele toca.</p>' +
          (ctx.flags.contrato === 'silencioso' ? '<p class="nota">O contrato prevê 3 meses de piloto silencioso: este fluxo vale para quando os alertas forem ligados.</p>' : '');
      },
      caso: { titulo: 'O benefício veio da confirmação humana',
        texto: 'No estudo do alerta de sepse TREWS, a queda de mortalidade apareceu nos casos em que um profissional avaliava e confirmava o alerta em até 3 horas.',
        fonte: 'Adams et al., Nature Medicine, 2022' },
      pergunta: 'Que fluxo o plantão vai seguir?',
      opcoes: [
        { id: 'automatico', label: 'O alerta coloca o paciente direto na fila da UTI, sem avaliação médica.', fx: { eficiencia: 3, seguranca: -6, conformidade: -4, confianca: -3 }, flags: { fluxo: 'automatico' }, q: 0,
          consequencia: 'A fila da UTI passou a ser alimentada pelo modelo.', comentario: 'Automação total tira o clínico da decisão — e cada alarme falso ocupa uma vaga de UTI.' },
        { id: 'humano', label: 'O alerta aparece na tela da triagem com o motivo; a enfermagem reavalia em até 15 minutos e chama o médico pelo protocolo; o médico pode discordar registrando o motivo; toda a equipe é treinada antes.',
          custo: 30, fx: { seguranca: 6, confianca: 6, eficiencia: 1 }, flags: { fluxo: 'humano' }, q: 2,
          consequencia: 'Treinamento feito em todos os plantões. As discordâncias registradas vão ajudar a melhorar o modelo.',
          comentario: 'Alerta com ação definida (quem, em quanto tempo, o quê), espaço para discordar e equipe treinada.' },
        { id: 'livre', label: 'O alerta aparece só para o médico, sem protocolo: cada um faz o que achar melhor.', fx: { seguranca: 1, confianca: -1 }, flags: { fluxo: 'livre' }, q: 1,
          consequencia: 'Cada médico reage ao alerta de um jeito.', comentario: 'Sem protocolo, o alerta vira ruído: uns ignoram, outros reagem a tudo.' },
        { id: 'relatorio', label: 'Os alertas são enviados num relatório no fim do plantão.', portes: RA, fx: { seguranca: -4 }, flags: { fluxo: 'relatorio' }, q: 0,
          consequencia: 'O relatório chega todo dia às 19h.', comentario: 'Um alerta de piora que chega no fim do plantão não muda decisão nenhuma.' }
      ],
      conceitos: ['humano_no_circuito', 'vies_automacao', 'fadiga_alarmes'],
      conceito: 'Um alerta só muda o desfecho se houver uma ação combinada: quem vê, em quanto tempo, o que faz e como registra quando discorda.',
      ra: ['RA6', 'RA8']
    },

    /* ------------------------------- DIA 6 ------------------------------- */
    {
      id: 'M5', setor: 'urgencia', day: 6, portes: REG, type: 'decisao',
      titulo: 'O modelo mudou de comportamento',
      fase: 'Monitoramento · Deriva',
      contexto: function (ctx) {
        var m = modeloAtual(ctx);
        return '<p>Dois pacientes graves passaram sem alerta. Revendo os casos, a equipe descobriu que a triagem trocou o modelo de <b>oxímetro</b> há três semanas: as saturações ficaram cerca de 2 pontos mais altas, e o <b>' + (m ? m.nome : 'modelo') + '</b> passou a achar os pacientes menos graves do que são.</p>';
      },
      caso: { titulo: 'Quando o mundo muda',
        texto: 'Durante a COVID-19, o número de alertas do modelo de sepse da Epic aumentou cerca de 43% em poucas semanas: o perfil dos pacientes mudou e o modelo, não.',
        fonte: 'Wong et al., JAMA Network Open, 2021' },
      pergunta: 'O que você faz?',
      opcoes: [
        { id: 'manter', label: 'Manter tudo: o modelo foi validado.', fx: { seguranca: -6, confianca: -3 }, flags: { deriva: 'manter' }, q: 0,
          consequencia: 'Nada mudou no plantão.', comentario: 'Validação antiga não protege contra mudanças no mundo: o risco calculado já não bate com o risco real.' },
        { id: 'recalibrar', label: 'Avisar o plantão, reforçar o julgamento clínico enquanto isso, reajustar o modelo com dados recentes, testar antes de religar e registrar o incidente.',
          custo: 30, fx: { seguranca: 5, confianca: 4, dados: 3 }, flags: { deriva: 'recalibrar' }, q: 2,
          consequencia: 'O modelo foi reajustado e testado em uma semana.', comentario: 'Detectar, comunicar, reajustar, testar e registrar: a resposta madura.' },
        { id: 'limiar', label: 'Baixar o limiar por conta própria, sem avisar ninguém.', fx: { seguranca: 1, eficiencia: -3, confianca: -4 }, flags: { deriva: 'limiar' }, q: 0,
          consequencia: 'Os alertas voltaram — junto com alarmes falsos que ninguém entende.', comentario: 'Ajuste sem teste nem registro: ninguém sabe o que mudou.' },
        { id: 'desligar', label: 'Desligar o modelo de vez e voltar só ao protocolo manual.', fx: { seguranca: -1, confianca: -2, eficiencia: -2 }, flags: { deriva: 'desligar' }, q: 1,
          consequencia: 'O protocolo manual reassume.', comentario: 'Seguro no curto prazo, mas descarta o investimento sem corrigir uma causa conhecida.' }
      ],
      conceitos: ['deriva', 'calibracao', 'monitoramento'],
      conceito: 'Deriva: os dados de entrada mudam (novo aparelho, novo protocolo, nova doença) e o modelo, treinado no mundo antigo, passa a errar em silêncio.',
      ra: ['RA7']
    },

    {
      id: 'E5', setor: 'especialidades', day: 6, portes: TODOS, type: 'decisao',
      titulo: 'O modelo funciona igual para todos os pacientes?',
      fase: 'Ética · Viés e equidade',
      contexto: function (ctx) {
        var e = G.espAtual(ctx);
        var ext = ctx.flags.verba_validacao ? '<p class="nota bom">A validação externa em outro hospital confirmou o mesmo padrão.</p>' : '';
        return '<p>Antes de liberar o modelo de <b>' + e.nome.toLowerCase() + '</b> (' + e.ferramenta + '), a equipe olhou o resultado <b>por grupo de pacientes</b>:</p>' +
          G.tbl(['Grupo', e.metrica], e.grupos.map(function (g, i) { return [i ? g[0] : '<b>' + g[0] + '</b>', i ? g[1] : '<b>' + g[1] + '</b>']; })) +
          '<p>Os grupos com pior resultado somam cerca de <b>1 em cada 5 atendimentos</b>.</p>' + ext;
      },
      caso: { titulo: 'O algoritmo que media necessidade pelo custo',
        texto: 'Um algoritmo usado nos EUA para indicar cuidado extra usava o gasto com saúde como “medida” de necessidade. Pacientes negros, que gastavam menos por terem menos acesso, precisavam estar mais doentes para receber o mesmo escore.',
        fonte: 'Obermeyer et al., Science, 2019' },
      pergunta: 'O que a equipe faz?',
      opcoes: [
        { id: 'implantar', label: 'Liberar assim mesmo: o resultado geral está bom.', fx: { seguranca: -5, conformidade: -6 }, flags: { vies: 'ignorar' }, q: 0,
          consequencia: 'Modelo liberado para todos.', comentario: 'A média boa esconde o desempenho ruim justamente nos pacientes mais vulneráveis.' },
        { id: 'remover', label: 'Tirar do modelo as informações de idade, sexo e origem para ele ficar “neutro”.', fx: { seguranca: -2, conformidade: -1 }, flags: { vies: 'remover' }, q: 0,
          consequencia: 'Variáveis removidas. O resultado nos grupos não melhorou.', comentario: 'O viés vem dos dados (aparelho, foto, pouca representação), não da coluna. Apagar a variável não resolve e ainda impede de medir o problema.' },
        { id: 'restringir', label: 'Liberar só para quem foi bem testado, avisar na tela onde o modelo não deve ser usado, coletar mais casos dos grupos com pior resultado e acompanhar o desempenho por grupo.',
          custo: 50, fx: { seguranca: 4, conformidade: 6, confianca: 3 }, flags: { vies: 'restringir' }, q: 2,
          consequencia: 'Uso restrito com aviso na tela; a coleta direcionada começou.', comentario: 'Avaliar por grupo, restringir ao que foi validado e corrigir a origem do problema nos dados.' },
        { id: 'cancelar', label: 'Cancelar o projeto.', portes: RA, fx: { eficiencia: -4, confianca: -2 }, flags: { vies: 'cancelar' }, q: 1,
          consequencia: 'Projeto encerrado.', comentario: 'Seguro, mas desperdiça uma ferramenta útil para a maioria, em vez de restringir e corrigir.' }
      ],
      conceitos: ['vies', 'equidade', 'validacao_externa'],
      conceito: 'Um bom resultado médio pode esconder resultado ruim nos pacientes mais vulneráveis. Avaliar por grupo, restringir o uso ao que foi validado e corrigir os dados é o caminho; apagar a variável sensível não remove o viés.',
      ra: ['RA7', 'RA8']
    }
  );
})(window.GAME);
