/* ==========================================================================
   PLANTÃO IA — conteúdo base: portes do hospital, funções, setores,
   indicadores, dias e os modelos da urgência
   Fundamentos de ML e IA em Saúde · CDIA · UPE Caruaru
   ========================================================================== */
window.GAME = window.GAME || {};
(function (G) {
  'use strict';

  /* ---------------- ajudantes de texto ---------------- */
  G.esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  /** Valores do jogo estão em R$ mil. */
  G.fmt = function (mil) {
    var v = Math.round(Number(mil) || 0), neg = v < 0; v = Math.abs(v);
    var s = v >= 1000 ? 'R$ ' + (v / 1000).toFixed(2).replace('.', ',') + ' mi' : 'R$ ' + v + ' mil';
    return (neg ? '−' : '') + s;
  };
  G.tbl = function (cab, linhas, classe) {
    var h = '<div class="tbl-wrap"><table class="tbl ' + (classe || '') + '"><thead><tr>';
    cab.forEach(function (c) { h += '<th>' + c + '</th>'; });
    h += '</tr></thead><tbody>';
    linhas.forEach(function (l) { h += '<tr>' + l.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; });
    return h + '</tbody></table></div>';
  };
  G.r1 = function (x) { return (Math.round(x * 10) / 10).toString().replace('.', ','); };
  G.r0 = function (x) { return Math.round(x).toString(); };

  /* ---------------- os três portes do hospital ----------------
     O porte acompanha o tamanho da equipe: com mais gente, mais setores,
     mais decisões e mais interdependência. */
  G.PORTE_ORDEM = ['essencial', 'regional', 'alta'];
  G.porteDe = function (n) { return n >= 5 ? 'alta' : (n === 4 ? 'regional' : 'essencial'); };

  G.PORTES = {
    essencial: {
      nome: 'Hospital Essencial', jogadores: '2 ou 3 jogadores', leitos: 120, fator: 0.6, orcamento: 1050,
      resumo: '120 leitos · urgência, radiologia e almoxarifado · 3 funções · cerca de 26 decisões e 21 casos clínicos',
      papeis: ['gestao', 'clinico', 'ti'],
      setor: { diretoria: 'gestao', compras: 'gestao', urgencia: 'clinico', especialidades: 'clinico', ti: 'ti' },
      salas: ['diretoria', 'reunioes', 'ti', 'urgencia', 'especialidades', 'compras'],
      papelInfo: {
        gestao: { nome: 'Diretor(a) de Gestão e Suprimentos',
          missao: 'Define o critério de sucesso, escolhe 3 de 5 modelos de IA para a urgência, cuida do contrato e das compras de EPI e medicamentos, e responde quando algo dá errado.',
          conceitos: 'Critério de sucesso, acurácia × sensibilidade, custo, previsão de compras' },
        clinico: { nome: 'Médico(a) Coordenador(a) da Urgência',
          missao: 'Transforma o problema clínico em pergunta, escolhe o modelo que vai para o plantão, ajusta o limiar de alerta, decide o que acontece quando o alerta dispara e enfrenta o viés em pacientes diferentes.',
          conceitos: 'Tipo de pergunta, explicabilidade, limiar, falso positivo × falso negativo, viés' },
        ti: { nome: 'Gestor(a) de TI e Dados',
          missao: 'Decide onde os dados vão ficar e quem pode vê-los, escolhe a ferramenta de painel da gestão, monta o painel de indicadores e reage quando o sistema cai.',
          conceitos: 'Nuvem × local, LGPD, dashboard, visualização de dados, plano B' }
      }
    },
    regional: {
      nome: 'Hospital Regional', jogadores: '4 jogadores', leitos: 250, fator: 1, orcamento: 2250,
      resumo: '250 leitos · urgência, radiologia, bloco com 8 salas, farmácia e compras · 4 funções · cerca de 36 decisões e 21 casos clínicos',
      papeis: ['gestao', 'clinico', 'operacoes', 'ti'],
      setor: { diretoria: 'gestao', compras: 'gestao', urgencia: 'clinico', especialidades: 'clinico', bloco: 'operacoes', farmacia: 'operacoes', ti: 'ti' },
      salas: ['diretoria', 'reunioes', 'ti', 'compras', 'urgencia', 'especialidades', 'farmacia', 'bloco'],
      papelInfo: {
        gestao: { nome: 'Diretor(a) de Gestão e Suprimentos',
          missao: 'Define o critério de sucesso, seleciona modelos para a urgência, negocia o contrato, cria a governança de IA, cuida das compras de EPI e medicamentos e responde ao conselho.',
          conceitos: 'Critério de sucesso, métricas × custo, governança, previsão de compras' },
        clinico: { nome: 'Coordenação Médica (Urgência e Radiologia)',
          missao: 'Escolhe a pergunta clínica e o modelo da urgência, define o limiar e o fluxo dos alertas, reage quando o modelo muda de comportamento e enfrenta o viés do modelo de radiologia.',
          conceitos: 'Explicabilidade, limiar, fluxo do alerta, deriva, viés' },
        operacoes: { nome: 'Gerente de Operações (Bloco Cirúrgico e Farmácia)',
          missao: 'Lidera a previsão de demanda das 8 salas do bloco cirúrgico e cuida da farmácia: alertas de interação medicamentosa e rastreabilidade dos medicamentos controlados.',
          conceitos: 'Previsão, vazamento, validação no tempo, incerteza, alertas, anomalias' },
        ti: { nome: 'Gestor(a) de TI e Dados',
          missao: 'Decide onde os dados ficam, como chegam aos modelos e quem pode vê-los, escolhe a ferramenta de dashboard, monta o painel de indicadores e reage às crises.',
          conceitos: 'Nuvem × local, integração, LGPD, dashboard, visualização de dados' }
      }
    },
    alta: {
      nome: 'Hospital de Alta Complexidade', jogadores: '5 jogadores', leitos: 450, fator: 1.5, orcamento: 4250,
      resumo: '450 leitos · especialidades, bloco com 12 salas, transplantes, farmácia e compras · 5 funções · cerca de 45 decisões e 21 casos clínicos',
      papeis: ['gestao', 'clinico', 'cirurgia', 'farmacia', 'ti'],
      setor: { diretoria: 'gestao', urgencia: 'clinico', especialidades: 'clinico', bloco: 'cirurgia', transplante: 'cirurgia', farmacia: 'farmacia', compras: 'farmacia', ti: 'ti' },
      salas: ['diretoria', 'reunioes', 'ti', 'compras', 'urgencia', 'especialidades', 'farmacia', 'bloco', 'transplante'],
      papelInfo: {
        gestao: { nome: 'Diretor(a) Geral',
          missao: 'Define o sucesso do programa, seleciona modelos, distribui o orçamento entre as frentes, negocia contratos, cria a governança de IA e responde ao conselho.',
          conceitos: 'Critério de sucesso, métricas × custo, portfólio, contratos, governança' },
        clinico: { nome: 'Direção Clínica (Urgência e Especialidades)',
          missao: 'Escolhe qual especialidade recebe IA (cardiologia, oftalmologia, mamografia, dermatologia…), define o padrão-ouro, escolhe o modelo da urgência, o limiar e o fluxo dos alertas, e enfrenta o viés.',
          conceitos: 'Evidência, padrão-ouro, explicabilidade, limiar, viés' },
        cirurgia: { nome: 'Coordenação do Bloco Cirúrgico e Transplantes',
          missao: 'Prevê a demanda das 12 salas do bloco, valida e entrega a previsão, e decide como a IA pode apoiar a equipe de transplante de órgãos sem ferir as regras da fila.',
          conceitos: 'Previsão, vazamento, validação no tempo, incerteza, validação externa' },
        farmacia: { nome: 'Farmácia Hospitalar e Compras',
          missao: 'Prevê compras de EPI e medicamentos, define o estoque de segurança, configura os alertas de interação medicamentosa e garante a rastreabilidade dos controlados.',
          conceitos: 'Previsão de demanda, sazonalidade, estoque de segurança, fadiga de alertas, anomalias' },
        ti: { nome: 'TI, Dados e BI',
          missao: 'Decide onde os dados ficam, como chegam aos modelos e quem pode vê-los, escolhe a ferramenta de dashboard, monta o painel de indicadores, monitora os modelos e reage às crises.',
          conceitos: 'Infraestrutura, integração, LGPD, dashboard, visualização, monitoramento' }
      }
    }
  };

  /* ---------------- funções (aparência comum a todos os portes) ---------------- */
  G.ROLE_ORDER = ['gestao', 'clinico', 'operacoes', 'cirurgia', 'farmacia', 'ti'];
  G.ROLES = {
    gestao: { curto: 'Gestão', icone: 'briefcase', cor: '#2E4A7A', roupa: '#2E4A7A', calca: '#22324F', detalhe: '#FFFFFF' },
    clinico: { curto: 'Clínica', icone: 'stethoscope', cor: '#B4443E', roupa: '#F4F7FA', calca: '#5B7DB1', detalhe: '#B4443E' },
    operacoes: { curto: 'Operações', icone: 'chart', cor: '#B7791F', roupa: '#E3A23B', calca: '#6B4A1A', detalhe: '#FFFFFF' },
    cirurgia: { curto: 'Cirurgia', icone: 'chart', cor: '#2F8F6F', roupa: '#46B08C', calca: '#2F7D63', detalhe: '#D7F2E8' },
    farmacia: { curto: 'Farmácia', icone: 'pill', cor: '#6B4FA0', roupa: '#8E74C6', calca: '#4C3780', detalhe: '#FFFFFF' },
    ti: { curto: 'TI', icone: 'server', cor: '#2C7A7B', roupa: '#2C7A7B', calca: '#23334F', detalhe: '#9EE6E0' }
  };
  /** Nome, missão e conceitos de uma função no porte do jogo. */
  G.papelInfo = function (role, porte) {
    var p = G.PORTES[porte || 'regional'];
    return (p && p.papelInfo[role]) || { nome: (G.ROLES[role] || {}).curto || role, missao: '', conceitos: '' };
  };
  G.papeisDoPorte = function (porte) { return G.PORTES[porte].papeis.slice(); };

  /* ---------------- salas (setores) do mapa ---------------- */
  G.SETORES = {
    diretoria: { nome: 'Diretoria' },
    reunioes: { nome: 'Sala de Reuniões' },
    ti: { nome: 'Central de TI e Dados' },
    compras: { nome: { essencial: 'Almoxarifado', regional: 'Compras e Almoxarifado', alta: 'Compras e Almoxarifado' } },
    urgencia: { nome: { essencial: 'Urgência', regional: 'Urgência', alta: 'Urgência e UTI' } },
    especialidades: { nome: { essencial: 'Radiologia', regional: 'Radiologia', alta: 'Especialidades e Diagnóstico' } },
    farmacia: { nome: 'Farmácia Hospitalar' },
    bloco: { nome: { regional: 'Bloco Cirúrgico · 8 salas', alta: 'Bloco Cirúrgico · 12 salas' } },
    transplante: { nome: 'Transplantes' }
  };
  G.nomeSetor = function (k, porte) {
    var n = (G.SETORES[k] || {}).nome || k;
    return typeof n === 'string' ? n : (n[porte] || n.regional || n.alta || k);
  };

  /** Custo ajustado ao porte (R$ mil). */
  G.custo = function (v, porte) { return Math.round((Number(v) || 0) * ((G.PORTES[porte] || {}).fator || 1)); };
  G.fmtc = function (ctx, v) { return G.fmt(G.custo(v, ctx && ctx.porte)); };
  /** Escolhe um texto conforme o porte: G.p(ctx, {essencial:…, regional:…, alta:…}) */
  G.p = function (ctx, obj) { var p = ctx && ctx.porte; return obj[p] !== undefined ? obj[p] : (obj.regional !== undefined ? obj.regional : obj.alta); };

  /* ---------------- identidade ---------------- */
  G.TITULO = 'Plantão IA';
  G.FIO = 'Um modelo preditivo só é bom quando alguém decide melhor por causa dele.';

  G.INTRO = function (nome, porte) {
    var P = G.PORTES[porte] || G.PORTES.regional;
    var setores = {
      essencial: '<li>A <b>urgência</b> atende cerca de 300 pacientes por plantão; no último ano, pacientes classificados como verde ou amarelo pioraram na sala de espera.</li>' +
        '<li>O <b>almoxarifado</b> já ficou sem luvas e sem soro — e jogou fora medicamento vencido.</li>' +
        '<li>A <b>diretoria</b> não tem um painel confiável: cada setor calcula o tempo de espera de um jeito.</li>',
      regional: '<li>A <b>urgência</b> atende cerca de 300 pacientes por plantão, e a fila de laudos de raio-X chega a 6 horas à noite.</li>' +
        '<li>O <b>bloco cirúrgico</b> tem 8 salas: cirurgias canceladas no dia e salas ociosas convivem com horas extras.</li>' +
        '<li>A <b>farmácia</b> recebe milhares de alertas de interação medicamentosa por semana — e quase todos são ignorados.</li>' +
        '<li>O <b>almoxarifado</b> já ficou sem EPI e a diretoria não tem um painel confiável de indicadores.</li>',
      alta: '<li>Referência estadual: <b>urgência e UTI</b>, ambulatório de <b>especialidades</b> (cardiologia, oftalmologia, mastologia, dermatologia) e <b>radiologia</b>.</li>' +
        '<li>O <b>bloco cirúrgico</b> tem 12 salas e é compartilhado com a <b>equipe de transplante</b> de rim e fígado.</li>' +
        '<li>A <b>farmácia hospitalar</b> dispensa 9 mil doses por dia; medicamentos controlados precisam ser rastreados do lote ao leito.</li>' +
        '<li>O setor de <b>compras</b> enfrentou falta de EPI na pandemia e de soro e analgésicos na epidemia de dengue de 2024.</li>' +
        '<li>A <b>diretoria</b> quer um painel único com tempo de espera, ocupação, estoque e rastreabilidade.</li>'
    }[porte] || '';
    return '<p>Vocês acabam de assumir o <b>Programa de Inteligência Artificial do ' + G.esc(nome) + '</b>, um ' + P.nome.toLowerCase() +
      ' de ' + P.leitos + ' leitos no Agreste de Pernambuco.</p><ul>' + setores + '</ul>' +
      '<p>O conselho aprovou <b>' + G.fmt(P.orcamento) + '</b> para o primeiro ano. Serão <b>30 dias de plantão</b>: na primeira semana vocês escolhem e preparam o modelo; a partir do dia 9, o médico testa o modelo num caso real por dia. A cada 7 dias, uma reunião de equipe revisa a semana e planeja a próxima. E fiquem atentos ao jornal: no meio do mês, algo vai pôr o hospital à prova.</p>' +
      '<p class="fio">“' + G.FIO + '”</p>';
  };

  /* ---------------- indicadores ---------------- */
  G.INDICATORS = [
    { id: 'orcamento', nome: 'Orçamento', curto: 'Orçamento', inicial: 2400, tipo: 'dinheiro', icone: 'moeda',
      desc: 'Verba do programa de IA no ano. Pode ficar negativa — e o conselho vai cobrar.' },
    { id: 'seguranca', nome: 'Segurança do paciente', curto: 'Segurança', inicial: 60, icone: 'coracao',
      desc: 'Pacientes graves reconhecidos a tempo, erros de medicação evitados, dano evitado.' },
    { id: 'eficiencia', nome: 'Eficiência operacional', curto: 'Eficiência', inicial: 55, icone: 'raio',
      desc: 'Tempo de espera, uso das salas, estoque sem falta nem sobra, retrabalho.' },
    { id: 'confianca', nome: 'Confiança da equipe', curto: 'Confiança', inicial: 50, icone: 'sorriso',
      desc: 'O quanto médicos, enfermagem e farmácia confiam no programa e usam as ferramentas.' },
    { id: 'conformidade', nome: 'Ética e LGPD', curto: 'Ética/LGPD', inicial: 60, icone: 'escudo',
      desc: 'Proteção de dados, transparência, equidade e governança.' },
    { id: 'dados', nome: 'Maturidade de dados', curto: 'Dados', inicial: 40, icone: 'banco',
      desc: 'Qualidade, integração e confiabilidade dos dados, dos painéis e das avaliações dos modelos.' }
  ];
  G.orcamentoInicial = function (porte) { return (G.PORTES[porte] || G.PORTES.regional).orcamento; };

  /* Ganhos e perdas são reduzidos em relação ao número escrito nas opções
     (são 30 dias de decisões e casos). Com menos decisões (hospital
     essencial), cada uma pesa um pouco mais. */
  G.ESCALA = { ganho: 0.3, perda: 0.43 };
  G.ESCALA_PORTE = { essencial: { ganho: 0.4, perda: 0.45 }, regional: { ganho: 0.3, perda: 0.43 }, alta: { ganho: 0.25, perda: 0.4 } };
  G.escalaDe = function (porte) { return G.ESCALA_PORTE[porte] || G.ESCALA; };

  /* ---------------- os 30 dias ----------------
     Quatro semanas de plantão + dois dias de fechamento. A cada 7 dias, uma
     reunião de equipe revisa a semana e planeja a próxima. No meio do mês,
     cada hospital enfrenta o incidente da sua história (sorteada no início). */
  G.NDIAS = 30;
  G.DIAS_REUNIAO = [7, 14, 21, 28];
  G.semanaDe = function (n) { return Math.min(5, Math.ceil(n / 7)); };

  /* Títulos-padrão de cada dia (a semana 3 é reescrita pela história). */
  G.DIA_INFO = [null,
    ['Entendendo o problema', 'CRISP-DM 1 · Entendimento do negócio', 'Antes de qualquer modelo: que decisão queremos melhorar, o que vale a pena prever e onde os dados vão ficar.'],
    ['Conhecendo dados e candidatos', 'CRISP-DM 2 · Entendimento dos dados', 'De onde vêm os dados, qual é a “verdade” para treinar e quais modelos merecem ir para a mesa do corpo clínico.'],
    ['Os candidatos na mesa', 'CRISP-DM 2 e 3 · Dados e preparação', 'A gestão apresenta os modelos ao corpo clínico. As frentes protegem e preparam os dados — é aqui que nascem os erros silenciosos.'],
    ['O corpo clínico escolhe', 'CRISP-DM 4 · Modelagem', 'A decisão é clínica: qual modelo o plantão vai usar e como validar as previsões no tempo.'],
    ['Ajustando o alerta', 'CRISP-DM 5 · Avaliação', 'O limiar transforma uma chance em alerta. Cada ponto da régua troca pacientes graves encontrados por alarmes falsos.'],
    ['Contrato e painel', 'CRISP-DM 5 · Avaliação', 'O contrato com o fornecedor e a ferramenta que vai virar o painel da gestão.'],
    ['Reunião da semana 1', 'Balanço e planejamento', 'A equipe olha o que fez na semana, discute o que aprendeu e a gestão define as prioridades da próxima.'],
    ['Hora de ligar o modelo?', 'CRISP-DM 6 · Implantação', 'O corpo clínico decide quando e como o modelo entra no plantão. A partir de amanhã, um caso real por dia.'],
    ['Primeiro caso no plantão', 'Implantação · Teste na vida real', 'O médico testa o modelo num paciente de verdade: aceita ou não o que ele indica — e explica o porquê.'],
    ['O alerta toca', 'Implantação · Humano no circuito', 'Falta combinar o que acontece quando o alerta dispara: quem vê, em quanto tempo, o que faz.'],
    ['Crise: o sistema caiu', 'Implantação · Plano B', 'A infraestrutura escolhida no dia 1 é posta à prova.'],
    ['A previsão chega à escala', 'Implantação · Entrega', 'As previsões saem do papel e chegam a quem decide no dia a dia.'],
    ['Rotina de plantão', 'Monitoramento', 'Mais um plantão: o caso do dia continua testando o modelo na vida real.'],
    ['Reunião da semana 2', 'Balanço e planejamento', 'Como o modelo se saiu nos primeiros casos? O que os sinais do jornal estão dizendo? A gestão define as prioridades da semana 3.'],
    ['Sinais no horizonte', 'Vigilância', 'Fique atento ao jornal: a semana pode mudar de rumo.'],
    ['Sinais no horizonte', 'Vigilância', 'Fique atento ao jornal: a semana pode mudar de rumo.'],
    ['Plantão sob pressão', 'Resposta ao incidente', 'O hospital trabalha sob pressão. O modelo continua sendo testado — agora num cenário para o qual não foi treinado.'],
    ['Plantão sob pressão', 'Resposta ao incidente', 'O hospital trabalha sob pressão. O modelo continua sendo testado — agora num cenário para o qual não foi treinado.'],
    ['Plantão sob pressão', 'Resposta ao incidente', 'O hospital trabalha sob pressão. O modelo continua sendo testado — agora num cenário para o qual não foi treinado.'],
    ['Plantão sob pressão', 'Resposta ao incidente', 'O hospital trabalha sob pressão. O modelo continua sendo testado — agora num cenário para o qual não foi treinado.'],
    ['Reunião da semana 3', 'Balanço e planejamento', 'O que o incidente ensinou? O modelo ajudou ou atrapalhou? A gestão define as prioridades da última semana.'],
    ['O modelo fica, troca ou sai?', 'Monitoramento · Reavaliação', 'Com duas semanas de casos testados, o corpo clínico decide o futuro do modelo no plantão.'],
    ['Funciona igual para todos?', 'Ética · Viés e visualização', 'Resultado por grupo de pacientes e o painel que vai para a mesa da diretoria.'],
    ['O mundo muda, o modelo não', 'Monitoramento · Deriva', 'Reuniões sobre equidade e indicadores — e um modelo que pode ter mudado de comportamento.'],
    ['Quando algo dá errado', 'Ética · Responsabilidade', 'Um paciente grave sem alerta e um sistema que aponta profissionais: como o hospital responde.'],
    ['Rotina de plantão', 'Monitoramento', 'Mais um plantão: o caso do dia continua testando o modelo na vida real.'],
    ['Rotina de plantão', 'Monitoramento', 'Mais um plantão: o caso do dia continua testando o modelo na vida real.'],
    ['Reunião da semana 4', 'Balanço', 'A última reunião de equipe antes do conselho: o que fica, o que muda e o que cada função vai apresentar.'],
    ['Último plantão do mês', 'Monitoramento', 'O último caso do mês fecha o teste do modelo na vida real.'],
    ['Prestação de contas', 'Reunião do conselho', 'Cada função presta contas ao conselho. Depois, o relatório final revela o que cada decisão causou.']
  ];
  G.NOME_SEMANA = { 1: 'Entender e escolher', 2: 'O modelo entra no plantão', 3: 'Sinais no horizonte', 4: 'Ajustar, vigiar e prestar contas', 5: 'Fechamento do mês' };

  /**
   * Título, fase e resumo de um dia. `jogo` traz a história e o dia do incidente
   * (I0), para a semana 3 ganhar o nome do incidente sorteado.
   */
  G.infoDia = function (n, jogo) {
    n = Math.max(1, Math.min(G.NDIAS, Number(n) || 1));
    var b = G.DIA_INFO[n], sem = G.semanaDe(n);
    var r = { n: n, semana: sem, titulo: b[0], fase: b[1], resumo: b[2], nomeSemana: G.NOME_SEMANA[sem] };
    var H = jogo && G.HISTORIAS && G.HISTORIAS[jogo.historia];
    if (H && jogo.I0) {
      var rel = n - jogo.I0;
      if (H.dias && H.dias[rel] && G.DIAS_REUNIAO.indexOf(n) < 0) { r.titulo = H.dias[rel][0]; r.fase = H.dias[rel][1]; r.resumo = H.dias[rel][2]; }
      if (sem === 3 && rel >= 0) r.nomeSemana = H.nome;
    }
    return r;
  };

  /* ---------------- sorteio determinístico ----------------
     Cada hospital tem uma "semente" tirada do seu código: dias do incidente,
     incidentes menores, ordem dos casos e pequenos acontecimentos variam
     de grupo para grupo, mas são sempre os mesmos para o mesmo hospital. */
  G.hash = function (s) {
    var h = 2166136261;
    s = String(s || '');
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };
  G.rng = function (semente) {
    var x = (semente >>> 0) || 1;
    return function () { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
  };
  G.embaralhar = function (lista, rand) {
    var a = lista.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rand() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  };

  /* ---------------- os 5 modelos da urgência ----------------
     Desfecho: UTI ou óbito em 48h após a triagem. Prevalência: 8%. */
  G.URG = { pacientes: 300, prevalencia: 0.08 };
  G.carga = function (sens, esp) {
    var graves = G.URG.pacientes * G.URG.prevalencia, naoGraves = G.URG.pacientes - graves;
    var vp = graves * sens / 100, fp = naoGraves * (1 - esp / 100), alertas = vp + fp;
    return { vp: vp, fp: fp, alertas: alertas, perdidos: graves - vp, vpp: alertas > 0 ? vp / alertas * 100 : 0 };
  };
  G.MODELS = {
    A: { id: 'A', nome: 'SentinelaTriage', tecnica: 'Árvores de decisão combinadas (gradient boosting)', acc: 88, sens: 82, esp: 89, auc: '0,89', custo: 180,
      validacao: 'Testado em 3 hospitais públicos brasileiros', obs: 'Precisa dos sinais vitais digitados na triagem.',
      expl: 'Alta — mostra, para cada paciente, o que mais pesou no risco. Ex.: “SpO₂ 89%, FR 28 irpm, 78 anos”.',
      tempo: '< 1 segundo', dados: 'Sinais vitais, idade e doenças prévias — já coletados na triagem.', gpu: false,
      limiares: { baixo: [93, 75], medio: [82, 89], alto: [60, 97] }, qLim: { baixo: 1, medio: 2, alto: 0 } },
    B: { id: 'B', nome: 'DeepVital', tecnica: 'Rede neural profunda (deep learning)', acc: 93, sens: 70, esp: 95, auc: '0,90', custo: 320,
      validacao: 'Testado só em 1 hospital universitário nos EUA', obs: 'Precisa de um computador com placa de vídeo (GPU) dedicada.',
      expl: 'Baixa — devolve apenas um escore de 0 a 100, sem dizer o porquê.',
      tempo: '3 s com GPU; ~40 s sem', dados: 'Sinais vitais + texto livre da queixa principal.', gpu: true,
      limiares: { baixo: [88, 82], medio: [70, 95], alto: [45, 99] }, qLim: { baixo: 2, medio: 1, alto: 0 } },
    C: { id: 'C', nome: 'EscoreLocal', tecnica: 'Regressão logística (feita por residentes do hospital)', acc: 80, sens: 85, esp: 80, auc: '0,86', custo: 40,
      validacao: 'Testado com dados do próprio hospital (2023 → 2024)', obs: 'O custo é de implantação e manutenção pela equipe interna.',
      expl: 'Total — um escore com pesos visíveis, no estilo do NEWS; o médico consegue refazer a conta.',
      tempo: '< 1 segundo', dados: 'Sinais vitais e idade.', gpu: false,
      limiares: { baixo: [95, 65], medio: [85, 80], alto: [65, 92] }, qLim: { baixo: 1, medio: 2, alto: 0 } },
    D: { id: 'D', nome: 'TriAI Premium', tecnica: 'Combinação de vários modelos (ensemble)', acc: 96, sens: 97, esp: 96, auc: '0,99', custo: 450,
      validacao: '“Resultados obtidos nos dados de desenvolvimento.”', obs: 'Usa como entrada o campo “pedido de vaga de UTI”.',
      expl: 'Média — lista as variáveis mais importantes do modelo como um todo (não por paciente).',
      tempo: '< 1 segundo', dados: 'Sinais vitais, exames e o campo “pedido de vaga de UTI”.', gpu: false,
      limiares: { baixo: [99, 90], medio: [97, 96], alto: [90, 99] }, qLim: { baixo: 1, medio: 1, alto: 0 } },
    E: { id: 'E', nome: 'AcuraMax', tecnica: 'Modelo fechado (técnica não informada)', acc: 92, sens: 15, esp: 99, auc: '0,70', custo: 60,
      validacao: 'Não informada', obs: '“O modelo mais preciso do mercado!”',
      expl: 'Baixa — escore sem explicação.', tempo: '< 1 segundo', dados: 'Sinais vitais.', gpu: false,
      limiares: { baixo: [40, 93], medio: [15, 99], alto: [5, 99.9] }, qLim: { baixo: 1, medio: 0, alto: 0 } }
  };
  G.MODEL_ORDER = ['A', 'B', 'C', 'D', 'E'];
  G.LIMIAR_NOME = { baixo: 'Limiar baixo (0,10)', medio: 'Limiar intermediário (0,25)', alto: 'Limiar alto (0,50)' };
  G.INFRA_NOME = { local: 'no próprio hospital', nuvem: 'na nuvem', hibrida: 'mista (hospital + nuvem)' };

  G.Q_LABEL = { 2: 'Boa prática', 1: 'Aceitável, com ressalvas', 0: 'Risco', null: 'Sem resposta única' };

  G.RA = {
    RA2: 'Classificar um problema clínico quanto ao tipo de aprendizado e à tarefa',
    RA3: 'Situar cada decisão de um projeto na fase do CRISP-DM',
    RA4: 'Explicar modelos de árvore e por que dominam dado tabular',
    RA5: 'Interpretar métricas, reconhecendo o efeito do limiar e da prevalência',
    RA6: 'Escolher entre modelos pela consequência clínica, não pelo maior número',
    RA7: 'Identificar viés, vazamento e limites de generalização',
    RA8: 'Posicionar um projeto de IA frente a limites éticos e práticos'
  };

  /* ---------------- registro de tarefas ----------------
     Cada arquivo de tarefas acrescenta itens a G.TASKS. Campos principais:
       setor   – sala/setor responsável (a função é definida pelo porte)
       setores – participantes de uma reunião
       portes  – em quais portes a tarefa existe
       day     – número ou {essencial, regional, alta}                      */
  G.TASKS = G.TASKS || [];
  G.TODOS = ['essencial', 'regional', 'alta'];
})(window.GAME);
