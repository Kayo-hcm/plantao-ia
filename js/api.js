/* ==========================================================================
   PLANTÃO IA — comunicação com o banco (planilha via Apps Script)
   Em modo demonstração, um "servidor" local imita o Apps Script usando o
   armazenamento do navegador (compartilhado entre abas do mesmo navegador).
   ========================================================================== */
window.API = (function () {
  'use strict';
  var url = (window.CONFIG && window.CONFIG.API_URL) || '';
  var remoto = /^https?:\/\//.test(url);   // qualquer URL configurada liga o modo online

  function chamarRemoto(action, payload) {
    var corpo = Object.assign({ action: action }, payload || {});
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var t = ctrl ? setTimeout(function () { ctrl.abort(); }, 30000) : null;
    // Sem cabeçalhos personalizados: o navegador envia text/plain e evita o preflight de CORS.
    return fetch(url, { method: 'POST', body: JSON.stringify(corpo), redirect: 'follow', signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) {
        if (!r.ok) throw new Error('O servidor respondeu ' + r.status + '.');
        return r.json();
      })
      .then(function (d) {
        if (t) clearTimeout(t);
        if (!d || !d.ok) throw new Error((d && d.erro) || 'Erro desconhecido no servidor.');
        return d;
      }, function (e) {
        if (t) clearTimeout(t);
        if (e && e.name === 'AbortError') throw new Error('O servidor demorou demais para responder. Tente de novo.');
        if (e instanceof TypeError) throw new Error('Sem conexão com o servidor. Verifique a internet e a URL em js/config.js.');
        throw e;
      });
  }

  /* ---------------- Servidor local (modo demonstração) ---------------- */
  var Local = (function () {
    var CHAVE = 'plantaoia_demo_db_v3';
    var memoria = null;
    var FUNCOES = ['gestao', 'clinico', 'operacoes', 'cirurgia', 'farmacia', 'ti'];
    var PAPEIS = { essencial: ['gestao', 'clinico', 'ti'], regional: ['gestao', 'clinico', 'operacoes', 'ti'], alta: ['gestao', 'clinico', 'cirurgia', 'farmacia', 'ti'] };
    function porteDe(n) { return n >= 5 ? 'alta' : (n === 4 ? 'regional' : 'essencial'); }
    var MIN_JUST = (window.CONFIG && window.CONFIG.JUSTIFICATIVA_OBRIGATORIA === false) ? 0 : 1;
    function vazio() { return { hospitais: [], jogadores: [], decisoes: [], reunioes: [], comentarios: [], casos: [], indicadores: [], log: [] }; }
    function ler() {
      var db;
      try { var s = localStorage.getItem(CHAVE); db = s ? JSON.parse(s) : vazio(); }
      catch (e) { db = memoria || (memoria = vazio()); }
      var v = vazio(); Object.keys(v).forEach(function (k) { if (!db[k]) db[k] = v[k]; });
      return db;
    }
    function historias() { return (window.GAME && window.GAME.HISTORIA_ORDEM) || ['arbovirose', 'enchente', 'respiratorio', 'ransomware', 'kpc', 'acidente']; }
    /** Sorteio equilibrado: entre as histórias menos usadas na turma, uma ao acaso. */
    function sortearHistoria(db) {
      var hs = historias(), uso = {};
      hs.forEach(function (x) { uso[x] = 0; });
      db.hospitais.forEach(function (h) { if (h.historia && uso[h.historia] !== undefined && h.status !== 'lobby') uso[h.historia]++; });
      var min = Math.min.apply(null, hs.map(function (x) { return uso[x]; }));
      var menos = hs.filter(function (x) { return uso[x] === min; });
      return menos[Math.floor(Math.random() * menos.length)];
    }
    function gravar(db) {
      try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch (e) { memoria = db; }
    }
    function agora() { return new Date().toISOString(); }
    function id() { return 'j' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-5); }
    function codigo(db) {
      var a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', l = 'ABCDFGHJKLMNPQRSTUVWXYZ', c;
      do { c = l.charAt(Math.floor(Math.random() * l.length)); for (var i = 1; i < 5; i++) c += a.charAt(Math.floor(Math.random() * a.length)); }
      while (db.hospitais.some(function (h) { return h.codigo === c; }));
      return c;
    }
    function normal(s) { return String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
    function lista(s) { return String(s || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean); }
    function txt(s, max) { var t = String(s == null ? '' : s).trim(); return max ? t.slice(0, max) : t; }
    function hosp(db, cod) {
      var h = db.hospitais.filter(function (x) { return x.codigo === cod; })[0];
      if (!h) throw new Error('Hospital não encontrado. Confira o código.');
      return h;
    }
    function jog(db, cod, idj) {
      var j = db.jogadores.filter(function (x) { return x.codigo_hospital === cod && x.id_jogador === idj; })[0];
      if (!j) throw new Error('Jogador não encontrado neste hospital. Entre novamente com o código.');
      return j;
    }
    function log(db, cod, ev, det) { db.log.push({ timestamp: agora(), codigo_hospital: cod, evento: ev, detalhe: det }); }
    var CAMPOS_AVATAR = ['pele', 'cabelo', 'corCabelo', 'roupa', 'corRoupa', 'oculos', 'barba', 'acessorio'];
    function limparAvatar(a) {
      if (typeof a === 'string') { try { a = JSON.parse(a); } catch (e) { a = null; } }
      if (!a || typeof a !== 'object') throw new Error('Avatar inválido.');
      var out = {};
      CAMPOS_AVATAR.forEach(function (k) { var v = String(a[k] == null ? '' : a[k]); if (!/^[a-z0-9-]{1,20}$/.test(v)) throw new Error('Avatar inválido.'); out[k] = v; });
      return JSON.stringify(out);
    }

    var acoes = {
      ping: function () { return { app: 'Plantão IA (demonstração)' }; },
      criarHospital: function (db, r) {
        var nh = txt(r.nome_hospital, 60), n = txt(r.nome, 40);
        if (nh.length < 2) throw new Error('Dê um nome ao hospital.');
        if (n.length < 2) throw new Error('Informe o seu nome.');
        var c = codigo(db), i = id();
        db.hospitais.push({ codigo: c, nome_hospital: nh, criado_em: agora(), criado_por: n, status: 'lobby', dia_atual: 0, porte: '' });
        db.jogadores.push({ id_jogador: i, codigo_hospital: c, nome_hospital: nh, nome: n, funcoes: '', entrou_em: agora(), ultimo_acesso: agora(), avatar: '', cracha_em: '' });
        log(db, c, 'hospital_criado', nh);
        return { codigo: c, id_jogador: i, nome: n, nome_hospital: nh };
      },
      entrar: function (db, r) {
        var c = String(r.codigo || '').trim().toUpperCase(), n = txt(r.nome, 40);
        if (n.length < 2) throw new Error('Informe o seu nome.');
        var h = hosp(db, c);
        var js = db.jogadores.filter(function (j) { return j.codigo_hospital === c; });
        var m = js.filter(function (j) { return normal(j.nome) === normal(n); })[0];
        if (m) return { codigo: c, id_jogador: m.id_jogador, nome: m.nome, nome_hospital: h.nome_hospital, retomado: true };
        if (js.length >= 5) throw new Error('Este hospital já tem 5 jogadores.');
        var i = id();
        db.jogadores.push({ id_jogador: i, codigo_hospital: c, nome_hospital: h.nome_hospital, nome: n, funcoes: '', entrou_em: agora(), ultimo_acesso: agora(), avatar: '', cracha_em: '' });
        log(db, c, 'jogador_entrou', n);
        return { codigo: c, id_jogador: i, nome: n, nome_hospital: h.nome_hospital, retomado: false };
      },
      estado: function (db, r) {
        var c = String(r.codigo || '').trim().toUpperCase();
        var h = hosp(db, c);
        if (r.id_jogador) db.jogadores.forEach(function (j) {
          // registra o acesso no máximo uma vez por minuto (evita gravações a cada atualização)
          if (j.id_jogador === r.id_jogador && (!j.ultimo_acesso || Date.now() - Date.parse(j.ultimo_acesso) > 60000)) {
            j.ultimo_acesso = agora(); db._sujo = true;
          }
        });
        function f(arr) { return arr.filter(function (x) { return x.codigo_hospital === c; }); }
        return {
          hospital: h, jogadores: f(db.jogadores),
          decisoes: f(db.decisoes).map(function (d) { var o = Object.assign({}, d); delete o.referencia_gabarito; return o; }),
          reunioes: f(db.reunioes), comentarios: f(db.comentarios)
        };
      },
      assumirFuncao: function (db, r) {
        var c = String(r.codigo || '').trim().toUpperCase(), fn = r.funcao;
        if (FUNCOES.indexOf(fn) < 0) throw new Error('Função inválida.');
        var h = hosp(db, c);
        if (h.status === 'finalizado') throw new Error('O jogo deste hospital já terminou.');
        if (h.porte && PAPEIS[h.porte].indexOf(fn) < 0) throw new Error('Esta função não existe no porte deste hospital.');
        var just = txt(r.justificativa, 3000);
        if (just.length < MIN_JUST) throw new Error('Conte, mesmo que em poucas palavras, por que você assume esta função.');
        var eu = jog(db, c, r.id_jogador);
        var dono = db.jogadores.filter(function (j) { return j.codigo_hospital === c && lista(j.funcoes).indexOf(fn) >= 0; })[0];
        if (dono && dono.id_jogador === eu.id_jogador) return { funcoes: eu.funcoes };
        var tipo = 'FUNCAO';
        if (dono) {
          if (h.status === 'lobby') throw new Error('Esta função já é de ' + dono.nome + '. Peça para liberar ou escolha outra.');
          dono.funcoes = lista(dono.funcoes).filter(function (x) { return x !== fn; }).join(',');
          tipo = 'TRANSFERENCIA';
        }
        var minhas = lista(eu.funcoes); minhas.push(fn);
        eu.funcoes = FUNCOES.filter(function (x) { return minhas.indexOf(x) >= 0; }).join(',');
        db.decisoes.push({ timestamp: agora(), codigo_hospital: c, nome_hospital: h.nome_hospital, dia: h.dia_atual || 0, tipo: 'funcao',
          tarefa_id: tipo, tarefa_titulo: tipo === 'FUNCAO' ? 'Escolha de função' : 'Transferência de função', funcao: fn,
          jogador: eu.nome, id_jogador: eu.id_jogador, opcao_id: fn, opcao_escolhida: fn, justificativa: just });
        return { funcoes: eu.funcoes };
      },
      salvarAvatar: function (db, r) {
        var c = String(r.codigo || '').trim().toUpperCase();
        hosp(db, c);
        var eu = jog(db, c, r.id_jogador);
        eu.avatar = limparAvatar(r.avatar);
        eu.cracha_em = agora();
        log(db, c, 'cracha_emitido', eu.nome);
        return { avatar: eu.avatar, cracha_em: eu.cracha_em };
      },
      liberarFuncao: function (db, r) {
        var c = String(r.codigo || '').trim().toUpperCase();
        var h = hosp(db, c);
        if (h.status !== 'lobby') throw new Error('Durante o jogo, um colega pode assumir a função na aba Equipe.');
        var eu = jog(db, c, r.id_jogador);
        eu.funcoes = lista(eu.funcoes).filter(function (x) { return x !== r.funcao; }).join(',');
        return { funcoes: eu.funcoes };
      },
      iniciar: function (db, r) {
        var c = String(r.codigo || '').trim().toUpperCase();
        var h = hosp(db, c);
        if (h.status !== 'lobby') return { status: h.status };
        var js = db.jogadores.filter(function (j) { return j.codigo_hospital === c; });
        if (js.length < 2) throw new Error('São necessários pelo menos 2 jogadores.');
        var porte = porteDe(js.length), papeis = PAPEIS[porte];
        var dono = {};
        js.forEach(function (j) { lista(j.funcoes).forEach(function (f) { if (papeis.indexOf(f) >= 0) dono[f] = j.id_jogador; }); });
        var faltam = papeis.filter(function (f) { return !dono[f]; });
        if (faltam.length) throw new Error('Ainda há funções sem responsável.');
        if (dono.gestao === dono.clinico) throw new Error('Gestão e Clínica precisam ser pessoas diferentes.');
        var semCracha = js.filter(function (j) { return lista(j.funcoes).some(function (f) { return papeis.indexOf(f) >= 0; }) && !j.avatar; });
        if (semCracha.length) throw new Error('Falta pegar o crachá: ' + semCracha.map(function (j) { return j.nome; }).join(', ') + '.');
        js.forEach(function (j) { j.funcoes = lista(j.funcoes).filter(function (f) { return papeis.indexOf(f) >= 0; }).join(','); });
        if (!h.historia || historias().indexOf(h.historia) < 0) h.historia = sortearHistoria(db);
        h.status = 'em_jogo'; h.dia_atual = 1; h.iniciado_em = agora(); h.porte = porte; h.bonus_dias = h.bonus_dias || 0;
        log(db, c, 'jogo_iniciado', porte + ' · ' + h.historia + ' · ' + js.length + ' jogadores');
        return { status: 'em_jogo', porte: porte };
      },
      decidir: function (db, r) {
        var c = String(r.codigo || '').trim().toUpperCase();
        var h = hosp(db, c);
        if (h.status !== 'em_jogo') throw new Error('O jogo não está em andamento.');
        var eu = jog(db, c, r.id_jogador);
        if (lista(eu.funcoes).indexOf(r.funcao) < 0) throw new Error('Esta decisão é de outra função.');
        var just = txt(r.justificativa, 5000);
        if (just.length < MIN_JUST) throw new Error('Escreva o porquê da decisão — pode ser curto.');
        var ja = db.decisoes.filter(function (d) { return d.codigo_hospital === c && d.tarefa_id === r.tarefa_id && d.tipo === 'decisao'; })[0];
        if (ja) throw new Error('Esta decisão já foi registrada por ' + ja.jogador + '.');
        db.decisoes.push({ timestamp: agora(), codigo_hospital: c, nome_hospital: h.nome_hospital, dia: r.dia, tipo: 'decisao',
          tarefa_id: r.tarefa_id, tarefa_titulo: r.tarefa_titulo, funcao: r.funcao, jogador: eu.nome, id_jogador: eu.id_jogador,
          opcao_id: r.opcao_id, opcao_escolhida: r.opcao_escolhida, justificativa: just, referencia_gabarito: r.referencia });
        if (r.caso && typeof r.caso === 'object') {
          var k = r.caso;
          db.casos.push({ timestamp: agora(), codigo_hospital: c, nome_hospital: h.nome_hospital, historia: h.historia || '', dia: r.dia, tarefa_id: r.tarefa_id,
            caso_id: txt(k.caso_id, 20), paciente: txt(k.paciente, 80), modelo: txt(k.modelo, 40), escore: k.escore, limiar: txt(k.limiar, 10), fase: txt(k.fase, 20),
            alerta_modelo: txt(k.alerta_modelo, 20), decisao_medico: txt(k.decisao_medico, 40), justificativa: just, desfecho_real: txt(k.desfecho_real, 40),
            medico_acertou: txt(k.medico_acertou, 20), modelo_acertou: txt(k.modelo_acertou, 10), jogador: eu.nome });
        }
        return { registrado: true };
      },
      contribuir: function (db, r) {
        var c = String(r.codigo || '').trim().toUpperCase();
        var h = hosp(db, c);
        if (h.status !== 'em_jogo') throw new Error('O jogo não está em andamento.');
        var eu = jog(db, c, r.id_jogador);
        if (lista(eu.funcoes).indexOf(r.funcao) < 0) throw new Error('Esta fala é de outra função.');
        var t = txt(r.contribuicao, 5000);
        if (t.length < MIN_JUST) throw new Error('Escreva sua fala na reunião — pode ser curta.');
        var ja = db.reunioes.filter(function (x) { return x.codigo_hospital === c && x.reuniao_id === r.reuniao_id && x.funcao === r.funcao; })[0];
        if (ja) throw new Error('Esta função já falou nesta reunião.');
        db.reunioes.push({ timestamp: agora(), codigo_hospital: c, nome_hospital: h.nome_hospital, dia: r.dia, reuniao_id: r.reuniao_id,
          reuniao_titulo: r.reuniao_titulo, funcao: r.funcao, jogador: eu.nome, id_jogador: eu.id_jogador, contribuicao: t });
        return { registrado: true };
      },
      comentar: function (db, r) {
        var c = String(r.codigo || '').trim().toUpperCase();
        var h = hosp(db, c);
        var eu = jog(db, c, r.id_jogador);
        var t = txt(r.comentario, 2000);
        if (!t.length) throw new Error('Escreva um comentário.');
        db.comentarios.push({ timestamp: agora(), codigo_hospital: c, nome_hospital: h.nome_hospital, alvo_tipo: r.alvo_tipo,
          alvo_id: r.alvo_id, alvo_funcao: r.alvo_funcao, jogador: eu.nome, id_jogador: eu.id_jogador, funcao_autor: eu.funcoes, comentario: t });
        return { registrado: true };
      },
      progresso: function (db, r) {
        var c = String(r.codigo || '').trim().toUpperCase();
        var h = db.hospitais.filter(function (x) { return x.codigo === c; })[0];
        if (!h || h.status === 'lobby') return { atualizado: false };
        var mud = false;
        if (r.dia > (h.dia_atual || 0)) {
          h.dia_atual = r.dia; mud = true;
          var ind = r.indicadores || {};
          db.indicadores.push({ timestamp: agora(), codigo_hospital: c, nome_hospital: h.nome_hospital, historia: h.historia || '', dia: r.dia,
            indice: r.indice, qualidade: r.qualidade, saude: r.saude, orcamento: ind.orcamento, seguranca: ind.seguranca, eficiencia: ind.eficiencia,
            confianca: ind.confianca, conformidade: ind.conformidade, dados: ind.dados, casos_testados: r.casos ? r.casos.testados : '', medico_acertos: r.casos ? r.casos.medico_acertos : '' });
        }
        if (r.finalizado && h.status !== 'finalizado') {
          h.status = 'finalizado'; h.finalizado_em = agora(); h.indice_maturidade = r.indice; mud = true;
        }
        return { atualizado: mud };
      },
      professorListar: function (db) {
        return { historias: historias(), hospitais: db.hospitais.map(function (h) {
          function n(arr) { return arr.filter(function (x) { return x.codigo_hospital === h.codigo; }).length; }
          return Object.assign({}, h, { jogadores: n(db.jogadores), decisoes: n(db.decisoes), reunioes: n(db.reunioes), comentarios: n(db.comentarios), casos: n(db.casos) });
        }) };
      },
      professorDefinirHistoria: function (db, r) {
        var h = hosp(db, String(r.codigo || '').trim().toUpperCase());
        if (h.status !== 'lobby') throw new Error('A história só pode ser trocada antes de o grupo iniciar o plantão.');
        if (r.historia && historias().indexOf(r.historia) < 0) throw new Error('História inválida.');
        h.historia = r.historia || '';
        log(db, h.codigo, 'historia_definida', h.historia || 'sorteio');
        return { historia: h.historia };
      },
      professorLiberarDias: function (db, r) {
        var h = hosp(db, String(r.codigo || '').trim().toUpperCase());
        var n = Math.max(-30, Math.min(30, Number(r.dias) || 0));
        h.bonus_dias = Math.max(0, (Number(h.bonus_dias) || 0) + n);
        log(db, h.codigo, 'dias_liberados', String(n));
        return { bonus_dias: h.bonus_dias };
      }
    };

    function chamar(action, payload) {
      return new Promise(function (ok, falha) {
        setTimeout(function () {
          try {
            if (!acoes[action]) throw new Error('Ação desconhecida: ' + action);
            var db = ler();
            var out = acoes[action](db, payload || {}) || {};
            var sujo = db._sujo; delete db._sujo;
            if (action === 'estado' ? sujo : (action !== 'ping' && action !== 'professorListar')) gravar(db);
            out.ok = true;
            ok(JSON.parse(JSON.stringify(out)));
          } catch (e) { falha(e); }
        }, 120);
      });
    }
    function apagarTudo() { try { localStorage.removeItem(CHAVE); } catch (e) { memoria = null; } }
    return { chamar: chamar, apagarTudo: apagarTudo };
  })();

  return {
    remoto: remoto,
    demo: !remoto,
    chamar: function (action, payload) { return remoto ? chamarRemoto(action, payload) : Local.chamar(action, payload); },
    apagarDemo: Local.apagarTudo
  };
})();
