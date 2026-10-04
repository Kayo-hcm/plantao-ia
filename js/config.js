/* ==========================================================================
   PLANTÃO IA — configuração
   Cole abaixo a URL do App da Web do Google Apps Script (termina em /exec).
   Enquanto a URL não for colada, o jogo roda em MODO DEMONSTRAÇÃO: tudo fica
   salvo só neste navegador (dá para testar com várias abas abertas).
   ========================================================================== */
window.CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbxmCr1QoLaHu23BXHBH5aS3i4qAHuaAE5L5jsiy1RIoAqsZ-RNaUJrYhT3usniY4FpkxA/exec',

  // Justificativas e falas de reunião: sem mínimo de caracteres.
  // true  = o campo não pode ficar vazio (qualquer tamanho serve)
  // false = o campo é opcional (no Apps Script, ajuste também MIN_CARACTERES = 0)
  JUSTIFICATIVA_OBRIGATORIA: true,

  // Ritmo do jogo: quantos dias de jogo cada equipe pode avançar por dia do
  // calendário (o dia avança quando a equipe termina as tarefas do dia).
  // 3 = os 30 dias levam pelo menos 10 dias corridos. 0 = sem limite.
  // O professor pode liberar dias extras para um grupo no painel.
  DIAS_POR_DIA_REAL: 3,

  // Intervalo de atualização automática (milissegundos). Com ~50 alunos
  // jogando por semanas, 8 s com a aba aberta e 60 s com a aba escondida
  // poupam a cota do Apps Script.
  POLL_MS: 8000,
  POLL_OCULTO_MS: 60000,

  // Rodapé
  CURSO: 'Fundamentos de ML e IA em Saúde · Especialização em Ciência de Dados e IA Aplicada à Saúde · UPE Caruaru'
};
