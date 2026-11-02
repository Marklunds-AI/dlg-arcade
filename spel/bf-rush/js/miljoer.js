/* BF-Rush – miljöerna. Varje miljö har bakgrund (parallax), golv, hinder och ett zonföremål.
   Hindertyper: hopp (hoppa över), hog (håll inne eller dubbelhoppa), glid (glid under).
   Allt ritas med kod. Kräver grafik.js. */
(function () {
  'use strict';
  const B = window.BFR;
  const { W, H, MARK, F, PALETT } = B;
  const { rundRekt, text, klistermarke, kontur, fs, cirkel, lager, hash, mixa, clamp } = B;
  let c = null;
  B.sattMiljo = ctx => { c = ctx; };
  const GLIDFRI = 138;   // fri höjd under glid-hinder – samma som CONFIG.glidFri i spel.js
  const nu = () => B.klocka || 0;

  /* ---------- himmel: morgon → eftermiddag, och skymning i skogen ---------- */
  const MORGON = ['#6FA8FF', '#FFC9A3'], MITT = ['#3FA2FF', '#BDEBFF'], EFTER = ['#5A7BE0', '#FFC77A'], SKYMNING = ['#2A2463', '#FF7A59'];
  function himmel(info) {
    const d = clamp(info.dagFas || 0, 0, 1);
    let top, bot;
    if (d < 0.5) { top = mixa(MORGON[0], MITT[0], d * 2); bot = mixa(MORGON[1], MITT[1], d * 2); }
    else { top = mixa(MITT[0], EFTER[0], (d - 0.5) * 2); bot = mixa(MITT[1], EFTER[1], (d - 0.5) * 2); }
    if (info.skymning > 0) {
      const s = info.skymning, a = d < 0.5 ? MITT : EFTER;
      top = mixa(a[0], SKYMNING[0], s); bot = mixa(a[1], SKYMNING[1], s);
    }
    return [top, bot];
  }
  function himmelGradient(y0, y1, info) {
    const [a, b] = himmel(info);
    const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b);
    return g;
  }
  // solens höjd följer dagen
  function sol(x, info, r = 60) {
    const d = clamp(info.dagFas || 0, 0, 1), y = 300 - Math.sin(Math.PI * (0.15 + d * 0.7)) * 180 + (info.skymning || 0) * 260;
    c.globalAlpha = 0.35; c.drawImage(B.SPRITES.prick, x - r * 2.2, y - r * 2.2, r * 4.4, r * 4.4); c.globalAlpha = 1;
    c.fillStyle = info.skymning > 0.5 ? '#FFB36B' : '#FFE58A'; cirkel(x, y, r); c.fill();
  }

  /* ---------- golv ---------- */
  function golvTra(kam, a, b) {
    c.fillStyle = a; c.fillRect(0, MARK, W, H - MARK);
    c.fillStyle = b;
    for (let x = -(kam % 240); x < W; x += 240) c.fillRect(x, MARK + 18, 6, 74);
    for (let x = -(kam % 380) + 120; x < W; x += 380) c.fillRect(x, MARK + 98, 6, H - MARK);
    c.fillRect(0, MARK + 92, W, 6);
    golvKant();
  }
  function golvKant() {
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(0, MARK, W, 8);
    c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(0, MARK + 8, W, 10);
  }
  function golvKakel(kam, a, b) {
    c.fillStyle = a; c.fillRect(0, MARK, W, H - MARK);
    c.fillStyle = b; const s = 100;
    for (let k = Math.floor(kam / s); k * s - kam < W; k++) for (let r = 0; r < 2; r++) if ((k + r) % 2 === 0) c.fillRect(k * s - kam, MARK + 18 + r * s, s, s);
    golvKant();
  }
  function golvMatta(kam, a, prick) {
    c.fillStyle = a; c.fillRect(0, MARK, W, H - MARK);
    c.fillStyle = prick;
    for (let x = -(kam % 90); x < W; x += 90) { cirkel(x + 20, MARK + 60, 6); c.fill(); cirkel(x + 65, MARK + 130, 6); c.fill(); }
    golvKant();
  }
  function golvGras(kam, gras, jord) {
    c.fillStyle = jord; c.fillRect(0, MARK, W, H - MARK);
    c.fillStyle = gras; c.fillRect(0, MARK, W, 34);
    c.fillStyle = B.skugga(gras.startsWith('#') ? gras : '#3DDC84', 0.8);
    for (let x = -(kam % 60); x < W; x += 60) { c.beginPath(); c.moveTo(x, MARK + 34); c.lineTo(x + 14, MARK + 52); c.lineTo(x + 28, MARK + 34); c.fill(); }
    c.fillStyle = 'rgba(0,0,0,0.12)';
    for (let x = -(kam % 170); x < W; x += 170) { cirkel(x + 50, MARK + 120, 10); c.fill(); cirkel(x + 120, MARK + 160, 6); c.fill(); }
    c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(0, MARK, W, 6);
  }
  function golvHall(kam) {
    golvTra(kam, '#E7B36B', '#D29A50');
    c.fillStyle = F.korall; c.fillRect(0, MARK + 60, W, 8);
    c.fillStyle = F.bla; for (let x = -(kam % 1400); x < W; x += 1400) { c.fillRect(x + 300, MARK + 18, 8, H - MARK); c.beginPath(); c.arc(x + 304, MARK + 18, 160, 0, Math.PI); c.lineWidth = 8; c.strokeStyle = F.bla; c.stroke(); }
  }

  /* ---------- gemensamma bakgrundsdelar ---------- */
  function vagg(a, b, panel, panelY = 620) {
    const g = c.createLinearGradient(0, 0, 0, MARK); g.addColorStop(0, a); g.addColorStop(1, b);
    c.fillStyle = g; c.fillRect(0, 0, W, MARK);
    if (panel) { c.fillStyle = panel; c.fillRect(0, panelY, W, MARK - panelY); c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(0, panelY, W, 8); }
  }
  function fonster(kam, info, { tile = 720, fw = 420, fh = 360, fy = 120, ram = '#18204a', sprojs = '#E8ECF7' } = {}) {
    lager(kam, 0.15, tile, (x, i, r) => {
      const fx = x + 120;
      c.fillStyle = ram; rundRekt(fx - 18, fy - 18, fw + 36, fh + 36, 14); c.fill();
      c.save(); c.beginPath(); c.rect(fx, fy, fw, fh); c.clip();
      c.fillStyle = himmelGradient(fy, fy + fh, info); c.fillRect(fx, fy, fw, fh);
      if (r > 0.55) sol(fx + fw - 90, info, 36);
      c.fillStyle = 'rgba(255,255,255,0.9)';
      const mx = fx + 60 + r * 220, my = fy + 70 + r * 110;
      c.beginPath(); c.arc(mx, my, 34, 0, 7); c.arc(mx + 40, my - 14, 42, 0, 7); c.arc(mx + 86, my, 32, 0, 7); c.fill();
      c.fillStyle = '#2FBF71'; c.beginPath(); c.arc(fx + 90 + r * 60, fy + fh + 10, 110, Math.PI, 0); c.fill();
      c.fillStyle = '#27A862'; c.beginPath(); c.arc(fx + 300 - r * 40, fy + fh + 30, 90, Math.PI, 0); c.fill();
      c.restore();
      c.fillStyle = sprojs; c.fillRect(fx + fw / 2 - 6, fy, 12, fh); c.fillRect(fx, fy + fh * 0.45 - 6, fw, 12);
      c.lineWidth = 10; c.strokeStyle = sprojs; c.strokeRect(fx, fy, fw, fh);
    });
  }
  function whiteboard(x, y, w, h, rad) {
    c.fillStyle = '#B7BDD3'; rundRekt(x, y, w, h, 12); c.fill();
    c.fillStyle = '#FFFFFF'; rundRekt(x + 16, y + 16, w - 32, h - 32, 6); c.fill();
    c.fillStyle = '#8D93AE'; c.fillRect(x + 60, y + h, w - 120, 14);
    const farger = [F.bla, F.korall, F.gron, F.lila];
    rad.forEach((r, i) => text(r, x + w / 2, y + 70 + i * 62, { px: i ? 34 : 38, farg: farger[i % 4], vikt: 800, max: w - 70 }));
  }
  const tavelRader = info => String(info.tavla || '').split('·').map(s => s.trim()).filter(Boolean);
  function bokhylla(x, y, i) {
    c.fillStyle = '#5B3A2A'; c.fillRect(x, y, 360, 400);
    for (let h = 0; h < 3; h++) {
      const hy = y + 20 + h * 125;
      c.fillStyle = '#3E271C'; c.fillRect(x + 12, hy, 336, 110);
      let bx = x + 20;
      for (let b = 0; b < 9; b++) {
        const bw = 22 + hash(i * 31 + h * 7 + b) * 16, bh = 70 + hash(i * 13 + b + h) * 34;
        if (bx + bw > x + 340) break;
        c.fillStyle = PALETT[(b + h + i) % PALETT.length]; c.fillRect(bx, hy + 110 - bh, bw, bh);
        bx += bw + 4;
      }
      c.fillStyle = '#7A5038'; c.fillRect(x, hy + 110, 360, 12);
    }
  }
  function klocka(x, y) {
    c.fillStyle = '#ffffff'; cirkel(x, y, 70); c.fill();
    c.lineWidth = 10; c.strokeStyle = F.svart; c.stroke();
    c.lineWidth = 8; c.lineCap = 'round';
    const a = nu() * 0.5;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 46, y + Math.sin(a) * 46); c.stroke();
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a / 12) * 30, y + Math.sin(a / 12) * 30); c.stroke();
  }
  function affisch(x, y, w, h, rot, fyll, rader) {
    klistermarke(x, y, w, h, { rot, fyll, lw: 6, r: 16, skugga: false });
    rader.forEach((r, i) => text(r, x + (i - (rader.length - 1) / 2) * Math.sin(rot * Math.PI / 180) * -56, y + (i - (rader.length - 1) / 2) * 60, { px: r.length > 5 ? 40 : 56, farg: F.svart, rot, max: w - 30 }));
  }
  function banksilhuett(kam, farg, extra) {
    lager(kam, 0.72, 520, (x, i, r) => {
      const bx = x + 60 + r * 120;
      c.fillStyle = farg;
      c.fillRect(bx, 720, 260, 22);
      c.fillRect(bx + 16, 742, 14, MARK - 742); c.fillRect(bx + 230, 742, 14, MARK - 742);
      c.fillRect(bx + 300, 760, 90, 16); c.fillRect(bx + 372, 680, 16, 96);
      c.fillRect(bx + 306, 776, 12, MARK - 776); c.fillRect(bx + 370, 776, 12, MARK - 776);
      if (extra && r > 0.4) extra(bx, r);
    });
  }

  /* =====================================================================
     Miljöerna
     ===================================================================== */
  const MILJOER = {};

  // ---- Klassrummet (svenska, engelska) ----
  MILJOER.klassrum = {
    hopp: [{ sort: 'bokhog', w: 120, h: [86, 104] }, { sort: 'ryggsack', w: 96, h: [96, 108] }, { sort: 'stol', w: 100, h: [112, 118] }, { sort: 'provror', w: 128, h: [82, 92] }],
    hog: [{ sort: 'bokhogHog', w: 124, h: [172, 184] }],
    glid: [{ sort: 'projektor', w: 250 }, { sort: 'plansch', w: 290 }],
    zon: 'penna', hjalp: null,
    rita(kam, info) {
      vagg('#25325F', '#2D3E73', '#1B2448');
      fonster(kam, info);
      const rad = tavelRader(info);
      lager(kam, 0.4, 900, (x, i, r) => {
        const typ = Math.floor(r * 4);
        if (typ === 0) whiteboard(x + 80, 160, 560, 300, rad.length ? rad : ['Läs högt!']);
        else if (typ === 1) bokhylla(x + 140, 200, i);
        else if (typ === 2) { affisch(x + 260, 300, 220, 280, -4, F.gul, ['LÄS', 'HÖGT!']); affisch(x + 560, 330, 200, 240, 5, F.turkos, ['ABC']); }
        else klocka(x + 420, 260);
      });
      banksilhuett(kam, '#16204A', (bx) => { c.fillStyle = '#23306A'; c.fillRect(bx + 40, 700, 70, 20); c.fillRect(bx + 130, 694, 50, 26); });
      golvTra(kam, '#E09A52', '#C97F3A');
    }
  };

  // ---- Labbet (matte och naturkunskap) ----
  MILJOER.labb = {
    hopp: [{ sort: 'provror', w: 128, h: [82, 92] }, { sort: 'kolv', w: 110, h: [100, 112] }, { sort: 'bokhog', w: 120, h: [86, 104] }, { sort: 'ryggsack', w: 96, h: [96, 108] }],
    hog: [{ sort: 'bokhogHog', w: 124, h: [172, 184] }],
    glid: [{ sort: 'projektor', w: 250 }, { sort: 'lampa', w: 220 }],
    zon: 'penna', hjalp: null,
    rita(kam, info) {
      vagg('#1C4B57', '#246270', '#123640');
      fonster(kam, info, { ram: '#0F2F38' });
      const rad = tavelRader(info);
      lager(kam, 0.4, 900, (x, i, r) => {
        const typ = Math.floor(r * 3);
        if (typ === 0) whiteboard(x + 80, 160, 600, 300, rad.length ? rad : ['2 + 2 = 4']);
        else if (typ === 1) {
          // periodiska systemet
          c.fillStyle = '#ffffff'; rundRekt(x + 120, 170, 520, 300, 10); c.fill();
          for (let rr = 0; rr < 5; rr++) for (let k = 0; k < 12; k++) {
            if (rr === 0 && k > 0 && k < 11) continue;
            c.fillStyle = PALETT[(k + rr) % PALETT.length]; c.fillRect(x + 145 + k * 40, 200 + rr * 50, 34, 42);
          }
          text('H', x + 162, 222, { px: 26, farg: F.svart });
        } else {
          // hylla med kolvar
          c.fillStyle = '#5B3A2A'; c.fillRect(x + 150, 380, 420, 16);
          for (let k = 0; k < 5; k++) {
            const kx = x + 190 + k * 80, f = PALETT[(k + i) % 8];
            c.fillStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.moveTo(kx - 8, 300); c.lineTo(kx + 8, 300); c.lineTo(kx + 28, 380); c.lineTo(kx - 28, 380); c.closePath(); c.fill();
            c.fillStyle = f; c.beginPath(); c.moveTo(kx - 18, 340); c.lineTo(kx + 18, 340); c.lineTo(kx + 28, 380); c.lineTo(kx - 28, 380); c.closePath(); c.fill();
          }
          klocka(x + 700, 260);
        }
      });
      // labbänkar
      lager(kam, 0.72, 560, (x, i, r) => {
        c.fillStyle = '#0E2A33'; c.fillRect(x + 40, 700, 420, 30); c.fillRect(x + 60, 730, 380, MARK - 730);
        c.fillStyle = '#163A45'; c.fillRect(x + 100, 650, 10, 50); c.beginPath(); c.arc(x + 120, 650, 20, Math.PI, 0); c.lineWidth = 10; c.strokeStyle = '#163A45'; c.stroke();
      });
      golvKakel(kam, '#DCE3EA', '#C3CDD8');
    }
  };

  // ---- Planeringsrummet (planera och utvärdera) ----
  MILJOER.planering = {
    hopp: [{ sort: 'parmar', w: 120, h: [92, 104] }, { sort: 'kartong', w: 130, h: [94, 108] }, { sort: 'ryggsack', w: 96, h: [96, 108] }],
    hog: [{ sort: 'kartongHog', w: 130, h: [172, 184] }],
    glid: [{ sort: 'postitGirlang', w: 300 }, { sort: 'banderoll', w: 320 }],
    zon: 'postit', hjalp: null,
    rita(kam, info) {
      vagg('#3A2C5E', '#47377A', '#2A2048');
      fonster(kam, info, { tile: 1100, ram: '#22183F' });
      const rad = tavelRader(info);
      lager(kam, 0.4, 1000, (x, i, r) => {
        const typ = Math.floor(r * 3);
        if (typ === 0) {
          // stora planeringstavlan: planera → genomföra → utvärdera
          c.fillStyle = '#B7BDD3'; rundRekt(x + 60, 150, 760, 320, 12); c.fill();
          c.fillStyle = '#fff'; rundRekt(x + 76, 166, 728, 288, 6); c.fill();
          const steg = ['PLANERA', 'GENOMFÖRA', 'UTVÄRDERA'], aktiv = rad.join(' ').match(/PLANERA|GENOMFÖRA|UTVÄRDERA/);
          steg.forEach((s, k) => {
            const on = aktiv && aktiv[0] === s, sx = x + 190 + k * 250;
            klistermarke(sx, 250, 210, 80, { rot: -4, fyll: on ? F.gul : '#E9ECF5', kant: F.svart, lw: on ? 6 : 3, r: 18, skugga: false });
            text(s, sx, 254, { px: 30, farg: F.svart, rot: -4, max: 190 });
            if (k < 2) text('→', sx + 125, 252, { px: 44, farg: F.svart });
          });
          text('Syfte · Material · Säkerhet · Tidsplan', x + 440, 370, { px: 34, farg: F.bla, vikt: 800, max: 680 });
          text('Fredag: ' + (info.evenemang || 'evenemang') + '!', x + 440, 420, { px: 30, farg: F.korall, vikt: 800, max: 680 });
        } else if (typ === 1) {
          // post-it-vägg
          for (let k = 0; k < 16; k++) {
            const px = x + 120 + (k % 4) * 110 + hash(i + k) * 20, py = 170 + Math.floor(k / 4) * 100 + hash(k * 3 + i) * 16;
            c.save(); c.translate(px, py); c.rotate((hash(k + i * 7) - 0.5) * 0.3);
            c.fillStyle = [F.gul, F.rosa, F.turkos, F.gron][k % 4]; c.fillRect(-40, -38, 80, 76);
            c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(-28, -10, 56, 5); c.fillRect(-28, 6, 38, 5);
            c.restore();
          }
          // kalender
          c.fillStyle = '#fff'; rundRekt(x + 640, 170, 240, 280, 12); c.fill();
          c.fillStyle = F.korall; rundRekt(x + 640, 170, 240, 60, 12); c.fill(); c.fillRect(x + 640, 210, 240, 20);
          text('VECKA', x + 760, 202, { px: 30, farg: '#fff' });
          ['M', 'T', 'O', 'T', 'F'].forEach((d, k) => { text(d, x + 670 + k * 45, 270, { px: 28, farg: F.svart }); });
          text('★', x + 850, 330, { px: 64, farg: F.gul, kant: F.svart, kantB: 6 });
        } else {
          affisch(x + 300, 300, 260, 300, -5, F.turkos, ['VI', 'LEDER!']);
          affisch(x + 640, 320, 240, 260, 4, F.rosa, ['ALLA', 'MED']);
        }
      });
      // bord med laptop och pärmar
      lager(kam, 0.72, 640, (x, i, r) => {
        c.fillStyle = '#1D1538';
        c.fillRect(x + 60, 730, 360, 24); c.fillRect(x + 80, 754, 16, MARK - 754); c.fillRect(x + 384, 754, 16, MARK - 754);
        c.fillStyle = '#2A2050'; c.fillRect(x + 140, 680, 110, 50); c.fillRect(x + 280, 700, 30, 30); c.fillRect(x + 316, 694, 30, 36);
      });
      golvMatta(kam, '#5D4E8C', 'rgba(255,255,255,0.08)');
    }
  };

  // ---- Förskolan (APL för Pedagogiskt och socialt arbete) ----
  MILJOER.forskola = {
    hopp: [{ sort: 'klosstorn', w: 110, h: [90, 106] }, { sort: 'leksaksbil', w: 150, h: [80, 90] }, { sort: 'vattenpol', w: 180, h: [24, 24] }],
    hog: [{ sort: 'klosstornHog', w: 116, h: [172, 184] }],
    glid: [{ sort: 'pysselGirlang', w: 320 }, { sort: 'mobil', w: 240 }],
    zon: 'kloss', hjalp: { skala: 0.62, barn: true },
    rita(kam, info) {
      vagg('#9ED9C4', '#B9E6D3', '#F5C76B', 640);
      fonster(kam, info, { tile: 900, ram: '#4FA88B', sprojs: '#FFFFFF' });
      lager(kam, 0.4, 860, (x, i, r) => {
        const typ = Math.floor(r * 3);
        if (typ === 0) {
          // barnteckningar
          for (let k = 0; k < 3; k++) {
            const px = x + 140 + k * 220, py = 230 + (k % 2) * 40;
            c.save(); c.translate(px, py); c.rotate((k - 1) * 0.06);
            c.fillStyle = '#fff'; c.fillRect(-80, -70, 160, 140);
            c.fillStyle = F.gul; cirkel(-40, -30, 20); c.fill();
            c.fillStyle = PALETT[(k + i) % 8]; c.fillRect(-20, 0, 60, 46);
            c.fillStyle = F.korall; c.beginPath(); c.moveTo(-28, 0); c.lineTo(10, -34); c.lineTo(48, 0); c.fill();
            c.fillStyle = F.svart; c.fillRect(-6, -76, 12, 12);
            c.restore();
          }
        } else if (typ === 1) {
          // kapprum: krokar med jackor
          c.fillStyle = '#F2E3C6'; c.fillRect(x + 100, 360, 600, 260);
          for (let k = 0; k < 5; k++) {
            const kx = x + 160 + k * 115;
            c.fillStyle = '#C9A26A'; c.fillRect(kx - 40, 360, 80, 260);
            c.fillStyle = PALETT[(k * 3 + i) % 8]; rundRekt(kx - 30, 400, 60, 90, 14); c.fill();
            text(['ELSA', 'OMAR', 'LIV', 'NOA', 'MIA'][k], kx, 580, { px: 22, farg: F.svart });
          }
        } else {
          // ABC-remsa och sol
          const bok = 'ABCDEFG';
          for (let k = 0; k < 7; k++) { klistermarke(x + 110 + k * 100, 200, 84, 84, { rot: (k % 2 ? 4 : -4), fyll: PALETT[k], kant: '#fff', lw: 5, r: 14, skugga: false }); text(bok[k], x + 110 + k * 100, 204, { px: 50, farg: '#fff', kant: F.svart, kantB: 6 }); }
          c.fillStyle = F.gul; cirkel(x + 400, 420, 70); c.fill();
          for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5 + nu() * 0.3; c.fillRect(x + 400 + Math.cos(a) * 95 - 8, 420 + Math.sin(a) * 95 - 8, 16, 16); }
        }
      });
      c.globalAlpha = 0.4;
      // små bord och stolar
      lager(kam, 0.72, 480, (x, i, r) => {
        c.fillStyle = '#E3A64F';
        c.fillRect(x + 60, 780, 200, 18); c.fillRect(x + 76, 798, 12, MARK - 798); c.fillRect(x + 232, 798, 12, MARK - 798);
        c.fillStyle = '#6BBFA2'; c.fillRect(x + 290, 810, 60, 12); c.fillRect(x + 336, 760, 12, 60); c.fillRect(x + 296, 822, 10, MARK - 822);
      });
      c.globalAlpha = 1;
      golvMatta(kam, '#F7A35C', 'rgba(255,255,255,0.18)');
    }
  };

  // ---- Fritidsgården / gymmet (APL för Fritid och hälsa) ----
  MILJOER.fritidsgard = {
    hopp: [{ sort: 'hantlar', w: 130, h: [80, 92] }, { sort: 'sittsack', w: 130, h: [86, 98] }, { sort: 'pingisbord', w: 220, h: [100, 108] }],
    hog: [{ sort: 'hogtalare', w: 120, h: [172, 184] }],
    glid: [{ sort: 'basketkorg', w: 240 }, { sort: 'discokula', w: 200 }],
    zon: 'visselpipa', hjalp: { skala: 0.84, barn: false },
    rita(kam, info) {
      vagg('#22163F', '#30205A', '#1A1133', 640);
      lager(kam, 0.15, 1300, (x, i, r) => {
        // neonskylt
        const glow = 0.8 + Math.sin(nu() * 3 + i) * 0.2;
        c.globalAlpha = glow;
        klistermarke(x + 520, 220, 640, 150, { rot: -4, fyll: 'rgba(0,0,0,0)', kant: F.rosa, lw: 10, r: 40, skugga: false });
        text('FRITIDSGÅRDEN', x + 520, 226, { px: 70, farg: F.rosa, rot: -4, max: 590 });
        c.globalAlpha = 1;
      });
      lager(kam, 0.4, 900, (x, i, r) => {
        const typ = Math.floor(r * 3);
        if (typ === 0) {
          // biljardbord och soffa
          c.fillStyle = '#16804F'; rundRekt(x + 120, 470, 360, 60, 12); c.fill();
          c.fillStyle = '#5B3A2A'; c.fillRect(x + 140, 530, 26, 90); c.fillRect(x + 434, 530, 26, 90);
          c.fillStyle = F.lila; rundRekt(x + 560, 480, 260, 140, 30); c.fill();
          c.fillStyle = skuggaL(F.lila); rundRekt(x + 580, 440, 220, 80, 26); c.fill();
        } else if (typ === 1) {
          // gymspegel och viktställ
          c.fillStyle = '#7C8FB5'; rundRekt(x + 120, 160, 360, 420, 12); c.fill();
          c.fillStyle = '#A8BBDF'; rundRekt(x + 136, 176, 328, 388, 8); c.fill();
          c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.moveTo(x + 180, 176); c.lineTo(x + 260, 176); c.lineTo(x + 160, 420); c.lineTo(x + 136, 420); c.fill();
          text('GYM', x + 300, 120, { px: 60, farg: F.turkos, kant: F.svart, kantB: 8 });
          c.fillStyle = '#2B2B3A'; c.fillRect(x + 560, 500, 260, 16);
          for (let k = 0; k < 4; k++) { c.fillStyle = PALETT[k]; cirkel(x + 600 + k * 60, 480, 22); c.fill(); }
        } else {
          // tv-spel och affisch
          c.fillStyle = '#0B0B12'; rundRekt(x + 140, 280, 360, 220, 12); c.fill();
          c.fillStyle = F.bla; c.fillRect(x + 160, 300, 320, 180);
          c.fillStyle = F.gul; cirkel(x + 260, 390, 24); c.fill(); c.fillStyle = F.korall; c.fillRect(x + 340, 370, 60, 40);
          affisch(x + 680, 330, 220, 280, 5, F.gul, ['TURN-', 'ERING', 'FRE']);
        }
      });
      c.globalAlpha = 0.4;
      lager(kam, 0.72, 600, (x, i, r) => {
        c.fillStyle = '#120B24'; rundRekt(x + 60, 740, 280, MARK - 740 + 10, 30); c.fill();
        c.fillStyle = '#1C1236'; rundRekt(x + 80, 700, 240, 60, 24); c.fill();
      });
      c.globalAlpha = 1;
      // golv med neonlist
      c.fillStyle = '#2E2A3E'; c.fillRect(0, MARK, W, H - MARK);
      c.fillStyle = '#24212F'; for (let x = -(kam % 200); x < W; x += 200) c.fillRect(x, MARK, 100, H - MARK);
      c.fillStyle = F.turkos; c.fillRect(0, MARK, W, 8);
      c.globalAlpha = 0.25; c.fillRect(0, MARK + 8, W, 16); c.globalAlpha = 1;
    }
  };
  function skuggaL(f) { return B.skugga(f, 0.8); }

  // ---- Idrottshallen (idrott och hälsa) ----
  MILJOER.idrott = {
    hopp: [{ sort: 'plint', w: 130, h: [100, 112] }, { sort: 'bank', w: 230, h: [66, 74] }, { sort: 'boll', w: 84, h: [76, 76] }],
    hog: [{ sort: 'plintHog', w: 140, h: [172, 184] }],
    glid: [{ sort: 'ringar', w: 200 }, { sort: 'hopprep', w: 300 }],
    zon: 'badminton', hjalp: { skala: 0.68, barn: true },
    rita(kam, info) {
      vagg('#C9D7EA', '#DCE6F2', '#D9A766', 560);
      // höga fönster
      lager(kam, 0.15, 520, (x, i, r) => {
        c.save(); c.beginPath(); c.rect(x + 80, 60, 300, 120); c.clip();
        c.fillStyle = himmelGradient(60, 180, info); c.fillRect(x + 80, 60, 300, 120); c.restore();
        c.lineWidth = 8; c.strokeStyle = '#9FB0C8'; c.strokeRect(x + 80, 60, 300, 120);
        c.fillStyle = '#9FB0C8'; c.fillRect(x + 226, 60, 8, 120);
      });
      lager(kam, 0.4, 900, (x, i, r) => {
        const typ = Math.floor(r * 3);
        if (typ === 0) {
          // ribbstolar
          c.fillStyle = '#C08A4A';
          for (let k = 0; k < 4; k++) { c.fillRect(x + 120 + k * 130, 220, 14, 400); c.fillRect(x + 220 + k * 130, 220, 14, 400); for (let s = 0; s < 12; s++) c.fillRect(x + 120 + k * 130, 240 + s * 32, 114, 8); }
        } else if (typ === 1) {
          // basketkorg på väggen
          c.fillStyle = '#fff'; rundRekt(x + 300, 200, 240, 160, 8); c.fill(); c.lineWidth = 6; c.strokeStyle = F.korall; c.strokeRect(x + 370, 270, 100, 70);
          c.strokeStyle = F.orange; c.lineWidth = 8; c.beginPath(); c.ellipse(x + 420, 365, 50, 12, 0, 0, 7); c.stroke();
          c.strokeStyle = '#fff'; c.lineWidth = 3; for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(x + 420 + k * 20, 370); c.lineTo(x + 420 + k * 12, 430); c.stroke(); }
        } else {
          klistermarke(x + 420, 300, 600, 130, { rot: -3, fyll: F.bla, kant: '#fff', lw: 8, r: 30, skugga: false });
          text('RÖRELSEGLÄDJE', x + 420, 304, { px: 64, farg: '#fff', rot: -3, max: 560 });
        }
      });
      c.globalAlpha = 0.4;
      lager(kam, 0.72, 700, (x, i, r) => {
        // mattor och bollvagn
        c.fillStyle = '#4B6FB5'; rundRekt(x + 40, 790, 260, 90, 16); c.fill();
        c.fillStyle = '#3B5A99'; rundRekt(x + 60, 750, 220, 50, 14); c.fill();
        c.fillStyle = '#5A6275'; c.fillRect(x + 420, 770, 140, 110);
        for (let k = 0; k < 3; k++) { c.fillStyle = [F.orange, F.gul, F.korall][k]; cirkel(x + 450 + k * 40, 760, 20); c.fill(); }
      });
      c.globalAlpha = 1;
      golvHall(kam);
    }
  };

  // ---- Skogen (friluftsliv) – slutar i skymning vid lägerelden ----
  MILJOER.skog = {
    hopp: [{ sort: 'stock', w: 170, h: [66, 76] }, { sort: 'sten', w: 120, h: [86, 98] }, { sort: 'back', w: 190, h: [24, 24] }],
    hog: [{ sort: 'stubbe', w: 130, h: [172, 184] }],
    glid: [{ sort: 'gren', w: 300 }, { sort: 'tarp', w: 320 }],
    zon: 'kompass', hjalp: { skala: 0.68, barn: true }, ute: true,
    rita(kam, info) {
      c.fillStyle = himmelGradient(0, MARK, info); c.fillRect(0, 0, W, MARK);
      sol(W * 0.72, info, 70);
      // berg
      const s = info.skymning || 0;
      lager(kam, 0.08, 1200, (x, i, r) => {
        c.fillStyle = mixa('#6A8FD8', '#3B3570', s);
        c.beginPath(); c.moveTo(x - 100, 620); c.lineTo(x + 300, 300 + r * 80); c.lineTo(x + 700, 620); c.lineTo(x + 900, 380); c.lineTo(x + 1300, 620); c.fill();
      });
      const gran = (x, y, h, farg) => {
        c.fillStyle = farg;
        for (let k = 0; k < 3; k++) { const w = h * (0.5 - k * 0.1); c.beginPath(); c.moveTo(x, y - h + k * h * 0.22); c.lineTo(x + w, y - h * 0.35 + k * h * 0.22); c.lineTo(x - w, y - h * 0.35 + k * h * 0.22); c.fill(); }
        c.fillRect(x - h * 0.04, y - h * 0.15, h * 0.08, h * 0.15);
      };
      lager(kam, 0.25, 260, (x, i, r) => gran(x + 100, 700, 300 + r * 160, mixa('#1F7A5A', '#1B2E4A', s)));
      lager(kam, 0.5, 340, (x, i, r) => gran(x + 140, 820, 420 + r * 160, mixa('#178A4C', '#16304A', s)));
      lager(kam, 0.75, 500, (x, i, r) => { c.fillStyle = mixa('#2FBF71', '#1E4D4A', s); cirkel(x + 120, MARK, 90 + r * 40); c.fill(); cirkel(x + 260, MARK + 10, 70); c.fill(); });
      golvGras(kam, mixa('#3DDC84', '#2E7D5B', s), mixa('#7A5233', '#4A3326', s));
      if (s > 0.05) { c.fillStyle = `rgba(20,16,60,${s * 0.25})`; c.fillRect(0, 0, W, H); }
    }
  };

  // ---- Evenemangsplanen (fredag: genomföra) ----
  MILJOER.evenemang = {
    hopp: [{ sort: 'kon', w: 90, h: [80, 90] }, { sort: 'sack', w: 100, h: [92, 104] }, { sort: 'hack', w: 120, h: [96, 106] }],
    hog: [{ sort: 'hinderTorn', w: 140, h: [172, 184] }],
    glid: [{ sort: 'ballonger', w: 320 }, { sort: 'flaggspel', w: 340 }],
    zon: 'medalj', hjalp: { skala: 0.66, barn: true }, ute: true,
    rita(kam, info) {
      c.fillStyle = himmelGradient(0, MARK, info); c.fillRect(0, 0, W, MARK);
      sol(W * 0.25, info, 70);
      lager(kam, 0.1, 900, (x, i, r) => { c.fillStyle = 'rgba(255,255,255,0.9)'; const y = 140 + r * 120; c.beginPath(); c.arc(x + 200, y, 40, 0, 7); c.arc(x + 250, y - 18, 50, 0, 7); c.arc(x + 306, y, 38, 0, 7); c.fill(); });
      // läktare och tält
      lager(kam, 0.3, 1100, (x, i, r) => {
        c.fillStyle = '#5A6E9E'; c.fillRect(x + 80, 560, 520, 160);
        for (let k = 0; k < 4; k++) { c.fillStyle = '#7286B8'; c.fillRect(x + 80, 560 + k * 40, 520, 8); }
        for (let k = 0; k < 12; k++) { c.fillStyle = PALETT[(k + i) % 8]; cirkel(x + 110 + k * 42, 552 + (k % 3) * 40, 14); c.fill(); }
        // tält
        c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x + 700, 720); c.lineTo(x + 700, 560); c.lineTo(x + 820, 470); c.lineTo(x + 940, 560); c.lineTo(x + 940, 720); c.fill();
        for (let k = 0; k < 3; k++) { c.fillStyle = F.korall; c.beginPath(); c.moveTo(x + 700 + k * 80, 560); c.lineTo(x + 740 + k * 80, 560); c.lineTo(x + 820, 470); c.fill(); }
      });
      lager(kam, 0.45, 1400, (x, i, r) => {
        const rubrik = info.inriktning === 'fh' ? 'TURNERING!' : 'IDROTTSDAG!';
        c.fillStyle = '#5A6275'; c.fillRect(x + 220, 380, 12, 330); c.fillRect(x + 900, 380, 12, 330);
        klistermarke(x + 566, 420, 740, 140, { rot: -3, fyll: F.gul, kant: F.svart, lw: 8, r: 30, skugga: false });
        text(rubrik, x + 566, 426, { px: 84, farg: F.svart, rot: -3, max: 700 });
        // ballonger
        for (let k = 0; k < 4; k++) { const bx = x + 1050 + k * 50, by = 360 + Math.sin(nu() * 2 + k) * 10; c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(bx, by + 34); c.lineTo(x + 1120, 560); c.stroke(); c.fillStyle = PALETT[k + 1]; c.beginPath(); c.ellipse(bx, by, 28, 34, 0, 0, 7); c.fill(); }
      });
      // staket
      lager(kam, 0.8, 240, (x) => { c.fillStyle = '#FFFFFF'; c.fillRect(x + 20, 790, 14, 90); c.fillRect(x, 810, 240, 10); c.fillRect(x, 846, 240, 10); });
      golvGras(kam, '#45D17F', '#3BB46E');
      c.fillStyle = '#fff'; for (let x = -(kam % 600); x < W; x += 600) c.fillRect(x, MARK + 60, 300, 8);
    }
  };

  /* =====================================================================
     Hinder – ritas med vänsterkant x och marken MARK
     ===================================================================== */
  function bocker(x, ob, n) {
    const h = ob.h, bh = h / n;
    kontur();
    for (let i = 0; i < n; i++) {
      const by = MARK - (i + 1) * bh, sk = (hash(ob.slump * 100 + i) - 0.5) * 22, bw = ob.w - 10 - hash(ob.slump * 50 + i) * 18;
      c.fillStyle = PALETT[(Math.floor(ob.slump * 7) + i * 2) % PALETT.length];
      rundRekt(x + (ob.w - bw) / 2 + sk, by, bw, bh - 2, 6); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.85)'; c.fillRect(x + (ob.w - bw) / 2 + sk + bw - 22, by + 6, 12, bh - 14);
    }
  }
  function lador(x, ob, n, farg, rita) {
    const bh = ob.h / n; kontur();
    for (let i = 0; i < n; i++) { const by = MARK - (i + 1) * bh, sk = (hash(ob.slump * 77 + i) - 0.5) * 16; rundRekt(x + sk, by, ob.w, bh - 2, 8); fs(farg(i)); if (rita) rita(x + sk, by, ob.w, bh, i); }
  }
  // hängande hinder: en lina från taket ner till objektet
  function lina(x, yTill) { kontur(); c.beginPath(); c.moveTo(x, 0); c.lineTo(x, yTill); c.stroke(); }
  const NERE = MARK - GLIDFRI;

  const HINDER = {
    // klassrum/labb
    bokhog(x, ob) { bocker(x, ob, 3); },
    bokhogHog(x, ob) { bocker(x, ob, 5); },
    ryggsack(x, ob) {
      const w = ob.w, h = ob.h, y = MARK - h, farg = PALETT[Math.floor(ob.slump * 8)];
      kontur();
      c.beginPath(); c.arc(x + w / 2, y + 14, 22, Math.PI, 0); c.stroke();
      rundRekt(x + 4, y + 10, w - 8, h - 10, 30); fs(farg);
      c.fillStyle = 'rgba(255,255,255,0.25)'; rundRekt(x + 18, y + 24, 16, h - 50, 8); c.fill();
      c.fillStyle = 'rgba(0,0,0,0.18)'; rundRekt(x + 20, y + h * 0.5, w - 40, h * 0.38, 14); c.fill(); kontur(); c.stroke();
      c.beginPath(); c.moveTo(x + 30, y + h * 0.5 + 10); c.lineTo(x + w - 30, y + h * 0.5 + 10); c.stroke();
    },
    stol(x, ob) {
      const w = ob.w, h = ob.h, y = MARK - h, sits = MARK - h * 0.48;
      kontur(); c.fillStyle = F.turkos;
      rundRekt(x + w - 26, y, 22, sits - y + 6, 8); c.fill(); c.stroke();
      rundRekt(x + 2, sits - 4, w - 4, 18, 8); c.fill(); c.stroke();
      c.fillStyle = '#9AA3C2';
      c.fillRect(x + 10, sits + 14, 10, MARK - sits - 14); c.strokeRect(x + 10, sits + 14, 10, MARK - sits - 14);
      c.fillRect(x + w - 22, sits + 14, 10, MARK - sits - 14); c.strokeRect(x + w - 22, sits + 14, 10, MARK - sits - 14);
    },
    provror(x, ob) {
      const w = ob.w, h = ob.h, y = MARK - h, vatsk = [F.gron, F.rosa, F.bla, F.gul];
      kontur();
      for (let i = 0; i < 4; i++) {
        const tx = x + 16 + i * 26, ty = y + (i % 2) * 8;
        c.fillStyle = 'rgba(255,255,255,0.85)'; rundRekt(tx, ty, 18, h - 20, 9); c.fill(); c.stroke();
        c.fillStyle = vatsk[i]; rundRekt(tx + 3, ty + (h - 20) * 0.45, 12, (h - 20) * 0.5, 6); c.fill();
      }
      rundRekt(x, MARK - 44, w, 18, 6); fs('#C98A4A');
      c.fillRect(x + 6, MARK - 30, 12, 30); c.strokeRect(x + 6, MARK - 30, 12, 30);
      c.fillRect(x + w - 18, MARK - 30, 12, 30); c.strokeRect(x + w - 18, MARK - 30, 12, 30);
    },
    kolv(x, ob) {
      const w = ob.w, h = ob.h, y = MARK - h; kontur();
      c.beginPath(); c.moveTo(x + w / 2 - 14, y); c.lineTo(x + w / 2 + 14, y); c.lineTo(x + w / 2 + 14, y + h * 0.35); c.lineTo(x + w, MARK - 4); c.lineTo(x, MARK - 4); c.lineTo(x + w / 2 - 14, y + h * 0.35); c.closePath(); fs('rgba(255,255,255,0.9)');
      c.fillStyle = F.lila; c.beginPath(); c.moveTo(x + 22, MARK - 34); c.lineTo(x + w - 22, MARK - 34); c.lineTo(x + w - 6, MARK - 8); c.lineTo(x + 6, MARK - 8); c.fill();
      for (let i = 0; i < 3; i++) { c.fillStyle = 'rgba(255,255,255,0.7)'; cirkel(x + w / 2 + Math.sin(nu() * 3 + i) * 8, y - 14 - ((nu() * 40 + i * 18) % 50), 6); c.fill(); }
    },
    projektor(x, ob) {
      const w = ob.w, topp = NERE - 250;
      lina(x + 30, topp); lina(x + w - 30, topp);
      kontur(); rundRekt(x - 10, topp - 10, w + 20, 26, 12); fs('#3A3F5C');
      c.fillStyle = '#FFFFFF'; c.fillRect(x, topp + 16, w, NERE - topp - 30); c.strokeRect(x, topp + 16, w, NERE - topp - 30);
      const bas = NERE - 40;
      [[F.korall, 60], [F.gul, 110], [F.turkos, 150], [F.lila, 90]].forEach(([f, hh], i) => { c.fillStyle = f; c.fillRect(x + 40 + i * 46, bas - hh, 32, hh); });
      kontur(); rundRekt(x + 4, NERE - 18, w - 8, 18, 9); fs('#3A3F5C');
    },
    plansch(x, ob) { girlang(x, ob, [['A', F.korall], ['√', F.gul], ['Hej!', F.turkos]]); },
    lampa(x, ob) {
      const w = ob.w; lina(x + w / 2, NERE - 80);
      kontur(); c.beginPath(); c.moveTo(x + 30, NERE); c.lineTo(x + w - 30, NERE); c.lineTo(x + w / 2 + 30, NERE - 90); c.lineTo(x + w / 2 - 30, NERE - 90); c.closePath(); fs(F.turkos);
      c.globalAlpha = 0.25; c.fillStyle = '#FFF4B0'; c.beginPath(); c.moveTo(x + 30, NERE); c.lineTo(x + w - 30, NERE); c.lineTo(x + w + 30, MARK); c.lineTo(x - 30, MARK); c.fill(); c.globalAlpha = 1;
    },
    // planeringsrummet
    parmar(x, ob) {
      const h = ob.h; kontur();
      for (let i = 0; i < 4; i++) { const px = x + i * 30, lut = i === 3 ? 0.25 : 0; c.save(); c.translate(px + 14, MARK); c.rotate(lut); rundRekt(-14, -h, 28, h, 4); fs(PALETT[(i + Math.floor(ob.slump * 8)) % 8]); c.fillStyle = '#fff'; c.fillRect(-8, -h + 16, 16, 30); c.restore(); }
    },
    kartong(x, ob) { kartong(x, ob.w, ob.h, ob.slump); },
    kartongHog(x, ob) { kartong(x, ob.w, ob.h * 0.5, ob.slump); kartong(x + 8, ob.w - 16, ob.h * 0.5, ob.slump + 1, MARK - ob.h * 0.5); },
    postitGirlang(x, ob) { girlang(x, ob, [['Syfte', F.gul], ['Tid', F.rosa], ['Mat.', F.turkos]]); },
    banderoll(x, ob) {
      const w = ob.w; lina(x + 20, NERE - 110); lina(x + w - 20, NERE - 110);
      kontur(); c.save(); c.translate(x + w / 2, NERE - 55); c.rotate(-0.04 + Math.sin(nu() * 2 + ob.slump * 6) * 0.03);
      rundRekt(-w / 2, -55, w, 110, 18); fs(F.korall);
      text('FREDAG!', 0, 3, { px: 54, farg: '#fff', max: w - 40 });
      c.restore();
    },
    // förskolan
    klosstorn(x, ob) { klossar(x, ob, 3); },
    klosstornHog(x, ob) { klossar(x, ob, 5); },
    leksaksbil(x, ob) {
      const w = ob.w, h = ob.h; kontur();
      rundRekt(x + 4, MARK - h + 4, w - 8, h - 26, 18); fs(F.korall);
      rundRekt(x + 30, MARK - h - 16, w * 0.45, 30, 10); fs('#BDEBFF');
      for (const hx of [x + 34, x + w - 34]) { cirkel(hx, MARK - 20, 20); fs(F.svart); cirkel(hx, MARK - 20, 8); c.fillStyle = '#ccc'; c.fill(); }
    },
    vattenpol(x, ob) {
      c.fillStyle = '#5BB8FF'; c.beginPath(); c.ellipse(x + ob.w / 2, MARK + 6, ob.w / 2, 18, 0, 0, 7); c.fill();
      c.lineWidth = 4; c.strokeStyle = '#2A7FD0'; c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.ellipse(x + ob.w / 2 + Math.sin(nu() * 4) * 10, MARK + 4, 30, 6, 0, 0, 7); c.stroke();
      // stövlar bredvid visar att den ska hoppas över
      kontur(4); rundRekt(x + ob.w - 30, MARK - 40, 20, 40, 6); fs(F.gul); rundRekt(x + ob.w - 6, MARK - 40, 20, 40, 6); fs(F.gul);
    },
    pysselGirlang(x, ob) {
      const w = ob.w; kontur(); c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 4, NERE - 100); c.quadraticCurveTo(x + w / 2, NERE - 60, x + w - 4, NERE - 100); c.lineTo(x + w, 0); c.stroke();
      for (let i = 0; i < 6; i++) {
        const t = (i + 0.5) / 6, px = x + 4 + t * (w - 8), py = NERE - 100 + Math.sin(Math.PI * t) * 30;
        c.beginPath(); c.moveTo(px - 24, py); c.lineTo(px + 24, py); c.lineTo(px, py + 60 - Math.sin(Math.PI * t) * 20); c.closePath(); fs(PALETT[i]);
      }
    },
    mobil(x, ob) {
      const w = ob.w; lina(x + w / 2, NERE - 120);
      kontur(); c.beginPath(); c.moveTo(x + 20, NERE - 120); c.lineTo(x + w - 20, NERE - 120); c.stroke();
      ['★', '☾', '★'].forEach((s, i) => { const px = x + 30 + i * (w - 60) / 2, sv = Math.sin(nu() * 2 + i) * 6; c.beginPath(); c.moveTo(px, NERE - 120); c.lineTo(px + sv, NERE - 60); c.stroke(); text(s, px + sv, NERE - 32, { px: 62, farg: [F.gul, '#fff', F.rosa][i], kant: F.svart, kantB: 6 }); });
    },
    // fritidsgården
    hantlar(x, ob) {
      const h = ob.h; kontur(); rundRekt(x, MARK - h, ob.w, 14, 6); fs('#5A6275'); c.fillRect(x + 10, MARK - h + 14, 12, h - 14); c.strokeRect(x + 10, MARK - h + 14, 12, h - 14); c.fillRect(x + ob.w - 22, MARK - h + 14, 12, h - 14); c.strokeRect(x + ob.w - 22, MARK - h + 14, 12, h - 14);
      for (let r = 0; r < 2; r++) for (let i = 0; i < 2; i++) { const hx = x + 30 + i * 46, hy = MARK - h + 34 + r * 34; c.lineWidth = 8; c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + 30, hy); c.stroke(); kontur(4); rundRekt(hx - 8, hy - 12, 12, 24, 4); fs(F.korall); rundRekt(hx + 26, hy - 12, 12, 24, 4); fs(F.korall); }
    },
    sittsack(x, ob) {
      const w = ob.w, h = ob.h; kontur();
      c.beginPath(); c.moveTo(x + 10, MARK); c.quadraticCurveTo(x - 6, MARK - h * 0.7, x + w * 0.4, MARK - h); c.quadraticCurveTo(x + w + 6, MARK - h * 0.9, x + w - 6, MARK); c.closePath(); fs(F.gul);
      c.strokeStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.moveTo(x + w * 0.4, MARK - h + 10); c.quadraticCurveTo(x + w * 0.5, MARK - h * 0.5, x + w * 0.35, MARK - 10); c.stroke();
    },
    pingisbord(x, ob) {
      const w = ob.w, h = ob.h; kontur();
      c.fillStyle = '#5A6275'; c.fillRect(x + 20, MARK - h + 16, 14, h - 16); c.strokeRect(x + 20, MARK - h + 16, 14, h - 16); c.fillRect(x + w - 34, MARK - h + 16, 14, h - 16); c.strokeRect(x + w - 34, MARK - h + 16, 14, h - 16);
      rundRekt(x, MARK - h, w, 20, 6); fs('#2A6FD6'); c.fillStyle = '#fff'; c.fillRect(x + w / 2 - 3, MARK - h - 22, 6, 22);
      c.fillStyle = 'rgba(255,255,255,0.4)'; c.fillRect(x + w / 2 - 30, MARK - h - 18, 60, 16);
    },
    hogtalare(x, ob) {
      lador(x, ob, 2, () => '#2B2B3A', (lx, ly, w, bh) => { c.fillStyle = '#555'; cirkel(lx + w / 2, ly + bh / 2, bh * 0.3); c.fill(); c.stroke(); c.fillStyle = F.rosa; cirkel(lx + w / 2, ly + bh / 2, bh * 0.1); c.fill(); });
    },
    basketkorg(x, ob) {
      const w = ob.w; lina(x + 40, NERE - 190); lina(x + w - 40, NERE - 190);
      kontur(); rundRekt(x, NERE - 200, w, 150, 10); fs('#fff');
      c.strokeStyle = F.korall; c.lineWidth = 6; c.strokeRect(x + w / 2 - 50, NERE - 130, 100, 70);
      kontur(); c.strokeStyle = F.orange; c.lineWidth = 9; c.beginPath(); c.ellipse(x + w / 2, NERE - 40, 56, 12, 0, 0, 7); c.stroke();
      c.strokeStyle = '#fff'; c.lineWidth = 3; for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(x + w / 2 + k * 22, NERE - 34); c.lineTo(x + w / 2 + k * 14, NERE); c.stroke(); }
    },
    discokula(x, ob) {
      const w = ob.w, cy = NERE - 80; lina(x + w / 2, cy - 76);
      kontur(); cirkel(x + w / 2, cy, 78); fs('#C9CDEA');
      c.save(); cirkel(x + w / 2, cy, 74); c.clip();
      for (let i = -4; i < 5; i++) for (let k = -4; k < 5; k++) { c.fillStyle = (i + k + Math.floor(nu() * 6)) % 3 === 0 ? '#fff' : (i + k) % 2 ? '#9AA3C2' : '#E8ECF7'; c.fillRect(x + w / 2 + i * 18 - 8, cy + k * 18 - 8, 16, 16); }
      c.restore();
      c.globalAlpha = 0.5 + 0.5 * Math.sin(nu() * 8); text('✦', x + w / 2 + 50, cy - 50, { px: 40, farg: '#fff' }); c.globalAlpha = 1;
    },
    // idrottshallen
    plint(x, ob) { lador(x, ob, 3, i => i === 2 ? '#F2E6C8' : '#C98A4A'); },
    plintHog(x, ob) { lador(x, ob, 5, i => i === 4 ? '#F2E6C8' : '#C98A4A'); },
    bank(x, ob) {
      const w = ob.w, h = ob.h; kontur();
      rundRekt(x, MARK - h, w, 20, 6); fs('#D9A35A');
      for (const bx of [x + 16, x + w - 36]) { c.fillStyle = '#A9773A'; c.fillRect(bx, MARK - h + 20, 20, h - 20); c.strokeRect(bx, MARK - h + 20, 20, h - 20); }
      c.fillRect(x + 16, MARK - 26, w - 32, 10); c.strokeRect(x + 16, MARK - 26, w - 32, 10);
    },
    boll(x, ob) {
      const b = bollStuds(ob), r = ob.w / 2, cy = MARK - r - b;
      c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.ellipse(x + r, MARK + 4, r * (1 - b / 120), 8, 0, 0, 7); c.fill();
      kontur(); cirkel(x + r, cy, r); fs(F.orange);
      c.beginPath(); c.moveTo(x, cy); c.lineTo(x + 2 * r, cy); c.moveTo(x + r, cy - r); c.lineTo(x + r, cy + r); c.stroke();
      c.beginPath(); c.arc(x + r - r * 1.1, cy, r * 0.9, -0.9, 0.9); c.stroke(); c.beginPath(); c.arc(x + r + r * 1.1, cy, r * 0.9, Math.PI - 0.9, Math.PI + 0.9); c.stroke();
    },
    ringar(x, ob) {
      const w = ob.w;
      for (const rx of [x + 50, x + w - 50]) { const sv = Math.sin(nu() * 2 + ob.slump * 6) * 8; lina(rx, NERE - 60); kontur(); c.beginPath(); c.moveTo(rx, NERE - 60); c.lineTo(rx + sv, NERE - 40); c.stroke(); c.lineWidth = 12; c.strokeStyle = F.svart; cirkel(rx + sv, NERE - 18, 22); c.stroke(); c.lineWidth = 6; c.strokeStyle = '#E8C27A'; c.stroke(); }
      c.fillStyle = F.korall; kontur(); rundRekt(x + 30, NERE - 90, w - 60, 30, 12); fs(F.korall);
    },
    hopprep(x, ob) {
      const w = ob.w, sv = Math.sin(nu() * 6) * 16;
      kontur(); rundRekt(x - 6, NERE - 140, 26, 60, 8); fs('#5A6275'); rundRekt(x + w - 20, NERE - 140, 26, 60, 8); fs('#5A6275');
      lina(x + 7, NERE - 140); lina(x + w - 7, NERE - 140);
      c.lineWidth = 14; c.strokeStyle = F.svart; c.beginPath(); c.moveTo(x + 7, NERE - 90); c.quadraticCurveTo(x + w / 2, NERE + 40 + sv, x + w - 7, NERE - 90); c.stroke();
      c.lineWidth = 7; c.strokeStyle = F.rosa; c.stroke();
    },
    // skogen
    stock(x, ob) {
      const w = ob.w, h = ob.h; kontur();
      rundRekt(x, MARK - h, w, h, h / 2); fs('#8A5A35');
      c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 4; c.beginPath(); c.moveTo(x + 30, MARK - h * 0.6); c.lineTo(x + w - 50, MARK - h * 0.6); c.moveTo(x + 50, MARK - h * 0.3); c.lineTo(x + w - 70, MARK - h * 0.3); c.stroke();
      kontur(); c.beginPath(); c.ellipse(x + w - h / 2, MARK - h / 2, h / 2 - 6, h / 2 - 3, 0, 0, 7); fs('#E6B97E');
      c.strokeStyle = '#B98A55'; c.lineWidth = 3; c.beginPath(); c.ellipse(x + w - h / 2, MARK - h / 2, h / 4, h / 4, 0, 0, 7); c.stroke();
    },
    sten(x, ob) {
      const w = ob.w, h = ob.h; kontur();
      c.beginPath(); c.moveTo(x, MARK); c.lineTo(x + 8, MARK - h * 0.6); c.lineTo(x + w * 0.35, MARK - h); c.lineTo(x + w * 0.8, MARK - h * 0.85); c.lineTo(x + w, MARK - h * 0.3); c.lineTo(x + w, MARK); c.closePath(); fs('#8E96A8');
      c.fillStyle = '#3DDC84'; c.beginPath(); c.ellipse(x + w * 0.45, MARK - h + 8, 26, 8, -0.2, 0, 7); c.fill();
    },
    back(x, ob) {
      // en bäck – en lucka i marken
      c.fillStyle = '#3E2A1C'; c.fillRect(x, MARK, ob.w, H - MARK);
      const g = c.createLinearGradient(0, MARK + 10, 0, H); g.addColorStop(0, '#5BB8FF'); g.addColorStop(1, '#1E5FA8');
      c.fillStyle = g; c.fillRect(x + 8, MARK + 18, ob.w - 16, H - MARK);
      c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 4;
      for (let k = 0; k < 3; k++) { const yy = MARK + 40 + k * 40; c.beginPath(); c.moveTo(x + 20 + ((nu() * 80 + k * 30) % 60), yy); c.lineTo(x + 70 + ((nu() * 80 + k * 30) % 60), yy); c.stroke(); }
      kontur(4); cirkel(x + 4, MARK + 8, 14); fs('#8E96A8'); cirkel(x + ob.w - 4, MARK + 10, 16); fs('#8E96A8');
    },
    stubbe(x, ob) {
      const w = ob.w, h = ob.h; kontur();
      c.beginPath(); c.moveTo(x - 10, MARK); c.lineTo(x + 10, MARK - h); c.lineTo(x + w - 10, MARK - h); c.lineTo(x + w + 10, MARK); c.closePath(); fs('#7A4E2D');
      c.beginPath(); c.ellipse(x + w / 2, MARK - h, w / 2 - 10, 16, 0, 0, 7); fs('#E6B97E');
      c.fillStyle = '#E04F5F'; cirkel(x + w - 20, MARK - h * 0.4, 14); c.fill(); c.stroke(); c.fillStyle = '#fff'; cirkel(x + w - 24, MARK - h * 0.4 - 4, 3); c.fill();
    },
    gren(x, ob) {
      const w = ob.w; kontur(14);
      c.strokeStyle = '#6B4426'; c.lineWidth = 26; c.beginPath(); c.moveTo(x - 60, 0); c.quadraticCurveTo(x + 40, NERE - 120, x + w, NERE - 60); c.stroke();
      for (let i = 0; i < 6; i++) { const t = 0.25 + i * 0.13; const px = x - 60 + (w + 60) * t, py = (NERE - 90) * Math.sqrt(t) + 10; kontur(); c.beginPath(); c.ellipse(px, py + 20, 50, 32, 0.3, 0, 7); fs(i % 2 ? '#2FBF71' : '#27A862'); }
    },
    tarp(x, ob) {
      const w = ob.w; lina(x + 10, NERE - 40); lina(x + w - 10, NERE - 40);
      kontur(); c.beginPath(); c.moveTo(x - 10, NERE); c.lineTo(x + w / 2, NERE - 120); c.lineTo(x + w + 10, NERE); c.closePath(); fs(F.orange);
      c.strokeStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.moveTo(x + w / 2, NERE - 120); c.lineTo(x + w / 2, NERE); c.stroke();
    },
    // evenemanget
    kon(x, ob) {
      const w = ob.w, h = ob.h; kontur();
      c.beginPath(); c.moveTo(x + w / 2 - 12, MARK - h); c.lineTo(x + w / 2 + 12, MARK - h); c.lineTo(x + w - 10, MARK - 12); c.lineTo(x + 10, MARK - 12); c.closePath(); fs(F.orange);
      c.fillStyle = '#fff'; c.fillRect(x + w / 2 - 20, MARK - h * 0.55, 40, 12);
      rundRekt(x, MARK - 14, w, 14, 4); fs(F.orange);
    },
    sack(x, ob) {
      const w = ob.w, h = ob.h; kontur();
      c.beginPath(); c.moveTo(x + 8, MARK); c.lineTo(x + 14, MARK - h + 14); c.quadraticCurveTo(x + w / 2, MARK - h - 10, x + w - 14, MARK - h + 14); c.lineTo(x + w - 8, MARK); c.closePath(); fs('#C9A26A');
      c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 3; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(x + 20, MARK - 20 - k * 22); c.lineTo(x + w - 20, MARK - 20 - k * 22); c.stroke(); }
      text(String(1 + Math.floor(ob.slump * 9)), x + w / 2, MARK - h / 2, { px: 40, farg: F.korall, kant: '#fff', kantB: 6 });
    },
    hack(x, ob) {
      const w = ob.w, h = ob.h; kontur();
      for (const bx of [x + 8, x + w - 22]) { c.fillStyle = '#fff'; c.fillRect(bx, MARK - h, 14, h); c.strokeRect(bx, MARK - h, 14, h); }
      rundRekt(x, MARK - h, w, 24, 6); fs(F.korall); c.fillStyle = '#fff'; c.fillRect(x + w / 2 - 14, MARK - h + 2, 28, 20);
    },
    hinderTorn(x, ob) { lador(x, ob, 3, i => [F.bla, F.gul, F.korall][i], (lx, ly, w, bh) => { c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(lx + 14, ly + 10, 14, bh - 22); }); },
    ballonger(x, ob) {
      const w = ob.w; lina(x + 10, NERE - 60); lina(x + w - 10, NERE - 60);
      for (let i = 0; i < 7; i++) { const t = i / 6, bx = x + 10 + t * (w - 20), by = NERE - 60 + Math.sin(Math.PI * t) * 26 + Math.sin(nu() * 2 + i) * 4; kontur(); c.beginPath(); c.ellipse(bx, by, 32, 38, 0, 0, 7); fs(PALETT[i % 8]); c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.ellipse(bx - 10, by - 12, 6, 10, -0.4, 0, 7); c.fill(); }
    },
    flaggspel(x, ob) { girlang(x, ob, [['', F.korall], ['', F.gul], ['', F.turkos], ['', F.lila]], true); }
  };
  function girlang(x, ob, lappar, flaggor) {
    const w = ob.w, snore = NERE - 150;
    kontur();
    c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 6, snore); c.quadraticCurveTo(x + w / 2, snore + 30, x + w - 6, snore); c.lineTo(x + w, 0); c.stroke();
    const n = lappar.length, steg = (w - 40) / n;
    lappar.forEach(([t, f], i) => {
      const px = x + 20 + i * steg + steg / 2, sv = Math.sin(nu() * 3 + i + ob.slump * 6) * 0.06;
      c.save(); c.translate(px, snore + 14); c.rotate(sv);
      kontur();
      if (flaggor) { c.beginPath(); c.moveTo(-steg / 2 + 6, 0); c.lineTo(steg / 2 - 6, 0); c.lineTo(0, 136); c.closePath(); fs(f); }
      else { rundRekt(-40, 0, 80, 136, 10); fs(f); text(t, 0, 70, { px: t.length > 2 ? 28 : 52, farg: F.svart, max: 70 }); }
      c.restore();
    });
  }
  function kartong(x, w, h, slump, botten = MARK) {
    kontur(); rundRekt(x, botten - h, w, h, 6); fs('#D9A35A');
    c.fillStyle = '#C08A4A'; c.fillRect(x + w / 2 - 14, botten - h, 28, h * 0.4);
    // material som sticker upp
    c.save(); c.beginPath(); c.rect(x - 20, botten - h - 40, w + 40, 40); c.clip();
    c.fillStyle = F.orange; c.beginPath(); c.moveTo(x + 20, botten - h); c.lineTo(x + 34, botten - h - 34); c.lineTo(x + 48, botten - h); c.fill(); c.stroke();
    cirkel(x + w - 30, botten - h, 22); fs(PALETT[Math.floor(slump * 8) % 8]);
    c.restore();
  }
  function klossar(x, ob, n) {
    const bh = ob.h / n; kontur();
    for (let i = 0; i < n; i++) {
      const by = MARK - (i + 1) * bh, sk = (hash(ob.slump * 61 + i) - 0.5) * 18, bw = ob.w - (i % 2) * 14;
      rundRekt(x + (ob.w - bw) / 2 + sk, by, bw, bh - 2, 8); fs(PALETT[(i + Math.floor(ob.slump * 8)) % 8]);
      text('ABCDEFG'[(i + Math.floor(ob.slump * 7)) % 7], x + ob.w / 2 + sk, by + bh / 2, { px: bh * 0.6, farg: '#fff', kant: F.svart, kantB: 5 });
    }
  }
  function bollStuds(ob) { return 46 * Math.abs(Math.sin((B.tid || 0) * 4.2 + ob.slump * 6)); }

  // Specialträffytor (världskoordinater). Övriga hinder använder standardytan i spel.js.
  const YTA = {
    vattenpol: ob => ({ x1: ob.x + 30, x2: ob.x + ob.w - 30, y1: MARK - 4, y2: MARK + 40 }),
    back: ob => ({ x1: ob.x + 24, x2: ob.x + ob.w - 24, y1: MARK - 4, y2: MARK + 40 }),
    boll: ob => { const b = bollStuds(ob); return { x1: ob.x + 10, x2: ob.x + ob.w - 10, y1: MARK - ob.w - b + 10, y2: MARK - b }; }
  };

  Object.assign(B, { MILJOER, HINDER, YTA, GLIDFRI, himmel });
})();
