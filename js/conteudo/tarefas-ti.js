/* ==========================================================================
   PLANTÃO IA — TI, Dados e BI
   Linguagem acessível: a TI aqui decide onde os dados ficam, como chegam,
   quem pode vê-los, qual painel a gestão vai usar e o que fazer na crise.
   ========================================================================== */
(function (G) {
  'use strict';
  var TODOS = G.TODOS, RA = ['regional', 'alta'], ALTA = ['alta'];
  var M = G.MODELS;
  function modeloAtual(ctx) { return M[ctx.flags.modelo] || null; }
  function integrado(ctx) { return ctx.flags.pipeline === 'etl' || ctx.flags.pipeline === 'fhir'; }

  /* Painel da gestão: as 8 visualizações possíveis (T6) */
  G.VISUALIZACOES = {
    espera_linha: { bom: true, grafico: 'linha', label: 'Tempo de espera na urgência: mediana e “os 10% que mais esperam” (percentil 90), dia a dia',
      detalhe: 'Mostra o paciente típico, o pior caso e a tendência.',
      porque: 'Mediana e percentil 90 mostram o paciente típico e os que mais sofrem com a espera, e a linha mostra se está melhorando.' },
    espera_media: { bom: false, grafico: 'numero', label: 'Tempo médio de espera do mês, num número grande',
      detalhe: '“42 min” — simples e direto.',
      porque: 'A média (42 min) esconde a cauda: 1 em cada 10 pacientes espera mais de 3 horas. Um número sozinho também não mostra tendência.' },
    ocupacao_calor: { bom: true, grafico: 'calor', label: 'Ocupação dos leitos por setor e por hora do dia, em mapa de calor',
      detalhe: 'Cores mais fortes onde e quando lota.',
      porque: 'O mapa de calor mostra de uma vez onde e quando o hospital lota — ótimo para planejar escalas.' },
    pizza3d: { bom: false, grafico: 'pizza', label: 'Atendimentos por especialidade, numa pizza 3D com 14 fatias',
      detalhe: 'Colorida e chamativa.',
      porque: 'Pizza com muitas fatias é difícil de comparar, e o 3D distorce: as fatias da frente parecem maiores. Barras ordenadas comparam melhor.' },
    rastreio_barras: { bom: true, grafico: 'barras', label: 'Rastreabilidade: % das doses de medicamento com código de barras lido à beira do leito, por setor, com a meta marcada',
      detalhe: 'Barras ordenadas e uma linha de meta.',
      porque: 'Barras ordenadas com a meta marcada mostram na hora quais setores precisam de atenção.' },
    tabela: { bom: false, grafico: 'tabela', label: 'Uma tabela com os 40 indicadores do hospital, todos na mesma cor',
      detalhe: 'Nada fica de fora.',
      porque: 'Quarenta números sem destaque não dizem o que olhar primeiro. Painel de gestão é para os poucos indicadores que pedem ação.' },
    estoque_semaforo: { bom: true, grafico: 'semaforo', label: 'Estoque de EPI e medicamentos críticos: quantos dias ainda dá para atender, com faixa verde, amarela e vermelha',
      detalhe: 'Dias de cobertura, não só quantidade.',
      porque: '“Dias de cobertura” com faixas de alerta transformam o estoque em ação: quem está no vermelho precisa de compra.' },
    velocimetro: { bom: false, grafico: 'gauge', label: 'Um velocímetro (gauge) para cada indicador',
      detalhe: 'Parece o painel de um carro.',
      porque: 'Velocímetros ocupam muito espaço e mostram só o valor de hoje, sem tendência nem comparação.' }
  };
  G.VIS_ORDEM = ['espera_linha', 'espera_media', 'ocupacao_calor', 'pizza3d', 'rastreio_barras', 'tabela', 'estoque_semaforo', 'velocimetro'];

  /* Ferramentas de dashboard (T4) — produtos fictícios */
  G.FERRAMENTAS = {
    pep: 'Módulo de indicadores do prontuário', bi: 'Plataforma de BI de mercado', aberto: 'Ferramenta de código aberto',
    consultoria: 'Consultoria com painel pronto', planilha: 'Planilhas de cada setor'
  };

  G.TASKS.push(

    /* ------------------------------- DIA 1 ------------------------------- */
    {
      id: 'T1', setor: 'ti', day: 1, portes: TODOS, type: 'decisao', estrutural: true,
      titulo: 'Onde a IA do hospital vai funcionar?',
      fase: 'Infraestrutura · decisão que vale até o fim do jogo',
      contexto: function (ctx) {
        var f = function (v) { return G.fmtc(ctx, v); };
        return '<p class="destaque">Esta escolha vale <b>para o mês inteiro</b> — e vai ser testada numa crise na semana 2.</p>' +
          G.tbl(['', 'No próprio hospital', 'Na nuvem', 'Mista'], [
            ['Em uma frase', 'Computadores comprados, numa sala do hospital', 'Computador alugado de uma empresa, pela internet', 'Dados com nome no hospital; o resto na nuvem'],
            ['<b>Custo no 1º ano</b>', '<b>' + f(720) + '</b>', '<b>' + f(320) + '</b>', '<b>' + f(450) + '</b>'],
            ['Se a internet cair…', 'Continua funcionando', 'Tudo para', 'O alerta da urgência continua'],
            ['Se faltar energia…', 'Para, se o nobreak falhar', 'A empresa resolve', 'Parte para']
          ], 'tbl-compara') +
          '<p class="nota">O hospital tem <b>um único link de internet</b> e um nobreak de 8 anos. Não há resposta certa: escolha o risco que o hospital consegue administrar.</p>';
      },
      caso: { titulo: 'Não existe escolha sem risco',
        texto: 'Grandes hospitais brasileiros usam as três opções — servidor próprio, nuvem e mista. O que diferencia os bem-sucedidos não é a escolha em si, mas saber como cada uma falha e ter um plano para isso.',
        fonte: 'Lição geral de gestão de TI em saúde' },
      pergunta: 'O que você recomenda?',
      opcoes: [
        { id: 'local', label: 'No próprio hospital', detalhe: 'Controle total dos dados e independência da internet.',
          custo: 720, fx: { conformidade: 6, eficiencia: -2, dados: 2 }, flags: { infra: 'local' }, q: null,
          consequencia: 'Servidores encomendados — chegam até o dia 4. A TI avisou que vai precisar de reforço.',
          comentario: 'Defensável para manter dados sensíveis em casa e não depender da internet. Custa mais no início e concentra o risco em energia, peças e equipe local.' },
        { id: 'nuvem', label: 'Na nuvem', detalhe: 'Rápido de começar, cresce conforme a necessidade.',
          custo: 320, fx: { eficiencia: 5, conformidade: -6, dados: 3 }, flags: { infra: 'nuvem' }, q: null,
          consequencia: 'Ambiente pronto em horas. O encarregado de dados (DPO) pediu o contrato de proteção de dados e um datacenter no Brasil.',
          comentario: 'Defensável pela agilidade. Exige contrato de proteção de dados (LGPD), controle de gastos e — neste hospital — um segundo link de internet, porque tudo passa por ela.' },
        { id: 'hibrida', label: 'Mista (hospital + nuvem)', detalhe: 'Equilíbrio entre privacidade, continuidade e escala.',
          custo: 450, fx: { eficiencia: 3, conformidade: 3, dados: 3 }, flags: { infra: 'hibrida' }, q: null,
          consequencia: 'O alerta da urgência roda no hospital; os treinos vão para a nuvem sem nome de paciente. A integração vai exigir atenção constante.',
          comentario: 'Defensável por equilibrar privacidade, continuidade e escala. O preço é ter dois ambientes para proteger e manter.' }
      ],
      conceitos: ['infra_local', 'infra_nuvem', 'infra_hibrida', 'tco', 'lgpd'],
      conceito: 'Não existe infraestrutura certa: existe equilíbrio entre custo de começar e de manter (custo total), controle dos dados e capacidade de crescer. O que se avalia é se a escolha combina com os riscos que o hospital consegue administrar.',
      ra: ['RA8']
    },

    /* ------------------------------- DIA 2 ------------------------------- */
    {
      id: 'T2', setor: 'ti', day: 2, portes: RA, type: 'decisao',
      titulo: 'Como os dados vão chegar aos modelos e aos painéis?',
      fase: 'CRISP-DM · Entendimento dos dados · Integração',
      contexto: function (ctx) {
        var setores = G.p(ctx, {
          regional: '<li><b>Urgência</b>: precisa dos sinais vitais da triagem <b>em minutos</b>.</li><li><b>Bloco cirúrgico</b>: precisa do histórico de agendamentos.</li><li><b>Farmácia</b>: precisa das prescrições e das dispensações.</li>',
          alta: '<li><b>Urgência</b>: precisa dos sinais vitais da triagem <b>em minutos</b>.</li><li><b>Bloco e transplante</b>: agendamentos e exames.</li><li><b>Farmácia e compras</b>: prescrições, dispensações e estoque.</li><li><b>Especialidades</b>: imagens e laudos.</li>'
        });
        return '<p>O prontuário eletrônico é de um fornecedor nacional. Hoje, o único jeito de tirar dados dele é <b>exportar uma planilha</b>.</p><ul>' + setores +
          '<li><b>Diretoria</b>: quer um painel de indicadores atualizado.</li></ul>';
      },
      caso: { titulo: 'A “língua comum” dos dados de saúde',
        texto: 'A Rede Nacional de Dados em Saúde (RNDS), do Ministério da Saúde, usa o padrão HL7 FHIR para os sistemas conversarem. Foi por ela que circularam resultados de exames de COVID-19 e registros de vacinação.',
        fonte: 'Ministério da Saúde, RNDS (Portaria GM/MS 1.434/2020)' },
      pergunta: 'Que integração você implanta?',
      opcoes: [
        { id: 'manual', label: 'Exportar uma planilha por semana (grátis, mas atrasada).', custo: 0,
          fx: { dados: -4, eficiencia: -3 }, flags: { pipeline: 'manual' }, q: 0,
          consequencia: 'Custo zero. Para a urgência, a informação chega com dias de atraso.',
          comentario: 'Serve para explorar dados, nunca para um alerta que precisa chegar em minutos. E planilhas manuais trazem linhas duplicadas e erros.' },
        { id: 'etl', label: 'Um banco de dados central, atualizado toda noite.', custo: 120,
          fx: { dados: 5, eficiencia: 2 }, flags: { pipeline: 'etl' }, q: 1,
          consequencia: 'Toda manhã, os dados de ontem estão organizados. Ótimo para o bloco, a farmácia e os painéis.',
          comentario: 'Bom para previsões e painéis. Insuficiente para a urgência, que precisa do dado da triagem em minutos.' },
        { id: 'fhir', label: 'Ligar o prontuário em tempo real (padrão FHIR) + atualização noturna para os painéis.', custo: 260,
          fx: { dados: 8, eficiencia: 4 }, flags: { pipeline: 'fhir' }, q: 2,
          consequencia: 'Projeto de integração iniciado com o fornecedor do prontuário. É o maior investimento da TI até agora.',
          comentario: 'Atende a todos: tempo real para a urgência e carga noturna para análises e painéis.' }
      ],
      conceitos: ['qualidade_dados', 'fhir', 'momento_predicao'],
      conceito: 'Um modelo só usa a informação que chega a ele a tempo. A integração define o atraso (minutos, um dia, uma semana) e a qualidade do dado.',
      ra: ['RA3']
    },

    /* ------------------------------- DIA 3 ------------------------------- */
    {
      id: 'T3', setor: 'ti', day: 3, portes: TODOS, type: 'decisao',
      titulo: 'Quem pode ver os dados dos pacientes?',
      fase: 'CRISP-DM · Preparação dos dados · Privacidade (LGPD)',
      contexto: function (ctx) {
        var extra = ctx.flags.infra === 'nuvem' ? '<p class="nota">Como a infraestrutura é na nuvem, os dados vão sair do hospital: o encarregado de dados pede atenção redobrada.</p>' : '';
        return '<p>Dados de saúde são <b>dados pessoais sensíveis</b>. Todas as equipes pedem acesso, e o encarregado de dados (DPO) quer saber como eles serão protegidos.</p>' +
          '<p>Lembre: o alerta da urgência precisa saber <b>de qual paciente</b> está falando.</p>' + extra;
      },
      caso: { titulo: 'O que diz a lei',
        texto: 'A LGPD (Lei 13.709/2018) classifica dados de saúde como sensíveis (arts. 5º e 11). A Autoridade Nacional de Proteção de Dados (ANPD) pode aplicar a instituições privadas multa de até 2% do faturamento, limitada a R$ 50 milhões por infração; órgãos públicos não recebem multa, mas estão sujeitos às demais sanções, como advertência e publicização da infração — além do dano à confiança dos pacientes.',
        fonte: 'Lei 13.709/2018 (LGPD), arts. 5º, 11 e 52' },
      pergunta: 'Que regra de acesso você adota?',
      opcoes: [
        { id: 'aberto', label: 'Liberar os dados completos, com nome, para toda a equipe dos projetos — para agilizar.', custo: 0,
          fx: function (ctx) { return { conformidade: ctx.flags.infra === 'nuvem' ? -16 : -12, eficiencia: 3 }; },
          flags: { lgpd: 'aberto' }, q: 0,
          consequencia: 'As equipes comemoraram. O encarregado de dados registrou sua discordância por escrito.',
          comentario: 'Fere os princípios de necessidade e segurança da LGPD. Quanto mais gente acessa dado com nome, maior a chance de vazamento.' },
        { id: 'pseudo', label: 'Trocar nome e documentos por um código (pseudonimizar), dar acesso só a quem precisa, registrar quem acessou o quê e usar só os dados necessários.', custo: 60,
          fx: function (ctx) { return { conformidade: ctx.flags.infra === 'nuvem' ? 13 : 10, eficiencia: -1 }; },
          flags: { lgpd: 'pseudo' }, q: 2,
          consequencia: 'Regras aprovadas pelo encarregado de dados. O acesso ficou um pouco mais lento, e cada consulta deixa rastro.',
          comentario: 'Pseudonimizar mantém possível — e controlado — saber de quem é o dado, que é o que a assistência precisa. Acesso mínimo e registro completam a proteção.' },
        { id: 'anonimo', label: 'Apagar de vez qualquer identificação (anonimizar) — inclusive nos dados do alerta da urgência.', custo: 40,
          fx: { conformidade: 8, seguranca: -2 }, flags: { lgpd: 'anonimo' }, q: 1,
          consequencia: 'Privacidade máxima. A urgência ainda não percebeu o que isso significa para os alertas.',
          comentario: 'Ótimo para pesquisa, inviável na assistência: um alerta anônimo não chega ao paciente que precisa de atendimento.' }
      ],
      conceitos: ['lgpd', 'pseudonimizacao', 'anonimizacao'],
      conceito: 'Pseudonimizar troca a identificação por um código que só quem tem autorização consegue reverter (necessário para cuidar do paciente). Anonimizar é irreversível (bom para pesquisa). O hospital é responsável pelos dados e não transfere essa responsabilidade.',
      ra: ['RA8']
    },

    /* ------------------------------- DIA 4 ------------------------------- */
    {
      id: 'T4', setor: 'ti', day: 4, portes: TODOS, type: 'decisao', apresentacao: 'cartas',
      titulo: 'Qual ferramenta vai virar o painel da gestão?',
      fase: 'Ciência de dados · Dashboard e BI',
      contexto: function (ctx) {
        var ind = G.p(ctx, {
          essencial: 'tempo de espera na urgência, ocupação de leitos, estoque de EPI e rastreabilidade dos medicamentos',
          regional: 'tempo de espera na urgência, ocupação de leitos, uso das 8 salas cirúrgicas, estoque e rastreabilidade dos medicamentos',
          alta: 'tempo de espera, ocupação de leitos e UTI, uso das 12 salas cirúrgicas, fila de transplantes, estoque, compras e rastreabilidade dos medicamentos'
        });
        var dados = ctx.flags.pipeline ? '<p class="nota">Integração escolhida no dia 2: <b>' + ({ manual: 'planilha semanal', etl: 'carga noturna', fhir: 'tempo real + carga noturna', redigitacao: 'redigitação' }[ctx.flags.pipeline] || ctx.flags.pipeline) + '</b>.</p>' : '';
        return '<p>A diretoria quer <b>controle total</b> dos indicadores do hospital num só lugar: ' + ind + '.</p>' +
          '<p>Hoje cada setor tem sua planilha — e cada um calcula o tempo de espera de um jeito. Vire as cartas, compare <b>custo, prazo de implantação e o que dizem outros hospitais</b>.</p>' + dados;
      },
      caso: { titulo: 'Uma “torre de controle” para o hospital',
        texto: 'Em 2016, o Johns Hopkins Hospital abriu um centro de comando com painéis em tempo real de leitos, transferências e fluxo de pacientes. O hospital relatou mais transferências aceitas e menos tempo de espera por leito — porque todos passaram a olhar os mesmos números.',
        fonte: 'Johns Hopkins Medicine, Capacity Command Center (2016)' },
      pergunta: 'Qual ferramenta você escolhe?',
      opcoes: [
        { id: 'pep', label: 'Módulo de indicadores do prontuário', custo: 60,
          fx: function (c) { return c.porte === 'essencial' ? { eficiencia: 4, dados: 3, confianca: 2 } : { eficiencia: 3, dados: 2 }; },
          flags: { dashboard: 'pep' }, q: function (c) { return c.porte === 'essencial' ? 2 : 1; },
          carta: { icone: 'tela', cor: '#2E4A7A', subt: 'Painéis prontos dentro do próprio prontuário', estrelas: 3,
            atributos: [['Custo no 1º ano', 60], ['Implantação', '4 semanas'], ['Enxerga', 'só o que está no prontuário'], ['Personalizar', 'pouco: painéis prontos']],
            depoimentos: ['“Ligamos em um mês e a equipe já sabia usar.” — gerente de um hospital de 100 leitos', '“Não conseguimos cruzar com o estoque da farmácia, que é outro sistema.” — diretora de um hospital regional'] },
          consequencia: 'O módulo foi ativado. Os painéis prontos já mostram espera e ocupação.',
          comentario: 'Barato e rápido. Num hospital pequeno, com poucos sistemas, costuma bastar; em hospitais maiores, não enxerga farmácia, estoque e bloco.' },
        { id: 'bi', label: 'Plataforma de BI de mercado', custo: 180,
          fx: function (c) { return integrado(c) ? { dados: 6, eficiencia: 3, confianca: 2 } : { dados: 2, eficiencia: 1 }; },
          flags: { dashboard: 'bi' }, q: function (c) { return c.porte === 'essencial' ? 1 : (integrado(c) ? 2 : 1); },
          carta: { icone: 'grafico', cor: '#2C7A7B', subt: 'Junta prontuário, farmácia, estoque e agenda num painel só', estrelas: 4,
            atributos: [['Custo no 1º ano', 180], ['Implantação', '10 semanas'], ['Enxerga', 'qualquer sistema — se os dados estiverem integrados'], ['Personalizar', 'total; precisa de um analista treinado']],
            depoimentos: ['“Depois que os dados chegaram, a diretoria passou a abrir o painel toda manhã.” — gestor de um hospital de 300 leitos', '“Os três primeiros meses foram só limpando dado.” — analista de BI'] },
          consequencia: 'Licenças compradas e um analista designado. O painel depende de os dados chegarem limpos.',
          comentario: 'A ferramenta mais completa, mas só brilha com dados integrados (dia 2) e alguém para cuidar dela. Sem integração, vira um painel bonito sem dado.' },
        { id: 'aberto', label: 'Ferramenta de código aberto', custo: 120,
          fx: { dados: 4, eficiencia: 1, conformidade: 1 }, flags: { dashboard: 'aberto' }, q: 1,
          carta: { icone: 'chave', cor: '#2F8F6F', subt: 'Sem licença; instalada e mantida pela TI do hospital', estrelas: 3,
            atributos: [['Custo no 1º ano', 120], ['Implantação', '12 semanas'], ['Enxerga', 'o que a TI conseguir conectar'], ['Personalizar', 'total, se houver quem programe']],
            depoimentos: ['“Economizamos na licença e investimos em gente.” — coordenador de TI', '“Quando o analista saiu, ninguém sabia mexer.” — gerente de um hospital filantrópico'] },
          consequencia: 'Servidor preparado; um analista da TI vai dedicar metade do tempo ao painel.',
          comentario: 'Sem custo de licença, mas o custo vira equipe e prazo. Funciona quando a TI tem gente para manter — senão, depende de uma única pessoa.' },
        { id: 'consultoria', label: 'Consultoria com painel pronto', custo: 260,
          fx: { eficiencia: 3, dados: -1, confianca: 1 }, flags: { dashboard: 'consultoria' }, q: function (c) { return c.porte === 'essencial' ? 0 : 1; },
          carta: { icone: 'maleta', cor: '#B7791F', subt: 'Entrega em 3 semanas, com visual caprichado', estrelas: 4,
            atributos: [['Custo no 1º ano', 260], ['Implantação', '3 semanas'], ['Enxerga', 'o que a consultoria definir'], ['Personalizar', 'só com novo contrato']],
            depoimentos: ['“Ficou lindo na reunião do conselho.” — diretor de um hospital privado', '“Ninguém aqui sabe explicar como o tempo de espera é calculado.” — enfermeira-chefe'] },
          consequencia: 'Contrato assinado. O painel fica pronto antes de qualquer outra opção.',
          comentario: 'Rápido e bonito, mas as regras de cálculo dos indicadores ficam fora do hospital, e cada ajuste vira um novo contrato.' },
        { id: 'planilha', label: 'Continuar com as planilhas de cada setor', custo: 0,
          fx: { dados: -4, eficiencia: -2, confianca: -2 }, flags: { dashboard: 'planilha' }, q: 0,
          carta: { icone: 'tabela', cor: '#8A8F98', subt: 'Já existe e não custa nada', estrelas: 2,
            atributos: [['Custo no 1º ano', 0], ['Implantação', 'nenhuma'], ['Enxerga', 'o que cada setor digitar'], ['Personalizar', 'cada setor faz do seu jeito']],
            depoimentos: ['“Cada reunião começa com 20 minutos discutindo qual número está certo.” — diretora de um hospital regional'] },
          consequencia: 'Nada muda. Cada setor segue com sua planilha.',
          comentario: 'Sem uma fonte única, cada setor tem “o seu” número — e a gestão não consegue agir sobre nenhum.' }
      ],
      conceitos: ['dashboard', 'kpi', 'fonte_unica', 'tco'],
      conceito: 'Antes da ferramenta vem a pergunta: que indicadores, calculados como, a partir de quais dados? A melhor ferramenta é a que cabe no tamanho do hospital, nos dados que já estão integrados e na equipe que vai mantê-la.',
      ra: ['RA8']
    },

    {
      id: 'TM', setor: 'ti', day: 4, portes: ALTA, type: 'decisao',
      titulo: 'Quem vai vigiar os modelos depois que eles entrarem em uso?',
      fase: 'Implantação · Monitoramento',
      contexto: function (ctx) {
        var v = ctx.flags.verba_mlops ? '<p class="nota bom">A diretoria aprovou verba para o acompanhamento dos modelos.</p>' :
          '<p class="nota">O pedido de verba para acompanhamento dos modelos não foi aprovado pela diretoria.</p>';
        var m = modeloAtual(ctx);
        return '<p>Modelos “envelhecem”: mudam os pacientes, os protocolos, os aparelhos. ' + (m ? 'O <b>' + m.nome + '</b> está prestes a entrar no plantão, ' : '') +
          'e o hospital também terá modelos na especialidade e no transplante.</p>' + v;
      },
      caso: { titulo: 'O mundo muda, o modelo não',
        texto: 'Durante a COVID-19, o número de alertas do modelo de sepse da Epic subiu cerca de 43% em poucas semanas: o perfil dos pacientes mudou e o modelo não acompanhou. É para isso que serve monitorar o modelo em uso.',
        fonte: 'Wong et al., JAMA Network Open, 2021' },
      pergunta: 'Como os modelos serão acompanhados?',
      opcoes: function (ctx) {
        return [
          { id: 'nenhum', label: 'Não acompanhar: o fornecedor garante o desempenho.', custo: 0,
            fx: { seguranca: -2 }, flags: { monit: 'nenhum' }, q: 0,
            consequencia: 'Nenhum custo adicional.', comentario: 'Desempenho não é garantia de contrato: muda com os pacientes, os protocolos e os aparelhos.' },
          { id: 'painel', label: 'Um painel que mostra todo mês quantos pacientes graves cada modelo encontrou, quantos alarmes foram falsos e se os dados de entrada mudaram — com alerta automático e revisão mensal com os médicos.',
            custo: ctx.flags.verba_mlops ? 20 : 120, fx: { seguranca: 4, dados: 4, confianca: 2 }, flags: { monit: 'painel' }, q: 2,
            consequencia: 'Painel no ar. A primeira revisão com o corpo clínico já está marcada.',
            comentario: 'Acompanhar acertos, alarmes falsos e mudanças nos dados — com revisão humana — faz parte do modelo, não é um extra.' },
          { id: 'auto', label: 'Retreinar os modelos sozinhos toda noite com os dados do dia, sem revisão humana.', custo: 60,
            fx: { dados: 1, seguranca: -3 }, flags: { monit: 'auto' }, q: 0,
            consequencia: 'Os modelos vão se atualizar sozinhos todas as noites.',
            comentario: 'Retreino sem revisão incorpora erros e cria um círculo vicioso: o modelo aprende com decisões que ele mesmo influenciou.' }
        ];
      },
      conceitos: ['deriva', 'monitoramento', 'retroalimentacao'],
      conceito: 'Depois da implantação, o mundo muda e o modelo não: a deriva piora o desempenho em silêncio. Acompanhar continuamente, com revisão humana, é parte do modelo.',
      ra: ['RA7', 'RA8']
    },

    /* ------------------------------- DIA 5 ------------------------------- */
    {
      id: 'T5', setor: 'ti', day: 5, portes: TODOS, type: 'decisao', estrutural: true,
      titulo: 'Crise: o sistema caiu!',
      fase: 'Implantação · Plano B (continuidade)',
      contexto: function (ctx) {
        var txt = {
          nuvem: '<b>05h40:</b> uma obra na rodovia rompeu a fibra do único link de internet. <b>Tudo o que está na nuvem ficou inacessível</b> — o alerta da urgência e os painéis. Previsão de volta: 6 a 10 horas.',
          local: '<b>03h15:</b> faltou energia e o nobreak antigo falhou. O servidor da IA desligou de repente e não voltou: um disco está danificado.',
          hibrida: '<b>05h40:</b> o link de internet caiu. O alerta da urgência, que roda no hospital, continua funcionando; os painéis e os treinos na nuvem pararam.'
        }[ctx.flags.infra] || '';
        return '<p class="destaque alerta">' + txt + '</p><p>A escolha do dia 1 está sendo testada. O plantão da manhã começa em 1 hora.</p>' + (ctx.flags.planoB ? '<p class="nota bom">A equipe ensaiou o plano B nesta semana (prioridade da reunião).</p>' : '');
      },
      caso: { titulo: 'Quando os computadores param',
        texto: 'Em 2017, o ataque WannaCry paralisou computadores do sistema de saúde inglês (NHS): cerca de 19 mil consultas foram canceladas e ambulâncias foram desviadas. O relatório oficial apontou que o plano de resposta nunca tinha sido testado nos hospitais — e que o ataque poderia ter sido evitado com práticas básicas de segurança, como manter os sistemas atualizados.',
        fonte: 'National Audit Office (Reino Unido), 2017' },
      pergunta: 'Como a TI responde?',
      opcoes: function (ctx) {
        var inf = ctx.flags.infra;
        var redund = { nuvem: 'contratar um segundo link de internet, de outra operadora', local: 'instalar um nobreak reserva e cópia de segurança diária fora do hospital', hibrida: 'documentar o procedimento de volta da sincronização' }[inf];
        var cRed = { nuvem: 60, local: 90, hibrida: 20 }[inf];
        var migra = { nuvem: 'comprar às pressas um servidor de emergência', local: 'subir tudo para a nuvem hoje mesmo, sem contrato de dados', hibrida: 'levar também a urgência para a nuvem' }[inf];
        var cMig = { nuvem: 200, local: 30, hibrida: 40 }[inf];
        return [
          { id: 'esperar', label: 'Esperar o sistema voltar; enquanto isso, nada muda no plantão.', custo: 0,
            fx: function (c) { return c.flags.infra === 'hibrida' ? { confianca: -2 } : { seguranca: -5, confianca: -4 }; }, flags: { contingencia: false }, q: 0,
            consequencia: 'O plantão descobriu sozinho que os alertas tinham parado.',
            comentario: 'Sem aviso nem plano B, a equipe confia num alerta que não existe — o pior cenário.' },
          { id: 'plano', label: 'Acionar o plano B: avisar o plantão que o alerta está fora, voltar ao protocolo manual com reforço na classificação de risco, registrar o incidente, descobrir a causa e ' + redund + '.',
            custo: cRed, fx: { seguranca: 3, confianca: 4, eficiencia: 3 }, flags: { contingencia: true }, q: 2,
            consequencia: 'O plantão foi avisado às 6h. A triagem manual reforçada funcionou e a causa já está documentada.',
            comentario: 'O atendimento não pode depender de um sistema estar no ar: aviso, protocolo manual, registro, causa e correção.' },
          { id: 'migrar', label: 'Resolver na pressa: ' + migra + '.', custo: cMig,
            fx: function (c) { return c.flags.infra === 'local' ? { conformidade: -10, eficiencia: 2 } : { eficiencia: -1, dados: -2 }; },
            flags: { contingencia: false }, q: 0,
            consequencia: 'A solução de emergência foi improvisada em poucas horas.',
            comentario: 'Mudança grande feita sob pressão, sem planejamento nem testes, troca um risco por outro.' }
        ];
      },
      conceitos: ['continuidade', 'infra_local', 'infra_nuvem', 'infra_hibrida'],
      conceito: 'Toda infraestrutura falha; muda o jeito de falhar. Nuvem depende da internet; local depende de energia, peças e equipe; mista reduz o impacto, mas é mais complexa. Um programa maduro tem plano B.',
      ra: ['RA8']
    },

    /* ------------------------------- DIA 6 ------------------------------- */
    {
      id: 'T6', setor: 'ti', day: 6, portes: TODOS, type: 'decisao', apresentacao: 'painel',
      titulo: 'Monte o painel que vai para a mesa da diretoria',
      fase: 'Visualização de dados · Painel de indicadores',
      contexto: function (ctx) {
        var ferr = G.FERRAMENTAS[ctx.flags.dashboard];
        return '<p>Na ferramenta escolhida' + (ferr ? ' (<b>' + ferr.toLowerCase() + '</b>)' : '') + ', a tela principal tem espaço para <b>exatamente 4 gráficos</b>. ' +
          'A diretoria vai olhar este painel toda manhã para decidir onde agir.</p>' +
          '<p>Escolha as 4 visualizações. Pense: <b>o gráfico mostra o que precisa de ação? É fácil de ler em 5 segundos?</b></p>';
      },
      caso: { titulo: 'O gráfico que mudou um hospital',
        texto: 'Em 1858, a enfermeira Florence Nightingale desenhou um gráfico em “rosa” mostrando que a maioria dos soldados da Guerra da Crimeia morria de doenças evitáveis nos hospitais, e não de ferimentos. O gráfico ajudou a convencer o governo britânico a reformar o saneamento hospitalar.',
        fonte: 'Nightingale, “Notes on Matters Affecting the Health… of the British Army”, 1858' },
      pergunta: 'Quais 4 visualizações vão para o painel?',
      multi: { min: 4, max: 4 },
      opcoes: function () {
        return G.VIS_ORDEM.map(function (k) { var v = G.VISUALIZACOES[k]; return { id: k, label: v.label, detalhe: v.detalhe, grafico: v.grafico }; });
      },
      combinar: function (ctx, ids) {
        var bons = ids.filter(function (k) { return G.VISUALIZACOES[k] && G.VISUALIZACOES[k].bom; });
        var ruins = ids.filter(function (k) { return G.VISUALIZACOES[k] && !G.VISUALIZACOES[k].bom; });
        var n = bons.length;
        var q = n === 4 ? 2 : (n === 3 ? 1 : 0);
        var fx = n === 4 ? { eficiencia: 5, dados: 4, confianca: 3 } : (n === 3 ? { eficiencia: 2, dados: 2 } : { eficiencia: -2, dados: -2, confianca: -1 });
        if (ctx.flags.dashboard === 'planilha') fx = { eficiencia: Math.min(fx.eficiencia, 0), dados: -2 };
        return {
          label: ids.map(function (k) { return (G.VISUALIZACOES[k] || {}).label || k; }).join(' · '), custo: 0,
          fx: fx, flags: { painel: ids.slice(), painelBons: n }, q: q,
          consequencia: n === 4 ? 'A diretoria entendeu o painel na primeira olhada e já pediu uma ação para a ocupação da tarde.' :
            (n === 3 ? 'O painel ajuda, mas um dos gráficos gera mais perguntas do que respostas.' : 'A diretoria olhou o painel e perguntou: “E então, onde eu preciso agir?”'),
          comentario: (n === 4 ? 'Quatro gráficos que levam à ação.' : 'Gráficos que confundem: ' + ruins.map(function (k) { return G.VISUALIZACOES[k].porque; }).join(' ')) +
            ' Boas escolhas: mediana e percentil para espera, mapa de calor para ocupação, barras com meta para rastreabilidade e dias de cobertura para estoque.'
        };
      },
      conceitos: ['visualizacao', 'mediana', 'percentil', 'mapa_calor', 'kpi'],
      conceito: 'Um bom painel mostra poucos indicadores que pedem ação, no gráfico certo para cada pergunta: tendência em linha, comparação em barras ordenadas, padrão no tempo em mapa de calor. A média engana quando poucos esperam muito; pizzas 3D e velocímetros mais confundem do que informam.',
      ra: ['RA5']
    }
  );
})(window.GAME);
