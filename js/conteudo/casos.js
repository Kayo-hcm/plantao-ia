/* ==========================================================================
   PLANTÃO IA — casos diários da urgência
   A partir do dia 9, o médico recebe um paciente por dia. Ele vê os dados da
   triagem e o que o modelo em uso indicou (escore, alerta e, se o modelo
   explica, o motivo). Decide se ACEITA ou NÃO a indicação — e explica o
   porquê. Depois, o jogo revela o que aconteceu com o paciente.

   Como o modelo "responde": cada caso tem uma dificuldade d (0 a 1).
     · paciente grave: o modelo alerta se d·100 < sensibilidade no limiar;
     · paciente não grave: o modelo alerta (falso positivo) se d·100 > especificidade.
   Um pequeno desvio por modelo (sempre o mesmo) faz os modelos discordarem
   nos casos de fronteira. Os números de sensibilidade e especificidade são
   os das cartas dos modelos (G.MODELS[x].limiares).
   ========================================================================== */
(function (G) {
  'use strict';

  /* ---------------- banco de casos genéricos ----------------
     tipo (só para o guia do professor): vp = grave típico · fn = grave atípico ·
     fp = não grave que parece grave · vn = não grave típico · amb = sem resposta única */
  G.CASOS = [
    { id: 'k01', tipo: 'vp', nome: 'Seu Severino', idade: 78, sexo: 'M', manchester: 'amarelo',
      queixa: 'Falta de ar e tosse há 3 dias; a filha diz que ele está “diferente”.',
      sinais: { PA: '102/64', FC: 112, FR: 28, SpO2: 89, T: 38.1, Glasgow: 14 },
      extra: 'Diabético e hipertenso.', grave: true, d: 0.18, fatores: ['SpO₂ 89%', 'FR 28 irpm', '78 anos', 'FC 112 bpm'],
      desfecho: 'Pneumonia com sepse: foi para a UTI 6 horas depois.',
      licao: 'Paciente típico — idoso, taquipneico, dessaturando e com o estado mental alterado: os modelos costumam acertar. SpO₂ abaixo de 90% e confusão já justificariam a cor laranja; o alerta ajuda a corrigir a subtriagem e a não deixá-lo esperando no amarelo.' },
    { id: 'k02', tipo: 'vp', nome: 'Dona Lúcia', idade: 64, sexo: 'F', manchester: 'vermelho',
      queixa: 'Dor no peito em aperto há 1 hora, com suor frio.',
      sinais: { PA: '88/56', FC: 118, FR: 24, SpO2: 93, T: 36.4, Glasgow: 15 },
      extra: 'Tabagista. ECG ainda não realizado.', grave: true, d: 0.2, fatores: ['PA 88/56', 'FC 118 bpm', '64 anos'],
      desfecho: 'Infarto com choque cardiogênico: hemodinâmica e UTI.',
      licao: 'A clínica já mostra o choque; o alerta, quando vem, só reforça. A conduta (ECG em até 10 minutos) não depende do modelo.' },
    { id: 'k03', tipo: 'vp', nome: 'Sr. Antônio', idade: 71, sexo: 'M', manchester: 'laranja',
      queixa: 'Febre há 2 dias e urina turva, com mau cheiro, na bolsa coletora; hoje está sonolento.',
      sinais: { PA: '94/58', FC: 120, FR: 26, SpO2: 94, T: 38.9, Glasgow: 13 },
      extra: 'Usa sonda vesical de demora.', grave: true, d: 0.12, fatores: ['Glasgow 13', 'PA 94/58', 'FC 120 bpm', 'T 38,9 °C'],
      desfecho: 'Sepse de foco urinário: UTI em 4 horas.',
      licao: 'Paciente claramente grave: com ou sem alerta, a conduta é a sala vermelha — e um alerta correto ajuda a não perder tempo.' },
    { id: 'k04', tipo: 'vp', nome: 'Maria José', idade: 55, sexo: 'F', manchester: 'laranja',
      queixa: 'Vômitos e muita sede há 2 dias; diabética, ficou sem insulina.',
      sinais: { PA: '100/60', FC: 116, FR: 30, SpO2: 97, T: 36.8, Glasgow: 14 },
      extra: 'Respiração profunda. Glicemia capilar: “HI” (acima de 600 mg/dL). Hálito cetônico.', grave: true, d: 0.74, fatores: ['FR 30 irpm', 'FC 116 bpm', 'Glasgow 14'],
      desfecho: 'Cetoacidose diabética grave: UTI para insulina venosa.',
      licao: 'O modelo não vê a glicemia: só a taquipneia e a taquicardia apontavam o risco — e nem todo modelo dá peso suficiente a esses sinais. Glicemia “HI” com respiração profunda e hálito cetônico já define a urgência.' },
    { id: 'k05', tipo: 'vp', nome: 'José Carlos', idade: 47, sexo: 'M', manchester: 'laranja',
      queixa: 'Vomitou sangue duas vezes hoje; fezes escuras.',
      sinais: { PA: '96/60', FC: 124, FR: 22, SpO2: 97, T: 36.2, Glasgow: 15 },
      extra: 'Etilista. Mucosas descoradas.', grave: true, d: 0.3, fatores: ['FC 124 bpm', 'PA 96/60'],
      desfecho: 'Hemorragia digestiva alta por varizes de esôfago: transfusão, endoscopia e UTI.',
      licao: 'Taquicardia com pressão no limite (índice de choque acima de 1) num paciente que sangra: caso de sala vermelha. Se o modelo alertou, acertou.' },
    { id: 'k06', tipo: 'fn', nome: 'Dona Francisca', idade: 86, sexo: 'F', manchester: 'verde',
      queixa: 'A cuidadora diz que ela “não está comendo e está mais quietinha”.',
      sinais: { PA: '118/70', FC: 88, FR: 20, SpO2: 95, T: 36.9, Glasgow: 14 },
      extra: 'Demência leve. Urina concentrada; glicemia capilar 210 mg/dL.', grave: true, d: 0.93, fatores: ['86 anos', 'Glasgow 14'],
      desfecho: 'Sepse urinária sem febre: evoluiu com hipotensão e foi para a UTI 10 horas depois.',
      licao: 'Idosos frágeis fazem sepse sem febre e sem taquicardia. Com sinais vitais quase normais, a triagem e o modelo costumam se enganar — a mudança do estado habitual, contada por quem cuida, é o sinal.' },
    { id: 'k07', tipo: 'fn', nome: 'Sr. Raimundo', idade: 69, sexo: 'M', manchester: 'amarelo',
      queixa: 'Cansaço e tontura desde ontem.',
      sinais: { PA: '98/62', FC: 64, FR: 20, SpO2: 96, T: 36.5, Glasgow: 15 },
      extra: 'Usa betabloqueador (atenolol). Fezes pretas há 2 dias, que ele atribuiu ao sulfato ferroso.', grave: true, d: 0.9, fatores: ['69 anos', 'PA 98/62'],
      desfecho: 'Hemorragia digestiva alta com choque — o betabloqueador escondia a taquicardia: endoscopia e UTI.',
      licao: 'Remédios como o betabloqueador mascaram a taquicardia. O modelo não sabe disso; o médico sabe.' },
    { id: 'k08', tipo: 'fn', nome: 'Camila', idade: 26, sexo: 'F', manchester: 'amarelo',
      queixa: 'Dor no “pé da barriga”; desmaiou em casa.',
      sinais: { PA: '108/70', FC: 96, FR: 18, SpO2: 99, T: 36.7, Glasgow: 15 },
      extra: 'Atraso menstrual de 7 semanas. Dor à descompressão no abdome.', grave: true, d: 0.95, fatores: ['FC 96 bpm'],
      desfecho: 'Gravidez ectópica rota: cirurgia de urgência, transfusão e pós-operatório na UTI.',
      licao: 'Jovens compensam a perda de sangue até o colapso. A história (atraso menstrual + desmaio) e o exame (dor à descompressão) decidem; o modelo só vê sinais vitais ainda pouco alterados.' },
    { id: 'k09', tipo: 'fn', nome: 'Pedro', idade: 34, sexo: 'M', manchester: 'laranja',
      queixa: 'Dor de cabeça súbita, “a pior da vida”, há 3 horas.',
      sinais: { PA: '150/90', FC: 84, FR: 18, SpO2: 98, T: 36.6, Glasgow: 15 },
      extra: 'Vomitou uma vez. Rigidez de nuca discreta.', grave: true, d: 0.97, fatores: ['PA 150/90'],
      desfecho: 'Hemorragia subaracnoide: UTI neurológica e neurocirurgia.',
      licao: 'Cefaleia súbita e intensa é bandeira vermelha, mesmo com sinais vitais pouco alterados. O modelo só enxerga os números da triagem.' },
    { id: 'k10', tipo: 'fp', nome: 'Rafaela', idade: 22, sexo: 'F', manchester: 'amarelo',
      queixa: 'Palpitação e falta de ar depois de uma discussão; formigamento nas mãos.',
      sinais: { PA: '130/80', FC: 128, FR: 30, SpO2: 99, T: 36.6, Glasgow: 15 },
      extra: 'Sem doenças. ECG: taquicardia sinusal. Melhora enquanto conversa.', grave: false, d: 0.95, fatores: ['FC 128 bpm', 'FR 30 irpm'],
      desfecho: 'Crise de ansiedade com hiperventilação: alta em 3 horas, sem piora.',
      licao: 'Taquicardia e taquipneia sem hipoxemia numa jovem sem fatores de risco, com ECG sinusal e melhora ao conversar: depois de afastar causas orgânicas, um alerta aqui é falso positivo. Cada alarme falso aceito ocupa um leito da sala vermelha.' },
    { id: 'k11', tipo: 'fp', nome: 'Seu Joaquim', idade: 72, sexo: 'M', manchester: 'laranja',
      queixa: 'Tosse com catarro um pouco mais que o habitual.',
      sinais: { PA: '136/82', FC: 98, FR: 24, SpO2: 88, T: 37.2, Glasgow: 15 },
      extra: 'DPOC grave; usa oxigênio em casa; saturação habitual entre 87% e 89% em ar ambiente.', grave: false, d: 0.93, fatores: ['SpO₂ 88%', '72 anos', 'FR 24 irpm'],
      desfecho: 'Exacerbação da DPOC sem insuficiência respiratória aguda: tratado na observação, alta no dia seguinte.',
      licao: 'Para quem tem DPOC, 88% pode ser o habitual. O modelo compara com a população; o médico compara com o próprio paciente.' },
    { id: 'k12', tipo: 'fp', nome: 'Diego', idade: 19, sexo: 'M', manchester: 'amarelo',
      queixa: 'Febre alta e dor no corpo desde ontem.',
      sinais: { PA: '118/72', FC: 110, FR: 22, SpO2: 98, T: 39.4, Glasgow: 15 },
      extra: 'Bebendo bem, sem sinais de alarme. Prova do laço negativa. Teste rápido de COVID-19 negativo.', grave: false, d: 0.9, fatores: ['FC 110 bpm', 'T 39,4 °C'],
      desfecho: 'Síndrome febril aguda, suspeita de dengue sem sinais de alarme (grupo A): hidratação oral, notificação e retorno no primeiro dia sem febre.',
      licao: 'A febre aumenta a frequência cardíaca em cerca de 10 bpm por grau e explica boa parte da taquicardia: considerando a febre, o jovem está estável. No Agreste, todo quadro febril agudo é suspeito de dengue — e quem define a conduta são os sinais de alarme.' },
    { id: 'k13', tipo: 'fp', nome: 'Seu Manoel', idade: 58, sexo: 'M', manchester: 'laranja',
      queixa: 'Dor fortíssima nas costas, irradiando para a virilha, desde a madrugada.',
      sinais: { PA: '162/98', FC: 112, FR: 24, SpO2: 98, T: 36.7, Glasgow: 15 },
      extra: 'Inquieto, não acha posição. Sangue na fita de urina.', grave: false, d: 0.89, fatores: ['FC 112 bpm', 'FR 24 irpm', 'PA 162/98'],
      desfecho: 'Cólica renal (cálculo ureteral de 5 mm na tomografia, aorta normal): melhorou com analgesia; alta com encaminhamento ao urologista.',
      licao: 'Dor intensa causa taquicardia e taquipneia. Tratar a dor, afastar causas graves (nesta idade, o aneurisma de aorta) e reavaliar evita ocupar a sala vermelha.' },
    { id: 'k14', tipo: 'vn', nome: 'Ana Beatriz', idade: 30, sexo: 'F', manchester: 'verde',
      queixa: 'Dor de garganta e febre baixa há 2 dias.',
      sinais: { PA: '112/70', FC: 88, FR: 16, SpO2: 99, T: 37.8, Glasgow: 15 },
      extra: 'Amígdalas com placas; engole líquidos sem dificuldade.', grave: false, d: 0.25, fatores: ['T 37,8 °C'],
      desfecho: 'Faringoamigdalite estreptocócica (teste rápido positivo): alta com amoxicilina.',
      licao: 'Baixo risco, e o modelo concordando: a situação mais comum do plantão.' },
    { id: 'k15', tipo: 'vn', nome: 'Seu Benedito', idade: 66, sexo: 'M', manchester: 'azul',
      queixa: 'Veio medir a pressão e renovar a receita; sem queixas novas.',
      sinais: { PA: '148/88', FC: 76, FR: 16, SpO2: 97, T: 36.4, Glasgow: 15 },
      extra: 'Hipertenso em acompanhamento.', grave: false, d: 0.35, fatores: ['66 anos', 'PA 148/88'],
      desfecho: 'Encaminhado à unidade básica de saúde.',
      licao: 'Nem todo idoso é de alto risco: o modelo não alertou — e estava certo.' },
    { id: 'k16', tipo: 'vn', nome: 'Juliana', idade: 41, sexo: 'F', manchester: 'verde',
      queixa: 'Corte na mão com faca de cozinha.',
      sinais: { PA: '124/78', FC: 92, FR: 16, SpO2: 99, T: 36.5, Glasgow: 15 },
      extra: 'Sangramento controlado com compressão; sem lesão de tendão aparente.', grave: false, d: 0.2, fatores: [],
      desfecho: 'Sutura e alta.',
      licao: 'Concordância fácil. O risco aqui seria o inverso: perder tempo discutindo um caso simples.' },
    { id: 'k17', tipo: 'amb', ambiguo: true, nome: 'Dona Rita', idade: 77, sexo: 'F', manchester: 'amarelo',
      queixa: 'Caiu em casa e bateu a cabeça; diz que está bem, “só um galo”.',
      sinais: { PA: '140/80', FC: 80, FR: 16, SpO2: 97, T: 36.4, Glasgow: 15 },
      extra: 'Usa varfarina (anticoagulante). Sem vômitos.', grave: false, d: 0.4, fatores: ['77 anos'],
      desfecho: 'Tomografia normal; ficou 24 horas em observação e teve alta.',
      licao: 'Idosa anticoagulada com trauma de crânio pede tomografia e observação, com ou sem alerta. O modelo responde a outra pergunta (piora em 48 horas), e não à pergunta “precisa de exame?”. O que pesa aqui é a justificativa.' },
    { id: 'k18', tipo: 'vn', nome: 'Seu Zé', idade: 60, sexo: 'M', manchester: 'amarelo',
      queixa: 'Dor no peito há 3 dias, que piora ao respirar fundo e ao apertar o local.',
      sinais: { PA: '134/84', FC: 94, FR: 18, SpO2: 97, T: 36.9, Glasgow: 15 },
      extra: 'Carregou sacos de cimento no fim de semana. ECG normal.', grave: false, d: 0.55, fatores: ['60 anos'],
      desfecho: 'Dor musculoesquelética; troponina negativa; alta.',
      licao: 'Dor torácica reprodutível à palpação, ECG normal e esforço recente: baixo risco. O modelo acertou ao não alertar.' },
    { id: 'k19', tipo: 'vp', nome: 'Gabriel', idade: 16, sexo: 'M', manchester: 'laranja',
      queixa: 'Crise de asma; usou a bombinha 4 vezes, sem melhora.',
      sinais: { PA: '122/76', FC: 120, FR: 30, SpO2: 92, T: 36.8, Glasgow: 15 },
      extra: 'Fala frases curtas. Já foi intubado uma vez, aos 12 anos.', grave: true, d: 0.72, fatores: ['FR 30 irpm', 'SpO₂ 92%', 'FC 120 bpm'],
      desfecho: 'Crise grave de asma: precisou de UTI por 2 dias.',
      licao: 'Asma com intubação prévia é sinal de alto risco. Os sinais vitais estavam no limite: modelos menos sensíveis deixam passar. E há outro detalhe: os modelos foram treinados com adultos, e aos 16 anos ele está no limite do perfil de treino.' }
  ];
  G.idadeTexto = function (c) { return c.idadeTexto || (c.idade + (c.idade === 1 ? ' ano' : ' anos')); };
  G.caso = function (id) {
    var lista = G.CASOS.concat(G.CASOS_HISTORIA || []);
    for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i];
    return null;
  };

  /* ---------------- o que o modelo responde ---------------- */
  var LIMIAR_VALOR = { baixo: 10, medio: 25, alto: 50 };
  G.LIMIAR_VALOR = LIMIAR_VALOR;
  function desvio(casoId, modelo) { return ((G.hash(casoId + ':' + modelo) / 4294967296) - 0.5) * 0.12; }
  function faixa(v, de, ate, frac) { return Math.round(de + (ate - de) * Math.max(0, Math.min(1, frac))); }

  /**
   * Saída de um modelo para um caso.
   * ajuste: { sens: pontos a mais (+) ou a menos (−) na sensibilidade, esp: idem na especificidade }
   */
  G.saidaModelo = function (caso, mid, limiar, ajuste) {
    var m = G.MODELS[mid]; if (!m || !caso) return null;
    limiar = m.limiares[limiar] ? limiar : 'medio';
    ajuste = ajuste || {};
    var L = m.limiares, x = caso.d + desvio(caso.id, mid), escore;
    if (caso.saida === 'baixa') escore = 3 + Math.round((caso.d * 100 + G.hash(caso.id + mid) % 7) % 6);
    else if (mid === 'D' && !caso.uti_pedida) {
      // o TriAI depende do "pedido de vaga de UTI": na triagem, quase sempre em silêncio
      escore = caso.grave ? faixa(0, 4, 9, x) : faixa(0, 2, 7, x);
    } else if (caso.grave) {
      var v = x * 100 - (ajuste.sens || 0), sb = L.baixo[0], sm = L.medio[0], sa = L.alto[0];
      if (v < sa) escore = faixa(0, 50, 95, (sa - v) / Math.max(sa, 1));
      else if (v < sm) escore = faixa(0, 25, 49, (sm - v) / Math.max(sm - sa, 1));
      else if (v < sb) escore = faixa(0, 10, 24, (sb - v) / Math.max(sb - sm, 1));
      else escore = faixa(0, 2, 9, (100 - v) / Math.max(100 - sb, 1));
    } else {
      var u = x * 100 + (ajuste.esp || 0), eb = L.baixo[1], em = L.medio[1], ea = L.alto[1];
      if (u > ea) escore = faixa(0, 50, 80, (u - ea) / Math.max(100 - ea, 1));
      else if (u > em) escore = faixa(0, 25, 49, (u - em) / Math.max(ea - em, 1));
      else if (u > eb) escore = faixa(0, 10, 24, (u - eb) / Math.max(em - eb, 1));
      else escore = faixa(0, 1, 9, u / Math.max(eb, 1));
    }
    var alerta = escore >= LIMIAR_VALOR[limiar];
    return { modelo: mid, nome: m.nome, escore: escore, limiar: limiar, corte: LIMIAR_VALOR[limiar], alerta: alerta, acertou: alerta === !!caso.grave };
  };

  /** Explicação que o modelo mostra na tela (depende do modelo). */
  G.explicacaoModelo = function (caso, mid) {
    var f = (caso.fatores || []).slice(0, 3);
    if (mid === 'A') return { tipo: 'local', titulo: 'O que mais pesou para este paciente', itens: f.length ? f : ['nenhum sinal vital alterado'] };
    if (mid === 'C') {
      var pts = [3, 2, 2, 1];
      return { tipo: 'pontos', titulo: 'Fatores que mais somaram pontos no escore', itens: (caso.fatores || []).slice(0, 4).map(function (x, i) { return x + ' · +' + pts[i]; }) };
    }
    if (mid === 'D') return { tipo: 'global', titulo: 'Variáveis mais importantes do modelo (em geral, não deste paciente)', itens: ['pedido de vaga de UTI', 'lactato', 'idade'] };
    return { tipo: 'nenhuma', titulo: 'O modelo não explica o escore', itens: [] };
  };

  /**
   * Situação do modelo no dia do caso, a partir das decisões da equipe.
   * Usa as flags do INÍCIO do dia: decisões tomadas no mesmo dia valem do dia seguinte em diante.
   */
  G.situacaoModelo = function (ctx, dia, caso) {
    var f = ctx.flags, H = G.HISTORIAS && G.HISTORIAS[ctx.historia];
    var noIncidente = !!(caso && caso.historia);
    var r = { modelo: f.modelo || null, limiar: f.limiar || 'medio', modo: f.golive || 'pleno', semModelo: false, motivo: '', ajuste: { sens: 0, esp: 0 }, avisos: [] };
    if (f.modeloDesligado) { r.semModelo = true; r.motivo = 'O corpo clínico desligou o modelo: a decisão é só sua, com o protocolo de classificação de risco.'; }
    else if (f.iaPausada) { r.semModelo = true; r.motivo = 'Os modelos de IA estão desligados desde a crise do sistema: a decisão é só sua.'; }
    else if (noIncidente && H && H.semModelo) { r.semModelo = true; r.motivo = H.semModelo; }
    else if (noIncidente && f.incidenteClin === 'desligar') { r.semModelo = true; r.motivo = 'O modelo foi desligado durante o incidente: decisão pelo protocolo.'; }
    else if (!r.modelo) { r.semModelo = true; r.motivo = 'Nenhum modelo em uso.'; }
    if (noIncidente && f.incidenteClin === 'limiar') { r.limiar = 'baixo'; r.avisos.push('Limiar baixado durante o incidente.'); }
    if (noIncidente && f.incidenteClin === 'limiar_alto') { r.limiar = 'alto'; r.avisos.push('Limiar subido durante o incidente.'); }
    if (f.recalibrado) { r.ajuste.sens += 4; r.ajuste.esp -= 3; r.avisos.push('Modelo recalibrado com os casos do hospital.'); }
    if (dia >= 24 && (f.deriva === 'manter' || f.deriva === 'limiar' || (ctx.porte === 'alta' && f.monit && f.monit !== 'painel'))) { r.ajuste.sens -= 8; }
    if (r.modo === 'silencioso') r.fase = dia <= 14 ? 'silencioso' : 'ligado';
    else r.fase = r.modo;
    r.textoModo = {
      silencioso: 'Piloto silencioso: o alerta não aparece para a equipe. Você compara a sua conduta com a do modelo.',
      ligado: 'Alerta ligado em todos os plantões, depois de uma semana de piloto silencioso.',
      piloto: 'Piloto no turno diurno, com médico de referência acompanhando os alertas.',
      pleno: 'Alerta ligado em todos os plantões.'
    }[r.fase] || '';
    return r;
  };

  /** Tudo o que a tela do caso precisa: situação + saída do modelo em uso + saídas dos outros candidatos. */
  G.leituraCaso = function (ctx, dia, caso) {
    var sit = G.situacaoModelo(ctx, dia, caso);
    var out = { caso: caso, sit: sit, saida: null, expl: null, outros: [] };
    if (!sit.semModelo) {
      out.saida = G.saidaModelo(caso, sit.modelo, sit.limiar, sit.ajuste);
      out.expl = G.explicacaoModelo(caso, sit.modelo);
    }
    (ctx.flags.shortlist || []).forEach(function (k) {
      if (!sit.semModelo && k === sit.modelo) return;
      var s = G.saidaModelo(caso, k, sit.limiar, k === sit.modelo ? sit.ajuste : {});
      if (s) out.outros.push(s);
    });
    return out;
  };

  /* ---------------- consequências de cada escolha ---------------- */
  function multiplicador(sit) { return { silencioso: 0.5, piloto: 0.75, ligado: 1, pleno: 1 }[sit.fase] || 1; }
  function arred(v) { return Math.round(v * 10) / 10; }

  G.opcoesCaso = function (ctx, dia, caso) {
    var L = G.leituraCaso(ctx, dia, caso), sit = L.sit, s = L.saida, grave = !!caso.grave, mult = multiplicador(sit);
    function efeito(escalou) {
      var certo = escalou === grave, fx = {};
      if (grave && escalou) fx.seguranca = 2;
      if (grave && !escalou) fx.seguranca = -4;
      if (!grave && escalou) fx.eficiencia = -2;
      if (!grave && !escalou) fx.eficiencia = 1;
      Object.keys(fx).forEach(function (k) { fx[k] = arred(fx[k] * (k === 'seguranca' && fx[k] < 0 && ctx.flags.fluxo === 'humano' ? 0.75 : 1) * mult); });
      return { fx: fx, certo: certo };
    }
    function texto(escalou) {
      var e = efeito(escalou), r = [];
      r.push(caso.desfecho);
      if (s) r.push(s.acertou ? 'O modelo acertou.' : (grave ? 'O modelo errou: não alertou num caso grave.' : 'O modelo errou: alarme falso.'));
      r.push(caso.ambiguo ? 'Um caso sem resposta única: vale a qualidade do argumento.' : (e.certo ? 'A conduta escolhida foi a adequada.' : (grave ? 'A conduta atrasou o cuidado de um caso grave.' : 'A conduta ocupou um leito da sala vermelha sem necessidade.')));
      return r.join(' ');
    }
    function q(escalou) { return caso.ambiguo ? 1 : (escalou === grave ? 2 : 0); }
    if (!s) {
      return [
        { id: 'escalar', label: 'Encaminhar para a sala vermelha, com avaliação médica imediata', detalhe: 'Você decide sem o modelo.', fx: efeito(true).fx, q: q(true), consequencia: texto(true), comentario: caso.licao, flags: {} },
        { id: 'fluxo', label: 'Seguir o fluxo da classificação de risco, com reavaliação programada', detalhe: 'Você decide sem o modelo.', fx: efeito(false).fx, q: q(false), consequencia: texto(false), comentario: caso.licao, flags: {} }
      ];
    }
    var lbl = s.alerta ?
      ['Aceito o alerta: sala vermelha e avaliação médica imediata', 'Não aceito o alerta: mantenho o paciente no fluxo da classificação de risco, com reavaliação'] :
      ['Aceito: sem alerta, o paciente segue o fluxo da classificação de risco', 'Não aceito: levo para a sala vermelha, com avaliação médica imediata'];
    function conf(aceitou) {
      var fx = {};
      if (aceitou && s.acertou) fx.confianca = 1;
      if (aceitou && !s.acertou) fx.confianca = -2;
      if (!aceitou && !s.acertou) fx.dados = 1;
      if (!aceitou && s.acertou) fx.confianca = -1;
      return fx;
    }
    var esc1 = s.alerta, esc2 = !s.alerta;
    return [
      { id: 'aceitar', label: lbl[0], detalhe: 'Seguir a indicação do ' + s.nome + '.', fx: Object.assign(efeito(esc1).fx, conf(true)), q: q(esc1), consequencia: texto(esc1), comentario: caso.licao, flags: {} },
      { id: 'recusar', label: lbl[1], detalhe: 'Discordar do ' + s.nome + ' e registrar o motivo.', fx: Object.assign(efeito(esc2).fx, conf(false)), q: q(esc2), consequencia: texto(esc2), comentario: caso.licao, flags: {} }
    ];
  };

  /** Registro de um caso decidido (para o painel de casos, as reuniões e a planilha). */
  G.registroCaso = function (ctx, dia, caso, opcaoId) {
    var L = G.leituraCaso(ctx, dia, caso), s = L.saida;
    var escalou = opcaoId === 'escalar' || (s && ((opcaoId === 'aceitar' && s.alerta) || (opcaoId === 'recusar' && !s.alerta)));
    return {
      dia: dia, caso_id: caso.id, paciente: caso.nome + ', ' + G.idadeTexto(caso), grave: !!caso.grave, ambiguo: !!caso.ambiguo,
      historia: caso.historia || '', semModelo: !s, modelo: s ? s.modelo : '', escore: s ? s.escore : '', alerta: s ? s.alerta : null,
      limiar: L.sit.limiar, fase: L.sit.fase,
      decisao: opcaoId, aceitou: s ? opcaoId === 'aceitar' : null, escalou: !!escalou,
      medicoAcertou: caso.ambiguo ? null : (!!escalou === !!caso.grave), modeloAcertou: s ? s.acertou : null,
      outros: L.outros.map(function (o) { return { modelo: o.modelo, alerta: o.alerta, acertou: o.acertou, escore: o.escore }; })
    };
  };

  /** Resumo de uma lista de registros. */
  G.resumoCasos = function (lista) {
    var r = { n: 0, comModelo: 0, medicoAcertos: 0, medicoAvaliados: 0, modeloAcertos: 0, aceitou: 0, discordou: 0, discordouCerto: 0, aceitouErrado: 0, graves: 0, gravesEscalados: 0, porModelo: {} };
    (lista || []).forEach(function (c) {
      r.n++;
      if (c.medicoAcertou !== null) { r.medicoAvaliados++; if (c.medicoAcertou) r.medicoAcertos++; }
      if (c.grave) { r.graves++; if (c.escalou) r.gravesEscalados++; }
      function conta(mid, acertou, alerta) {
        var p = r.porModelo[mid] = r.porModelo[mid] || { n: 0, acertos: 0, emUso: 0, graves: 0, gravesAlerta: 0, naoGraves: 0, falsos: 0 };
        p.n++; if (acertou) p.acertos++;
        if (c.grave) { p.graves++; if (alerta) p.gravesAlerta++; } else { p.naoGraves++; if (alerta) p.falsos++; }
      }
      if (!c.semModelo) {
        r.comModelo++;
        if (c.modeloAcertou) r.modeloAcertos++;
        conta(c.modelo, c.modeloAcertou, c.alerta); r.porModelo[c.modelo].emUso++;
        if (c.aceitou) { r.aceitou++; if (!c.modeloAcertou && !c.ambiguo) r.aceitouErrado++; }
        else { r.discordou++; if (!c.modeloAcertou && !c.ambiguo) r.discordouCerto++; }
      }
      (c.outros || []).forEach(function (o) { conta(o.modelo, o.acertou, o.alerta); });
    });
    return r;
  };

  /* ---------------- a tarefa do dia ---------------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  G.tarefaCaso = function (dia, caso) {
    return {
      id: 'K' + pad(dia), type: 'decisao', setor: 'urgencia', day: dia, apresentacao: 'caso', peso: 0.5, ordem: 9, paciente: caso,
      titulo: 'Caso do dia: ' + caso.nome + ', ' + G.idadeTexto(caso),
      fase: 'Plantão · Teste do modelo na vida real',
      contexto: function (ctx) {
        var L = G.leituraCaso(ctx, dia, caso), s = L.saida, sv = caso.sinais;
        var h = '<p><b>' + G.esc(caso.nome) + '</b>, ' + G.idadeTexto(caso) + ' · Manchester: ' + G.esc(caso.manchester || '—') + '</p><p>' + G.esc(caso.queixa) + '</p>' +
          '<p>PA ' + sv.PA + ' · FC ' + sv.FC + ' · FR ' + sv.FR + ' · SpO₂ ' + sv.SpO2 + '% · T ' + String(sv.T).replace('.', ',') + ' °C' + (sv.Glasgow ? ' · Glasgow ' + sv.Glasgow : '') + '</p>' +
          (caso.extra ? '<p>' + G.esc(caso.extra) + '</p>' : '');
        h += s ? '<p>Modelo em uso: <b>' + G.esc(s.nome) + '</b> · escore ' + s.escore + '% (corte ' + s.corte + '%) · ' + (s.alerta ? 'ALERTA' : 'sem alerta') + '</p>' : '<p>' + G.esc(L.sit.motivo) + '</p>';
        return h;
      },
      pergunta: 'Você aceita o que o modelo indicou para este paciente? Explique o porquê.',
      opcoes: function (ctx) { return G.opcoesCaso(ctx, dia, caso); },
      conceitos: ['falso_positivo', 'limiar', 'vies_automacao', 'humano_no_circuito', 'apoio_decisao'],
      conceito: 'O modelo é apoio à decisão: acerta muitos casos típicos e erra nos atípicos (idosos frágeis, remédios que mascaram sinais, pacientes fora do perfil de treino). Aceitar sempre é viés de automação; discordar sempre joga fora a ferramenta. O que conta é saber quando e por quê.',
      ra: ['RA5', 'RA6', 'RA7']
    };
  };
})(window.GAME);
