/* ==========================================================================
   PLANTÃO IA — as 6 histórias (incidentes do meio do mês)
   Cada hospital recebe uma história no início do jogo (sorteio equilibrado:
   sai a menos usada na turma). O incidente começa no dia 15 ou 16, com
   sinais no jornal da semana 2. Cada história tem:
     · sinais (dias −6 e −3), início (dia 0) e desfecho (dia +5) no jornal
     · 4 a 5 decisões adaptadas ao porte (I1 clínica, I2 compras, I3 gestão,
       I4 TI — simples —, I5 bloco cirúrgico nos hospitais maiores)
     · 4 casos clínicos do incidente (dias +1 a +4), no lugar dos casos comuns
   Conteúdo fictício, inspirado em situações reais da saúde pública brasileira.
   ========================================================================== */
(function (G) {
  'use strict';
  var TODOS = G.TODOS, RA = ['regional', 'alta'];
  G.HISTORIAS = {};
  G.HISTORIA_ORDEM = [];
  G.CASOS_HISTORIA = [];

  function qDe(t, id) {
    var o = (t.opcoes || []).filter(function (x) { return String(x.id) === String(id); })[0];
    return o && typeof o.q === 'number' ? o.q : null;
  }

  /** Registra uma história: tarefas, eventos e casos. */
  function historia(H) {
    G.HISTORIAS[H.id] = H;
    G.HISTORIA_ORDEM.push(H.id);
    var ids = [];
    H.tarefas.forEach(function (t) {
      var id = H.prefixo + '_' + t.id;
      ids.push({ id: id, t: t });
      G.TASKS.push(Object.assign({ type: 'decisao', portes: TODOS, fase: 'Resposta ao incidente', ra: ['RA8'] }, t, { id: id, historia: H.id, rel: t.rel || 0 }));
    });
    H.casos.forEach(function (c) { c.historia = H.id; G.CASOS_HISTORIA.push(c); });
    H.sinais.forEach(function (s, i) {
      G.EVENTS.push({ id: 'h_' + H.prefixo + '_sinal' + (i + 1), historia: H.id, rel: s.rel, tom: s.tom || 'info', setor: s.setor, when: function () { return true; }, titulo: s.titulo, texto: s.texto, fx: s.fx || {} });
    });
    G.EVENTS.push({ id: 'h_' + H.prefixo + '_inicio', historia: H.id, rel: 0, tom: 'alerta', setor: H.inicio.setor, when: function () { return true; }, titulo: H.inicio.titulo,
      texto: function (c) { return H.inicio.texto + (c.flags.prepIncidente ? ' ' + H.inicio.preparado : ''); },
      fx: function (c) {
        var fx = {}, k = c.flags.prepIncidente ? 0.4 : 1;
        Object.keys(H.inicio.fx).forEach(function (x) { fx[x] = Math.round(H.inicio.fx[x] * k); });
        return fx;
      } });
    function nota(c) {
      var pts = 0, n = 0;
      ids.forEach(function (x) {
        if (x.t.portes && x.t.portes.indexOf(c.porte) < 0) return;
        n++;
        var d = c.dec(x.id), q = d ? qDe(x.t, d.opcao_id) : null;
        if (q !== null) pts += q / 2;
      });
      n++; if (c.flags.prepIncidente) pts += 1;
      if (c.flags.escalaExtra) pts += 0.5;
      return pts / n;
    }
    function nivel(c) { var r = nota(c); return r >= 0.7 ? 'bom' : (r >= 0.4 ? 'medio' : 'ruim'); }
    G.EVENTS.push({ id: 'h_' + H.prefixo + '_fim', historia: H.id, rel: 5, setor: H.inicio.setor, when: function () { return true; },
      tom: function (c) { return { bom: 'bom', medio: 'info', ruim: 'alerta' }[nivel(c)]; },
      titulo: function (c) { return H.fim[nivel(c)][0]; },
      texto: function (c) { return H.fim[nivel(c)][1]; },
      fx: function (c) { return { bom: { seguranca: 3, confianca: 3, eficiencia: 2 }, medio: { confianca: 1 }, ruim: { seguranca: -4, confianca: -4, eficiencia: -2 } }[nivel(c)]; } });
  }
  G.historiaDe = function (ctx) { return G.HISTORIAS[ctx && ctx.historia] || null; };

  /* opções clínicas padronizadas (flag incidenteClin): protocolo · limiar · confiar · desligar
     — os casos do incidente usam essa escolha a partir do dia seguinte */

  /* ======================================================================
     1. VERÃO DAS ARBOVIROSES
     ====================================================================== */
  historia({
    id: 'arbovirose', prefixo: 'DG', nome: 'Verão das arboviroses', curto: 'Epidemia de dengue', icone: 'mosquito', cor: '#B7791F',
    alvo: 'uma epidemia de arboviroses (dengue e chikungunya)', insumo: 'soro fisiológico e analgésicos',
    resumo: 'Epidemia de dengue no município. O modelo da urgência, treinado sem epidemia, não enxerga sinais de alarme nem hematócrito.',
    preparo: { label: 'Plano para arboviroses: estoque de soro e analgésicos, sala de hidratação e fluxo da classificação de risco da dengue', detalhe: 'O que fazer se os casos de dengue dispararem.' },
    excluir: [],
    dias: {
      0: ['Epidemia de dengue declarada', 'Resposta ao incidente', 'A urgência recebe o dobro de pacientes. O modelo foi treinado sem epidemia — e a decisão sobre ele é do corpo clínico.'],
      1: ['Sala de hidratação lotada', 'Resposta ao incidente', 'A epidemia cresce. Comunicar, organizar o fluxo e garantir capacidade.'],
      2: ['A epidemia no pico', 'Resposta ao incidente', 'Dados, painel e bloco cirúrgico precisam se ajustar ao pico.'],
      3: ['Ainda no pico', 'Resposta ao incidente', 'Cada caso do plantão testa o modelo num cenário para o qual ele não foi treinado.'],
      4: ['A curva começa a cair', 'Resposta ao incidente', 'Os atendimentos diminuem, mas os pacientes no período crítico ainda chegam.'],
      5: ['Depois da epidemia', 'Lições do incidente', 'O jornal faz o balanço da epidemia.']
    },
    sinais: [
      { rel: -6, setor: 'diretoria', titulo: 'Boletim da vigilância: dengue em alta', texto: 'A Secretaria de Saúde informa que os casos prováveis de dengue e chikungunya subiram 40% em uma semana no Agreste.' },
      { rel: -3, setor: 'compras', tom: 'alerta', titulo: 'Consumo de soro disparou', texto: 'O consumo de soro e de dipirona subiu 25% em três dias. A urgência atendeu cinco pacientes com plaquetas baixas.' }
    ],
    inicio: { setor: 'urgencia', titulo: 'Epidemia de dengue declarada', texto: 'O município declarou epidemia de dengue. A urgência recebe o dobro de pacientes e a sala de hidratação está lotada.',
      preparado: 'O plano para arboviroses foi acionado: soro em estoque e sala de hidratação montada.', fx: { eficiencia: -6, seguranca: -3 } },
    fim: {
      bom: ['A epidemia passou com menos dano', 'Com protocolo, estoque e fluxo organizados, ninguém morreu por dengue no hospital. O modelo seguiu como apoio, sem descartar ninguém.'],
      medio: ['A epidemia passou, com sustos', 'O hospital atravessou o pico, mas houve faltas pontuais e pacientes que esperaram demais.'],
      ruim: ['A epidemia deixou marcas', 'Pacientes com sinais de alarme esperaram na fila porque o alerta não tocou. A imprensa noticiou duas mortes evitáveis.']
    },
    tarefas: [
      { id: 'I1', setor: 'urgencia', rel: 0, titulo: 'Dengue na porta: o que fazer com o modelo de piora?',
        contexto: function (ctx) {
          var m = G.MODELS[ctx.flags.modelo];
          return '<p>O <b>' + (m ? G.esc(m.nome) : 'modelo') + '</b> foi treinado com pacientes de um ano sem epidemia. Ele usa sinais vitais e idade — <b>não vê sinais de alarme da dengue nem o hematócrito</b>.</p>' +
            '<p>Na dengue, o período mais perigoso é a <b>defervescência</b> (3º ao 7º dia): o paciente melhora da febre e pode entrar em choque por extravasamento plasmático, com sinais vitais ainda “aceitáveis”.</p>';
        },
        caso: { titulo: 'Dengue 2024', texto: 'Em 2024 o Brasil teve a maior epidemia de dengue da história, com mais de 6 milhões de casos prováveis. O Ministério da Saúde reforçou o manejo pela classificação de risco (grupos A, B, C e D), em que os sinais de alarme definem a conduta.', fonte: 'Ministério da Saúde, Dengue: diagnóstico e manejo clínico (2024)' },
        pergunta: 'O que o corpo clínico faz com o modelo durante a epidemia?',
        opcoes: [
          { id: 'protocolo', label: 'Manter o modelo só como apoio e usar a classificação de risco da dengue (grupos A a D) para todo caso suspeito: sinais de alarme e hematócrito decidem; o “sem alerta” não descarta ninguém.', custo: 10, fx: { seguranca: 4, confianca: 3 }, flags: { incidenteClin: 'protocolo' }, q: 2,
            consequencia: 'Toda suspeita de dengue passa pelo protocolo; o alerta continua ajudando nos outros pacientes.', comentario: 'O modelo não foi treinado para esse cenário: o protocolo cobre o que ele não enxerga.' },
          { id: 'limiar', label: 'Baixar o limiar do modelo durante a epidemia, para ele alertar mais.', fx: { seguranca: 1, eficiencia: -3 }, flags: { incidenteClin: 'limiar' }, q: 1,
            consequencia: 'Os alertas dobraram — mas continuam sem enxergar os sinais de alarme.', comentario: 'Mais alertas não corrigem o que o modelo não vê; e aumentam a carga numa equipe já sobrecarregada.' },
          { id: 'confiar', label: 'Seguir o modelo: se ele não alertou, o paciente pode esperar.', fx: { seguranca: -5, confianca: -2 }, flags: { incidenteClin: 'confiar' }, q: 0,
            consequencia: 'Pacientes no período crítico ficaram na fila do verde.', comentario: 'Viés de automação num cenário fora do treino: o modelo não conhece a dengue grave.' },
          { id: 'desligar', label: 'Desligar o modelo durante a epidemia e usar só o protocolo.', fx: { seguranca: 2, confianca: -1 }, flags: { incidenteClin: 'desligar' }, q: 1,
            consequencia: 'O alerta saiu do ar por uma semana.', comentario: 'Seguro para a dengue, mas tira o apoio dos pacientes sem dengue — que continuam chegando.' }
        ],
        conceitos: ['deriva', 'vies_automacao', 'apoio_decisao'], conceito: 'Um modelo treinado num cenário (sem epidemia) pode falhar em outro: a população mudou. Protocolo clínico cobre o que o modelo não enxerga.', ra: ['RA7', 'RA8'] },
      { id: 'I2', setor: 'compras', rel: 0, titulo: 'Soro, analgésicos e repelente: como abastecer?',
        contexto: function (ctx) {
          return '<p>O consumo de soro fisiológico triplicou. Paracetamol e dipirona saem como nunca; anti-inflamatórios e AAS devem ser evitados na dengue.</p>' +
            (ctx.flags.prepCompras === 'corrigido' ? '<p class="nota bom">A previsão de compras considera as epidemias dos anos anteriores.</p>' : '<p class="nota">A previsão de compras não foi ajustada para epidemias.</p>');
        },
        pergunta: 'Como abastecer o hospital?',
        opcoes: [
          { id: 'previsao', label: 'Pedido emergencial guiado pela previsão ajustada à epidemia (curva dos anos anteriores + boletim semanal), com estoque de segurança e troca de itens com a rede.', custo: 60, fx: { eficiencia: 3, seguranca: 2 }, flags: { incCompras: 'previsao' }, q: 2,
            consequencia: 'O soro não faltou e não sobrou caixa no corredor.', comentario: 'Previsão + estoque de segurança + rede: compra proporcional ao risco.' },
          { id: 'dobro', label: 'Pedir o dobro de tudo, de todos os fornecedores.', custo: 140, fx: { eficiencia: 1 }, flags: { incCompras: 'dobro' }, q: 1,
            consequencia: 'Sobrou soro — e faltou dinheiro para outras coisas.', comentario: 'Resolve a falta, mas desperdiça verba e espaço.' },
          { id: 'esperar', label: 'Comprar só quando o estoque acabar.', fx: { eficiencia: -4, seguranca: -3 }, flags: { incCompras: 'esperar' }, q: 0,
            consequencia: 'O soro acabou no segundo dia do pico.', comentario: 'Compras sem previsão chegam depois da falta.' }
        ],
        conceitos: ['previsao', 'estoque_seguranca', 'sazonalidade'], conceito: 'Epidemias sazonais são previsíveis: a previsão com sazonalidade e estoque de segurança evita falta e desperdício.', ra: ['RA5'] },
      { id: 'I3', setor: 'diretoria', rel: 1, titulo: 'A urgência está no limite',
        contexto: function () { return '<p>A espera passou de 5 horas. A sala de hidratação tem 12 poltronas e 30 pacientes aguardando.</p>'; },
        pergunta: 'O que a gestão faz?',
        opcoes: [
          { id: 'expandir', label: 'Abrir uma ala de hidratação, chamar o sobreaviso, remanejar leitos e combinar com a regulação o fluxo dos casos graves.', custo: 60, fx: { eficiencia: 4, seguranca: 3 }, flags: { incGestao: 'expandir' }, q: 2,
            consequencia: 'A espera caiu para 2 horas em dois dias.', comentario: 'Capacidade proporcional ao pico, com a rede.' },
          { id: 'eletivas', label: 'Suspender todas as consultas e cirurgias eletivas por um mês.', fx: { eficiencia: 1, confianca: -2 }, flags: { incGestao: 'eletivas' }, q: 1,
            consequencia: 'Sobrou equipe, mas a fila de cirurgias cresceu muito.', comentario: 'Ajuda, mas exagera na duração e no alcance.' },
          { id: 'porta', label: 'Mandar para casa, sem avaliação, quem chegar com “sintomas leves”.', fx: { seguranca: -5, conformidade: -3 }, flags: { incGestao: 'porta' }, q: 0,
            consequencia: 'Dois pacientes mandados para casa voltaram em choque.', comentario: 'Todo caso suspeito precisa de classificação: o grupo A só é definido depois de avaliar.' }
        ],
        conceitos: ['continuidade'], conceito: 'Num incidente, a gestão ajusta capacidade e fluxo; não se descarta paciente sem avaliação.' },
      { id: 'I4', setor: 'ti', rel: 2, titulo: 'Um painel para a epidemia',
        contexto: function () { return '<p>A diretoria pergunta todo dia: “quantos casos, quantos graves, quanto soro temos?”. A vigilância cobra as notificações.</p>'; },
        pergunta: 'O que a TI coloca no ar? (decisão simples)',
        opcoes: [
          { id: 'painel', label: 'Um painel simples, atualizado a cada hora: casos suspeitos, pacientes com sinais de alarme, poltronas de hidratação livres e estoque de soro — e a lista para a notificação.', custo: 15, fx: { dados: 3, eficiencia: 2 }, flags: { incTI: 'painel' }, q: 2,
            consequencia: 'A diretoria passou a decidir olhando os mesmos números.', comentario: 'Poucos indicadores, atualizados, que levam à ação.' },
          { id: 'planilha', label: 'Uma planilha que cada setor preenche quando der.', fx: { dados: -1 }, flags: { incTI: 'planilha' }, q: 1,
            consequencia: 'A planilha ficou desatualizada no segundo dia.', comentario: 'Melhor que nada, mas sem fonte única nem atualização.' },
          { id: 'nada', label: 'Nada novo: a TI está ocupada.', fx: { dados: -2, eficiencia: -1 }, flags: { incTI: 'nada' }, q: 0,
            consequencia: 'Cada setor contou os casos de um jeito.', comentario: 'Sem dado, a gestão decide no escuro.' }
        ],
        conceitos: ['dashboard', 'kpi'], conceito: 'No incidente, o painel certo tem poucos números que pedem ação, sempre atualizados.' },
      { id: 'I5', setor: 'bloco', rel: 2, portes: RA, titulo: 'O bloco cirúrgico na epidemia',
        contexto: function () { return '<p>A enfermagem do bloco é chamada para ajudar na hidratação. Há 40 cirurgias eletivas marcadas na semana.</p>'; },
        pergunta: 'Como reorganizar o bloco?',
        opcoes: [
          { id: 'reprogramar', label: 'Adiar por duas semanas as eletivas que podem esperar, usando a previsão do bloco para reprogramar, e manter oncológicas e urgências.', fx: { eficiencia: 3, seguranca: 1 }, flags: { incBloco: 'reprogramar' }, q: 2,
            consequencia: 'Equipe liberada para a hidratação, sem cancelar o que não pode esperar.', comentario: 'Priorizar pelo risco e usar a previsão para reprogramar.' },
          { id: 'manter', label: 'Manter a agenda normal.', fx: { eficiencia: -2 }, flags: { incBloco: 'manter' }, q: 1,
            consequencia: 'O bloco seguiu cheio enquanto a hidratação faltava gente.', comentario: 'Ignora o pico na porta do hospital.' },
          { id: 'tudo', label: 'Cancelar todas as cirurgias, inclusive oncológicas.', fx: { seguranca: -3, confianca: -2 }, flags: { incBloco: 'tudo' }, q: 0,
            consequencia: 'Pacientes oncológicos tiveram a cirurgia adiada.', comentario: 'Cancelar o que não pode esperar troca um risco por outro.' }
        ],
        conceitos: ['previsao'], conceito: 'Num pico, o bloco prioriza pelo risco clínico e usa a previsão para reprogramar.' }
    ],
    casos: [
      { id: 'dg1', tipo: 'fn', nome: 'Luana', idade: 34, sexo: 'F', manchester: 'laranja',
        queixa: '5º dia de doença; desde ontem sem febre, mas com dor abdominal forte e contínua e vômitos que não param.',
        sinais: { PA: '104/76', FC: 102, FR: 20, SpO2: 98, T: 36.6, Glasgow: 15 },
        extra: 'Hematócrito 49% (era 39% no 2º dia). Plaquetas 38.000/mm³.', grave: true, d: 0.94, fatores: ['FC 102 bpm'],
        desfecho: 'Extravasamento plasmático e choque no mesmo dia: UTI.',
        licao: 'Na defervescência, sinais de alarme (dor abdominal intensa, vômitos persistentes) e hematócrito subindo definem o grupo C: hidratação venosa imediata. O modelo não vê nada disso.' },
      { id: 'dg2', tipo: 'fp', nome: 'Thiago', idade: 25, sexo: 'M', manchester: 'amarelo',
        queixa: '2º dia de febre, dor no corpo e atrás dos olhos.',
        sinais: { PA: '120/76', FC: 110, FR: 22, SpO2: 98, T: 39.2, Glasgow: 15 },
        extra: 'Prova do laço negativa. Sem sinais de alarme. Bebendo bem.', grave: false, d: 0.92, fatores: ['FC 110 bpm', 'T 39,2 °C'],
        desfecho: 'Dengue sem sinais de alarme (grupo A): hidratação oral em casa, notificação e retorno no primeiro dia sem febre — ou antes, se surgirem sinais de alarme.',
        licao: 'A febre explica boa parte da taquicardia. Sem sinais de alarme, grupo A: se o alerta tocou, foi falso positivo — e na epidemia cada leito conta.' },
      { id: 'dg3', tipo: 'vp', nome: 'Dona Socorro', idade: 81, sexo: 'F', manchester: 'vermelho',
        queixa: '4º dia de dengue; tontura ao levantar e muito sonolenta.',
        sinais: { PA: '86/60', FC: 120, FR: 24, SpO2: 95, T: 36.9, Glasgow: 14 },
        extra: 'Diabética. Extremidades frias.', grave: true, d: 0.15, fatores: ['PA 86/60', 'FC 120 bpm', '81 anos', 'Glasgow 14'],
        desfecho: 'Choque por dengue (grupo D): reposição rápida de volume e UTI. Sobreviveu.',
        licao: 'Paciente em choque: sala vermelha e reposição de volume sem demora. Se o modelo alertou, acertou — mas a clínica já bastava.' },
      { id: 'dg4', tipo: 'fn', nome: 'Heitor', idade: 6, sexo: 'M', manchester: 'vermelho', saida: 'baixa', foraPerfil: true,
        queixa: '5º dia de dengue; vômitos e muito sonolento.',
        sinais: { PA: '92/70', FC: 138, FR: 28, SpO2: 97, T: 36.4, Glasgow: 14 },
        extra: 'Extremidades frias, tempo de enchimento capilar de 4 segundos. Hematócrito 46%.', grave: true, d: 0.5, fatores: ['FC 138 bpm'],
        desfecho: 'Choque compensado por dengue: hidratação venosa e UTI pediátrica.',
        licao: 'Aos 6 anos, FC 138 é taquicardia importante, e a criança mantém a pressão até a fase tardia do choque: a pressão “normal” engana. O modelo foi treinado com adultos e lê esses números com a régua de adulto — fora do perfil de treino, um escore baixo não tranquiliza; vale o protocolo pediátrico.' }
    ]
  });

  /* ======================================================================
     2. DEPOIS DA ENCHENTE
     ====================================================================== */
  historia({
    id: 'enchente', prefixo: 'EN', nome: 'Depois da enchente', curto: 'Diarreia e leptospirose', icone: 'gota', cor: '#2C7A7B',
    alvo: 'as consequências de uma enchente (diarreia e, depois, leptospirose)', insumo: 'soro de reidratação e soro fisiológico',
    resumo: 'Chuvas fortes alagam bairros: surto de diarreia aguda e, dias depois, leptospirose. O modelo de adultos falha em crianças e não vê creatinina nem exposição à água.',
    preparo: { label: 'Plano pós-enchente: soro de reidratação, água potável garantida, sala de reidratação e alerta para leptospirose', detalhe: 'O que fazer se as chuvas alagarem a cidade.' },
    excluir: [],
    dias: {
      0: ['A água baixou, a diarreia subiu', 'Resposta ao incidente', 'Surto de diarreia aguda depois da enchente. O corpo clínico decide o que fazer com o modelo.'],
      1: ['Crianças e idosos desidratados', 'Resposta ao incidente', 'Água, fluxo e comunicação: a gestão organiza a resposta.'],
      2: ['Surto no pico', 'Resposta ao incidente', 'Notificação, painel e bloco cirúrgico se ajustam ao surto.'],
      3: ['Chega a leptospirose', 'Resposta ao incidente', 'Uma a duas semanas depois da enchente, os casos de leptospirose começam a aparecer.'],
      4: ['A cidade se recupera', 'Resposta ao incidente', 'Os atendimentos diminuem; a vigilância segue atenta.'],
      5: ['Depois da enchente', 'Lições do incidente', 'O jornal faz o balanço do surto.']
    },
    sinais: [
      { rel: -6, setor: 'diretoria', titulo: 'Alerta de chuva forte', texto: 'A Defesa Civil emitiu alerta de chuvas intensas para os próximos dias no Agreste e na Zona da Mata.' },
      { rel: -3, setor: 'urgencia', tom: 'alerta', titulo: 'Bairros alagados', texto: 'Três bairros ficaram alagados. A urgência atendeu 15 pessoas com diarreia só hoje; o abastecimento de água foi interrompido em parte da cidade.' }
    ],
    inicio: { setor: 'urgencia', titulo: 'Surto de diarreia após a enchente', texto: 'Os atendimentos por diarreia triplicaram; muitas crianças e idosos chegam desidratados. A vigilância avisa: em 1 a 2 semanas, esperar casos de leptospirose.',
      preparado: 'O plano pós-enchente foi acionado: sala de reidratação montada e soro em estoque.', fx: { eficiencia: -5, seguranca: -3 } },
    fim: {
      bom: ['O surto foi contido', 'Hidratação no tempo certo, água segura e investigação ativa de leptospirose: nenhuma morte evitável no hospital.'],
      medio: ['O surto passou, com dificuldades', 'O hospital atendeu a demanda, mas alguns casos de leptospirose foram reconhecidos tarde.'],
      ruim: ['O surto custou caro', 'Crianças desidratadas esperaram demais e dois casos de leptospirose grave só foram reconhecidos na UTI.']
    },
    tarefas: [
      { id: 'I1', setor: 'urgencia', rel: 0, titulo: 'Diarreia e leptospirose: o que fazer com o modelo?',
        contexto: function (ctx) {
          var m = G.MODELS[ctx.flags.modelo];
          return '<p>O <b>' + (m ? G.esc(m.nome) : 'modelo') + '</b> foi treinado com adultos e usa sinais vitais e idade. Ele <b>não sabe se o paciente teve contato com a água da enchente</b> e não vê creatinina, bilirrubina nem o grau de desidratação de uma criança.</p>';
        },
        caso: { titulo: 'Enchentes e leptospirose', texto: 'Depois das enchentes, os casos de leptospirose costumam subir de uma a duas semanas mais tarde. A forma grave (síndrome de Weil) combina icterícia, insuficiência renal e hemorragia, e pode ser fatal se o tratamento atrasar.', fonte: 'Ministério da Saúde, Guia de Vigilância em Saúde' },
        pergunta: 'O que o corpo clínico faz com o modelo durante o surto?',
        opcoes: [
          { id: 'protocolo', label: 'Usar o manejo da diarreia por planos de hidratação (A, B e C) e, para quem teve contato com a água da enchente, investigar leptospirose (creatinina, bilirrubina, plaquetas); o modelo segue como apoio, sem descartar ninguém.', custo: 10, fx: { seguranca: 4, confianca: 3 }, flags: { incidenteClin: 'protocolo' }, q: 2,
            consequencia: 'A triagem pergunta sobre exposição à água e classifica a desidratação.', comentario: 'O protocolo cobre o que o modelo não enxerga: a história de exposição e a criança.' },
          { id: 'limiar', label: 'Baixar o limiar do modelo para ele alertar mais.', fx: { seguranca: 1, eficiencia: -3 }, flags: { incidenteClin: 'limiar' }, q: 1,
            consequencia: 'Mais alertas — mas nenhum deles pergunta pela água da enchente.', comentario: 'Mais alertas não corrigem a falta de informação.' },
          { id: 'confiar', label: 'Seguir o modelo: se ele não alertou, o paciente pode esperar.', fx: { seguranca: -5, confianca: -2 }, flags: { incidenteClin: 'confiar' }, q: 0,
            consequencia: 'Crianças desidratadas esperaram no verde.', comentario: 'Viés de automação num cenário e numa população fora do treino.' },
          { id: 'desligar', label: 'Desligar o modelo durante o surto.', fx: { seguranca: 2, confianca: -1 }, flags: { incidenteClin: 'desligar' }, q: 1,
            consequencia: 'O alerta saiu do ar por uma semana.', comentario: 'Seguro para o surto, mas tira o apoio dos demais pacientes.' }
        ],
        conceitos: ['deriva', 'vies', 'apoio_decisao'], conceito: 'Fora da população de treino (crianças) e sem a informação que importa (exposição), o modelo perde valor — o protocolo assume.', ra: ['RA7', 'RA8'] },
      { id: 'I2', setor: 'compras', rel: 0, titulo: 'Soro de reidratação, soro fisiológico e antibióticos',
        contexto: function (ctx) { return '<p>O soro de reidratação oral acaba em 3 dias. Para leptospirose, será preciso doxiciclina e penicilina cristalina.</p>' + (ctx.flags.prepCompras === 'corrigido' ? '<p class="nota bom">A previsão de compras considera os períodos de chuva.</p>' : ''); },
        pergunta: 'Como abastecer o hospital?',
        opcoes: [
          { id: 'previsao', label: 'Pedido emergencial estimado pelos atendimentos dos últimos dias e por surtos anteriores, com estoque de segurança — incluindo antibióticos para leptospirose — e troca com a rede.', custo: 50, fx: { eficiencia: 3, seguranca: 2 }, flags: { incCompras: 'previsao' }, q: 2,
            consequencia: 'Nada faltou no pico.', comentario: 'Previsão proporcional ao surto, pensando também no que vem depois (leptospirose).' },
          { id: 'dobro', label: 'Pedir o dobro de tudo.', custo: 120, fx: { eficiencia: 1 }, flags: { incCompras: 'dobro' }, q: 1,
            consequencia: 'Sobrou soro e faltou verba.', comentario: 'Sem previsão, a compra erra para mais.' },
          { id: 'esperar', label: 'Comprar quando acabar.', fx: { eficiencia: -4, seguranca: -3 }, flags: { incCompras: 'esperar' }, q: 0,
            consequencia: 'O soro de reidratação acabou no segundo dia.', comentario: 'Compra reativa chega depois da falta.' }
        ],
        conceitos: ['previsao', 'estoque_seguranca'], conceito: 'Prever o surto e o que vem depois dele evita falta de insumos.', ra: ['RA5'] },
      { id: 'I3', setor: 'diretoria', rel: 1, titulo: 'Água, fluxo e comunicação',
        contexto: function () { return '<p>A caixa d’água do hospital recebeu água da rede durante a enchente. A população não sabe o risco da leptospirose.</p>'; },
        pergunta: 'O que a gestão faz?',
        opcoes: [
          { id: 'plano', label: 'Garantir água potável (limpeza e teste da caixa d’água), abrir a sala de reidratação, notificar a vigilância e orientar a população sobre leptospirose.', custo: 40, fx: { seguranca: 3, eficiencia: 3, confianca: 2 }, flags: { incGestao: 'plano' }, q: 2,
            consequencia: 'Água segura e população orientada a procurar atendimento se tiver febre.', comentario: 'Resposta completa: água, fluxo, vigilância e comunicação.' },
          { id: 'casa', label: 'Mandar para casa com soro todos que chegarem com diarreia.', fx: { seguranca: -4 }, flags: { incGestao: 'casa' }, q: 0,
            consequencia: 'Crianças com desidratação grave voltaram piores.', comentario: 'Plano A só depois de avaliar o grau de desidratação.' },
          { id: 'eletivas', label: 'Suspender eletivas e esperar o surto passar.', fx: { eficiencia: 1 }, flags: { incGestao: 'eletivas' }, q: 1,
            consequencia: 'Sobrou gente, mas a água do hospital ninguém testou.', comentario: 'Ajuda na capacidade, mas esquece a causa do surto.' }
        ],
        conceitos: ['continuidade'], conceito: 'Num surto ligado à água, a resposta inclui a fonte (água segura), o fluxo e a vigilância.' },
      { id: 'I4', setor: 'ti', rel: 2, titulo: 'Contar os casos por bairro',
        contexto: function () { return '<p>A vigilância pede o número de casos de diarreia por semana, por idade e por bairro (monitorização das doenças diarreicas agudas).</p>'; },
        pergunta: 'O que a TI faz? (decisão simples)',
        opcoes: [
          { id: 'painel', label: 'Um painel diário de casos por bairro e faixa etária, com envio semanal à vigilância.', custo: 15, fx: { dados: 3, eficiencia: 2 }, flags: { incTI: 'painel' }, q: 2,
            consequencia: 'A vigilância identificou o bairro com água contaminada.', comentario: 'Dado organizado vira ação de saúde pública.' },
          { id: 'planilha', label: 'Uma planilha preenchida à mão na triagem.', fx: { dados: -1 }, flags: { incTI: 'planilha' }, q: 1,
            consequencia: 'Metade dos casos ficou sem bairro.', comentario: 'Melhor que nada, mas incompleto.' },
          { id: 'nada', label: 'Nada: a vigilância que se vire.', fx: { dados: -2, conformidade: -1 }, flags: { incTI: 'nada' }, q: 0,
            consequencia: 'O hospital ficou fora do mapa do surto.', comentario: 'Notificar é obrigação e ajuda a conter o surto.' }
        ],
        conceitos: ['dashboard', 'qualidade_dados'], conceito: 'Painel simples e dado completo ajudam a vigilância a achar a origem do surto.' },
      { id: 'I5', setor: 'bloco', rel: 2, portes: RA, titulo: 'O bloco cirúrgico no surto',
        contexto: function () { return '<p>Faltam técnicos de enfermagem na sala de reidratação. O bloco tem 35 eletivas na semana.</p>'; },
        pergunta: 'Como reorganizar o bloco?',
        opcoes: [
          { id: 'reprogramar', label: 'Adiar por uma semana as eletivas que podem esperar, com a previsão do bloco para reprogramar, mantendo oncológicas e urgências.', fx: { eficiencia: 3, seguranca: 1 }, flags: { incBloco: 'reprogramar' }, q: 2,
            consequencia: 'Técnicos liberados para a reidratação.', comentario: 'Prioridade pelo risco e reprogramação planejada.' },
          { id: 'manter', label: 'Manter a agenda normal.', fx: { eficiencia: -2 }, flags: { incBloco: 'manter' }, q: 1,
            consequencia: 'A sala de reidratação seguiu desfalcada.', comentario: 'Ignora o surto.' },
          { id: 'tudo', label: 'Cancelar todas as cirurgias por um mês.', fx: { seguranca: -3, confianca: -2 }, flags: { incBloco: 'tudo' }, q: 0,
            consequencia: 'A fila cirúrgica explodiu.', comentario: 'Cancelar o que não pode esperar troca um risco por outro.' }
        ],
        conceitos: ['previsao'], conceito: 'Num surto, o bloco prioriza pelo risco e usa a previsão para reprogramar.' }
    ],
    casos: [
      { id: 'en1', tipo: 'fn', nome: 'Alice', idade: 2, sexo: 'F', manchester: 'laranja', saida: 'baixa', foraPerfil: true,
        queixa: 'Diarreia 8 vezes por dia há 2 dias, vômitos; não consegue beber.',
        sinais: { PA: '80/50', FC: 168, FR: 40, SpO2: 98, T: 37.9 },
        extra: 'Olhos fundos, sinal da prega desaparece muito lentamente, letárgica.', grave: true, d: 0.5, fatores: ['FC 168 bpm'],
        desfecho: 'Desidratação grave (plano C): hidratação venosa e 2 dias na UTI pediátrica.',
        licao: 'Criança letárgica que não bebe, com olhos fundos e prega lenta: plano C, hidratação venosa. Aos 2 anos, os valores normais de FC, FR e PA são outros, e o modelo foi treinado com adultos — fora do perfil de treino, um escore baixo não deve tranquilizar ninguém.' },
      { id: 'en2', tipo: 'fp', nome: 'Rogério', idade: 40, sexo: 'M', manchester: 'verde',
        queixa: 'Diarreia aquosa 4 vezes hoje, com cólica.',
        sinais: { PA: '124/80', FC: 104, FR: 22, SpO2: 98, T: 38.2, Glasgow: 15 },
        extra: 'Bebendo bem, sem sinais de desidratação.', grave: false, d: 0.91, fatores: ['FC 104 bpm', 'T 38,2 °C'],
        desfecho: 'Diarreia aguda sem desidratação (plano A): alta com soro de reidratação oral e orientação para beber só água filtrada e fervida ou tratada com hipoclorito.',
        licao: 'Sem desidratação, plano A. Febre e cólica explicam boa parte da taquicardia.' },
      { id: 'en3', tipo: 'fn', nome: 'Seu Jailson', idade: 35, sexo: 'M', manchester: 'amarelo',
        queixa: 'Febre, dor forte nas panturrilhas, olhos amarelados e urina escura há 3 dias. Trabalhou na limpeza da enchente há 10 dias.',
        sinais: { PA: '104/64', FC: 108, FR: 22, SpO2: 95, T: 38.4, Glasgow: 15 },
        extra: 'Creatinina 3,2 mg/dL. Bilirrubina total 6 mg/dL.', grave: true, d: 0.86, fatores: ['FC 108 bpm', 'T 38,4 °C'],
        desfecho: 'Leptospirose grave (síndrome de Weil): penicilina, hemodiálise e UTI.',
        licao: 'Exposição à água da enchente + icterícia + lesão renal sugere fortemente leptospirose grave. O modelo não vê creatinina nem a história de exposição.' },
      { id: 'en4', tipo: 'vp', nome: 'Seu Damião', idade: 79, sexo: 'M', manchester: 'vermelho',
        queixa: 'Diarreia há 3 dias; hoje está confuso.',
        sinais: { PA: '80/50', FC: 124, FR: 24, SpO2: 94, T: 37.6, Glasgow: 13 },
        extra: 'Mucosas secas. Mora sozinho.', grave: true, d: 0.12, fatores: ['PA 80/50', 'FC 124 bpm', 'Glasgow 13', '79 anos'],
        desfecho: 'Choque hipovolêmico e lesão renal: hidratação venosa e UTI.',
        licao: 'Idoso desidratado em choque: sala vermelha e volume sem demora. Um alerta aqui está correto.' }
    ]
  });

  /* ======================================================================
     3. INVERNO RESPIRATÓRIO
     ====================================================================== */
  historia({
    id: 'respiratorio', prefixo: 'RS', nome: 'Inverno respiratório', curto: 'Surto de SRAG', icone: 'virus', cor: '#5779AA',
    alvo: 'um surto de vírus respiratórios (influenza e bronquiolite)', insumo: 'oseltamivir, oxigênio e máscaras',
    resumo: 'Surto de influenza A e bronquiolite. O modelo, que usa SpO₂ e frequência respiratória, dispara alertas demais (fadiga) e não serve para lactentes.',
    preparo: { label: 'Plano para vírus respiratórios: oseltamivir e oxigênio em estoque, máscaras, área de isolamento e vacinação da equipe', detalhe: 'O que fazer se os casos respiratórios dispararem.' },
    excluir: [],
    dias: {
      0: ['Surto de SRAG', 'Resposta ao incidente', 'Os alertas do modelo dobraram. O corpo clínico decide o que fazer com eles.'],
      1: ['Leitos de isolamento cheios', 'Resposta ao incidente', 'A gestão organiza leitos, isolamento e equipe.'],
      2: ['O surto no pico', 'Resposta ao incidente', 'Notificação, painel e bloco cirúrgico se ajustam ao surto.'],
      3: ['Pediatria no limite', 'Resposta ao incidente', 'A bronquiolite lota a pediatria.'],
      4: ['A curva começa a cair', 'Resposta ao incidente', 'Os atendimentos respiratórios diminuem.'],
      5: ['Depois do surto', 'Lições do incidente', 'O jornal faz o balanço do surto respiratório.']
    },
    sinais: [
      { rel: -6, setor: 'diretoria', titulo: 'Frente fria e vírus respiratórios', texto: 'O boletim estadual mostra aumento de influenza A e do vírus sincicial respiratório (VSR) nas últimas duas semanas.' },
      { rel: -3, setor: 'urgencia', tom: 'alerta', titulo: 'Mais alertas no plantão', texto: 'O número de alertas do modelo subiu 30% em três dias, quase todos por saturação baixa. A pediatria está lotada de bebês com bronquiolite.' }
    ],
    inicio: { setor: 'urgencia', titulo: 'Surto de síndrome respiratória aguda grave', texto: 'Influenza A e bronquiolite lotam o hospital. Os alertas do modelo dobraram e a equipe não dá conta de reavaliar todos.',
      preparado: 'O plano respiratório foi acionado: oseltamivir em estoque e área de isolamento pronta.', fx: { eficiencia: -5, seguranca: -3, confianca: -2 } },
    fim: {
      bom: ['O surto respiratório foi bem conduzido', 'Isolamento, oseltamivir precoce e alertas ajustados: o hospital atravessou o pico sem perder pacientes por espera.'],
      medio: ['O surto passou, com cansaço', 'O hospital deu conta, mas a equipe ficou exausta com os alarmes e houve atrasos no oseltamivir.'],
      ruim: ['O surto expôs as falhas', 'Com alertas demais, a equipe passou a ignorá-los — e pacientes graves ficaram sem reavaliação.']
    },
    tarefas: [
      { id: 'I1', setor: 'urgencia', rel: 0, titulo: 'Alertas demais: o que fazer?',
        contexto: function (ctx) {
          var m = G.MODELS[ctx.flags.modelo];
          return '<p>O <b>' + (m ? G.esc(m.nome) : 'modelo') + '</b> pesa muito a saturação e a frequência respiratória. No surto, ele dispara para muitos pacientes com síndrome gripal sem gravidade — e foi treinado com adultos, não com bebês.</p>' +
            '<p>Pela definição do Ministério da Saúde, síndrome gripal com dispneia, SpO₂ abaixo de 95% em ar ambiente ou desconforto respiratório é <b>SRAG</b>.</p>';
        },
        caso: { titulo: 'O modelo de sepse na COVID-19', texto: 'No início da pandemia, o número de alertas do modelo de sepse da Epic subiu cerca de 43% em poucas semanas: o perfil dos pacientes mudou e o modelo não. Hospitais precisaram reavaliar limiares e fluxos.', fonte: 'Wong et al., JAMA Network Open, 2021' },
        pergunta: 'O que o corpo clínico faz com o modelo durante o surto?',
        opcoes: [
          { id: 'protocolo', label: 'Manter o modelo, reforçar a reavaliação de quem alerta e usar o protocolo de SRAG e síndrome gripal (oseltamivir precoce para quem tem fator de risco, isolamento); o modelo não se aplica a bebês.', custo: 10, fx: { seguranca: 4, confianca: 3 }, flags: { incidenteClin: 'protocolo' }, q: 2,
            consequencia: 'Protocolo de SRAG na triagem; a pediatria usa os critérios de gravidade da bronquiolite.', comentario: 'O protocolo dá conta do surto; o modelo segue como apoio onde foi validado.' },
          { id: 'limiar', label: 'Subir o limiar para o modelo alertar menos e aliviar a equipe.', fx: { eficiencia: 2, seguranca: -3 }, flags: { incidenteClin: 'limiar_alto' }, q: 0,
            consequencia: 'Menos alertas — e dois pacientes graves sem alerta.', comentario: 'Subir o limiar no meio de um surto de doença respiratória grave troca alarmes falsos por pacientes graves perdidos.' },
          { id: 'confiar', label: 'Manter tudo como está e pedir que a equipe atenda todos os alertas.', fx: { eficiencia: -4, confianca: -3 }, flags: { incidenteClin: 'confiar' }, q: 1,
            consequencia: 'A equipe começou a ignorar os alertas por cansaço.', comentario: 'Fadiga de alarmes: quando tudo alerta, nada alerta.' },
          { id: 'desligar', label: 'Desligar o modelo durante o surto.', fx: { seguranca: 1, confianca: -1 }, flags: { incidenteClin: 'desligar' }, q: 1,
            consequencia: 'O alerta saiu do ar por uma semana.', comentario: 'Alivia a equipe, mas tira o apoio quando ele ainda funciona.' }
        ],
        conceitos: ['fadiga_alarmes', 'deriva', 'limiar'], conceito: 'Num surto, a população muda e os alertas também. Ajustar o fluxo e usar protocolo evita fadiga sem perder pacientes graves.', ra: ['RA5', 'RA7'] },
      { id: 'I2', setor: 'compras', rel: 0, titulo: 'Oseltamivir, oxigênio e máscaras',
        contexto: function (ctx) { return '<p>O consumo de oxigênio dobrou e o estoque de oseltamivir dura 4 dias. Máscaras N95 estão em falta no mercado.</p>' + (ctx.flags.prepCompras === 'corrigido' ? '<p class="nota bom">A previsão de compras considera as estações do ano.</p>' : ''); },
        pergunta: 'Como abastecer o hospital?',
        opcoes: [
          { id: 'previsao', label: 'Pedido guiado pela previsão sazonal e pelo boletim de vírus respiratórios, com estoque estratégico de oxigênio e oseltamivir e troca com a rede.', custo: 60, fx: { eficiencia: 3, seguranca: 2 }, flags: { incCompras: 'previsao' }, q: 2,
            consequencia: 'Nada essencial faltou.', comentario: 'Sazonalidade previsível + estoque estratégico.' },
          { id: 'dobro', label: 'Comprar o dobro de tudo, a qualquer preço.', custo: 150, fx: { eficiencia: 1 }, flags: { incCompras: 'dobro' }, q: 1,
            consequencia: 'Sobrou máscara cara no almoxarifado.', comentario: 'Sem previsão, a compra erra para mais e custa caro.' },
          { id: 'esperar', label: 'Comprar quando acabar.', fx: { eficiencia: -4, seguranca: -3 }, flags: { incCompras: 'esperar' }, q: 0,
            consequencia: 'O oseltamivir acabou no pico.', comentario: 'Compra reativa chega tarde.' }
        ],
        conceitos: ['sazonalidade', 'estoque_seguranca'], conceito: 'Doenças respiratórias têm sazonalidade previsível: estoque estratégico evita falta no pico.', ra: ['RA5'] },
      { id: 'I3', setor: 'diretoria', rel: 1, titulo: 'Leitos, isolamento e equipe',
        contexto: function () { return '<p>Pacientes com influenza dividem a sala com cardiopatas e idosos. Seis profissionais estão afastados com gripe.</p>'; },
        pergunta: 'O que a gestão faz?',
        opcoes: [
          { id: 'coorte', label: 'Separar uma área para pacientes respiratórios, abrir leitos de retaguarda, máscara na triagem e vacinação da equipe.', custo: 50, fx: { seguranca: 3, eficiencia: 3, confianca: 2 }, flags: { incGestao: 'coorte' }, q: 2,
            consequencia: 'Menos transmissão dentro do hospital.', comentario: 'Coorte, retaguarda e proteção da equipe.' },
          { id: 'transferir', label: 'Transferir todos os pacientes respiratórios para outros hospitais.', fx: { seguranca: -3, conformidade: -2 }, flags: { incGestao: 'transferir' }, q: 0,
            consequencia: 'Os outros hospitais também estavam cheios.', comentario: 'Transferir sem regulação só desloca o problema — e o risco.' },
          { id: 'visitas', label: 'Suspender visitas e eletivas.', fx: { eficiencia: 1 }, flags: { incGestao: 'visitas' }, q: 1,
            consequencia: 'Ajudou um pouco; a transmissão interna continuou.', comentario: 'Medida parcial: falta separar os pacientes.' }
        ],
        conceitos: ['continuidade'], conceito: 'Surtos respiratórios exigem separar pacientes, proteger a equipe e ampliar leitos.' },
      { id: 'I4', setor: 'ti', rel: 2, titulo: 'Um painel para o surto respiratório',
        contexto: function () { return '<p>A vigilância cobra a notificação dos casos de SRAG internados. A diretoria quer saber, todo dia, quantos leitos e quanto oxigênio restam.</p>'; },
        pergunta: 'O que a TI faz? (decisão simples)',
        opcoes: [
          { id: 'painel', label: 'Um painel diário com casos de SRAG, leitos de isolamento livres e consumo de oxigênio, e a lista de notificações pendentes.', custo: 15, fx: { dados: 3, eficiencia: 2 }, flags: { incTI: 'painel' }, q: 2,
            consequencia: 'Nenhuma notificação atrasou e o oxigênio foi reposto a tempo.', comentario: 'Poucos números que levam à ação.' },
          { id: 'planilha', label: 'Uma planilha compartilhada.', fx: { dados: -1 }, flags: { incTI: 'planilha' }, q: 1,
            consequencia: 'A planilha atrasou dois dias.', comentario: 'Sem atualização automática, perde valor.' },
          { id: 'nada', label: 'Nada novo.', fx: { dados: -2, conformidade: -1 }, flags: { incTI: 'nada' }, q: 0,
            consequencia: 'As notificações atrasaram.', comentario: 'Notificar SRAG é obrigatório.' }
        ],
        conceitos: ['dashboard'], conceito: 'No incidente, o painel certo mostra capacidade e insumos críticos.' },
      { id: 'I5', setor: 'bloco', rel: 2, portes: RA, titulo: 'Cirurgias no surto respiratório',
        contexto: function () { return '<p>Leitos de UTI pós-operatória estão ocupados por pacientes com SRAG.</p>'; },
        pergunta: 'Como reorganizar o bloco?',
        opcoes: [
          { id: 'reprogramar', label: 'Adiar as eletivas que precisam de UTI no pós-operatório e manter as demais, reprogramando com a previsão do bloco.', fx: { eficiencia: 3, seguranca: 1 }, flags: { incBloco: 'reprogramar' }, q: 2,
            consequencia: 'O bloco seguiu funcionando sem disputar UTI.', comentario: 'Priorizar pelo recurso escasso (UTI).' },
          { id: 'manter', label: 'Manter a agenda normal.', fx: { eficiencia: -2, seguranca: -1 }, flags: { incBloco: 'manter' }, q: 1,
            consequencia: 'Duas cirurgias foram canceladas na hora, sem vaga de UTI.', comentario: 'Ignora o gargalo.' },
          { id: 'tudo', label: 'Cancelar tudo.', fx: { seguranca: -3, confianca: -2 }, flags: { incBloco: 'tudo' }, q: 0,
            consequencia: 'Até cirurgias sem necessidade de UTI foram canceladas.', comentario: 'Exagero que cria outra fila.' }
        ],
        conceitos: ['previsao'], conceito: 'O bloco se ajusta ao recurso que falta — aqui, a UTI.' }
    ],
    casos: [
      { id: 'rs1', tipo: 'fn', nome: 'Benício', idade: 0, idadeTexto: '5 meses', sexo: 'M', manchester: 'laranja', saida: 'baixa', foraPerfil: true,
        queixa: '3º dia de bronquiolite; respiração cansada e mamando menos da metade.',
        sinais: { PA: 'não aferida', FC: 172, FR: 66, SpO2: 91, T: 37.8 },
        extra: 'Tiragem subcostal e batimento de asa de nariz.', grave: true, d: 0.5, fatores: ['SpO₂ 91%'],
        desfecho: 'Bronquiolite grave: UTI pediátrica com suporte ventilatório não invasivo.',
        licao: 'Lactente com tiragem, SpO₂ abaixo de 92% e recusa alimentar tem sinais de gravidade. Aos 5 meses, FC e FR normais são muito mais altas que as de um adulto: modelos treinados com adultos não se aplicam a bebês, e um escore baixo aqui não significa segurança.' },
      { id: 'rs2', tipo: 'fp', nome: 'Patrícia', idade: 45, sexo: 'F', manchester: 'amarelo',
        queixa: 'Gripe há 2 dias: febre, tosse e dor no corpo.',
        sinais: { PA: '118/76', FC: 106, FR: 22, SpO2: 95, T: 38.6, Glasgow: 15 },
        extra: 'Sem doenças, sem falta de ar.', grave: false, d: 0.92, fatores: ['FC 106 bpm', 'T 38,6 °C', 'SpO₂ 95%'],
        desfecho: 'Síndrome gripal sem gravidade: alta com sintomáticos e orientação sobre sinais de alerta.',
        licao: 'Sem fator de risco nem sinal de gravidade, síndrome gripal é tratada em casa. No surto, alarmes falsos se multiplicam — e cansam a equipe.' },
      { id: 'rs3', tipo: 'vp', nome: 'Seu Geraldo', idade: 67, sexo: 'M', manchester: 'vermelho',
        queixa: 'DPOC; febre e piora da falta de ar há 2 dias; hoje confuso.',
        sinais: { PA: '100/60', FC: 118, FR: 32, SpO2: 84, T: 38.7, Glasgow: 13 },
        extra: 'Saturação habitual entre 90% e 92%.', grave: true, d: 0.1, fatores: ['SpO₂ 84%', 'FR 32 irpm', 'Glasgow 13', '67 anos'],
        desfecho: 'SRAG por influenza com insuficiência respiratória: UTI e oseltamivir.',
        licao: 'Grave e típico: sala vermelha e oseltamivir sem esperar o exame. Um alerta aqui está correto.' },
      { id: 'rs4', tipo: 'fn', nome: 'Jéssica', idade: 30, sexo: 'F', manchester: 'amarelo',
        queixa: 'Gripe há 4 dias; “parece bem”, fala frases completas.',
        sinais: { PA: '128/82', FC: 104, FR: 24, SpO2: 93, T: '38.0', Glasgow: 15 },
        extra: 'Obesidade grau 3. SpO₂ medida em ar ambiente.', grave: true, d: 0.8, fatores: ['SpO₂ 93%', 'FR 24 irpm', 'FC 104 bpm'],
        desfecho: 'Pneumonia viral por influenza com piora da hipoxemia: precisou de UTI 36 horas depois.',
        licao: 'Obesidade grave é fator de risco para influenza grave, e SpO₂ de 93% em ar ambiente já define SRAG: oseltamivir imediato e internação, mesmo com aparência tranquila.' }
    ]
  });

  /* ======================================================================
     4. SISTEMAS SEQUESTRADOS
     ====================================================================== */
  historia({
    id: 'ransomware', prefixo: 'RW', nome: 'Sistemas sequestrados', curto: 'Ataque hacker', icone: 'cadeado', cor: '#9E2A22',
    alvo: 'um ataque hacker aos sistemas do hospital', semPico: true,
    semModelo: 'Ataque cibernético (ransomware): prontuário e modelo estão fora do ar. A decisão é só sua, com o protocolo impresso.',
    resumo: 'Ataque de ransomware derruba prontuário, modelo e painéis por vários dias. Os casos do incidente são decididos sem o modelo.',
    preparo: { label: 'Plano contra ataque hacker: cópias de segurança fora da rede, ensaio do atendimento em papel e contatos de polícia e ANPD à mão', detalhe: 'O que fazer se os sistemas forem sequestrados.' },
    excluir: ['energia', 'versao'],
    dias: {
      0: ['Sistemas sequestrados', 'Resposta ao incidente', 'Os computadores amanheceram travados. A urgência precisa funcionar sem sistema.'],
      1: ['Pagar ou não pagar?', 'Resposta ao incidente', 'A gestão decide como responder aos criminosos, à polícia e à ANPD.'],
      2: ['A volta segura', 'Resposta ao incidente', 'A TI planeja a volta dos sistemas; o bloco opera em papel.'],
      3: ['Tudo em papel', 'Resposta ao incidente', 'Sem modelo, a classificação de risco volta a ser só humana.'],
      4: ['Os sistemas voltam', 'Resposta ao incidente', 'Os sistemas voltam aos poucos; os papéis precisam ser digitados.'],
      5: ['Depois do ataque', 'Lições do incidente', 'O jornal faz o balanço do ataque.']
    },
    sinais: [
      { rel: -6, setor: 'ti', titulo: 'Ataque a um hospital vizinho', texto: 'Um hospital de outra cidade teve os sistemas sequestrados por criminosos que pedem resgate em criptomoeda.' },
      { rel: -3, setor: 'ti', tom: 'alerta', titulo: 'Tentativas de invasão', texto: 'A TI detectou e-mails falsos pedindo senhas e um antivírus desatualizado em 30% das máquinas do hospital.' }
    ],
    inicio: { setor: 'ti', titulo: 'Ataque hacker: sistemas sequestrados', texto: 'Os computadores do hospital amanheceram travados com um pedido de resgate. Prontuário, modelo da urgência e painéis estão fora do ar.',
      preparado: 'O plano contra ataques foi acionado: as cópias de segurança estão fora da rede e o atendimento em papel foi ensaiado.', fx: { eficiencia: -8, seguranca: -3, dados: -4 } },
    fim: {
      bom: ['O hospital resistiu ao ataque', 'Sem pagar resgate, com atendimento em papel e cópias de segurança, os sistemas voltaram em 4 dias e nenhum paciente foi prejudicado.'],
      medio: ['O ataque passou, com perdas', 'Os sistemas voltaram, mas parte dos registros se perdeu e houve atrasos no atendimento.'],
      ruim: ['O ataque deixou um rastro', 'Dados de pacientes apareceram na internet e o atendimento ficou desorganizado por uma semana.']
    },
    tarefas: [
      { id: 'I1', setor: 'urgencia', rel: 0, titulo: 'Sem sistema: como a urgência funciona?',
        contexto: function () { return '<p>Prontuário, modelo e painéis estão fora do ar. Não há histórico dos pacientes nem escore automático.</p>'; },
        caso: { titulo: 'Quando os computadores param', texto: 'Em 2017, o ataque WannaCry paralisou computadores do sistema de saúde inglês: cerca de 19 mil consultas foram canceladas e ambulâncias foram desviadas. O relatório oficial concluiu que o plano de resposta a um ataque desse tipo nunca tinha sido testado nos hospitais.', fonte: 'National Audit Office (Reino Unido), 2017' },
        pergunta: 'Como a urgência funciona enquanto o sistema está fora?',
        opcoes: [
          { id: 'protocolo', label: 'Ativar a classificação de risco em papel, com um escore de alerta precoce calculado à mão (no estilo do NEWS), reavaliação programada e registro em papel para digitar depois.', custo: 5, fx: { seguranca: 4, confianca: 3 }, flags: { incidenteClin: 'protocolo' }, q: 2,
            consequencia: 'A urgência seguiu classificando — mais devagar, mas com segurança.', comentario: 'O atendimento não pode depender de um sistema estar no ar.' },
          { id: 'chegada', label: 'Atender por ordem de chegada até o sistema voltar.', fx: { seguranca: -6, confianca: -3 }, flags: { incidenteClin: 'confiar' }, q: 0,
            consequencia: 'Um paciente infartando esperou atrás de casos leves.', comentario: 'Sem classificação de risco, o grave espera.' },
          { id: 'celular', label: 'Rodar o modelo numa versão de teste no celular de um residente, com os dados digitados lá.', fx: { conformidade: -5, seguranca: -1 }, flags: { incidenteClin: 'celular' }, q: 0,
            consequencia: 'Dados de pacientes foram parar num aparelho pessoal.', comentario: 'Gambiarra com dado sensível em aparelho pessoal fere a LGPD e não é validada.' }
        ],
        conceitos: ['continuidade', 'humano_no_circuito'], conceito: 'Plano B clínico: a classificação de risco precisa funcionar sem computador.', ra: ['RA8'] },
      { id: 'I2', setor: 'compras', rel: 0, titulo: 'Compras sem sistema',
        contexto: function () { return '<p>O sistema de estoque está travado. Ninguém sabe exatamente o que tem no almoxarifado.</p>'; },
        pergunta: 'Como manter o abastecimento?',
        opcoes: [
          { id: 'lista', label: 'Usar a lista impressa de itens críticos, contar o estoque físico e fazer pedidos por telefone, registrando tudo.', custo: 10, fx: { eficiencia: 3, seguranca: 1 }, flags: { incCompras: 'lista' }, q: 2,
            consequencia: 'Nada essencial faltou.', comentario: 'Contingência simples e registrada.' },
          { id: 'suspender', label: 'Suspender as compras até o sistema voltar.', fx: { eficiencia: -4, seguranca: -2 }, flags: { incCompras: 'suspender' }, q: 0,
            consequencia: 'Faltou contraste e antibiótico no terceiro dia.', comentario: 'Parar de comprar não é opção num hospital.' },
          { id: 'dobro', label: 'Comprar o dobro de tudo por precaução.', custo: 100, fx: { eficiencia: 1 }, flags: { incCompras: 'dobro' }, q: 1,
            consequencia: 'Sobrou material — e faltou dinheiro.', comentario: 'Sem informação, a compra erra para mais.' }
        ],
        conceitos: ['continuidade'], conceito: 'Contingência inclui o abastecimento: lista crítica impressa e contagem física.', ra: ['RA8'] },
      { id: 'I3', setor: 'diretoria', rel: 1, titulo: 'Pagar o resgate?',
        contexto: function () { return '<p>Os criminosos pedem o equivalente a R$ 2 milhões em criptomoeda e ameaçam publicar dados de pacientes.</p>'; },
        pergunta: 'O que a gestão decide?',
        opcoes: [
          { id: 'nao_pagar', label: 'Não pagar: acionar a polícia, comunicar a ANPD e os pacientes afetados no prazo legal, restaurar das cópias de segurança e contratar perícia.', custo: 40, fx: { conformidade: 4, confianca: 2 }, flags: { incGestao: 'nao_pagar' }, q: 2,
            consequencia: 'A polícia investiga; a comunicação foi feita no prazo.', comentario: 'Pagar não garante a devolução nem impede a divulgação; comunicar é obrigação legal.' },
          { id: 'pagar', label: 'Pagar o resgate para voltar logo.', custo: 300, fx: { conformidade: -4, confianca: -2 }, flags: { incGestao: 'pagar' }, q: 0,
            consequencia: 'Metade dos arquivos voltou; os dados foram publicados mesmo assim.', comentario: 'Pagar financia o crime e não garante nada.' },
          { id: 'silencio', label: 'Resolver sem avisar ninguém, para não manchar a imagem.', fx: { conformidade: -8, confianca: -3 }, flags: { incGestao: 'silencio' }, q: 0,
            consequencia: 'A imprensa descobriu antes do hospital comunicar.', comentario: 'Esconder incidente com dados pessoais agrava a responsabilidade (LGPD).' }
        ],
        conceitos: ['lgpd', 'responsabilidade'], conceito: 'Incidente de segurança com dados pessoais exige comunicação à ANPD e aos titulares; o hospital responde pelos dados.', ra: ['RA8'] },
      { id: 'I4', setor: 'ti', rel: 2, titulo: 'A volta segura dos sistemas',
        contexto: function (ctx) { return '<p>A perícia identificou a máquina por onde o ataque entrou.</p>' + (ctx.flags.prepIncidente ? '<p class="nota bom">Há cópias de segurança fora da rede, de dois dias atrás.</p>' : '<p class="nota">A última cópia de segurança estava na mesma rede — e pode estar comprometida.</p>'); },
        pergunta: 'Como religar? (decisão simples)',
        opcoes: [
          { id: 'seguro', label: 'Isolar a rede, restaurar das cópias limpas, trocar todas as senhas, atualizar o antivírus e religar por partes, testando.', custo: 30, fx: { dados: 3, eficiencia: 2, conformidade: 2 }, flags: { incTI: 'seguro' }, q: 2,
            consequencia: 'Os sistemas voltaram em etapas, sem reinfecção.', comentario: 'Volta segura: isolar, limpar, restaurar, testar.' },
          { id: 'rapido', label: 'Religar tudo de uma vez, assim que possível.', fx: { dados: -3, eficiencia: -2 }, flags: { incTI: 'rapido' }, q: 0,
            consequencia: 'O vírus voltou no dia seguinte.', comentario: 'Religar sem limpar reinfecta a rede.' },
          { id: 'zerar', label: 'Formatar tudo e começar do zero, sem restaurar nada.', fx: { dados: -4, eficiencia: -2 }, flags: { incTI: 'zerar' }, q: 1,
            consequencia: 'Seguro, mas três anos de histórico se perderam.', comentario: 'Seguro, porém perde dados que as cópias poderiam salvar.' }
        ],
        conceitos: ['continuidade'], conceito: 'Depois de um ataque, a volta precisa ser segura: isolar, restaurar de cópias limpas e testar.' },
      { id: 'I5', setor: 'bloco', rel: 2, portes: RA, titulo: 'Cirurgias sem sistema',
        contexto: function () { return '<p>A agenda cirúrgica e os prontuários estão travados.</p>'; },
        pergunta: 'O que o bloco faz?',
        opcoes: [
          { id: 'papel', label: 'Manter urgências e oncológicas com checklist de cirurgia segura em papel; reprogramar as eletivas quando o sistema voltar.', fx: { seguranca: 2, eficiencia: 2 }, flags: { incBloco: 'papel' }, q: 2,
            consequencia: 'O bloco operou o essencial com segurança.', comentario: 'Priorizar e manter a segurança cirúrgica em papel.' },
          { id: 'normal', label: 'Manter a agenda normal, de memória.', fx: { seguranca: -4 }, flags: { incBloco: 'normal' }, q: 0,
            consequencia: 'Uma cirurgia quase foi feita no lado errado.', comentario: 'Sem registro e checklist, o erro aparece.' },
          { id: 'tudo', label: 'Cancelar tudo, inclusive urgências.', fx: { seguranca: -3, confianca: -2 }, flags: { incBloco: 'tudo' }, q: 1,
            consequencia: 'Urgências foram transferidas às pressas.', comentario: 'Exagero: o essencial pode seguir em papel.' }
        ],
        conceitos: ['continuidade'], conceito: 'O checklist de cirurgia segura funciona em papel.' }
    ],
    casos: [
      { id: 'rw1', tipo: 'vp', nome: 'Seu Edvaldo', idade: 58, sexo: 'M', manchester: 'laranja',
        queixa: 'Dor no peito em aperto há 40 minutos, com suor frio.',
        sinais: { PA: '150/95', FC: 102, FR: 20, SpO2: 96, T: 36.5, Glasgow: 15 },
        extra: 'ECG em papel: supradesnivelamento do segmento ST na parede inferior.', grave: true, d: 0.3, fatores: [],
        desfecho: 'Infarto com supra de ST: angioplastia primária e UTI coronariana, com tudo registrado em papel.',
        licao: 'Sem sistema, a clínica e o ECG decidem. Tempo é músculo.' },
      { id: 'rw2', tipo: 'vn', nome: 'Larissa', idade: 22, sexo: 'F', manchester: 'verde',
        queixa: 'Palpitação depois de tomar energético e café para estudar.',
        sinais: { PA: '126/80', FC: 112, FR: 18, SpO2: 99, T: 36.7, Glasgow: 15 },
        extra: 'ECG: taquicardia sinusal.', grave: false, d: 0.5, fatores: [],
        desfecho: 'Alta com orientação após 2 horas.',
        licao: 'Taquicardia sinusal com causa clara, paciente estável: fluxo comum.' },
      { id: 'rw3', tipo: 'vp', nome: 'Seu Lourival', idade: 84, sexo: 'M', manchester: 'laranja',
        queixa: 'Febre, tosse e confusão desde a manhã.',
        sinais: { PA: '92/58', FC: 116, FR: 26, SpO2: 93, T: 38.6, Glasgow: 13 },
        extra: 'Sem prontuário para ver o histórico; a filha não sabe dizer os remédios que ele usa.', grave: true, d: 0.2, fatores: [],
        desfecho: 'Sepse de foco pulmonar: foi para a UTI.',
        licao: 'Com pressão baixa, respiração rápida e confusão, um escore simples feito à mão, no estilo do NEWS, já aponta alto risco: é ele que faz o papel do modelo quando o sistema cai.' },
      { id: 'rw4', tipo: 'vn', nome: 'Wesley', idade: 30, sexo: 'M', manchester: 'verde',
        queixa: 'Torceu o tornozelo jogando futebol.',
        sinais: { PA: '128/78', FC: 84, FR: 16, SpO2: 99, T: 36.5, Glasgow: 15 },
        extra: 'Dor e inchaço; consegue pisar com dificuldade.', grave: false, d: 0.2, fatores: [],
        desfecho: 'Radiografia sem fratura: alta com imobilização.',
        licao: 'Caso simples: não ocupar a sala vermelha num dia em que ela vale ouro.' }
    ]
  });

  /* ======================================================================
     5. SUPERBACTÉRIA NA UTI
     ====================================================================== */
  historia({
    id: 'kpc', prefixo: 'KP', nome: 'Superbactéria na UTI', curto: 'Surto de KPC', icone: 'microscopio', cor: '#6B4FA0',
    alvo: 'um surto de bactéria multirresistente (KPC) na UTI', insumo: 'antibióticos de reserva e material de isolamento',
    resumo: 'Surto de Klebsiella pneumoniae produtora de carbapenemase do tipo KPC na UTI. Leitos bloqueados; o modelo não sabe quem é colonizado nem vê lactato.',
    preparo: { label: 'Plano de prevenção de infecção: higiene das mãos auditada, rastreio de colonização na admissão e leitos de isolamento definidos', detalhe: 'O que fazer se surgir uma bactéria multirresistente.' },
    excluir: ['luvas'],
    dias: {
      0: ['Superbactéria na UTI', 'Resposta ao incidente', 'Surto de KPC: leitos de UTI bloqueados. O corpo clínico decide como usar o alerta com menos vagas.'],
      1: ['Controle do surto', 'Resposta ao incidente', 'A gestão e a CCIH organizam o controle do surto.'],
      2: ['Rastreando contatos', 'Resposta ao incidente', 'Painel do surto e bloco cirúrgico se ajustam.'],
      3: ['Menos vagas de UTI', 'Resposta ao incidente', 'Cada vaga de UTI conta; o alerta e a clínica precisam conversar.'],
      4: ['O surto perde força', 'Resposta ao incidente', 'Os novos casos diminuem.'],
      5: ['Depois do surto', 'Lições do incidente', 'O jornal faz o balanço do surto de KPC.']
    },
    sinais: [
      { rel: -6, setor: 'especialidades', titulo: 'Culturas preocupantes', texto: 'O laboratório isolou Klebsiella resistente a carbapenêmicos em duas culturas da UTI na mesma semana.' },
      { rel: -3, setor: 'diretoria', tom: 'alerta', titulo: 'Higiene das mãos em queda', texto: 'A comissão de controle de infecção (CCIH) mediu adesão de 52% à higiene das mãos na UTI. Um terceiro paciente teve cultura positiva.' }
    ],
    inicio: { setor: 'urgencia', titulo: 'Surto de bactéria multirresistente na UTI', texto: 'Seis pacientes da UTI estão colonizados ou infectados por Klebsiella produtora de KPC. Leitos foram bloqueados para isolamento e a urgência tem menos vagas de UTI.',
      preparado: 'O plano de prevenção foi acionado: rastreio na admissão e isolamento já definidos.', fx: { seguranca: -5, eficiencia: -4 } },
    fim: {
      bom: ['O surto foi controlado', 'Com higiene das mãos, coorte e rastreio, não houve novos casos em 10 dias. O alerta seguiu ajudando a reconhecer sepse cedo.'],
      medio: ['O surto diminuiu', 'Os novos casos caíram, mas a UTI ficou com leitos bloqueados por mais tempo que o necessário.'],
      ruim: ['O surto se espalhou', 'A bactéria chegou à enfermaria e dois pacientes morreram de infecção. A vigilância abriu investigação.']
    },
    tarefas: [
      { id: 'I1', setor: 'urgencia', rel: 0, titulo: 'Com menos UTI, como usar o alerta?',
        contexto: function (ctx) {
          var m = G.MODELS[ctx.flags.modelo];
          return '<p>Há menos vagas de UTI. O <b>' + (m ? G.esc(m.nome) : 'modelo') + '</b> não sabe quem é colonizado por bactéria produtora de KPC, quem esteve internado há pouco nem vê o lactato.</p>';
        },
        caso: { titulo: 'Superbactérias no Brasil', texto: 'Enterobactérias resistentes aos carbapenêmicos, como a Klebsiella produtora de KPC, são um dos maiores desafios das UTIs brasileiras. A Anvisa recomenda precaução de contato, higiene das mãos, rastreio de colonização e uso racional de antimicrobianos.', fonte: 'Anvisa, medidas de prevenção e controle de infecções por enterobactérias multirresistentes' },
        pergunta: 'Como o corpo clínico usa o alerta durante o surto?',
        opcoes: [
          { id: 'protocolo', label: 'Manter o alerta e acrescentar a triagem de risco de colonização (internação recente, instituição de longa permanência, antibiótico recente), com precaução de contato e rastreio; a vaga de UTI é decidida pela avaliação clínica.', custo: 10, fx: { seguranca: 4, confianca: 3 }, flags: { incidenteClin: 'protocolo' }, q: 2,
            consequencia: 'Pacientes de risco chegam já em precaução de contato; a UTI é decidida pela clínica.', comentario: 'O modelo segue como apoio; a decisão de vaga e o controle de infecção são clínicos.' },
          { id: 'limiar', label: 'Subir o limiar para o modelo alertar menos, já que não há vaga.', fx: { eficiencia: 1, seguranca: -4 }, flags: { incidenteClin: 'limiar_alto' }, q: 0,
            consequencia: 'Menos alertas — e pacientes graves reconhecidos tarde.', comentario: 'Falta de vaga não muda o risco do paciente: subir o limiar só esconde o problema.' },
          { id: 'confiar', label: 'Usar o escore do modelo para decidir quem fica com a vaga de UTI.', fx: { seguranca: -3, conformidade: -4 }, flags: { incidenteClin: 'confiar' }, q: 0,
            consequencia: 'Um paciente atípico perdeu a vaga para outro com escore maior.', comentario: 'Alocar UTI por escore automático tira o médico da decisão e herda os erros do modelo.' },
          { id: 'desligar', label: 'Desligar o modelo até o surto passar.', fx: { seguranca: -1, confianca: -1 }, flags: { incidenteClin: 'desligar' }, q: 1,
            consequencia: 'O alerta saiu do ar.', comentario: 'O surto não tornou o modelo inútil para reconhecer sepse.' }
        ],
        conceitos: ['humano_no_circuito', 'vies_automacao'], conceito: 'Escassez não justifica automatizar decisões de alocação; o modelo apoia, a equipe decide.', ra: ['RA8'] },
      { id: 'I2', setor: 'compras', rel: 0, titulo: 'Antibióticos de reserva',
        contexto: function () { return '<p>O tratamento das infecções por bactérias produtoras de KPC usa antibióticos de reserva, caros e com estoque baixo. A pressão para usá-los em todo caso suspeito é grande.</p>'; },
        pergunta: 'Como abastecer e controlar?',
        opcoes: [
          { id: 'stewardship', label: 'Antibiótico de reserva só com aprovação da CCIH e da infectologia, estoque calculado pelo surto e protocolo com o laboratório.', custo: 50, fx: { seguranca: 3, eficiencia: 2 }, flags: { incCompras: 'stewardship' }, q: 2,
            consequencia: 'Não faltou antibiótico e o uso foi racional.', comentario: 'Gestão de antimicrobianos evita falta e mais resistência.' },
          { id: 'liberar', label: 'Comprar muito e liberar para todo caso suspeito.', custo: 150, fx: { seguranca: -2, eficiencia: -1 }, flags: { incCompras: 'liberar' }, q: 0,
            consequencia: 'O uso explodiu — e a resistência também.', comentario: 'Uso indiscriminado seleciona bactérias ainda mais resistentes.' },
          { id: 'esperar', label: 'Pedir só quando chegar o antibiograma de cada paciente.', fx: { seguranca: -2 }, flags: { incCompras: 'esperar' }, q: 1,
            consequencia: 'Dois pacientes esperaram o antibiótico chegar.', comentario: 'Racional, mas sem estoque mínimo atrasa o tratamento.' }
        ],
        conceitos: ['estoque_seguranca'], conceito: 'Antimicrobianos de reserva pedem estoque calculado e uso controlado.', ra: ['RA8'] },
      { id: 'I3', setor: 'diretoria', rel: 1, titulo: 'Controle do surto',
        contexto: function () { return '<p>A CCIH apresentou um plano. A diretoria precisa decidir o investimento e a comunicação.</p>'; },
        pergunta: 'O que a gestão faz?',
        opcoes: [
          { id: 'plano', label: 'Aprovar o plano da CCIH: higiene das mãos auditada, coorte de pacientes e de equipe, rastreio de contatos, limpeza terminal e notificação à vigilância.', custo: 40, fx: { seguranca: 4, conformidade: 2 }, flags: { incGestao: 'plano' }, q: 2,
            consequencia: 'As medidas começaram no mesmo dia.', comentario: 'Pacote de medidas com auditoria: o que controla surtos.' },
          { id: 'fechar', label: 'Fechar a UTI por 30 dias.', fx: { eficiencia: -5, seguranca: -1 }, flags: { incGestao: 'fechar' }, q: 1,
            consequencia: 'A região perdeu 10 leitos de UTI por um mês.', comentario: 'Pode ser necessário em último caso; antes, há medidas eficazes.' },
          { id: 'silencio', label: 'Não divulgar, para não assustar.', fx: { conformidade: -5, confianca: -2 }, flags: { incGestao: 'silencio' }, q: 0,
            consequencia: 'Pacientes transferidos levaram a bactéria para outro hospital.', comentario: 'Notificar e avisar a rede é essencial.' }
        ],
        conceitos: ['governanca'], conceito: 'Controle de surto hospitalar é pacote de medidas, auditoria e notificação.' },
      { id: 'I4', setor: 'ti', rel: 2, titulo: 'Um painel para o surto',
        contexto: function () { return '<p>A CCIH conta os casos numa planilha. Quando um paciente colonizado volta ao hospital, ninguém é avisado.</p>'; },
        pergunta: 'O que a TI faz? (decisão simples)',
        opcoes: [
          { id: 'painel', label: 'Um painel diário (casos por leito e data, adesão à higiene das mãos, rastreios) e um aviso no prontuário quando um paciente colonizado for atendido de novo.', custo: 20, fx: { dados: 3, seguranca: 2 }, flags: { incTI: 'painel' }, q: 2,
            consequencia: 'Pacientes colonizados passaram a ser reconhecidos na chegada.', comentario: 'Painel simples e aviso no prontuário viram ação.' },
          { id: 'planilha', label: 'Manter a planilha da CCIH.', fx: { dados: -1 }, flags: { incTI: 'planilha' }, q: 1,
            consequencia: 'A informação seguiu presa numa planilha.', comentario: 'Melhor que nada, mas não chega a quem atende.' },
          { id: 'nada', label: 'Nada novo.', fx: { dados: -2 }, flags: { incTI: 'nada' }, q: 0,
            consequencia: 'Um colonizado voltou e ficou em quarto coletivo.', comentario: 'Sem aviso, o surto se espalha.' }
        ],
        conceitos: ['dashboard'], conceito: 'Dado que chega a quem atende, na hora certa, é controle de infecção.' },
      { id: 'I5', setor: 'bloco', rel: 2, portes: RA, titulo: 'Cirurgias com a UTI bloqueada',
        contexto: function () { return '<p>Com leitos de UTI bloqueados, cirurgias que precisam de UTI no pós-operatório estão em risco.</p>'; },
        pergunta: 'Como reorganizar o bloco?',
        opcoes: [
          { id: 'reprogramar', label: 'Adiar as eletivas que precisam de UTI e manter as demais, reprogramando com a previsão do bloco.', fx: { eficiencia: 3, seguranca: 1 }, flags: { incBloco: 'reprogramar' }, q: 2,
            consequencia: 'O bloco seguiu sem disputar UTI.', comentario: 'Priorizar pelo recurso escasso.' },
          { id: 'manter', label: 'Manter tudo.', fx: { seguranca: -2 }, flags: { incBloco: 'manter' }, q: 0,
            consequencia: 'Pacientes operados ficaram sem UTI no pós-operatório.', comentario: 'Ignora o gargalo.' },
          { id: 'tudo', label: 'Cancelar tudo.', fx: { eficiencia: -3, confianca: -1 }, flags: { incBloco: 'tudo' }, q: 1,
            consequencia: 'Até cirurgias simples foram canceladas.', comentario: 'Exagero.' }
        ],
        conceitos: ['previsao'], conceito: 'O bloco se ajusta ao recurso que falta.' }
    ],
    casos: [
      { id: 'kp1', tipo: 'vp', nome: 'Dona Inês', idade: 82, sexo: 'F', manchester: 'laranja',
        queixa: 'Vem de instituição de longa permanência: febre e confusão desde ontem.',
        sinais: { PA: '96/58', FC: 116, FR: 24, SpO2: 94, T: 38.9, Glasgow: 13 },
        extra: 'Sonda vesical. Colonizada por Klebsiella pneumoniae produtora de KPC numa internação anterior.', grave: true, d: 0.15, fatores: ['Glasgow 13', 'PA 96/58', 'FC 116 bpm', '82 anos'],
        desfecho: 'Sepse urinária por Klebsiella produtora de KPC: precaução de contato desde a chegada, antibiótico empírico conforme o protocolo da CCIH e UTI.',
        licao: 'Grave e típica: sala vermelha, e um alerta aqui está correto. O que o modelo não diz: ela é colonizada por Klebsiella produtora de KPC — precaução de contato desde a chegada e antibiótico empírico que cubra esse perfil, conforme a CCIH.' },
      { id: 'kp2', tipo: 'fp', nome: 'Seu Cícero', idade: 50, sexo: 'M', manchester: 'amarelo',
        queixa: 'Febre e ardência para urinar há 2 dias.',
        sinais: { PA: '128/80', FC: 104, FR: 22, SpO2: 98, T: 38.3, Glasgow: 15 },
        extra: 'Sem internações recentes.', grave: false, d: 0.9, fatores: ['FC 104 bpm', 'T 38,3 °C'],
        desfecho: 'Infecção urinária febril (provável prostatite): urocultura, antibiótico oral e alta com retorno.',
        licao: 'Estável e sem fator de risco para bactéria multirresistente: não é caso de sala vermelha.' },
      { id: 'kp3', tipo: 'fn', nome: 'Seu Osvaldo', idade: 68, sexo: 'M', manchester: 'verde',
        queixa: 'Febre desde ontem; “parece bem”. Teve alta da UTI há 10 dias.',
        sinais: { PA: '108/70', FC: 98, FR: 20, SpO2: 95, T: 38.1, Glasgow: 15 },
        extra: 'Lactato 4,1 mmol/L. Esteve na UTI durante o surto.', grave: true, d: 0.94, fatores: ['T 38,1 °C'],
        desfecho: 'Bacteremia por Klebsiella produtora de KPC, com choque séptico 8 horas depois: UTI.',
        licao: 'Internação recente em UTI com surto + febre = alto risco, mesmo com sinais vitais aceitáveis. O lactato, que o modelo em uso não recebe na triagem, já mostrava hipoperfusão.' },
      { id: 'kp4', tipo: 'vn', nome: 'Rosângela', idade: 40, sexo: 'F', manchester: 'verde',
        queixa: 'Vermelhidão e dor na perna há 2 dias, com febre baixa.',
        sinais: { PA: '122/78', FC: 96, FR: 18, SpO2: 98, T: 37.9, Glasgow: 15 },
        extra: 'Celulite sem bolhas nem necrose.', grave: false, d: 0.4, fatores: ['T 37,9 °C'],
        desfecho: 'Celulite sem sinais de gravidade: antibiótico oral e retorno.',
        licao: 'Infecção de pele sem sinais de gravidade: fluxo comum.' }
    ]
  });

  /* ======================================================================
     6. ACIDENTE NA BR-232
     ====================================================================== */
  historia({
    id: 'acidente', prefixo: 'BR', nome: 'Acidente na BR-232', curto: 'Múltiplas vítimas', icone: 'onibus', cor: '#C2557A',
    alvo: 'um acidente com múltiplas vítimas na rodovia', insumo: 'sangue, soro e material de trauma',
    resumo: 'Um ônibus tomba na rodovia: 38 vítimas. O modelo da urgência foi treinado com pacientes clínicos — no trauma, vale a triagem START e o exame físico.',
    preparo: { label: 'Plano para múltiplas vítimas: simulado com o SAMU, triagem START, estoque de sangue e equipe de sobreaviso', detalhe: 'O que fazer se chegarem muitas vítimas de uma vez.' },
    excluir: ['plantonistas'],
    dias: {
      0: ['Acidente com múltiplas vítimas', 'Resposta ao incidente', 'Um ônibus tombou na rodovia. O corpo clínico decide o papel do modelo no trauma.'],
      1: ['Comando do incidente', 'Resposta ao incidente', 'A gestão coordena equipes, leitos e comunicação com as famílias.'],
      2: ['Onde está cada vítima?', 'Resposta ao incidente', 'Rastreamento das vítimas e centro cirúrgico no limite.'],
      3: ['As vítimas na enfermaria', 'Resposta ao incidente', 'Lesões que não apareciam no primeiro dia começam a se manifestar.'],
      4: ['O hospital volta ao ritmo', 'Resposta ao incidente', 'As vítimas estão estáveis; o hospital retoma a rotina.'],
      5: ['Depois do acidente', 'Lições do incidente', 'O jornal faz o balanço do acidente.']
    },
    sinais: [
      { rel: -6, setor: 'diretoria', titulo: 'Feriado prolongado', texto: 'A Polícia Rodoviária Federal prevê movimento recorde na rodovia no feriado prolongado.' },
      { rel: -3, setor: 'compras', tom: 'alerta', titulo: 'Sangue em baixa', texto: 'O inventário do banco de sangue mostrou estoque baixo de concentrado de hemácias O negativo. O último simulado de múltiplas vítimas foi há três anos.' }
    ],
    inicio: { setor: 'urgencia', titulo: 'Ônibus tomba na rodovia: 38 vítimas', texto: 'Um ônibus tombou na rodovia. O SAMU acionou o plano de múltiplas vítimas: 38 pessoas estão a caminho do hospital.',
      preparado: 'O plano para múltiplas vítimas foi acionado: equipe de sobreaviso chamada e sangue reservado.', fx: { eficiencia: -6, seguranca: -4 } },
    fim: {
      bom: ['O hospital respondeu à altura', 'Com comando do incidente, triagem START e sangue disponível, todas as vítimas que chegaram com vida sobreviveram.'],
      medio: ['O acidente foi atendido, com tropeços', 'As vítimas foram atendidas, mas a desorganização das primeiras horas atrasou cirurgias.'],
      ruim: ['O caos das primeiras horas', 'Sem comando nem triagem adequada, vítimas graves esperaram atrás de leves e famílias ficaram sem notícia por horas.']
    },
    tarefas: [
      { id: 'I1', setor: 'urgencia', rel: 0, titulo: 'Múltiplas vítimas: e o modelo da triagem?',
        contexto: function (ctx) {
          var m = G.MODELS[ctx.flags.modelo];
          return '<p>O <b>' + (m ? G.esc(m.nome) : 'modelo') + '</b> foi treinado com pacientes clínicos. Não conhece mecanismo de trauma, sinal do cinto de segurança nem uso de anticoagulante.</p>' +
            '<p>Em múltiplas vítimas, a triagem padrão é a <b>START</b> (anda? respira? perfusão? obedece a comandos?).</p>';
        },
        caso: { titulo: 'Triagem em desastres', texto: 'O método START (Simple Triage and Rapid Treatment) classifica vítimas em segundos por cores, usando marcha, respiração, perfusão e nível de consciência. É usado pelo SAMU e pelo Corpo de Bombeiros em acidentes com múltiplas vítimas no Brasil.', fonte: 'Protocolos de atendimento a múltiplas vítimas (SAMU 192)' },
        pergunta: 'Qual é o papel do modelo hoje?',
        opcoes: [
          { id: 'protocolo', label: 'Ativar o plano de múltiplas vítimas com a triagem START e o atendimento ao trauma; o modelo fica de fora para as vítimas (não foi treinado para trauma) e segue só para os pacientes clínicos.', custo: 10, fx: { seguranca: 4, confianca: 3 }, flags: { incidenteClin: 'protocolo' }, q: 2,
            consequencia: 'Vítimas triadas pela START; o alerta segue para os demais pacientes.', comentario: 'Modelo fora do seu cenário de treino não deve decidir; o protocolo de trauma assume.' },
          { id: 'confiar', label: 'Passar todas as vítimas pelo modelo para ordenar o atendimento.', fx: { seguranca: -6, confianca: -2 }, flags: { incidenteClin: 'confiar' }, q: 0,
            consequencia: 'Vítimas com lesões internas e sinais vitais ainda normais ficaram para depois.', comentario: 'Usar o modelo fora do cenário de treino é aplicar a ferramenta errada.' },
          { id: 'limiar', label: 'Baixar o limiar para pegar todas as vítimas graves.', fx: { eficiencia: -3, seguranca: -1 }, flags: { incidenteClin: 'limiar' }, q: 0,
            consequencia: 'Alertas para quase todos — e ainda assim silêncio para as lesões ocultas.', comentario: 'Mudar o limiar não ensina trauma ao modelo.' },
          { id: 'desligar', label: 'Desligar o modelo para todos os pacientes por 24 horas.', fx: { seguranca: 1 }, flags: { incidenteClin: 'desligar' }, q: 1,
            consequencia: 'O alerta saiu do ar por um dia.', comentario: 'Seguro, mas os pacientes clínicos continuam chegando.' }
        ],
        conceitos: ['validacao_externa', 'vies_automacao'], conceito: 'Um modelo só vale para o tipo de paciente em que foi treinado e validado.', ra: ['RA7', 'RA8'] },
      { id: 'I2', setor: 'compras', rel: 0, titulo: 'Sangue, soro e material de trauma',
        contexto: function () { return '<p>O banco de sangue tem estoque para 6 transfusões maciças. Kits de drenagem torácica e talas estão no fim.</p>'; },
        pergunta: 'Como abastecer?',
        opcoes: [
          { id: 'rede', label: 'Acionar o hemocentro estadual e a rede de hospitais para sangue e kits de trauma, usar o estoque de segurança e registrar o consumo.', custo: 40, fx: { seguranca: 3, eficiencia: 2 }, flags: { incCompras: 'rede' }, q: 2,
            consequencia: 'Não faltou sangue nem material.', comentario: 'Rede e estoque de segurança são o plano para picos.' },
          { id: 'depois', label: 'Usar o que tem e ver depois.', fx: { seguranca: -4 }, flags: { incCompras: 'depois' }, q: 0,
            consequencia: 'O sangue O negativo acabou na terceira hora.', comentario: 'Em múltiplas vítimas, insumo não reposto custa vidas.' },
          { id: 'dobro', label: 'Comprar o dobro de tudo de urgência.', custo: 120, fx: { eficiencia: 1 }, flags: { incCompras: 'dobro' }, q: 1,
            consequencia: 'O material chegou dois dias depois.', comentario: 'Compra emergencial não substitui a rede no momento crítico.' }
        ],
        conceitos: ['estoque_seguranca'], conceito: 'Picos súbitos se enfrentam com estoque de segurança e rede.', ra: ['RA8'] },
      { id: 'I3', setor: 'diretoria', rel: 1, titulo: 'Comando do incidente',
        contexto: function () { return '<p>Famílias lotam a recepção; a imprensa está na porta; equipes de folga ligam perguntando se devem vir.</p>'; },
        pergunta: 'O que a gestão faz?',
        opcoes: [
          { id: 'comando', label: 'Montar o comando do incidente: chamar o sobreaviso, liberar leitos com altas seguras, priorizar o centro cirúrgico e ter um porta-voz único para famílias e imprensa.', custo: 30, fx: { seguranca: 3, eficiencia: 3, confianca: 2 }, flags: { incGestao: 'comando' }, q: 2,
            consequencia: 'Cada um sabia o seu papel; as famílias recebiam notícias a cada hora.', comentario: 'Comando único, capacidade e comunicação.' },
          { id: 'cada', label: 'Cada setor se organiza como puder.', fx: { eficiencia: -4, seguranca: -2 }, flags: { incGestao: 'cada' }, q: 0,
            consequencia: 'Duas equipes atenderam a mesma vítima e outra ficou sem ninguém.', comentario: 'Sem comando, o esforço se perde.' },
          { id: 'recusar', label: 'Recusar vítimas além da capacidade, sem falar com a regulação.', fx: { seguranca: -4, conformidade: -3 }, flags: { incGestao: 'recusar' }, q: 0,
            consequencia: 'Ambulâncias rodaram de hospital em hospital.', comentario: 'Capacidade se ajusta com a regulação, não na porta.' }
        ],
        conceitos: ['continuidade'], conceito: 'Desastres pedem comando do incidente, capacidade ampliada e comunicação única.' },
      { id: 'I4', setor: 'ti', rel: 2, titulo: 'Onde está cada vítima?',
        contexto: function () { return '<p>As famílias perguntam onde estão seus parentes. Muitas vítimas chegaram sem documento.</p>'; },
        pergunta: 'O que a TI faz? (decisão simples)',
        opcoes: [
          { id: 'pulseira', label: 'Pulseiras com código para cada vítima e um painel simples de localização (setor e situação) para a equipe e a central de famílias, sem expor dados de saúde.', custo: 15, fx: { eficiencia: 3, confianca: 2, conformidade: 1 }, flags: { incTI: 'pulseira' }, q: 2,
            consequencia: 'Nenhuma vítima se perdeu dentro do hospital.', comentario: 'Identificação única e informação mínima necessária.' },
          { id: 'papel', label: 'Uma lista em papel na recepção.', fx: { eficiencia: -1 }, flags: { incTI: 'papel' }, q: 1,
            consequencia: 'A lista ficou desatualizada em duas horas.', comentario: 'Melhor que nada, mas não acompanha as transferências internas.' },
          { id: 'redes', label: 'Publicar a lista de nomes e o estado de cada vítima nas redes sociais do hospital.', fx: { conformidade: -6, confianca: -2 }, flags: { incTI: 'redes' }, q: 0,
            consequencia: 'Diagnósticos de vítimas circularam na internet.', comentario: 'Expor dados de saúde fere a LGPD e a privacidade das vítimas.' }
        ],
        conceitos: ['lgpd'], conceito: 'Mesmo na emergência, só a informação necessária, para quem precisa.' },
      { id: 'I5', setor: 'bloco', rel: 2, portes: RA, titulo: 'O centro cirúrgico no acidente',
        contexto: function () { return '<p>Seis vítimas precisam de cirurgia nas próximas horas. Há 12 eletivas marcadas para hoje.</p>'; },
        pergunta: 'Como organizar o bloco?',
        opcoes: [
          { id: 'priorizar', label: 'Suspender as eletivas do dia, priorizar as vítimas por gravidade com a equipe de trauma e usar a previsão do bloco para reprogramar a semana.', fx: { seguranca: 3, eficiencia: 2 }, flags: { incBloco: 'priorizar' }, q: 2,
            consequencia: 'Todas as vítimas foram operadas a tempo.', comentario: 'Prioridade clínica e reprogramação planejada.' },
          { id: 'encaixar', label: 'Manter as eletivas e encaixar as vítimas.', fx: { seguranca: -4 }, flags: { incBloco: 'encaixar' }, q: 0,
            consequencia: 'Uma vítima com hemorragia esperou uma sala.', comentario: 'Em múltiplas vítimas, a eletiva espera.' },
          { id: 'chegada', label: 'Operar por ordem de chegada.', fx: { seguranca: -3 }, flags: { incBloco: 'chegada' }, q: 0,
            consequencia: 'Casos menos graves foram operados primeiro.', comentario: 'A ordem é a da gravidade, não a da chegada.' }
        ],
        conceitos: ['previsao'], conceito: 'No desastre, o bloco prioriza por gravidade e reprograma depois.' }
    ],
    casos: [
      { id: 'br1', tipo: 'vp', nome: 'Anderson', idade: 30, sexo: 'M', manchester: 'vermelho',
        queixa: 'Vítima do ônibus: dor no peito ao respirar, falta de ar.',
        sinais: { PA: '110/70', FC: 118, FR: 32, SpO2: 89, T: 36.4, Glasgow: 15 },
        extra: 'Murmúrio vesicular abolido à direita, desvio de traqueia e turgência jugular. START: vermelho.', grave: true, d: 0.15, fatores: ['SpO₂ 89%', 'FR 32 irpm', 'FC 118 bpm'],
        desfecho: 'Pneumotórax hipertensivo: descompressão imediata, drenagem torácica e UTI.',
        licao: 'Um alerta aqui acerta pelos sinais vitais, mas no trauma valem o ATLS e o START: os modelos foram treinados com pacientes clínicos.' },
      { id: 'br2', tipo: 'fp', nome: 'Simone', idade: 45, sexo: 'F', manchester: 'verde',
        queixa: 'Vítima do ônibus: chegou andando, com arranhões nos braços, muito assustada.',
        sinais: { PA: '140/90', FC: 116, FR: 24, SpO2: 98, T: 36.6, Glasgow: 15 },
        extra: 'START: verde. Sem dor abdominal ou torácica.', grave: false, d: 0.92, fatores: ['FC 116 bpm', 'FR 24 irpm'],
        desfecho: 'Escoriações: curativo e alta.',
        licao: 'Ansiedade e dor aceleram o coração. Andando e sem outras queixas, START verde — com reavaliação seriada, porque no trauma o quadro pode mudar. A sala vermelha é para outras vítimas.' },
      { id: 'br3', tipo: 'fn', nome: 'Kauã', idade: 19, sexo: 'M', manchester: 'amarelo',
        queixa: 'Vítima do ônibus: dor na barriga; estava de cinto de segurança.',
        sinais: { PA: '118/78', FC: 104, FR: 20, SpO2: 98, T: 36.5, Glasgow: 15 },
        extra: 'Equimose em faixa no abdome (“sinal do cinto”).', grave: true, d: 0.95, fatores: ['FC 104 bpm'],
        desfecho: 'Lesão de intestino delgado e mesentério: laparotomia de urgência e UTI no pós-operatório.',
        licao: 'O sinal do cinto indica risco de lesão de víscera oca, que no início não altera os sinais vitais. Mecanismo do trauma e exame físico decidem.' },
      { id: 'br4', tipo: 'fn', nome: 'Seu Arlindo', idade: 72, sexo: 'M', manchester: 'amarelo',
        queixa: 'Vítima do ônibus: bateu a cabeça e quebrou o punho; está lúcido.',
        sinais: { PA: '150/88', FC: 84, FR: 18, SpO2: 97, T: 36.5, Glasgow: 15 },
        extra: 'Usa anticoagulante (rivaroxabana). Dor de cabeça leve.', grave: true, d: 0.96, fatores: ['72 anos', 'PA 150/88'],
        desfecho: 'Hematoma subdural agudo na tomografia: neurocirurgia e UTI.',
        licao: 'Idoso anticoagulado com trauma de crânio precisa de tomografia, mesmo com Glasgow 15. O modelo não sabe do anticoagulante nem do mecanismo do trauma.' }
    ]
  });
})(window.GAME);
