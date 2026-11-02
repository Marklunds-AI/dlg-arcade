/* BF-Rush – grafik: ritverktyg, figurer och föremål.
   Allt ritas med kod i en canvas (inga bildfiler utom BF-loggan).
   Laddas före miljoer.js och spel.js. Allt hamnar i window.BFR. */
(function () {
  'use strict';
  const BFR = window.BFR = window.BFR || {};

  const W = 1920, H = 1080, MARK = 880;   // intern upplösning och markens överkant
  const F = {
    natt: '#0f1222', vit: '#ffffff', svart: '#14141c',
    gul: '#FFD23F', korall: '#FF5A5F', turkos: '#19D3C5', lila: '#8B5CF6', rosa: '#FF4F8B', gron: '#3DDC84',
    orange: '#FF8A3D', bla: '#3D8BFF', mork: '#1B2448'
  };
  const PALETT = [F.korall, F.gul, F.turkos, F.bla, F.lila, F.gron, F.orange, F.rosa];

  let c = null;
  const satt = ctx => { c = ctx; };

  /* ---------- matte ---------- */
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const valj = a => a[Math.floor(Math.random() * a.length)];
  const hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const blanda = (a, b) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const hexTill = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  // blandar två hex-färger, t = 0..1
  function mixa(a, b, t) {
    const x = hexTill(a), y = hexTill(b);
    return `rgb(${Math.round(lerp(x[0], y[0], t))},${Math.round(lerp(x[1], y[1], t))},${Math.round(lerp(x[2], y[2], t))})`;
  }
  const skuggCache = {};
  function skugga(hex, k = 0.72) {
    const key = hex + k;
    if (skuggCache[key]) return skuggCache[key];
    const [r, g, b] = hexTill(hex);
    return (skuggCache[key] = `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`);
  }

  /* ---------- text ---------- */
  const RUBRIK = '"Nunito", "Arial Rounded MT Bold", Arial, sans-serif';
  const font = (px, vikt = 900) => `${vikt} ${px}px ${RUBRIK}`;

  // max = största bredd; längre text krymps så att den får plats
  function text(str, x, y, { px = 48, farg = '#fff', kant = null, kantB = 10, align = 'center', base = 'middle', vikt = 900, rot = 0, max = 0 } = {}) {
    c.save(); c.translate(x, y); if (rot) c.rotate(rot * Math.PI / 180);
    c.font = font(px, vikt); c.textAlign = align; c.textBaseline = base;
    if (max) { const b = c.measureText(str).width; if (b > max) c.scale(max / b, max / b); }
    if (kant) { c.lineJoin = 'round'; c.lineWidth = kantB; c.strokeStyle = kant; c.strokeText(str, 0, 0); }
    c.fillStyle = farg; c.fillText(str, 0, 0);
    c.restore();
  }
  // delar en text i rader som får plats i bredd
  function radbryt(str, bredd, px, vikt = 900) {
    c.save(); c.font = font(px, vikt);
    const ord = String(str).split(' '), rader = [];
    let rad = '';
    for (const o of ord) {
      const prov = rad ? rad + ' ' + o : o;
      if (c.measureText(prov).width > bredd && rad) { rader.push(rad); rad = o; } else rad = prov;
    }
    if (rad) rader.push(rad);
    c.restore();
    return rader;
  }
  function textRader(str, x, y, bredd, opt = {}) {
    const px = opt.px || 40, rh = opt.radhojd || px * 1.12;
    let rader = radbryt(str, bredd, px, opt.vikt);
    const maxRader = opt.maxRader || 3;
    if (rader.length > maxRader) rader = [rader.slice(0, maxRader - 1).join(' '), rader.slice(maxRader - 1).join(' ')];
    const y0 = y - (rader.length - 1) * rh / 2;
    rader.forEach((r, i) => text(r, x, y0 + i * rh, Object.assign({}, opt, { max: bredd })));
    return rader.length;
  }

  /* ---------- former ---------- */
  function rundRekt(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  // "Klistermärke" i loggans stil: lutad rundad ruta med tjock vit kant på mörk botten.
  function klistermarke(cx, cy, w, h, { rot = -4, fyll = F.svart, kant = '#ffffff', lw = 8, r = 26, skugga = true } = {}) {
    c.save(); c.translate(cx, cy); c.rotate(rot * Math.PI / 180);
    if (skugga) { c.fillStyle = 'rgba(0,0,0,0.35)'; rundRekt(-w / 2 + 6, -h / 2 + 10, w, h, r); c.fill(); }
    c.fillStyle = fyll; rundRekt(-w / 2, -h / 2, w, h, r); c.fill();
    if (lw) { c.lineWidth = lw; c.strokeStyle = kant; c.stroke(); }
    c.restore();
  }
  function hjartForm(x, y, s, g = c) {
    g.beginPath();
    g.moveTo(x, y + s * 0.35);
    g.bezierCurveTo(x, y - s * 0.05, x - s * 0.55, y - s * 0.15, x - s * 0.55, y + s * 0.2);
    g.bezierCurveTo(x - s * 0.55, y + s * 0.5, x - s * 0.15, y + s * 0.7, x, y + s * 0.9);
    g.bezierCurveTo(x + s * 0.15, y + s * 0.7, x + s * 0.55, y + s * 0.5, x + s * 0.55, y + s * 0.2);
    g.bezierCurveTo(x + s * 0.55, y - s * 0.15, x, y - s * 0.05, x, y + s * 0.35);
    g.closePath();
  }
  const KONTUR = 6;
  function kontur(lw = KONTUR) { c.lineWidth = lw; c.strokeStyle = F.svart; c.lineJoin = 'round'; c.lineCap = 'round'; }
  const fs = (fyll) => { c.fillStyle = fyll; c.fill(); c.stroke(); };   // fyll + kontur
  function cirkel(x, y, r) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); }

  // parallaxlager: ritar "plattor" med bredden tileW, deterministiskt slumpade per index
  function lager(kam, faktor, tileW, ritaTile) {
    const off = kam * faktor;
    const forsta = Math.floor(off / tileW);
    for (let i = forsta; i * tileW - off < W; i++) ritaTile(i * tileW - off, i, hash(i * 1.37 + faktor * 10));
  }

  /* ---------- förrenderade sprites (glöd per bildruta är för dyrt på en Chromebook) ---------- */
  function sprite(w, h, rita) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const g = cv.getContext('2d'); g.lineJoin = 'round'; g.lineCap = 'round'; rita(g, w, h); return cv;
  }
  function glod(g, x, y, r, farg) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, farg); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // ritar en ikon i en sprite: med glöd och mittpunkt i (0,0), kontur 5 px
  const ikon = (storlek, glodFarg, rita) => sprite(storlek, storlek, g => {
    glod(g, storlek / 2, storlek / 2, storlek / 2, glodFarg);
    g.translate(storlek / 2, storlek / 2); g.lineWidth = 5; g.strokeStyle = F.svart; rita(g);
  });
  const gfs = (g, fyll) => { g.fillStyle = fyll; g.fill(); g.stroke(); };
  function gRund(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function gText(g, t, x, y, px, farg = F.svart) { g.font = font(px); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = farg; g.fillText(t, x, y); }

  const SPRITES = {
    gladje: ikon(120, 'rgba(255,79,139,0.55)', g => {
      hjartForm(0, -22, 52, g); g.fillStyle = F.rosa; g.fill(); g.strokeStyle = '#fff'; g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.ellipse(-13, -10, 6, 9, -0.6, 0, 7); g.fill();
    }),
    prick: sprite(64, 64, g => glod(g, 32, 32, 32, 'rgba(255,255,255,0.9)')),
    // zonföremål (+50), ett per miljö
    penna: ikon(150, 'rgba(255,210,63,0.6)', g => {
      g.rotate(-0.7);
      g.beginPath(); g.rect(-42, -12, 70, 24); gfs(g, F.gul);
      g.beginPath(); g.moveTo(28, -12); g.lineTo(52, 0); g.lineTo(28, 12); g.closePath(); gfs(g, '#F4C99B');
      g.fillStyle = F.svart; g.beginPath(); g.moveTo(44, -4); g.lineTo(52, 0); g.lineTo(44, 4); g.fill();
      g.beginPath(); g.rect(-52, -12, 12, 24); gfs(g, '#C9CBD6');
      g.beginPath(); g.rect(-64, -12, 12, 24); gfs(g, F.rosa);
    }),
    postit: ikon(150, 'rgba(255,210,63,0.6)', g => {
      g.rotate(-0.12); gRund(g, -40, -40, 80, 80, 6); gfs(g, '#FFE45C');
      g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(-40, -40, 80, 16);
      g.lineWidth = 4; g.beginPath(); g.moveTo(-26, 2); g.lineTo(24, 2); g.moveTo(-26, 18); g.lineTo(10, 18); g.stroke();
    }),
    kloss: ikon(150, 'rgba(61,139,255,0.55)', g => {
      gRund(g, -38, -30, 76, 60, 8); gfs(g, F.bla);
      for (const x of [-20, 6]) { gRund(g, x, -44, 16, 16, 4); gfs(g, F.bla); }
      gText(g, 'A', 0, 2, 40, '#fff');
    }),
    visselpipa: ikon(150, 'rgba(255,255,255,0.5)', g => {
      g.rotate(-0.25);
      g.beginPath(); g.arc(8, 6, 26, 0, 7); gfs(g, '#D7DCE8');
      g.beginPath(); g.rect(-46, -22, 56, 24); gfs(g, '#D7DCE8');
      g.fillStyle = F.svart; g.beginPath(); g.arc(8, 6, 8, 0, 7); g.fill();
      g.lineWidth = 4; g.strokeStyle = F.korall; g.beginPath(); g.moveTo(30, -12); g.quadraticCurveTo(54, -50, 26, -56); g.stroke();
    }),
    badminton: ikon(150, 'rgba(255,255,255,0.5)', g => {
      g.rotate(0.6);
      g.beginPath(); g.moveTo(-12, -6); g.lineTo(-30, -52); g.lineTo(30, -52); g.lineTo(12, -6); g.closePath(); gfs(g, '#ffffff');
      g.lineWidth = 3; g.beginPath(); g.moveTo(-6, -8); g.lineTo(-12, -50); g.moveTo(6, -8); g.lineTo(12, -50); g.stroke();
      g.lineWidth = 5; g.beginPath(); g.arc(0, 4, 15, 0, 7); gfs(g, F.korall);
    }),
    kompass: ikon(150, 'rgba(61,220,132,0.55)', g => {
      g.beginPath(); g.arc(0, 0, 40, 0, 7); gfs(g, '#F2E6C8');
      g.beginPath(); g.arc(0, 0, 30, 0, 7); g.stroke();
      g.beginPath(); g.moveTo(0, -26); g.lineTo(8, 0); g.lineTo(-8, 0); g.closePath(); g.fillStyle = F.korall; g.fill();
      g.beginPath(); g.moveTo(0, 26); g.lineTo(8, 0); g.lineTo(-8, 0); g.closePath(); g.fillStyle = '#5A6275'; g.fill();
      gText(g, 'N', 0, -52, 22, F.svart);
    }),
    medalj: ikon(150, 'rgba(255,210,63,0.65)', g => {
      g.fillStyle = F.bla; g.beginPath(); g.moveTo(-22, -56); g.lineTo(-4, -10); g.lineTo(6, -16); g.lineTo(-8, -56); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = F.korall; g.beginPath(); g.moveTo(22, -56); g.lineTo(4, -10); g.lineTo(-6, -16); g.lineTo(8, -56); g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.arc(0, 12, 30, 0, 7); gfs(g, F.gul);
      gText(g, '1', 0, 14, 34, F.svart);
    }),
    // planeringslapp: stor post-it med text, ritas med namnet ovanpå
    lapp: ikon(200, 'rgba(255,210,63,0.75)', g => {
      g.rotate(-0.08); gRund(g, -60, -54, 120, 108, 8); gfs(g, '#FFE45C');
      g.fillStyle = F.korall; g.beginPath(); g.arc(0, -54, 9, 0, 7); g.fill(); g.stroke();
    }),
    // kraftföremål
    kraft_visselpipa: ikon(190, 'rgba(255,210,63,0.75)', g => {
      g.rotate(-0.25);
      g.beginPath(); g.arc(10, 8, 34, 0, 7); gfs(g, F.gul);
      g.beginPath(); g.rect(-58, -28, 70, 32); gfs(g, F.gul);
      g.fillStyle = F.svart; g.beginPath(); g.arc(10, 8, 10, 0, 7); g.fill();
      g.lineWidth = 5; g.beginPath(); g.moveTo(40, -16); g.quadraticCurveTo(68, -64, 30, -70); g.stroke();
    }),
    kraft_forstaHjalpen: ikon(190, 'rgba(255,90,95,0.7)', g => {
      gRund(g, -52, -38, 104, 80, 14); gfs(g, '#ffffff');
      g.beginPath(); g.rect(-20, -54, 40, 18); gfs(g, '#ffffff');
      g.fillStyle = F.korall; g.fillRect(-9, -26, 18, 56); g.fillRect(-28, -7, 56, 18);
    }),
    kraft_teamwork: ikon(190, 'rgba(25,211,197,0.7)', g => {
      for (const [x, farg] of [[-24, F.turkos], [24, F.orange]]) {
        gRund(g, x - 22, -6, 44, 50, 14); gfs(g, farg);
        g.beginPath(); g.arc(x, -26, 18, 0, 7); gfs(g, '#F1C27D');
      }
      hjartForm(0, -72, 30, g); g.fillStyle = F.rosa; g.fill(); g.stroke();
    }),
    kraft_frukt: ikon(190, 'rgba(61,220,132,0.7)', g => {
      g.beginPath(); g.arc(-22, -8, 22, 0, 7); gfs(g, F.korall);
      g.beginPath(); g.arc(20, -10, 21, 0, 7); gfs(g, F.orange);
      g.beginPath(); g.moveTo(-30, -30); g.quadraticCurveTo(0, -60, 34, -34); g.quadraticCurveTo(0, -46, -30, -30); gfs(g, F.gul);
      g.beginPath(); g.moveTo(-56, 0); g.lineTo(56, 0); g.quadraticCurveTo(50, 46, 0, 46); g.quadraticCurveTo(-50, 46, -56, 0); g.closePath(); gfs(g, F.turkos);
      g.lineWidth = 4; g.beginPath(); g.moveTo(-22, -30); g.lineTo(-18, -40); g.stroke();
    })
  };

  /* ---------- figurer ----------
     Spelarens figurer (4 st) och barn/ungdomar man hjälper. Allt ritas med leder,
     så att animationerna blir mjuka och figuren skalar skarpt. */
  const FIGURER = [
    { id: 'kim', hud: '#F1C27D', har: '#3B2416', stil: 'kort', byxor: '#2E4A7D', skor: '#FFFFFF' },
    { id: 'noa', hud: '#8D5524', har: '#16110D', stil: 'lockigt', byxor: '#1E1E28', skor: '#FFD23F' },
    { id: 'alva', hud: '#FFDBAC', har: '#E3A13B', stil: 'hastsvans', byxor: '#3F4A5A', skor: '#FF4F8B' },
    { id: 'sami', hud: '#C68642', har: '#19D3C5', stil: 'sjal', byxor: '#4A3B6B', skor: '#FFFFFF' }
  ];
  const BARN = [
    { hud: '#F1C27D', har: '#7A4A22', stil: 'kort', byxor: '#3D8BFF', skor: '#FF5A5F', troja: '#3DDC84' },
    { hud: '#8D5524', har: '#16110D', stil: 'lockigt', byxor: '#8B5CF6', skor: '#FFFFFF', troja: '#FFD23F' },
    { hud: '#FFDBAC', har: '#C0392B', stil: 'hastsvans', byxor: '#2E4A7D', skor: '#FFD23F', troja: '#FF4F8B' },
    { hud: '#C68642', har: '#2B1B10', stil: 'kort', byxor: '#1E1E28', skor: '#19D3C5', troja: '#FF8A3D' },
    { hud: '#E0AC69', har: '#3B2416', stil: 'hastsvans', byxor: '#3F4A5A', skor: '#FFFFFF', troja: '#19D3C5' }
  ];

  function lem(x1, y1, x2, y2, x3, y3, bredd, farg) {
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = F.svart; c.lineWidth = bredd + KONTUR * 2;
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.lineTo(x3, y3); c.stroke();
    c.strokeStyle = farg; c.lineWidth = bredd;
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.lineTo(x3, y3); c.stroke();
  }
  // vinkel 0 = rakt ner, positiv = framåt (åt höger)
  const led = (x, y, vinkel, langd) => [x + Math.sin(vinkel) * langd, y + Math.cos(vinkel) * langd];

  /* opt: figur, troja (färg), marke (BF-märke), fas, lage (spring|luft|glid|sta|sitta|vinka|ledsen),
          vy, sx, sy, ont, glad, glasogon, mossa (färg) */
  function ritaFigur(x, y, opt) {
    const f = opt.figur, troja = opt.troja, fas = opt.fas || 0;
    c.save();
    c.translate(x, y);
    c.scale(opt.sx || 1, opt.sy || 1);

    let hoft, torsoVinkel, ben, armar, huvudLut = 0;
    const l = opt.lage;
    if (l === 'glid') {
      hoft = [-4, -30]; torsoVinkel = -1.0;
      ben = [{ lar: 1.5, kna: 0.15 }, { lar: 1.1, kna: 0.9 }];
      armar = [{ upp: -2.0, arm: 0.3 }, { upp: -1.7, arm: 0.5 }];
      huvudLut = 0.7;
    } else if (l === 'luft') {
      const v = opt.vy || 0;
      hoft = [0, -66]; torsoVinkel = 0.1 + clamp(v / 4000, -0.15, 0.15);
      ben = [{ lar: 1.1, kna: 1.6 }, { lar: -0.3, kna: 1.0 }];
      armar = [{ upp: -2.6, arm: -0.4 }, { upp: 2.2, arm: 0.5 }];
    } else if (l === 'sitta') {
      hoft = [0, -20]; torsoVinkel = -0.1;
      ben = [{ lar: 1.45, kna: 0.5 }, { lar: 1.2, kna: 0.9 }];
      armar = [{ upp: 1.6, arm: 1.8 }, { upp: 1.3, arm: 1.6 }];
      huvudLut = 0.25;
    } else if (l === 'sta' || l === 'ledsen' || l === 'vinka') {
      hoft = [0, -64]; torsoVinkel = 0.02;
      ben = [{ lar: 0.08, kna: 0.05 }, { lar: -0.08, kna: 0.05 }];
      armar = [{ upp: 0.25 + Math.sin(fas) * 0.05, arm: -0.5 }, { upp: -0.2, arm: -0.3 }];
      if (l === 'ledsen') { armar = [{ upp: 0.1, arm: 0 }, { upp: -0.1, arm: 0 }]; huvudLut = 0.3; }
      if (l === 'vinka') armar[0] = { upp: -2.7 + Math.sin(fas * 2.5) * 0.35, arm: -0.4 };
    } else {
      const s = Math.sin(fas);
      hoft = [0, -64 - Math.abs(Math.cos(fas)) * 6]; torsoVinkel = 0.2;
      ben = [0, Math.PI].map(o => { const a = Math.sin(fas + o); return { lar: a * 0.95, kna: 0.25 + Math.max(0, -Math.cos(fas + o)) * 1.4 + (a < 0 ? 0.3 : 0) }; });
      armar = [{ upp: -s * 1.1, arm: -1.2 }, { upp: s * 1.1, arm: -1.2 }];
    }

    const LAR = 34, SKEN = 34, UPPARM = 28, UNDERARM = 26, TORSO = 56;
    const [hx, hy] = hoft;
    const ax = hx + Math.sin(torsoVinkel) * TORSO, ay = hy - Math.cos(torsoVinkel) * TORSO; // axlar
    const ritaBen = (b, bak) => {
      const [kx, ky] = led(hx, hy, b.lar, LAR);
      const [fx, fy] = led(kx, ky, b.lar - b.kna, SKEN);
      lem(hx, hy, kx, ky, fx, fy, 22, bak ? skugga(f.byxor) : f.byxor);
      c.save(); c.translate(fx, fy); c.rotate(b.lar - b.kna);
      c.fillStyle = bak ? skugga(f.skor) : f.skor; c.lineWidth = 5; c.strokeStyle = F.svart;
      rundRekt(-10, -6, 34, 16, 8); c.fill(); c.stroke();
      c.restore();
    };
    const ritaArm = (a, bak) => {
      const [ex, ey] = led(ax, ay, a.upp, UPPARM);
      const [hx2, hy2] = led(ex, ey, a.upp - a.arm, UNDERARM);
      lem(ax, ay, ex, ey, hx2, hy2, 18, bak ? skugga(troja) : troja);
      c.fillStyle = f.hud; c.strokeStyle = F.svart; c.lineWidth = 5;
      cirkel(hx2, hy2, 9); c.fill(); c.stroke();
    };

    ritaArm(armar[1], true);
    ritaBen(ben[1], true);

    // kropp (hoodie/tröja)
    c.save(); c.translate(hx, hy); c.rotate(torsoVinkel);
    c.fillStyle = troja; c.strokeStyle = F.svart; c.lineWidth = KONTUR;
    rundRekt(-27, -TORSO - 10, 54, TORSO + 18, 20); c.fill(); c.stroke();
    if (opt.marke) {
      c.fillStyle = 'rgba(0,0,0,0.15)'; rundRekt(-18, -18, 36, 18, 8); c.fill();
      // BF-märket: vit rundad ruta, svarta bokstäver (som loggan)
      c.save(); c.translate(4, -TORSO + 22); c.rotate(-0.1);
      c.fillStyle = '#ffffff'; rundRekt(-18, -13, 36, 26, 7); c.fill();
      c.fillStyle = F.svart; c.font = font(20); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('BF', 0, 1.5);
      c.restore();
      c.fillStyle = skugga(troja); c.strokeStyle = F.svart; c.lineWidth = 5;
      c.beginPath(); c.ellipse(-14, -TORSO - 2, 15, 12, -0.4, 0, 7); c.fill(); c.stroke();
    }
    c.restore();

    ritaBen(ben[0], false);

    // huvud
    const huvX = ax + Math.sin(torsoVinkel) * 24, huvY = ay - Math.cos(torsoVinkel) * 24;
    c.save(); c.translate(huvX, huvY); c.rotate(torsoVinkel * 0.5 + huvudLut);
    ritaHar(f, 'bak', fas);
    c.fillStyle = f.hud; c.strokeStyle = F.svart; c.lineWidth = KONTUR;
    cirkel(0, 0, 25); c.fill(); c.stroke();
    ritaHar(f, 'fram', fas);
    if (opt.mossa) {
      c.fillStyle = opt.mossa; c.lineWidth = 5;
      c.beginPath(); c.arc(0, -6, 27, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
      cirkel(0, -36, 8); c.fill(); c.stroke();
    }
    // ansikte (tittar åt höger)
    c.fillStyle = F.svart;
    if (opt.glasogon) {
      rundRekt(2, -10, 26, 13, 4); c.fill(); c.fillRect(-8, -7, 12, 4);
      c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(8, -8, 6, 3);
    } else {
      c.beginPath(); c.ellipse(13, -4, 3.6, 5, 0, 0, 7); c.fill();
    }
    c.lineWidth = 4; c.strokeStyle = F.svart; c.beginPath();
    if (opt.ont) c.arc(14, 12, 6, Math.PI * 1.1, Math.PI * 1.9);
    else if (opt.glad) c.arc(12, 5, 9, 0.1, 1.6);
    else c.arc(13, 6, 8, 0.2, 1.4);
    c.stroke();
    if (opt.ont && opt.tarar) { c.fillStyle = '#7FD3FF'; c.beginPath(); c.ellipse(14, 6 + (fas * 20 % 12), 3, 5, 0, 0, 7); c.fill(); }
    c.fillStyle = 'rgba(255,90,95,0.35)'; cirkel(6, 8, 5); c.fill();
    c.restore();

    ritaArm(armar[0], false);
    c.restore();
  }

  function ritaHar(f, del, fas) {
    c.fillStyle = f.har; c.strokeStyle = F.svart; c.lineWidth = 5;
    if (f.stil === 'kort' && del === 'fram') {
      c.beginPath(); c.arc(0, -2, 27, Math.PI * 1.05, Math.PI * 1.95); c.quadraticCurveTo(10, -14, -22, -6); c.closePath(); c.fill(); c.stroke();
    } else if (f.stil === 'lockigt' && del === 'bak') {
      for (const [x, y, r] of [[-16, -16, 15], [0, -24, 16], [16, -18, 14], [-24, 0, 13], [-8, -6, 14]]) { cirkel(x, y, r); c.fill(); c.stroke(); }
    } else if (f.stil === 'lockigt' && del === 'fram') {
      c.beginPath(); c.arc(-4, -18, 15, Math.PI * 0.9, Math.PI * 2.1); c.fill();
    } else if (f.stil === 'hastsvans') {
      if (del === 'bak') {
        const sv = Math.sin(fas * 1.6) * 0.25;
        c.save(); c.translate(-22, -12); c.rotate(0.9 + sv);
        c.beginPath(); c.ellipse(0, 18, 11, 22, 0, 0, 7); c.fill(); c.stroke(); c.restore();
      } else {
        c.beginPath(); c.arc(0, -2, 27, Math.PI * 1.0, Math.PI * 1.9); c.quadraticCurveTo(6, -10, -24, 2); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = F.rosa; cirkel(-22, -12, 5); c.fill();
      }
    } else if (f.stil === 'sjal') {
      if (del === 'bak') {
        c.beginPath(); c.ellipse(-6, 4, 33, 35, 0, 0, 7); c.fill(); c.stroke();
      } else {
        c.beginPath(); c.arc(2, 0, 30, Math.PI * 0.95, Math.PI * 1.75); c.lineTo(10, -6); c.quadraticCurveTo(-4, 4, 4, 30); c.lineTo(-20, 26); c.closePath(); c.fill(); c.stroke();
      }
    }
  }

  Object.assign(BFR, {
    W, H, MARK, F, PALETT, KONTUR, FIGURER, BARN, SPRITES,
    satt, clamp, lerp, rnd, valj, hash, blanda, mixa, skugga, font,
    text, radbryt, textRader, rundRekt, klistermarke, hjartForm, kontur, fs, cirkel, lager, sprite, glod, ritaFigur
  });
})();
