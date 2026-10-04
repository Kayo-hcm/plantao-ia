/* ==========================================================================
   PLANTÃO IA — camada visual: hospital isométrico (luz, volume e sombras
   suaves), cenas, cartas, laboratório do limiar, painel e animações
   ========================================================================== */
window.VIS = (function (G, E, UI, A) {
  'use strict';
  var esc = G.esc, P = A.P, caixa = A.caixa, cl = A.clarear, es = A.escurecer;
  var reduzido = false;
  try { reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { }

  function curto(s, n) { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  function online(j) { return j && j.ultimo_acesso && (Date.now() - new Date(j.ultimo_acesso).getTime()) < 3 * 60 * 1000; }
  function iniciais(nome) {
    var p = String(nome || '?').trim().split(/\s+/);
    return ((p[0] || '?').charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : (p[0] || '').charAt(1) || '')).toUpperCase();
  }
  function funcoesDe(j) { return String((j && j.funcoes) || '').split(',').filter(Boolean); }
  function f1(n) { return n.toFixed(1); }

  /* ======================================================================
     SALAS DO HOSPITAL
     ====================================================================== */
  var SLOT = { diretoria: [0, 0], reunioes: [1, 0], ti: [2, 0], compras: [0, 1], urgencia: [1, 1], especialidades: [2, 1], farmacia: [0, 2], bloco: [1, 2], transplante: [2, 2], jardim: [2, 2] };
  var TEMA = {
    diretoria: { parede: '#DCE6F2', piso: ['#E2C29C', '#CDA57B'], borda: '#B08B66', linha: 'madeira' },
    reunioes: { parede: '#EFE8DA', piso: ['#B9C8E0', '#A2B4D2'], borda: '#7F93B5', linha: 'carpete' },
    ti: { parede: '#D5E8E8', piso: ['#D3DCE6', '#BECAD7'], borda: '#8E9DB0' },
    compras: { parede: '#ECE5D3', piso: ['#DDD7C8', '#CBC3B0'], borda: '#A49B86' },
    urgencia: { parede: '#F7E3E0', piso: ['#F3F7FA', '#E1E9F0'], borda: '#A9B6C4' },
    especialidades: { parede: '#E6E1F4', piso: ['#F3F3FA', '#E1E4F1'], borda: '#A3A8C2' },
    farmacia: { parede: '#ECE3F6', piso: ['#F7F3EB', '#E9E1D2'], borda: '#ABA28F' },
    bloco: { parede: '#D6EEE5', piso: ['#E3F4ED', '#CDE6DB'], borda: '#86B3A1' },
    transplante: { parede: '#F8E6D8', piso: ['#F6F0E8', '#E8DED0'], borda: '#B5A08A' },
    recepcao: { parede: '#DDE8F2', piso: ['#EEE4D1', '#DCCDB2'], borda: '#AF9C7C', linha: 'madeira' },
    jardim: { parede: null, piso: ['#A6D886', '#86C467'], borda: '#6C9E52', linha: 'grama' }
  };
  var PRINCIPAL = { gestao: 'diretoria', clinico: 'urgencia', operacoes: 'bloco', cirurgia: 'bloco', farmacia: 'farmacia', ti: 'ti' };
  var LADO = 6, PASSO = 8, Z = 6, HP = 58;
  var ESC_AV = 0.48;   // escala dos avatares no mapa (altura ≈ 62 px)

  function corSala(k, porte) {
    if (k === 'reunioes') return '#5779AA';
    var r = G.PORTES[porte] && G.PORTES[porte].setor[k];
    return r ? G.ROLES[r].cor : '#7C8B9E';
  }
  function papelDaSala(k, porte) { return (G.PORTES[porte] && G.PORTES[porte].setor[k]) || null; }
  function tarefasDaSala(st, k) {
    return st.tasks.filter(function (t) {
      if (t.day !== st.dia) return false;
      return k === 'reunioes' ? t.type === 'reuniao' : (t.type === 'decisao' && t.setor === k);
    });
  }
  function statusSala(st, k, papeis) {
    if (st.finalizado) return null;
    var ts = tarefasDaSala(st, k);
    if (!ts.length) return null;
    var minhas = E.pendentesDe(st, papeis).some(function (p) { return ts.indexOf(p.task) >= 0; });
    if (minhas) return 'vez';
    if (ts.every(function (t) { return st.tarefas[t.id].status === 'concluida'; })) return 'feito';
    if (ts.some(function (t) { var s = st.tarefas[t.id].status; return s === 'disponivel' || s === 'em_andamento'; })) return 'pendente';
    return 'espera';
  }
  /** Sala em crise hoje (crise do sistema ou início do incidente da história), ou false. */
  function emCrise(st) {
    if (!st || st.finalizado || st.aguardandoLiberacao) return false;
    var d = st.dias[st.dia]; if (!d) return false;
    var ev = d.eventos.filter(function (e) { return /^e5_crise|_inicio$/.test(e.id); })[0];
    if (!ev) return false;
    var pend = st.tasks.some(function (t) { return t.day === st.dia && st.tarefas[t.id].status !== 'concluida'; });
    return pend ? (ev.setor || 'ti') : false;
  }

  /* ---- kit de desenho com coordenadas locais da sala ---- */
  function kit(oi, oj) {
    var L = {
      oi: oi, oj: oj,
      P: function (i, j, z) { return P(oi + i, oj + j, Z + (z || 0)); },
      box: function (i, j, z, w, d, h, cor, o) { return caixa(oi + i, oj + j, Z + z, w, d, h, cor, o); },
      som: function (i, j, w, d, f) { return A.sombra(oi + i, oj + j, Z, w, d, f); },
      cil: function (i, j, z, r, h, cor, o) { return A.cilindro(oi + i, oj + j, Z + z, r, h, cor, o); },
      esf: function (i, j, z, r, cor) { return A.esfera(oi + i, oj + j, Z + z, r, cor); },
      eli: function (i, j, z, r, cor, ex) { return A.elipse(oi + i, oj + j, Z + z, r, cor, ex); },
      paredeJ: function (i0, i1, z0, z1, cor, ex) { return A.naParedeJ(oj, oi + i0, oi + i1, Z + z0, Z + z1, cor, ex); },
      paredeI: function (j0, j1, z0, z1, cor, ex) { return A.naParedeI(oi, oj + j0, oj + j1, Z + z0, Z + z1, cor, ex); },
      faceI: function (iF, j0, j1, z0, z1, cor, ex) { return A.naParedeI(oi + iF, oj + j0, oj + j1, Z + z0, Z + z1, cor, ex); },
      faceJ: function (jF, i0, i1, z0, z1, cor, ex) { return A.naParedeJ(oj + jF, oi + i0, oi + i1, Z + z0, Z + z1, cor, ex); },
      /* ponto (u, v) normalizado numa face "j fixo" / "i fixo" */
      fJ: function (jF, i0, i1, z0, z1, u, v) { return P(oi + i0 + u * (i1 - i0), oj + jF, Z + z0 + v * (z1 - z0)); },
      fI: function (iF, j0, j1, z0, z1, u, v) { return P(oi + iF, oj + j0 + u * (j1 - j0), Z + z0 + v * (z1 - z0)); }
    };
    return L;
  }
  function D(i, j, w, d) { return i + (w || 0) / 2 + j + (d || 0) / 2; }
  function linhaPts(ps, cor, larg, ex) { return '<polyline points="' + A.pts(ps) + '" fill="none" stroke="' + cor + '" stroke-width="' + (larg || 1.5) + '" stroke-linecap="round" stroke-linejoin="round"' + (ex || '') + '/>'; }
  var SEM = '';   // sem contorno extra

  /* ---------------- mobília (estilo suave) ---------------- */
  function cadeira(L, i, j, cor, costas) {
    var s = L.som(i, j, .5, .5, .7) + L.cil(i + .25, j + .25, 0, .045, 8, '#8C96A6') + L.eli(i + .25, j + .25, .6, .2, '#5A6270');
    s += L.box(i, j, 8, .5, .5, 3.4, cor);
    if (costas === 'i') s += L.box(i, j, 11.4, .1, .5, 12, cor);
    else if (costas === 'jf') s += L.box(i, j + .4, 11.4, .5, .1, 12, cor);
    else if (costas === 'if') s += L.box(i + .4, j, 11.4, .1, .5, 12, cor);
    else s += L.box(i, j, 11.4, .5, .1, 12, cor);
    return s;
  }
  function sofa(L, i, j, w, cor, frente) {
    var s = L.som(i, j, w, .8, .9);
    if (frente === 'i') {   // encosto do lado i
      s += L.box(i, j, 0, .8, w, 7, es(cor, .08)) + L.box(i + .2, j + .05, 7, .55, w - .1, 4, cl(cor, .12)) + L.box(i, j, 7, .22, w, 12, cor) +
        L.box(i, j, 7, .8, .16, 7, cor) + L.box(i, j + w - .16, 7, .8, .16, 7, cor);
      return s;
    }
    s += L.box(i, j, 0, w, .8, 7, es(cor, .08)) + L.box(i + .05, j + .2, 7, w - .1, .55, 4, cl(cor, .12)) + L.box(i, j, 7, w, .22, 12, cor) +
      L.box(i, j, 7, .16, .8, 7, cor) + L.box(i + w - .16, j, 7, .16, .8, 7, cor);
    return s;
  }
  function mesa(L, i, j, w, d, h, tampo, corpo) {
    return L.som(i, j, w, d) + L.box(i + .06, j + .06, 0, w - .12, d - .12, h - 3, corpo) + L.box(i, j, h - 3, w, d, 3, tampo, { topo: cl(tampo, .12) });
  }
  function mesaPes(L, i, j, w, d, h, tampo, pe) {
    var s = L.som(i, j, w, d);
    [[i + .05, j + .05], [i + w - .17, j + .05], [i + .05, j + d - .17], [i + w - .17, j + d - .17]].forEach(function (p) { s += L.box(p[0], p[1], 0, .12, .12, h - 3, pe); });
    return s + L.box(i, j, h - 3, w, d, 3, tampo, { topo: cl(tampo, .1) });
  }
  /** Monitor sobre a mesa (tela virada para quem olha). */
  function telaMesa(L, i, j, z, w, cor, grafico) {
    var s = L.box(i + w / 2 - .05, j + .02, z, .1, .08, 4, '#9AA3AE') + L.box(i, j, z + 4, w, .07, 12, '#2B2F38', { esq: cor, aresta: false });
    var jF = j + .07;
    s += L.faceJ(jF, i + .05, i + w - .05, z + 5, z + 15, cor, SEM);
    if (grafico) {
      var ps = [0, .35, .2, .6, .45, .85].map(function (v, k) { return L.fJ(jF, i + .1, i + w - .1, z + 6, z + 14, k / 5, v); });
      s += linhaPts(ps, '#FFFFFF', 1.1, ' opacity=".85"');
    }
    return s;
  }
  function planta(L, i, j, s0) {
    s0 = s0 || 1;
    var s = L.som(i - .2, j - .2, .4, .4, .8) + L.cil(i, j, 0, .15 * s0, 10 * s0, '#F1EEE8', { topo: '#7A5A3E' });
    s += L.esf(i, j, 9 * s0, 9 * s0, '#4FA766') + L.esf(i - .1, j + .08, 14 * s0, 7 * s0, '#5DBE77') + L.esf(i + .1, j - .04, 16 * s0, 6.5 * s0, '#6CCB84');
    return s;
  }
  function arvore(L, i, j, s0) {
    s0 = s0 || 1;
    var s = L.som(i - .5, j - .5, 1, 1, 1) + L.cil(i, j, 0, .07, 18 * s0, '#8B6040');
    s += L.esf(i, j, 16 * s0, 16 * s0, '#4CA463') + L.esf(i - .18, j + .1, 28 * s0, 12 * s0, '#5DBB74') + L.esf(i + .16, j - .12, 31 * s0, 10 * s0, '#70CB86');
    return s;
  }
  function cama(L, i, j, cobertor) {
    var s = L.som(i, j, 1.9, .95);
    s += L.box(i, j, 0, 1.9, .95, 8, '#C9D2DD', { topo: '#E4EAF1' });
    s += L.box(i + .04, j + .04, 8, 1.82, .87, 4, '#FFFFFF', { topo: '#FFFFFF' });
    s += L.box(i + .1, j + .14, 12, .4, .67, 3.5, '#EAF2FB', { topo: '#F7FBFF' });
    s += L.box(i + .64, j + .02, 12, 1.22, .91, 2.4, cobertor || '#7FB3D5');
    s += L.box(i, j, 8, .08, .95, 13, '#B9C3CF');
    return s;
  }
  function monitorPe(L, i, j, cor) {
    var s = L.eli(i, j, .5, .18, '#7A8496') + L.cil(i, j, 0, .035, 32, '#AEB7C4');
    s += L.box(i - .2, j - .04, 32, .44, .09, 14, '#2B2F38', { esq: '#17202B', aresta: false });
    var jF = j + .05;
    var ps = [[0, .45], [.25, .45], [.32, .9], [.4, .1], [.48, .55], [.62, .45], [1, .45]].map(function (p) { return L.fJ(jF, i - .18, i + .22, 33, 45, p[0], p[1]); });
    s += linhaPts(ps, cor || '#3DDC97', 1.3);
    return s;
  }
  function rack(L, i, j, crise) {
    var s = L.som(i, j, .75, .8) + L.box(i, j, 0, .75, .8, 56, '#323946', { topo: '#4C5568' });
    var iF = i + .75;
    for (var z = 8; z <= 48; z += 8) {
      s += L.faceI(iF, j + .06, j + .74, z, z + 5, '#262C36', SEM);
      [.16, .28].forEach(function (u, k) {
        var p = L.fI(iF, j + .06, j + .74, z, z + 5, u, .5);
        s += '<circle class="led" cx="' + f1(p[0]) + '" cy="' + f1(p[1]) + '" r="1.5" fill="' + (crise && k === 0 ? '#FF5A4F' : ((z / 8 + k) % 3 ? '#3DDC97' : '#4FA3D9')) + '"/>';
      });
    }
    return s;
  }
  function caixote(L, i, j, z, w, d, h, cor) {
    cor = cor || '#D9A066';
    return L.box(i, j, z, w, d, h, cor, { topo: cl(cor, .2) }) + L.box(i + w / 2 - .05, j, z + h, .1, d, .4, '#F3D7A8', { aresta: false });
  }
  function porta(L, ladoI, j0, j1) {   // portas duplas na parede da esquerda
    var s = L.paredeI(j0, j1, 0, 40, '#F3F6F8', ' stroke="#B9C6CF" stroke-width="1.6" stroke-linejoin="round"');
    var m = (j0 + j1) / 2;
    s += L.paredeI(m - .02, m + .02, 0, 40, '#B9C6CF', SEM);
    [j0 + (m - j0) / 2, m + (j1 - m) / 2].forEach(function (jc) {
      var c = P(L.oi, L.oj + jc, Z + 30);
      s += '<ellipse cx="' + f1(c[0]) + '" cy="' + f1(c[1]) + '" rx="4.6" ry="5.6" fill="#BFE3F2" stroke="#9FB4C2" stroke-width="1"/>';
    });
    return s;
  }
  function janelaJ(L, i0, i1, z0, z1) {
    var s = L.paredeJ(i0 - .06, i1 + .06, z0 - 2, z1 + 2, '#FFFFFF', ' stroke="#FFFFFF" stroke-width="2" stroke-linejoin="round"');
    s += L.paredeJ(i0, i1, z0, z1, A.gradV('#A9D8F0', '#E6F5FC'), SEM);
    var a = L.fJ(0, i0, i1, z0, z1, .2, 1), b = L.fJ(0, i0, i1, z0, z1, .45, 1), c = L.fJ(0, i0, i1, z0, z1, .25, 0), d = L.fJ(0, i0, i1, z0, z1, 0, 0);
    s += A.poly([a, b, c, d], '#FFFFFF', ' opacity=".45"');
    s += L.paredeJ((i0 + i1) / 2 - .02, (i0 + i1) / 2 + .02, z0, z1, '#FFFFFF', SEM);
    return s;
  }
  function janelaI(L, j0, j1, z0, z1) {
    var s = L.paredeI(j0 - .06, j1 + .06, z0 - 2, z1 + 2, '#FFFFFF', ' stroke="#FFFFFF" stroke-width="2" stroke-linejoin="round"');
    s += L.paredeI(j0, j1, z0, z1, A.gradV('#9CCDE6', '#DDF0F9'), SEM);
    var a = L.fI(0, j0, j1, z0, z1, .55, 1), b = L.fI(0, j0, j1, z0, z1, .8, 1), c = L.fI(0, j0, j1, z0, z1, .6, 0), d = L.fI(0, j0, j1, z0, z1, .35, 0);
    s += A.poly([a, b, c, d], '#FFFFFF', ' opacity=".4"');
    return s;
  }
  function luzJanelaJ(L, i0, i1) {   // luz da janela no chão
    return A.poly([L.P(i0, 0, .2), L.P(i1, 0, .2), L.P(i1 + .9, 1.9, .2), L.P(i0 + .9, 1.9, .2)], '#FFFFFF', ' opacity=".2"');
  }
  function quadroJ(L, i0, i1, z0, z1, cor) {
    return L.paredeJ(i0, i1, z0, z1, '#FFFFFF', ' stroke="' + (cor || '#8B6040') + '" stroke-width="2.2" stroke-linejoin="round"');
  }
  function textoJ(L, i, z, txt, cor, tam) {
    var p = L.P(i, 0, z);
    return '<text font-size="' + (tam || 9) + '" font-family="Fredoka, Nunito, sans-serif" font-weight="600" fill="' + (cor || '#fff') + '" text-anchor="middle" transform="translate(' + f1(p[0]) + ',' + f1(p[1]) + ') matrix(1,0.5,0,1,0,0)">' + txt + '</text>';
  }
  function cruzJ(L, ic, z) {
    var s = L.paredeJ(ic - .45, ic + .45, z, z + 26, '#FFFFFF', ' stroke="#F1D3D0" stroke-width="1.2" stroke-linejoin="round"');
    s += L.paredeJ(ic - .1, ic + .1, z + 4, z + 22, '#E05A4F', SEM) + L.paredeJ(ic - .32, ic + .32, z + 10, z + 16, '#E05A4F', SEM);
    return s;
  }

  /** Mobília de cada sala: devolve itens {d: profundidade, s: svg}. */
  function mobilia(k, L, st, porte) {
    var it = [], f = (st && st.flags) || {};
    function add(d, s) { it.push({ d: d, s: s }); }
    switch (k) {
      case 'diretoria': {
        add(-1, janelaJ(L, 3.0, 4.6, 18, 44) + quadroJ(L, 1.0, 2.2, 26, 44, '#8B6040') +
          L.paredeJ(1.15, 2.05, 28, 42, A.gradD('#8FCB9B', '#4F9BC4'), SEM) +
          (f.gov === 'comite' ? L.paredeI(1.2, 2.6, 30, 48, '#2F8F6F', ' stroke="#25715A" stroke-width="1"') + L.paredeI(1.6, 2.2, 36, 42, '#FFFFFF', SEM) : ''));
        add(-0.5, luzJanelaJ(L, 3.0, 4.6));
        var est = L.som(.1, 3.3, .55, 2.3) + L.box(.1, 3.3, 0, .55, 2.3, 50, '#8A5E3C', { topo: '#A77650' });
        var cores = ['#E05A4F', '#5779AA', '#F2B53C', '#2FA866', '#8E6CC9', '#3F8F9E'];
        [8, 24, 40].forEach(function (z, r) {
          est += L.faceI(.65, 3.36, 5.54, z - 1.5, z - .5, '#6B4429', SEM);
          for (var b = 0; b < 6; b++) est += L.faceI(.65, 3.42 + b * .34, 3.68 + b * .34, z, z + 10 - (b % 2) * 2, cores[(b + r * 2) % 6], SEM);
        });
        add(D(.1, 3.3, .55, 2.3), est);
        add(D(1.1, 1.5, 2.5, 1.0), mesa(L, 1.1, 1.5, 2.5, 1.0, 19, '#9C6B45', '#7B5232') + telaMesa(L, 1.9, 1.6, 19, .8, '#6CC4F0', true) +
          L.box(3.05, 1.85, 19, .32, .28, 3, '#F5F5F5') + L.cil(1.45, 1.95, 19, .09, 4.5, '#F2B53C'));
        add(D(2.2, .6, .5, .5) - .2, cadeira(L, 2.2, .55, '#2E4A7A', 'j'));
        add(D(1.5, 3.0, .5, .5), cadeira(L, 1.5, 2.95, '#3F8F9E', 'jf'));
        add(D(2.6, 3.0, .5, .5), cadeira(L, 2.6, 2.95, '#3F8F9E', 'jf'));
        add(D(5.1, .4), planta(L, 5.15, .45));
        add(D(4.1, 4.5, 1.4, .8), sofa(L, 4.0, 4.45, 1.5, '#5779AA'));
        break;
      }
      case 'reunioes': {
        add(-1, L.paredeJ(1.0, 3.9, 16, 48, '#FFFFFF', ' stroke="#C9D2DD" stroke-width="2.2" stroke-linejoin="round"') +
          linhaPts([L.fJ(0, 1.2, 3.7, 20, 44, .05, .3), L.fJ(0, 1.2, 3.7, 20, 44, .3, .55), L.fJ(0, 1.2, 3.7, 20, 44, .55, .45), L.fJ(0, 1.2, 3.7, 20, 44, .85, .8)], '#5779AA', 1.8) +
          L.paredeJ(1.3, 2.2, 38, 40, '#E05A4F', SEM) + L.paredeJ(2.6, 3.5, 26, 28, '#2FA866', SEM) +
          L.paredeI(1.4, 3.8, 22, 46, '#20262E', ' stroke="#3A4250" stroke-width="2" stroke-linejoin="round"') + L.paredeI(1.55, 3.65, 24, 44, A.gradV('#2E5C9A', '#5779AA'), SEM));
        [[1.5, 1.15], [2.9, 1.15], [4.3, 1.15]].forEach(function (c) { add(D(c[0], c[1], .5, .5), cadeira(L, c[0], c[1], '#5779AA', 'j')); });
        add(D(1.3, 1.85, 3.7, 1.4), mesaPes(L, 1.3, 1.85, 3.7, 1.4, 18, '#F4F1EC', '#9AA3AE') + L.box(2.3, 2.3, 18, .5, .35, 1.2, '#FFFFFF') +
          L.cil(3.6, 2.5, 18, .08, 6, '#5779AA') + L.box(4.2, 2.1, 18, .4, .3, 1.6, '#2B2F38', { topo: '#4A5263' }));
        [[1.5, 3.5], [2.9, 3.5], [4.3, 3.5]].forEach(function (c) { add(D(c[0], c[1], .5, .5) + .3, cadeira(L, c[0], c[1], '#5779AA', 'jf')); });
        add(D(5.2, .4), planta(L, 5.25, .45));
        add(D(.4, 5.1), planta(L, .45, 5.2, .9));
        break;
      }
      case 'ti': {
        for (var n = 0; n < 3; n++) add(D(.1, .4 + n * 1.0, .75, .8), rack(L, .1, .35 + n * 1.0, emCrise(st) === 'ti' && n === 0));
        if (emCrise(st) === 'ti') {
          var c = L.P(.47, .75, 70);
          add(D(.1, .35, .75, .8) + .01, L.cil(.47, .75, 56, .1, 7, '#FF3B30', { topo: '#FF8A80' }) + '<circle class="giro-luz" cx="' + f1(c[0]) + '" cy="' + f1(c[1]) + '" r="34" fill="' + A.gradLuz('#FF3B30') + '"/>');
        }
        add(D(2.7, 2.5, 2.2, .9), mesa(L, 2.7, 2.5, 2.2, .9, 19, '#E9EDF2', '#B9C3CF') + telaMesa(L, 2.9, 2.55, 19, .75, emCrise(st) === 'ti' ? '#FF6B5E' : '#3DDC97', true) +
          telaMesa(L, 3.85, 2.55, 19, .75, '#4FA3D9', true) + L.box(3.2, 3.0, 19, .6, .25, 1, '#2B2F38'));
        add(D(3.4, 3.6, .5, .5), cadeira(L, 3.4, 3.55, '#3F8F9E', 'jf'));
        add(D(5.1, 4.8), planta(L, 5.15, 4.85));
        add(-1, L.paredeJ(3.3, 5.5, 40, 50, '#FFFFFF', ' stroke="#BFD0DA" stroke-width="1.2" stroke-linejoin="round"') +
          L.paredeJ(3.45, 4.2, 43, 47, '#3DDC97', SEM) + L.paredeJ(4.3, 5.35, 43, 47, '#4FA3D9', SEM) +
          ((f.infra === 'nuvem' || f.infra === 'hibrida') ? nuvemParede(L) : janelaJ(L, 1.6, 2.8, 20, 38)));
        break;
      }
      case 'urgencia': {
        add(-1, cruzJ(L, 3.0, 24) + janelaJ(L, 4.4, 5.4, 22, 42));
        add(-.5, luzJanelaJ(L, 4.4, 5.4));
        add(D(.25, .6, 1.9, .95), cama(L, .25, .6, '#7FB3D5'));
        add(D(.25, 2.2, 1.9, .95), cama(L, .25, 2.2, '#F2A7A0'));
        add(D(2.35, .8, .25, .25), monitorPe(L, 2.4, .85));
        add(D(2.35, 2.4, .25, .25), monitorPe(L, 2.4, 2.45, '#F2B53C'));
        add(D(3.5, 3.5, 1.9, .8), L.som(3.5, 3.5, 1.9, .8) + L.box(3.5, 3.5, 0, 1.9, .8, 19, '#FFFFFF', { topo: '#F4F6F9' }) + L.faceJ(4.3, 3.55, 5.35, 8, 12, '#E05A4F', SEM) +
          L.box(3.5, 3.5, 19, 1.9, .8, 2, '#D5DDE7') + telaMesa(L, 3.9, 3.6, 21, .6, '#6CC4F0', false));
        [.6, 1.25, 1.9].forEach(function (i) { add(D(i, 5.0, .5, .5), cadeira(L, i, 4.95, '#E07A72', 'jf')); });
        break;
      }
      case 'especialidades': {
        add(-1, L.paredeJ(2.9, 4.9, 22, 50, '#1E252E', ' stroke="#BFC7D1" stroke-width="2" stroke-linejoin="round"') +
          L.paredeJ(3.15, 3.8, 26, 46, A.gradV('#C9D6E3', '#7F93A8'), SEM) + L.paredeJ(4.0, 4.65, 26, 46, A.gradV('#C9D6E3', '#7F93A8'), SEM) +
          (porte === 'alta' ? L.paredeI(1.0, 2.6, 24, 44, '#FFFFFF', ' stroke="#D7DCE6" stroke-width="1.2" stroke-linejoin="round"') + L.paredeI(1.3, 2.3, 32, 35, '#E37BA6', SEM) : janelaI(L, 1.0, 2.4, 22, 42)));
        add(D(.4, .5, 1.9, 1.0), L.som(.4, .5, 1.9, 1.0) + L.box(.45, .55, 0, 1.8, .9, 10, '#DCE2EA') + L.box(.4, .5, 10, 1.9, 1.0, 4, '#BFD6E6', { topo: '#D6E7F2' }) + L.box(.4, .5, 14, .45, 1.0, 3, '#E7F1F8'));
        add(D(.95, .2, .3, .3), L.cil(1.1, .3, 0, .06, 44, '#B9C0CA') + L.box(.85, .5, 40, .6, .6, 4, '#E9ECF1') + L.esf(1.15, .8, 38, 4, '#FFF6C9'));
        add(D(3.3, 2.7, 1.7, .8), mesa(L, 3.3, 2.7, 1.7, .8, 19, '#E9EDF2', '#B9C3CF') + telaMesa(L, 3.6, 2.75, 19, .7, '#C9D3DC', false));
        add(D(3.8, 3.7, .5, .5), cadeira(L, 3.8, 3.65, '#8E74C6', 'jf'));
        if (porte === 'alta') add(D(.4, 3.6, .7, .6), L.som(.4, 3.6, .7, .6) + L.box(.4, 3.6, 0, .7, .6, 24, '#F2F4F7') + L.box(.45, 3.62, 24, .6, .1, 12, '#2B2F38', { esq: '#3DDC97', aresta: false }) + L.cil(.75, 4.3, 0, .12, 30, '#E9ECF1'));
        add(D(5.1, 4.8), planta(L, 5.15, 4.85));
        break;
      }
      case 'compras': {
        var prat = L.som(.1, .4, .7, 4.8) + L.box(.1, .4, 0, .7, 4.8, 56, '#9A8B70', { topo: '#B4A68A' });
        [4, 22, 40].forEach(function (z) {
          prat += L.faceI(.8, .45, 5.15, z - 1.5, z, '#7D6E55', SEM);
          for (var b = 0; b < 6; b++) prat += L.faceI(.8, .52 + b * .78, 1.14 + b * .78, z, z + 13, b % 3 === 1 ? '#7FA9D9' : (b % 2 ? '#C99A5E' : '#DDB27A'), SEM) + L.faceI(.8, .8 + b * .78, .86 + b * .78, z, z + 13, '#F3D7A8', SEM);
        });
        add(D(.1, .4, .7, 4.8), prat);
        var pal = L.som(2.5, 3.3, 1.5, 1.3) + L.box(2.5, 3.3, 0, 1.5, 1.3, 3, '#B48A5E');
        pal += caixote(L, 2.55, 3.35, 3, .68, .58, 13) + caixote(L, 3.27, 3.35, 3, .68, .58, 13, '#C99A5E') + caixote(L, 2.55, 3.98, 3, .68, .58, 13, '#C99A5E') + caixote(L, 3.27, 3.98, 3, .68, .58, 13) + caixote(L, 2.9, 3.6, 16, .68, .58, 12, '#7FA9D9');
        add(D(2.5, 3.3, 1.5, 1.3), pal);
        add(D(4.3, .6, 1.2, 1.0), L.som(4.3, .6, 1.2, 1.0) + L.box(4.3, .6, 0, 1.2, 1.0, 3, '#B48A5E') + caixote(L, 4.35, .65, 3, .55, .45, 13) + caixote(L, 4.9, .65, 3, .55, .45, 13, '#C99A5E') + caixote(L, 4.35, 1.12, 3, 1.1, .45, 12, '#C99A5E'));
        if (f.compra === 'excesso' || f.alvoCompras === 'dobro') add(D(4.6, 3.0, .6, .6), L.som(4.6, 3.0, .6, .6) + caixote(L, 4.6, 3.0, 0, .6, .6, 13) + caixote(L, 4.6, 3.0, 13, .6, .6, 13, '#C99A5E') + caixote(L, 4.6, 3.0, 26, .6, .6, 13));
        add(-1, L.paredeJ(2.0, 4.0, 38, 50, '#F2B53C', ' stroke="#D99A1F" stroke-width="1.2" stroke-linejoin="round"') + textoJ(L, 3.05, 41, 'ESTOQUE', '#5C3A0C', 8));
        break;
      }
      case 'farmacia': {
        var estF = L.som(.1, .4, .6, 4.6) + L.box(.1, .4, 0, .6, 4.6, 54, '#F1EEF6', { topo: '#FFFFFF' });
        var frascos = ['#E05A4F', '#5779AA', '#F2B53C', '#2FA866', '#8E6CC9', '#F08A24'];
        [6, 20, 34].forEach(function (z, r) {
          estF += L.faceI(.7, .45, 4.95, z - 1.5, z, '#D2CBDF', SEM);
          for (var b = 0; b < 9; b++) {
            estF += L.faceI(.7, .52 + b * .48, .78 + b * .48, z, z + 8, frascos[(b + r * 2) % 6], SEM) + L.faceI(.7, .56 + b * .48, .74 + b * .48, z + 8, z + 10, '#FFFFFF', SEM);
          }
        });
        add(D(.1, .4, .6, 4.6), estF);
        add(D(3.6, .15, 1.2, .6), L.som(3.6, .15, 1.2, .6) + L.box(3.6, .15, 0, 1.2, .6, 46, '#6B4FA0', { topo: '#8466B8' }) +
          L.faceJ(.75, 3.75, 4.65, 30, 40, '#9EE6E0', SEM) + [8, 14, 20].map(function (z) { return L.faceJ(.75, 3.75, 4.65, z, z + 4, '#5B3F8E', SEM); }).join(''));
        add(D(2.3, 3.1, 2.9, .8), L.som(2.3, 3.1, 2.9, .8) + L.box(2.3, 3.1, 0, 2.9, .8, 20, '#FFFFFF', { topo: '#F6F4FA' }) + L.faceJ(3.9, 2.35, 5.15, 9, 13, '#8E74C6', SEM) +
          L.box(2.3, 3.1, 20, 2.9, .8, 2, '#E3DDEF') + L.cil(3.0, 3.5, 22, .14, 5, '#F2B53C') + telaMesa(L, 4.1, 3.2, 22, .6, '#9EE6E0', false));
        add(-1, L.paredeJ(1.4, 2.8, 28, 44, '#FFFFFF', ' stroke="#D9D2E6" stroke-width="1.2" stroke-linejoin="round"') + L.paredeJ(1.98, 2.22, 30, 42, '#2FA866', SEM) + L.paredeJ(1.7, 2.5, 34.5, 37.5, '#2FA866', SEM));
        break;
      }
      case 'bloco': {
        var salas = porte === 'alta' ? '12' : '8';
        add(-1, L.paredeJ(3.6, 5.5, 38, 52, '#2F8F6F', ' stroke="#25715A" stroke-width="1" stroke-linejoin="round"') + textoJ(L, 4.55, 41, salas + ' SALAS', '#FFFFFF', 9) +
          porta(L, 'i', 3.3, 4.7) + (porte === 'alta' ? porta(L, 'i', 1.1, 2.5) : ''));
        add(D(.5, .9, .7, .6), L.som(.5, .9, .7, .6) + L.box(.5, .9, 0, .7, .6, 30, '#DDE2E8', { topo: '#F1F4F7' }) + L.box(.55, 1.45, 18, .6, .06, 10, '#2B2F38', { esq: '#3DDC97', aresta: false }) + L.cil(.85, 1.2, 30, .1, 6, '#9AA3AE'));
        add(D(1.9, 2.3, 1.9, .6), L.som(1.9, 2.3, 1.9, .6) + L.cil(2.85, 2.6, 0, .14, 10, '#9AA3AE') + L.box(1.9, 2.3, 10, 1.9, .6, 4, '#6FB7A8', { topo: '#8ACDBF' }) + L.box(1.95, 2.35, 14, .38, .5, 2.5, '#E8F6F2'));
        var cL = L.P(2.85, 2.6, 52);
        add(D(2.85, 2.6) + .2, L.cil(2.85, 1.0, 0, .05, 64, '#C2C9D2') + L.box(2.83, 1.0, 62, .06, 1.6, 2, '#C2C9D2') +
          '<ellipse class="luz-cirurgia" cx="' + f1(cL[0]) + '" cy="' + f1(cL[1] + 40) + '" rx="46" ry="20" fill="' + A.gradLuz('#FFF6C9') + '"/>' +
          '<ellipse cx="' + f1(cL[0]) + '" cy="' + f1(cL[1]) + '" rx="20" ry="9" fill="#E9EEF3" stroke="#B9C3CF" stroke-width="1.4"/><ellipse cx="' + f1(cL[0]) + '" cy="' + f1(cL[1] + 2) + '" rx="13" ry="5.4" fill="#FFF9DC"/>');
        add(D(4.4, 3.0, .8, .5), L.som(4.4, 3.0, .8, .5) + L.box(4.4, 3.0, 0, .8, .5, 17, '#D5DBE3', { topo: '#E9EEF3' }) + L.box(4.5, 3.05, 17, .2, .3, 2, '#9AA3AE') + L.box(4.85, 3.1, 17, .2, .25, 2, '#9AA3AE'));
        break;
      }
      case 'transplante': {
        add(-1, janelaJ(L, .9, 2.1, 22, 44) + L.paredeI(1.4, 2.8, 24, 46, '#FFFFFF', ' stroke="#EDD5C6" stroke-width="1.2" stroke-linejoin="round"') +
          L.paredeI(1.95, 2.25, 28, 42, '#E05A4F', SEM) + L.paredeI(1.7, 2.5, 33.5, 36.5, '#E05A4F', SEM));
        add(-.5, luzJanelaJ(L, .9, 2.1));
        add(D(2.6, .5, 1.9, .95), cama(L, 2.6, .5, '#F2B53C'));
        add(D(4.7, .7, .25, .25), monitorPe(L, 4.8, .75));
        add(D(1.0, 3.6, .9, .6), L.som(1.0, 3.6, .9, .6) + L.box(1.05, 3.65, 0, .8, .5, 8, '#AEB7C4') + L.box(1.0, 3.6, 8, .9, .6, 13, '#2F80C8', { topo: '#FFFFFF' }) +
          L.faceJ(4.2, 1.3, 1.6, 10, 19, '#FFFFFF', SEM) + L.faceJ(4.2, 1.18, 1.72, 13, 16, '#FFFFFF', SEM));
        add(D(4.2, 4.0, .9, .8), mesa(L, 4.2, 4.0, .9, .8, 17, '#F4F6F9', '#C9D2DD') + L.cil(4.5, 4.35, 17, .1, 7, '#E05A4F'));
        add(D(5.2, 2.6), planta(L, 5.25, 2.65));
        break;
      }
      case 'recepcao': {
        add(-1, cruzJ(L, 3.0, 26) + janelaI(L, 1.2, 2.8, 20, 44) + textoJ(L, 3.0, 12, 'RECEPÇÃO', '#5779AA', 8));
        add(D(1.5, 1.2, 3.0, .8), L.som(1.5, 1.2, 3.0, .8) + L.box(1.5, 1.2, 0, 3.0, .8, 18, '#FFFFFF', { topo: '#F4F6F9' }) + L.faceJ(2.0, 1.55, 4.45, 8, 12, '#3F8F9E', SEM) +
          L.box(1.5, 1.2, 18, 3.0, .8, 2.2, '#C9905A') + telaMesa(L, 2.2, 1.3, 20, .6, '#6CC4F0', false) + L.cil(4.0, 1.6, 20, .1, 5, '#2FA866'));
        add(D(.4, .4), planta(L, .45, .45));
        add(D(5.1, .4), planta(L, 5.15, .45));
        add(D(.3, 4.6, .8, 1.4), sofa(L, .3, 4.5, 1.4, '#3F8F9E', 'i'));
        break;
      }
      case 'jardim': {
        var pc = L.P(3.0, 2.3, .4);
        add(0, '<ellipse cx="' + f1(pc[0]) + '" cy="' + f1(pc[1]) + '" rx="46" ry="21" fill="' + A.gradV('#9ADCE6', '#5DB6CC') + '" stroke="#E9F6F3" stroke-width="3"/>' +
          '<ellipse cx="' + f1(pc[0] - 12) + '" cy="' + f1(pc[1] - 5) + '" rx="14" ry="4" fill="#fff" opacity=".45"/>');
        [[1.2, 4.6, '#F28DB2'], [1.5, 4.9, '#F2B53C'], [4.8, 4.4, '#E05A4F'], [5.1, 4.1, '#F28DB2'], [.6, 2.6, '#F2B53C']].forEach(function (x) { add(D(x[0], x[1]), L.esf(x[0], x[1], 0, 3, x[2])); });
        add(D(.8, .9), arvore(L, .9, .9));
        add(D(4.4, 1.2), arvore(L, 4.5, 1.2, .9));
        add(D(1.4, 4.2), arvore(L, 1.5, 4.0, .85));
        add(D(3.0, 3.8, 1.4, .5), L.som(3.0, 3.85, 1.4, .5) + L.box(3.05, 3.9, 0, .1, .4, 7, '#7B5232') + L.box(4.25, 3.9, 0, .1, .4, 7, '#7B5232') + L.box(3.0, 3.85, 7, 1.4, .5, 2.4, '#B07A4F') + L.box(3.0, 3.85, 9.4, 1.4, .1, 8, '#B07A4F'));
        break;
      }
    }
    return it;
  }
  function nuvemParede(L) {
    var c = L.fJ(0, 1.6, 2.8, 22, 40, .5, .5);
    return L.paredeJ(1.5, 2.9, 20, 42, '#EAF4FB', ' stroke="#BFD9EC" stroke-width="1.2" stroke-linejoin="round"') +
      '<g transform="translate(' + f1(c[0]) + ',' + f1(c[1]) + ') matrix(1,0.5,0,1,0,0)"><circle cx="-6" cy="2" r="5" fill="#5779AA"/><circle cx="1" cy="-2" r="7" fill="#5779AA"/><circle cx="8" cy="2" r="5" fill="#5779AA"/><rect x="-11" y="2" width="24" height="5" rx="2.5" fill="#5779AA"/></g>';
  }

  /* Pontos onde ficam os avatares (coordenadas locais) */
  var LUGARES = {
    diretoria: [[2.4, 1.05], [3.6, 3.3], [1.0, 2.5]],
    reunioes: [[1.75, 1.42], [4.55, 4.35], [4.55, 1.42], [1.75, 4.35], [3.15, 1.42], [3.15, 4.35]],
    ti: [[3.65, 3.9], [2.0, 4.2], [4.6, 4.3]],
    urgencia: [[4.4, 4.75], [2.95, 1.65], [3.0, 4.6]],
    especialidades: [[4.05, 3.95], [2.6, 2.0], [2.5, 4.4]],
    compras: [[2.0, 2.4], [4.7, 2.3], [1.8, 4.5]],
    farmacia: [[3.7, 4.4], [1.8, 2.1], [2.0, 5.0]],
    bloco: [[3.3, 1.65], [1.6, 3.6], [4.6, 4.4]],
    transplante: [[2.6, 2.4], [1.9, 4.8], [4.0, 3.0]],
    recepcao: [[1.6, 3.2], [2.6, 3.4], [3.6, 3.6], [4.6, 3.8], [3.1, 4.7]],
    jardim: [[2.0, 3.0]]
  };

  /* ---- avatar no mapa ---- */
  function avatarMapa(p, a) {
    var cor = a.cor || '#5779AA';
    var atraso = ((A.hash(a.nome || 'x') % 30) / 10).toFixed(1);
    return '<g class="av-mapa' + (a.eu ? ' eu' : '') + (a.npc ? ' npc' : '') + (a.semCracha ? ' sem-cracha' : '') + '"' + (a.id ? ' data-id="' + esc(a.id) + '"' : '') + ' transform="translate(' + f1(p[0]) + ',' + f1(p[1]) + ')">' +
      '<g class="av-anda">' +
      (a.eu ? '<ellipse class="anel-eu" cx="0" cy="-1" rx="17" ry="7" fill="none" stroke="#F6B93B" stroke-width="2.4"/>' : '') +
      '<g class="av-bob" style="animation-delay:-' + atraso + 's"><g transform="scale(' + ESC_AV + ') translate(-50,-146)">' +
      A.corpo(a.aparencia, { anel: a.npc ? false : cor, cracha: a.npc || a.semCracha ? false : cor }) + '</g></g>' +
      (a.eu ? '<g class="seta-eu"><path d="M-6,-76 L6,-76 L0,-68 Z" fill="#F6B93B" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></g>' : '') +
      '</g><title>' + esc(a.nome || '') + (a.papelNome ? ' · ' + esc(a.papelNome) : '') + '</title></g>';
  }

  /* ---- uma sala completa (plataforma, piso, paredes, mobília, avatares) ---- */
  function desenharSala(k, oi, oj, st, porte, avatares, opts) {
    opts = opts || {};
    var T = TEMA[k] || TEMA.recepcao, L = kit(oi, oj), s = '';
    var lado = opts.lado || LADO;
    // plataforma e piso
    s += caixa(oi, oj, 0, lado, lado, Z, T.borda, { topo: A.gradD(T.piso[0], T.piso[1]), esq: cl(T.borda, .1), dir: es(T.borda, .05), aresta: true });
    var lin = '', corL = T.linha === 'grama' ? 'rgba(255,255,255,.0)' : (T.linha === 'carpete' ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.5)');
    if (T.linha === 'madeira') {
      for (var q = 1; q < lado * 2; q++) lin += '<line x1="' + f1(P(oi + q / 2, oj, Z)[0]) + '" y1="' + f1(P(oi + q / 2, oj, Z)[1]) + '" x2="' + f1(P(oi + q / 2, oj + lado, Z)[0]) + '" y2="' + f1(P(oi + q / 2, oj + lado, Z)[1]) + '"/>';
      s += '<g stroke="rgba(120,80,40,.16)" stroke-width="1">' + lin + '</g>';
    } else if (T.linha !== 'grama') {
      for (var g = 1; g < lado; g++) {
        lin += '<line x1="' + f1(P(oi + g, oj, Z)[0]) + '" y1="' + f1(P(oi + g, oj, Z)[1]) + '" x2="' + f1(P(oi + g, oj + lado, Z)[0]) + '" y2="' + f1(P(oi + g, oj + lado, Z)[1]) + '"/>';
        lin += '<line x1="' + f1(P(oi, oj + g, Z)[0]) + '" y1="' + f1(P(oi, oj + g, Z)[1]) + '" x2="' + f1(P(oi + lado, oj + g, Z)[0]) + '" y2="' + f1(P(oi + lado, oj + g, Z)[1]) + '"/>';
      }
      s += '<g stroke="' + corL + '" stroke-width="1.1">' + lin + '</g>';
    } else {
      for (var t = 0; t < 26; t++) {
        var h = A.hash(k + t), pi = (h % 600) / 100, pj = ((h >> 8) % 600) / 100, pp = P(oi + pi, oj + pj, Z);
        lin += '<path d="M' + f1(pp[0] - 2) + ' ' + f1(pp[1]) + 'l2-5 2 5" fill="none" stroke="#6FB052" stroke-width="1.2" stroke-linecap="round"/>';
      }
      s += lin;
    }
    // paredes (corte isométrico: só as duas do fundo)
    if (T.parede) {
      var pe = T.parede, esp = 0.2;
      var gEsq = A.gradV(cl(pe, .2), es(pe, .04)), gDir = A.gradV(es(pe, .06), es(pe, .16));
      s += caixa(oi - esp, oj - esp, Z, lado + esp, esp, HP, pe, { topo: '#FFFFFF', esq: gEsq, dir: es(pe, .1), aresta: false });
      s += caixa(oi - esp, oj, Z, esp, lado, HP, pe, { topo: '#FFFFFF', esq: cl(pe, .1), dir: gDir, aresta: false });
      // rodapé e moldura do topo
      s += A.naParedeJ(oj, oi, oi + lado, Z, Z + 4, es(pe, .2), SEM) + A.naParedeI(oi, oj, oj + lado, Z, Z + 4, es(pe, .26), SEM);
      s += '<polyline points="' + A.pts([P(oi - esp, oj + lado, Z + HP), P(oi - esp, oj - esp, Z + HP), P(oi + lado, oj - esp, Z + HP)]) + '" fill="none" stroke="' + es(pe, .18) + '" stroke-width="1" opacity=".6"/>';
      // sombra das paredes no chão
      s += A.poly([P(oi, oj, Z), P(oi + lado, oj, Z), P(oi + lado - .2, oj + .6, Z), P(oi + .6, oj + .6, Z)], '#0F1E33', ' opacity=".06"');
      s += A.poly([P(oi, oj, Z), P(oi + .6, oj + .6, Z), P(oi + .6, oj + lado - .2, Z), P(oi, oj + lado, Z)], '#0F1E33', ' opacity=".09"');
    }
    var itens = mobilia(k, L, st, porte);
    (avatares || []).forEach(function (a) { itens.push({ d: a.i + a.j + 0.01, s: avatarMapa(L.P(a.i, a.j, 0), a) }); });
    itens.sort(function (a, b) { return a.d - b.d; });
    s += itens.map(function (x) { return x.s; }).join('');
    return s;
  }

  /* ---- quem está em qual sala ---- */
  function localDosJogadores(st, dados) {
    var porte = st.porte, P_ = G.PORTES[porte], loc = {};
    (dados.jogadores || []).forEach(function (j) {
      var fs = funcoesDe(j).filter(function (f) { return P_.papeis.indexOf(f) >= 0; });
      if (!fs.length) return;
      var sala = null;
      if (!st.finalizado) {
        var pend = E.pendentesDe(st, fs);
        if (pend.length) sala = pend[0].task.type === 'reuniao' ? 'reunioes' : pend[0].task.setor;
        else {
          var reu = st.tasks.filter(function (t) { return t.type === 'reuniao' && t.day === st.dia && st.tarefas[t.id].status !== 'concluida' && t.roles.some(function (r) { return fs.indexOf(r) >= 0; }); });
          if (reu.length && st.tarefas[reu[0].id].status !== 'aguardando') sala = 'reunioes';
        }
      } else sala = 'reunioes';
      if (!sala || P_.salas.indexOf(sala) < 0) sala = PRINCIPAL[fs[0]];
      if (P_.salas.indexOf(sala) < 0) sala = 'diretoria';
      loc[j.id_jogador] = { sala: sala, papel: fs[0] };
    });
    return loc;
  }

  function pct(v, min, tam) { return ((v - min) / tam * 100).toFixed(2) + '%'; }

  /* ======================================================================
     MAPA ISOMÉTRICO DO HOSPITAL
     ====================================================================== */
  function mapa(st, dados, papeis, idEu) {
    A.limparDefs();
    var porte = st.porte, P_ = G.PORTES[porte], salas = P_.salas.slice();
    var linhas = porte === 'essencial' ? 2 : 3;
    if (porte === 'regional') salas.push('jardim');
    var loc = localDosJogadores(st, dados);
    var porSala = {};
    (dados.jogadores || []).forEach(function (j) {
      var l = loc[j.id_jogador]; if (!l) return;
      (porSala[l.sala] = porSala[l.sala] || []).push({ j: j, papel: l.papel });
    });
    var iMax = 3 * PASSO - 1, jMax = linhas * PASSO - 1;
    var s = '';
    // laje do andar (corredores)
    s += '<g class="iso-base">' + caixa(-1, -1, -12, iMax + 1, jMax + 1, 12, '#A9B7C8', { topo: A.gradD('#EEF2F7', '#D9E1EB'), esq: '#B9C6D5', dir: '#97A6B9' }) + '</g>';
    // faixas de sinalização no chão dos corredores
    var faixa = function (i0, j0, i1, j1, cor) {
      var w = .09;
      var ps = i0 === i1 ? [P(i0 - w, j0, 0), P(i0 + w, j0, 0), P(i1 + w, j1, 0), P(i1 - w, j1, 0)] : [P(i0, j0 - w, 0), P(i0, j0 + w, 0), P(i1, j1 + w, 0), P(i1, j1 - w, 0)];
      return A.poly(ps, cor, ' opacity=".75"');
    };
    s += faixa(-.6, 7.1, iMax - .4, 7.1, '#3F8F9E') + faixa(7.1, -.6, 7.1, jMax - .4, '#5779AA') + faixa(15.1, -.6, 15.1, jMax - .4, '#BA758B');
    if (linhas === 3) s += faixa(-.6, 15.1, iMax - .4, 15.1, '#F2B53C');
    var ext = [];
    [[7, 7], [15, 7], [7, 15], [15, 15], [23, 7], [7, 23]].forEach(function (c) {
      if (c[0] < iMax && c[1] < jMax) ext.push({ d: c[0] + c[1] - 1.5, s: planta(kit(0, 0), c[0] - .2, c[1] - .2, .9) });
    });
    var over = '';
    var ordem = salas.slice().sort(function (a, b) { var X = SLOT[a], Y = SLOT[b]; return (X[0] + X[1]) - (Y[0] + Y[1]) || X[0] - Y[0]; });
    var anc = {};
    var crise = emCrise(st);
    var bolhas = recentes(st, dados);
    var blocos = [];
    ordem.forEach(function (k) {
      var oi = SLOT[k][0] * PASSO, oj = SLOT[k][1] * PASSO;
      var gente = porSala[k] || [];
      var lug = LUGARES[k] || [[3, 3]];
      var avs = gente.slice(0, lug.length).map(function (x, n) {
        return { i: lug[n][0], j: lug[n][1], nome: x.j.nome, eu: x.j.id_jogador === idEu, papelNome: G.papelInfo(x.papel, porte).nome, aparencia: A.aparencia(x.j, x.papel), id: x.j.id_jogador, cor: G.ROLES[x.papel].cor };
      });
      var npc = { urgencia: ['enfermagem', 1], compras: ['tecnico', 1], farmacia: ['farmaceutico', 1], bloco: ['instrumentadora', 2] }[k];
      if (npc && avs.length < 2) avs.push({ i: lug[npc[1]][0], j: lug[npc[1]][1], nome: k === 'urgencia' ? 'Enfermagem' : (k === 'compras' ? 'Almoxarife' : k === 'bloco' ? 'Instrumentadora' : 'Farmacêutico(a)'), aparencia: A.NPC[npc[0]], npc: true });
      var cls = 'iso-sala' + (k === 'jardim' ? ' jardim' : '');
      var clic = k === 'jardim' ? '' : ' data-acao="sala" data-sala="' + k + '" tabindex="0" role="button" aria-label="' + esc(G.nomeSetor(k, porte)) + '"';
      blocos.push({ d: oi + oj, s: '<g class="' + cls + '"' + clic + '>' + desenharSala(k, oi, oj, st, porte, avs) + '</g>' });
      if (k === 'jardim') return;
      var topo = P(oi - .2, oj - .2, Z + HP + 4);
      var stt = statusSala(st, k, papeis); if (crise === k && stt !== 'vez') stt = 'crise';
      var lider = avs.filter(function (a) { return !a.npc; })[0] || null;
      var alvo = lider ? P(oi + lider.i, oj + lider.j, Z + 86) : P(oi + 3, oj + 3, Z + 70);
      anc[k] = { topo: topo, marca: alvo, stt: stt };
      avs.forEach(function (a) { if (a.id) anc['av_' + a.id] = P(oi + a.i, oj + a.j, Z + 72); });
      var papel = papelDaSala(k, porte), dono = papel ? st.idx.holder[papel] : null;
      anc[k].placa = '<button class="iso-placa" data-acao="sala" data-sala="' + k + '" style="--c:' + corSala(k, porte) + ';left:@L;top:@T"><span class="placa-ic">' +
        (papel ? A.icone(UI.pxPapel(papel), 15) : A.icone('balao', 15)) + '</span><span><b>' + esc(G.nomeSetor(k, porte)) + '</b><small>' + esc(papel ? (dono ? dono.nome : 'sem responsável') : 'reuniões') + '</small></span></button>';
    });
    blocos = blocos.concat(ext).sort(function (a, b) { return a.d - b.d; });
    s += blocos.map(function (b) { return b.s; }).join('');
    // limites do desenho
    var xs = [P(-1, jMax)[0] - 14, P(iMax, -1)[0] + 14];
    var ys = [P(-1, -1)[1] - Z - HP - 34, P(iMax, jMax)[1] + 30];
    var vx = xs[0], vy = ys[0], vw = xs[1] - xs[0], vh = ys[1] - ys[0];
    Object.keys(anc).forEach(function (k) {
      var a = anc[k];
      if (k.indexOf('av_') === 0 || !a.placa) return;
      over += a.placa.replace('@L', pct(a.topo[0], vx, vw)).replace('@T', pct(a.topo[1], vy, vh));
      if (a.stt) {
        var simb = { vez: '!', crise: '!', pendente: '<i></i><i></i><i></i>', espera: '<i></i><i></i><i></i>', feito: '✓' }[a.stt];
        over += '<button class="iso-marca ' + a.stt + '" data-acao="sala" data-sala="' + k + '" style="left:' + pct(a.marca[0], vx, vw) + ';top:' + pct(a.marca[1], vy, vh) + '" title="' +
          ({ vez: 'Sua vez', crise: 'Crise!', pendente: 'Em andamento', espera: 'Aguardando outra etapa', feito: 'Concluído hoje' }[a.stt]) + '">' + simb + '</button>';
      }
    });
    bolhas.forEach(function (b, n) {
      var a = anc['av_' + b.id]; if (!a) return;
      over += '<div class="iso-bolha" style="left:' + pct(a[0], vx, vw) + ';top:' + pct(a[1], vy, vh) + ';--c:' + b.cor + ';animation-delay:' + (n * 0.25) + 's">' +
        A.rostoSVG(b.aparencia, 22) + '<span><b>' + esc(b.nome) + ':</b> ' + esc(b.texto) + '</span></div>';
    });
    return '<div class="iso-mapa' + (crise ? ' crise' : '') + (st.finalizado ? ' fim' : '') + '" style="aspect-ratio:' + vw.toFixed(0) + '/' + vh.toFixed(0) + '">' +
      '<svg viewBox="' + vx.toFixed(0) + ' ' + vy.toFixed(0) + ' ' + vw.toFixed(0) + ' ' + vh.toFixed(0) + '" class="iso-svg" role="img" aria-label="Mapa do hospital">' + A.defsSVG() + s + '</svg>' +
      '<div class="iso-over">' + over + '</div></div>';
  }

  /** Falas recentes (decisões e reuniões de hoje) para os balões. */
  function recentes(st, dados) {
    var hoje = [], porte = st.porte;
    (dados.decisoes || []).forEach(function (d) {
      if (d.tipo !== 'decisao') return;
      var t = E.taskById(d.tarefa_id, porte); if (!t || t.day !== st.dia) return;
      var info = st.tarefas[t.id];
      hoje.push({ ts: d.timestamp, id: d.id_jogador, nome: d.jogador, papel: d.funcao, texto: curto('Decidi: ' + (info && info.opt ? info.opt.label : d.opcao_escolhida), 70) });
    });
    (dados.reunioes || []).forEach(function (r) {
      var t = E.taskById(r.reuniao_id, porte); if (!t || t.day !== st.dia) return;
      hoje.push({ ts: r.timestamp, id: r.id_jogador, nome: r.jogador, papel: r.funcao, texto: curto(r.contribuicao, 70) });
    });
    hoje.sort(function (a, b) { return new Date(b.ts) - new Date(a.ts); });
    var vistos = {}, out = [];
    hoje.forEach(function (x) {
      if (vistos[x.id] || out.length >= 3) return; vistos[x.id] = 1;
      x.cor = (G.ROLES[x.papel] || {}).cor || '#5779AA';
      x.aparencia = A.aparencia(x.nome, x.papel);
      out.push(x);
    });
    return out;
  }

  /* ---- caminhada dos avatares entre salas ---- */
  function posicoesAvatares() {
    var svg = document.querySelector('.iso-mapa .iso-svg'); if (!svg) return null;
    var r0 = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal; if (!r0.width || !vb) return null;
    var e = r0.width / vb.width, m = {};
    document.querySelectorAll('.iso-mapa .av-mapa[data-id]').forEach(function (g) {
      var t = g.transform.baseVal.consolidate(); if (!t) return;
      m[g.getAttribute('data-id')] = [t.matrix.e, t.matrix.f];
    });
    m._e = e;
    return m;
  }
  function animarCaminhadas(antes) {
    if (reduzido || !antes) return;
    document.querySelectorAll('.iso-mapa .av-mapa[data-id]').forEach(function (g) {
      var a = antes[g.getAttribute('data-id')]; if (!a) return;
      var t = g.transform.baseVal.consolidate(); if (!t) return;
      var dx = a[0] - t.matrix.e, dy = a[1] - t.matrix.f;
      if (Math.abs(dx) + Math.abs(dy) < 3) return;
      var anda = g.querySelector('.av-anda'); if (!anda || !anda.animate) return;
      var dist = Math.sqrt(dx * dx + dy * dy), dur = Math.min(2600, 600 + dist * 2.4);
      g.classList.add('andando');
      var an = anda.animate([{ transform: 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)' }, { transform: 'translate(0px,0px)' }], { duration: dur, easing: 'ease-in-out' });
      an.onfinish = function () { g.classList.remove('andando'); };
    });
  }

  /* ======================================================================
     CENA DE UMA SALA (janelas de sala, reunião e sala de espera)
     ====================================================================== */
  function cena(k, st, porte, avatares, bolhas, opts) {
    opts = opts || {};
    A.limparDefs();
    var s = desenharSala(k, 0, 0, st, porte, avatares, opts);
    var lado = opts.lado || LADO;
    var vx = P(0, lado)[0] - 16, vw = P(lado, 0)[0] + 16 - vx, vy = P(0, 0, Z + HP)[1] - (opts.folga || 60), vh = P(lado, lado)[1] + 18 - vy;
    var over = '';
    (bolhas || []).forEach(function (b) {
      var a = P(b.i, b.j, Z + 74);
      over += '<div class="cena-bolha ' + (b.cls || '') + '" style="left:' + pct(a[0], vx, vw) + ';top:' + pct(a[1], vy, vh) + ';--c:' + (b.cor || '#5779AA') + '"' + (b.acao || '') + '>' + b.html + '</div>';
    });
    (avatares || []).forEach(function (a) {
      if (!a.rotulo) return;
      var p = P(a.i, a.j, Z - 2);
      over += '<span class="cena-nome' + (a.eu ? ' eu' : '') + '" style="left:' + pct(p[0], vx, vw) + ';top:' + pct(p[1], vy, vh) + ';--c:' + (a.cor || '#5779AA') + '">' + a.rotulo + '</span>';
    });
    return '<div class="cena-iso ' + (opts.cls || '') + '" style="aspect-ratio:' + vw.toFixed(0) + '/' + vh.toFixed(0) + '"><svg viewBox="' + vx.toFixed(0) + ' ' + vy.toFixed(0) + ' ' + vw.toFixed(0) + ' ' + vh.toFixed(0) + '" class="iso-svg" aria-hidden="true">' + A.defsSVG() + s + '</svg><div class="iso-over">' + over + '</div></div>';
  }

  function cenaSala(k, st, dados, idEu) {
    var loc = localDosJogadores(st, dados), lug = LUGARES[k] || [[3, 3]], n = 0, avs = [];
    (dados.jogadores || []).forEach(function (j) {
      var l = loc[j.id_jogador]; if (!l || l.sala !== k || n >= lug.length) return;
      avs.push({ i: lug[n][0], j: lug[n][1], nome: j.nome, eu: j.id_jogador === idEu, aparencia: A.aparencia(j, l.papel), rotulo: esc(j.id_jogador === idEu ? 'Você' : j.nome), cor: G.ROLES[l.papel].cor });
      n++;
    });
    return cena(k, st, st.porte, avs, [], { cls: 'cena-sala', folga: 30 });
  }

  /** Reunião: participantes ao redor da mesa, com balões das falas. */
  function cenaReuniao(t, info, holder, papeis, st) {
    var lug = LUGARES.reunioes, avs = [], bolhas = [];
    t.roles.forEach(function (r, n) {
      var j = holder[r], R = G.ROLES[r], l = lug[n % lug.length];
      var c = info.contribs && info.contribs[r];
      var liberado = info.status !== 'aguardando' && (!t.sequencial || r === t.lider || (info.contribs && info.contribs[t.lider]));
      var meu = papeis.indexOf(r) >= 0;
      avs.push({ i: l[0], j: l[1], nome: j ? j.nome : R.curto, eu: meu, aparencia: A.aparencia(j || r, r), rotulo: esc((j ? j.nome : '—') + ' · ' + R.curto), cor: R.cor });
      var html, cls = '';
      if (c) html = '<b>' + esc(j ? j.nome : R.curto) + ':</b> ' + esc(curto(c.contribuicao, 90));
      else if (liberado && meu) { html = '<b>Sua vez de falar</b>'; cls = 'vez'; }
      else if (liberado) { html = '<i></i><i></i><i></i>'; cls = 'digitando'; }
      else return;
      bolhas.push({ i: l[0], j: l[1], html: html, cls: cls, cor: R.cor, acao: ' data-acao="ir-fala" data-alvo="fala-' + t.id + '-' + r + '"' });
    });
    return cena('reunioes', st, st.porte, avs, bolhas, { cls: 'cena-reuniao', folga: 46 });
  }

  /** Sala de espera: a equipe na recepção do hospital. */
  function cenaLobby(jogadores, idEu) {
    var lug = LUGARES.recepcao, avs = [];
    jogadores.slice(0, 5).forEach(function (j, n) {
      var fs = funcoesDe(j), papel = fs[0] || '', tem = A.temAvatar(j);
      avs.push({ i: lug[n][0], j: lug[n][1], nome: j.nome, eu: j.id_jogador === idEu, aparencia: A.aparencia(j, papel), semCracha: !tem,
        rotulo: esc(j.id_jogador === idEu ? j.nome + ' (você)' : j.nome) + (tem ? '' : ' · no vestiário'), cor: papel ? G.ROLES[papel].cor : '#8A93A3' });
    });
    return cena('recepcao', null, 'regional', avs, [], { cls: 'cena-lobby', folga: 30 });
  }

  /* ======================================================================
     VISTA DO HOSPITAL (tela inicial e transição de dia)
     ====================================================================== */
  function predio(opts) {
    opts = opts || {};
    A.limparDefs();
    var noite = !!opts.noite, s = '';
    var L = kit(0, 0), Zb = -Z;   // o kit soma Z; aqui o chão é z = 0
    function bx(i, j, z, w, d, h, cor, o) { return caixa(i, j, z, w, d, h, cor, o); }
    // gramado
    s += '<g class="iso-base">' + bx(-3, -2, -16, 17, 13, 16, '#6FAE58', { topo: A.gradD('#A9DC8C', '#86C468'), esq: '#7FBC66', dir: '#5E9A48' }) + '</g>';
    s += A.piso(4.2, 6.2, 1.8, 4.8, .2, '#E9E4D8') + A.piso(-3, 8.6, 17, 1.6, .2, '#C9CED6') + A.piso(-3, 9.25, 17, .1, .3, '#FFFFFF', ' opacity=".8"');
    // ala lateral
    var cJan = noite ? '#FFE29A' : A.gradV('#A9D8F0', '#E3F3FB');
    s += A.sombra(-1.5, 1, 0, 2.5, 4.5, 1.1) + bx(-1.5, 1, 0, 2.5, 4.5, 66, '#E7ECF2', { topo: '#F7F9FB' });
    for (var a = 0; a < 2; a++) for (var b = 0; b < 3; b++) s += A.naParedeJ(5.5, -1.2 + a * 1.1, -.55 + a * 1.1, 12 + b * 17, 22 + b * 17, cJan, ' stroke="#fff" stroke-width="1.4" stroke-linejoin="round"');
    // bloco principal
    s += A.sombra(1, 0, 0, 9, 6, 1.1) + bx(1, 0, 0, 9, 6, 136, '#F4F6F9', { topo: '#FFFFFF', dir: '#D9E0E9' });
    for (var v = 0; v < 5; v++) s += A.naParedeJ(6, 1, 10, 40 + v * 21, 42 + v * 21, '#5779AA', ' opacity=".55"') + A.naParedeI(10, 0, 6, 40 + v * 21, 42 + v * 21, '#3F6A9A', ' opacity=".55"');
    for (var u = 0; u < 7; u++) for (var w = 0; w < 5; w++) {
      var acesa = noite ? ((u * 7 + w * 3) % 4 !== 0) : false;
      s += A.naParedeJ(6, 1.45 + u * 1.2, 2.15 + u * 1.2, 24 + w * 21, 37 + w * 21, acesa ? '#FFE29A' : (noite ? '#3A5378' : A.gradV('#A9D8F0', '#E3F3FB')), ' stroke="#fff" stroke-width="1.2" stroke-linejoin="round"');
    }
    for (var x = 0; x < 4; x++) for (var y = 0; y < 5; y++) {
      var ac2 = noite ? ((x + y * 5) % 3 !== 0) : false;
      s += A.naParedeI(10, .55 + x * 1.35, 1.25 + x * 1.35, 24 + y * 21, 37 + y * 21, ac2 ? '#F5D88A' : (noite ? '#2F4566' : A.gradV('#8FC3DE', '#CFE8F5')), ' stroke="#EEF2F6" stroke-width="1.2" stroke-linejoin="round"');
    }
    s += bx(.9, -.1, 136, 9.2, 6.2, 4, '#DCE3EB', { topo: '#EEF2F6' });
    // heliponto e torre com a cruz
    s += A.elipse(3, 3, 140.5, 1.05, '#5A6270') + A.elipse(3, 3, 141, .82, 'none', ' stroke="#F2B53C" stroke-width="2.4"');
    s += bx(5.2, 1.5, 140, 3.2, 3, 30, '#E7ECF2', { topo: '#F7F9FB' });
    s += A.naParedeJ(4.5, 5.9, 7.7, 144, 166, '#FFFFFF', ' stroke="#F1D3D0" stroke-width="1.4" stroke-linejoin="round"') + A.naParedeJ(4.5, 6.65, 6.95, 147, 163, '#E05A4F', SEM) + A.naParedeJ(4.5, 6.2, 7.4, 152, 158, '#E05A4F', SEM);
    if (noite) { var cc = P(6.8, 4.5, 155); s += '<circle cx="' + f1(cc[0]) + '" cy="' + f1(cc[1]) + '" r="38" fill="' + A.gradLuz('#FF8A80') + '"/>'; }
    // entrada
    s += A.naParedeJ(6, 4.4, 5.8, 0, 28, A.gradV('#BFE3F2', '#8CC3DD'), ' stroke="#5779AA" stroke-width="1.6" stroke-linejoin="round"') + A.naParedeJ(6, 5.08, 5.12, 0, 28, '#5779AA', SEM);
    s += bx(4.0, 6, 32, 2.2, 1.3, 4, '#5779AA', { topo: '#7C9BC8' }) + A.cilindro(4.1, 7.2, 0, .05, 32, '#E7ECF2') + A.cilindro(6.1, 7.2, 0, .05, 32, '#E7ECF2');
    // ambulância
    s += A.sombra(7.4, 7.6, 0, 2.4, .9) + bx(7.4, 7.6, 3, 1.8, .85, 20, '#FFFFFF', { topo: '#F4F6F9' }) + bx(9.2, 7.6, 3, .55, .85, 13, '#FFFFFF', { esq: '#BFE6F5' }) +
      A.naParedeJ(8.45, 7.5, 9.1, 9, 13, '#E05A4F', SEM) + A.cilindro(7.75, 8.45, 0, .14, 4, '#2B2F38') + A.cilindro(9.2, 8.45, 0, .14, 4, '#2B2F38') +
      bx(8.0, 7.9, 23, .4, .25, 3, noite ? '#FF5A4F' : '#4A90D9');
    // árvores e arbustos
    var arv = [[-2.2, 7.4], [0, 8.2], [11.6, 1.2], [12.3, 5.4], [-2.4, 2.4], [12.6, 8.2]];
    arv.forEach(function (c) {
      s += A.sombra(c[0] - .6, c[1] - .6, 0, 1.2, 1.2) + A.cilindro(c[0], c[1], 0, .08, 18, '#8B6040') + A.esfera(c[0], c[1], 16, 17, '#4CA463') + A.esfera(c[0] - .2, c[1] + .1, 28, 13, '#5DBB74') + A.esfera(c[0] + .18, c[1] - .12, 32, 10, '#70CB86');
    });
    var vx = P(-3, 11)[0] - 20, vy = P(1, 0, 230)[1], vw = P(14, -2)[0] + 20 - vx, vh = P(14, 11)[1] + 26 - vy;
    return '<svg class="predio-iso" viewBox="' + vx.toFixed(0) + ' ' + vy.toFixed(0) + ' ' + vw.toFixed(0) + ' ' + vh.toFixed(0) + '" aria-hidden="true">' + A.defsSVG() + s + '</svg>';
  }

  /* ======================================================================
     CARTAS DE MODELOS (G2 e M2)
     ====================================================================== */
  var GLIFOS = {
    A: '<circle cx="24" cy="8" r="5"/><circle cx="12" cy="26" r="5"/><circle cx="36" cy="26" r="5"/><circle cx="6" cy="42" r="4"/><circle cx="18" cy="42" r="4"/><circle cx="36" cy="42" r="4"/><path d="M24 13l-10 9M24 13l10 9M12 31l-5 7M12 31l5 7M36 31v7" fill="none"/>',
    B: '<circle cx="6" cy="12" r="4"/><circle cx="6" cy="36" r="4"/><circle cx="24" cy="6" r="4"/><circle cx="24" cy="24" r="4"/><circle cx="24" cy="42" r="4"/><circle cx="42" cy="24" r="4"/><path d="M10 12l10-6M10 12l10 12M10 12l10 18M10 36l10-30M10 36l10-12M10 36l10 6M28 6l10 18M28 24h10M28 42l10-18" fill="none"/>',
    C: '<path d="M4 40C18 40 18 8 44 8" fill="none" stroke-width="3.5"/><path d="M4 44h40M4 4v40" fill="none" opacity=".5"/>',
    D: '<rect x="6" y="6" width="28" height="18" rx="3"/><rect x="10" y="14" width="28" height="18" rx="3"/><rect x="14" y="22" width="28" height="18" rx="3"/>',
    E: '<rect x="6" y="6" width="36" height="36" rx="8"/><text x="24" y="33" text-anchor="middle" font-size="24" font-weight="700" stroke="none" fill="#2B2F36">?</text>'
  };
  function glifo(k) {
    return '<svg class="glifo" viewBox="0 0 48 48" fill="rgba(255,255,255,.95)" stroke="rgba(255,255,255,.95)" stroke-width="2" stroke-linecap="round">' + (GLIFOS[k] || GLIFOS.E) + '</svg>';
  }
  function barra(rot, v, max, sufixo, alerta) {
    var p = Math.max(0, Math.min(100, v / (max || 100) * 100));
    return '<div class="stat"><span>' + esc(rot) + '</span><i><b style="width:' + p + '%"' + (alerta ? ' class="alerta"' : '') + '></b></i><em>' + esc(String(v).replace('.', ',')) + (sufixo || '') + '</em></div>';
  }

  function carta(k, modo, tid, opts) {
    opts = opts || {};
    var m = G.MODELS[k], c = G.carga(m.sens, m.esp), ctx = opts.ctx;
    var cls = 'carta' + (opts.virada ? ' virada' : '') + (opts.selecionada ? ' selecionada' : '') + (opts.naMesa ? ' na-mesa' : '');
    var frente = '<div class="face frente"><header class="carta-cab carta-' + k + '">' + glifo(k) + '<div><b>' + esc(m.nome) + '</b><small>' + esc(m.tecnica) + '</small></div></header>' +
      '<div class="carta-stats">' + barra('Acurácia', m.acc, 100, '%') + barra('Sensibilidade', m.sens, 100, '%', m.sens < 50) + barra('Especificidade', m.esp, 100, '%') +
      '<div class="stat auc"><span>AUC</span><em>' + m.auc + '</em></div></div>' +
      '<div class="carta-preco">' + A.icone('moeda', 16) + '<b>' + G.fmtc(ctx, m.custo) + '</b>/ano' + (modo === 'g2' ? '<small>piloto ' + G.fmtc(ctx, m.custo * 0.2) + '</small>' : '') + '</div>' +
      '<div class="carta-acoes"><button class="btn mini" data-acao="carta-virar" data-tid="' + tid + '" data-m="' + k + '">' + A.icone('refresh', 14) + (modo === 'g2' ? 'Letras miúdas' : 'No plantão') + '</button>' +
      (opts.botao || '') + '</div></div>';
    var verso;
    if (modo === 'g2') {
      verso = '<div class="face verso"><header class="verso-cab">' + A.icone('lupa', 18) + '<b>Letras miúdas</b></header>' +
        '<dl><dt>Onde foi testado</dt><dd>' + esc(m.validacao) + '</dd><dt>Observação do fornecedor</dt><dd><i>' + esc(m.obs) + '</i></dd>' +
        '<dt>Dados que exige</dt><dd>' + esc(m.dados) + '</dd><dt>Computador</dt><dd>' + (m.gpu ? 'Precisa de placa de vídeo (GPU) dedicada' : 'Roda em servidor comum') + '</dd></dl>' +
        '<div class="carta-acoes"><button class="btn mini" data-acao="carta-virar" data-tid="' + tid + '" data-m="' + k + '">' + A.icone('refresh', 14) + 'Voltar</button>' + (opts.botao || '') + '</div></div>';
    } else {
      verso = '<div class="face verso"><header class="verso-cab">' + A.icone('medico', 18) + '<b>No plantão de 300 pacientes</b></header>' +
        '<div class="verso-nums"><div><b>' + G.r0(c.alertas) + '</b><span>alertas</span></div><div><b>' + G.r1(c.perdidos) + '</b><span>graves sem alerta</span></div><div><b>' + G.r0(c.vpp) + '%</b><span>alertas certos</span></div></div>' +
        '<dl><dt>Explica o alerta?</dt><dd>' + esc(m.expl) + '</dd><dt>Tempo de resposta</dt><dd>' + esc(m.tempo) + '</dd><dt>Dados</dt><dd>' + esc(m.dados) + '</dd><dt>Onde foi testado</dt><dd>' + esc(m.validacao) + '</dd></dl>' +
        '<div class="carta-acoes"><button class="btn mini" data-acao="carta-virar" data-tid="' + tid + '" data-m="' + k + '">' + A.icone('refresh', 14) + 'Voltar</button>' + (opts.botao || '') + '</div></div>';
    }
    return '<div class="' + cls + '" data-carta="' + k + '" draggable="' + (opts.arrastavel ? 'true' : 'false') + '"><div class="carta-in">' + frente + verso + '</div>' +
      (opts.naMesa ? '<span class="fita">na mesa</span>' : '') + (opts.selecionada && modo === 'm2' ? '<span class="fita ok">escolhido</span>' : '') + '</div>';
  }

  function blocoG2(sel, virar, editavel, ctx) {
    var custo = sel.reduce(function (s, k) { return s + G.MODELS[k].custo * 0.2; }, 0);
    var h = '<div class="mesa-bloco" data-bloco="G2"><div class="mesa"><div class="mesa-cab"><b>' + A.icone('medico', 18) + 'Mesa do corpo clínico</b><span>' + sel.length + '/3 modelos · pilotos: <b>' + G.fmtc(ctx, custo) + '</b></span></div><div class="slots">';
    for (var i = 0; i < 3; i++) {
      var k = sel[i];
      if (k) {
        var m = G.MODELS[k];
        h += '<div class="slot cheio" data-slot="' + i + '"><div class="mini-carta carta-' + k + '">' + glifo(k) + '<div><b>' + esc(m.nome) + '</b><small>' + esc(m.tecnica) + '</small></div></div>' +
          (editavel ? '<button class="btn-x" data-acao="carta-mesa" data-tid="G2" data-m="' + k + '" title="Tirar da mesa">' + A.icone('x', 14) + '</button>' : '') + '</div>';
      } else h += '<div class="slot vazio" data-slot="' + i + '">' + (editavel ? 'Arraste um modelo para cá<br><small>ou use “Levar à mesa”</small>' : '—') + '</div>';
    }
    h += '</div></div><div class="vitrine-cab"><b>' + A.icone('maleta', 18) + 'Vitrine dos fornecedores</b><span>Vire as cartas para ler as letras miúdas.</span></div><div class="cartas">';
    G.MODEL_ORDER.forEach(function (k) {
      var na = sel.indexOf(k) >= 0;
      var bt = editavel ? '<button class="btn mini ' + (na ? '' : 'verde') + '" data-acao="carta-mesa" data-tid="G2" data-m="' + k + '">' + (na ? 'Tirar da mesa' : 'Levar à mesa') + '</button>' : '';
      h += carta(k, 'g2', 'G2', { virada: virar['G2:' + k], naMesa: na, botao: bt, arrastavel: editavel && !na, ctx: ctx });
    });
    return h + '</div></div>';
  }

  function blocoM2(ids, escolhido, virar, editavel, ctx) {
    var h = '<div class="mesa-bloco" data-bloco="M2"><div class="vitrine-cab"><b>' + A.icone('medico', 18) + 'Na mesa do corpo clínico</b><span>Vire cada carta para ver como o modelo se comporta no plantão.</span></div><div class="cartas cartas-3">';
    ids.forEach(function (k) {
      var bt = editavel ? '<button class="btn mini ' + (escolhido === k ? '' : 'verde') + '" data-acao="carta-escolher" data-tid="M2" data-m="' + k + '">' + (escolhido === k ? A.icone('check', 14) + 'Escolhido' : 'Escolher este') + '</button>' : '';
      h += carta(k, 'm2', 'M2', { virada: virar['M2:' + k], selecionada: escolhido === k, botao: bt, ctx: ctx });
    });
    return h + '</div></div>';
  }

  /* ---- cartas genéricas (especialidade, ferramenta de painel) ---- */
  function estrelas(n) {
    var h = '<span class="estrelas" title="' + n + ' de 5">';
    for (var i = 0; i < 5; i++) h += '<i class="' + (i < n ? 'on' : '') + '">★</i>';
    return h + '</span>';
  }
  function blocoCartas(t, opcoes, sel, virar, editavel, ctx) {
    var h = '<div class="mesa-bloco" data-bloco="' + t.id + '"><div class="cartas cartas-gen">';
    opcoes.forEach(function (o) {
      var c = o.carta || {}, k = t.id + ':' + o.id, escolhida = sel === String(o.id);
      var cor = c.cor || '#5779AA';
      var attrs = (c.atributos || []).map(function (a) {
        return '<dt>' + esc(a[0]) + '</dt><dd>' + (typeof a[1] === 'number' ? esc(G.fmtc(ctx, a[1])) : esc(a[1])) + '</dd>';
      }).join('');
      var temVerso = c.caso || (c.depoimentos && c.depoimentos.length);
      var bt = editavel ? '<button class="btn mini ' + (escolhida ? '' : 'verde') + '" data-acao="carta-escolher" data-tid="' + t.id + '" data-m="' + esc(o.id) + '">' + (escolhida ? A.icone('check', 14) + 'Escolhida' : 'Escolher') + '</button>' : '';
      var virarBt = temVerso ? '<button class="btn mini" data-acao="carta-virar" data-tid="' + t.id + '" data-m="' + esc(o.id) + '">' + A.icone(c.caso ? 'jornal' : 'balao', 14) + (c.caso ? 'Na vida real' : 'O que dizem') + '</button>' : '';
      var frente = '<div class="face frente"><header class="carta-cab" style="--cc:' + cor + '"><span class="carta-ic">' + A.icone(c.icone || 'estrela', 30) + '</span><div><b>' + esc(o.label) + '</b><small>' + esc(c.subt || '') + '</small></div></header>' +
        (c.estrelas ? '<div class="carta-nota">' + estrelas(c.estrelas) + '<small>avaliação de outros hospitais</small></div>' : '') +
        '<dl class="carta-attrs">' + attrs + '</dl>' + (o.custo ? '<div class="carta-preco">' + A.icone('moeda', 16) + '<b>' + G.fmt(o.custo) + '</b><small>no orçamento do programa</small></div>' : '') +
        '<div class="carta-acoes">' + virarBt + bt + '</div></div>';
      var verso = '';
      if (temVerso) {
        verso = '<div class="face verso"><header class="verso-cab">' + A.icone(c.caso ? 'jornal' : 'balao', 18) + '<b>' + (c.caso ? 'Na vida real' : 'O que dizem outros hospitais') + '</b></header>' +
          (c.caso ? '<p class="verso-caso">' + esc(c.caso) + '</p>' : '') +
          (c.depoimentos ? c.depoimentos.map(function (d) { return '<blockquote class="depo">' + esc(d) + '</blockquote>'; }).join('') + '<p class="nota-ficcao">Depoimentos fictícios, criados para o jogo.</p>' : '') +
          '<div class="carta-acoes"><button class="btn mini" data-acao="carta-virar" data-tid="' + t.id + '" data-m="' + esc(o.id) + '">' + A.icone('refresh', 14) + 'Voltar</button>' + bt + '</div></div>';
      }
      h += '<div class="carta gen' + (virar[k] ? ' virada' : '') + (escolhida ? ' selecionada' : '') + '" style="--cc:' + cor + '"><div class="carta-in">' + frente + verso + '</div>' + (escolhida ? '<span class="fita ok">escolhida</span>' : '') + '</div>';
    });
    return h + '</div></div>';
  }

  /* ======================================================================
     PAINEL DA DIRETORIA (T6): mini gráficos
     ====================================================================== */
  var FONTE_G = 'font-family="Nunito, Ubuntu, sans-serif"';
  function miniGrafico(tipo, grande) {
    var W = 160, H = 96, s = '';
    var cls = 'mini-graf' + (grande ? ' grande' : '');
    switch (tipo) {
      case 'linha': {
        var med = [28, 30, 27, 33, 31, 29, 35, 32, 30, 28, 26, 27, 25, 24], p90 = [150, 162, 171, 158, 182, 190, 176, 168, 160, 151, 142, 146, 131, 120];
        var y = function (v) { return (H - 14 - v / 200 * (H - 26)).toFixed(1); }, x = function (i) { return (16 + i * (W - 24) / 13).toFixed(1); };
        s += '<line x1="14" y1="' + (H - 14) + '" x2="' + (W - 6) + '" y2="' + (H - 14) + '" stroke="#C3CCD8"/><line x1="14" y1="8" x2="14" y2="' + (H - 14) + '" stroke="#C3CCD8"/>';
        s += '<polyline fill="none" stroke="#E05A4F" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" points="' + p90.map(function (v, i) { return x(i) + ',' + y(v); }).join(' ') + '"/>';
        s += '<polyline fill="none" stroke="#2C5A8C" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" points="' + med.map(function (v, i) { return x(i) + ',' + y(v); }).join(' ') + '"/>';
        s += '<text ' + FONTE_G + ' x="' + (W - 8) + '" y="22" font-size="8" fill="#E05A4F" text-anchor="end">10% que mais esperam</text><text ' + FONTE_G + ' x="' + (W - 8) + '" y="' + (H - 24) + '" font-size="8" fill="#2C5A8C" text-anchor="end">mediana</text>';
        break;
      }
      case 'numero':
        s += '<text x="' + W / 2 + '" y="56" font-size="34" font-weight="600" fill="#1E2A3B" text-anchor="middle" font-family="Fredoka, Nunito, sans-serif">42 min</text><text ' + FONTE_G + ' x="' + W / 2 + '" y="76" font-size="9" fill="#6B7A90" text-anchor="middle">tempo médio de espera · mês</text>';
        break;
      case 'calor': {
        var cores = ['#FFF3D6', '#FFD98A', '#FDB15C', '#F07D45', '#D9443A'];
        var setores = ['Urgência', 'Clínica', 'Cirurgia', 'UTI', 'Pediatria'];
        for (var r = 0; r < 5; r++) {
          s += '<text ' + FONTE_G + ' x="44" y="' + (17 + r * 15) + '" font-size="7.5" fill="#6B7A90" text-anchor="end">' + setores[r] + '</text>';
          for (var c = 0; c < 8; c++) {
            var v = Math.min(4, Math.max(0, Math.round(1 + Math.sin((c + r) * 0.9) * 1.4 + (c > 4 ? 1.3 : 0) + (r === 0 ? 0.8 : 0))));
            s += '<rect x="' + (48 + c * 13.5) + '" y="' + (8 + r * 15) + '" width="12.5" height="13" rx="2" fill="' + cores[v] + '"/>';
          }
        }
        s += '<text ' + FONTE_G + ' x="102" y="' + (H - 4) + '" font-size="7.5" fill="#6B7A90" text-anchor="middle">0h → 21h</text>';
        break;
      }
      case 'pizza': {
        var cx0 = W / 2, cy0 = 44, rx = 58, ry = 26, ang = 0, cs = ['#D9443A', '#4A90D9', '#F5C842', '#5CB85C', '#8E6CC9', '#F08A24', '#7FD6E0', '#F28DB2', '#8B5A2B', '#9AA3AE', '#2E7D32', '#5B3F96', '#C0392B', '#2C5A8C'];
        var fat = [14, 11, 10, 9, 8, 8, 7, 7, 6, 6, 5, 4, 3, 2];
        s += '<ellipse cx="' + cx0 + '" cy="' + (cy0 + 12) + '" rx="' + rx + '" ry="' + ry + '" fill="#7A818C"/><rect x="' + (cx0 - rx) + '" y="' + cy0 + '" width="' + rx * 2 + '" height="12" fill="#7A818C"/>';
        fat.forEach(function (f, i) {
          var a0 = ang, a1 = ang + f / 100 * Math.PI * 2; ang = a1;
          var x0 = cx0 + rx * Math.cos(a0), y0 = cy0 + ry * Math.sin(a0), x1 = cx0 + rx * Math.cos(a1), y1 = cy0 + ry * Math.sin(a1);
          s += '<path d="M' + cx0 + ',' + cy0 + ' L' + x0.toFixed(1) + ',' + y0.toFixed(1) + ' A' + rx + ',' + ry + ' 0 ' + (a1 - a0 > Math.PI ? 1 : 0) + ',1 ' + x1.toFixed(1) + ',' + y1.toFixed(1) + ' Z" fill="' + cs[i] + '" stroke="#fff" stroke-width=".6"/>';
        });
        s += '<text ' + FONTE_G + ' x="' + W / 2 + '" y="' + (H - 4) + '" font-size="8" fill="#6B7A90" text-anchor="middle">atendimentos por especialidade</text>';
        break;
      }
      case 'barras': {
        var vals = [[98, 'UTI'], [95, 'Bloco'], [91, 'Clínica'], [86, 'Pediatria'], [78, 'Urgência'], [64, 'Enfermaria B']];
        vals.forEach(function (v, i) {
          var w = v[0] / 100 * (W - 62);
          s += '<text ' + FONTE_G + ' x="48" y="' + (16 + i * 13) + '" font-size="7.5" fill="#6B7A90" text-anchor="end">' + v[1] + '</text>' +
            '<rect x="52" y="' + (8 + i * 13) + '" width="' + w.toFixed(1) + '" height="10" rx="3" fill="' + (v[0] >= 90 ? '#2FA866' : v[0] >= 80 ? '#F2B53C' : '#E05A4F') + '"/>';
        });
        var mx = 52 + 0.9 * (W - 62);
        s += '<line x1="' + mx + '" y1="4" x2="' + mx + '" y2="' + (H - 12) + '" stroke="#1E2A3B" stroke-dasharray="3 2"/><text ' + FONTE_G + ' x="' + mx + '" y="' + (H - 3) + '" font-size="7.5" fill="#1E2A3B" text-anchor="middle">meta 90%</text>';
        break;
      }
      case 'tabela':
        for (var tr = 0; tr < 6; tr++) for (var tc = 0; tc < 5; tc++) {
          s += '<rect x="' + (8 + tc * 29) + '" y="' + (6 + tr * 14) + '" width="28" height="13" fill="' + (tr === 0 ? '#E3E8EF' : '#F7F9FB') + '" stroke="#DCE2EB"/>' +
            '<text ' + FONTE_G + ' x="' + (22 + tc * 29) + '" y="' + (15 + tr * 14) + '" font-size="6.5" fill="#8A97AA" text-anchor="middle">' + (tr === 0 ? 'Ind ' + (tc + 1) : ((tr * 17 + tc * 23) % 97 + 0.3).toFixed(1)) + '</text>';
        }
        break;
      case 'semaforo': {
        var itens = [['Luvas', 18], ['Máscaras', 9], ['Soro 0,9%', 4], ['Dipirona', 12], ['Ceftriaxona', 6]];
        itens.forEach(function (x, i) {
          var cor = x[1] >= 10 ? '#2FA866' : x[1] >= 6 ? '#F2B53C' : '#E05A4F';
          s += '<text ' + FONTE_G + ' x="52" y="' + (16 + i * 16) + '" font-size="8" fill="#1E2A3B" text-anchor="end">' + x[0] + '</text><rect x="56" y="' + (8 + i * 16) + '" width="' + (x[1] * 4.4).toFixed(1) + '" height="11" rx="3" fill="' + cor + '"/>' +
            '<text ' + FONTE_G + ' x="' + (60 + x[1] * 4.4) + '" y="' + (17 + i * 16) + '" font-size="8" fill="#1E2A3B">' + x[1] + ' dias</text>';
        });
        break;
      }
      case 'gauge':
        [0, 1, 2].forEach(function (i) {
          var gx = 28 + i * 52, gy = 58, v = [0.72, 0.45, 0.88][i], a = Math.PI * (1 - v);
          s += '<path d="M' + (gx - 22) + ',' + gy + ' A22,22 0 0,1 ' + (gx + 22) + ',' + gy + '" fill="none" stroke="#E3E8EF" stroke-width="8"/>' +
            '<path d="M' + (gx - 22) + ',' + gy + ' A22,22 0 0,1 ' + (gx + 22 * Math.cos(a)).toFixed(1) + ',' + (gy - 22 * Math.sin(a)).toFixed(1) + '" fill="none" stroke="' + ['#2FA866', '#F2B53C', '#E05A4F'][i] + '" stroke-width="8"/>' +
            '<line x1="' + gx + '" y1="' + gy + '" x2="' + (gx + 18 * Math.cos(a)).toFixed(1) + '" y2="' + (gy - 18 * Math.sin(a)).toFixed(1) + '" stroke="#1E2A3B" stroke-width="2" stroke-linecap="round"/>' +
            '<text ' + FONTE_G + ' x="' + gx + '" y="' + (gy + 16) + '" font-size="8" fill="#6B7A90" text-anchor="middle">' + ['Ocupação', 'Giro', 'Espera'][i] + '</text>';
        });
        break;
    }
    return '<svg class="' + cls + '" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">' + s + '</svg>';
  }

  function blocoPainel(opcoes, sel, editavel) {
    var porId = {}; opcoes.forEach(function (o) { porId[o.id] = o; });
    var h = '<div class="mesa-bloco" data-bloco="T6"><div class="painel-tv"><div class="tv-cab">' + A.icone('tela', 18) + '<b>Tela da diretoria</b><span>' + sel.length + '/4 gráficos</span></div><div class="tv-grade">';
    for (var i = 0; i < 4; i++) {
      var o = porId[sel[i]];
      if (o) h += '<div class="tv-slot cheio">' + miniGrafico(o.grafico, true) + '<small>' + esc(curto(o.label, 60)) + '</small>' +
        (editavel ? '<button class="btn-x" data-acao="painel-por" data-m="' + esc(o.id) + '" title="Tirar do painel">' + A.icone('x', 14) + '</button>' : '') + '</div>';
      else h += '<div class="tv-slot vazio">' + (editavel ? 'Escolha um gráfico abaixo' : '—') + '</div>';
    }
    h += '</div></div><div class="vitrine-cab"><b>' + A.icone('grafico', 18) + 'Gráficos disponíveis</b><span>Pense: dá para entender em 5 segundos? Leva a uma ação?</span></div><div class="vis-grade">';
    opcoes.forEach(function (o) {
      var no = sel.indexOf(String(o.id)) >= 0;
      h += '<div class="vis-item' + (no ? ' no-painel' : '') + '">' + miniGrafico(o.grafico) + '<b>' + esc(o.label) + '</b><small>' + esc(o.detalhe || '') + '</small>' +
        (editavel ? '<button class="btn mini ' + (no ? '' : 'verde') + '" data-acao="painel-por" data-m="' + esc(o.id) + '">' + (no ? 'Tirar do painel' : 'Colocar no painel') + '</button>' : (no ? '<span class="pill feito">no painel</span>' : '')) + '</div>';
    });
    return h + '</div></div>';
  }

  /* ======================================================================
     LABORATÓRIO DO LIMIAR
     ====================================================================== */
  var PROTO = [10, 25, 50];
  var NOME_FAIXA = { 10: 'baixo', 25: 'medio', 50: 'alto' };
  function interp(m, t) {
    var xs = [0, 10, 25, 50, 100];
    var ss = [100, m.limiares.baixo[0], m.limiares.medio[0], m.limiares.alto[0], 0];
    var es2 = [0, m.limiares.baixo[1], m.limiares.medio[1], m.limiares.alto[1], 100];
    for (var i = 0; i < xs.length - 1; i++) {
      if (t <= xs[i + 1]) {
        var f = (t - xs[i]) / (xs[i + 1] - xs[i]);
        return { sens: ss[i] + f * (ss[i + 1] - ss[i]), esp: es2[i] + f * (es2[i + 1] - es2[i]) };
      }
    }
    return { sens: 0, esp: 100 };
  }
  function maisProximo(t) { return PROTO.reduce(function (a, b) { return Math.abs(b - t) < Math.abs(a - t) ? b : a; }); }
  var PACIENTES = (function () {
    var s = 7, rnd = function () { s = (s * 16807) % 2147483647; return s / 2147483647; };
    var idx = []; for (var i = 0; i < 300; i++) idx.push(i);
    for (var j = 299; j > 0; j--) { var r = Math.floor(rnd() * (j + 1)); var tmp = idx[j]; idx[j] = idx[r]; idx[r] = tmp; }
    var tipo = new Array(300), rank = new Array(300);
    idx.forEach(function (p, i) { if (i < 24) { tipo[p] = 'g'; rank[p] = i; } else { tipo[p] = 'n'; rank[p] = i - 24; } });
    return { tipo: tipo, rank: rank };
  })();
  function contagens(m, t) {
    var v = interp(m, t);
    var vp = Math.round(v.sens / 100 * 24), fp = Math.round((1 - v.esp / 100) * 276);
    return { sens: v.sens, esp: v.esp, vp: vp, fn: 24 - vp, fp: fp, vn: 276 - fp, alertas: vp + fp, vpp: vp + fp ? vp / (vp + fp) * 100 : 0 };
  }
  function labLimiar(m, t, editavel) {
    var pts = '';
    for (var i = 0; i < 300; i++) {
      var x = 12.5 + (i % 20) * 19.4, y = 12.5 + Math.floor(i / 20) * 19.4;
      pts += '<circle class="pt" data-i="' + i + '" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="7.2"/>';
    }
    var roc = [[0, 0]];
    ['alto', 'medio', 'baixo'].forEach(function (k) { roc.push([1 - m.limiares[k][1] / 100, m.limiares[k][0] / 100]); });
    roc.push([1, 1]);
    var poly = roc.map(function (p) { return (10 + p[0] * 120).toFixed(1) + ',' + (130 - p[1] * 120).toFixed(1); }).join(' ');
    var marcas = PROTO.map(function (v) {
      return '<button class="marca-proto" style="left:' + ((v - 2) / 78 * 100).toFixed(1) + '%" data-acao="lab-snap" data-v="' + v + '"' + (editavel ? '' : ' disabled') + '>' + (v / 100).toFixed(2).replace('.', ',') + '</button>';
    }).join('');
    return '<div class="lab" data-lab-modelo="' + m.id + '">' +
      '<div class="lab-controle"><div class="lab-valor"><span>Alerta toca a partir de</span><b data-lab-t>0,25</b><em data-lab-faixa></em></div>' +
      '<div class="lab-trilho"><input type="range" min="2" max="80" step="1" value="' + t + '" data-lab-range aria-label="Limiar de alerta"' + (editavel ? '' : ' disabled') + '>' +
      '<div class="lab-marcas">' + marcas + '</div></div>' +
      '<p class="lab-dica">' + A.icone('ajuda', 16) + 'Arraste para explorar. Ao soltar, o controle se encaixa no ponto testado mais próximo (0,10 · 0,25 · 0,50) — é ele que vai para o protocolo.</p></div>' +
      '<div class="lab-grade"><div class="lab-espera"><div class="lab-sub">O plantão: 300 pacientes, 24 vão piorar</div><svg viewBox="0 0 392 296" class="waffle">' + pts + '</svg>' +
      '<div class="legenda-pts"><span><i class="pt-vp"></i>grave com alerta</span><span><i class="pt-fn"></i>grave sem alerta</span><span><i class="pt-fp"></i>alarme falso</span><span><i class="pt-vn"></i>sem alerta, não grave</span></div></div>' +
      '<div class="lab-painel"><div class="matriz"><div></div><div class="mh">Alerta</div><div class="mh">Sem alerta</div>' +
      '<div class="mh lado">Vai piorar</div><div class="mc vp"><b data-lab="vp"></b><small>acertos</small></div><div class="mc fn"><b data-lab="fn"></b><small>graves sem alerta</small></div>' +
      '<div class="mh lado">Não vai</div><div class="mc fp"><b data-lab="fp"></b><small>alarmes falsos</small></div><div class="mc vn"><b data-lab="vn"></b><small>sem alerta, ok</small></div></div>' +
      '<div class="lab-metricas">' +
      '<div class="lm"><span>Sensibilidade</span><i><b data-lab-barra="sens"></b></i><em data-lab="sens"></em></div>' +
      '<div class="lm"><span>Especificidade</span><i><b data-lab-barra="esp"></b></i><em data-lab="esp"></em></div>' +
      '<div class="lm"><span>Alertas certos (VPP)</span><i><b data-lab-barra="vpp"></b></i><em data-lab="vpp"></em></div></div>' +
      '<div class="lab-grandes"><div><b data-lab="alertas"></b><span>alertas por plantão</span></div><div class="perigo"><b data-lab="fn2"></b><span>graves sem alerta</span></div>' +
      '<svg viewBox="0 0 140 140" class="roc"><rect x="10" y="10" width="120" height="120" rx="6" fill="#F7F9FC" stroke="#DCE2EB"/><line x1="10" y1="130" x2="130" y2="10" stroke="#C9D3E1" stroke-dasharray="4 4"/>' +
      '<polyline points="' + poly + '" fill="none" stroke="#2C5A8C" stroke-width="2.5" stroke-linejoin="round"/><circle data-lab-roc r="6" fill="#E05A4F" stroke="#fff" stroke-width="2"/>' +
      '<text ' + FONTE_G + ' x="70" y="140" font-size="8" text-anchor="middle" fill="#5A6475">alarmes falsos →</text><text ' + FONTE_G + ' x="4" y="70" font-size="8" text-anchor="middle" fill="#5A6475" transform="rotate(-90 4 70)">graves encontrados →</text></svg></div>' +
      '</div></div></div>';
  }
  function atualizarLab(raiz, m, t) {
    if (!raiz) return;
    var c = contagens(m, t);
    var pts = raiz.querySelectorAll('.pt');
    for (var i = 0; i < pts.length; i++) {
      var tipo = PACIENTES.tipo[i], rk = PACIENTES.rank[i], cls;
      if (tipo === 'g') cls = rk < c.vp ? 'vp' : 'fn'; else cls = rk < c.fp ? 'fp' : 'vn';
      pts[i].setAttribute('class', 'pt ' + cls);
    }
    function set(k, v) { var el = raiz.querySelector('[data-lab="' + k + '"]'); if (el) el.textContent = v; }
    set('vp', c.vp); set('fn', c.fn); set('fp', c.fp); set('vn', c.vn);
    set('sens', Math.round(c.sens) + '%'); set('esp', Math.round(c.esp) + '%'); set('vpp', Math.round(c.vpp) + '%');
    set('alertas', c.alertas); set('fn2', c.fn);
    ['sens', 'esp', 'vpp'].forEach(function (k) { var b = raiz.querySelector('[data-lab-barra="' + k + '"]'); if (b) b.style.width = Math.round(c[k]) + '%'; });
    var tv = raiz.querySelector('[data-lab-t]'); if (tv) tv.textContent = (t / 100).toFixed(2).replace('.', ',');
    var prox = maisProximo(t);
    var fx = raiz.querySelector('[data-lab-faixa]'); if (fx) fx.textContent = 'ponto testado mais próximo: ' + G.LIMIAR_NOME[NOME_FAIXA[prox]];
    var dot = raiz.querySelector('[data-lab-roc]');
    if (dot) { dot.setAttribute('cx', (10 + (1 - c.esp / 100) * 120).toFixed(1)); dot.setAttribute('cy', (130 - c.sens / 100 * 120).toFixed(1)); }
    raiz.querySelectorAll('.marca-proto').forEach(function (b) { b.classList.toggle('ativa', Number(b.dataset.v) === t); });
    var r = raiz.querySelector('[data-lab-range]'); if (r && Number(r.value) !== t) r.value = t;
  }
  function animarRange(raiz, m, de, para, fim) {
    if (reduzido || de === para) { atualizarLab(raiz, m, para); if (fim) fim(); return; }
    var t0 = null, dur = 350;
    function passo(ts) {
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      atualizarLab(raiz, m, Math.round(de + (para - de) * e));
      if (p < 1) requestAnimationFrame(passo); else { atualizarLab(raiz, m, para); if (fim) fim(); }
    }
    requestAnimationFrame(passo);
  }

  /* ======================================================================
     ANIMAÇÕES
     ====================================================================== */
  function animarNumero(el, de, para, fmt) {
    if (reduzido) { el.textContent = fmt(para); return; }
    var t0 = null, dur = 900;
    function passo(ts) {
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(de + (para - de) * e);
      if (p < 1) requestAnimationFrame(passo);
    }
    requestAnimationFrame(passo);
  }
  function flutuar(alvo, texto, positivo) {
    if (reduzido || !alvo) return;
    var r = alvo.getBoundingClientRect();
    var el = document.createElement('div');
    el.className = 'flutua ' + (positivo ? 'pos' : 'neg');
    el.textContent = texto;
    el.style.left = (r.left + r.width / 2) + 'px';
    el.style.top = (r.bottom + 4) + 'px';
    document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1800);
  }
  function nuvens(n) {
    var h = '';
    for (var i = 0; i < (n || 5); i++) h += '<i class="nuvem n' + (i % 3) + '" style="top:' + (6 + (i * 17) % 40) + '%;animation-duration:' + (60 + i * 15) + 's;animation-delay:-' + (i * 13) + 's"></i>';
    return '<div class="nuvens" aria-hidden="true">' + h + '</div>';
  }
  function transicaoDia(de, para, titulo, cb) {
    var dur = reduzido ? 900 : 3000;
    var el = document.createElement('div');
    el.className = 'transicao' + (para ? '' : ' fim-noite');
    var sem = para ? Math.min(5, Math.ceil(para / 7)) : 0;
    var t2 = para ? '<small>' + (de ? 'Amanhece no hospital' : 'Começa o plantão') + (sem <= 4 ? ' · semana ' + sem : ' · fechamento') + '</small><strong>DIA ' + para + '<em> de ' + (G.NDIAS || 30) + '</em></strong><span>' + esc(titulo) + '</span>' :
      '<small>Fim do mês</small><strong>PLANTÃO ENCERRADO</strong><span>' + esc(titulo) + '</span>';
    el.innerHTML = '<div class="tr-ceu"></div>' + nuvens(4) + '<div class="tr-sol"></div><div class="tr-lua"></div><div class="tr-predio">' + predio({ noite: !para }) + '</div>' +
      '<div class="tr-txt">' + t2 + '</div><button class="btn tr-pular">Pular ' + A.icone('seta', 16) + '</button>';
    document.body.appendChild(el);
    var feito = false;
    function fim() { if (feito) return; feito = true; el.classList.add('sai'); setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 400); if (cb) cb(); }
    el.addEventListener('click', fim);
    setTimeout(fim, dur);
  }
  function alarme() {
    if (reduzido) return;
    var el = document.createElement('div');
    el.className = 'alarme-tela';
    el.innerHTML = '<div class="sirene">' + A.icone('alerta', 72) + '<b>CRISE NO HOSPITAL</b></div>';
    document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 3200);
  }
  function confete(alvo) {
    if (reduzido || !alvo) return;
    var cores = ['#5779AA', '#2FA866', '#F2B53C', '#E05A4F', '#8E6CC9', '#3F8F9E', '#F08A24'];
    var box = document.createElement('div'); box.className = 'confete';
    for (var i = 0; i < 70; i++) {
      var p = document.createElement('i');
      p.style.left = (Math.random() * 100) + '%';
      p.style.background = cores[i % cores.length];
      p.style.animationDelay = (Math.random() * 0.6) + 's';
      p.style.animationDuration = (1.8 + Math.random() * 1.4) + 's';
      box.appendChild(p);
    }
    alvo.appendChild(box);
    setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 3800);
  }

  /* ======================================================================
     CASO DO DIA: ficha do paciente + o que o modelo diz
     ====================================================================== */
  function alterado(k, v) {
    var n = parseFloat(String(v).replace(',', '.'));
    if (k === 'PA') { var sis = parseInt(String(v), 10); return !isNaN(sis) && (sis < 100 || sis >= 160); }
    if (isNaN(n)) return false;
    return { FC: n > 100 || n < 50, FR: n > 22 || n < 10, SpO2: n < 94, T: n >= 38 || n < 35.5, Glasgow: n < 15 }[k] || false;
  }
  var ROT_SINAL = { PA: ['PA', 'mmHg'], FC: ['FC', 'bpm'], FR: ['FR', 'irpm'], SpO2: ['SpO₂', '%'], T: ['Temp.', '°C'], Glasgow: ['Glasgow', ''] };
  function avatarPaciente(c) {
    var av = A.aleatorio('pac-' + c.id);
    av.roupa = c.idade < 12 ? 'moletom' : 'camisa';
    av.acessorio = 'nenhum';
    if (c.idade >= 65) av.corCabelo = 'grisalho';
    if (c.sexo === 'M' && c.idade < 14) av.barba = 'nenhuma';
    if (c.sexo === 'F') av.barba = 'nenhuma';
    if (['rosa', 'azul'].indexOf(av.corCabelo) >= 0) av.corCabelo = 'castanho';
    var h = G.hash(c.id), cab = c.sexo === 'F' ? ['longo', 'chanel', 'coque', 'ondulado', 'rabo', 'trancas', 'afro'] : ['curto', 'topete', 'raspado', 'careca', 'cacheado', 'afro'];
    av.cabelo = cab[h % cab.length];
    if (c.sexo === 'M' && c.idade >= 18 && h % 3 === 0) av.barba = ['bigode', 'barba', 'cavanhaque'][h % 3 === 0 ? (h >> 3) % 3 : 0];
    if (c.idade < 12) av.oculos = 'nenhum';
    return A.miniatura(A.normalizar(av), 'busto');
  }
  function blocoCaso(t, L, opts) {
    opts = opts || {};
    var c = L.caso, sv = c.sinais, sit = L.sit, s = L.saida;
    var h = '<div class="caso-mesa">';
    h += '<section class="caso-ficha"><header class="caso-pac"><div class="caso-av">' + avatarPaciente(c) + '</div><div><p class="kicker">Paciente do dia ' + t.day + '</p>' +
      '<h3>' + esc(c.nome) + ', ' + esc(G.idadeTexto(c)) + '</h3><span class="manchester m-' + esc(c.manchester || 'verde') + '">Manchester: ' + esc(c.manchester || '—') + '</span></div></header>' +
      '<p class="caso-queixa">' + A.icone('balao', 16) + '<span>' + esc(c.queixa) + '</span></p><div class="caso-vitais">';
    Object.keys(ROT_SINAL).forEach(function (k) {
      if (sv[k] === undefined) return;
      var v = k === 'T' ? String(sv[k]).replace('.', ',') : sv[k];
      h += '<div class="vital' + (alterado(k, sv[k]) ? ' alt' : '') + '"><small>' + ROT_SINAL[k][0] + '</small><b>' + esc(v) + '</b><em>' + (/\d/.test(String(v)) ? ROT_SINAL[k][1] : '') + '</em></div>';
    });
    h += '</div>' + (c.extra ? '<p class="caso-extra">' + A.icone('prancheta', 16) + '<span>' + esc(c.extra) + '</span></p>' : '') + '</section>';
    if (!s) {
      h += '<section class="caso-modelo sem"><header>' + A.icone('cadeado', 20) + '<b>Sem modelo neste caso</b></header><p>' + esc(sit.motivo) + '</p>' +
        '<p class="suave">Decida pela clínica e pelo protocolo de classificação de risco.</p></section>';
    } else {
      var pos = Math.max(2, Math.min(98, s.escore)), corte = s.corte;
      h += '<section class="caso-modelo ' + (s.alerta ? 'alerta' : 'ok') + '"><header>' + A.icone('monitor', 20) + '<div><b>O que o modelo diz</b><small>' + esc(s.nome) + ' · limiar de ' + corte + '% · treinado com adultos</small></div></header>' +
        (sit.textoModo ? '<p class="caso-modo">' + esc(sit.textoModo) + '</p>' : '') +
        '<div class="escore"><div class="escore-num"><b>' + s.escore + '%</b><small>chance de UTI ou óbito em 48 h</small></div>' +
        '<div class="escore-barra"><i style="width:' + pos + '%"></i><span class="corte" style="left:' + corte + '%"><em>corte ' + corte + '%</em></span></div></div>' +
        '<div class="selo">' + A.icone(s.alerta ? 'sino' : 'check', 20) + (s.alerta ? 'ALERTA: risco alto de piora' : 'Sem alerta') + '</div>';
      var ex = L.expl;
      if (ex) {
        h += '<div class="caso-expl ' + ex.tipo + '"><small>' + esc(ex.titulo) + '</small>' +
          (ex.itens.length ? '<ul>' + ex.itens.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '<p>Só o número — sem dizer o porquê.</p>') + '</div>';
      }
      if (sit.avisos.length) h += '<p class="caso-avisos">' + sit.avisos.map(esc).join(' · ') + '</p>';
      h += '</section>';
    }
    h += '</div>';
    if (opts.revelar && L.outros.length) {
      h += '<div class="caso-bancada"><p><b>Na bancada de testes:</b> o que os outros candidatos teriam indicado para este paciente</p><div class="bancada-lista">' + L.outros.map(function (o) {
        return '<span class="bancada-item ' + (o.acertou ? 'certo' : 'errado') + '">' + esc(o.nome) + ': ' + o.escore + '% · ' + (o.alerta ? 'alerta' : 'sem alerta') + ' ' + A.icone(o.acertou ? 'check' : 'x', 14) + '</span>';
      }).join('') + '</div></div>';
    }
    return h;
  }

  return {
    reduzido: reduzido, corSala: corSala, papelDaSala: papelDaSala, tarefasDaSala: tarefasDaSala, statusSala: statusSala, emCrise: emCrise,
    mapa: mapa, cena: cena, cenaSala: cenaSala, cenaReuniao: cenaReuniao, cenaLobby: cenaLobby, predio: predio, nuvens: nuvens,
    localDosJogadores: localDosJogadores, iniciais: iniciais, online: online, curto: curto, posicoesAvatares: posicoesAvatares, animarCaminhadas: animarCaminhadas,
    carta: carta, blocoG2: blocoG2, blocoM2: blocoM2, blocoCartas: blocoCartas, blocoPainel: blocoPainel, miniGrafico: miniGrafico,
    labLimiar: labLimiar, atualizarLab: atualizarLab, animarRange: animarRange, maisProximo: maisProximo, NOME_FAIXA: NOME_FAIXA, contagens: contagens,
    animarNumero: animarNumero, flutuar: flutuar, transicaoDia: transicaoDia, alarme: alarme, confete: confete, blocoCaso: blocoCaso
  };
})(window.GAME, window.ENGINE, window.UI, window.ARTE);
