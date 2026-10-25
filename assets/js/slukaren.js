/* Begreppsslukaren – gemensam kod för fritt spel, elevsidan och lärarsidan.

   SL.Varld     reglerna. Körs lokalt i fritt spel och hos läraren (tavlan) i klassrumsläget.
   SL.Bot       datorstyrda spelare i fritt spel.
   SL.rita      ritar kartan på en canvas (används av alla tre).
   SL.Styrning  mus, piltangenter/WASD och dra-joystick på mobil.
   SL.FragaVy   frågan stort under frysen och som banderoll under jakten.

   Kräver dlg-spel.js (för DLGSpel.ned, shuffle och esc).
*/
(function () {
  'use strict';

  /* ---------- regler och siffror ----------
     Ändrar du något här gäller det både fritt spel och klassrum. */
  const REGLER = {
    startMassa: 20,             // också minsta möjliga massa
    facit: 1.5,                 // "Rätt svar var: X" (från fråga 2)
    frys: 4,                    // frågan visas, allt står still
    jakt: 15,                   // standardtid för jakten
    rattBas: 30,                // tillväxt för rätt svar (+ ikapp-bonus)
    felKrymp: 0.10, segTid: 2, segFaktor: 0.5,
    kraftTid: 6, skyddTid: 3, stold: 0.15,
    bitR: 34,                   // svarsbitens träffradie i världen
    felPerRatt: { latt: 2, normal: 3, hardcore: 4 },
    botTraff: { latt: 0.35, normal: 0.55, hardcore: 0.75 },
    // Smulorna ska ge ungefär en tiondel av tillväxten (mätt i test), aldrig mer än en fjärdedel.
    smulTak: 5,                 // max neutrala smulor på kartan per spelare
    smulTakt: 0.2,              // nya smulor per spelare och sekund (bara under jakten)
    smulStart: 3                // smulor per spelare när omgången börjar
  };

  const FARGER = [
    { namn: 'Gul', hex: '#F7D563' }, { namn: 'Himmel', hex: '#C9E0EE' }, { namn: 'Rosa', hex: '#F1D9EA' },
    { namn: 'Mint', hex: '#E1EFE3' }, { namn: 'Lavendel', hex: '#848AC4' }, { namn: 'Röd', hex: '#A43033' },
    { namn: 'Skog', hex: '#205B4F' }, { namn: 'Grädde', hex: '#F8EAA4' }
  ];
  const SMUL_FARGER = ['#C9E0EE', '#F1D9EA', '#E1EFE3', '#F8EAA4', '#848AC4'];

  const radie = m => 6 * Math.sqrt(m);
  // Ungefär 1/√massa, men lite mjukare (m^-0.45) så att stora blobbar inte blir orörliga.
  const fart = m => 260 * Math.pow(REGLER.startMassa / m, 0.45);
  const kartStorlek = n => Math.round(1300 + 230 * Math.sqrt(Math.max(1, n)));
  const median = arr => { const s = arr.slice().sort((a, b) => a - b), h = s.length >> 1; return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };
  const ljus = hex => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 150; };
  const slump = (a, b) => a + Math.random() * (b - a);

  /* ======================================================================
     Varld – en omgång med spelare, smulor, svarsbitar och faser.
     fas: 'lobby' → ('facit' →) 'frys' → 'jakt' → ... → 'slut'
     ====================================================================== */
  class Varld {
    constructor(o) {
      this.bana = o.bana;
      this.fragor = o.fragor;
      this.niva = o.niva || 'normal';
      this.jaktTid = o.jaktTid || REGLER.jakt;
      this.slutVillkor = o.slutVillkor || { typ: 'fragor', antal: 10 };
      this.raknaSvar = o.raknaSvar || (b => !b.bot);   // vems svar som går in i fragor.svara
      this.on = o.on || (() => {});
      this.logga = !!o.logga;                          // spara ändringar för nätet (läraren)
      this.blobbar = [];
      this.smulor = new Map();
      this.bitar = new Map();
      this.nastaId = 1; this.nastaSmula = 1; this.nastaBit = 1;
      this.L = kartStorlek(1);
      this.fas = 'lobby'; this.fasTid = 0; this.nr = 0; this.speltid = 0; this.pausad = false;
      this.fraga = null; this.forraSvar = null; this.rattKvar = 0; this.smulAck = 0;
      this.andr = { smulNy: [], smulBort: [], bitNy: [], bitBort: [] };
      this.matt = { smul: 0, ratt: 0, klump: 0 };       // för att kontrollera balansen
    }

    get antalFragor() { return this.slutVillkor.typ === 'fragor' ? this.slutVillkor.antal : null; }
    get tidKvar() { return this.slutVillkor.typ === 'tid' ? Math.max(0, this.slutVillkor.sek - this.speltid) : null; }

    laggTill(p) {
      const b = {
        id: p.id != null ? p.id : this.nastaId++, namn: p.namn, farg: p.farg, bot: !!p.bot,
        x: this.L / 2, y: this.L / 2, vx: 0, vy: 0, m: REGLER.startMassa,
        kraft: 0, skydd: 0, seg: 0, styr: { x: 0, y: 0 }, offline: false,
        ratt: 0, fel: 0, missade: {}, rattNu: false, felNu: false
      };
      this.nastaId = Math.max(this.nastaId, b.id + 1);
      this.blobbar.push(b);
      if (this.fas !== 'lobby') this.placera(b);
      return b;
    }
    taBort(id) { this.blobbar = this.blobbar.filter(b => b.id !== id); }
    blobb(id) { return this.blobbar.find(b => b.id === id); }
    styr(id, x, y) {
      const b = this.blobb(id); if (!b) return;
      const l = Math.hypot(x, y);
      b.styr = l > 1 ? { x: x / l, y: y / l } : { x, y };
    }

    placera(b) {
      const r = radie(b.m);
      for (let f = 0; f < 40; f++) {
        b.x = slump(r + 40, this.L - r - 40); b.y = slump(r + 40, this.L - r - 40);
        if (this.blobbar.every(o => o === b || Math.hypot(o.x - b.x, o.y - b.y) > 220)) return;
      }
    }

    start() {
      this.L = kartStorlek(this.blobbar.length);
      this.blobbar.forEach(b => { b.x = -1e4; });
      this.blobbar.forEach(b => this.placera(b));
      for (let i = 0; i < Math.round(REGLER.smulStart * this.blobbar.length); i++) this.nySmula();
      this.speltid = 0; this.nr = 0;
      this.nastaFraga();
    }

    satFas(fas, tid) { this.fas = fas; this.fasTid = tid; this.on('fas', { fas }); }

    nastaFraga() {
      this.nr++;
      const q = this.fragor.nasta(2, 'def');
      this.fraga = { begrepp: q.begrepp, text: q.fraga, svar: q.svar };
      this.blobbar.forEach(b => { b.rattNu = false; b.felNu = false; });
      if (this.nr > 1 && this.forraSvar) this.satFas('facit', REGLER.facit);
      else this.satFas('frys', REGLER.frys);
    }

    startaJakt() {
      const n = this.blobbar.length;
      const k = Math.max(1, Math.round(n / 4));
      const w = Math.max(2, Math.round(k * (REGLER.felPerRatt[this.niva] || 3)));
      const andra = this.bana.begrepp.filter(b => b.ord !== this.fraga.svar);
      let pool = [];
      const texter = [];
      for (let i = 0; i < w; i++) {
        if (!pool.length) pool = DLGSpel.shuffle(andra);
        texter.push({ text: pool.pop().ord, ratt: false });
      }
      for (let i = 0; i < k; i++) texter.push({ text: this.fraga.svar, ratt: true });
      DLGSpel.shuffle(texter).forEach(t => {
        const bit = { id: this.nastaBit++, x: 0, y: 0, text: t.text, ratt: t.ratt };
        this.hittaPlats(bit);
        this.bitar.set(bit.id, bit);
        if (this.logga) this.andr.bitNy.push(bit);
      });
      this.rattKvar = k;
      this.satFas('jakt', this.jaktTid);
    }

    hittaPlats(bit) {
      const m = 90;
      let bast = null, bastPoang = -1;
      for (let f = 0; f < 60; f++) {
        const x = slump(m, this.L - m), y = slump(m, this.L - m);
        let narm = Infinity;
        this.blobbar.forEach(b => { narm = Math.min(narm, Math.hypot(b.x - x, b.y - y) - radie(b.m) - 60); });
        this.bitar.forEach(o => { narm = Math.min(narm, Math.hypot(o.x - x, o.y - y) - 90); });
        if (narm > 120) { bit.x = x; bit.y = y; return; }
        if (narm > bastPoang) { bastPoang = narm; bast = { x, y }; }
      }
      bit.x = bast.x; bit.y = bast.y;
    }

    slutJakt() {
      this.forraSvar = this.fraga.svar;
      this.bitar.forEach(b => this.logga && this.andr.bitBort.push(b.id));
      this.bitar.clear();
      const n = this.antalFragor;
      if (n && this.nr >= n) this.avsluta();
      else this.nastaFraga();
    }

    avsluta() {
      if (this.fas === 'slut') return;
      this.fas = 'slut';
      this.on('slut', {});
    }

    nySmula(x, y, m = 1, farg, vx = 0, vy = 0, klump = false) {
      const s = {
        id: this.nastaSmula++, x: x != null ? x : slump(30, this.L - 30), y: y != null ? y : slump(30, this.L - 30),
        m, c: farg || SMUL_FARGER[Math.floor(Math.random() * SMUL_FARGER.length)], vx, vy, klump, vanta: klump ? 0.35 : 0
      };
      this.smulor.set(s.id, s);
      if (this.logga) this.andr.smulNy.push(s);
      return s;
    }
    bortSmula(s) { this.smulor.delete(s.id); if (this.logga) this.andr.smulBort.push(s.id); }

    /* ---------- ett tidssteg ---------- */
    steg(dt) {
      if (this.pausad || this.fas === 'lobby' || this.fas === 'slut') return;
      this.speltid += dt;
      if (this.slutVillkor.typ === 'tid' && this.speltid >= this.slutVillkor.sek) { this.avsluta(); return; }
      this.fasTid -= dt;
      if (this.fas === 'facit') { if (this.fasTid <= 0) this.satFas('frys', REGLER.frys); return; }
      if (this.fas === 'frys') { if (this.fasTid <= 0) this.startaJakt(); return; }
      // jakt
      this.fysik(dt);
      if (this.fasTid <= 0 || this.rattKvar <= 0) this.slutJakt();
    }

    fysik(dt) {
      const B = this.blobbar, L = this.L;
      // rörelse
      for (const b of B) {
        b.kraft = Math.max(0, b.kraft - dt); b.skydd = Math.max(0, b.skydd - dt); b.seg = Math.max(0, b.seg - dt);
        const v = b.offline ? 0 : fart(b.m) * (b.seg > 0 ? REGLER.segFaktor : 1);
        const k = Math.min(1, dt * 8);
        b.vx += (b.styr.x * v - b.vx) * k;
        b.vy += (b.styr.y * v - b.vy) * k;
        const r = radie(b.m);
        b.x = Math.max(r, Math.min(L - r, b.x + b.vx * dt));
        b.y = Math.max(r, Math.min(L - r, b.y + b.vy * dt));
      }
      // krockar
      for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
        const a = B[i], b = B[j];
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01;
        const ra = radie(a.m), rb = radie(b.m);
        if (d >= ra + rb) continue;
        const ak = a.kraft > 0, bk = b.kraft > 0;
        if (ak !== bk) {
          const [jag, offer] = ak ? [a, b] : [b, a];
          if (offer.skydd <= 0 && !offer.offline) this.stjal(jag, offer);
        }
        // mjuk studs: skjut isär, den lättare flyttas mest
        const over = (ra + rb - d) * 0.5, sum = a.m + b.m;
        const nx = dx / d, ny = dy / d;
        a.x -= nx * over * (b.m / sum); a.y -= ny * over * (b.m / sum);
        b.x += nx * over * (a.m / sum); b.y += ny * over * (a.m / sum);
      }
      // smulor och klumpar
      const friktion = Math.exp(-4 * dt);
      for (const s of this.smulor.values()) {
        if (s.vx || s.vy) {
          s.x = Math.max(10, Math.min(L - 10, s.x + s.vx * dt)); s.y = Math.max(10, Math.min(L - 10, s.y + s.vy * dt));
          s.vx *= friktion; s.vy *= friktion;
          if (Math.abs(s.vx) + Math.abs(s.vy) < 8) { s.vx = 0; s.vy = 0; }
        }
        if (s.vanta > 0) { s.vanta -= dt; continue; }
        for (const b of B) {
          if (b.offline) continue;
          const r = radie(b.m);
          if ((b.x - s.x) ** 2 + (b.y - s.y) ** 2 < r * r) {
            b.m += s.m;
            this.matt[s.klump ? 'klump' : 'smul'] += s.m;
            this.bortSmula(s);
            break;
          }
        }
      }
      // svarsbitar
      for (const bit of this.bitar.values()) {
        for (const b of B) {
          if (b.offline || b.rattNu) continue;   // har man redan svarat rätt påverkar bitarna en inte
          if (Math.hypot(b.x - bit.x, b.y - bit.y) < radie(b.m) + REGLER.bitR * 0.5) { this.ataBit(b, bit); break; }
        }
      }
      // påfyllning av neutrala smulor i jämn takt
      const n = B.length;
      this.smulAck += REGLER.smulTakt * n * dt;
      let neutrala = 0; this.smulor.forEach(s => { if (!s.klump) neutrala++; });
      while (this.smulAck >= 1) {
        this.smulAck--;
        if (neutrala < REGLER.smulTak * n) { this.nySmula(); neutrala++; }
      }
    }

    ataBit(b, bit) {
      this.bitar.delete(bit.id);
      if (this.logga) this.andr.bitBort.push(bit.id);
      const begrepp = this.fraga.begrepp;
      if (bit.ratt) {
        const med = median(this.blobbar.map(x => x.m));
        const tillvaxt = REGLER.rattBas * (1 + Math.max(0, (med - b.m) / med));
        b.m += tillvaxt; b.kraft = REGLER.kraftTid; b.rattNu = true; b.ratt++;
        this.matt.ratt += tillvaxt;
        if (!b.felNu && this.raknaSvar(b)) this.fragor.svara(begrepp, true);
        this.rattKvar--;
        this.on('ratt', { b, tillvaxt });
      } else {
        const fore = b.m;
        b.m = Math.max(REGLER.startMassa, b.m * (1 - REGLER.felKrymp));
        b.seg = REGLER.segTid;
        if (!b.felNu) {
          b.felNu = true; b.fel++;
          b.missade[begrepp.i] = (b.missade[begrepp.i] || 0) + 1;
          if (this.raknaSvar(b)) this.fragor.svara(begrepp, false);
        }
        this.on('fel', { b, text: bit.text, forlust: fore - b.m });
      }
    }

    stjal(jag, offer) {
      const tagen = Math.min(offer.m * REGLER.stold, offer.m - REGLER.startMassa);
      offer.skydd = REGLER.skyddTid;
      if (tagen < 0.5) return;
      offer.m -= tagen;
      const n = 5 + Math.floor(Math.random() * 4);
      const cx = (jag.x * radie(offer.m) + offer.x * radie(jag.m)) / (radie(offer.m) + radie(jag.m));
      const cy = (jag.y * radie(offer.m) + offer.y * radie(jag.m)) / (radie(offer.m) + radie(jag.m));
      const bas = Math.atan2(offer.y - jag.y, offer.x - jag.x);
      for (let i = 0; i < n; i++) {
        const a = bas + (i / n - 0.5) * Math.PI * 1.6 + slump(-0.2, 0.2), v = slump(260, 420);
        this.nySmula(cx, cy, tagen / n, offer.farg, Math.cos(a) * v, Math.sin(a) * v, true);
      }
      this.on('stold', { jag, offer, tagen });
    }

    placering(b) { return 1 + this.blobbar.filter(o => o.m > b.m).length; }
    topp(n = 5, nyckel = 'm') { return this.blobbar.slice().sort((a, b) => b[nyckel] - a[nyckel] || b.m - a.m).slice(0, n); }
  }

  /* ======================================================================
     Bot – datorstyrd spelare. Lite reaktionstid och slump så att den känns mänsklig.
     ====================================================================== */
  const BOT_NAMN = ['Glufs', 'Mums', 'Slurp', 'Plupp', 'Kexet', 'Bettan', 'Nappe', 'Smaskis', 'Gnaget', 'Tuggis', 'Knaprus', 'Snaskan'];
  const Bot = {
    namn(n) { return DLGSpel.shuffle(BOT_NAMN).slice(0, n); },
    styr(v, b, dt) {
      const ai = b.ai || (b.ai = { t: 0, mal: null, q: -1, las: 0, valId: null, vinkel: Math.random() * 6.28, brus: 0, fart: 1 });
      if (v.fas !== 'jakt') { v.styr(b.id, 0, 0); return; }
      if (ai.q !== v.nr) { ai.q = v.nr; ai.las = slump(2.5, 6); ai.valId = null; }  // "läser" bitarna först, som en människa
      ai.las -= dt; ai.t -= dt;
      if (ai.t <= 0) {
        ai.t = slump(0.25, 0.7);
        ai.brus = slump(-0.35, 0.35); ai.fart = slump(0.7, 0.92);
        ai.mal = this.valjMal(v, b, ai);
      }
      let mx, my;
      if (ai.mal && ai.mal.levande()) { mx = ai.mal.x() - b.x; my = ai.mal.y() - b.y; }
      else { ai.vinkel += slump(-0.4, 0.4); mx = Math.cos(ai.vinkel); my = Math.sin(ai.vinkel); }
      const a = Math.atan2(my, mx) + ai.brus;
      v.styr(b.id, Math.cos(a) * ai.fart, Math.sin(a) * ai.fart);
    },
    valjMal(v, b, ai) {
      const dist = (o) => Math.hypot(o.x - b.x, o.y - b.y);
      const mal = o => ({ x: () => o.x, y: () => o.y, levande: () => o.levande ? o.levande() : true });
      // superkraft: jaga närmaste spelare som går att ta
      if (b.kraft > 0.4) {
        const byte = v.blobbar.filter(o => o !== b && o.kraft <= 0 && o.skydd <= 0 && !o.offline && dist(o) < 650).sort((p, q) => dist(p) - dist(q))[0];
        if (byte) return mal(byte);
      }
      // svarsbitar: välj rätt med sannolikhet enligt nivån
      if (!b.rattNu && ai.las <= 0 && v.bitar.size) {
        if (ai.valId == null || !v.bitar.has(ai.valId)) {
          const ratt = Math.random() < (REGLER.botTraff[v.niva] || 0.55);
          const kand = [...v.bitar.values()].filter(x => x.ratt === ratt).sort((p, q) => dist(p) - dist(q));
          const val = kand[Math.random() < 0.7 ? 0 : Math.min(1, kand.length - 1)];
          ai.valId = val ? val.id : null;
        }
        const bit = v.bitar.get(ai.valId);
        if (bit) return { x: () => bit.x, y: () => bit.y, levande: () => v.bitar.has(bit.id) };
      }
      // annars smulor i närheten
      let bast = null, bd = 480;
      for (const s of v.smulor.values()) { const d = dist(s) * slump(0.8, 1.2) / Math.sqrt(s.m); if (d < bd) { bd = d; bast = s; } }
      if (bast) return { x: () => bast.x, y: () => bast.y, levande: () => v.smulor.has(bast.id) };
      return null;
    }
  };

  /* ======================================================================
     rita – ritar en vy. Samma kod för fritt spel, elev och tavlan.
     vy:  { L, blobbar:[{id,x,y,m,farg,namn,bot,kraft,skydd,seg,offline}], smulor:iterable, bitar:iterable, t }
     kam: { x, y, z }   opt: { jag, joy, liten }
     ====================================================================== */
  const textCache = new Map();
  function rita(c, W, H, vy, kam, opt = {}) {
    const z = kam.z;
    const sx = x => (x - kam.x) * z + W / 2, sy = y => (y - kam.y) * z + H / 2;
    const t = vy.t || performance.now() / 1000;
    c.fillStyle = '#2b2f55'; c.fillRect(0, 0, W, H);
    // kartan
    const x0 = sx(0), y0 = sy(0), x1 = sx(vy.L), y1 = sy(vy.L);
    c.fillStyle = '#363B68'; c.fillRect(x0, y0, x1 - x0, y1 - y0);
    const steg = 100 * z;
    if (steg > 6) {
      c.strokeStyle = 'rgba(255,255,255,.06)'; c.lineWidth = 1; c.beginPath();
      for (let gx = Math.max(x0, x0 + Math.ceil((0 - x0) / steg) * steg); gx < Math.min(W, x1); gx += steg) { c.moveTo(gx, Math.max(0, y0)); c.lineTo(gx, Math.min(H, y1)); }
      for (let gy = Math.max(y0, y0 + Math.ceil((0 - y0) / steg) * steg); gy < Math.min(H, y1); gy += steg) { c.moveTo(Math.max(0, x0), gy); c.lineTo(Math.min(W, x1), gy); }
      c.stroke();
    }
    c.strokeStyle = 'rgba(247,213,99,.5)'; c.lineWidth = 3; c.strokeRect(x0, y0, x1 - x0, y1 - y0);

    // smulor
    for (const s of vy.smulor) {
      const px = sx(s.x), py = sy(s.y);
      if (px < -20 || py < -20 || px > W + 20 || py > H + 20) continue;
      const r = Math.max(2, (s.klump ? 5 + Math.sqrt(s.m) * 2.4 : 5) * z);
      c.fillStyle = s.c; c.beginPath(); c.arc(px, py, r, 0, 6.2832); c.fill();
      if (s.klump) { c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.stroke(); }
    }

    // svarsbitar – rätta och felaktiga ser exakt likadana ut
    const fs = opt.bitFont || (W < 500 ? 13 : 15);
    c.font = `800 ${fs}px Inter, Arial, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const b of vy.bitar) {
      const px = sx(b.x), py = sy(b.y);
      if (px < -120 || py < -60 || px > W + 120 || py > H + 60) continue;
      const rader = radbryt(c, b.text, Math.max(90, fs * 10));
      const w = Math.max(...rader.map(r => c.measureText(r).width)) + fs * 1.1, h = rader.length * fs * 1.2 + fs * 0.7;
      const bob = Math.sin(t * 2.4 + b.id) * 2;
      c.fillStyle = 'rgba(0,0,0,.25)'; rundRekt(c, px - w / 2 + 2, py - h / 2 + 4 + bob, w, h, 8); c.fill();
      c.fillStyle = '#fff'; rundRekt(c, px - w / 2, py - h / 2 + bob, w, h, 8); c.fill();
      c.strokeStyle = '#F7D563'; c.lineWidth = 2.5; c.stroke();
      c.fillStyle = '#242422';
      rader.forEach((r, i) => c.fillText(r, px, py + bob + (i - (rader.length - 1) / 2) * fs * 1.2));
    }

    // blobbar, minst först så att stora hamnar överst
    const lista = vy.blobbar.slice().sort((a, b) => a.m - b.m);
    for (const b of lista) {
      const px = sx(b.x), py = sy(b.y), r = radie(b.m) * z;
      if (px < -r - 40 || py < -r - 40 || px > W + r + 40 || py > H + r + 40) continue;
      c.save();
      if (b.offline) c.globalAlpha = 0.35;
      else if (b.skydd > 0 && Math.floor(t * 8) % 2) c.globalAlpha = 0.4;
      if (b.kraft > 0) {
        const puls = 0.5 + 0.5 * Math.sin(t * 10);
        c.shadowColor = '#F7D563'; c.shadowBlur = 18 + 14 * puls;
        c.strokeStyle = '#F7D563'; c.lineWidth = Math.max(4, 7 * z);
        c.beginPath(); c.arc(px, py, r + Math.max(4, 6 * z) + puls * 3, 0, 6.2832); c.stroke();
        c.shadowBlur = 0;
      }
      c.fillStyle = b.farg; c.beginPath(); c.arc(px, py, r, 0, 6.2832); c.fill();
      c.lineWidth = b.id === opt.jag ? 4 : 2.5;
      c.strokeStyle = b.id === opt.jag ? '#fff' : 'rgba(0,0,0,.35)'; c.stroke();
      if (b.seg > 0) { c.setLineDash([5, 5]); c.strokeStyle = '#C8CACD'; c.lineWidth = 3; c.beginPath(); c.arc(px, py, r + 5, 0, 6.2832); c.stroke(); c.setLineDash([]); }
      // alias i blobben
      const namn = (b.bot ? '🤖 ' : '') + b.namn;
      const fMin = opt.namnMin || 10;
      let f = Math.max(fMin, Math.min(opt.namnMax || 26, r * 0.45));
      c.font = `800 ${f}px Inter, Arial, sans-serif`;
      let w = c.measureText(namn).width;
      if (w > r * 1.8 && f > fMin) { f = Math.max(fMin, f * r * 1.8 / w); c.font = `800 ${f}px Inter, Arial, sans-serif`; w = c.measureText(namn).width; }
      const morkText = ljus(b.farg);
      c.textAlign = 'center'; c.textBaseline = 'middle';
      if (w > r * 1.9) { c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.6)'; c.strokeText(namn, px, py); c.fillStyle = '#fff'; }
      else c.fillStyle = morkText ? '#242422' : '#fff';
      c.fillText(namn, px, py);
      if (b.kraft > 0 && r > 16) { c.font = `${Math.min(22, r * 0.5)}px sans-serif`; c.fillText('⚡', px, py - r * 0.55); }
      c.restore();
    }

    // joystick på mobil
    if (opt.joy) {
      const j = opt.joy;
      c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 3;
      c.beginPath(); c.arc(j.ox, j.oy, 56, 0, 6.2832); c.stroke();
      c.fillStyle = 'rgba(247,213,99,.75)'; c.beginPath(); c.arc(j.ox + j.dx * 56, j.oy + j.dy * 56, 22, 0, 6.2832); c.fill();
    }
  }

  function rundRekt(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function radbryt(c, text, max) {
    const nyckel = c.font + '|' + max + '|' + text;
    if (textCache.has(nyckel)) return textCache.get(nyckel);
    const ord = String(text).split(/\s+/), rader = [];
    let rad = '';
    for (const o of ord) { const test = rad ? rad + ' ' + o : o; if (c.measureText(test).width <= max || !rad) rad = test; else { rader.push(rad); rad = o; } }
    if (rad) rader.push(rad);
    const ut = rader.slice(0, 3);
    if (textCache.size > 500) textCache.clear();
    textCache.set(nyckel, ut);
    return ut;
  }

  // Kamera som följer en blobb och zoomar ut när den växer.
  function kamera(kam, b, W, H, dt) {
    const r = radie(b ? b.m : REGLER.startMassa);
    const malZ = Math.min(W, H) / (720 * Math.pow(r / radie(REGLER.startMassa), 0.5)) * (W < 600 ? 1.15 : 1);
    const k = Math.min(1, dt * 5);
    if (!kam.z) { kam.z = malZ; kam.x = b ? b.x : 0; kam.y = b ? b.y : 0; }
    kam.z += (malZ - kam.z) * Math.min(1, dt * 2);
    if (b) { kam.x += (b.x - kam.x) * k; kam.y += (b.y - kam.y) * k; }
    return kam;
  }

  /* ======================================================================
     Styrning – blobben följer muspekaren; piltangenter/WASD; dra-joystick på pekskärm.
     ====================================================================== */
  class Styrning {
    constructor(el, jagPaSkarm) {
      this.el = el; this.jagPaSkarm = jagPaSkarm;   // () => {x, y, r} i skärmkoordinater
      this.mus = null; this.joy = null; this.senast = 'mus';
      el.style.touchAction = 'none';
      const pos = e => { const r = el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
      el.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse') { this.mus = pos(e); this.senast = 'mus'; return; }
        e.preventDefault();
        const p = pos(e);
        this.joy = { id: e.pointerId, ox: p.x, oy: p.y, dx: 0, dy: 0 };
        this.senast = 'joy';
        try { el.setPointerCapture(e.pointerId); } catch (x) {}
      });
      el.addEventListener('pointermove', e => {
        if (e.pointerType === 'mouse') { this.mus = pos(e); this.senast = 'mus'; return; }
        if (!this.joy || e.pointerId !== this.joy.id) return;
        e.preventDefault();
        const p = pos(e), dx = (p.x - this.joy.ox) / 56, dy = (p.y - this.joy.oy) / 56, l = Math.hypot(dx, dy);
        this.joy.dx = l > 1 ? dx / l : dx; this.joy.dy = l > 1 ? dy / l : dy;
      });
      const slapp = e => { if (this.joy && e.pointerId === this.joy.id) this.joy = null; };
      el.addEventListener('pointerup', slapp); el.addEventListener('pointercancel', slapp);
      ['gesturestart', 'gesturechange', 'dblclick', 'contextmenu'].forEach(t => el.addEventListener(t, e => e.preventDefault()));
    }
    riktning() {
      const kx = (DLGSpel.ned('hoger') ? 1 : 0) - (DLGSpel.ned('vanster') ? 1 : 0);
      const ky = (DLGSpel.ned('ner') ? 1 : 0) - (DLGSpel.ned('upp') ? 1 : 0);
      if (kx || ky) { this.senast = 'tangent'; const l = Math.hypot(kx, ky); return { x: kx / l, y: ky / l }; }
      if (this.senast === 'tangent') return { x: 0, y: 0 };
      if (this.joy) return { x: this.joy.dx, y: this.joy.dy };
      if (this.senast === 'mus' && this.mus) {
        const j = this.jagPaSkarm(); if (!j) return { x: 0, y: 0 };
        const dx = this.mus.x - j.x, dy = this.mus.y - j.y, d = Math.hypot(dx, dy);
        if (d < Math.max(6, j.r * 0.25)) return { x: 0, y: 0 };
        const s = Math.min(1, d / Math.max(60, j.r * 3));
        return { x: dx / d * s, y: dy / d * s };
      }
      return { x: 0, y: 0 };
    }
  }

  /* ======================================================================
     FragaVy – stor fråga under frysen, banderoll under jakten.
     ====================================================================== */
  // Texterna skalas efter spelytan (cqw), inte hela fönstret – tavlan har en sidopanel.
  const VY_CSS = `
.sl-vy{position:absolute;inset:0;container-type:size;pointer-events:none;z-index:2}
.sl-stor{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:20px;background:rgba(36,36,34,.62);z-index:3;text-align:center;pointer-events:none}
.sl-stor .k{font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#F7D563;font-size:clamp(14px,1.9cqw,28px)}
.sl-stor .t{font-family:"Inria Serif",Georgia,serif;font-size:clamp(26px,4.6cqw,80px);line-height:1.15;max-width:100%;color:#fff;text-wrap:balance;overflow-wrap:anywhere}
.sl-stor .n{font-weight:900;font-size:clamp(30px,4cqw,64px);color:#F8EAA4;font-variant-numeric:tabular-nums}
.sl-stor.facit .t{font-family:var(--sans,Inter,Arial,sans-serif);font-weight:900}
.sl-stor.facit .t b{color:#F7D563}
.sl-banner{position:absolute;left:50%;top:8px;transform:translateX(-50%);width:min(980px,calc(100% - 16px));z-index:2;pointer-events:none;
  background:#fff;color:#242422;border-left:8px solid #F7D563;padding:8px 14px 10px;box-shadow:0 6px 0 rgba(0,0,0,.18)}
.sl-banner .k{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#484F59;display:flex;justify-content:space-between;gap:8px}
.sl-banner .t{font-family:"Inria Serif",Georgia,serif;font-size:clamp(16px,2.6cqw,44px);line-height:1.15}
.sl-banner .bar{height:5px;background:#E3E4E6;margin-top:6px}
.sl-banner .bar i{display:block;height:100%;background:#F7D563;transition:width .2s linear}
.sl-paus{position:absolute;inset:0;z-index:4;display:flex;align-items:center;justify-content:center;background:rgba(36,36,34,.55);font-weight:900;font-size:clamp(32px,5vw,80px);color:#F7D563;pointer-events:none}
@media (max-width:560px){.sl-banner{top:4px;padding:6px 10px 8px}.sl-banner .t{font-size:15px}}
`;
  class FragaVy {
    constructor(stage) {
      if (!document.getElementById('sl-stil')) { const s = document.createElement('style'); s.id = 'sl-stil'; s.textContent = VY_CSS; document.head.appendChild(s); }
      this.el = document.createElement('div'); this.el.className = 'sl-vy';
      this.el.innerHTML = `<div class="sl-banner" hidden><div class="k"><span class="nr"></span><span class="tid"></span></div><div class="t"></div><div class="bar"><i></i></div></div>
        <div class="sl-stor" hidden><div class="k"></div><div class="t"></div><div class="n"></div></div>
        <div class="sl-paus" hidden>Pausat</div>`;
      stage.appendChild(this.el);
      this.banner = this.el.querySelector('.sl-banner'); this.stor = this.el.querySelector('.sl-stor'); this.paus = this.el.querySelector('.sl-paus');
      this.senast = '';
    }
    // s: { fas, nr, tot, text, facit, fasTid, jaktTid, tidKvar, pausad, pausText }
    visa(s) {
      const nrText = s.tot ? `Fråga ${s.nr} av ${s.tot}` : `Fråga ${s.nr}`;
      const tidText = s.tidKvar != null ? ` · ${Math.floor(s.tidKvar / 60)}:${String(Math.floor(s.tidKvar % 60)).padStart(2, '0')} kvar` : '';
      this.paus.hidden = !s.pausad;
      if (s.pausText) this.paus.textContent = s.pausText;
      const nyckel = [s.fas, s.nr, s.text, s.facit].join('|');
      if (s.fas === 'frys' || s.fas === 'facit') {
        this.banner.hidden = true; this.stor.hidden = false;
        if (nyckel !== this.senast) {
          this.stor.classList.toggle('facit', s.fas === 'facit');
          this.stor.querySelector('.k').textContent = s.fas === 'facit' ? 'Förra frågan' : nrText + tidText + ' · Vilket begrepp betyder…';
          const t = this.stor.querySelector('.t');
          if (s.fas === 'facit') t.innerHTML = `Rätt svar var: <b>${DLGSpel.esc(s.facit)}</b>`; else t.textContent = s.text;
        }
        this.stor.querySelector('.n').textContent = s.fas === 'frys' ? Math.max(1, Math.ceil(s.fasTid)) : '';
      } else if (s.fas === 'jakt') {
        this.stor.hidden = true; this.banner.hidden = false;
        if (nyckel !== this.senast) this.banner.querySelector('.t').textContent = s.text;
        this.banner.querySelector('.nr').textContent = nrText + tidText;
        this.banner.querySelector('.tid').textContent = Math.max(0, Math.ceil(s.fasTid)) + ' s';
        this.banner.querySelector('.bar i').style.width = Math.max(0, 100 * s.fasTid / s.jaktTid) + '%';
      } else { this.stor.hidden = true; this.banner.hidden = true; }
      this.senast = nyckel;
    }
    ta_bort() { this.el.remove(); }
  }

  window.SL = { REGLER, FARGER, radie, fart, kartStorlek, median, Varld, Bot, rita, kamera, Styrning, FragaVy };
})();
