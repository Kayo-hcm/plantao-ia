/* ==========================================================================
   PLANTÃO IA — Bloco cirúrgico, Transplantes e Farmácia
   (no porte regional, Operações cuida do bloco e da farmácia; no porte alta,
   Cirurgia cuida do bloco e do transplante e a Farmácia, da farmácia e compras)
   ========================================================================== */
(function (G) {
  'use strict';
  var RA = ['regional', 'alta'], ALTA = ['alta'];
  var esc = G.esc;
  function salas(ctx) { return G.p(ctx, { regional: 8, alta: 12 }); }
  function media(ctx) { return G.p(ctx, { regional: 24, alta: 38 }); }

  G.TASKS.push(

    /* =========================== BLOCO CIRÚRGICO =========================== */
    {
      id: 'C2', setor: 'bloco', day: 1, portes: RA, type: 'decisao',
      titulo: 'Que pergunta a previsão do bloco vai responder?',
      fase: 'CRISP-DM · Do problema à pergunta',
      contexto: function (ctx) {
        var tx = ctx.porte === 'alta' ? '<li>As salas são compartilhadas com a <b>equipe de transplante</b>, que precisa de sala livre a qualquer hora quando surge um órgão.</li>' : '';
        return '<p>O bloco tem <b>' + salas(ctx) + ' salas</b> e faz em média <b>' + media(ctx) + ' cirurgias por dia</b>. <b>14% das cirurgias marcadas são canceladas no dia</b>; há plantões com salas paradas e outros com horas extras.</p><ul>' +
          '<li>A enfermeira-chefe monta a escala <b>com duas semanas de antecedência</b>.</li>' +
          '<li>O almoxarifado compra materiais cirúrgicos com 10 dias de antecedência.</li>' + tx +
          '<li>Hoje a escala é feita repetindo o mesmo mês do ano anterior.</li></ul>';
      },
      caso: { titulo: 'O horizonte certo',
        texto: 'Na pandemia, o COVID-19 Forecast Hub, dos EUA, reuniu previsões de dezenas de equipes: a precisão caía à medida que o horizonte aumentava, e a combinação dos modelos, refeita toda semana, foi a mais consistente. Uma previsão precisa olhar tão longe quanto a decisão que ela apoia — e não mais longe do que consegue acertar.',
        fonte: 'Cramer et al., PNAS, 2022 (COVID-19 Forecast Hub)' },
      pergunta: 'Que pergunta o modelo do bloco vai responder?',
      opcoes: [
        { id: 'a', label: 'Quantas cirurgias haverá por dia e por especialidade, com 14 dias de antecedência.', detalhe: 'Previsão de um número ao longo do tempo (série temporal).',
          fx: { eficiencia: 3, dados: 1 }, flags: { alvo: 'diario14' }, q: 2,
          consequencia: 'A pergunta casa com a decisão da escala: mesmo prazo, mesmo nível de detalhe.',
          comentario: 'O horizonte (14 dias) é igual ao tempo de reação da decisão (a escala) e o detalhe (dia e especialidade) é o que a escala usa.' },
        { id: 'b', label: 'Quantas cirurgias o hospital fará no próximo ano.',
          fx: {}, flags: { alvo: 'anual' }, q: 1,
          consequencia: 'A diretoria financeira gostou. A enfermeira-chefe perguntou como isso ajuda a escala da semana que vem.',
          comentario: 'Útil para o orçamento anual, não para a escala de duas semanas — a decisão que motivou o projeto.' },
        { id: 'c', label: 'A chance de cada cirurgia marcada ser cancelada no dia.', detalhe: 'Classificação: cancela ou não cancela.',
          fx: { eficiencia: 2 }, flags: { alvo: 'cancelamento' }, q: 1,
          consequencia: 'Pergunta nova e interessante — serve para confirmar pacientes, não diretamente para montar a escala.',
          comentario: 'Bom segundo projeto, mas responde a outra decisão: confirmar pacientes na véspera.' },
        { id: 'd', label: 'Quantas cirurgias haverá na próxima hora.',
          fx: { eficiencia: -1 }, flags: { alvo: 'hora' }, q: 0,
          consequencia: 'Tecnicamente possível. A escala, porém, é fechada com duas semanas de antecedência.',
          comentario: 'Horizonte curto demais: nenhuma escala ou compra consegue reagir em uma hora.' }
      ],
      conceitos: ['previsao', 'serie_temporal', 'horizonte', 'classificacao'],
      conceito: 'A mesma área gera perguntas diferentes. A certa é a que casa com a decisão: quem usa a previsão, com que antecedência e com que nível de detalhe.',
      ra: ['RA2', 'RA3']
    },

    {
      id: 'C3', setor: 'bloco', day: 3, portes: RA, type: 'decisao',
      titulo: 'Prepare o histórico do bloco cirúrgico',
      fase: 'CRISP-DM · Preparação dos dados · Vazamento',
      contexto: function (ctx) {
        var agenda = ctx.flags.verba_agenda ? '<p class="nota bom">A diretoria aprovou a ligação com a agenda cirúrgica: as cirurgias já marcadas para cada data estarão disponíveis.</p>' : '';
        return '<p>A base tem as cirurgias de <b>2019 a 2025</b>. Em <b>2020 e 2021</b>, as cirurgias eletivas ficaram suspensas por meses (pandemia).</p>' +
          '<p>Informações que a equipe pensa em usar:</p><ul>' +
          '<li>dia da semana, mês, feriados, especialidade;</li>' +
          '<li>cirurgias já marcadas para a data;</li>' +
          '<li>cirurgiões escalados;</li>' +
          '<li><b>cirurgias realizadas no dia</b>;</li>' +
          '<li><b>horas extras pagas no dia</b>.</li></ul>' + agenda;
      },
      caso: { titulo: 'Quando o modelo “cola” na prova',
        texto: 'Uma revisão sistemática triou mais de 2 mil estudos sobre IA para COVID-19 em raio-X e tomografia, analisou em detalhe 62 e não encontrou nenhum modelo pronto para uso clínico. Muitos tinham “aprendido” pistas que não eram a doença — como a posição do paciente no exame ou diferenças entre as fontes das imagens.',
        fonte: 'Roberts et al., Nature Machine Intelligence, 2021' },
      pergunta: 'Como a equipe prepara a base?',
      opcoes: [
        { id: 'bruto', label: 'Usar todo o período e todas as informações, sem tratar nada — o modelo descobre o que importa.',
          fx: { dados: -5 }, flags: { prep: 'bruto' }, q: 0,
          consequencia: 'Base pronta numa tarde. Os primeiros resultados parecem bons demais.',
          comentario: '“Cirurgias realizadas no dia” é a própria resposta e “horas extras” só se sabe depois: vazamento. E a pandemia entra como se fosse um período normal.' },
        { id: 'cuidadoso', label: 'Marcar a pandemia como período atípico e usar só informações conhecidas 14 dias antes: calendário, feriados, especialidade e cirurgias já marcadas.',
          fx: function (ctx) { return { dados: ctx.flags.verba_agenda ? 8 : 6 }; }, flags: { prep: 'cuidadoso' }, q: 2,
          consequencia: 'A preparação demorou mais, mas cada informação tem uma data em que passa a ser conhecida.',
          comentario: 'Só entra o que estará disponível no momento da previsão, e o período atípico é sinalizado em vez de ignorado.' },
        { id: 'curto', label: 'Usar só os últimos 6 meses, para fugir da pandemia.',
          fx: { dados: -1 }, flags: { prep: 'curto' }, q: 1,
          consequencia: 'Base limpa e recente. A equipe nota que dezembro e julho não aparecem nela.',
          comentario: 'Evita a distorção, mas perde as variações do ano (férias, fim de ano) e deixa pouca história para aprender.' },
        { id: 'vazamento', label: 'Usar todo o período e incluir “horas extras pagas no dia”, porque acompanha muito bem a demanda.',
          fx: { dados: -3 }, flags: { prep: 'vazamento' }, q: 0,
          consequencia: 'A relação é fortíssima, e a equipe ficou animada.',
          comentario: 'A relação é forte porque horas extras são consequência da demanda, conhecidas só depois do dia: vazamento clássico.' }
      ],
      conceitos: ['vazamento', 'preparacao', 'serie_temporal'],
      conceito: 'Vazamento é usar no treino uma informação que não estará disponível na hora de prever. O modelo parece ótimo no teste e falha na prática.',
      ra: ['RA7', 'RA3']
    },

    {
      id: 'C4', setor: 'bloco', day: 4, portes: RA, type: 'decisao',
      titulo: 'Como saber se a previsão vai funcionar no futuro?',
      fase: 'CRISP-DM · Avaliação · Validação no tempo',
      contexto: function () {
        return '<p>A equipe vai comparar modelos de previsão. Antes, precisa decidir <b>como estimar o erro que o modelo terá no futuro</b>.</p>' +
          '<p>Os dados são uma sequência de dias: cada dia depende dos anteriores (segunda-feira é diferente de sexta; dezembro é diferente de março).</p>';
      },
      caso: { titulo: 'A previsão de gripe que enxergou o dobro',
        texto: 'O Google Flu Trends estimava a gripe a partir das buscas na internet. Ia bem nos dados do passado, mas em 2013 estimou mais que o dobro das consultas por síndrome gripal registradas pelo CDC: tinha se ajustado a coincidências do passado que não se repetiram.',
        fonte: 'Lazer et al., Science, 2014' },
      pergunta: 'Como a equipe vai testar o modelo?',
      opcoes: [
        { id: 'kfold', label: 'Embaralhar todos os dias e sortear alguns para teste (validação cruzada comum).',
          fx: { dados: -2 }, flags: { valid: 'kfold' }, q: 0,
          consequencia: 'Teste concluído. Os erros ficaram baixos.',
          comentario: 'Em dados no tempo, embaralhar deixa o modelo “ver o futuro” para prever o passado: o erro estimado sai otimista.' },
        { id: 'temporal', label: 'Treinar até uma data, prever as 2 semanas seguintes, avançar e repetir — sempre prevendo o futuro com o passado; teste final nos últimos 6 meses.',
          fx: { dados: 4 }, flags: { valid: 'temporal' }, q: 2,
          consequencia: 'Teste concluído. Os erros são mais altos — e mais realistas.',
          comentario: 'Respeita a ordem do tempo e imita o uso real (prever 14 dias à frente, várias vezes).' },
        { id: 'treino', label: 'Medir o erro nos mesmos dados usados para treinar.',
          fx: { dados: -4 }, flags: { valid: 'treino' }, q: 0,
          consequencia: 'Erro quase zero. A equipe comemorou.',
          comentario: 'Errar pouco nos dados de treino mede memória, não capacidade de prever (sobreajuste).' },
        { id: 'holdout', label: 'Separar os últimos 6 meses como teste, uma única vez.',
          fx: { dados: 2 }, flags: { valid: 'holdout' }, q: 1,
          consequencia: 'Teste concluído nos últimos 6 meses.',
          comentario: 'Respeita o tempo, mas uma única medida é mais instável que repetir a previsão várias vezes.' }
      ],
      conceitos: ['validacao_temporal', 'vazamento', 'sobreajuste'],
      conceito: 'Em dados ordenados no tempo, o teste precisa respeitar o tempo: treinar no passado e testar no futuro. Embaralhar os dias vaza informação e dá um erro otimista.',
      ra: ['RA7']
    },

    {
      id: 'C5', setor: 'bloco', day: 5, portes: ALTA, type: 'decisao',
      titulo: 'Escolha o modelo de previsão do bloco',
      fase: 'CRISP-DM · Modelagem · Comparar com o simples',
      contexto: function (ctx) {
        var otim = ctx.flags.valid === 'kfold' || ctx.flags.valid === 'treino';
        var vaz = ctx.flags.prep === 'bruto' || ctx.flags.prep === 'vazamento';
        var nomeV = { kfold: 'dias embaralhados', temporal: 'prevendo sempre o futuro', treino: 'erro no próprio treino', holdout: 'últimos 6 meses' }[ctx.flags.valid] || '';
        var mae = otim ? [4.4, 2.9, 1.2, 0.6] : [4.6, 3.6, ctx.flags.verba_agenda ? 2.5 : 2.7, ctx.flags.verba_agenda ? 2.4 : 2.6];
        if (vaz) mae[2] = Math.min(mae[2], 0.9);
        return '<p>Resultado do teste (<b>' + nomeV + '</b>). Erro médio, em cirurgias por dia — o bloco faz em média <b>38 cirurgias por dia</b>:</p>' +
          G.tbl(['Modelo', 'Erro médio', 'Custo', 'Observação'], [
            ['Média simples (mesmo dia da semana, últimas 4 semanas)', G.r1(mae[0]), G.fmtc(ctx, 5), 'A régua mínima: qualquer modelo precisa superá-la'],
            ['Regressão linear com calendário e feriados', G.r1(mae[1]), G.fmtc(ctx, 15), 'Cada efeito é visível (ex.: “feriado = −9 cirurgias”)'],
            ['Árvores combinadas (gradient boosting) com calendário + agenda', G.r1(mae[2]), G.fmtc(ctx, 40), 'Mostra quais informações mais pesaram'],
            ['Rede neural (deep learning)', G.r1(mae[3]), G.fmtc(ctx, 140), 'Precisa de GPU, difícil de explicar, varia a cada treino']
          ]) + (otim ? '<p class="nota">A equipe comemorou os números.</p>' : '');
      },
      caso: { titulo: 'O simples costuma ganhar',
        texto: 'Na competição internacional de previsão M4 (2018), com 100 mil séries, os métodos puros de aprendizado de máquina ficaram atrás dos estatísticos e de suas combinações; o vencedor foi um híbrido, que juntava um método estatístico clássico a uma rede neural. Comparar com o simples é obrigatório.',
        fonte: 'Makridakis et al., International Journal of Forecasting, 2020' },
      pergunta: 'Qual modelo vai para o dia a dia?',
      opcoes: function (ctx) {
        var otim = ctx.flags.valid === 'kfold' || ctx.flags.valid === 'treino';
        return [
          { id: 'baseline', label: 'Média simples', custo: 5, fx: { eficiencia: 1 }, flags: { modeloP: 'baseline' }, q: 1,
            consequencia: 'Modelo simples em uso, fácil de entender.', comentario: 'Seguro e transparente, mas deixa de lado o ganho dos outros modelos.' },
          { id: 'linear', label: 'Regressão linear', custo: 15, fx: { eficiencia: 3, confianca: 1 }, flags: { modeloP: 'linear' }, q: 1,
            consequencia: 'A enfermeira-chefe entende o efeito de cada feriado.', comentario: 'Bom equilíbrio entre ganho e clareza; perde para as árvores quando a agenda marcada entra.' },
          { id: 'gb', label: 'Árvores combinadas (gradient boosting)', custo: 40, fx: { eficiencia: 5, dados: 2 }, flags: { modeloP: 'gb' }, q: otim ? 1 : 2,
            consequencia: 'Modelo em uso, com explicação das informações mais importantes.',
            comentario: 'Melhor relação entre erro, custo e explicação em dados de tabela.' + (otim ? ' Mas o teste escolhido inflou todos os números.' : '') },
          { id: 'lstm', label: 'Rede neural', custo: 140, fx: function (c) { return { eficiencia: 3, confianca: -2, dados: c.flags.infra === 'local' ? -1 : 0 }; }, flags: { modeloP: 'lstm' }, q: otim ? 0 : 1,
            consequencia: 'Rede neural em uso. Cada novo treino precisa de GPU.',
            comentario: otim ? 'A vantagem da rede era ilusão do teste vazado: modelos flexíveis “decoram” melhor.' : 'Ganho mínimo (0,1 cirurgia por dia) não justifica custo 3,5 vezes maior e menos clareza.' }
        ];
      },
      conceitos: ['baseline', 'mae', 'arvores', 'deep_learning', 'sobreajuste'],
      conceito: 'Compare sempre com um modelo simples (baseline): ele mostra quanto o modelo complexo realmente acrescenta. Ganho pequeno raramente justifica um modelo muito mais caro e difícil de explicar.',
      ra: ['RA4', 'RA6']
    },

    {
      id: 'C6', setor: 'bloco', day: { regional: 5, alta: 6 }, portes: RA, type: 'decisao',
      titulo: 'Como entregar a previsão a quem monta a escala?',
      fase: 'Implantação · Comunicar a incerteza',
      contexto: function (ctx) {
        var prev = G.p(ctx, { regional: [26, 22, 31], alta: [41, 36, 47] });
        return '<p>A previsão está pronta. Para a próxima segunda-feira: <b>' + prev[0] + ' cirurgias</b>; em 8 de cada 10 segundas parecidas, o número real ficou entre <b>' + prev[1] + ' e ' + prev[2] + '</b>.</p>' +
          '<p>A enfermeira-chefe precisa fechar a escala, e o almoxarifado, a compra de materiais.</p>';
      },
      caso: { titulo: '“70% de chance de chuva”',
        texto: 'Há décadas a meteorologia comunica a previsão com a incerteza junto — e as pessoas decidem melhor (levar ou não o guarda-chuva) do que com um “vai chover” seco.',
        fonte: 'Prática dos serviços de meteorologia (INMET, NOAA)' },
      pergunta: 'Como a previsão chega a quem decide?',
      opcoes: function (ctx) {
        var prev = G.p(ctx, { regional: [26, 22, 31], alta: [41, 36, 47] });
        return [
          { id: 'pontual', label: 'Mandar só o número previsto (' + prev[0] + '), para não confundir.', fx: { eficiencia: 1 }, flags: { entregaP: 'pontual' }, q: 1,
            consequencia: 'A escala foi feita para exatamente ' + prev[0] + ' cirurgias.', comentario: 'Esconde a incerteza: quando vierem ' + prev[2] + ', ninguém terá se preparado.' },
          { id: 'intervalo', label: 'Um painel com a previsão e a faixa (' + prev[1] + ' a ' + prev[2] + '): escala pelo número previsto, sobreaviso para o limite de cima e revisão semanal do erro com a enfermeira-chefe.',
            custo: 15, fx: { eficiencia: 6, confianca: 3 }, flags: { entregaP: 'intervalo' }, q: 2,
            consequencia: 'Primeira escala com sobreaviso planejado. As horas extras caíram na semana seguinte.',
            comentario: 'Comunica a incerteza e a transforma em ação (sobreaviso); quem conhece o bloco continua decidindo.' },
          { id: 'automatico', label: 'Deixar o modelo montar a escala e a agenda sozinho, sem revisão.', fx: { eficiencia: 2, confianca: -6, seguranca: -2 }, flags: { entregaP: 'automatico' }, q: 0,
            consequencia: 'A escala foi gerada sozinha. Duas cirurgias de urgência ficaram sem sala.',
            comentario: 'O modelo não sabe o que não está nos dados (férias, aparelho em manutenção, urgências, transplantes).' },
          { id: 'relatorio', label: 'Usar a previsão só num relatório mensal para a diretoria.', fx: { eficiencia: 1 }, flags: { entregaP: 'relatorio' }, q: 1,
            consequencia: 'O relatório ficou mais bonito. A escala continua sendo feita como antes.',
            comentario: 'A previsão não chega a quem toma a decisão que motivou o projeto.' }
        ];
      },
      conceitos: ['incerteza', 'humano_no_circuito', 'previsao'],
      conceito: 'Toda previsão erra. Mostrar a faixa provável (incerteza) permite planejar a folga certa; o modelo apoia a escala, e quem conhece o bloco continua decidindo.',
      ra: ['RA6']
    },

    /* ============================== TRANSPLANTE ============================== */
    {
      id: 'TX1', setor: 'transplante', day: 2, portes: ALTA, type: 'decisao',
      titulo: 'Como a IA pode ajudar a equipe de transplante?',
      fase: 'Entendimento do negócio · Limites éticos e legais',
      contexto: function () {
        return '<p>O hospital transplanta <b>rim e fígado</b>: cerca de 90 transplantes por ano. A equipe recebeu propostas de três empresas e uma sugestão de um cirurgião.</p>' +
          '<p>Lembre: no Brasil, a ordem da lista de espera é definida pelo <b>Sistema Nacional de Transplantes</b>, por critérios públicos — não pelo hospital.</p>';
      },
      caso: { titulo: 'Uma fila com regra pública',
        texto: 'Desde 2006, a fila de transplante de fígado no Brasil é ordenada pelo MELD, um escore de gravidade calculado com três exames de sangue: quem tem mais risco de morrer na espera vem primeiro. Já para acompanhar quem foi transplantado, modelos como o iBox (rim) preveem o risco de perder o órgão nos anos seguintes.',
        fonte: 'Portaria MS 1.160/2006; Loupy et al., BMJ, 2019' },
      pergunta: 'Qual projeto a equipe de transplante adota?',
      opcoes: [
        { id: 'fila', label: 'IA para reordenar a lista de espera do hospital pela “chance de sucesso” de cada receptor.',
          fx: { conformidade: -10, confianca: -3 }, flags: { txUso: 'fila' }, q: 0,
          consequencia: 'O projeto começou. O jurídico pediu uma reunião urgente.',
          comentario: 'A lista é regulada pelo Sistema Nacional de Transplantes: o hospital não pode reordená-la. E “chance de sucesso” pode excluir justamente os mais graves.' },
        { id: 'enxerto', label: 'IA para o acompanhamento depois do transplante: prever o risco de perda do órgão e intensificar o cuidado de quem tem mais risco.', custo: 60,
          fx: { seguranca: 4, dados: 2, confianca: 2 }, flags: { txUso: 'enxerto' }, q: 2,
          consequencia: 'A equipe começou a reunir os dados de acompanhamento dos transplantados.',
          comentario: 'Uso de apoio dentro da autonomia da equipe: o modelo aponta quem precisa de mais atenção, e a decisão continua clínica.' },
        { id: 'oferta', label: 'IA para ajudar a avaliar a qualidade de um órgão ofertado; a equipe decide se aceita.', custo: 80,
          fx: { eficiencia: 2, seguranca: 1 }, flags: { txUso: 'oferta' }, q: 1,
          consequencia: 'A empresa vai instalar o sistema na sala de captação.',
          comentario: 'Área promissora e legítima, mas delicada: se o modelo for pessimista, órgãos bons podem ser recusados. Exige validação cuidadosa.' },
        { id: 'importado', label: 'Comprar um modelo americano de sobrevivência pós-transplante e usar direto, sem teste local.', custo: 50,
          fx: { seguranca: -3, dados: -2 }, flags: { txUso: 'importado' }, q: 0,
          consequencia: 'O modelo foi instalado em uma semana.',
          comentario: 'Pacientes, doadores e protocolos dos EUA são diferentes: sem validação local, o risco calculado pode ser muito errado.' }
      ],
      conceitos: ['apoio_decisao', 'validacao_externa', 'equidade'],
      conceito: 'Nem tudo o que a IA consegue prever deve ser decidido por ela. Em transplantes, a ordem da fila segue regras públicas; a IA pode apoiar o cuidado da equipe, dentro desses limites.',
      ra: ['RA8', 'RA2']
    },

    {
      id: 'TX2', setor: 'transplante', day: 5, portes: ALTA, type: 'decisao',
      titulo: 'O modelo do transplante funciona nos nossos pacientes?',
      fase: 'Avaliação · Validação externa e calibração',
      contexto: function (ctx) {
        var red = ctx.flags.txUso === 'fila' || ctx.flags.txUso === 'importado' ?
          '<p class="nota alerta">O projeto do dia 2 foi redirecionado: a equipe agora avalia um modelo de <b>risco de perda do órgão</b> depois do transplante.</p>' : '';
        var nome = ctx.flags.txUso === 'oferta' ? 'avaliação de órgãos ofertados' : 'risco de perda do órgão depois do transplante';
        var v = ctx.flags.verba_validacao ? '<p class="nota bom">A verba de validação aprovada pela diretoria cobre parte do trabalho.</p>' : '';
        return red + '<p>O modelo de <b>' + nome + '</b> foi desenvolvido com pacientes da Europa e dos EUA. Nos estudos, acertou muito bem quem tinha mais risco.</p>' +
          '<p>O hospital tem dados de <b>420 transplantados</b> nos últimos 5 anos. Um teste rápido mostrou que o modelo <b>prevê risco 1,6 vez maior</b> do que o que aconteceu de fato aqui.</p>' + v;
      },
      caso: { titulo: 'Validar antes de confiar',
        texto: 'O iBox, para transplante renal, foi desenvolvido na França e testado em coortes da Europa e dos EUA antes de ser proposto para uso. Validação em outra população e ajuste da calibração fazem parte do método, não são um extra.',
        fonte: 'Loupy et al., BMJ, 2019' },
      pergunta: 'O que a equipe faz?',
      opcoes: [
        { id: 'usar', label: 'Usar como está: foi publicado numa revista importante.',
          fx: { seguranca: -4, confianca: -2 }, flags: { txValid: 'usar' }, q: 0,
          consequencia: 'Pacientes de baixo risco começaram a ser chamados para consultas extras.',
          comentario: 'Mal calibrado para esta população: o risco 1,6 vez maior gera alarme e consultas desnecessárias.' },
        { id: 'validar', label: 'Testar com os 420 pacientes do hospital, ajustar a calibração, comparar com a avaliação da equipe e só então usar, primeiro em paralelo.',
          custo: function (c) { return c.flags.verba_validacao ? 20 : 70; }, fx: { seguranca: 4, dados: 4, confianca: 3 }, flags: { txValid: 'validar' }, q: 2,
          consequencia: 'Calibração ajustada. A equipe passou a confiar no escore — e sabe onde ele erra.',
          comentario: 'Validação local e ajuste da calibração antes do uso: o caminho seguro para trazer um modelo de fora.' },
        { id: 'treinar', label: 'Jogar o modelo fora e treinar um novo, só com os 420 pacientes do hospital.', custo: 90,
          fx: { dados: -2, eficiencia: -2 }, flags: { txValid: 'treinar' }, q: 0,
          consequencia: 'O novo modelo acertou quase tudo nos próprios dados — e pouco nos pacientes do mês seguinte.',
          comentario: '420 pacientes, com poucos eventos, é pouco para treinar do zero: o modelo decora (sobreajuste).' },
        { id: 'pesquisa', label: 'Usar só em pesquisa, sem chegar ao cuidado dos pacientes por enquanto.',
          fx: { dados: 1 }, flags: { txValid: 'pesquisa' }, q: 1,
          consequencia: 'O modelo ficou restrito a um projeto de pesquisa.',
          comentario: 'Prudente, mas adia um benefício que a validação local poderia liberar com segurança.' }
      ],
      conceitos: ['validacao_externa', 'calibracao', 'sobreajuste'],
      conceito: 'Um modelo pode separar bem quem tem mais e menos risco e, mesmo assim, errar o tamanho do risco em outra população (calibração). Antes de usar um modelo de fora, teste nos seus pacientes e ajuste.',
      ra: ['RA7']
    },

    /* =============================== FARMÁCIA =============================== */
    {
      id: 'F2', setor: 'farmacia', day: 2, portes: ALTA, type: 'decisao',
      titulo: 'Os alertas de interação medicamentosa',
      fase: 'Sistemas de apoio à decisão · Fadiga de alertas',
      contexto: function () {
        return '<p>Toda prescrição passa por um sistema que procura <b>interações medicamentosas</b> numa base genérica comprada há anos. Resultado:</p><ul>' +
          '<li><b>4.200 alertas por semana</b> que interrompem o médico;</li>' +
          '<li><b>93% são ignorados</b> — inclusive alguns graves (ex.: varfarina + anti-inflamatório);</li>' +
          '<li>a base não sabe a idade, o peso nem a função dos rins do paciente.</li></ul>';
      },
      caso: { titulo: 'Alertas demais, ninguém lê',
        texto: 'Estudos mostram que médicos ignoram de 49% a 96% dos alertas de segurança de medicamentos. Quando quase todo alerta é irrelevante, os importantes se perdem no meio.',
        fonte: 'van der Sijs et al., JAMIA, 2006' },
      pergunta: 'Que sistema de alertas a farmácia adota?',
      opcoes: [
        { id: 'generica', label: 'Manter a base genérica: segurança em primeiro lugar, todo alerta aparece.',
          fx: { confianca: -3, seguranca: -1 }, flags: { alertasFarm: 'generica' }, q: 0,
          consequencia: 'Os 4.200 alertas semanais continuam.', comentario: 'Mais alertas não é mais segurança: com 93% ignorados, os graves também passam.' },
        { id: 'curada', label: 'Base revisada por farmacêuticos clínicos, que leva em conta idade, peso e função dos rins; só interações graves interrompem a prescrição; as demais aparecem como aviso.',
          custo: 70, fx: { seguranca: 5, confianca: 4, eficiencia: 2 }, flags: { alertasFarm: 'curada' }, q: 2,
          consequencia: 'Os alertas que interrompem caíram para cerca de 600 por semana — e agora são levados a sério.',
          comentario: 'Menos alertas, mais relevantes e ajustados ao paciente: o caminho contra a fadiga de alertas.' },
        { id: 'farmaceutico', label: 'Desligar os alertas e deixar os farmacêuticos revisarem todas as prescrições.',
          fx: { eficiencia: -4, seguranca: -2 }, flags: { alertasFarm: 'farmaceutico' }, q: 0,
          consequencia: 'A fila de prescrições para revisar passou de mil por turno.', comentario: 'Com 9 mil doses por dia, a revisão humana de tudo não fecha a conta.' },
        { id: 'chatbot', label: 'Um chatbot de IA generativa onde o médico pergunta sobre interações, sem base revisada.', custo: 30,
          fx: { seguranca: -3, conformidade: -3 }, flags: { alertasFarm: 'chatbot' }, q: 0,
          consequencia: 'Os médicos adoraram a conversa. Um farmacêutico encontrou uma resposta inventada sobre uma dose.',
          comentario: 'IA generativa pode “alucinar”: dar respostas convincentes e erradas. Para medicamentos, precisa de base revisada e conferência.' }
      ],
      conceitos: ['interacao_medicamentosa', 'apoio_decisao', 'fadiga_alarmes', 'alucinacao'],
      conceito: 'Um sistema de apoio à decisão vale pelo que muda na prática: alertas demais causam fadiga e os importantes se perdem. Relevância e contexto do paciente importam mais que quantidade.',
      ra: ['RA6']
    },

    {
      id: 'F4', setor: 'farmacia', day: 4, portes: RA, type: 'decisao',
      titulo: 'Quais alertas devem interromper o médico?',
      fase: 'Avaliação · Rótulo certo e círculo vicioso',
      contexto: function (ctx) {
        if (ctx.flags.alertasFarm === 'curada') {
          return '<p>A base revisada já reduziu os alertas. Agora a farmácia precisa decidir <b>como manter</b> a regra dos alertas que interrompem — e um fornecedor ofereceu um “alerta inteligente” com IA.</p>';
        }
        return '<p>O sistema de prescrição dispara <b>' + (ctx.flags.alertasFarm ? '4.200' : 'cerca de 3 mil') + ' alertas de interação por semana</b>, e <b>93% são ignorados</b>. Os médicos reclamam; a farmácia teme que um alerta grave passe despercebido.</p>' +
          '<p>Um fornecedor ofereceu um “alerta inteligente” com IA.</p>';
      },
      caso: { titulo: 'O modelo aprende o que os humanos fazem — inclusive o erro',
        texto: 'Se um modelo aprende com o que os médicos fizeram (ignorar ou aceitar o alerta), ele reproduz o comportamento — inclusive o cansaço. É o mesmo problema de usar custo como medida de necessidade.',
        fonte: 'Obermeyer et al., Science, 2019 (rótulo substituto)' },
      pergunta: 'O que a farmácia faz?',
      opcoes: [
        { id: 'regra', label: 'Interromper só em interações graves e contraindicações (lista revisada), pedindo um motivo para ignorar; as demais viram aviso discreto; acompanhar todo mês quantos alertas são aceitos.',
          custo: function (c) { return c.flags.alertasFarm === 'curada' ? 10 : 40; }, fx: { seguranca: 5, confianca: 4, eficiencia: 2 }, flags: { alertasRegra: 'regra' }, q: 2,
          consequencia: 'Os alertas que interrompem caíram 80% e a aceitação subiu.',
          comentario: 'Regra clara, revisada por quem entende de medicamentos, e medida todo mês.' },
        { id: 'ml_ignorados', label: 'Comprar a IA que aprende quais alertas os médicos costumam ignorar e passa a esconder esses.', custo: 60,
          fx: { seguranca: -4, eficiencia: 3 }, flags: { alertasRegra: 'ml_ignorados' }, q: 0,
          consequencia: 'Os alertas caíram pela metade. Ninguém sabe dizer quais sumiram.',
          comentario: 'O rótulo é o comportamento (cansado) dos médicos, não o risco ao paciente: o modelo aprende a esconder justamente alertas graves que vinham sendo ignorados — um círculo vicioso.' },
        { id: 'vermelho', label: 'Deixar todos os alertas maiores, vermelhos e com som.',
          fx: { confianca: -4 }, flags: { alertasRegra: 'vermelho' }, q: 0,
          consequencia: 'Os alertas ficaram impossíveis de ignorar — por duas semanas.', comentario: 'Mais barulho aumenta a fadiga. O problema é relevância, não visibilidade.' },
        { id: 'uti', label: 'Manter os alertas só nas UTIs, com dupla checagem do farmacêutico, e desligar nos outros setores.',
          fx: { seguranca: 1, eficiencia: 1 }, flags: { alertasRegra: 'uti' }, q: 1,
          consequencia: 'As UTIs ganharam um farmacêutico de referência; as enfermarias ficaram sem alerta.',
          comentario: 'Protege quem está mais grave, mas deixa sem proteção as interações graves nas enfermarias.' }
      ],
      conceitos: ['rotulo', 'retroalimentacao', 'fadiga_alarmes', 'apoio_decisao'],
      conceito: 'Se o rótulo é o comportamento humano (“o médico ignorou”), o modelo aprende o comportamento — inclusive o erro. Defina o rótulo pelo que importa ao paciente (o risco), não pelo que é fácil de medir.',
      ra: ['RA7']
    },

    {
      id: 'F6', setor: 'farmacia', day: 6, portes: RA, type: 'decisao',
      titulo: 'Rastreabilidade: o sistema apontou três profissionais',
      fase: 'Detecção de anomalias · Ética',
      contexto: function (ctx) {
        var rastreio = ctx.flags.verba_barras ? 'Com os leitores de código de barras à beira do leito, cada dose de controlado é registrada do lote ao paciente.' :
          'As doses de medicamentos controlados são registradas na farmácia e no armário automatizado de cada setor.';
        return '<p>' + rastreio + ' Um sistema de <b>detecção de anomalias</b> comparou as retiradas de <b>morfina e midazolam</b> e apontou <b>3 profissionais</b> com retiradas muito acima da média.</p>' +
          '<p>Detalhe: dois deles trabalham no plantão noturno da UTI, que recebe os pacientes mais graves.</p>';
      },
      caso: { titulo: 'Do lote ao leito',
        texto: 'A Lei 11.903/2009 criou o Sistema Nacional de Controle de Medicamentos, para rastrear cada unidade do fabricante ao paciente, e a Portaria 344/1998 regula os controlados. Hospitais usam detecção de anomalias em armários automatizados para identificar desvio de opioides — o alerta abre uma investigação, não é uma prova.',
        fonte: 'Lei 11.903/2009; Portaria SVS/MS 344/1998' },
      pergunta: 'O que a farmácia faz?',
      opcoes: [
        { id: 'afastar', label: 'Afastar os três imediatamente e comunicar a polícia.',
          fx: { confianca: -6, conformidade: -5 }, flags: { anomalia: 'afastar' }, q: 0,
          consequencia: 'Dois dos três eram do plantão da UTI e estavam corretos. A equipe noturna está revoltada.',
          comentario: 'Anomalia não é culpa: o modelo compara com a média, e quem atende os mais graves naturalmente retira mais.' },
        { id: 'investigar', label: 'Investigar com cuidado: comparar com o perfil dos pacientes atendidos (setor, turno, gravidade), conferir prontuários e devoluções, ouvir os profissionais com sigilo e ajustar o modelo para comparar setores parecidos.',
          custo: 20, fx: { seguranca: 3, conformidade: 5, confianca: 3, dados: 2 }, flags: { anomalia: 'investigar' }, q: 2,
          consequencia: 'Dois casos explicados pela gravidade da UTI. Um terceiro tinha devoluções sem registro — e foi encaminhado à comissão.',
          comentario: 'O alerta abre a investigação; o contexto (setor, gravidade) explica a maior parte das anomalias. Ajustar a comparação reduz falsos alarmes.' },
        { id: 'ignorar', label: 'Ignorar: esses sistemas erram muito.',
          fx: { seguranca: -3, conformidade: -3 }, flags: { anomalia: 'ignorar' }, q: 0,
          consequencia: 'Nada foi verificado.', comentario: 'Um desvio real de controlados é risco para pacientes e para o próprio profissional. Alerta sem investigação é desperdício.' },
        { id: 'ranking', label: 'Divulgar para toda a equipe o ranking de quem mais retira controlados, para inibir desvios.',
          fx: { confianca: -6, conformidade: -6 }, flags: { anomalia: 'ranking' }, q: 0,
          consequencia: 'O ranking circulou nos grupos de mensagens.', comentario: 'Expõe profissionais (LGPD), pune quem cuida dos mais graves e não investiga nada.' }
      ],
      conceitos: ['deteccao_anomalia', 'rastreabilidade', 'falso_positivo'],
      conceito: 'Detecção de anomalias aponta o que foge do padrão, não o que está errado. Comparar com grupos parecidos e investigar o contexto antes de agir evita injustiças e falsos alarmes.',
      ra: ['RA7', 'RA8']
    }
  );
})(window.GAME);
