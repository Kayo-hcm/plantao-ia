/**
 * PLANTÃO IA — backend em Google Apps Script
 * Fundamentos de ML e IA em Saúde · CDIA · UPE Caruaru
 *
 * Este script transforma uma planilha Google no banco de dados do jogo.
 * Cada decisão, justificativa, contribuição em reunião e comentário vira
 * uma linha nas abas Decisoes, Reunioes e Comentarios. Os casos clínicos
 * testados pelo médico vão para a aba Casos, e um retrato diário dos
 * indicadores de cada hospital vai para a aba Indicadores.
 *
 * O jogo dura 30 dias: tudo fica na planilha. Para ter cópias de segurança
 * no seu Google Drive, use o menu Plantão IA > Ativar backup diário.
 *
 * COMO INSTALAR (resumo — o passo a passo completo está no README):
 *  1. Crie uma planilha Google e abra Extensões > Apps Script.
 *  2. Apague o conteúdo de Code.gs e cole este arquivo inteiro.
 *  3. Troque a CHAVE_PROFESSOR abaixo por uma senha sua.
 *  4. Rode a função configurarPlanilha (botão ▶ Executar) e autorize.
 *  5. Implantar > Nova implantação > App da Web
 *     Executar como: Eu · Quem pode acessar: Qualquer pessoa.
 *  6. Copie a URL do app da Web e cole em js/config.js do site.
 */

const CHAVE_PROFESSOR = 'troque-esta-chave';   // senha do painel do professor
const MIN_CARACTERES = 1;   // justificativas sem mínimo de tamanho: 1 = não pode ficar vazia; 0 = opcional
const VERSAO = '5.0';
const NDIAS = 30;
const HISTORIAS = ['arbovirose', 'enchente', 'respiratorio', 'ransomware', 'kpc', 'acidente'];
const NOME_HISTORIA = { arbovirose: 'Verão das arboviroses', enchente: 'Depois da enchente', respiratorio: 'Inverno respiratório',
  ransomware: 'Sistemas sequestrados', kpc: 'Superbactéria na UTI', acidente: 'Acidente na BR-232' };
const PASTA_BACKUP = 'Plantão IA — backups';
const BACKUPS_MANTIDOS = 14;

// O porte do hospital acompanha o tamanho da equipe (definido ao iniciar o jogo).
const FUNCOES = ['gestao', 'clinico', 'operacoes', 'cirurgia', 'farmacia', 'ti'];
const PAPEIS_PORTE = {
  essencial: ['gestao', 'clinico', 'ti'],                       // 2 ou 3 jogadores
  regional: ['gestao', 'clinico', 'operacoes', 'ti'],           // 4 jogadores
  alta: ['gestao', 'clinico', 'cirurgia', 'farmacia', 'ti']     // 5 jogadores
};
const NOME_PORTE = { essencial: 'Hospital Essencial', regional: 'Hospital Regional', alta: 'Hospital de Alta Complexidade' };
const NOME_FUNCAO = {
  gestao: 'Gestão (Diretoria)',
  clinico: 'Corpo clínico (Urgência e Especialidades)',
  operacoes: 'Operações (Bloco Cirúrgico e Farmácia)',
  cirurgia: 'Bloco Cirúrgico e Transplantes',
  farmacia: 'Farmácia Hospitalar e Compras',
  ti: 'TI, Dados e BI'
};
function porteDe_(n) { return n >= 5 ? 'alta' : (n === 4 ? 'regional' : 'essencial'); }

const ABAS = {
  Hospitais: ['codigo', 'nome_hospital', 'criado_em', 'criado_por', 'status', 'dia_atual', 'iniciado_em',
    'finalizado_em', 'indice_maturidade', 'qualidade_decisoes', 'saude_hospital', 'indicadores_finais', 'porte', 'n_jogadores',
    'historia', 'bonus_dias'],
  Jogadores: ['id_jogador', 'codigo_hospital', 'nome_hospital', 'nome', 'funcoes', 'entrou_em', 'ultimo_acesso', 'avatar', 'cracha_em'],
  Decisoes: ['timestamp', 'codigo_hospital', 'nome_hospital', 'dia', 'tipo', 'tarefa_id', 'tarefa_titulo', 'funcao',
    'jogador', 'id_jogador', 'opcao_id', 'opcao_escolhida', 'justificativa', 'n_palavras', 'referencia_gabarito',
    'nota_professor', 'comentario_professor'],
  Reunioes: ['timestamp', 'codigo_hospital', 'nome_hospital', 'dia', 'reuniao_id', 'reuniao_titulo', 'funcao',
    'jogador', 'id_jogador', 'contribuicao', 'n_palavras', 'nota_professor', 'comentario_professor'],
  Comentarios: ['timestamp', 'codigo_hospital', 'nome_hospital', 'alvo_tipo', 'alvo_id', 'alvo_funcao',
    'jogador', 'id_jogador', 'funcao_autor', 'comentario'],
  Casos: ['timestamp', 'codigo_hospital', 'nome_hospital', 'historia', 'dia', 'tarefa_id', 'caso_id', 'paciente', 'modelo', 'escore',
    'limiar', 'fase', 'alerta_modelo', 'decisao_medico', 'justificativa', 'n_palavras', 'desfecho_real', 'medico_acertou', 'modelo_acertou',
    'jogador', 'id_jogador', 'nota_professor', 'comentario_professor'],
  Indicadores: ['timestamp', 'codigo_hospital', 'nome_hospital', 'historia', 'dia', 'indice', 'qualidade', 'saude', 'orcamento',
    'seguranca', 'eficiencia', 'confianca', 'conformidade', 'dados', 'casos_testados', 'medico_acertos'],
  Log: ['timestamp', 'codigo_hospital', 'evento', 'detalhe']
};

/* =========================================================================
   Entrada HTTP
   ========================================================================= */
function doGet(e) {
  return json_({ ok: true, app: 'Plantão IA', versao: VERSAO, mensagem: 'Backend no ar. O jogo usa requisições POST.' });
}

function doPost(e) {
  let req;
  try {
    req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ ok: false, erro: 'Requisição inválida.' });
  }
  try {
    const out = rotear_(req) || {};
    out.ok = true;
    return json_(out);
  } catch (err) {
    return json_({ ok: false, erro: err && err.message ? err.message : String(err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function rotear_(req) {
  switch (req.action) {
    case 'ping': return { app: 'Plantão IA', versao: VERSAO };
    case 'criarHospital': return comTrava_(() => criarHospital_(req));
    case 'entrar': return comTrava_(() => entrar_(req));
    case 'estado': return estado_(req);
    case 'assumirFuncao': return comTrava_(() => assumirFuncao_(req));
    case 'liberarFuncao': return comTrava_(() => liberarFuncao_(req));
    case 'salvarAvatar': return comTrava_(() => salvarAvatar_(req));
    case 'iniciar': return comTrava_(() => iniciar_(req));
    case 'decidir': return comTrava_(() => decidir_(req));
    case 'contribuir': return comTrava_(() => contribuir_(req));
    case 'comentar': return comTrava_(() => comentar_(req));
    case 'progresso': return comTrava_(() => progresso_(req));
    case 'professorListar': return professorListar_(req);
    case 'professorDefinirHistoria': return comTrava_(() => professorDefinirHistoria_(req));
    case 'professorLiberarDias': return comTrava_(() => professorLiberarDias_(req));
    default: throw new Error('Ação desconhecida: ' + req.action);
  }
}

function comTrava_(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) throw new Error('Servidor ocupado. Tente de novo em alguns segundos.');
  try { return fn(); } finally { lock.releaseLock(); }
}

/* =========================================================================
   Ações do jogo
   ========================================================================= */
function criarHospital_(req) {
  const nomeHosp = texto_(req.nome_hospital, 60);
  const nome = texto_(req.nome, 40);
  if (nomeHosp.length < 2) throw new Error('Dê um nome ao hospital.');
  if (nome.length < 2) throw new Error('Informe o seu nome.');
  const existentes = linhas_('Hospitais').map(h => String(h.codigo));
  let codigo;
  do { codigo = gerarCodigo_(); } while (existentes.indexOf(codigo) >= 0);
  const agora = new Date();
  anexar_('Hospitais', { codigo, nome_hospital: nomeHosp, criado_em: agora, criado_por: nome, status: 'lobby', dia_atual: 0 });
  const id = novoId_();
  anexar_('Jogadores', { id_jogador: id, codigo_hospital: codigo, nome_hospital: nomeHosp, nome, funcoes: '', entrou_em: agora, ultimo_acesso: agora });
  log_(codigo, 'hospital_criado', nomeHosp + ' — por ' + nome);
  limparCache_(codigo);
  return { codigo, id_jogador: id, nome, nome_hospital: nomeHosp };
}

function entrar_(req) {
  const codigo = String(req.codigo || '').trim().toUpperCase();
  const nome = texto_(req.nome, 40);
  if (nome.length < 2) throw new Error('Informe o seu nome.');
  const h = hospital_(codigo);
  const jogs = linhas_('Jogadores').filter(j => String(j.codigo_hospital) === codigo);
  const mesmo = jogs.find(j => normal_(j.nome) === normal_(nome));
  if (mesmo) {
    log_(codigo, 'jogador_retomou', nome);
    return { codigo, id_jogador: mesmo.id_jogador, nome: mesmo.nome, nome_hospital: h.nome_hospital, retomado: true };
  }
  if (jogs.length >= 5) throw new Error('Este hospital já tem 5 jogadores.');
  const id = novoId_();
  const agora = new Date();
  anexar_('Jogadores', { id_jogador: id, codigo_hospital: codigo, nome_hospital: h.nome_hospital, nome, funcoes: '', entrou_em: agora, ultimo_acesso: agora });
  log_(codigo, 'jogador_entrou', nome);
  limparCache_(codigo);
  return { codigo, id_jogador: id, nome, nome_hospital: h.nome_hospital, retomado: false };
}

function estado_(req) {
  const codigo = String(req.codigo || '').trim().toUpperCase();
  if (req.id_jogador) marcarAcesso_(codigo, req.id_jogador);
  const emCache = cacheLer_(codigo);
  if (emCache) return emCache;

  const h = hospital_(codigo);
  const filtra = (aba) => linhas_(aba).filter(r => String(r.codigo_hospital) === codigo);
  const out = {
    hospital: {
      codigo: h.codigo, nome_hospital: h.nome_hospital, status: h.status, dia_atual: h.dia_atual,
      criado_em: h.criado_em, iniciado_em: h.iniciado_em, finalizado_em: h.finalizado_em, porte: h.porte || '',
      historia: h.historia || '', bonus_dias: Number(h.bonus_dias) || 0
    },
    jogadores: filtra('Jogadores').map(j => ({
      id_jogador: j.id_jogador, nome: j.nome, funcoes: j.funcoes, entrou_em: j.entrou_em, ultimo_acesso: j.ultimo_acesso,
      avatar: j.avatar || '', cracha_em: j.cracha_em || ''
    })),
    decisoes: filtra('Decisoes').map(d => ({
      timestamp: d.timestamp, dia: d.dia, tipo: d.tipo, tarefa_id: d.tarefa_id, funcao: d.funcao, jogador: d.jogador,
      id_jogador: d.id_jogador, opcao_id: d.opcao_id, opcao_escolhida: d.opcao_escolhida, justificativa: d.justificativa
    })),
    reunioes: filtra('Reunioes').map(r => ({
      timestamp: r.timestamp, dia: r.dia, reuniao_id: r.reuniao_id, funcao: r.funcao, jogador: r.jogador,
      id_jogador: r.id_jogador, contribuicao: r.contribuicao
    })),
    comentarios: filtra('Comentarios').map(c => ({
      timestamp: c.timestamp, alvo_tipo: c.alvo_tipo, alvo_id: c.alvo_id, alvo_funcao: c.alvo_funcao,
      jogador: c.jogador, id_jogador: c.id_jogador, funcao_autor: c.funcao_autor, comentario: c.comentario
    }))
  };
  cacheGravar_(codigo, out);
  return out;
}

function assumirFuncao_(req) {
  const codigo = String(req.codigo || '').trim().toUpperCase();
  const funcao = String(req.funcao || '');
  if (FUNCOES.indexOf(funcao) < 0) throw new Error('Função inválida.');
  const h = hospital_(codigo);
  if (h.status === 'finalizado') throw new Error('O jogo deste hospital já terminou.');
  if (h.porte && PAPEIS_PORTE[h.porte] && PAPEIS_PORTE[h.porte].indexOf(funcao) < 0) throw new Error('Esta função não existe no porte deste hospital.');
  const just = texto_(req.justificativa, 3000);
  if (just.length < MIN_CARACTERES) throw new Error('Conte, mesmo que em poucas palavras, por que você assume esta função.');
  const tab = tabela_('Jogadores');
  const eu = tab.linhas.find(j => String(j.codigo_hospital) === codigo && String(j.id_jogador) === String(req.id_jogador));
  if (!eu) throw new Error('Jogador não encontrado neste hospital.');
  const dono = tab.linhas.find(j => String(j.codigo_hospital) === codigo && listaFuncoes_(j.funcoes).indexOf(funcao) >= 0);
  let tipoRegistro = 'FUNCAO';
  if (dono && String(dono.id_jogador) === String(eu.id_jogador)) return { funcoes: eu.funcoes };
  if (dono) {
    if (h.status === 'lobby') throw new Error('Esta função já é de ' + dono.nome + '. Peça para liberar ou escolha outra.');
    // Durante o jogo: transferência (ex.: colega ausente)
    const restantes = listaFuncoes_(dono.funcoes).filter(f => f !== funcao);
    atualizar_(tab, dono._linha, { funcoes: restantes.join(',') });
    tipoRegistro = 'TRANSFERENCIA';
    log_(codigo, 'funcao_transferida', funcao + ': ' + dono.nome + ' → ' + eu.nome);
  }
  const minhas = listaFuncoes_(eu.funcoes);
  minhas.push(funcao);
  const ordenadas = FUNCOES.filter(f => minhas.indexOf(f) >= 0);
  atualizar_(tab, eu._linha, { funcoes: ordenadas.join(',') });
  anexar_('Decisoes', {
    timestamp: new Date(), codigo_hospital: codigo, nome_hospital: h.nome_hospital, dia: Number(h.dia_atual) || 0,
    tipo: 'funcao', tarefa_id: tipoRegistro, tarefa_titulo: tipoRegistro === 'FUNCAO' ? 'Escolha de função' : 'Transferência de função',
    funcao, jogador: eu.nome, id_jogador: eu.id_jogador, opcao_id: funcao, opcao_escolhida: NOME_FUNCAO[funcao],
    justificativa: just, n_palavras: palavras_(just)
  });
  log_(codigo, 'funcao_assumida', eu.nome + ' → ' + funcao);
  limparCache_(codigo);
  return { funcoes: ordenadas.join(',') };
}

/** Vestiário: guarda a aparência escolhida pelo jogador (é o momento em que ele "pega o crachá"). */
const CAMPOS_AVATAR = ['pele', 'cabelo', 'corCabelo', 'roupa', 'corRoupa', 'oculos', 'barba', 'acessorio'];
function limparAvatar_(a) {
  if (typeof a === 'string') { try { a = JSON.parse(a); } catch (e) { a = null; } }
  if (!a || typeof a !== 'object') throw new Error('Avatar inválido.');
  const out = {};
  CAMPOS_AVATAR.forEach(k => {
    const v = String(a[k] === undefined || a[k] === null ? '' : a[k]);
    if (!/^[a-z0-9-]{1,20}$/.test(v)) throw new Error('Avatar inválido.');
    out[k] = v;
  });
  return JSON.stringify(out);
}
function salvarAvatar_(req) {
  const codigo = String(req.codigo || '').trim().toUpperCase();
  hospital_(codigo);
  const avatar = limparAvatar_(req.avatar);
  garantirCabecalho_('Jogadores');
  const tab = tabela_('Jogadores');
  const eu = tab.linhas.find(j => String(j.codigo_hospital) === codigo && String(j.id_jogador) === String(req.id_jogador));
  if (!eu) throw new Error('Jogador não encontrado neste hospital.');
  const quando = new Date();
  atualizar_(tab, eu._linha, { avatar: avatar, cracha_em: quando });
  log_(codigo, 'cracha_emitido', eu.nome);
  limparCache_(codigo);
  return { avatar: avatar, cracha_em: quando };
}

function liberarFuncao_(req) {
  const codigo = String(req.codigo || '').trim().toUpperCase();
  const h = hospital_(codigo);
  if (h.status !== 'lobby') throw new Error('Durante o jogo, um colega pode assumir a função na aba Equipe.');
  const tab = tabela_('Jogadores');
  const eu = tab.linhas.find(j => String(j.codigo_hospital) === codigo && String(j.id_jogador) === String(req.id_jogador));
  if (!eu) throw new Error('Jogador não encontrado neste hospital.');
  const restantes = listaFuncoes_(eu.funcoes).filter(f => f !== req.funcao);
  atualizar_(tab, eu._linha, { funcoes: restantes.join(',') });
  log_(codigo, 'funcao_liberada', eu.nome + ' liberou ' + req.funcao);
  limparCache_(codigo);
  return { funcoes: restantes.join(',') };
}

function iniciar_(req) {
  const codigo = String(req.codigo || '').trim().toUpperCase();
  const tabH = tabela_('Hospitais');
  const h = tabH.linhas.find(x => String(x.codigo) === codigo);
  if (!h) throw new Error('Hospital não encontrado.');
  if (h.status !== 'lobby') return { status: h.status };
  const tabJ = tabela_('Jogadores');
  const jogs = tabJ.linhas.filter(j => String(j.codigo_hospital) === codigo);
  if (jogs.length < 2) throw new Error('São necessários pelo menos 2 jogadores.');
  const porte = porteDe_(jogs.length);
  const papeis = PAPEIS_PORTE[porte];
  const donoDe = {};
  jogs.forEach(j => listaFuncoes_(j.funcoes).forEach(f => { if (papeis.indexOf(f) >= 0) donoDe[f] = String(j.id_jogador); }));
  const faltam = papeis.filter(f => !donoDe[f]);
  if (faltam.length) throw new Error('Funções sem responsável: ' + faltam.map(f => NOME_FUNCAO[f]).join(', ') + '.');
  if (donoDe.gestao === donoDe.clinico) throw new Error('Gestão e Clínica precisam ser pessoas diferentes.');
  const semCracha = jogs.filter(j => listaFuncoes_(j.funcoes).some(f => papeis.indexOf(f) >= 0) && !String(j.avatar || '').trim());
  if (semCracha.length) throw new Error('Falta pegar o crachá: ' + semCracha.map(j => j.nome).join(', ') + '.');
  // remove funções que não existem neste porte (escolhidas quando a equipe tinha outro tamanho)
  jogs.forEach(j => {
    const validas = listaFuncoes_(j.funcoes).filter(f => papeis.indexOf(f) >= 0).join(',');
    if (validas !== String(j.funcoes || '')) atualizar_(tabJ, j._linha, { funcoes: validas });
  });
  garantirCabecalho_('Hospitais');
  const tabH2 = tabela_('Hospitais');
  const h2 = tabH2.linhas.find(x => String(x.codigo) === codigo);
  const historia = HISTORIAS.indexOf(String(h2.historia || '')) >= 0 ? String(h2.historia) : sortearHistoria_(tabH2.linhas);
  atualizar_(tabH2, h2._linha, { status: 'em_jogo', dia_atual: 1, iniciado_em: new Date(), porte, n_jogadores: jogs.length, historia, bonus_dias: Number(h2.bonus_dias) || 0 });
  log_(codigo, 'jogo_iniciado', NOME_PORTE[porte] + ' · ' + NOME_HISTORIA[historia] + ' · ' + jogs.map(j => j.nome + ' (' + j.funcoes + ')').join('; '));
  limparCache_(codigo);
  return { status: 'em_jogo', porte };
}

/** Sorteio equilibrado: entre as histórias menos usadas pelos grupos que já começaram, uma ao acaso. */
function sortearHistoria_(hospitais) {
  const uso = {};
  HISTORIAS.forEach(x => { uso[x] = 0; });
  hospitais.forEach(h => { const k = String(h.historia || ''); if (uso[k] !== undefined && h.status !== 'lobby') uso[k]++; });
  const min = Math.min.apply(null, HISTORIAS.map(x => uso[x]));
  const menos = HISTORIAS.filter(x => uso[x] === min);
  return menos[Math.floor(Math.random() * menos.length)];
}

function decidir_(req) {
  const codigo = String(req.codigo || '').trim().toUpperCase();
  const h = hospital_(codigo);
  if (h.status !== 'em_jogo') throw new Error('O jogo não está em andamento.');
  const eu = jogador_(codigo, req.id_jogador);
  const funcao = String(req.funcao || '');
  if (listaFuncoes_(eu.funcoes).indexOf(funcao) < 0) throw new Error('Esta decisão é de outra função.');
  const just = texto_(req.justificativa, 5000);
  if (just.length < MIN_CARACTERES) throw new Error('Escreva o porquê da decisão — pode ser curto.');
  const tarefa = String(req.tarefa_id || '');
  const ja = linhas_('Decisoes').find(d => String(d.codigo_hospital) === codigo && String(d.tarefa_id) === tarefa && d.tipo === 'decisao');
  if (ja) throw new Error('Esta decisão já foi registrada por ' + ja.jogador + '.');
  anexar_('Decisoes', {
    timestamp: new Date(), codigo_hospital: codigo, nome_hospital: h.nome_hospital, dia: Number(req.dia) || '',
    tipo: 'decisao', tarefa_id: tarefa, tarefa_titulo: texto_(req.tarefa_titulo, 200), funcao,
    jogador: eu.nome, id_jogador: eu.id_jogador, opcao_id: texto_(req.opcao_id, 100),
    opcao_escolhida: texto_(req.opcao_escolhida, 1000), justificativa: just, n_palavras: palavras_(just),
    referencia_gabarito: texto_(req.referencia, 60)
  });
  if (req.caso && typeof req.caso === 'object') {
    const k = req.caso;
    anexar_('Casos', {
      timestamp: new Date(), codigo_hospital: codigo, nome_hospital: h.nome_hospital, historia: h.historia || '', dia: Number(req.dia) || '',
      tarefa_id: tarefa, caso_id: texto_(k.caso_id, 20), paciente: texto_(k.paciente, 80), modelo: texto_(k.modelo, 40),
      escore: k.escore === '' || k.escore === undefined ? '' : Number(k.escore), limiar: texto_(k.limiar, 10), fase: texto_(k.fase, 20),
      alerta_modelo: texto_(k.alerta_modelo, 20), decisao_medico: texto_(k.decisao_medico, 40), justificativa: just, n_palavras: palavras_(just),
      desfecho_real: texto_(k.desfecho_real, 40), medico_acertou: texto_(k.medico_acertou, 20), modelo_acertou: texto_(k.modelo_acertou, 10),
      jogador: eu.nome, id_jogador: eu.id_jogador
    });
  }
  log_(codigo, 'decisao', tarefa + ' por ' + eu.nome);
  limparCache_(codigo);
  return { registrado: true };
}

function contribuir_(req) {
  const codigo = String(req.codigo || '').trim().toUpperCase();
  const h = hospital_(codigo);
  if (h.status !== 'em_jogo') throw new Error('O jogo não está em andamento.');
  const eu = jogador_(codigo, req.id_jogador);
  const funcao = String(req.funcao || '');
  if (listaFuncoes_(eu.funcoes).indexOf(funcao) < 0) throw new Error('Esta fala é de outra função.');
  const txt = texto_(req.contribuicao, 5000);
  if (txt.length < MIN_CARACTERES) throw new Error('Escreva sua fala na reunião — pode ser curta.');
  const reu = String(req.reuniao_id || '');
  const ja = linhas_('Reunioes').find(r => String(r.codigo_hospital) === codigo && String(r.reuniao_id) === reu && String(r.funcao) === funcao);
  if (ja) throw new Error('Esta função já falou nesta reunião.');
  anexar_('Reunioes', {
    timestamp: new Date(), codigo_hospital: codigo, nome_hospital: h.nome_hospital, dia: Number(req.dia) || '',
    reuniao_id: reu, reuniao_titulo: texto_(req.reuniao_titulo, 200), funcao, jogador: eu.nome,
    id_jogador: eu.id_jogador, contribuicao: txt, n_palavras: palavras_(txt)
  });
  log_(codigo, 'reuniao', reu + ' — ' + funcao + ' por ' + eu.nome);
  limparCache_(codigo);
  return { registrado: true };
}

function comentar_(req) {
  const codigo = String(req.codigo || '').trim().toUpperCase();
  const h = hospital_(codigo);
  const eu = jogador_(codigo, req.id_jogador);
  const txt = texto_(req.comentario, 2000);
  if (!txt.length) throw new Error('Escreva um comentário.');
  anexar_('Comentarios', {
    timestamp: new Date(), codigo_hospital: codigo, nome_hospital: h.nome_hospital,
    alvo_tipo: texto_(req.alvo_tipo, 20), alvo_id: texto_(req.alvo_id, 60), alvo_funcao: texto_(req.alvo_funcao, 20),
    jogador: eu.nome, id_jogador: eu.id_jogador, funcao_autor: eu.funcoes, comentario: txt
  });
  limparCache_(codigo);
  return { registrado: true };
}

function progresso_(req) {
  const codigo = String(req.codigo || '').trim().toUpperCase();
  const tabH = tabela_('Hospitais');
  const h = tabH.linhas.find(x => String(x.codigo) === codigo);
  if (!h || h.status === 'lobby') return { atualizado: false };
  const dia = Math.max(1, Math.min(NDIAS, Number(req.dia) || 1));
  const mud = {};
  if (dia > (Number(h.dia_atual) || 0)) {
    mud.dia_atual = dia;
    log_(codigo, 'dia_iniciado', 'Dia ' + dia);
    const ind = req.indicadores || {}, cs = req.casos || {};
    const num = v => (v === undefined || v === null || v === '' || isNaN(Number(v))) ? '' : Number(v);
    anexar_('Indicadores', {
      timestamp: new Date(), codigo_hospital: codigo, nome_hospital: h.nome_hospital, historia: h.historia || '', dia,
      indice: num(req.indice), qualidade: num(req.qualidade), saude: num(req.saude), orcamento: num(ind.orcamento), seguranca: num(ind.seguranca),
      eficiencia: num(ind.eficiencia), confianca: num(ind.confianca), conformidade: num(ind.conformidade), dados: num(ind.dados),
      casos_testados: num(cs.testados), medico_acertos: num(cs.medico_acertos)
    });
  }
  if (req.finalizado && h.status !== 'finalizado') {
    mud.status = 'finalizado';
    mud.finalizado_em = new Date();
    mud.indice_maturidade = Number(req.indice) || 0;
    mud.qualidade_decisoes = Number(req.qualidade) || 0;
    mud.saude_hospital = Number(req.saude) || 0;
    mud.indicadores_finais = texto_(JSON.stringify(req.indicadores || {}), 1000);
    log_(codigo, 'jogo_finalizado', 'Índice ' + mud.indice_maturidade);
  }
  if (Object.keys(mud).length) { atualizar_(tabH, h._linha, mud); limparCache_(codigo); }
  return { atualizado: Object.keys(mud).length > 0 };
}

function checarChave_(req) {
  if (CHAVE_PROFESSOR === 'troque-esta-chave') throw new Error('Defina a CHAVE_PROFESSOR no início do Code.gs e reimplante o app.');
  if (String(req.chave || '') !== CHAVE_PROFESSOR) throw new Error('Chave do professor incorreta.');
}

function professorDefinirHistoria_(req) {
  checarChave_(req);
  const codigo = String(req.codigo || '').trim().toUpperCase();
  garantirCabecalho_('Hospitais');
  const tab = tabela_('Hospitais');
  const h = tab.linhas.find(x => String(x.codigo) === codigo);
  if (!h) throw new Error('Hospital não encontrado.');
  if (h.status !== 'lobby') throw new Error('A história só pode ser trocada antes de o grupo iniciar o plantão.');
  const historia = String(req.historia || '');
  if (historia && HISTORIAS.indexOf(historia) < 0) throw new Error('História inválida.');
  atualizar_(tab, h._linha, { historia });
  log_(codigo, 'historia_definida', historia ? NOME_HISTORIA[historia] : 'sorteio');
  limparCache_(codigo);
  return { historia };
}

function professorLiberarDias_(req) {
  checarChave_(req);
  const codigo = String(req.codigo || '').trim().toUpperCase();
  garantirCabecalho_('Hospitais');
  const tab = tabela_('Hospitais');
  const h = tab.linhas.find(x => String(x.codigo) === codigo);
  if (!h) throw new Error('Hospital não encontrado.');
  const n = Math.max(-30, Math.min(30, Number(req.dias) || 0));
  const bonus = Math.max(0, (Number(h.bonus_dias) || 0) + n);
  atualizar_(tab, h._linha, { bonus_dias: bonus });
  log_(codigo, 'dias_liberados', (n > 0 ? '+' : '') + n + ' (total extra: ' + bonus + ')');
  limparCache_(codigo);
  return { bonus_dias: bonus };
}

function professorListar_(req) {
  checarChave_(req);
  const conta = (aba) => {
    const c = {};
    linhas_(aba).forEach(r => { const k = String(r.codigo_hospital); c[k] = (c[k] || 0) + 1; });
    return c;
  };
  const nj = conta('Jogadores'), nd = conta('Decisoes'), nr = conta('Reunioes'), nc = conta('Comentarios'), nk = conta('Casos');
  return {
    historias: HISTORIAS,
    hospitais: linhas_('Hospitais').map(h => ({
      codigo: h.codigo, nome_hospital: h.nome_hospital, status: h.status, dia_atual: h.dia_atual,
      criado_em: h.criado_em, criado_por: h.criado_por, indice_maturidade: h.indice_maturidade, porte: h.porte || '',
      historia: h.historia || '', bonus_dias: Number(h.bonus_dias) || 0, iniciado_em: h.iniciado_em,
      jogadores: nj[h.codigo] || 0, decisoes: nd[h.codigo] || 0, reunioes: nr[h.codigo] || 0, comentarios: nc[h.codigo] || 0, casos: nk[h.codigo] || 0
    }))
  };
}

/* =========================================================================
   Planilha
   ========================================================================= */
function planilha_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Este script precisa ser criado a partir da planilha (Extensões > Apps Script).');
  return ss;
}

function aba_(nome) {
  const ss = planilha_();
  let sh = ss.getSheetByName(nome);
  if (!sh) {
    sh = ss.insertSheet(nome);
    sh.getRange(1, 1, 1, ABAS[nome].length).setValues([ABAS[nome]]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function tabela_(nome) {
  const sh = aba_(nome);
  const valores = sh.getDataRange().getValues();
  const cab = valores[0] || ABAS[nome];
  const linhas = [];
  for (let i = 1; i < valores.length; i++) {
    const o = { _linha: i + 1 };
    cab.forEach((c, j) => { o[c] = valores[i][j]; });
    linhas.push(o);
  }
  return { sh, cab, linhas };
}

function linhas_(nome) { return tabela_(nome).linhas; }

/** Acrescenta ao cabeçalho as colunas novas (planilhas criadas por versões anteriores). */
function garantirCabecalho_(nome) {
  const sh = aba_(nome);
  const ultima = Math.max(sh.getLastColumn(), 1);
  const atual = sh.getRange(1, 1, 1, ultima).getValues()[0].map(String);
  const faltam = ABAS[nome].filter(c => atual.indexOf(c) < 0);
  if (faltam.length) sh.getRange(1, ultima + 1, 1, faltam.length).setValues([faltam]).setFontWeight('bold');
  return faltam;
}

function anexar_(nome, obj) {
  const sh = aba_(nome);
  const cab = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  sh.appendRow(cab.map(c => (obj[c] === undefined || obj[c] === null) ? '' : obj[c]));
}

function atualizar_(tab, linha, mud) {
  Object.keys(mud).forEach(k => {
    const col = tab.cab.indexOf(k);
    if (col >= 0) tab.sh.getRange(linha, col + 1).setValue(mud[k]);
  });
}

function hospital_(codigo) {
  const h = linhas_('Hospitais').find(x => String(x.codigo) === String(codigo));
  if (!h) throw new Error('Hospital não encontrado. Confira o código.');
  return h;
}

function jogador_(codigo, id) {
  const j = linhas_('Jogadores').find(x => String(x.codigo_hospital) === codigo && String(x.id_jogador) === String(id));
  if (!j) throw new Error('Jogador não encontrado neste hospital. Entre novamente com o código.');
  return j;
}

function marcarAcesso_(codigo, id) {
  const cache = CacheService.getScriptCache();
  const k = 'ac_' + id;
  if (cache.get(k)) return;
  cache.put(k, '1', 120);
  try {
    const tab = tabela_('Jogadores');
    const j = tab.linhas.find(x => String(x.codigo_hospital) === codigo && String(x.id_jogador) === String(id));
    if (j) atualizar_(tab, j._linha, { ultimo_acesso: new Date() });
  } catch (e) { /* não crítico */ }
}

/* Cache do estado de cada hospital: o estado de 30 dias pode passar de 100 KB
   (limite por chave do CacheService), então é guardado em partes. */
const CACHE_PARTE = 90000, CACHE_MAX_PARTES = 10, CACHE_SEG = 30;
function chavesCache_(codigo) {
  const k = ['est_' + codigo];
  for (let i = 0; i < CACHE_MAX_PARTES; i++) k.push('est_' + codigo + '_' + i);
  return k;
}
function cacheLer_(codigo) {
  try {
    const cache = CacheService.getScriptCache();
    const meta = cache.get('est_' + codigo);
    if (!meta) return null;
    const n = Number(meta);
    if (!n) return null;
    const chaves = []; for (let i = 0; i < n; i++) chaves.push('est_' + codigo + '_' + i);
    const partes = cache.getAll(chaves);
    let txt = '';
    for (let i = 0; i < n; i++) { const p = partes['est_' + codigo + '_' + i]; if (p === undefined || p === null) return null; txt += p; }
    return JSON.parse(txt);
  } catch (e) { return null; }
}
function cacheGravar_(codigo, obj) {
  try {
    const txt = JSON.stringify(obj);
    const n = Math.ceil(txt.length / CACHE_PARTE);
    if (n > CACHE_MAX_PARTES) return;
    const valores = {};
    for (let i = 0; i < n; i++) valores['est_' + codigo + '_' + i] = txt.slice(i * CACHE_PARTE, (i + 1) * CACHE_PARTE);
    const cache = CacheService.getScriptCache();
    cache.putAll(valores, CACHE_SEG);
    cache.put('est_' + codigo, String(n), CACHE_SEG);
  } catch (e) { /* sem cache: tudo bem, lê da planilha */ }
}
function limparCache_(codigo) { CacheService.getScriptCache().removeAll(chavesCache_(codigo)); }

function log_(codigo, evento, detalhe) {
  anexar_('Log', { timestamp: new Date(), codigo_hospital: codigo, evento, detalhe: texto_(detalhe, 1000) });
}

/* =========================================================================
   Utilidades
   ========================================================================= */
function texto_(s, max) {
  let t = String(s === undefined || s === null ? '' : s).replace(/\r\n/g, '\n').trim();
  if (max && t.length > max) t = t.slice(0, max);
  if (/^[=+\-@]/.test(t)) t = "'" + t;   // impede que o texto vire fórmula na planilha
  return t;
}
function normal_(s) { return String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
function palavras_(s) { const t = String(s || '').trim(); return t ? t.split(/\s+/).length : 0; }
function listaFuncoes_(s) { return String(s || '').split(',').map(x => x.trim()).filter(Boolean); }
// Identificadores sempre começam com letra, para a planilha nunca convertê-los em número
function novoId_() { return 'j' + Utilities.getUuid().replace(/-/g, '').slice(0, 11); }
function gerarCodigo_() {
  const letras = 'ABCDFGHJKLMNPQRSTUVWXYZ';
  const alfa = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = letras.charAt(Math.floor(Math.random() * letras.length));
  for (let i = 1; i < 5; i++) c += alfa.charAt(Math.floor(Math.random() * alfa.length));
  return c;
}

/* =========================================================================
   Configuração inicial (rode uma vez pelo editor)
   ========================================================================= */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Plantão IA')
    .addItem('Configurar / reformatar abas', 'configurarPlanilha')
    .addSeparator()
    .addItem('Fazer backup agora', 'fazerBackupAgora')
    .addItem('Ativar backup diário (Google Drive)', 'instalarBackupDiario')
    .addItem('Desativar backup diário', 'removerBackupDiario')
    .addToUi();
}

/* =========================================================================
   Cópias de segurança no Google Drive
   Uma cópia da planilha inteira vai para a pasta "Plantão IA — backups" do
   seu Drive. São mantidas as 14 cópias mais recentes.
   ========================================================================= */
function pastaBackup_() {
  const it = DriveApp.getFoldersByName(PASTA_BACKUP);
  return it.hasNext() ? it.next() : DriveApp.createFolder(PASTA_BACKUP);
}
function fazerBackupAgora() {
  const ss = planilha_();
  const pasta = pastaBackup_();
  const nome = ss.getName() + ' — backup ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH-mm');
  DriveApp.getFileById(ss.getId()).makeCopy(nome, pasta);
  // mantém só as cópias mais recentes
  const arquivos = [];
  const it = pasta.getFiles();
  while (it.hasNext()) { const f = it.next(); if (f.getName().indexOf(ss.getName() + ' — backup ') === 0) arquivos.push(f); }
  arquivos.sort((a, b) => b.getDateCreated() - a.getDateCreated());
  arquivos.slice(BACKUPS_MANTIDOS).forEach(f => f.setTrashed(true));
  try { log_('', 'backup', nome); } catch (e) { }
  return 'Backup criado: ' + nome;
}
function instalarBackupDiario() {
  removerBackupDiario();
  ScriptApp.newTrigger('fazerBackupAgora').timeBased().everyDays(1).atHour(3).create();
  fazerBackupAgora();
  try { SpreadsheetApp.getUi().alert('Backup diário ativado: toda madrugada, uma cópia da planilha vai para a pasta "' + PASTA_BACKUP + '" do seu Google Drive (ficam as ' + BACKUPS_MANTIDOS + ' mais recentes).'); } catch (e) { }
  return 'Backup diário ativado.';
}
function removerBackupDiario() {
  ScriptApp.getProjectTriggers().forEach(t => { if (t.getHandlerFunction() === 'fazerBackupAgora') ScriptApp.deleteTrigger(t); });
  return 'Backup diário desativado.';
}

function configurarPlanilha() {
  const ss = planilha_();
  Object.keys(ABAS).forEach(nome => {
    const sh = aba_(nome);
    garantirCabecalho_(nome);
    const cab = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
    sh.getRange(1, 1, 1, cab.length).setFontWeight('bold')
      .setBackground('#16335B').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
    const larg = { justificativa: 420, contribuicao: 420, comentario: 360, opcao_escolhida: 300, tarefa_titulo: 260,
      reuniao_titulo: 260, detalhe: 360, comentario_professor: 260, indicadores_finais: 300, paciente: 200, decisao_medico: 170 };
    cab.forEach((c, i) => {
      sh.setColumnWidth(i + 1, larg[c] || 130);
      if (larg[c]) sh.getRange(2, i + 1, Math.max(sh.getMaxRows() - 1, 1), 1).setWrap(true);
    });
    ['timestamp', 'criado_em', 'iniciado_em', 'finalizado_em', 'entrou_em', 'ultimo_acesso', 'cracha_em'].forEach(c => {
      const i = cab.indexOf(c);
      if (i >= 0) sh.getRange(2, i + 1, Math.max(sh.getMaxRows() - 1, 1), 1).setNumberFormat('dd/mm/yyyy hh:mm:ss');
    });
    ['codigo', 'codigo_hospital', 'id_jogador', 'opcao_id', 'tarefa_id', 'reuniao_id', 'alvo_id', 'funcoes', 'caso_id', 'historia'].forEach(c => {
      const i = cab.indexOf(c);
      if (i >= 0) sh.getRange(2, i + 1, Math.max(sh.getMaxRows() - 1, 1), 1).setNumberFormat('@');
    });
    ['nota_professor', 'comentario_professor'].forEach(c => {
      const i = cab.indexOf(c);
      if (i >= 0) sh.getRange(1, i + 1).setBackground('#B7791F');
    });
  });
  criarRubrica_(ss);
  criarResumo_(ss);
  ['Página1', 'Sheet1', 'Planilha1'].forEach(n => {
    const sh = ss.getSheetByName(n);
    if (sh && sh.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(sh);
  });
  return 'Planilha configurada.';
}

function criarRubrica_(ss) {
  let sh = ss.getSheetByName('Rubrica');
  if (!sh) sh = ss.insertSheet('Rubrica');
  sh.clear();
  const linhas = [
    ['Rubrica sugerida para as justificativas (0 a 10)', '', ''],
    ['Critério', 'Peso', 'Descritor de excelência (8–10)'],
    ['Conceito de IA / ciência de dados reconhecido', '30%', 'Reconhece o conceito em jogo com as próprias palavras (ex.: alarmes falsos × pacientes graves sem alerta, informação do futuro no treino, média que esconde a espera longa, mudança nos dados).'],
    ['Consequência para o paciente ou para o hospital', '30%', 'Diz quem é afetado, quando e qual erro é mais caro naquele contexto (paciente grave sem alerta, alarme falso, falta de estoque, fila).'],
    ['Custos, riscos e alternativas', '20%', 'Compara com pelo menos uma alternativa e reconhece do que está abrindo mão (custo, prazo, explicação, privacidade).'],
    ['Trabalho em equipe', '20%', 'Considera as decisões dos colegas (infraestrutura, modelo escolhido, limiar, verba, painel) ou o impacto da sua decisão nos outros setores.'],
    ['', '', ''],
    ['Respostas curtas', '', 'O jogo não exige tamanho mínimo. Uma justificativa curta pode ser excelente se acertar o conceito e a consequência; avalie o conteúdo, não a extensão.'],
    ['Como usar', '', 'Preencha nota_professor (0–10) e comentario_professor nas abas Decisoes, Reunioes e Casos. A coluna referencia_gabarito mostra a leitura de referência da opção escolhida — a nota deve pesar mais a qualidade do argumento do que a opção marcada. A aba Hospitais mostra o porte e a história (incidente) de cada grupo.'],
    ['Casos do plantão', '', 'Na aba Casos, cada linha é um paciente que o médico avaliou: o que o modelo indicou, se o médico aceitou ou não, o porquê e o desfecho real. Uma boa justificativa cita o dado do paciente que confirma ou contradiz o modelo (ex.: betabloqueador mascarando taquicardia, criança fora do perfil de treino).']
  ];
  sh.getRange(1, 1, linhas.length, 3).setValues(linhas).setWrap(true).setVerticalAlignment('top');
  sh.getRange(1, 1).setFontWeight('bold').setFontSize(13);
  sh.getRange(2, 1, 1, 3).setFontWeight('bold').setBackground('#16335B').setFontColor('#FFFFFF');
  sh.setColumnWidth(1, 280); sh.setColumnWidth(2, 70); sh.setColumnWidth(3, 620);
}

function criarResumo_(ss) {
  let sh = ss.getSheetByName('Resumo');
  if (!sh) sh = ss.insertSheet('Resumo');
  sh.clear();
  sh.getRange('A1').setValue('Resumo por hospital (atualiza sozinho)').setFontWeight('bold').setFontSize(13);
  sh.getRange('A3').setFormula('=QUERY(Hospitais!A:P,"select A, B, M, N, O, E, F, I, J, K where A is not null",1)');
  sh.getRange('A2').setValue('Hospitais').setFontWeight('bold');
  sh.getRange('K2').setValue('Decisões por hospital e função').setFontWeight('bold');
  sh.getRange('K3').setFormula('=QUERY(Decisoes!A:N,"select B, C, H, count(F), avg(N) where E = \'decisao\' group by B, C, H label count(F) \'decisoes\', avg(N) \'media_palavras\'",1)');
  sh.getRange('Q2').setValue('Contribuições em reuniões').setFontWeight('bold');
  sh.getRange('Q3').setFormula('=QUERY(Reunioes!A:K,"select B, C, G, count(E), avg(K) where B is not null group by B, C, G label count(E) \'falas\', avg(K) \'media_palavras\'",1)');
  sh.getRange('W2').setValue('Casos do plantão por hospital').setFontWeight('bold');
  sh.getRange('W3').setFormula('=QUERY(Casos!A:S,"select B, C, D, count(G), avg(P) where B is not null group by B, C, D label count(G) \'casos\', avg(P) \'media_palavras\'",1)');
}
