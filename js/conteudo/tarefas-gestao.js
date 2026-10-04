/* ==========================================================================
   PLANTÃO IA — Diretoria e Compras
   ========================================================================== */
(function (G) {
  'use strict';
  var TODOS = G.TODOS, RA = ['regional', 'alta'], ALTA = ['alta'];
  var M = G.MODELS, esc = G.esc;
  function modeloAtual(ctx) { return M[ctx.flags.modelo] || null; }
  function trecho(ctx, id) {
    var d = ctx.dec(id); if (!d || !d.justificativa) return '';
    return '<blockquote class="citacao"><span>' + esc(d.jogador) + ' escreveu:</span>' + esc(d.justificativa) + '</blockquote>';
  }

  G.TASKS.push(

    /* ------------------------------- DIA 1 ------------------------------- */
    {
      id: 'G1', setor: 'diretoria', day: 1, portes: TODOS, type: 'decisao',
      titulo: 'Como saber se o programa de IA deu certo?',
      fase: 'CRISP-DM · Entendimento do negócio',
      contexto: function () {
        return '<p>Antes de gastar um real, o conselho quer saber <b>qual será a régua</b> para julgar o programa. Fornecedores já ligaram oferecendo “IA com 95% de acurácia”.</p>' +
          '<p>O critério que você aprovar hoje será usado por todas as frentes — e pelos fornecedores.</p>';
      },
      caso: { titulo: 'Sepse: medir pelo paciente, não pela acurácia',
        texto: 'O alerta de sepse TREWS, do Johns Hopkins, foi avaliado pelo que importa: num estudo observacional em 5 hospitais, quando a equipe confirmava o alerta em até 3 horas, a mortalidade foi cerca de 19% menor em termos relativos (3,3 pontos percentuais a menos).',
        fonte: 'Adams et al., Nature Medicine, 2022' },
      pergunta: 'Que critério de sucesso você leva ao conselho?',
      opcoes: [
        { id: 'a', label: 'Acurácia acima de 90% em todos os modelos contratados.', detalhe: 'Simples de comunicar e de conferir nos folhetos dos fornecedores.',
          fx: { confianca: -2 }, flags: { criterio: 'acuracia' }, q: 0,
          consequencia: 'A régua é fácil de comunicar — e todos os fornecedores dizem cumpri-la.',
          comentario: 'Acurácia engana quando o desfecho é raro: se 8% dos pacientes pioram, um modelo que diz “ninguém vai piorar” acerta 92%. O sucesso deve ser medido pela decisão clínica que melhora.' },
        { id: 'b', label: 'Reconhecer a tempo pelo menos 8 de cada 10 pacientes que vão precisar de UTI, com um número de alertas que o plantão consiga atender — e acompanhar óbitos evitáveis e tempo até a UTI.',
          detalhe: 'Mais difícil de medir: exige acompanhar o que aconteceu com os pacientes.',
          fx: { seguranca: 4, confianca: 3 }, flags: { criterio: 'clinico' }, q: 2,
          consequencia: 'O corpo clínico se reconhece no objetivo. A TI avisa que medir desfecho vai exigir dados integrados.',
          comentario: 'Critério ligado ao paciente (reconhecer quem vai piorar), com a métrica certa para desfecho raro (sensibilidade) e um limite prático (carga de alertas). É o que a fase 1 do CRISP-DM pede.' },
        { id: 'c', label: 'Ter pelo menos três soluções de IA funcionando até o fim do ano.', detalhe: 'Mostra inovação para a comunidade.', portes: RA,
          fx: { confianca: -3, eficiencia: -1 }, flags: { criterio: 'quantidade' }, q: 0,
          consequencia: 'A assessoria de imprensa gostou. O corpo clínico perguntou: “três soluções para quê?”.',
          comentario: 'É meta de entrega (quantas ferramentas), não de resultado (que decisão melhorou).' },
        { id: 'd', label: 'Reduzir em 20% o custo por atendimento na urgência.', detalhe: 'Alinha o programa à sustentabilidade financeira.',
          fx: { eficiencia: 2, seguranca: -2 }, flags: { criterio: 'custo' }, q: 1,
          consequencia: 'A diretoria financeira apoiou. Parte da equipe teme que a IA vire ferramenta de corte de custos.',
          comentario: 'Legítimo, mas sozinho desalinha incentivos: o modelo que mais economiza pode ser o que menos protege o paciente. Funciona como critério secundário.' }
      ],
      conceitos: ['crispdm', 'acuracia', 'prevalencia'],
      conceito: 'Fase 1 do CRISP-DM: o sucesso de um projeto de dados é definido pelo problema — clínico ou de gestão — antes de qualquer modelo. Uma métrica técnica só é bom critério quando está ligada à decisão que o modelo vai apoiar.',
      ra: ['RA3', 'RA5']
    },

    {
      id: 'F1', setor: 'compras', day: 1, portes: ALTA, type: 'decisao',
      titulo: 'O que o setor de compras vai prever?',
      fase: 'CRISP-DM · Entendimento do negócio · Previsão',
      contexto: function () {
        return '<p>O almoxarifado compra <b>EPI</b> (máscaras, luvas, aventais), <b>medicamentos</b> e materiais. Os fornecedores entregam em <b>15 a 30 dias</b>.</p>' +
          '<p>No último ano, faltou luva duas vezes, faltou soro na epidemia de dengue — e o hospital jogou fora R$ 380 mil em medicamentos vencidos.</p>';
      },
      caso: { titulo: 'A lição de 2020',
        texto: 'Na pandemia de COVID-19, hospitais do mundo inteiro ficaram sem máscaras N95/PFF2 e aventais. Quem tinha previsão de demanda e estoque estratégico conseguiu proteger melhor a equipe.',
        fonte: 'Relatos amplamente documentados em 2020 (OMS, ministérios da saúde)' },
      pergunta: 'Que previsão o setor de compras vai construir?',
      opcoes: [
        { id: 'semanal30', label: 'O consumo semanal de cada item crítico (EPI, antibióticos, soros), com 30 dias de antecedência — o tempo de entrega do fornecedor.',
          fx: { eficiencia: 3, dados: 1 }, flags: { alvoCompras: 'semanal30' }, q: 2,
          consequencia: 'A previsão casa com a decisão: dá tempo de comprar antes de faltar.',
          comentario: 'Horizonte igual ao tempo de entrega e granularidade útil (item e semana): a previsão chega a tempo de mudar a compra.' },
        { id: 'anual', label: 'O gasto total do ano com materiais.',
          fx: { eficiencia: 0 }, flags: { alvoCompras: 'anual' }, q: 1,
          consequencia: 'Bom para o orçamento. Não diz quando comprar luvas.',
          comentario: 'Serve ao planejamento financeiro, não à reposição do estoque.' },
        { id: 'dia', label: 'O consumo do dia seguinte de cada item.',
          fx: { eficiencia: -1 }, flags: { alvoCompras: 'dia' }, q: 0,
          consequencia: 'Previsão precisa — e inútil para comprar: o fornecedor leva semanas.',
          comentario: 'Horizonte menor que o tempo de reação: quando a previsão avisa, já não dá para comprar.' },
        { id: 'dobro', label: 'Não prever nada: comprar sempre o dobro do mês anterior, por segurança.',
          custo: 120, fx: { eficiencia: -3 }, flags: { alvoCompras: 'dobro' }, q: 0,
          consequencia: 'O almoxarifado lotou. A farmácia avisa que vários itens vencem em 6 meses.',
          comentario: 'Estoque sem previsão vira dinheiro parado e medicamento vencido — e ainda pode faltar o item que mudou de padrão.' }
      ],
      conceitos: ['previsao', 'horizonte', 'serie_temporal'],
      conceito: 'Uma previsão só ajuda se chegar antes da decisão: o horizonte deve ser pelo menos igual ao tempo de reação (aqui, o prazo do fornecedor).',
      ra: ['RA2', 'RA3']
    },

    /* ------------------------------- DIA 2 ------------------------------- */
    {
      id: 'G2', setor: 'diretoria', day: 2, portes: TODOS, type: 'decisao', apresentacao: 'g2',
      titulo: 'Leve 3 dos 5 modelos para o corpo clínico avaliar',
      fase: 'Avaliação · Métricas e custo',
      multi: { min: 3, max: 3 },
      referencia: 'Qualquer trio sem o TriAI Premium (resultados de treino e vazamento) e sem o AcuraMax (paradoxo da acurácia): SentinelaTriage, DeepVital e EscoreLocal.',
      contexto: function (ctx) {
        var linhas = G.MODEL_ORDER.map(function (k) {
          var m = M[k];
          return ['<b>' + m.nome + '</b><br><small>' + m.tecnica + '</small>', m.acc + '%', m.sens + '%', m.esp + '%', m.auc,
            G.fmtc(ctx, m.custo) + '/ano', '<small>' + m.validacao + '<br><i>' + m.obs + '</i></small>'];
        });
        return '<p>Cinco soluções prometem prever <b>quem vai piorar (UTI ou óbito em 48h)</b> a partir dos dados da triagem. Na urgência do hospital, <b>8 em cada 100</b> pacientes triados têm esse desfecho.</p>' +
          G.tbl(['Modelo', 'Acurácia', 'Sensibilidade', 'Especificidade', 'AUC', 'Custo', 'Validação e observações'], linhas, 'tbl-modelos');
      },
      caso: { titulo: 'Um modelo famoso que falhou fora de casa',
        texto: 'O modelo de sepse da Epic, usado em centenas de hospitais americanos, foi testado de forma independente na Universidade de Michigan: AUC de 0,63 e 67% dos casos de sepse sem alerta.',
        fonte: 'Wong et al., JAMA Internal Medicine, 2021' },
      pergunta: 'Quais três modelos seguem para o corpo clínico?',
      opcoes: G.MODEL_ORDER.map(function (k) {
        var m = M[k];
        return { id: k, label: m.nome, detalhe: m.tecnica, custo: m.custo * 0.2 };
      }),
      combinar: function (ctx, ids) {
        var armadilhas = ids.filter(function (k) { return k === 'D' || k === 'E'; }).length;
        var custo = ids.reduce(function (s, k) { return s + M[k].custo * 0.2; }, 0);
        var coment = {
          A: 'SentinelaTriage: bom equilíbrio entre sensibilidade e especificidade, testado em hospitais brasileiros e explica cada alerta.',
          B: 'DeepVital: bom desempenho, mas testado só nos EUA (outra população), caixa-preta e dependente de GPU.',
          C: 'EscoreLocal: menos preciso e com mais alarmes falsos, mas barato, transparente e testado no próprio hospital.',
          D: 'TriAI Premium: números do treino e uma variável que denuncia a decisão já tomada (pedido de vaga de UTI) — vazamento. Desempenho quase perfeito em saúde é sinal de alerta.',
          E: 'AcuraMax: 92% de acurácia é o que se obtém dizendo “não” para todos. Sensibilidade de 15% = 85 de cada 100 pacientes graves sem alerta.'
        };
        return {
          label: ids.map(function (k) { return M[k].nome; }).join(', '), custo: custo,
          fx: { seguranca: -3 * armadilhas, confianca: armadilhas ? -2 * armadilhas : 2, dados: armadilhas ? 0 : 2 },
          flags: { shortlist: ids.slice() },
          q: armadilhas === 0 ? 2 : (armadilhas === 1 ? 1 : 0),
          consequencia: 'Os modelos ' + ids.map(function (k) { return M[k].nome; }).join(', ') + ' seguem para a reunião com o corpo clínico.',
          comentario: ids.map(function (k) { return coment[k]; }).join(' ')
        };
      },
      conceitos: ['acuracia', 'sensibilidade', 'especificidade', 'auc', 'vazamento', 'validacao_externa'],
      conceito: 'Escolher modelos não é escolher o maior número. Acurácia engana com desfecho raro; resultados de treino escondem sobreajuste; uma variável que só existe depois da decisão (vazamento) produz desempenho irreal; e teste em outra população não garante desempenho aqui.',
      ra: ['RA5', 'RA6', 'RA7']
    },

    /* ------------------------------- DIA 3 ------------------------------- */
    {
      id: 'G3', setor: 'diretoria', day: 3, portes: ALTA, type: 'decisao',
      titulo: 'Comitê de investimento: aprove até 2 de 4 pedidos',
      fase: 'Gestão do portfólio de IA',
      multi: { min: 1, max: 2 },
      referencia: 'Sem combinação única: vale a coerência com os riscos de cada frente. O relatório mostra o que aconteceu com quem ficou sem verba.',
      contexto: function (ctx) {
        return '<p>As frentes pediram verba extra. Saldo atual: <b>' + G.fmt(ctx.ind.orcamento) + '</b>. Você pode aprovar <b>no máximo dois</b> pedidos. Quem não receber segue trabalhando — sem esse recurso.</p>';
      },
      pergunta: 'Quais pedidos você aprova?',
      opcoes: [
        { id: 'mlops', label: 'TI — Acompanhar os modelos depois da implantação', detalhe: 'Painel que avisa quando um modelo começa a errar mais.', custo: 120 },
        { id: 'validacao', label: 'Especialidades — Testar o modelo em outro hospital', detalhe: 'Validação externa e revisão do padrão-ouro com especialistas.', custo: 140 },
        { id: 'agenda', label: 'Bloco cirúrgico — Ligar a agenda cirúrgica ao modelo de previsão', detalhe: 'O modelo passa a enxergar as cirurgias já marcadas.', custo: 90 },
        { id: 'barras', label: 'Farmácia — Leitores de código de barras à beira do leito', detalhe: 'Cada dose registrada do lote ao paciente (rastreabilidade).', custo: 110 }
      ],
      combinar: function (ctx, ids) {
        var custos = { mlops: 120, validacao: 140, agenda: 90, barras: 110 };
        var nomes = { mlops: 'acompanhamento dos modelos (TI)', validacao: 'validação externa (Especialidades)', agenda: 'agenda no modelo (Bloco)', barras: 'código de barras (Farmácia)' };
        var custo = ids.reduce(function (s, k) { return s + custos[k]; }, 0);
        return {
          label: 'Aprovados: ' + ids.map(function (k) { return nomes[k]; }).join(' e '), custo: custo,
          fx: { confianca: 1, dados: 2 },
          flags: { verba_mlops: ids.indexOf('mlops') >= 0, verba_validacao: ids.indexOf('validacao') >= 0, verba_agenda: ids.indexOf('agenda') >= 0, verba_barras: ids.indexOf('barras') >= 0 },
          q: null,
          consequencia: 'Verba liberada para ' + ids.map(function (k) { return nomes[k]; }).join(' e ') + '.',
          comentario: 'Não há combinação certa: os quatro pedidos sustentam modelos depois do piloto. O que pesa é a coerência com os riscos de cada frente.'
        };
      },
      conceitos: ['monitoramento', 'validacao_externa', 'rastreabilidade'],
      conceito: 'Gestão de portfólio: o custo de um modelo não termina na compra. Acompanhamento, validação externa e boa coleta de dados são o que mantêm um modelo bom depois do piloto.',
      ra: ['RA8']
    },

    {
      id: 'F3', setor: 'compras', day: 3, portes: TODOS, type: 'decisao',
      titulo: 'Quais dados usar para prever compras?',
      fase: 'CRISP-DM · Preparação dos dados',
      contexto: function (ctx) {
        return '<p>O histórico de saídas do almoxarifado vai de 2019 a 2025. Três detalhes chamam a atenção:</p><ul>' +
          '<li>em <b>2020</b>, o consumo de EPI explodiu (pandemia);</li>' +
          '<li>em <b>2024</b>, a epidemia de <b>dengue</b> fez disparar soro, dipirona e paracetamol;</li>' +
          '<li>nos dias em que um item <b>faltou no estoque</b>, o sistema registrou consumo <b>zero</b> — porque nada saiu.</li></ul>' +
          (ctx.flags.alvoCompras === 'dobro' ? '<p class="nota alerta">Hoje o almoxarifado compra “o dobro do mês anterior”. A diretoria pediu uma previsão de verdade.</p>' : '');
      },
      caso: { titulo: 'Dengue 2024',
        texto: 'Em 2024 o Brasil teve a maior epidemia de dengue da sua história, com mais de 6 milhões de casos prováveis. Hospitais viram o consumo de soro e analgésicos disparar em poucas semanas.',
        fonte: 'Ministério da Saúde, painel de arboviroses, 2024' },
      pergunta: 'Como preparar o histórico de consumo?',
      opcoes: [
        { id: 'bruto', label: 'Usar a saída registrada do estoque como está — é o dado oficial.',
          fx: { dados: -4 }, flags: { prepCompras: 'bruto' }, q: 0,
          consequencia: 'A previsão ficou pronta rápido. Ela acha que os itens que faltaram eram pouco usados.',
          comentario: 'Nos dias de falta, “consumo zero” não significa que ninguém precisou: a demanda ficou escondida. O modelo aprende a comprar menos justamente o que falta.' },
        { id: 'corrigido', label: 'Corrigir os dias de falta (estimar a demanda real com pedidos não atendidos), marcar a pandemia e a dengue como períodos atípicos e considerar as estações do ano.',
          fx: { dados: 6, eficiencia: 2 }, flags: { prepCompras: 'corrigido' }, q: 2,
          consequencia: 'Deu trabalho — a farmácia ajudou a recuperar os pedidos não atendidos. A série agora mostra a demanda de verdade.',
          comentario: 'Separa “o que saiu” de “o que era preciso”, sinaliza eventos atípicos em vez de ignorá-los e respeita a sazonalidade.' },
        { id: 'curto', label: 'Usar só os últimos 3 meses, para fugir da pandemia e da dengue.',
          fx: { dados: -1 }, flags: { prepCompras: 'curto' }, q: 1,
          consequencia: 'Série limpa e curta. O inverno e o verão não aparecem nela.',
          comentario: 'Evita distorções, mas perde a sazonalidade: a previsão não sabe que a dengue volta todo verão.' },
        { id: 'externo', label: 'Usar uma base pronta de consumo de hospitais dos EUA.', portes: RA,
          custo: 40, fx: { dados: -3 }, flags: { prepCompras: 'externo' }, q: 0,
          consequencia: 'A base é enorme. Não tem dengue.',
          comentario: 'Outra população, outras doenças e outros protocolos: o padrão de consumo não se transfere.' }
      ],
      conceitos: ['demanda_censurada', 'sazonalidade', 'qualidade_dados'],
      conceito: 'Dado registrado nem sempre é o fenômeno real: quando o item falta, o consumo registrado subestima a necessidade (demanda escondida). Preparar dados é separar o que aconteceu do que se quer prever.',
      ra: ['RA3', 'RA7']
    },

    /* ------------------------------- DIA 4 ------------------------------- */
    {
      id: 'G4', setor: 'diretoria', day: 4, portes: TODOS, type: 'decisao',
      titulo: 'Que contrato assinar para o modelo escolhido?',
      fase: 'Implantação · Contrato',
      contexto: function (ctx) {
        var m = modeloAtual(ctx); if (!m) return '<p>Aguardando a escolha do modelo.</p>';
        var gpu = m.gpu ? (ctx.flags.infra === 'local'
          ? '<p class="nota alerta">O DeepVital precisa de GPU dedicada; nos servidores do hospital, vai disputar a máquina com outros projetos.</p>'
          : '<p class="nota alerta">O DeepVital precisa de GPU dedicada: há ' + G.fmtc(ctx, 60) + '/ano de GPU na nuvem incluídos abaixo.</p>') : '';
        return '<p>O corpo clínico escolheu o <b>' + m.nome + '</b>. Licença anual: <b>' + G.fmtc(ctx, m.custo) + '</b>.</p>' + gpu + trecho(ctx, 'M2');
      },
      caso: { titulo: 'IA também é dispositivo médico',
        texto: 'No Brasil, software usado para diagnóstico ou tratamento pode ser dispositivo médico e precisa de regularização na Anvisa (RDC 657/2022). Vale perguntar ao fornecedor se o produto está regularizado.',
        fonte: 'Anvisa, RDC nº 657/2022' },
      pergunta: 'Que contrato você assina?',
      opcoes: function (ctx) {
        var m = modeloAtual(ctx); var base = m ? m.custo + (m.gpu && ctx.flags.infra !== 'local' ? 60 : 0) : 0;
        return [
          { id: 'padrao', label: 'Contrato padrão do fornecedor: preço cheio, sem cláusulas extras.', custo: base,
            fx: { conformidade: -4 }, flags: { contrato: 'padrao' }, q: 0,
            consequencia: 'Assinado em um dia.',
            comentario: 'Sem teste local, sem resultados por grupo de pacientes, sem regras de dados e incidentes: o hospital compra um arquivo, não um processo.' },
          { id: 'robusto', label: 'Negociar: teste no hospital antes do uso pleno, resultados por grupo de pacientes, auditoria, aviso de incidentes, controle de versões e cláusula de proteção de dados (LGPD).',
            custo: Math.round(base * 1.15), fx: { conformidade: 8, confianca: 3, seguranca: 2 }, flags: { contrato: 'robusto' }, q: 2,
            consequencia: 'Uma semana de negociação e 15% a mais no preço. O jurídico ficou satisfeito.',
            comentario: 'Contrata-se um processo: validação local, transparência, versões controladas, incidentes e regras claras sobre os dados.' },
          { id: 'dados', label: 'Pedir 40% de desconto em troca de ceder os dados dos pacientes para o fornecedor treinar outros produtos.', portes: RA,
            custo: Math.round(base * 0.6), fx: { conformidade: -12, confianca: -4 }, flags: { contrato: 'dados' }, q: 0,
            consequencia: 'Desconto obtido. O fornecedor ficou muito interessado nos dados.',
            comentario: 'Dados de pacientes não são moeda de troca: uso sem base legal nem finalidade compatível com a LGPD.' },
          { id: 'silencioso', label: 'Contrato de 3 meses de “piloto silencioso”: o modelo roda escondido, sem gerar alertas, e a renovação depende do resultado no hospital.',
            custo: Math.round(base * 0.35), fx: { seguranca: 1, eficiencia: -1, confianca: 2, dados: 2 }, flags: { contrato: 'silencioso' }, q: 2,
            consequencia: 'Por 3 meses, compara-se o que o modelo diria com o que de fato aconteceu.',
            comentario: 'Validação no próprio hospital antes de qualquer impacto no paciente: o jeito mais seguro de descobrir se o desempenho se mantém aqui.' }
        ];
      },
      conceitos: ['governanca', 'validacao_externa', 'lgpd'],
      conceito: 'Contratar IA em saúde é contratar um processo: validação local, transparência por grupo de pacientes, controle de versões, incidentes e regras claras sobre os dados.',
      ra: ['RA8']
    },

    /* ------------------------------- DIA 5 ------------------------------- */
    {
      id: 'G5', setor: 'diretoria', day: 5, portes: RA, type: 'decisao',
      titulo: 'Quem responde pelos modelos do hospital?',
      fase: 'Governança de IA',
      contexto: function () {
        return '<p>Com várias ferramentas de IA em andamento e uma crise de infraestrutura hoje, o conselho pergunta: <b>quem aprova, acompanha e responde pelos modelos?</b></p>';
      },
      caso: { titulo: 'Orientação da OMS',
        texto: 'A Organização Mundial da Saúde publicou em 2021 seis princípios para IA em saúde — entre eles transparência, responsabilização e equidade — e recomenda estruturas de governança nas instituições.',
        fonte: 'OMS, Ethics and governance of artificial intelligence for health, 2021' },
      pergunta: 'Que estrutura de governança você cria?',
      opcoes: [
        { id: 'nenhuma', label: 'Nenhuma estrutura nova: cada setor cuida do seu modelo.', fx: { conformidade: -4 }, flags: { gov: 'nenhuma' }, q: 0,
          consequencia: 'Cada setor segue com autonomia total.', comentario: 'Sem governança, viés, deriva e incidentes ficam sem dono.' },
        { id: 'comite', label: 'Comitê de IA multiprofissional (médicos, enfermagem, farmácia, TI, jurídico/encarregado de dados e um representante de pacientes): lista de modelos em uso, aprovação antes de usar, revisão de viés e canal para notificar incidentes.',
          custo: 40, fx: { conformidade: 8, confianca: 4, seguranca: 2 }, flags: { gov: 'comite' }, q: 2,
          consequencia: 'O Comitê de IA fez a primeira reunião e começou a lista de modelos em uso.',
          comentario: 'Responde às três perguntas da governança: quem aprova, quem acompanha e para onde vai um incidente.' },
        { id: 'fornecedor', label: 'Deixar a governança com o fornecedor de cada modelo.', fx: { conformidade: -6 }, flags: { gov: 'fornecedor' }, q: 0,
          consequencia: 'Os fornecedores mandaram seus termos de uso.', comentario: 'O fornecedor não responde pelo uso clínico no hospital — e tem conflito de interesse.' },
        { id: 'ti', label: 'Nomear uma pessoa da TI como “responsável por IA”, que aprova tudo.', custo: 15,
          fx: { conformidade: 2, confianca: -2 }, flags: { gov: 'ti' }, q: 1,
          consequencia: 'Um analista sênior foi nomeado.', comentario: 'Dá um dono, mas sem visão clínica, ética ou jurídica — e concentra tudo em uma pessoa.' }
      ],
      conceitos: ['governanca', 'vies', 'responsabilidade'],
      conceito: 'Governança de IA responde: quem aprova um modelo antes do uso, quem acompanha depois e para onde vai um incidente.',
      ra: ['RA8']
    },

    {
      id: 'F5', setor: 'compras', day: 5, portes: ALTA, type: 'decisao',
      titulo: 'Como transformar a previsão em compra?',
      fase: 'Implantação · Incerteza e estoque de segurança',
      contexto: function (ctx) {
        var ruim = ctx.flags.prepCompras === 'bruto' || ctx.flags.prepCompras === 'externo';
        return '<p>Previsão de <b>luvas de procedimento</b> para o próximo mês: <b>82 mil pares</b>. Intervalo provável (8 em cada 10 meses caem aqui): <b>70 a 98 mil</b>.</p>' +
          (ruim ? '<p class="nota alerta">A farmácia desconfia: a previsão saiu baixa nos meses em que faltou luva.</p>' : '');
      },
      pergunta: 'Quanto comprar?',
      opcoes: [
        { id: 'exato', label: 'Exatamente 82 mil — é o que o modelo previu.', custo: 0, fx: { eficiencia: 1 }, flags: { compra: 'exato' }, q: 1,
          consequencia: 'Compra enxuta.', comentario: 'Ignora a incerteza: se a previsão é o valor do meio, metade dos meses vai faltar.' },
        { id: 'seguranca', label: 'A previsão + um estoque de segurança calculado pelo tamanho do erro (≈ 95 mil), revisando toda semana; itens críticos têm estoque estratégico.',
          custo: 20, fx: { eficiencia: 5, seguranca: 3, dados: 2 }, flags: { compra: 'seguranca' }, q: 2,
          consequencia: 'Compra com folga planejada. A revisão semanal virou rotina.',
          comentario: 'Usa a incerteza da previsão para decidir a folga: quanto maior o erro, maior a reserva.' },
        { id: 'automatico', label: 'Deixar o sistema comprar sozinho, sem revisão humana.', custo: 10, fx: { eficiencia: 2, confianca: -4, seguranca: -2 }, flags: { compra: 'automatico' }, q: 0,
          consequencia: 'O sistema fez 14 pedidos automáticos na primeira semana — dois para um fornecedor com entrega atrasada.',
          comentario: 'O modelo não sabe o que não está nos dados (fornecedor atrasado, item em falta no mercado, mudança de protocolo).' },
        { id: 'excesso', label: 'Comprar 150 mil para nunca faltar.', custo: 90, fx: { eficiencia: -4 }, flags: { compra: 'excesso' }, q: 0,
          consequencia: 'O almoxarifado lotou e parte do lote vence antes do uso.', comentario: 'Excesso também é desperdício: dinheiro parado, espaço e validade.' }
      ],
      conceitos: ['incerteza', 'estoque_seguranca', 'humano_no_circuito'],
      conceito: 'Toda previsão tem erro. O estoque de segurança transforma a incerteza em decisão: a folga é proporcional ao erro esperado, e uma pessoa revisa o que o modelo não enxerga.',
      ra: ['RA6']
    },

    /* ------------------------------- DIA 6 ------------------------------- */
    {
      id: 'G6', setor: 'diretoria', day: 6, portes: TODOS, type: 'decisao',
      titulo: 'Um paciente grave sem alerta',
      fase: 'Ética · Responsabilidade e transparência',
      contexto: function (ctx) {
        var m = modeloAtual(ctx), nome = m ? m.nome : 'modelo', como;
        if (ctx.flags.contrato === 'silencioso') como = 'estava em piloto silencioso: teria dado um alerta 2 horas antes — mas, como previsto no piloto, ninguém o via.';
        else if (ctx.flags.limiar === 'alto' || (ctx.flags.sensUrg && ctx.flags.sensUrg < 70)) como = 'não deu alerta: o risco calculado ficou abaixo do limiar escolhido.';
        else if (ctx.flags.fluxo === 'livre' || (ctx.flags.alertasUrg && ctx.flags.alertasUrg > 70)) como = 'deu um alerta 40 minutos antes, que ficou sem resposta no meio de dezenas de outros.';
        else if (ctx.flags.fluxo === 'relatorio') como = 'deu um alerta que só apareceu no relatório do fim do plantão.';
        else como = 'deu um alerta, mas o paciente piorou muito rápido, antes da reavaliação.';
        return '<p>Um paciente de 67 anos, classificado como amarelo, piorou na sala de espera e foi para a UTI. O <b>' + esc(nome) + '</b> ' + como + '</p>' +
          '<p>A família pergunta se “a IA errou”. Um jornal local quer uma entrevista.</p>';
      },
      caso: { titulo: 'A pergunta já chegou à imprensa',
        texto: 'Depois da validação independente do modelo de sepse da Epic em 2021, jornais e revistas discutiram publicamente se os hospitais deveriam confiar no alerta — e quem responde quando ele falha.',
        fonte: 'Cobertura de imprensa sobre Wong et al., 2021' },
      pergunta: 'Como a gestão responde?',
      opcoes: [
        { id: 'silencio', label: 'Não comentar: o caso é sigiloso e a IA é só uma ferramenta.', fx: { confianca: -5, conformidade: -2 }, flags: { incidente: 'silencio' }, q: 0,
          consequencia: 'A matéria saiu sem a versão do hospital.', comentario: 'O sigilo do paciente não impede transparência sobre o processo; o silêncio corrói a confiança.' },
        { id: 'transparencia', label: 'Transparência: conversar com a família, explicar o papel da ferramenta (apoio, não decisão), analisar a causa com a equipe (modelo, limiar, fluxo, carga de trabalho) e publicar as melhorias.',
          fx: function (c) { return { confianca: 6, conformidade: c.flags.gov === 'comite' ? 6 : 4, seguranca: 2 }; }, flags: { incidente: 'transparencia' }, q: 2,
          consequencia: 'A família foi recebida pela direção. A análise encontrou melhorias no fluxo do alerta.',
          comentario: 'Responsabilidade institucional: transparência, análise do sistema inteiro e melhoria documentada.' },
        { id: 'culpar', label: 'Culpar publicamente o fornecedor do modelo.', fx: { confianca: -4, conformidade: -3 }, flags: { incidente: 'culpar' }, q: 0,
          consequencia: 'O fornecedor lembrou que o limiar e o fluxo foram definidos pelo hospital.', comentario: 'Limiar, fluxo e monitoramento são decisões locais.' },
        { id: 'suspender', label: 'Suspender todos os projetos de IA até o fim do ano.', portes: RA, fx: { confianca: -3, eficiencia: -5 }, flags: { incidente: 'suspender' }, q: 0,
          consequencia: 'Projetos suspensos.', comentario: 'Todo limiar deixa passar alguém, com ou sem IA. A pergunta certa é o que no sistema precisa melhorar.' }
      ],
      conceitos: ['responsabilidade', 'humano_no_circuito', 'limiar'],
      conceito: 'Modelos erram — por desenho (todo limiar deixa passar alguém), por mudança no mundo ou por fluxo mal definido. A responsabilidade é da instituição: transparência, análise do sistema e melhoria.',
      ra: ['RA8']
    }
  );
})(window.GAME);
