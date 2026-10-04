/* ==========================================================================
   PLANTÃO IA — arte vetorial: ícones, avatares personalizáveis, crachá e
   primitivas isométricas suaves (luz, sombra e volume). Tudo é SVG gerado
   em código, desenhado para o jogo: nada de imagens externas.
   ========================================================================== */
window.ARTE = (function () {
  'use strict';

  /* ---------------- cores ---------------- */
  function hex2rgb(h) { var n = parseInt(String(h).replace('#', ''), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function rgb2hex(r) { return '#' + r.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function clarear(h, f) { var c = hex2rgb(h); return rgb2hex(c.map(function (v) { return v + (255 - v) * f; })); }
  function escurecer(h, f) { var c = hex2rgb(h); return rgb2hex(c.map(function (v) { return v * (1 - f); })); }
  function misturar(a, b, f) { var x = hex2rgb(a), y = hex2rgb(b); return rgb2hex(x.map(function (v, i) { return v + (y[i] - v) * f; })); }
  function hash(s) { var h = 2166136261; s = String(s || ''); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function escX(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  /* ======================================================================
     ÍCONES (24 × 24, vetoriais, em duas ou três cores)
     ====================================================================== */
  var NV = '#1A335B', AZ = '#5779AA', TL = '#3F8F9E', TL2 = '#AFC7CE', VM = '#E05A4F', AM = '#F2B53C', AM2 = '#C98A1C', VD = '#2FA866', GR = '#4A4F5C', BR = '#FFFFFF';
  var R = ' stroke-linecap="round" stroke-linejoin="round"';
  var ICONES = {
    moeda: '<circle cx="12" cy="12" r="9.5" fill="' + AM + '"/><circle cx="12" cy="12" r="7" fill="none" stroke="' + AM2 + '" stroke-width="1.3" opacity=".7"/><path d="M14.6 9.3c-.6-.8-1.5-1.2-2.6-1.2-1.4 0-2.5.8-2.5 1.9 0 2.7 5.3 1.4 5.3 4.1 0 1.2-1.1 2-2.7 2-1.1 0-2.1-.5-2.7-1.3M12 6.6v10.8" fill="none" stroke="#8A5A0C" stroke-width="1.7"' + R + '/><ellipse cx="8.4" cy="7.6" rx="2.2" ry="1.3" fill="#fff" opacity=".45" transform="rotate(-30 8.4 7.6)"/>',
    coracao: '<path d="M12 20.6C4.3 15.6 2.6 11 4.4 7.6c1.8-3.3 6.1-3.2 7.6-.1 1.5-3.1 5.8-3.2 7.6.1 1.8 3.4.1 8-7.6 13z" fill="' + VM + '"/><ellipse cx="7.8" cy="8.6" rx="2" ry="1.3" fill="#fff" opacity=".45" transform="rotate(-35 7.8 8.6)"/>',
    raio: '<path d="M13.6 2.4L5.2 13.6h5.6l-1.4 8 8.4-11.3h-5.6l1.4-7.9z" fill="' + AM + '" stroke="' + AM2 + '" stroke-width="1"' + R + '/>',
    sorriso: '<circle cx="12" cy="12" r="9.5" fill="' + AM + '"/><circle cx="9" cy="10" r="1.3" fill="#5C3A0C"/><circle cx="15" cy="10" r="1.3" fill="#5C3A0C"/><path d="M8 13.6c1 2 2.4 3 4 3s3-1 4-3" fill="none" stroke="#5C3A0C" stroke-width="1.7"' + R + '/><ellipse cx="7.6" cy="7.2" rx="2.2" ry="1.2" fill="#fff" opacity=".4" transform="rotate(-30 7.6 7.2)"/>',
    escudo: '<path d="M12 2.6l7.6 2.9v5.8c0 4.7-3.2 8.4-7.6 10.1-4.4-1.7-7.6-5.4-7.6-10.1V5.5z" fill="' + AZ + '"/><path d="M12 2.6v18.8c4.4-1.7 7.6-5.4 7.6-10.1V5.5z" fill="' + NV + '" opacity=".35"/><path d="M8.6 11.8l2.3 2.3 4.6-4.6" fill="none" stroke="#fff" stroke-width="2"' + R + '/>',
    banco: '<path d="M4.5 6.2c0-1.7 3.4-3 7.5-3s7.5 1.3 7.5 3v11.6c0 1.7-3.4 3-7.5 3s-7.5-1.3-7.5-3z" fill="' + TL + '"/><ellipse cx="12" cy="6.2" rx="7.5" ry="3" fill="#7FC3CE"/><path d="M4.5 10.2c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3M4.5 14.2c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3" fill="none" stroke="#fff" stroke-width="1.2" opacity=".7"/>',
    hotel: '<rect x="3.5" y="8.5" width="17" height="12.5" rx="2.2" fill="' + AZ + '"/><rect x="3.5" y="8.5" width="17" height="3" rx="1.5" fill="' + NV + '" opacity=".25"/><rect x="10" y="15" width="4" height="6" rx="1" fill="' + NV + '"/><rect x="5.8" y="12.6" width="2.6" height="2.4" rx=".6" fill="#DDEFF8"/><rect x="15.6" y="12.6" width="2.6" height="2.4" rx=".6" fill="#DDEFF8"/><rect x="5.8" y="16.4" width="2.6" height="2.4" rx=".6" fill="#DDEFF8"/><rect x="15.6" y="16.4" width="2.6" height="2.4" rx=".6" fill="#DDEFF8"/><circle cx="12" cy="7" r="4.4" fill="#fff" stroke="' + TL2 + '" stroke-width="1"/><path d="M12 4.7v4.6M9.7 7h4.6" stroke="' + VM + '" stroke-width="2"' + R + '/>',
    prancheta: '<rect x="4.6" y="4" width="14.8" height="17.6" rx="2.4" fill="#C98F5B"/><rect x="6.8" y="6.6" width="10.4" height="13" rx="1.2" fill="#fff"/><rect x="8.8" y="2.6" width="6.4" height="3.8" rx="1.3" fill="' + GR + '"/><path d="M9 10.4h6M9 13.2h6M9 16h3.4" stroke="' + TL2 + '" stroke-width="1.4"' + R + '/><path d="M13.6 16.6l1.2 1.2 2.3-2.6" fill="none" stroke="' + VD + '" stroke-width="1.6"' + R + '/>',
    balao: '<path d="M4 6.6C4 5.2 5.2 4 6.6 4h10.8C18.8 4 20 5.2 20 6.6v7.2c0 1.4-1.2 2.6-2.6 2.6H10.6l-4.2 3.8v-3.8h-.1C5.1 16.4 4 15.2 4 13.8z" fill="' + AZ + '"/><path d="M4 6.6C4 5.2 5.2 4 6.6 4h10.8C18.8 4 20 5.2 20 6.6v1.6H4z" fill="#fff" opacity=".18"/><circle cx="8.6" cy="10.4" r="1.3" fill="#fff"/><circle cx="12" cy="10.4" r="1.3" fill="#fff"/><circle cx="15.4" cy="10.4" r="1.3" fill="#fff"/>',
    equipe: '<circle cx="15.6" cy="7.4" r="3" fill="' + TL2 + '"/><path d="M10.6 18.6c0-3.4 2.2-5.9 5-5.9s5 2.5 5 5.9z" fill="' + TL2 + '"/><circle cx="9" cy="8.4" r="3.4" fill="' + AZ + '"/><path d="M3 20c0-3.8 2.7-6.6 6-6.6s6 2.8 6 6.6z" fill="' + AZ + '"/>',
    grafico: '<path d="M3.5 20.5h17" stroke="' + GR + '" stroke-width="1.6"' + R + '/><rect x="5" y="12" width="3.6" height="7.4" rx="1.2" fill="' + AZ + '"/><rect x="10.2" y="7.6" width="3.6" height="11.8" rx="1.2" fill="' + TL + '"/><rect x="15.4" y="4" width="3.6" height="15.4" rx="1.2" fill="' + VD + '"/>',
    livro: '<rect x="4.8" y="3.4" width="14.6" height="17.4" rx="2.2" fill="' + TL + '"/><rect x="6.6" y="16.4" width="12.8" height="3.4" rx="1" fill="#fff"/><rect x="4.8" y="3.4" width="3" height="17.4" rx="1.4" fill="' + NV + '" opacity=".35"/><path d="M15.4 3.4v6l1.6-1.2 1.6 1.2v-6" fill="' + VM + '"/><path d="M10 8.4h3.4" stroke="#fff" stroke-width="1.4"' + R + ' opacity=".8"/>',
    jornal: '<rect x="3.4" y="4.6" width="17.2" height="15" rx="2.2" fill="#fff" stroke="' + GR + '" stroke-width="1.3"/><rect x="5.6" y="6.8" width="12.8" height="2.6" rx=".8" fill="' + NV + '"/><rect x="5.6" y="11" width="5.4" height="5.6" rx=".8" fill="' + TL2 + '"/><path d="M12.8 11.6h5.4M12.8 14h5.4M12.8 16.4h3.6" stroke="' + GR + '" stroke-width="1.2"' + R + ' opacity=".7"/>',
    trofeu: '<path d="M7 3.6h10v5.6c0 3.2-2.2 5.6-5 5.6s-5-2.4-5-5.6z" fill="' + AM + '"/><path d="M7 5.2H4.6c0 3 1.4 4.8 3.2 5.2M17 5.2h2.4c0 3-1.4 4.8-3.2 5.2" fill="none" stroke="' + AM2 + '" stroke-width="1.6"' + R + '/><rect x="10.6" y="14.4" width="2.8" height="3" fill="' + AM2 + '"/><rect x="7.4" y="17.2" width="9.2" height="3.6" rx="1.2" fill="' + NV + '"/><ellipse cx="9.6" cy="6.6" rx="1.2" ry="2" fill="#fff" opacity=".45"/>',
    ajuda: '<circle cx="12" cy="12" r="9.5" fill="' + AZ + '"/><path d="M9.4 9.4c0-1.6 1.2-2.7 2.7-2.7s2.7 1 2.7 2.4c0 2.2-2.7 2.2-2.7 4.5" fill="none" stroke="#fff" stroke-width="2.1"' + R + '/><circle cx="12.1" cy="17" r="1.3" fill="#fff"/>',
    sair: '<rect x="4" y="3.5" width="10" height="17" rx="1.8" fill="#C98F5B"/><rect x="4" y="3.5" width="10" height="17" rx="1.8" fill="' + NV + '" opacity=".12"/><circle cx="11.6" cy="12.4" r=".9" fill="' + AM + '"/><path d="M14.5 12h6.2M18 9l2.9 3-2.9 3" fill="none" stroke="' + VD + '" stroke-width="2.2"' + R + '/>',
    pilula: '<g transform="rotate(-45 12 12)"><rect x="3.6" y="8.4" width="16.8" height="7.2" rx="3.6" fill="#fff" stroke="#D6DDE6" stroke-width=".8"/><path d="M7.2 8.4H12v7.2H7.2a3.6 3.6 0 010-7.2z" fill="' + VM + '"/><rect x="5.6" y="9.6" width="5" height="1.4" rx=".7" fill="#fff" opacity=".5"/></g>',
    maleta: '<path d="M9 7.4V5.6c0-.8.6-1.4 1.4-1.4h3.2c.8 0 1.4.6 1.4 1.4v1.8" fill="none" stroke="#6B4429" stroke-width="1.7"/><rect x="3.4" y="7.4" width="17.2" height="12.6" rx="2.4" fill="#8A5A3B"/><rect x="3.4" y="7.4" width="17.2" height="5.2" rx="2.4" fill="#A26C47"/><rect x="10.4" y="11.2" width="3.2" height="2.8" rx=".8" fill="' + AM + '"/>',
    medico: '<path d="M6.6 3.4v5.2a5.4 5.4 0 0010.8 0V3.4" fill="none" stroke="' + GR + '" stroke-width="1.9"' + R + '/><path d="M12 14v2.6a3.8 3.8 0 007.6 0v-1.4" fill="none" stroke="' + GR + '" stroke-width="1.9"' + R + '/><circle cx="19.6" cy="13" r="2.5" fill="' + TL2 + '" stroke="' + GR + '" stroke-width="1.4"/><circle cx="6.6" cy="3.2" r="1.2" fill="' + VM + '"/><circle cx="17.4" cy="3.2" r="1.2" fill="' + VM + '"/>',
    servidor: '<rect x="4" y="3.2" width="16" height="7.6" rx="2" fill="' + GR + '"/><rect x="4" y="13.2" width="16" height="7.6" rx="2" fill="' + GR + '"/><circle cx="7.4" cy="7" r="1.2" fill="#3DDC97"/><circle cx="7.4" cy="17" r="1.2" fill="#4FA3D9"/><path d="M11 7h6M11 17h6" stroke="#8A93A3" stroke-width="1.4"' + R + '/>',
    bisturi: '<path d="M19.6 3.6c.8.8.6 2.4-.6 3.6l-6.4 6.4-2.2-2.2 6.4-6.4c1.2-1.2 2.4-1.8 2.8-1.4z" fill="#D7DEE7" stroke="#8A93A3" stroke-width=".9"/><path d="M11.4 12.4l-7 7c-.6.6-.4 1.4.4 1.2l.8-.2 8-5.8z" fill="' + TL + '"/>',
    caixa: '<path d="M3.6 8.4L12 4.4l8.4 4v9.6L12 22l-8.4-4z" fill="#D9A066"/><path d="M12 12.4v9.6l8.4-4V8.4z" fill="#B97E45"/><path d="M3.6 8.4L12 12.4l8.4-4L12 4.4z" fill="#E8B880"/><path d="M7.6 6.4l8.4 4v3.2" fill="none" stroke="#F4D7A8" stroke-width="1.6"/>',
    alerta: '<path d="M10.4 4.2c.7-1.3 2.5-1.3 3.2 0l7.2 13.2c.7 1.2-.2 2.8-1.6 2.8H4.8c-1.4 0-2.3-1.6-1.6-2.8z" fill="' + AM + '" stroke="' + AM2 + '" stroke-width="1"/><path d="M12 9v4.6" stroke="' + NV + '" stroke-width="2.2"' + R + '/><circle cx="12" cy="16.8" r="1.3" fill="' + NV + '"/>',
    estrela: '<path d="M12 2.8l2.8 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17l-5.7 3.1 1.2-6.3-4.6-4.4 6.3-.8z" fill="' + AM + '" stroke="' + AM2 + '" stroke-width="1"' + R + '/><path d="M12 5.4l-1.6 3.4" stroke="#fff" stroke-width="1.2"' + R + ' opacity=".55"/>',
    relogio: '<circle cx="12" cy="12" r="9.2" fill="#fff" stroke="' + AZ + '" stroke-width="2"/><path d="M12 7v5.2l3.4 2" fill="none" stroke="' + NV + '" stroke-width="2"' + R + '/><circle cx="12" cy="12" r="1.1" fill="' + NV + '"/>',
    cadeado: '<path d="M8 10.6V8a4 4 0 018 0v2.6" fill="none" stroke="#8A93A3" stroke-width="2.2"/><rect x="5" y="10.4" width="14" height="10.4" rx="2.4" fill="' + AM + '"/><rect x="5" y="10.4" width="14" height="3.2" rx="1.6" fill="#fff" opacity=".25"/><circle cx="12" cy="15" r="1.5" fill="' + NV + '"/><path d="M12 15.6v2" stroke="' + NV + '" stroke-width="1.6"' + R + '/>',
    check: '<circle cx="12" cy="12" r="9.5" fill="currentColor" opacity=".16"/><path d="M7.4 12.4l3.1 3.1 6.2-6.4" fill="none" stroke="currentColor" stroke-width="2.4"' + R + '/>',
    olho: '<path d="M2.6 12C5 7.6 8.2 5.6 12 5.6s7 2 9.4 6.4C19 16.4 15.8 18.4 12 18.4S5 16.4 2.6 12z" fill="#fff" stroke="' + NV + '" stroke-width="1.5"/><circle cx="12" cy="12" r="3.8" fill="' + AZ + '"/><circle cx="12" cy="12" r="1.8" fill="' + NV + '"/><circle cx="13.2" cy="10.8" r=".9" fill="#fff"/>',
    fita: '<path d="M9.6 13.4L5 21M14.4 13.4L19 21" stroke="#E37BA6" stroke-width="3"' + R + '/><path d="M12 13.6c-2.4-2.8-3.6-5-3.6-6.8 0-2 1.6-3.4 3.6-3.4s3.6 1.4 3.6 3.4c0 1.8-1.2 4-3.6 6.8z" fill="none" stroke="#E37BA6" stroke-width="3"' + R + '/>',
    lupa: '<circle cx="10" cy="10" r="6.2" fill="#DDEFF3" stroke="' + AZ + '" stroke-width="2.2"/><path d="M14.6 14.6l5.6 5.6" stroke="' + NV + '" stroke-width="3.2"' + R + '/><path d="M7.4 8.4a3 3 0 012.4-2" fill="none" stroke="#fff" stroke-width="1.4"' + R + '/>',
    tela: '<rect x="2.6" y="4" width="18.8" height="13" rx="2.2" fill="' + NV + '"/><rect x="4.2" y="5.6" width="15.6" height="9.8" rx="1.2" fill="#24467A"/><path d="M5.8 13l3-3 2.4 2 3.2-4 3.6 3.4" fill="none" stroke="#3DDC97" stroke-width="1.6"' + R + '/><path d="M9 20.4h6M12 17v3.4" stroke="' + GR + '" stroke-width="1.8"' + R + '/>',
    chave: '<circle cx="8" cy="12" r="4.4" fill="none" stroke="' + AM + '" stroke-width="2.6"/><path d="M12.2 12h8.4M17.6 12v3M20.4 12v2.2" stroke="' + AM + '" stroke-width="2.6"' + R + '/>',
    tabela: '<rect x="3.4" y="4.4" width="17.2" height="15.2" rx="2" fill="#fff" stroke="' + GR + '" stroke-width="1.2"/><rect x="3.4" y="4.4" width="17.2" height="3.8" rx="2" fill="' + TL + '"/><path d="M3.4 12h17.2M3.4 15.8h17.2M9.2 8.2v11.4M14.8 8.2v11.4" stroke="#C5CDD8" stroke-width="1"/>',
    refresh: '<path d="M19.2 11.2A7.2 7.2 0 006.4 7.4M4.8 12.8a7.2 7.2 0 0012.8 3.8" fill="none" stroke="currentColor" stroke-width="2.1"' + R + '/><path d="M6.4 3.6v3.8h3.8M17.6 20.4v-3.8h-3.8" fill="none" stroke="currentColor" stroke-width="2.1"' + R + '/>',
    microscopio: '<rect x="4.6" y="18.6" width="14.8" height="2.6" rx="1.3" fill="' + GR + '"/><path d="M15.8 18.6a6 6 0 00-3.4-9.2" fill="none" stroke="' + GR + '" stroke-width="2"' + R + '/><rect x="7.8" y="2.8" width="4" height="10" rx="1.4" fill="' + TL + '" transform="rotate(-25 9.8 7.8)"/><rect x="7" y="14.4" width="7.6" height="2" rx="1" fill="' + TL2 + '"/>',
    balanca: '<path d="M12 3.4v16.4M6 6.4h12M8.2 20.2h7.6" stroke="' + GR + '" stroke-width="1.8"' + R + '/><path d="M6 6.4L3.4 12h5.2zM18 6.4L15.4 12h5.2z" fill="none" stroke="' + GR + '" stroke-width="1.2"' + R + '/><path d="M3.2 12a2.8 2.8 0 005.6 0zM15.2 12a2.8 2.8 0 005.6 0z" fill="' + AM + '"/>',
    monitor: '<rect x="2.8" y="3.6" width="18.4" height="13.4" rx="2.2" fill="' + GR + '"/><rect x="4.4" y="5.2" width="15.2" height="10.2" rx="1.2" fill="#1C2430"/><path d="M5.4 11h3l1.4-3.2 2.2 6 1.6-3.8h4.8" fill="none" stroke="#3DDC97" stroke-width="1.6"' + R + '/><path d="M9 20.4h6M12 17v3.4" stroke="' + GR + '" stroke-width="1.8"' + R + '/>',
    sino: '<path d="M12 3.4a6 6 0 00-6 6v4.2L4.4 17h15.2L18 13.6V9.4a6 6 0 00-6-6z" fill="' + AM + '"/><path d="M12 3.4a6 6 0 00-6 6v1.4" fill="none" stroke="#fff" stroke-width="1.4" opacity=".5"/><path d="M10 19a2 2 0 004 0" fill="' + AM2 + '"/>',
    seta: '<path d="M4.6 12h14M13 6.4l5.6 5.6-5.6 5.6" fill="none" stroke="currentColor" stroke-width="2.4"' + R + '/>',
    copiar: '<rect x="8.2" y="8.2" width="11.6" height="12.4" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M15.4 8V5.6c0-1.2-1-2.2-2.2-2.2H6.4c-1.2 0-2.2 1-2.2 2.2v8c0 1.2 1 2.2 2.2 2.2h1.8" fill="none" stroke="currentColor" stroke-width="1.9"/>',
    x: '<path d="M6.6 6.6l10.8 10.8M17.4 6.6L6.6 17.4" stroke="currentColor" stroke-width="2.4"' + R + '/>',
    impressora: '<rect x="7" y="3.4" width="10" height="5" rx="1" fill="#fff" stroke="' + GR + '" stroke-width="1.2"/><rect x="3.4" y="8" width="17.2" height="8.6" rx="2.2" fill="' + GR + '"/><circle cx="17.4" cy="11" r="1" fill="#3DDC97"/><rect x="7" y="13.4" width="10" height="7.2" rx="1" fill="#fff" stroke="' + GR + '" stroke-width="1.2"/><path d="M9 16.4h6M9 18.4h4" stroke="' + TL2 + '" stroke-width="1.1"' + R + '/>',
    camera: '<rect x="3" y="6.6" width="18" height="13" rx="3.4" fill="currentColor" opacity=".18"/><rect x="3" y="6.6" width="18" height="13" rx="3.4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8.4 6.6l1.2-2.2h4.8l1.2 2.2" fill="none" stroke="currentColor" stroke-width="1.8"' + R + '/><circle cx="12" cy="13.1" r="3.6" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.6" cy="9.4" r=".9" fill="currentColor"/>',
    globo: '<circle cx="12" cy="12" r="9" fill="currentColor" opacity=".18"/><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z" fill="none" stroke="currentColor" stroke-width="1.6"/>',
    bandeira: '<path d="M5 21V3.6" stroke="' + GR + '" stroke-width="2"' + R + '/><path d="M5.6 4h12.6l-2.6 4 2.6 4H5.6z" fill="' + VD + '"/>',
    cracha: '<path d="M8.4 2.6l3.6 5.4 3.6-5.4" fill="none" stroke="' + AZ + '" stroke-width="2"' + R + '/><rect x="5.4" y="7.4" width="13.2" height="14.4" rx="2.2" fill="#fff" stroke="' + NV + '" stroke-width="1.4"/><rect x="5.4" y="7.4" width="13.2" height="3.4" rx="1.7" fill="' + NV + '"/><circle cx="12" cy="13.8" r="2.3" fill="' + TL2 + '"/><path d="M8.6 18.8c.6-1.6 1.9-2.4 3.4-2.4s2.8.8 3.4 2.4" fill="' + TL2 + '"/>',
    cabide: '<path d="M12 7.6V6.8c0-.7.6-1 1.2-1.4.8-.5 1-1.6.3-2.3-.7-.7-1.9-.5-2.3.4" fill="none" stroke="' + GR + '" stroke-width="1.7"' + R + '/><path d="M12 7.6l8.6 6.4c.8.6.4 1.8-.6 1.8H4c-1 0-1.4-1.2-.6-1.8z" fill="none" stroke="' + GR + '" stroke-width="1.8"' + R + '/><rect x="5.4" y="15.8" width="13.2" height="5.4" rx="1.4" fill="' + AZ + '"/>',
    download: '<path d="M12 3.6v11M7.4 10.4l4.6 4.6 4.6-4.6" fill="none" stroke="currentColor" stroke-width="2.2"' + R + '/><path d="M4.4 15.6v2.6c0 1.2 1 2.2 2.2 2.2h10.8c1.2 0 2.2-1 2.2-2.2v-2.6" fill="none" stroke="currentColor" stroke-width="2.2"' + R + '/>',
    dado: '<rect x="3.6" y="3.6" width="16.8" height="16.8" rx="4" fill="#fff" stroke="currentColor" stroke-width="1.8"/><circle cx="8.4" cy="8.4" r="1.5" fill="currentColor"/><circle cx="15.6" cy="15.6" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="15.6" cy="8.4" r="1.5" fill="currentColor"/><circle cx="8.4" cy="15.6" r="1.5" fill="currentColor"/>',
    paleta: '<path d="M12 3.4c-5 0-8.8 3.6-8.8 8.2 0 4.4 3.6 8 8 8 1.4 0 2-.8 2-1.6 0-1.4-1.4-1.6-1.4-2.8 0-.9.8-1.6 1.8-1.6h2.4c2.8 0 4.8-1.8 4.8-4.4 0-3.4-3.8-5.8-8.8-5.8z" fill="#F4E3C8" stroke="' + GR + '" stroke-width="1.2"/><circle cx="7.6" cy="11.4" r="1.6" fill="' + VM + '"/><circle cx="9.6" cy="7.4" r="1.6" fill="' + AM + '"/><circle cx="14" cy="6.6" r="1.6" fill="' + VD + '"/><circle cx="17.4" cy="9.4" r="1.6" fill="' + AZ + '"/>',
    usuario: '<circle cx="12" cy="8" r="4.2" fill="' + AZ + '"/><path d="M4 20.6c0-4.2 3.6-7.4 8-7.4s8 3.2 8 7.4z" fill="' + AZ + '"/>',
    mais: '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4"' + R + '/>',
    menos: '<path d="M5 12h14" stroke="currentColor" stroke-width="2.4"' + R + '/>',
    calendario: '<rect x="3.6" y="5" width="16.8" height="15.6" rx="2.4" fill="#fff" stroke="' + GR + '" stroke-width="1.3"/><path d="M3.6 7.4c0-1.3 1.1-2.4 2.4-2.4h12c1.3 0 2.4 1.1 2.4 2.4v2.4H3.6z" fill="' + VM + '"/><path d="M8 3.4v3.4M16 3.4v3.4" stroke="' + GR + '" stroke-width="1.8"' + R + '/><rect x="6.4" y="12" width="3" height="2.6" rx=".6" fill="' + TL2 + '"/><rect x="10.5" y="12" width="3" height="2.6" rx=".6" fill="' + TL2 + '"/><rect x="14.6" y="12" width="3" height="2.6" rx=".6" fill="' + AZ + '"/><rect x="6.4" y="15.8" width="3" height="2.6" rx=".6" fill="' + TL2 + '"/><rect x="10.5" y="15.8" width="3" height="2.6" rx=".6" fill="' + TL2 + '"/>',
    virus: '<circle cx="12" cy="12" r="5.6" fill="' + VD + '"/><path d="M12 2.8v3.6M12 17.6v3.6M2.8 12h3.6M17.6 12h3.6M5.5 5.5l2.5 2.5M16 16l2.5 2.5M5.5 18.5L8 16M16 8l2.5-2.5" stroke="' + VD + '" stroke-width="1.8"' + R + '/><circle cx="12" cy="2.8" r="1.3" fill="' + VD + '"/><circle cx="12" cy="21.2" r="1.3" fill="' + VD + '"/><circle cx="2.8" cy="12" r="1.3" fill="' + VD + '"/><circle cx="21.2" cy="12" r="1.3" fill="' + VD + '"/><circle cx="10.2" cy="10.6" r="1.3" fill="#fff" opacity=".6"/><circle cx="13.8" cy="13.6" r=".9" fill="#fff" opacity=".5"/>',
    gota: '<path d="M12 2.8c3.6 4.6 6.4 8.2 6.4 11.6a6.4 6.4 0 01-12.8 0c0-3.4 2.8-7 6.4-11.6z" fill="' + AZ + '"/><path d="M9 14.6c0 1.8 1.2 3.2 3 3.4" fill="none" stroke="#fff" stroke-width="1.6"' + R + ' opacity=".7"/>',
    onibus: '<rect x="3.6" y="4" width="16.8" height="14" rx="2.6" fill="' + AM + '"/><rect x="5.4" y="6.2" width="13.2" height="5.4" rx="1" fill="#DDEFF8"/><path d="M12 6.2v5.4" stroke="' + AM + '" stroke-width="1.2"/><rect x="5.4" y="13.4" width="2.8" height="1.8" rx=".6" fill="#fff"/><rect x="15.8" y="13.4" width="2.8" height="1.8" rx=".6" fill="#fff"/><circle cx="7.6" cy="19" r="1.9" fill="' + GR + '"/><circle cx="16.4" cy="19" r="1.9" fill="' + GR + '"/>',
    termometro: '<rect x="9.6" y="2.6" width="4.8" height="13" rx="2.4" fill="#fff" stroke="' + GR + '" stroke-width="1.3"/><circle cx="12" cy="17.6" r="3.8" fill="' + VM + '"/><rect x="11" y="7" width="2" height="9" rx="1" fill="' + VM + '"/><path d="M15.6 5.6h2M15.6 8.4h1.4M15.6 11.2h2" stroke="' + GR + '" stroke-width="1.2"' + R + '/>',
    mosquito: '<ellipse cx="12" cy="13.4" rx="2" ry="5" fill="' + GR + '"/><circle cx="12" cy="7.4" r="2" fill="' + GR + '"/><path d="M12 5.4l-1.4-2.6" stroke="' + GR + '" stroke-width="1.2"' + R + '/><path d="M10.4 11c-3.8-3.4-7-3-7-1.2 0 1.8 3.4 2.8 7 2.4M13.6 11c3.8-3.4 7-3 7-1.2 0 1.8-3.4 2.8-7 2.4" fill="#DDEFF8" stroke="' + AZ + '" stroke-width="1"/><path d="M10.4 15l-3.4 4M13.6 15l3.4 4M10.2 13.4l-4.4 1M13.8 13.4l4.4 1" stroke="' + GR + '" stroke-width="1"' + R + '/><path d="M11 12.4h2M11 14.6h2" stroke="#fff" stroke-width=".9"/>'
  };
  var ALIAS = {
    mapa: 'hotel', hospital: 'hotel', tarefas: 'prancheta', list: 'prancheta', mural: 'balao', message: 'balao',
    users: 'equipe', chart: 'grafico', activity: 'monitor', book: 'livro', report: 'lupa', star: 'estrela',
    alert: 'alerta', server: 'servidor', lock: 'cadeado', microscope: 'microscopio', scale: 'balanca',
    briefcase: 'maleta', box: 'caixa', heart: 'coracao', clock: 'relogio', info: 'ajuda', pill: 'pilula',
    casos: 'jornal', relatorio: 'trofeu', glossario: 'livro', indicadores: 'grafico', logout: 'sair',
    stethoscope: 'medico', arrow: 'seta', copy: 'copiar', printer: 'impressora', grafico2: 'grafico', balao2: 'balao'
  };
  function existe(nome) { return !!ICONES[ALIAS[nome] || nome]; }
  function icone(nome, tam, cls) {
    var k = ALIAS[nome] || nome;
    if (!ICONES[k]) k = 'estrela';
    tam = tam || 20;
    return '<svg class="ic-v ' + (cls || '') + '" width="' + tam + '" height="' + tam + '" viewBox="0 0 24 24" aria-hidden="true">' + ICONES[k] + '</svg>';
  }

  /* ======================================================================
     AVATARES — estilo cartoon suave, personalizáveis
     Coordenadas: 100 × 150, pés em (50, 146).
     ====================================================================== */
  var OPCOES = {
    pele: [
      { id: 'p1', nome: 'Tom 1', cor: '#FCE1CD' }, { id: 'p2', nome: 'Tom 2', cor: '#F4CDAA' }, { id: 'p3', nome: 'Tom 3', cor: '#E9B58C' },
      { id: 'p4', nome: 'Tom 4', cor: '#D49A6C' }, { id: 'p5', nome: 'Tom 5', cor: '#B97D52' }, { id: 'p6', nome: 'Tom 6', cor: '#98603C' },
      { id: 'p7', nome: 'Tom 7', cor: '#774729' }, { id: 'p8', nome: 'Tom 8', cor: '#57331E' }
    ],
    cabelo: [
      { id: 'curto', nome: 'Curto' }, { id: 'topete', nome: 'Topete' }, { id: 'raspado', nome: 'Raspado' }, { id: 'careca', nome: 'Careca' },
      { id: 'cacheado', nome: 'Cacheado' }, { id: 'afro', nome: 'Black power' }, { id: 'chanel', nome: 'Chanel' }, { id: 'longo', nome: 'Longo' },
      { id: 'ondulado', nome: 'Ondulado' }, { id: 'rabo', nome: 'Rabo de cavalo' }, { id: 'coque', nome: 'Coque' }, { id: 'trancas', nome: 'Tranças' }
    ],
    corCabelo: [
      { id: 'preto', nome: 'Preto', cor: '#221C1E' }, { id: 'castanho-escuro', nome: 'Castanho-escuro', cor: '#3E2B22' }, { id: 'castanho', nome: 'Castanho', cor: '#6E4630' },
      { id: 'ruivo', nome: 'Ruivo', cor: '#B4532C' }, { id: 'loiro', nome: 'Loiro', cor: '#DDB15E' }, { id: 'grisalho', nome: 'Grisalho', cor: '#A9AAB0' },
      { id: 'rosa', nome: 'Rosa', cor: '#DF7AA5' }, { id: 'azul', nome: 'Azul', cor: '#4F7FD1' }
    ],
    roupa: [
      { id: 'jaleco', nome: 'Jaleco' }, { id: 'scrub', nome: 'Pijama cirúrgico' }, { id: 'blazer', nome: 'Blazer' },
      { id: 'camisa', nome: 'Camisa' }, { id: 'moletom', nome: 'Moletom' }
    ],
    corRoupa: [
      { id: 'navy', nome: 'Azul-marinho', cor: '#1F3C69' }, { id: 'azul', nome: 'Azul', cor: '#5779AA' }, { id: 'teal', nome: 'Verde-azulado', cor: '#3F8F9E' },
      { id: 'verde', nome: 'Verde', cor: '#3E9B6A' }, { id: 'vinho', nome: 'Vinho', cor: '#8A1F3B' }, { id: 'rosa', nome: 'Rosa', cor: '#D9788F' },
      { id: 'mostarda', nome: 'Mostarda', cor: '#E0A23A' }, { id: 'grafite', nome: 'Grafite', cor: '#4A4F5C' }
    ],
    oculos: [{ id: 'nenhum', nome: 'Sem óculos' }, { id: 'redondo', nome: 'Redondo' }, { id: 'quadrado', nome: 'Retangular' }],
    barba: [{ id: 'nenhuma', nome: 'Sem barba' }, { id: 'bigode', nome: 'Bigode' }, { id: 'cavanhaque', nome: 'Cavanhaque' }, { id: 'barba', nome: 'Barba' }],
    acessorio: [{ id: 'nenhum', nome: 'Nenhum' }, { id: 'estetoscopio', nome: 'Estetoscópio' }, { id: 'brinco', nome: 'Brincos' }, { id: 'touca', nome: 'Touca cirúrgica' }, { id: 'fone', nome: 'Headset' }]
  };
  var CAMPOS = ['pele', 'cabelo', 'corCabelo', 'roupa', 'corRoupa', 'oculos', 'barba', 'acessorio'];
  function op(campo, id) { var l = OPCOES[campo]; for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; }

  var ROUPA_PAPEL = {
    gestao: { roupa: 'blazer', corRoupa: 'navy' }, clinico: { roupa: 'jaleco', corRoupa: 'azul' }, operacoes: { roupa: 'camisa', corRoupa: 'mostarda' },
    cirurgia: { roupa: 'scrub', corRoupa: 'verde', acessorio: 'touca' }, farmacia: { roupa: 'jaleco', corRoupa: 'vinho' }, ti: { roupa: 'moletom', corRoupa: 'teal', acessorio: 'fone' }
  };

  /** Avatar padrão a partir do nome (estável) e da função. */
  function padrao(nome, papel) {
    var h = hash(String(nome || '').toLowerCase().trim());
    var cab = ['curto', 'topete', 'cacheado', 'afro', 'chanel', 'longo', 'ondulado', 'rabo', 'coque', 'trancas', 'raspado'];
    var a = {
      pele: OPCOES.pele[h % 8].id, cabelo: cab[(h >>> 4) % cab.length], corCabelo: OPCOES.corCabelo[(h >>> 9) % 6].id,
      roupa: 'camisa', corRoupa: OPCOES.corRoupa[(h >>> 13) % 8].id, oculos: (h >>> 17) % 5 === 0 ? 'redondo' : 'nenhum',
      barba: (h >>> 20) % 7 === 0 ? 'bigode' : 'nenhuma', acessorio: 'nenhum'
    };
    var rp = ROUPA_PAPEL[papel];
    if (rp) Object.keys(rp).forEach(function (k) { a[k] = rp[k]; });
    return a;
  }
  /** Garante que todos os campos existem e são válidos. */
  function normalizar(a, base) {
    if (typeof a === 'string') { try { a = JSON.parse(a); } catch (e) { a = null; } }
    base = base || padrao('', '');
    var out = {};
    CAMPOS.forEach(function (k) { out[k] = a && op(k, a[k]) ? a[k] : base[k]; });
    return out;
  }
  function aleatorio(seed) {
    var h = hash(String(seed || Math.random())), out = {};
    CAMPOS.forEach(function (k, i) { var l = OPCOES[k]; h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; out[k] = l[(h + i * 7) % l.length].id; });
    if (out.oculos !== 'nenhum' && hash(seed + 'o') % 2) out.oculos = 'nenhum';
    if (out.barba !== 'nenhuma' && hash(seed + 'b') % 2) out.barba = 'nenhuma';
    if (out.acessorio === 'touca' && out.roupa !== 'scrub') out.acessorio = 'nenhum';
    return out;
  }

  /* registro de jogadores: nome/id → avatar salvo */
  var REG = { nome: {}, id: {} };
  function chaveNome(n) { return String(n || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function registrar(jogadores) {
    REG = { nome: {}, id: {} };
    (jogadores || []).forEach(function (j) {
      if (!j || !j.avatar) return;
      var a = normalizar(j.avatar, padrao(j.nome, ''));
      REG.nome[chaveNome(j.nome)] = a; REG.id[j.id_jogador] = a;
    });
  }
  function temAvatar(j) {
    if (!j || !j.avatar) return false;
    if (typeof j.avatar === 'string') { try { return !!JSON.parse(j.avatar); } catch (e) { return false; } }
    return true;
  }
  /** Aparência de um jogador (objeto, id ou nome); sem avatar salvo, usa o padrão da função. */
  function aparencia(quem, papel) {
    var nome = quem, salvo = null;
    if (quem && typeof quem === 'object') { nome = quem.nome; salvo = quem.avatar ? normalizar(quem.avatar, padrao(quem.nome, papel)) : REG.id[quem.id_jogador]; }
    else salvo = REG.nome[chaveNome(quem)] || REG.id[quem] || null;
    return salvo || padrao(nome, papel);
  }

  var NPC = {
    enfermagem: { pele: 'p4', cabelo: 'coque', corCabelo: 'preto', roupa: 'scrub', corRoupa: 'azul', oculos: 'nenhum', barba: 'nenhuma', acessorio: 'nenhum' },
    paciente: { pele: 'p2', cabelo: 'raspado', corCabelo: 'grisalho', roupa: 'scrub', corRoupa: 'teal', oculos: 'redondo', barba: 'nenhuma', acessorio: 'nenhum' },
    tecnico: { pele: 'p6', cabelo: 'curto', corCabelo: 'preto', roupa: 'camisa', corRoupa: 'grafite', oculos: 'nenhum', barba: 'cavanhaque', acessorio: 'nenhum' },
    farmaceutico: { pele: 'p1', cabelo: 'rabo', corCabelo: 'ruivo', roupa: 'jaleco', corRoupa: 'vinho', oculos: 'quadrado', barba: 'nenhuma', acessorio: 'nenhum' },
    instrumentadora: { pele: 'p5', cabelo: 'coque', corCabelo: 'castanho', roupa: 'scrub', corRoupa: 'verde', oculos: 'nenhum', barba: 'nenhuma', acessorio: 'touca' }
  };

  /* ---------------- desenho ---------------- */
  function pth(d, fill, extra) { return '<path d="' + d + '" fill="' + fill + '"' + (extra || '') + '/>'; }
  function stk(c, w) { return ' stroke="' + c + '" stroke-width="' + (w || 1.2) + '" stroke-linejoin="round" stroke-linecap="round"'; }

  var CAB = {
    // [atrás da cabeça, na frente]
    curto: [null, 'M23.5 47C21 26 33 13.5 51 13.5S80 26 76.5 47c-2-6.5-5-11.2-9.5-14-7.6 4.4-21 5.4-33 1.6-4 3.2-7.6 7-10.5 12z'],
    topete: [null, 'M24 46c-3-21 9-35 29-36.4 19-1.2 28 14.6 23.4 36.4-2-7-5.4-12-10.4-15.2-3 3-9 4.4-16.4 3.2C41.6 33 35 31.4 30 29.4 27.2 34.4 25.4 39.6 24 46zM34 23c4-10 18-14 28-8-7-1-14 1-17 6z'],
    raspado: [null, 'M24.6 43C24 25 36 17.6 50 17.6S76 25 75.4 43c-5.4-9-14-13.4-25.4-13.4S30 34 24.6 43z'],
    careca: [null, null],
    cacheado: [null, 'M23 47c-4-6-3-14 2-18-1-7 5-13 11-13 3-5 10-7 15-4 5-3 12-1 15 4 6 0 12 6 11 13 5 4 6 12 2 18-2-5-5-8-8-10-2 2-6 2-8 0-3 2-7 2-10 0-3 2-7 2-10 0-3 2-6 2-8 0-3 2-6 5-8 10z'],
    afro: ['M50 1c21 0 36 14 36 33 0 14-6 23-13 27H27C20 57 14 48 14 34 14 15 29 1 50 1z', 'M24.4 43C22.6 24 34.6 12.6 50 12.6S77.4 24 75.6 43c-5.6-6.4-14-9.4-25.6-9.4S30 36.6 24.4 43z'],
    chanel: ['M21 42C19 21 34 11 50 11s31 10 29 31l2 25c-4 4-9 4-12 1H31c-3 3-8 3-12-1z', 'M24 47c-2-21 10-33 26-33s28 12 26 33c-1-5-3-9-5-12H29c-2 3-4 7-5 12z'],
    longo: ['M21 40C20 20 35 11 50 11s30 9 29 29l3 54c-4 6-10 6-14 3H32c-4 3-10 3-14-3z', 'M24 49c-2-24 12-35 30-35 16 0 26 12 23 35-2-8-6-15-12-19-7 6-18 9-31 9-4 3-8 6-10 10z'],
    ondulado: ['M20 42c-2-20 13-31 30-31s32 11 30 31c4 6 1 12 3 18-1 7 2 13-2 19-6 3-11 1-14-2H32c-3 3-8 5-14 2-4-6-1-12-2-19 2-6-1-12 4-18z', 'M24 48c-2-22 11-34 27-34s28 12 25 34c-3-7-6-12-11-15-4 3-10 2-14 0-4 3-10 3-14 0-5 3-10 8-13 15z'],
    rabo: ['M70 26c10 2 16 12 15 25-1 10-4 20-9 27 1-9-1-17-6-23z', 'M23.5 47C21 26 33 13.5 51 13.5S80 26 76.5 47c-2-6-4.6-10.6-8.6-13.6-8.4 1.2-22.6.8-35.4-1.2-4 3.6-7.2 8.2-9 14.8z'],
    coque: ['M50 1.5a11 11 0 110 22 11 11 0 010-22z', 'M24 46c-2.6-20 9.4-31.6 26-31.6S78.6 26 76 46c-2-6-5-10.6-9-13.6-9.8 1.6-23 1.6-34 0-4 3-7 7.6-9 13.6z'],
    trancas: ['M21 42C20 22 35 12 50 12s30 10 29 30l1 50c-3 5-9 5-12 1l-1-44H33l-1 44c-3 4-9 4-12-1z', 'M24 46c-2-20 10-32 26-32s28 12 26 32c-3-6-8-11-14-13l-12 2-12-2c-6 2-11 7-14 13z']
  };

  function cabeloSVG(a, camada, c, cs) {
    var d = CAB[a.cabelo] || CAB.curto, s = '';
    if (camada === 'tras') {
      if (!d[0]) return '';
      s += pth(d[0], c, stk(cs, 1.2));
      if (a.cabelo === 'trancas') {
        for (var k = 0; k < 6; k++) s += '<path d="M21 ' + (60 + k * 6) + 'q5.5 3 11 0M68 ' + (60 + k * 6) + 'q5.5 3 11 0" fill="none" stroke="' + cs + '" stroke-width="1.2" opacity=".7"/>';
      }
      if (a.cabelo === 'afro') s += '<path d="M24 22c6-9 16-14 26-14" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".14"/>';
      return s;
    }
    if (!d[1]) {
      // careca: brilho na cabeça
      return '<ellipse cx="40" cy="27" rx="7" ry="3.6" fill="#fff" opacity=".22" transform="rotate(-20 40 27)"/>';
    }
    if (a.acessorio === 'touca') return '';
    s += '<g transform="translate(0 2.2)" opacity=".18">' + pth(d[1], '#3A1F12') + '</g>';
    s += pth(d[1], c, stk(cs, 1.2));
    if (a.cabelo === 'cacheado') {
      [[30, 27], [40, 20], [51, 18], [62, 21], [70, 29], [35, 33], [47, 29], [58, 30]].forEach(function (p) {
        s += '<path d="M' + (p[0] - 3) + ' ' + p[1] + 'a3 3 0 016 0" fill="none" stroke="' + cs + '" stroke-width="1.2" opacity=".55"/>';
      });
    } else if (a.cabelo !== 'raspado') {
      s += '<path d="M36 20c5-3 11-4 17-3" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".2"/>';
    }
    return s;
  }

  function roupaSVG(a, pele, ps, cor, papelCor) {
    var s = '', r = a.roupa;
    var corS = escurecer(cor, 0.18), branco = '#F5F7FA', brancoS = '#D9DFE7';
    var calca = r === 'scrub' ? escurecer(cor, 0.08) : (r === 'camisa' ? '#3F5D8C' : '#2F3A4D');
    var calcaS = escurecer(calca, 0.22);
    // pernas e sapatos
    s += '<rect x="36" y="108" width="28" height="12" rx="4" fill="' + calca + '"/>';
    s += '<rect x="36.5" y="112" width="12.5" height="27" rx="5.5" fill="' + calca + '"' + stk(calcaS, 1) + '/>';
    s += '<rect x="51" y="112" width="12.5" height="27" rx="5.5" fill="' + calca + '"' + stk(calcaS, 1) + '/>';
    s += '<rect x="58" y="114" width="3.5" height="22" rx="1.7" fill="' + calcaS + '" opacity=".35"/>';
    var sap = r === 'scrub' ? '#F2F4F7' : (r === 'moletom' ? '#F2F4F7' : '#2B2F38'), sapS = r === 'scrub' || r === 'moletom' ? '#C9D0DA' : '#15181E';
    s += '<path d="M33.6 141.6c0-3.6 2.6-5.6 7-5.6h3.4c2.6 0 4.6 1.6 4.6 4v1.6c0 1-.8 1.8-1.8 1.8H35.4c-1 0-1.8-.8-1.8-1.8z" fill="' + sap + '"' + stk(sapS, 1) + '/>';
    s += '<path d="M66.4 141.6c0-3.6-2.6-5.6-7-5.6h-3.4c-2.6 0-4.6 1.6-4.6 4v1.6c0 1 .8 1.8 1.8 1.8h11.4c1 0 1.8-.8 1.8-1.8z" fill="' + sap + '"' + stk(sapS, 1) + '/>';
    // cor principal do tronco e mangas
    var tronco = r === 'jaleco' ? branco : cor, troncoS = r === 'jaleco' ? brancoS : corS;
    var manga = tronco, mangaS = troncoS;
    // braços (atrás do tronco)
    var curta = r === 'scrub';
    s += '<rect x="20.5" y="80" width="12.5" height="34" rx="6.2" fill="' + (curta ? pele : manga) + '"' + stk(curta ? ps : mangaS, 1) + ' transform="rotate(9 27 82)"/>';
    s += '<rect x="67" y="80" width="12.5" height="34" rx="6.2" fill="' + (curta ? pele : manga) + '"' + stk(curta ? ps : mangaS, 1) + ' transform="rotate(-9 73 82)"/>';
    if (curta) {
      s += '<rect x="20.5" y="80" width="12.5" height="15" rx="6" fill="' + manga + '"' + stk(mangaS, 1) + ' transform="rotate(9 27 82)"/>';
      s += '<rect x="67" y="80" width="12.5" height="15" rx="6" fill="' + manga + '"' + stk(mangaS, 1) + ' transform="rotate(-9 73 82)"/>';
    }
    // mãos
    s += '<circle cx="23" cy="115.5" r="5.6" fill="' + pele + '"' + stk(ps, 1) + '/><circle cx="77" cy="115.5" r="5.6" fill="' + pele + '"' + stk(ps, 1) + '/>';
    // tronco
    var corpo = 'M31 84c0-4.6 3.4-7.6 8-7.6h22c4.6 0 8 3 8 7.6l1.6 30c-6.4 3-13.2 4.2-20.6 4.2s-14.2-1.2-20.6-4.2z';
    if (r === 'jaleco') {
      s += pth(corpo, branco, stk(brancoS, 1));
      s += pth('M41 77h18l-9 17z', cor);                                  // camisa por baixo
      s += pth('M44.5 77.4l5.5 9 5.5-9', 'none', stk(escurecer(cor, .25), 1));
      s += pth('M39 77c1.6 6 5 12.4 9.6 18.6L44 124c-5-.2-9.6-1-13.4-2.6l.6-38C31.2 79.6 35 77.4 39 77z', branco, stk(brancoS, 1));
      s += pth('M61 77c-1.6 6-5 12.4-9.6 18.6L56 124c5-.2 9.6-1 13.4-2.6l-.6-38C68.8 79.6 65 77.4 61 77z', branco, stk(brancoS, 1));
      s += '<rect x="34.5" y="98" width="8.5" height="7" rx="1.6" fill="none"' + stk(brancoS, 1) + '/><rect x="37" y="95" width="1.6" height="5.6" rx=".8" fill="' + cor + '"/>';
      s += '<path d="M31.6 120.6c5.4 2.2 11.4 3.4 18.4 3.4s13-1.2 18.4-3.4" fill="none"' + stk(brancoS, 1) + '/>';
    } else if (r === 'scrub') {
      s += pth(corpo, cor, stk(corS, 1));
      s += pth('M42 76.6h16l-8 12.4z', pele, stk(ps, .8));
      s += pth('M41 76.4l9 14 9-14', 'none', stk(corS, 1.6));
      s += '<rect x="54" y="96" width="9" height="8" rx="1.8" fill="' + corS + '" opacity=".35"/>';
    } else if (r === 'blazer') {
      s += pth(corpo, cor, stk(corS, 1));
      s += pth('M41 76.6h18l-9 22z', '#F6F8FB');
      s += pth('M48.4 79.4h3.2l1.4 4-2.2 12-2.2-12z', '#B23A48');
      s += pth('M40 77c1 7 4 14 9 21l-2 8-6-1c-2-9-4-17-4-26 0-1 1-2 3-2z', escurecer(cor, .1), stk(corS, 1));
      s += pth('M60 77c-1 7-4 14-9 21l2 8 6-1c2-9 4-17 4-26 0-1-1-2-3-2z', escurecer(cor, .1), stk(corS, 1));
      s += '<circle cx="50" cy="104" r="1.3" fill="' + escurecer(cor, .4) + '"/><circle cx="50" cy="110" r="1.3" fill="' + escurecer(cor, .4) + '"/>';
    } else if (r === 'camisa') {
      s += pth(corpo, cor, stk(corS, 1));
      s += pth('M44 76.6h12l-6 6z', pele);
      s += pth('M42.6 76.4l7.4 7-5 4.6-4.6-8.6zM57.4 76.4L50 83.4l5 4.6 4.6-8.6z', clarear(cor, .25), stk(corS, 1));
      s += '<path d="M50 84v32" stroke="' + corS + '" stroke-width="1"/><circle cx="50" cy="92" r="1.1" fill="' + clarear(cor, .5) + '"/><circle cx="50" cy="100" r="1.1" fill="' + clarear(cor, .5) + '"/><circle cx="50" cy="108" r="1.1" fill="' + clarear(cor, .5) + '"/>';
    } else { // moletom
      s += pth('M36 80c1-6 6-9 14-9s13 3 14 9c-4 4-9 5-14 5s-10-1-14-5z', corS);
      s += pth(corpo, cor, stk(corS, 1));
      s += pth('M41 77.4c2 3 5 4.6 9 4.6s7-1.6 9-4.6', 'none', stk(corS, 1.4));
      s += '<path d="M46.6 81.6v9M53.4 81.6v9" stroke="#F2F4F7" stroke-width="1.4" stroke-linecap="round"/><circle cx="46.6" cy="91" r="1.3" fill="#F2F4F7"/><circle cx="53.4" cy="91" r="1.3" fill="#F2F4F7"/>';
      s += pth('M38.6 104h22.8l2 9.4c-4.4 1.6-8.8 2.2-13.4 2.2s-9-.6-13.4-2.2z', corS, ' opacity=".55"');
    }
    // luz e sombra suaves no tronco
    s += pth('M62 80c3 1.6 5.4 4.4 5.6 8l1.4 26c-2 .8-4 1.4-6 1.8z', '#000', ' opacity=".07"');
    return s;
  }

  function rostoParte(a, pele, ps, cc) {
    var s = '', escuroCab = escurecer(cc, 0.15);
    // orelhas
    s += '<circle cx="24.5" cy="51" r="6" fill="' + pele + '"' + stk(ps, 1) + '/><circle cx="75.5" cy="51" r="6" fill="' + pele + '"' + stk(ps, 1) + '/>';
    s += '<circle cx="25" cy="51.4" r="2.6" fill="' + ps + '" opacity=".45"/><circle cx="75" cy="51.4" r="2.6" fill="' + ps + '" opacity=".45"/>';
    // cabeça
    s += '<path d="M50 18c15.6 0 26.6 10.4 26.6 26.4 0 17.6-11.4 30-26.6 30S23.4 62 23.4 44.4C23.4 28.4 34.4 18 50 18z" fill="' + pele + '"' + stk(ps, 1) + '/>';
    s += '<path d="M64 24c7 4.6 11 11.6 11 20.4 0 15-9 26-22.6 28.6C66 69 72.4 58 72.4 45c0-8.6-3-15.6-8.4-21z" fill="' + ps + '" opacity=".28"/>';
    // bochechas
    s += '<ellipse cx="34" cy="58.6" rx="5.2" ry="3" fill="#F08A8A" opacity=".32"/><ellipse cx="66" cy="58.6" rx="5.2" ry="3" fill="#F08A8A" opacity=".32"/>';
    // sobrancelhas
    s += '<path d="M35.6 41.6c2-1.6 5-2 7.4-1M57 40.6c2.4-1 5.4-.6 7.4 1" fill="none" stroke="' + escuroCab + '" stroke-width="2.4" stroke-linecap="round"/>';
    // olhos (piscam no mapa)
    s += '<g class="olhos"><ellipse cx="40" cy="50.2" rx="3.7" ry="4.7" fill="#2A2230"/><ellipse cx="60" cy="50.2" rx="3.7" ry="4.7" fill="#2A2230"/>' +
      '<circle cx="41.4" cy="48.4" r="1.4" fill="#fff"/><circle cx="61.4" cy="48.4" r="1.4" fill="#fff"/></g>';
    // nariz e boca
    s += '<path d="M48.6 55.6c.8.8 2 .8 2.8 0" fill="none" stroke="' + escurecer(pele, .3) + '" stroke-width="1.6" stroke-linecap="round"/>';
    if (a.barba === 'barba') {
      s += pth('M25.4 50c1.4 13 10 23 24.6 23s23.2-10 24.6-23c-2 4-4.6 6.6-7.6 7.6-2.6-2.8-5.6-3.6-9-2.6-2.6.8-5.4.8-8 0-3.4-1-6.4-.2-9 2.6-3-1-5.6-3.6-7.6-7.6z', cc, stk(escurecer(cc, .25), 1));
      s += '<path d="M44.6 61.4c3.6 2.2 7.2 2.2 10.8 0" fill="none" stroke="#7A2E2E" stroke-width="2" stroke-linecap="round"/>';
    } else {
      s += '<path d="M44 60.6c3.6 3.6 8.4 3.6 12 0" fill="none" stroke="#8A3434" stroke-width="2.2" stroke-linecap="round"/>';
      if (a.barba === 'bigode' || a.barba === 'cavanhaque') s += pth('M41.6 59.4c2.4-3 5.6-3.6 8.4-1.6 2.8-2 6-1.4 8.4 1.6-2.6.4-5.6 0-8.4-1.2-2.8 1.2-5.8 1.6-8.4 1.2z', cc, stk(escurecer(cc, .25), .8));
      if (a.barba === 'cavanhaque') s += pth('M45 66.4c1.4 3.6 3 5.2 5 5.2s3.6-1.6 5-5.2c-3.4 1.2-6.6 1.2-10 0z', cc, stk(escurecer(cc, .25), .8));
    }
    // óculos
    if (a.oculos === 'redondo') s += '<g fill="rgba(255,255,255,.18)" stroke="#2B2F38" stroke-width="2"><circle cx="40" cy="50.4" r="7"/><circle cx="60" cy="50.4" r="7"/></g><path d="M47 50c2-1.4 4-1.4 6 0M33 49l-8-2M67 49l8-2" fill="none" stroke="#2B2F38" stroke-width="2" stroke-linecap="round"/>';
    else if (a.oculos === 'quadrado') s += '<g fill="rgba(255,255,255,.18)" stroke="#2B2F38" stroke-width="2"><rect x="31.6" y="44.6" width="16.4" height="11.6" rx="3.4"/><rect x="52" y="44.6" width="16.4" height="11.6" rx="3.4"/></g><path d="M48 49.4c1.4-1 2.6-1 4 0M31.6 48.4l-6.6-1.4M68.4 48.4l6.6-1.4" fill="none" stroke="#2B2F38" stroke-width="2" stroke-linecap="round"/>';
    if (a.acessorio === 'brinco') s += '<circle cx="24" cy="58.6" r="2.2" fill="#F2C14E" stroke="#B8862A" stroke-width=".8"/><circle cx="76" cy="58.6" r="2.2" fill="#F2C14E" stroke="#B8862A" stroke-width=".8"/>';
    return s;
  }

  function toucaSVG() {
    var c = '#3FA889', cs = '#2C7F67';
    return pth('M22.6 46.4C21 25 33.6 12.6 50 12.6S79 25 77.4 46.4c-7.4-4.6-16.6-7-27.4-7s-20 2.4-27.4 7z', c, stk(cs, 1.2)) +
      '<path d="M25 42c7-3.6 15.4-5.4 25-5.4S68 38.4 75 42" fill="none" stroke="' + cs + '" stroke-width="1.6"/>' +
      [[34, 24], [46, 19], [58, 20], [68, 28], [40, 31], [53, 28], [63, 34], [30, 35]].map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="1.3" fill="#fff" opacity=".55"/>'; }).join('');
  }
  function foneSVG() {
    return '<path d="M23 50c0-18 12-28 27-28s27 10 27 28" fill="none" stroke="#2B2F38" stroke-width="3.2" stroke-linecap="round"/>' +
      '<rect x="18" y="44" width="8" height="14" rx="4" fill="#2B2F38"/><rect x="74" y="44" width="8" height="14" rx="4" fill="#2B2F38"/>' +
      '<path d="M22 57c0 6 4 9 12 9" fill="none" stroke="#2B2F38" stroke-width="2" stroke-linecap="round"/><circle cx="35" cy="66" r="2.2" fill="#3DDC97"/>';
  }
  function estetoscopioSVG() {
    return '<path d="M39 78c-2 8-2 16 2 21 3 4 9 4 12 0 3-4 4-11 2-18" fill="none" stroke="#5A6270" stroke-width="2.2" stroke-linecap="round"/>' +
      '<circle cx="55.6" cy="80" r="1.8" fill="#5A6270"/><circle cx="46.6" cy="103" r="3.6" fill="#C9D3DC" stroke="#5A6270" stroke-width="1.6"/>';
  }
  function crachaPeito(cor) {
    return '<path d="M41 77l7 18M59 77l-7 18" stroke="' + cor + '" stroke-width="2.4" stroke-linecap="round"/>' +
      '<rect x="44.4" y="94" width="11.2" height="14" rx="1.8" fill="#fff" stroke="' + escurecer(cor, .2) + '" stroke-width="1"/>' +
      '<rect x="44.4" y="94" width="11.2" height="3.6" rx="1.6" fill="' + cor + '"/><circle cx="50" cy="101.6" r="2.2" fill="' + clarear(cor, .55) + '"/>';
  }

  /**
   * Avatar completo (corpo inteiro), como conteúdo SVG em coordenadas 100 × 150.
   * opts: { sombra: true, cracha: cor do cordão (ou false), anel: cor do anel no chão }
   */
  function corpo(av, opts) {
    opts = opts || {};
    var a = normalizar(av);
    var pele = op('pele', a.pele).cor, ps = escurecer(pele, 0.16);
    var cc = op('corCabelo', a.corCabelo).cor, cs = escurecer(cc, 0.28);
    var cor = op('corRoupa', a.corRoupa).cor;
    var s = '';
    if (opts.sombra !== false) s += '<ellipse cx="50" cy="145" rx="25" ry="5.4" fill="#0F1E33" opacity=".2"/>';
    if (opts.anel) s += '<ellipse cx="50" cy="144" rx="30" ry="8" fill="none" stroke="' + opts.anel + '" stroke-width="3.2" opacity=".9"/>';
    s += cabeloSVG(a, 'tras', cc, cs);
    s += roupaSVG(a, pele, ps, cor);
    if (opts.cracha) s += crachaPeito(opts.cracha);
    if (a.acessorio === 'estetoscopio') s += estetoscopioSVG();
    s += '<rect x="44" y="66" width="12" height="13" rx="4.6" fill="' + pele + '"/><rect x="44" y="66" width="12" height="5.6" rx="2.6" fill="' + ps + '" opacity=".6"/>';
    if (a.roupa === 'moletom') s += pth('M41 77.4c2 3 5 4.6 9 4.6s7-1.6 9-4.6', 'none', stk(escurecer(cor, .18), 1.4));
    s += rostoParte(a, pele, ps, cc);
    s += cabeloSVG(a, 'frente', cc, cs);
    if (a.acessorio === 'touca') s += toucaSVG();
    if (a.acessorio === 'fone') s += foneSVG();
    return s;
  }

  /** Avatar como SVG independente (corpo inteiro). */
  function avatarSVG(av, alt, opts) {
    alt = alt || 150;
    var larg = Math.round(alt * 100 / 150);
    return '<svg class="av-svg" width="' + larg + '" height="' + alt + '" viewBox="0 -2 100 150" aria-hidden="true">' + corpo(av, opts) + '</svg>';
  }
  /** Busto em círculo (chips, listas, mural). */
  function rostoSVG(av, tam, fundo) {
    tam = tam || 28;
    return '<svg class="av-rosto" width="' + tam + '" height="' + tam + '" viewBox="14 8 72 72" aria-hidden="true">' +
      '<rect x="14" y="8" width="72" height="72" fill="' + (fundo || '#E3ECF6') + '"/>' + corpo(av, { sombra: false }) + '</svg>';
  }
  /** Miniatura de uma opção do vestiário (cabeça ou tronco). */
  function miniatura(av, foco) {
    var vb = { corpo: '8 62 84 84', rosto: '16 6 68 68', busto: '4 12 92 92' }[foco] || '6 -4 88 88';
    return '<svg class="av-mini" viewBox="' + vb + '" aria-hidden="true">' + corpo(av, { sombra: false }) + '</svg>';
  }

  /* ======================================================================
     CRACHÁ
     ====================================================================== */
  function codigoBarras(seed, x, y, w, h) {
    var s = '', hh = hash(seed), pos = x;
    while (pos < x + w - 2) {
      hh = Math.imul(hh ^ (hh >>> 13), 1274126177) >>> 0;
      var bw = 1 + (hh % 3), gap = 1 + ((hh >> 3) % 2);
      s += '<rect x="' + pos.toFixed(1) + '" y="' + y + '" width="' + bw + '" height="' + h + '" fill="#1E2A3B"/>';
      pos += bw + gap;
    }
    return s;
  }
  /**
   * Crachá do hospital (SVG 320 × 520).
   * d: { nome, hospital, codigo, id, avatar, papeis: [{nome, curto, cor}], porte, emissao }
   */
  function cracha(d, opts) {
    opts = opts || {};
    var cor = (d.papeis && d.papeis[0] && d.papeis[0].cor) || '#5779AA';
    var cor2 = d.papeis && d.papeis[1] ? d.papeis[1].cor : clarear(cor, .25);
    var W = 320, H = 520, s = '';
    var fonteT = "Fredoka, 'Nunito', Arial, sans-serif", fonteC = "Nunito, 'Ubuntu', Arial, sans-serif";
    var uid = 'cr' + (hash(d.id + d.nome) % 100000);
    s += '<defs><linearGradient id="' + uid + 'f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + clarear(cor, .55) + '"/><stop offset="1" stop-color="' + clarear(cor, .82) + '"/></linearGradient>' +
      '<linearGradient id="' + uid + 'b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + cor + '"/><stop offset="1" stop-color="' + escurecer(cor2, .1) + '"/></linearGradient>' +
      '<clipPath id="' + uid + 'c"><rect x="70" y="118" width="180" height="180" rx="26"/></clipPath></defs>';
    // cartão
    s += '<rect x="6" y="10" width="' + (W - 12) + '" height="' + (H - 16) + '" rx="22" fill="#0F1E33" opacity=".18"/>';
    s += '<rect x="4" y="4" width="' + (W - 8) + '" height="' + (H - 12) + '" rx="22" fill="#fff" stroke="#D5DDE7" stroke-width="2"/>';
    // faixa superior
    s += '<path d="M4 26a22 22 0 0122-22h268a22 22 0 0122 22v70H4z" fill="url(#' + uid + 'b)"/>';
    s += '<rect x="132" y="16" width="56" height="12" rx="6" fill="#fff" opacity=".9"/>';
    s += '<g transform="translate(22 42)"><circle cx="17" cy="17" r="17" fill="#fff"/><path d="M17 8v18M8 17h18" stroke="#E05A4F" stroke-width="6" stroke-linecap="round"/></g>';
    s += '<text x="66" y="56" font-family="' + fonteT + '" font-size="19" font-weight="600" fill="#fff">' + escX(cortar(d.hospital, 24)) + '</text>';
    s += '<text x="66" y="76" font-family="' + fonteC + '" font-size="12" font-weight="700" fill="#fff" opacity=".85" letter-spacing="1.2">EQUIPE DO PROGRAMA DE IA</text>';
    // foto
    s += '<rect x="70" y="118" width="180" height="180" rx="26" fill="url(#' + uid + 'f)"/>';
    s += '<g clip-path="url(#' + uid + 'c)"><circle cx="160" cy="300" r="120" fill="#fff" opacity=".35"/><g transform="translate(80 116) scale(1.6)">' + corpo(d.avatar, { sombra: false, cracha: false }) + '</g></g>';
    s += '<rect x="70" y="118" width="180" height="180" rx="26" fill="none" stroke="' + cor + '" stroke-width="3"/>';
    // nome e funções
    var nome = cortar(d.nome, 22);
    s += '<text x="160" y="336" text-anchor="middle" font-family="' + fonteT + '" font-size="' + (nome.length > 16 ? 25 : 30) + '" font-weight="600" fill="#1E2A3B">' + escX(nome) + '</text>';
    var ps = d.papeis && d.papeis.length ? d.papeis : [{ nome: 'Função a definir', curto: 'A definir', cor: '#8A93A3' }];
    var y = 352;
    ps.slice(0, 2).forEach(function (p) {
      var longo = String(p.nome).length > 36, txt = cortar(p.nome, longo ? 50 : 38), fs = longo ? 10.6 : 12.5;
      var larg = Math.min(288, 24 + txt.length * fs * .58);
      s += '<rect x="' + (160 - larg / 2).toFixed(1) + '" y="' + y + '" width="' + larg.toFixed(1) + '" height="26" rx="13" fill="' + p.cor + '"/>';
      s += '<text x="160" y="' + (y + 17.5) + '" text-anchor="middle" font-family="' + fonteC + '" font-size="' + fs + '" font-weight="800" fill="#fff">' + escX(txt) + '</text>';
      y += 32;
    });
    if (ps.length > 2) { s += '<text x="160" y="' + (y + 12) + '" text-anchor="middle" font-family="' + fonteC + '" font-size="12" font-weight="700" fill="#6B7A90">+ ' + (ps.length - 2) + ' função</text>'; }
    // dados
    var yb = 432;
    s += '<line x1="26" y1="' + (yb - 10) + '" x2="294" y2="' + (yb - 10) + '" stroke="#E3E9F0" stroke-width="2" stroke-dasharray="2 5" stroke-linecap="round"/>';
    s += '<text x="28" y="' + (yb + 8) + '" font-family="' + fonteC + '" font-size="10.5" font-weight="800" fill="#8A97AA" letter-spacing="1">HOSPITAL</text>';
    s += '<text x="28" y="' + (yb + 28) + '" font-family="' + fonteT + '" font-size="19" font-weight="600" fill="#1E2A3B" letter-spacing="2">' + escX(d.codigo || '—') + '</text>';
    s += '<text x="132" y="' + (yb + 8) + '" font-family="' + fonteC + '" font-size="10.5" font-weight="800" fill="#8A97AA" letter-spacing="1">EMITIDO EM</text>';
    s += '<text x="132" y="' + (yb + 28) + '" font-family="' + fonteC + '" font-size="15" font-weight="800" fill="#1E2A3B">' + escX(d.emissao || '') + '</text>';
    s += codigoBarras(d.id + d.nome, 222, yb - 2, 72, 34);
    s += '<text x="258" y="' + (yb + 44) + '" text-anchor="middle" font-family="' + fonteC + '" font-size="8.5" fill="#8A97AA">' + escX(String(d.id || '').slice(-8).toUpperCase()) + '</text>';
    // rodapé colorido
    s += '<path d="M4 486h312v12a14 14 0 01-14 14H18a14 14 0 01-14-14z" fill="url(#' + uid + 'b)"/>';
    s += '<text x="160" y="503" text-anchor="middle" font-family="' + fonteC + '" font-size="10" font-weight="800" fill="#fff" letter-spacing="1.4">PLANTÃO IA · CDIA.SAÚDE</text>';
    return '<svg class="cracha-svg" xmlns="http://www.w3.org/2000/svg" width="' + (opts.largura || W) + '" height="' + Math.round((opts.largura || W) * H / W) + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Crachá de ' + escX(d.nome) + '">' + s + '</svg>';
  }
  function cortar(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  /** Converte um SVG em PNG e dispara o download. */
  function baixarPNG(svgTexto, arquivo, escala) {
    return new Promise(function (ok, falha) {
      try {
        var m = /viewBox="0 0 (\d+) (\d+)"/.exec(svgTexto), w = m ? +m[1] : 320, h = m ? +m[2] : 520;
        escala = escala || 3;
        var svg = svgTexto.replace(/width="\d+" height="\d+"/, 'width="' + w + '" height="' + h + '"');
        var img = new Image();
        img.onload = function () {
          var cv = document.createElement('canvas'); cv.width = w * escala; cv.height = h * escala;
          var cx = cv.getContext('2d'); cx.scale(escala, escala); cx.drawImage(img, 0, 0, w, h);
          cv.toBlob(function (b) {
            if (!b) { falha(new Error('Não foi possível gerar a imagem.')); return; }
            var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = arquivo;
            document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500); ok();
          }, 'image/png');
        };
        img.onerror = function () { falha(new Error('Não foi possível gerar a imagem.')); };
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      } catch (e) { falha(e); }
    });
  }

  /* ======================================================================
     PRIMITIVAS ISOMÉTRICAS SUAVES
     ====================================================================== */
  var TW = 64, TH = 32;
  function P(i, j, z) { return [(i - j) * TW / 2, (i + j) * TH / 2 - (z || 0)]; }
  function pts(lista) { return lista.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '); }
  function poly(lista, fill, extra) { return '<polygon points="' + pts(lista) + '" fill="' + fill + '"' + (extra === undefined ? ' stroke="' + fill + '" stroke-width=".6" stroke-linejoin="round"' : extra) + '/>'; }

  /* gradientes registrados por desenho (ids determinísticos) */
  var DEFS = {};
  function limparDefs() { DEFS = {}; }
  function defsSVG() {
    var out = '<defs>' + Object.keys(DEFS).map(function (k) { return DEFS[k]; }).join('') + '</defs>';
    DEFS = {};
    return out;
  }
  function idCor(c) { return String(c).replace('#', '').toLowerCase(); }
  function gradV(c1, c2) { var id = 'gv' + idCor(c1) + idCor(c2); if (!DEFS[id]) DEFS[id] = '<linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/></linearGradient>'; return 'url(#' + id + ')'; }
  function gradD(c1, c2) { var id = 'gd' + idCor(c1) + idCor(c2); if (!DEFS[id]) DEFS[id] = '<linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/></linearGradient>'; return 'url(#' + id + ')'; }
  function gradH(c1, c2) { var id = 'gh' + idCor(c1) + idCor(c2); if (!DEFS[id]) DEFS[id] = '<linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/></linearGradient>'; return 'url(#' + id + ')'; }
  function gradR(c) { var id = 'gr' + idCor(c); if (!DEFS[id]) DEFS[id] = '<radialGradient id="' + id + '" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="' + clarear(c, .45) + '"/><stop offset=".55" stop-color="' + c + '"/><stop offset="1" stop-color="' + escurecer(c, .2) + '"/></radialGradient>'; return 'url(#' + id + ')'; }
  function gradSombra() { if (!DEFS.gsom) DEFS.gsom = '<radialGradient id="gsom"><stop offset="0" stop-color="#0F1E33" stop-opacity=".34"/><stop offset=".6" stop-color="#0F1E33" stop-opacity=".14"/><stop offset="1" stop-color="#0F1E33" stop-opacity="0"/></radialGradient>'; return 'url(#gsom)'; }
  function gradLuz(c) { var id = 'gl' + idCor(c); if (!DEFS[id]) DEFS[id] = '<radialGradient id="' + id + '"><stop offset="0" stop-color="' + c + '" stop-opacity=".55"/><stop offset="1" stop-color="' + c + '" stop-opacity="0"/></radialGradient>'; return 'url(#' + id + ')'; }

  /** Caixa com faces sombreadas (luz vindo da esquerda/cima). o: {topo, esq, dir, aresta, raio} */
  function caixa(i, j, z, w, d, h, cor, o) {
    o = o || {};
    var topo = o.topo || clarear(cor, 0.16), esq = o.esq || cor, dir = o.dir || escurecer(cor, 0.17);
    var s = '';
    s += poly([P(i, j + d, z), P(i + w, j + d, z), P(i + w, j + d, z + h), P(i, j + d, z + h)], o.gradEsq ? gradV(clarear(esq, .06), escurecer(esq, .06)) : esq, ' stroke="' + esq + '" stroke-width=".6" stroke-linejoin="round"');
    s += poly([P(i + w, j, z), P(i + w, j + d, z), P(i + w, j + d, z + h), P(i + w, j, z + h)], dir);
    s += poly([P(i, j, z + h), P(i + w, j, z + h), P(i + w, j + d, z + h), P(i, j + d, z + h)], topo);
    if (o.aresta !== false && h > 2) {
      var a = P(i, j + d, z + h), b = P(i + w, j + d, z + h), c = P(i + w, j, z + h);
      s += '<polyline points="' + pts([a, b, c]) + '" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="1" stroke-linejoin="round"/>';
    }
    return s;
  }
  /** Sombra suave no chão sob um objeto (footprint w × d). */
  function sombra(i, j, z, w, d, f) {
    f = f || 1;
    var c = P(i + w / 2, j + d / 2, z);
    var rx = (w + d) * TW / 4 * 1.05 * f + 6, ry = (w + d) * TH / 4 * 1.05 * f + 3;
    return '<ellipse cx="' + c[0].toFixed(1) + '" cy="' + (c[1] + 2).toFixed(1) + '" rx="' + rx.toFixed(1) + '" ry="' + ry.toFixed(1) + '" fill="' + gradSombra() + '"/>';
  }
  /** Cilindro vertical (raio em unidades de piso). */
  function cilindro(i, j, z, r, h, cor, o) {
    o = o || {};
    var c = P(i, j, z), rx = r * TW / 1.414, ry = r * TH / 1.414;
    var x0 = (c[0] - rx).toFixed(1), x1 = (c[0] + rx).toFixed(1), y0 = c[1].toFixed(1), y1 = (c[1] - h).toFixed(1);
    var s = '<path d="M' + x0 + ' ' + y0 + 'A' + rx.toFixed(1) + ' ' + ry.toFixed(1) + ' 0 0 0 ' + x1 + ' ' + y0 + 'L' + x1 + ' ' + y1 + 'L' + x0 + ' ' + y1 + 'Z" fill="' + gradH(clarear(cor, .1), escurecer(cor, .22)) + '"/>';
    s += '<ellipse cx="' + c[0].toFixed(1) + '" cy="' + y1 + '" rx="' + rx.toFixed(1) + '" ry="' + ry.toFixed(1) + '" fill="' + (o.topo || clarear(cor, .2)) + '"/>';
    return s;
  }
  /** Esfera (copas, luminárias, bolinhas). r em px. */
  function esfera(i, j, z, r, cor) {
    var c = P(i, j, z);
    return '<circle cx="' + c[0].toFixed(1) + '" cy="' + (c[1] - r).toFixed(1) + '" r="' + r.toFixed(1) + '" fill="' + gradR(cor) + '"/>';
  }
  /** Losango de piso. */
  function piso(i, j, w, d, z, cor, extra) {
    return poly([P(i, j, z), P(i + w, j, z), P(i + w, j + d, z), P(i, j + d, z)], cor, extra);
  }
  /** Retângulo pintado numa parede: "j fixo" (parede da direita) ou "i fixo" (parede da esquerda). */
  function naParedeJ(jFix, i0, i1, z0, z1, cor, extra) { return poly([P(i0, jFix, z0), P(i1, jFix, z0), P(i1, jFix, z1), P(i0, jFix, z1)], cor, extra); }
  function naParedeI(iFix, j0, j1, z0, z1, cor, extra) { return poly([P(iFix, j0, z0), P(iFix, j1, z0), P(iFix, j1, z1), P(iFix, j0, z1)], cor, extra); }
  function elipse(i, j, z, r, cor, extra) {
    var c = P(i, j, z);
    return '<ellipse cx="' + c[0].toFixed(1) + '" cy="' + c[1].toFixed(1) + '" rx="' + (r * TW / 1.414).toFixed(1) + '" ry="' + (r * TH / 1.414).toFixed(1) + '" fill="' + cor + '"' + (extra || '') + '/>';
  }

  return {
    ICONES: ICONES, icone: icone, existe: existe,
    OPCOES: OPCOES, CAMPOS: CAMPOS, op: op, padrao: padrao, normalizar: normalizar, aleatorio: aleatorio, registrar: registrar, temAvatar: temAvatar,
    aparencia: aparencia, NPC: NPC, corpo: corpo, avatarSVG: avatarSVG, rostoSVG: rostoSVG, miniatura: miniatura, cracha: cracha, baixarPNG: baixarPNG,
    hash: hash, clarear: clarear, escurecer: escurecer, misturar: misturar,
    TW: TW, TH: TH, P: P, pts: pts, poly: poly, caixa: caixa, sombra: sombra, cilindro: cilindro, esfera: esfera, piso: piso, naParedeJ: naParedeJ, naParedeI: naParedeI, elipse: elipse,
    gradV: gradV, gradD: gradD, gradH: gradH, gradR: gradR, gradLuz: gradLuz, gradSombra: gradSombra, limparDefs: limparDefs, defsSVG: defsSVG
  };
})();
