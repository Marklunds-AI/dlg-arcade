/* BF-Rush – monterspelet för Barn- och fritidsprogrammet.
   En endless runner: du springer dig igenom en vecka på BF, måndag till fredag, två pass per dag.
   Planera → genomföra → utvärdera: lapparna du samlar på måndagen hjälper dig på fredagens evenemang.

   Filer:  bf-rush-innehall.js (alla texter) · js/grafik.js (ritverktyg, figurer) · js/miljoer.js (miljöerna) · js/spel.js (det här)
   Alla siffror som är bra att justera efter testspel ligger i CONFIG nedan. */
(function () {
  'use strict';
  const B = window.BFR, I = window.BF_INNEHALL;
  const { W, H, MARK, F, SPRITES, FIGURER, BARN, MILJOER, HINDER, YTA } = B;
  const { clamp, lerp, rnd, valj, blanda, text, textRader, rundRekt, klistermarke, hjartForm, ritaFigur, font } = B;

  /* =====================================================================
     CONFIG – alla siffror på ett ställe
     ===================================================================== */
  const CONFIG = {
    maxDpr: 2,                 // högsta devicePixelRatio
    maxPixelBredd: 3840,       // tak för canvasens verkliga bredd (4K-skärmar ritas skarpt)
    spelareX: 420,             // figurens plats i x
    meterPx: 100,              // px per meter (sträckpoäng)

    // Fart = bas × faktor. Vecka 1 har en faktor per dag (mån–fre). Vecka 2+ startar på veckaStart
    // och ökar med perDagSen per dag, upp till max. Farten glider mot målet med "acceleration" per sekund.
    fart: { bas: 760, vecka1: [1.0, 1.12, 1.24, 1.36, 1.48], veckaStart: { 2: 1.6, 3: 1.8 }, perVeckaSen: 0.1, perDagSen: 0.04, max: 2.0, acceleration: 0.2 },
    svarighet: 1.0,            // personalmenyn kan ändra 0,8–1,2 (påverkar farten)
    passTid: 12,               // sekunder per pass, två pass per dag
    utvarderaTid: 12,          // fredag eftermiddag – två utvärderingsval tätt efter varandra
    helgTid: 7,                // HELG!-passet (veckokort + fest)

    // Hopp: kraft = startfart uppåt (px/s). Medan knappen hålls (högst maxHall s) gäller gravHall, annars grav.
    hopp: { kraft: 1380, dubbel: 1220, gravHall: 3000, grav: 5600, maxHall: 0.3, coyote: 0.1, buffert: 0.14, snabbFall: 2400 },
    glid: { minTid: 0.45 },
    figur: { skala: 1.15, bredd: 60, hojd: 154, glidHojd: 70 },  // skala = ritstorlek, resten är träffytan
    glidFri: B.GLIDFRI,        // fri höjd under glid-hinder (ändras i miljoer.js)

    liv: 3, skyddTid: 1.5, skak: 0.35,
    poang: { perMeter: 1, gladje: 10, zon: 50, hjalp: 100, vagval: 500, lapp: 200, helg: 2000, tak: 999999 },
    combo: { per: 8, max: 5 },

    // Banan byggs av handgjorda segment. Avstånden anges i sekunder, så de går att klara i alla farter.
    // passKant/passStart = sekunder utan hinder före och efter "dörren" mellan två pass (hämta andan)
    bana: { startLucka: 1.4, luckaMin: 0.5, luckaMax: 0.95, nivaTid: [0, 8, 30], tipsAntal: 2, passKant: 1.0, passStart: 1.0,
      luckaPerDag: 0.075, luckaMinst: 0.7 },   // luckorna mellan hindren krymper 7,5 % per dag (fredag ≈ 70 %), som minst 70 %
    uppvarmning: { tid: 7, fart: 0.8, forstaHinder: 4.5 },   // uppvärmning i lägre fart innan måndagen (bara vecka 1). forstaHinder = sekunder innan första hindret

    // Vägval: banan delar sig i en övre (plattform) och en nedre väg.
    vagval: {
      placering: 0.42,                    // var i passet vägvalet börjar (0–1)
      utvPlacering: [0.05, 0.5],          // två vägval i utvärderingspasset
      // sekunder: tom sträcka före plattformen, plattformens längd, tomt efter
      inled: 1.5, plattform: 1.7, efter: 0.5,
      pausVid: 0.25,                      // läspausen börjar så här långt in på den tomma sträckan (s), när figuren står på marken
      fritt: 0.5,                         // minst så här lång lucka mellan sista hindret och den tomma sträckan (s)
      hojd: 196, tjock: 30,               // plattformens höjd över marken och tjocklek
      beslut: 0.4,                        // hur långt in på plattformen (s) valet avgörs
      lasTid: 4.5,                        // spelet står still så här länge medan man läser frågan
      lasMin: 1.5,                        // efter så här lång tid kan man trycka för att köra direkt
      utvLasTid: 2.5, utvLasMin: 0.8,     // kortare läspaus i utvärderingspasset, där tre frågor kommer tätt
      broms: 1.0,                         // farten fram till vägvalet efter läspausen (1 = ingen inbromsning)
      slowmo: 0.3, slowSkala: 0.3,        // kort slow-motion vid rätt val
      resultatTid: 3.2,
      temaTid: 1.5                        // extra lästid för första frågan i ett pass (då visas också passets tema)
    },
    planera: { placering: [0.1, 0.26, 0.7, 0.86], hojd: 500, tidsplanFart: 0.88 },   // lapparna ligger högt: dubbelhopp
    hjalp: { foljChans: 0.35, foljTid: 3 },
    kraft: { intervall: 15, teamworkTid: 8, fruktTid: 6, magnetRadie: 560 },
    veckokortTid: 4,

    // titlar på slutskärmen (namnen står i innehållsfilen)
    titelGranser: [0, 6000, 18000, 35000, 60000],   // en hel vecka ger ungefär 40 000–50 000

    // Hoodiens färg per inriktning
    inriktningFarg: { fh: '#FF6B3D', psa: '#8B5CF6' },
    inriktningTid: 6,          // sekunder innan inriktningen slumpas
    figurTid: 8,               // sekunder innan figuren väljs automatiskt

    // Monterläget (?monter=1)
    attract: { vanta: 25, topp: 10, demo: 15, vadar: 8 },   // stillhet innan attract mode, och hur länge varje skärm visas (s)
    namnTimeout: 45,           // namnregistreringen hoppas över om ingen rör något så här länge (s)
    personalPin: '2468',       // PIN till personalmenyn (håll övre vänstra hörnet 3 s eller Ctrl+Shift+B)
    visaFps: false,

    // QR-kod på slutskärmen och "Vad är BF?". Tom adress = ingen QR-kod.
    qrAdress: '',
    qrText: 'Läs mer om BF',
    musik: { tempo: 124, volym: 0.3 }   // tempot ökar med farten
  };

  /* =====================================================================
     Hjälpare
     ===================================================================== */
  const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const store = {
    get(k, f) { try { const v = localStorage.getItem(k); return v === null ? f : JSON.parse(v); } catch (e) { return f; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  // personalmenyns inställningar sparas i webbläsaren
  CONFIG.svarighet = store.get('bfrush_svarighet', CONFIG.svarighet);
  CONFIG.visaFps = store.get('bfrush_fps', CONFIG.visaFps);
  CONFIG.musikPa = store.get('bfrush_musik', true);
  const MONTER = new URLSearchParams(location.search).get('monter') === '1';
  const T = B.Topp;
  const fyll = (mall, varden) => String(mall).replace(/\{(\w+)\}/g, (m, k) => varden[k] ?? m);
  const perInriktning = (v, inr) => (v && typeof v === 'object' && !Array.isArray(v)) ? v[inr] : v;

  /* =====================================================================
     Canvas och skalning
     ===================================================================== */
  const canvas = document.getElementById('bf-canvas');
  const c = canvas.getContext('2d');
  B.satt(c); B.sattMiljo(c);
  const vy = { skala: 1, ox: 0, oy: 0, dpr: 1 };

  function anpassa() {
    const bw = innerWidth, bh = innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, CONFIG.maxDpr);
    if (bw * dpr > CONFIG.maxPixelBredd) dpr = CONFIG.maxPixelBredd / bw;
    canvas.width = Math.round(bw * dpr); canvas.height = Math.round(bh * dpr);
    vy.dpr = dpr;
    vy.skala = Math.min(bw / W, bh / H);
    vy.ox = (bw - W * vy.skala) / 2; vy.oy = (bh - H * vy.skala) / 2;
  }
  addEventListener('resize', anpassa);
  anpassa();
  const tillIntern = (x, y) => ({ x: (x - vy.ox) / vy.skala, y: (y - vy.oy) / vy.skala });

  const logo = new Image();
  logo.src = 'img/bf-logo.png';
  const LOGO_KVOT = 1028 / 1126;   // höjd/bredd – förvräng aldrig loggan

  /* =====================================================================
     Ljud – syntetiserat med Web Audio, inga filer
     ===================================================================== */
  const Ljud = {
    pa: store.get('bfrush_ljud', true),
    ctx: null, ut: null,
    starta() {
      try {
        // vänta tills webbläsaren räknar trycket som en användarhandling (på pekskärm: när fingret lyfts)
        const ua = navigator.userActivation;
        if (!this.ctx && ua && !ua.isActive && !ua.hasBeenActive) return;
        if (!this.ctx) {
          this.ctx = new (window.AudioContext || window.webkitAudioContext)();
          this.ut = this.ctx.createGain(); this.ut.gain.value = 0.9; this.ut.connect(this.ctx.destination);
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
      } catch (e) {}
    },
    vaxla() { this.pa = !this.pa; store.set('bfrush_ljud', this.pa); },
    ton(freq, dur, typ = 'square', vol = 0.08, slide = 0, delay = 0) {
      if (!this.pa || !this.ctx) return;
      try {
        const t = this.ctx.currentTime + delay;
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = typ; o.frequency.setValueAtTime(freq, t);
        if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(this.ut); o.start(t); o.stop(t + dur + 0.03);
      } catch (e) {}
    },
    brus(dur, vol = 0.12, delay = 0) {
      if (!this.pa || !this.ctx) return;
      try {
        const t = this.ctx.currentTime + delay, n = Math.floor(this.ctx.sampleRate * dur);
        const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
        const s = this.ctx.createBufferSource(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = 900;
        s.buffer = buf; g.gain.value = vol; s.connect(f).connect(g).connect(this.ut); s.start(t);
      } catch (e) {}
    },
    hopp() { this.ton(380, 0.14, 'square', 0.05, 380); },
    dubbelhopp() { this.ton(560, 0.16, 'square', 0.05, 520); },
    landa() { this.brus(0.06, 0.05); },
    glid() { this.brus(0.18, 0.05); },
    samla(steg = 0) { const f = 880 * Math.pow(2, (steg % 8) / 12); this.ton(f, 0.08, 'square', 0.04); this.ton(f * 1.5, 0.1, 'triangle', 0.04, 0, 0.05); },
    zon() { [784, 988, 1175, 1568].forEach((f, i) => this.ton(f, 0.1, 'square', 0.04, 0, i * 0.05)); },
    combo(n) { [523, 659, 784, 1046].forEach((f, i) => this.ton(f * (1 + n * 0.06), 0.09, 'square', 0.05, 0, i * 0.045)); },
    skada() { this.ton(200, 0.35, 'sawtooth', 0.09, -140); this.brus(0.25, 0.12); },
    ratt() { [659, 784, 988, 1319].forEach((f, i) => this.ton(f, 0.14, 'square', 0.05, 0, i * 0.07)); },
    fel() { this.ton(330, 0.22, 'triangle', 0.07, -60); this.ton(262, 0.3, 'triangle', 0.07, -40, 0.18); },
    hjalp() { [523, 784, 1046].forEach((f, i) => this.ton(f, 0.12, 'triangle', 0.07, 0, i * 0.06)); },
    kraft() { [392, 523, 659, 784, 1046].forEach((f, i) => this.ton(f, 0.1, 'square', 0.05, 0, i * 0.04)); },
    vissla() { this.ton(2200, 0.35, 'sine', 0.07, 200); this.ton(2300, 0.3, 'sine', 0.05, -200, 0.05); },
    dag() { [523, 659].forEach((f, i) => this.ton(f, 0.12, 'square', 0.04, 0, i * 0.08)); },
    fanfar() { [[523, 0], [659, 0.12], [784, 0.24], [1046, 0.36], [784, 0.54], [1046, 0.66]].forEach(([f, d]) => { this.ton(f, 0.22, 'square', 0.06, 0, d); this.ton(f / 2, 0.22, 'triangle', 0.06, 0, d); }); },
    slut() { [523, 415, 330, 262].forEach((f, i) => this.ton(f, 0.25, 'triangle', 0.08, 0, i * 0.17)); },
    klick() { this.ton(660, 0.05, 'square', 0.04); }
  };

  /* Peppig loop: trumma, bas och arpeggio i C–G–Am–F, schemalagd med Web Audio. */
  const Musik = {
    spelar: false, nasta: 0, steg: 0, timer: null, ut: null, brus: null,
    ACKORD: [[48, 52, 55], [43, 47, 50], [45, 48, 52], [41, 45, 48]],   // MIDI-toner: C, G, Am, F
    hz: m => 440 * Math.pow(2, (m - 69) / 12),
    uppdatera(spela, fart) {
      this.tempo = CONFIG.musik.tempo * (0.9 + 0.25 * fart);
      if (spela && !this.spelar) this.starta(); else if (!spela && this.spelar) this.stoppa();
    },
    starta() {
      const ctx = Ljud.ctx; if (!ctx || ctx.state !== 'running') return;
      if (!this.ut) {
        this.ut = ctx.createGain(); this.ut.connect(Ljud.ut);
        const n = ctx.sampleRate * 0.5, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
        this.brus = buf;
      }
      this.ut.gain.cancelScheduledValues(ctx.currentTime);
      this.ut.gain.setValueAtTime(0.0001, ctx.currentTime); this.ut.gain.exponentialRampToValueAtTime(CONFIG.musik.volym, ctx.currentTime + 0.6);
      this.spelar = true; this.nasta = ctx.currentTime + 0.08;
      this.timer = setInterval(() => this.schemalagg(), 30);
    },
    stoppa() {
      this.spelar = false; clearInterval(this.timer);
      const ctx = Ljud.ctx; if (ctx && this.ut) { this.ut.gain.cancelScheduledValues(ctx.currentTime); this.ut.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.08); }
    },
    schemalagg() {
      const ctx = Ljud.ctx; if (!ctx) return;
      while (this.nasta < ctx.currentTime + 0.15) { this.spela(this.steg, this.nasta); this.nasta += 60 / this.tempo / 4; this.steg = (this.steg + 1) % 64; }
    },
    ton(f, t, dur, typ, vol) {
      const ctx = Ljud.ctx, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = typ; o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.ut); o.start(t); o.stop(t + dur + 0.02);
    },
    trumma(t, typ) {
      const ctx = Ljud.ctx;
      if (typ === 'kick') {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
        g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        o.connect(g).connect(this.ut); o.start(t); o.stop(t + 0.2);
      } else {
        const s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
        f.type = typ === 'hihat' ? 'highpass' : 'bandpass'; f.frequency.value = typ === 'hihat' ? 7000 : 1800;
        const dur = typ === 'hihat' ? 0.04 : 0.14;
        g.gain.setValueAtTime(typ === 'hihat' ? 0.18 : 0.45, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        s.buffer = this.brus; s.connect(f).connect(g).connect(this.ut); s.start(t, Math.random() * 0.3, dur + 0.02);
      }
    },
    spela(steg, t) {
      try {
        const takt = Math.floor(steg / 16), i = steg % 16, ack = this.ACKORD[takt], s16 = 60 / this.tempo / 4;
        if (i % 4 === 0) this.trumma(t, 'kick');
        if (i === 4 || i === 12) this.trumma(t, 'virvel');
        if (i % 2 === 1) this.trumma(t, 'hihat');
        if (i % 2 === 0) this.ton(this.hz(ack[0] - 12 + (i % 8 === 6 ? 12 : 0)), t, s16 * 1.6, 'triangle', 0.35);
        if ([0, 3, 6, 8, 10, 13].includes(i)) this.ton(this.hz(ack[[0, 1, 2, 1, 2, 0][[0, 3, 6, 8, 10, 13].indexOf(i)]] + 12), t, s16 * 1.2, 'square', 0.06);
      } catch (e) {}
    }
  };

  /* =====================================================================
     Styrning: tangentbord, pekskärm och handkontroll (Gamepad API)
     ===================================================================== */
  const inp = {
    hall: { hopp: new Set(), glid: new Set() },   // vilka källor som håller knappen nere just nu
    tryck: { hopp: false, glid: false, valfri: false, paus: false, ljud: false },
    get hoppNere() { return this.hall.hopp.size > 0; },
    get glidNere() { return this.hall.glid.size > 0; },
    ned(handling, kalla) { if (!this.hall[handling].has(kalla)) { this.hall[handling].add(kalla); this.tryck[handling] = true; } if (kalla !== 'auto') this.tryck.valfri = true; },
    upp(handling, kalla) { this.hall[handling].delete(kalla); },
    rensa() { this.hall.hopp.clear(); this.hall.glid.clear(); for (const k in this.tryck) this.tryck[k] = false; },
    sistaAktivitet: performance.now()
  };
  const aktivitet = () => { inp.sistaAktivitet = performance.now(); Ljud.starta(); };

  const TANGENT = { Space: 'hopp', ArrowUp: 'hopp', KeyW: 'hopp', ArrowDown: 'glid', KeyS: 'glid' };
  addEventListener('keydown', e => {
    if (S.personalOppen) return;                         // personalmenyn tar hand om tangentbordet
    aktivitet();
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyB') { e.preventDefault(); oppnaPersonal(); return; }
    if (S.lage === 'namn') { e.preventDefault(); namnTangent(e); return; }
    if (S.lage === 'paus' && !e.repeat) {
      // pausmenyn: pil upp/ner väljer, mellanslag/Enter bekräftar, P/Esc fortsätter
      const k = e.code;
      if (k === 'ArrowUp' || k === 'KeyW') { e.preventDefault(); S.pausVal = 0; return; }
      if (k === 'ArrowDown' || k === 'KeyS') { e.preventDefault(); S.pausVal = 1; return; }
      if (k === 'Space' || k === 'Enter') { e.preventDefault(); inp.tryck.pausValj = true; return; }
    }
    const h = TANGENT[e.code];
    if (h) { e.preventDefault(); if (!e.repeat) inp.ned(h, 'tangent:' + e.code); return; }
    if (e.repeat) return;
    if (e.code === 'KeyP' || e.code === 'Escape') { inp.tryck.paus = true; return; }
    if (e.code === 'KeyM') { inp.tryck.ljud = true; return; }
    if (e.code === 'KeyF') { vaxlaHelskarm(); return; }
    if (e.code === 'ArrowLeft') { inp.tryck.vanster = true; }
    if (e.code === 'ArrowRight') { inp.tryck.hoger = true; }
    if (/^Digit[1-4]$/.test(e.code)) inp.tryck.siffra = Number(e.code.slice(5));
    if (!e.ctrlKey && !e.metaKey && !e.altKey) inp.tryck.valfri = true;
  });
  addEventListener('keyup', e => { const h = TANGENT[e.code]; if (h) inp.upp(h, 'tangent:' + e.code); });
  addEventListener('blur', () => { inp.rensa(); if (S.lage === 'spel' && !S.autopilot) pausa(true); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && S.lage === 'spel' && !S.autopilot) pausa(true); });

  // Pekskärm/mus: övre halvan = hoppa, nedre = glida. Svep upp/ner fungerar också.
  // Håll övre vänstra hörnet i 3 s = personalmenyn.
  const pekare = new Map();
  let hornTimer = null;
  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (S.personalOppen) return;
    aktivitet();
    try { canvas.setPointerCapture(e.pointerId); } catch (er) {}
    const p = tillIntern(e.clientX, e.clientY);
    const knapp = traffKnapp(p.x, p.y);
    if (knapp) { knapp.klick(); return; }
    if (p.x < 170 && p.y < 170) { clearTimeout(hornTimer); hornTimer = setTimeout(oppnaPersonal, 3000); return; }
    if (S.lage === 'namn') { namnKlick(p.x, p.y); return; }
    if (S.lage === 'paus') { const i = PAUSKNAPPAR.findIndex(k => Math.abs(p.x - W / 2) < k.w / 2 && Math.abs(p.y - k.y) < 60); if (i >= 0) { S.pausVal = i; inp.tryck.pausValj = true; } return; }
    if (S.lage === 'figur' && !S.attract) { const i = figurVid(p.x, p.y); if (i >= 0) { inp.tryck.siffra = i + 1; inp.tryck.valfri = true; return; } }
    const h = p.y < H / 2 ? 'hopp' : 'glid';
    pekare.set(e.pointerId, { h, y0: e.clientY, svept: false });
    inp.ned(h, 'pek:' + e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    const pk = pekare.get(e.pointerId); if (!pk || pk.svept) return;
    const dy = (e.clientY - pk.y0) / vy.skala;
    if (Math.abs(dy) > 60) {
      const ny = dy < 0 ? 'hopp' : 'glid';
      pk.svept = true;
      if (ny !== pk.h) { inp.upp(pk.h, 'pek:' + e.pointerId); pk.h = ny; inp.ned(ny, 'pek:' + e.pointerId); }
    }
  });
  const pekSlut = e => { clearTimeout(hornTimer); Ljud.starta(); const pk = pekare.get(e.pointerId); if (pk) { inp.upp(pk.h, 'pek:' + e.pointerId); pekare.delete(e.pointerId); } };
  canvas.addEventListener('pointerup', pekSlut);
  canvas.addEventListener('pointercancel', pekSlut);
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('touchmove', e => { if (!S.personalOppen) e.preventDefault(); }, { passive: false });
  document.addEventListener('dblclick', e => e.preventDefault());

  // Handkontroll: A/valfri knapp = hoppa, B eller ned = glida, Start = paus.
  // I menyerna: styrkors/spak = flytta, A = välj, B = radera, Start = klar.
  const padForra = {};
  function lasHandkontroller() {
    if (S.personalOppen) return;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const nu = performance.now();
    for (const gp of pads) {
      if (!gp) continue;
      const forra = padForra[gp.index] || (padForra[gp.index] = {});
      const nere = i => !!(gp.buttons[i] && gp.buttons[i].pressed);
      const ax = gp.axes[1] || 0, ax0 = gp.axes[0] || 0;
      const glid = nere(1) || nere(13) || ax > 0.6;
      let hopp = nere(12) || ax < -0.6;
      for (let i = 0; i < gp.buttons.length; i++) if (![1, 8, 9, 13, 14, 15].includes(i) && nere(i)) hopp = true;
      const start = nere(9), select = nere(8);
      const kalla = 'pad:' + gp.index;
      if (hopp && !forra.hopp) { inp.ned('hopp', kalla); aktivitet(); }
      if (!hopp && forra.hopp) inp.upp('hopp', kalla);
      if (glid && !forra.glid) { inp.ned('glid', kalla); aktivitet(); }
      if (!glid && forra.glid) inp.upp('glid', kalla);
      if (start && !forra.start) { inp.tryck.paus = true; inp.tryck.klar = true; aktivitet(); }
      if (select && !forra.select) { inp.tryck.valfri = true; aktivitet(); }
      if (nere(0) && !forra.a) inp.tryck.valj = true;
      if (nere(1) && !forra.b) inp.tryck.radera = true;
      // riktningar med upprepning när man håller kvar
      const riktn = { upp: nere(12) || ax < -0.6, ner: nere(13) || ax > 0.6, vanster: nere(14) || ax0 < -0.6, hoger: nere(15) || ax0 > 0.6 };
      for (const r in riktn) {
        const k = 'r_' + r;
        if (!riktn[r]) { forra[k] = 0; continue; }
        if (!forra[k] || nu > forra[k]) {
          forra[k] = nu + (forra[k] ? 120 : 350);
          inp.tryck.nav = r; aktivitet();
          if (r === 'vanster') { inp.tryck.vanster = true; inp.tryck.valfri = true; }
          if (r === 'hoger') { inp.tryck.hoger = true; inp.tryck.valfri = true; }
        }
      }
      Object.assign(forra, { hopp, glid, start, select, a: nere(0), b: nere(1) });
    }
  }

  function vaxlaHelskarm() {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
    } catch (e) {}
  }

  /* Knappar i canvasen (paus och ljud) */
  const KNAPPAR = [
    { id: 'paus', x: W - 104, y: 28, w: 76, h: 76, synlig: () => S.lage === 'spel' || S.lage === 'paus', klick: () => { inp.tryck.paus = true; } },
    { id: 'ljud', x: W - 196, y: 28, w: 76, h: 76, synlig: () => true, klick: () => { inp.tryck.ljud = true; } },
    { id: 'helskarm', x: W - 104, y: 28, w: 76, h: 76, synlig: () => MONTER && (S.lage === 'start' || S.lage === 'slut'), klick: () => vaxlaHelskarm() }
  ];
  const traffKnapp = (x, y) => KNAPPAR.find(k => k.synlig() && x >= k.x - 8 && x <= k.x + k.w + 8 && y >= k.y - 8 && y <= k.y + k.h + 8);

  /* =====================================================================
     Segment – handgjorda block som kombineras slumpmässigt.
     t = sekunder från segmentets start (blir px via aktuell fart).
     k: hopp | hog | glid | gladje | zon | hjalp.  y (för föremål): m = marken, h = hopphöjd, hh = högt.
     niva 0 dyker upp direkt, 1 efter en stund, 2 senare.
     ===================================================================== */
  const bage = (t0, steg, n, typ = 'gladje') => Array.from({ length: n }, (_, i) => ({ t: t0 + i * steg, k: typ, bage: Math.sin(Math.PI * (i + 0.5) / n) }));
  const rad = (t0, steg, n, y, typ = 'gladje') => Array.from({ length: n }, (_, i) => ({ t: t0 + i * steg, k: typ, y }));
  const SEGMENT = [
    { id: 'hopp', niva: 0, len: 0.6, d: [{ t: 0, k: 'hopp' }] },
    { id: 'glid', niva: 0, len: 0.7, d: [{ t: 0, k: 'glid' }] },
    { id: 'hjartrad', niva: 0, len: 1.1, d: rad(0, 0.18, 6, 'm') },
    { id: 'hoppbage', niva: 0, len: 1.0, d: [{ t: 0.3, k: 'hopp' }, ...bage(0.04, 0.11, 5)] },
    { id: 'glidrad', niva: 0, len: 1.0, d: [{ t: 0.15, k: 'glid' }, ...rad(0.0, 0.14, 5, 'm')] },
    { id: 'hjalp', niva: 0, len: 0.9, hjalp: true, d: [{ t: 0.4, k: 'hjalp' }, ...rad(0, 0.14, 2, 'm')] },
    { id: 'hog', niva: 1, len: 0.8, d: [{ t: 0, k: 'hog' }, { t: 0.06, k: 'zon', y: 'hh' }] },
    { id: 'hopphopp', niva: 1, len: 1.6, d: [{ t: 0, k: 'hopp' }, { t: 1.0, k: 'hopp' }, ...rad(0.42, 0.14, 3, 'm')] },
    { id: 'hoppglid', niva: 1, len: 1.7, d: [{ t: 0, k: 'hopp' }, { t: 1.05, k: 'glid' }] },
    { id: 'glidhopp', niva: 1, len: 1.6, d: [{ t: 0, k: 'glid' }, { t: 0.95, k: 'hopp' }, ...bage(0.75, 0.11, 4)] },
    { id: 'glidglid', niva: 1, len: 1.2, d: [{ t: 0, k: 'glid' }, { t: 0.42, k: 'glid' }, ...rad(0.0, 0.14, 5, 'm')] },
    { id: 'hogtrappa', niva: 1, len: 1.4, d: [{ t: 0, k: 'hopp' }, ...rad(0.2, 0.12, 3, 'hh'), { t: 0.85, k: 'zon', y: 'h' }] },
    { id: 'hopphjalp', niva: 1, len: 1.5, hjalp: true, d: [{ t: 0, k: 'hopp' }, { t: 0.95, k: 'hjalp' }] },
    { id: 'trippel', niva: 2, len: 2.5, d: [{ t: 0, k: 'hopp' }, { t: 0.95, k: 'hopp' }, { t: 1.95, k: 'glid' }] },
    { id: 'hogglid', niva: 2, len: 1.9, d: [{ t: 0, k: 'hog' }, { t: 1.15, k: 'glid' }, ...rad(1.05, 0.14, 4, 'm')] },
    { id: 'glidhog', niva: 2, len: 1.8, d: [{ t: 0, k: 'glid' }, { t: 1.0, k: 'hog' }, { t: 1.06, k: 'zon', y: 'hh' }] }
  ];
  const UPPVARMNING = { id: 'uppvarmning', len: 1.6, d: [{ t: 0, k: 'hopp' }, { t: 0.45, k: 'gladje', y: 'm', tips: 'TA!' }, { t: 0.6, k: 'gladje', y: 'm' }, { t: 0.75, k: 'gladje', y: 'm' }, { t: 1.3, k: 'glid' }] };
  const Y_NIVA = { m: MARK - 62, h: MARK - 230, hh: MARK - 360 };
  const KRAFTER = ['visselpipa', 'forstaHjalpen', 'teamwork', 'frukt'];

  /* =====================================================================
     Speltillstånd
     ===================================================================== */
  const S = {
    lage: 'start',   // start | inriktning | spel | paus | slut
    tid: 0, klocka: 0, kamera: 0,
    figur: FIGURER[0], inriktning: 'fh', autopilot: false, autopilotFel: 0
  };

  function nyRunda(inriktning) {
    Object.assign(S, {
      lage: 'spel', tid: 0, kamera: 0, fart: CONFIG.fart.bas * CONFIG.uppvarmning.fart, fartFaktor: CONFIG.uppvarmning.fart,
      poang: 0, liv: CONFIG.liv, combo: 1, comboRakning: 0, comboPop: 0, skak: 0, skadaBlink: 0, gronBlink: 0,
      hinder: [], foremal: [], hjalpare: [], plattformar: [], vagvalLista: [], foljare: [],
      partiklar: [], texter: [], banderoller: [],
      nastaX: CONFIG.spelareX + CONFIG.uppvarmning.forstaHinder * CONFIG.fart.bas * CONFIG.uppvarmning.fart, forraSegment: null, tipsVisat: { hopp: 0, hog: 0, glid: 0 },
      slutTid: 0, tidSkala: 1, slowmo: 0,
      // veckan
      veckaNr: 1, ko: [], koIndex: 0, passer: [], passNr: 0, planSlut: 0, aktivt: null,
      skylt: null, vagvalVisas: null, lasPaus: 0, lasT: 0, resultat: null, kraftSkylt: null, planSkylt: null, veckokort: null, helgFest: 0,
      lappar: new Set(), anvandaRunda: new Set(), fordelar: {}, skold: false, teamwork: 0, magnet: 0, kraftTimer: CONFIG.kraft.intervall * 0.6,
      glasogon: false,
      stat: { situationRatt: 0, situationTot: 0, fragaRatt: 0, fragaTot: 0, utvRatt: 0, utvTot: 0, hjalpta: 0, lapparBast: 0, veckor: 0, moment: new Set() },
      veckaStat: { lappar: 0, valRatt: 0, valTot: 0, hjalpta: 0 },
      sp: { y: MARK, vy: 0, paMark: true, golv: MARK, glider: false, glidTid: 0, hoppAntal: 0, hallTid: 0, haller: false, coyote: 0, buffert: 0,
        skydd: 0, fas: 0, sx: 1, sy: 1, lutning: 0 },
      auto: { hallTill: 0, dubbelVid: null }
    });
    if (inriktning) S.inriktning = inriktning;
    S.ko = byggVecka(1);
    planeraPass();
    inp.rensa();
  }

  function pausa(pa) {
    if (pa && S.lage === 'spel') { S.lage = 'paus'; S.pausVal = 0; inp.rensa(); }
    else if (!pa && S.lage === 'paus') { S.lage = 'spel'; inp.rensa(); }
  }

  /* =====================================================================
     Veckan: schema → pass i världen
     ===================================================================== */
  function byggVecka(n) {
    // samma ordning varje vecka – bara farten ökar
    const pass = I.schema.map((p, i) => ({ ...p, dag: Math.floor(i / 2), passKey: i % 2 ? 'em' : 'fm', vecka: n }));
    if (n === 1) pass.unshift({ typ: 'uppvarmning', miljo: 'klassrum', dag: 0, passKey: 'fm', vecka: 1, titel: I.uppvarmning.hud, tavla: 'planera → genomföra → utvärdera' });
    pass.push({ typ: 'helg', miljo: 'skog', dag: 4, passKey: 'em', vecka: n, titel: 'HELG!' });
    return pass;
  }

  function losPass(r) {
    const inr = S.inriktning, info = Object.assign({}, r);
    info.miljo = r.miljo === 'apl' ? I.inriktningar[inr].apl : r.miljo;
    info.skylt = perInriktning(r.skylt, inr);
    info.under = perInriktning(r.under, inr);
    const titel = r.miljo === 'apl' ? `APL – ${I.inriktningar[inr].aplNamn}` : r.titel;
    info.hud = r.typ === 'helg' ? 'HELG!' : r.typ === 'uppvarmning' ? I.uppvarmning.hud : `${I.dagKort[r.dag]} · ${I.passKort[r.passKey]} · ${titel}`;
    info.tid = r.typ === 'utvardera' ? CONFIG.utvarderaTid : r.typ === 'helg' ? CONFIG.helgTid : r.typ === 'uppvarmning' ? CONFIG.uppvarmning.tid : CONFIG.passTid;
    return info;
  }

  function malFart(vecka, dag) {
    const f = CONFIG.fart;
    if (vecka === 1) return f.vecka1[dag];
    const start = f.veckaStart[vecka] ?? (f.veckaStart[3] + (vecka - 3) * f.perVeckaSen);
    return Math.min(f.max, start + dag * f.perDagSen);
  }

  const passFart = info => (info.typ === 'uppvarmning' ? CONFIG.uppvarmning.fart : malFart(info.vecka, info.dag)) * CONFIG.svarighet;

  function planeraPass() {
    if (S.koIndex >= S.ko.length) { S.ko = byggVecka(S.ko[0].vecka + 1); S.koIndex = 0; }
    const info = losPass(S.ko[S.koIndex++]);
    const v = CONFIG.fart.bas * passFart(info);
    const nr = S.passNr++;
    // första passet räknas från figurens startplats
    const start = S.planSlut, len = info.tid * v + (nr === 0 ? CONFIG.spelareX : 0);
    const p = { info, start, slut: start + len, len, nr, startat: false, klart: false, vagvalX: [], lappX: [] };
    if (info.typ === 'utvardera') p.vagvalX = CONFIG.vagval.utvPlacering.map(f => start + len * f);
    else if (info.typ !== 'helg' && info.vagval) p.vagvalX = [start + len * CONFIG.vagval.placering];
    if (info.typ === 'planera') p.lappX = CONFIG.planera.placering.map((f, i) => ({ x: start + len * f, lapp: I.lappar[i] }));
    S.passer.push(p);
    S.planSlut = p.slut;
    return p;
  }
  const passVid = x => S.passer.find(p => x >= p.start && x < p.slut);

  // var på dagen vi är (0 = morgon, 1 = sen eftermiddag) – styr himlen
  function dagFas(p, x) {
    const prog = clamp((x - p.start) / p.len, 0, 1);
    if (p.info.typ === 'helg') return 0.45;
    return ((p.info.passKey === 'em' ? 1 : 0) + prog) / 2;
  }
  function ritInfo(p, x) {
    const prog = clamp((x - p.start) / p.len, 0, 1);
    return {
      dagFas: dagFas(p, x), tavla: p.info.tavla, inriktning: S.inriktning,
      evenemang: I.inriktningar[S.inriktning].evenemang,
      skymning: p.info.skymning ? clamp((prog - 0.25) / 0.65, 0, 1) : 0
    };
  }

  /* =====================================================================
     Banbygget
     ===================================================================== */
  function valjSegment(miljo) {
    const [n1, n2] = [CONFIG.bana.nivaTid[1], CONFIG.bana.nivaTid[2]];
    const maxNiva = S.tid < n1 ? 0 : S.tid < n2 ? 1 : 2;
    const kand = SEGMENT.filter(s => s.niva <= maxNiva && s.id !== S.forraSegment && (!s.hjalp || miljo.hjalp));
    const vikt = s => (1 + s.niva * 0.6) * (s.hjalp ? 1.4 : 1);
    let r = Math.random() * kand.reduce((a, s) => a + vikt(s), 0);
    for (const s of kand) { r -= vikt(s); if (r <= 0) return s; }
    return kand[0];
  }

  function fyllBana() {
    let varv = 0;
    while (S.nastaX < S.kamera + W + 400 && varv++ < 40) {
      let p = passVid(S.nastaX);
      while (!p) { planeraPass(); p = passVid(S.nastaX); }
      const v = S.fart;
      const miljo = MILJOER[p.info.miljo];

      // vägval på tur?
      if (p.vagvalX.length && S.nastaX >= p.vagvalX[0] - 1) { laggVagval(p, p.vagvalX.shift()); continue; }

      // uppvärmningen: ett hopp och en glidning i lugnt tempo, sedan dörren till måndagen
      if (p.info.typ === 'uppvarmning') {
        laggSegment(UPPVARMNING, S.nastaX, v, miljo);
        S.nastaX = p.slut + CONFIG.bana.passStart * v; korridor(p, v);
        continue;
      }

      // helgen: bara glädje
      if (p.info.typ === 'helg') {
        for (let i = 0; i < 5; i++) laggForemal('gladje', S.nastaX + i * 0.16 * v, Y_NIVA.m - Math.sin(i / 4 * Math.PI) * 120);
        S.nastaX += 1.4 * v;
        if (S.nastaX > p.slut - CONFIG.bana.passKant * v) { S.nastaX = p.slut + CONFIG.bana.passStart * v; korridor(p, v); }
        continue;
      }

      const seg = valjSegment(miljo);
      const grans = Math.min(p.slut - CONFIG.bana.passKant * v, p.vagvalX.length ? p.vagvalX[0] - CONFIG.vagval.fritt * v : Infinity);
      if (S.nastaX + seg.len * v > grans) {
        // lappar som inte fått plats läggs i slutet av passet, så att ingen försvinner
        if (!p.vagvalX.length && p.lappX.length) {
          const fran = S.nastaX, till = p.slut - 0.4 * v, n = p.lappX.length;
          p.lappX.splice(0).forEach((l, i) => S.foremal.push({ typ: 'lapp', lapp: l.lapp, x: lerp(fran, till, (i + 0.5) / n), y: MARK - CONFIG.planera.hojd, taget: false, fas: 0 }));
        }
        if (p.vagvalX.length) S.nastaX = p.vagvalX[0];
        else { S.nastaX = p.slut + CONFIG.bana.passStart * v; korridor(p, v); }
        continue;
      }
      S.forraSegment = seg.id;
      laggSegment(seg, S.nastaX, v, miljo);
      const slutSeg = S.nastaX + seg.len * v;
      const dagNr = (p.info.vecka - 1) * 5 + (p.info.dag || 0);
      const tathet = Math.max(CONFIG.bana.luckaMinst, 1 - CONFIG.bana.luckaPerDag * dagNr);
      S.nastaX = slutSeg + rnd(CONFIG.bana.luckaMin, CONFIG.bana.luckaMax) * tathet * v;
      const mitt = (slutSeg + S.nastaX) / 2;

      // luckan efter segmentet: planeringslapp, kraftföremål eller extra material
      if (p.lappX.length && p.lappX[0].x <= S.nastaX) {
        const l = p.lappX.shift();
        S.foremal.push({ typ: 'lapp', lapp: l.lapp, x: mitt, y: MARK - CONFIG.planera.hojd, taget: false, fas: 0 });
      } else if (S.kraftTimer <= 0) {
        S.kraftTimer = CONFIG.kraft.intervall;
        const vikter = KRAFTER.map(k => k === 'forstaHjalpen' && S.liv < CONFIG.liv ? 2.5 : 1);
        let r = Math.random() * vikter.reduce((a, b) => a + b), sort = KRAFTER[0];
        for (let i = 0; i < KRAFTER.length; i++) { r -= vikter[i]; if (r <= 0) { sort = KRAFTER[i]; break; } }
        S.foremal.push({ typ: 'kraft', sort, x: mitt, y: Y_NIVA.h + 20, taget: false, fas: 0 });
      } else if (p.info.typ === 'genomfora' && S.fordelar.material) {
        for (let i = -1; i <= 1; i++) laggForemal(Math.random() < 0.3 ? 'zon' : 'gladje', mitt + i * 70, Y_NIVA.h);
      }
    }
  }

  // lugn sträcka genom dörren mellan två pass: inga hinder, bara några hjärtan
  function korridor(p, v) {
    if (p.korridor) return; p.korridor = true;
    for (let i = 0; i < 5; i++) laggForemal('gladje', p.slut + (0.15 + i * 0.16) * v, Y_NIVA.m - Math.sin(i / 4 * Math.PI) * 90);
  }

  function laggForemal(typ, x, y) { S.foremal.push({ typ, x, y, taget: false, fas: Math.random() * 6 }); }

  function laggSegment(seg, x0, v, m) {
    for (const d of seg.d) {
      const x = x0 + d.t * v;
      if (d.k === 'hopp' || d.k === 'hog' || d.k === 'glid') {
        const typ = valj(m[d.k]);
        const h = d.k === 'glid' ? 0 : Math.round(rnd(typ.h[0], typ.h[1]));
        const ob = { typ: d.k, sort: typ.sort, x, w: typ.w, h, traffad: false, borta: false, flyg: null, slump: Math.random(), tips: null };
        if (S.tipsVisat[d.k] < CONFIG.bana.tipsAntal) { S.tipsVisat[d.k]++; ob.tips = d.k === 'glid' ? 'GLID!' : d.k === 'hog' ? 'HÅLL INNE!' : 'HOPPA!'; }
        S.hinder.push(ob);
      } else if (d.k === 'hjalp') {
        const problem = valj(I.hjalp);
        S.hjalpare.push({ x, problem, figur: valj(BARN), skala: m.hjalp.skala, hjalpt: false, t: 0, fas: Math.random() * 6 });
      } else {
        const y = d.y ? Y_NIVA[d.y] : lerp(Y_NIVA.m, Y_NIVA.h - 40, d.bage || 0);
        laggForemal(d.k, x, y);
        if (d.tips) S.foremal[S.foremal.length - 1].tips = d.tips;
      }
    }
  }

  /* ---------- vägval ---------- */
  function hamtaFraga(p) {
    const typ = p.info.vagval, miljo = p.info.miljo;
    let lista, passar;
    if (typ === 'fraga') { lista = I.fragor; passar = q => (p.info.amnen || []).includes(q.amne); }
    else if (typ === 'utvardering') { lista = I.utvardering; passar = () => true; }
    else { lista = I.situationer; passar = q => q.miljoer.includes(miljo) || (q.miljoer.includes('apl') && p.info.moment === 'apl'); }
    // Välj den fråga som visades för längst sedan (sparas i webbläsaren, så att nästa spelare
    // i montern får andra frågor). Ingen fråga upprepas inom samma runda om det finns andra.
    let kand = lista.filter(passar);
    if (!kand.length) kand = lista;
    const id = q => typ + ':' + (q.fraga || q.text);
    const ejIRundan = kand.filter(q => !S.anvandaRunda.has(id(q)));
    if (ejIRundan.length) kand = ejIRundan;
    const senast = store.get('bfrush_fragor', {});
    const aldst = Math.min(...kand.map(q => senast[id(q)] || 0));
    const val = valj(kand.filter(q => (senast[id(q)] || 0) === aldst));
    senast[id(val)] = Date.now(); store.set('bfrush_fragor', senast);
    S.anvandaRunda.add(id(val));
    return val;
  }

  function laggVagval(p, x) {
    const V = CONFIG.vagval, v = S.fart;
    const fraga = hamtaFraga(p);
    const forkX = x + V.inled * v, slutX = forkX + V.plattform * v;
    const pl = { x1: forkX, x2: slutX, y: MARK - V.hojd, tjock: V.tjock };
    const vv = {
      typ: p.info.vagval, fraga, x, forkX, pausX: x + V.pausVid * v, beslutX: forkX + V.beslut * v, pl, avgjord: false,
      ratt: Math.random() < 0.5 ? 'upp' : 'ner',   // slumpa om rätt svar ligger uppe eller nere
      miljo: p.info.miljo, pass: p
    };
    S.plattformar.push(pl);
    S.vagvalLista.push(vv);
    // hjärtan på den tomma sträckan före
    for (let i = 0; i < 3; i++) laggForemal('gladje', x + (0.35 + i * 0.35) * v, Y_NIVA.m);
    // glädje på båda vägarna
    for (let i = 0; i < 4; i++) {
      laggForemal('gladje', forkX + (0.5 + i * 0.28) * v, pl.y - 70);
      laggForemal('gladje', forkX + (0.5 + i * 0.28) * v, Y_NIVA.m);
    }
    S.nastaX = slutX + V.efter * v;
  }

  function avgorVagval(vv) {
    const p = S.sp, V = CONFIG.vagval;
    vv.avgjord = true;
    const uppe = p.y <= vv.pl.y + 4;
    vv.valt = uppe ? 'upp' : 'ner';
    const ratt = vv.valt === vv.ratt;
    const sortNyckel = vv.typ === 'fraga' ? 'fraga' : vv.typ === 'utvardering' ? 'utv' : 'situation';
    S.stat[sortNyckel + 'Tot']++; S.veckaStat.valTot++;
    const px = S.kamera + CONFIG.spelareX;
    if (ratt) {
      S.stat[sortNyckel + 'Ratt']++; S.veckaStat.valRatt++;
      const pts = CONFIG.poang.vagval * mult();
      laggPoang(pts);
      flytText(px, p.y - 220, `${I.vagvalRatt} +${pts}`, F.gron, 80);
      S.slowmo = V.slowmo; S.gronBlink = 0.6;
      if (S.combo < CONFIG.combo.max) { S.combo++; S.comboRakning = 0; S.comboPop = 1; }
      partiklarRing(px, p.y - 80, F.gron, 22);
      konfetti(px + 200, p.y - 200, 30);
      Ljud.ratt();
    } else {
      flytText(px, p.y - 220, I.vagvalFel, '#ffffff', 72);
      Ljud.fel();
    }
    const rattText = vv.typ === 'fraga' ? vv.fraga.ratt : vv.fraga.ratt;
    S.resultat = { ratt, t: 0, text: ratt ? I.vagvalRatt : `${I.vagvalFel} Rätt: ${rattText}`, forklaring: vv.fraga.forklaring || '' };
  }

  // Träffytor (världskoordinater)
  function hinderYta(ob) {
    if (YTA[ob.sort]) return YTA[ob.sort](ob);
    if (ob.typ === 'glid') return { x1: ob.x + 14, x2: ob.x + ob.w - 14, y1: -2000, y2: MARK - CONFIG.glidFri };
    return { x1: ob.x + 12, x2: ob.x + ob.w - 12, y1: MARK - ob.h + 8, y2: MARK };
  }
  function spelarYta() {
    const p = S.sp, f = CONFIG.figur, h = p.glider ? f.glidHojd : f.hojd;
    const x = S.kamera + CONFIG.spelareX;
    return { x1: x - f.bredd / 2, x2: x + f.bredd / 2, y1: p.y - h, y2: p.y };
  }
  const overlapp = (a, b) => a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;

  /* =====================================================================
     Poäng
     ===================================================================== */
  const mult = () => S.combo * (S.teamwork > 0 ? 2 : 1) * (S.fordelar.syfte ? 2 : 1);
  function laggPoang(p) { S.poang = Math.min(CONFIG.poang.tak, S.poang + p); if (p >= 10) S.poangPop = Math.min(1, (S.poangPop || 0) + 0.35); }

  /* =====================================================================
     Uppdatering – figuren
     ===================================================================== */
  function golvUnder(px, fotY) {
    let g = MARK;
    for (const pl of S.plattformar) if (px + 24 > pl.x1 && px - 24 < pl.x2 && fotY <= pl.y + 8) g = Math.min(g, pl.y);
    return g;
  }

  function uppdateraSpelare(dt) {
    const p = S.sp, Hc = CONFIG.hopp, px = S.kamera + CONFIG.spelareX;

    if (inp.tryck.hopp) {
      inp.tryck.hopp = false;
      if (p.paMark || p.coyote > 0) hoppa(false);
      else if (p.hoppAntal < 2) hoppa(true);
      else p.buffert = Hc.buffert;
    }
    if (p.buffert > 0) { p.buffert -= dt; if (p.paMark) { p.buffert = 0; hoppa(false); } }
    if (!inp.hoppNere) p.haller = false;

    if (inp.tryck.glid) {
      inp.tryck.glid = false;
      if (p.paMark) { p.glidTid = CONFIG.glid.minTid; if (!p.glider) Ljud.glid(); }
      else { p.vy = Math.max(p.vy, Hc.snabbFall); p.glidTid = CONFIG.glid.minTid; }
    }
    if (p.glidTid > 0) p.glidTid -= dt;
    const varGlid = p.glider;
    p.glider = p.paMark && (inp.glidNere || p.glidTid > 0);
    if (p.glider && !varGlid) { p.sx = 1.25; p.sy = 0.8; partiklarDamm(4); }

    // springer man av en plattform börjar man falla
    p.golv = golvUnder(px, p.y);
    if (p.paMark && p.y < p.golv - 1) { p.paMark = false; p.coyote = Hc.coyote; p.hoppAntal = 1; }

    if (!p.paMark) {
      let g = Hc.grav;
      if (p.haller && p.vy < 0 && p.hallTid < Hc.maxHall) { g = Hc.gravHall; p.hallTid += dt; }
      const forraY = p.y;
      p.vy += g * dt;
      p.y += p.vy * dt;
      p.coyote -= dt;
      // huvudet i plattformens undersida
      if (p.vy < 0) for (const pl of S.plattformar) {
        const under = pl.y + pl.tjock, hojd = p.glider ? CONFIG.figur.glidHojd : CONFIG.figur.hojd;
        if (px + 24 > pl.x1 && px - 24 < pl.x2 && forraY > under && p.y - hojd < under) { p.y = under + hojd; p.vy = 0; }
      }
      const golv = golvUnder(px, forraY);
      if (p.vy >= 0 && p.y >= golv) {
        p.y = golv; p.vy = 0; p.paMark = true; p.hoppAntal = 0;
        p.sx = 1.28; p.sy = 0.74; partiklarDamm(8); Ljud.landa();
      }
    }

    p.sx = lerp(p.sx, 1, Math.min(1, dt * 12)); p.sy = lerp(p.sy, 1, Math.min(1, dt * 12));
    p.fas += dt * S.fart / 95;
    p.lutning = lerp(p.lutning, p.paMark ? 0 : clamp(p.vy / 2600, -0.25, 0.3), Math.min(1, dt * 10));
    if (p.skydd > 0) p.skydd -= dt;
  }

  function hoppa(dubbel) {
    const p = S.sp, Hc = CONFIG.hopp;
    p.vy = -(dubbel ? Hc.dubbel : Hc.kraft);
    p.paMark = false; p.glider = false; p.glidTid = 0; p.coyote = 0; p.buffert = 0;
    p.hoppAntal = dubbel ? 2 : 1; p.hallTid = 0; p.haller = true;
    p.sx = 0.78; p.sy = 1.25;
    if (dubbel) { Ljud.dubbelhopp(); partiklarRing(S.kamera + CONFIG.spelareX, p.y - 20, '#ffffff', 10); }
    else { Ljud.hopp(); partiklarDamm(5); }
  }

  function skadas(ob) {
    const p = S.sp;
    ob.traffad = true;
    // stående hinder flyger iväg, hängande gungar till och bleknar
    if (ob.typ !== 'glid' && ob.sort !== 'vattenpol' && ob.sort !== 'back') ob.flyg = { vx: rnd(500, 800), vy: rnd(-1100, -800), rot: 0, vr: rnd(6, 12) };
    if (p.skydd > 0) return;
    const px = S.kamera + CONFIG.spelareX;
    if (S.skold) {
      S.skold = false; p.skydd = 0.8;
      flytText(px, p.y - 200, 'Skölden tog smällen!', F.turkos, 54);
      partiklarRing(px, p.y - 80, F.turkos, 18); Ljud.landa();
      return;
    }
    S.liv--; p.skydd = CONFIG.skyddTid; S.skak = CONFIG.skak; S.skadaBlink = 0.25;
    S.combo = 1; S.comboRakning = 0;
    Ljud.skada();
    flytText(px, p.y - 200, 'Aj!', F.korall, 70);
    partiklarRing(px, p.y - 70, F.korall, 16);
    if (ob.sort === 'back' || ob.sort === 'vattenpol') { p.vy = -1100; p.paMark = false; p.hoppAntal = 1; }
    if (S.liv <= 0) slutaRunda();
  }

  function slutaRunda() {
    if (S.aktivt) S.slutPass = S.aktivt;
    if (S.demo) { nastaAttract(); return; }       // demon i attract mode sparas aldrig
    S.lage = 'slut'; S.slutTid = 0; Ljud.slut();
    S.plats = T.placering(S.poang); S.vantarNamn = !!S.plats; S.sparadId = null;
    inp.rensa();
  }

  function samla(fm) {
    fm.taget = true;
    const px = S.kamera + CONFIG.spelareX;
    if (fm.typ === 'kraft') return aktiveraKraft(fm.sort);
    if (fm.typ === 'lapp') {
      S.lappar.add(fm.lapp.id); S.veckaStat.lappar = S.lappar.size;
      const pts = CONFIG.poang.lapp * mult(); laggPoang(pts);
      flytText(fm.x, fm.y - 60, `${fm.lapp.namn}! +${pts}`, F.gul, 64);
      partiklarRing(fm.x, fm.y, F.gul, 24); Ljud.zon();
      return;
    }
    const varde = fm.typ === 'zon' ? CONFIG.poang.zon : CONFIG.poang.gladje;
    const pts = varde * mult();
    laggPoang(pts);
    flytText(fm.x, fm.y - 40, '+' + pts, fm.typ === 'zon' ? F.gul : '#ffffff', fm.typ === 'zon' ? 56 : 40);
    partiklarRing(fm.x, fm.y, fm.typ === 'zon' ? F.gul : F.rosa, fm.typ === 'zon' ? 18 : 10);
    if (fm.typ === 'zon') Ljud.zon(); else Ljud.samla(S.comboRakning);
    raknaCombo();
    void px;
  }
  function raknaCombo() {
    if (S.combo < CONFIG.combo.max && ++S.comboRakning >= CONFIG.combo.per) {
      S.combo++; S.comboRakning = 0; S.comboPop = 1; Ljud.combo(S.combo);
      flytText(S.kamera + CONFIG.spelareX + 40, S.sp.y - 240, `COMBO ×${S.combo}!`, F.gul, 64);
      partiklarRing(S.kamera + CONFIG.spelareX, S.sp.y - 80, F.gul, 18);
    }
  }

  function hjalp(h) {
    h.hjalpt = true; h.t = 0;
    S.stat.hjalpta++; S.veckaStat.hjalpta++;
    const pts = CONFIG.poang.hjalp * mult(); laggPoang(pts);
    flytText(h.x, MARK - 260, `${I.hjalptText} +${pts}`, F.gron, 60);
    flytText(h.x, MARK - 190, h.problem.tack, '#ffffff', 40);
    partiklarRing(h.x, MARK - 80, F.gron, 16);
    Ljud.hjalp(); raknaCombo();
    if (Math.random() < CONFIG.hjalp.foljChans) { h.foljer = CONFIG.hjalp.foljTid; S.foljare.push(h); }
  }

  function aktiveraKraft(sort) {
    const K = I.kraft[sort], px = S.kamera + CONFIG.spelareX;
    S.kraftSkylt = { namn: K.namn, text: K.text, sort, t: 0 };
    Ljud.kraft();
    if (sort === 'visselpipa') {
      Ljud.vissla();
      for (const ob of S.hinder) if (!ob.borta && ob.x < S.kamera + W && ob.x + ob.w > S.kamera) {
        ob.borta = true; konfetti(ob.x + ob.w / 2, ob.typ === 'glid' ? MARK - 260 : MARK - (ob.h || 100) / 2, 26);
      }
    } else if (sort === 'forstaHjalpen') {
      if (S.liv < CONFIG.liv) { S.liv++; flytText(px, S.sp.y - 220, '+1 ♥', F.korall, 70); }
      else { S.skold = true; flytText(px, S.sp.y - 220, 'Sköld!', F.turkos, 70); }
    } else if (sort === 'teamwork') S.teamwork = CONFIG.kraft.teamworkTid;
    else if (sort === 'frukt') S.magnet = CONFIG.kraft.fruktTid;
  }

  /* =====================================================================
     Pass: händelser när ett nytt pass börjar
     ===================================================================== */
  function passBorjar(p, forra) {
    const info = p.info;
    p.startat = true;
    S.aktivt = p;
    if (forra) {
      forra.klart = true;
      if (forra.info.moment) S.stat.moment.add(forra.info.moment);
      if (forra.info.typ === 'genomfora') S.fordelar = {};
    }

    if (info.typ === 'helg') {
      S.veckokort = { t: 0, vecka: info.vecka, lappar: S.lappar.size, valRatt: S.veckaStat.valRatt, valTot: S.veckaStat.valTot, hjalpta: S.veckaStat.hjalpta };
      S.stat.lapparBast = Math.max(S.stat.lapparBast, S.lappar.size);
      S.skylt = null;
      return;
    }
    if (info.typ === 'uppvarmning') { banderoll(I.uppvarmning.banderoll, F.turkos, 2.2); return; }
    // ny vecka
    if (forra && forra.info.typ === 'helg') {
      S.stat.veckor++;
      S.lappar = new Set(); S.veckaStat = { lappar: 0, valRatt: 0, valTot: 0, hjalpta: 0 };
      S.glasogon = false;
      banderoll(fyll(I.nyVecka, { n: info.vecka }), F.korall, 2.2);
    } else if (!forra || forra.info.dag !== info.dag || forra.info.typ === 'uppvarmning') {
      banderoll(I.dagar[info.dag].toUpperCase() + '!', F.gul, 1.4);
      Ljud.dag();
    }
    // passets tema visas i läspausen före första frågan (se ritaVagvalBanner)

    if (info.typ === 'genomfora') {
      const har = I.lappar.filter(l => S.lappar.has(l.id));
      S.fordelar = { syfte: S.lappar.has('syfte'), material: S.lappar.has('material'), sakerhet: S.lappar.has('sakerhet'), tidsplan: S.lappar.has('tidsplan') };
      if (S.fordelar.sakerhet) S.skold = true;
      S.planSkylt = { har, t: 0 };
    }
  }

  function helgFest(p) {
    // efter veckokortet: HELG! med konfetti och bonus
    S.helgFest = 3;
    S.glasogon = true;
    const bonus = CONFIG.poang.helg * p.info.vecka;   // ingen multiplikator på helgbonusen
    laggPoang(bonus);
    banderoll(`${I.helg}  +${fmt(bonus)}`, F.gul, 2.6, true);
    for (let i = 0; i < 6; i++) konfetti(rnd(200, W - 200) + S.kamera, rnd(100, 400), 30);
    Ljud.fanfar();
  }

  /* =====================================================================
     Autopilot (attract mode och tester) – spelar ganska bra
     ===================================================================== */
  function autopilot(dt) {
    const a = S.auto, p = S.sp, px = S.kamera + CONFIG.spelareX;
    if (a.hallTill > 0) { a.hallTill -= dt; if (a.hallTill <= 0) inp.upp('hopp', 'auto'); }
    if (a.dubbelVid !== null && !p.paMark && p.vy > a.dubbelVid) { a.dubbelVid = null; inp.upp('hopp', 'auto'); inp.ned('hopp', 'auto'); a.hallTill = 0.25; }
    const hopp = (hall, dubbel = null) => { inp.upp('hopp', 'auto'); inp.ned('hopp', 'auto'); a.hallTill = hall; a.dubbelVid = dubbel; };
    const kanHoppa = p.paMark && !p.glider && a.hallTill <= 0;

    // vägval: hoppa upp om det svar autopiloten väljer ligger uppe (men ta hinder som ligger före först)
    const vv = S.vagvalLista.find(v => !v.avgjord && v.pl.x2 > px);
    const forstaHinder = S.hinder.filter(o => !o.traffad && !o.borta && o.x + o.w > px - 30).sort((x, y) => x.x - y.x)[0];
    if (vv && px < vv.beslutX && !(forstaHinder && forstaHinder.x < vv.pl.x1)) {
      if (vv.autoVal === undefined) vv.autoVal = Math.random() < S.autopilotFel ? (vv.ratt === 'upp' ? 'ner' : 'upp') : vv.ratt;
      const t = (vv.pl.x1 - px) / S.fart;
      if (vv.autoVal === 'upp' && t < 0.3 && t > 0 && kanHoppa && p.y >= MARK - 1) hopp(0.3);
      if (t < 1.2) { inp.upp('glid', 'auto'); return; }
    }
    // planeringslappar och kraftföremål högt upp
    const mal = S.foremal.find(f => !f.taget && (f.typ === 'lapp' || f.typ === 'kraft') && f.x > px - 20 && f.x - px < S.fart * 0.6);
    if (mal && kanHoppa) {
      const t = (mal.x - px) / S.fart;
      const hindNara = S.hinder.some(o => !o.traffad && !o.borta && o.x > px && o.x - px < S.fart * 0.9);
      if (!hindNara && t < (mal.typ === 'lapp' ? 0.42 : 0.3)) { hopp(0.3, mal.typ === 'lapp' ? -150 : null); return; }
    }
    // hinder
    const n = S.hinder.filter(o => !o.traffad && !o.borta && o.x + o.w > px - 30).sort((x, y) => x.x - y.x)[0];
    if (!n) { inp.upp('glid', 'auto'); return; }
    const t = (n.x - (px + 30)) / S.fart;
    if (n.typ === 'glid') { if (t < 0.2) inp.ned('glid', 'auto'); }
    else {
      inp.upp('glid', 'auto');
      const tr = n.typ === 'hog' ? 0.2 : (n.sort === 'back' || n.sort === 'vattenpol' || n.sort === 'bank' || n.sort === 'pingisbord' || n.sort === 'stock') ? 0.12 : 0.13;
      if (t < tr && kanHoppa) hopp(n.typ === 'hog' || n.w > 160 ? 0.3 : 0.05);
    }
  }

  /* =====================================================================
     Huvuduppdatering
     ===================================================================== */
  function uppdatera(dt) {
    S.klocka += dt; B.klocka = S.klocka;
    if (S.personalOppen) { for (const k in inp.tryck) inp.tryck[k] = false; Musik.uppdatera(false, 1); return; }
    if (inp.tryck.ljud) { inp.tryck.ljud = false; Ljud.vaxla(); Ljud.starta(); Ljud.klick(); }
    Musik.uppdatera(Ljud.pa && CONFIG.musikPa && S.lage === 'spel' && !S.demo && !S.lasPaus, S.fartFaktor || 1);
    const ledig = (performance.now() - inp.sistaAktivitet) / 1000;

    if (S.attract) uppdateraAttract(dt);
    else if (S.lage === 'spel') {
      if (S.autopilot) autopilot(dt);
      uppdateraSpel(dt);
      if (inp.tryck.paus && !S.autopilot) pausa(true);
    } else if (S.lage === 'paus') {
      if (inp.tryck.nav === 'upp') S.pausVal = 0;
      if (inp.tryck.nav === 'ner') S.pausVal = 1;
      if (inp.tryck.paus) pausa(false);
      else if (inp.tryck.pausValj || inp.tryck.valj) { Ljud.klick(); if (S.pausVal === 1) gaTillStart(); else pausa(false); }
    } else if (S.lage === 'slut') {
      S.slutTid += dt;
      const v = Math.max(0, S.fart * (1 - S.slutTid / 0.7));
      S.kamera += v * dt;
      uppdateraEffekter(dt);
      if (S.vantarNamn && S.slutTid > 1.6) { S.vantarNamn = false; oppnaNamn(); }
      else if (!S.vantarNamn && S.slutTid > 1.2 && inp.tryck.valfri) { Ljud.klick(); visaFigur(); }
      else if (MONTER && !S.vantarNamn && ledig > CONFIG.attract.vanta && S.slutTid > CONFIG.attract.vanta) startaAttract();
    } else if (S.lage === 'namn') {
      uppdateraNamn(dt, ledig);
    } else if (S.lage === 'start') {
      S.kamera += 260 * dt;
      uppdateraEffekter(dt);
      if (inp.tryck.valfri && S.klocka > 0.4) { Ljud.klick(); visaFigur(); }
      else if (MONTER && ledig > CONFIG.attract.vanta) startaAttract();
    } else if (S.lage === 'figur') {
      S.kamera += 260 * dt;
      S.figurTid += dt;
      const n = FIGURER.length;
      if (S.figurTid > 0.3) {
        if (inp.tryck.siffra) valjFigur(inp.tryck.siffra - 1);
        else if (inp.tryck.hopp) valjFigur(S.figurIndex);
        else if (inp.tryck.glid || inp.tryck.hoger) { S.figurIndex = (S.figurIndex + 1) % n; S.figurTid = Math.min(S.figurTid, CONFIG.figurTid - 3); Ljud.klick(); }
        else if (inp.tryck.vanster) { S.figurIndex = (S.figurIndex + n - 1) % n; S.figurTid = Math.min(S.figurTid, CONFIG.figurTid - 3); Ljud.klick(); }
        else if (S.figurTid > CONFIG.figurTid) valjFigur(S.figurIndex);
      }
    } else if (S.lage === 'inriktning') {
      S.kamera += 260 * dt;
      S.inrTid += dt;
      let val = null;
      if (inp.tryck.hopp || inp.tryck.vanster) val = 'fh';
      else if (inp.tryck.glid || inp.tryck.hoger) val = 'psa';
      else if (S.inrTid > CONFIG.inriktningTid) val = Math.random() < 0.5 ? 'fh' : 'psa';
      if (val && S.inrTid > 0.25) { Ljud.klick(); S.autopilot = false; nyRunda(val); }
    }
    for (const k in inp.tryck) inp.tryck[k] = false;
  }

  function gaTillStart() {
    // avbryt rundan utan att spara och gå tillbaka till startskärmen
    S.lage = 'start'; S.attract = null; S.demo = false; S.autopilot = false; S.lasPaus = 0;
    rensaEffekter(); inp.rensa(); inp.sistaAktivitet = performance.now();
  }

  function rensaEffekter() { S.partiklar = []; S.texter = []; S.banderoller = []; S.skak = 0; S.skadaBlink = 0; S.gronBlink = 0; }

  function visaFigur() {
    S.lage = 'figur'; S.figurTid = 0; S.figurIndex = Math.floor(Math.random() * FIGURER.length);
    S.attract = null; S.demo = false; S.autopilot = false;
    rensaEffekter(); inp.rensa();
  }
  function valjFigur(i) {
    S.figurIndex = clamp(i, 0, FIGURER.length - 1); S.figur = FIGURER[S.figurIndex];
    Ljud.klick(); visaInriktning();
  }
  function visaInriktning() {
    S.lage = 'inriktning'; S.inrTid = 0;
    rensaEffekter(); inp.rensa();
  }

  /* ---------- attract mode (monterläget): topplista → demo → "Vad är BF?" ---------- */
  const ATTRACT = ['topp', 'demo', 'vadar'];
  function startaAttract() { S.attract = { i: -1, t: 0 }; nastaAttract(); }
  function nastaAttract() {
    const a = S.attract; if (!a) return;
    a.i = (a.i + 1) % ATTRACT.length; a.t = 0; a.typ = ATTRACT[a.i];
    if (a.typ === 'demo') {
      S.demo = true; S.autopilot = true; S.autopilotFel = 0.15; S.figur = valj(FIGURER);
      nyRunda(Math.random() < 0.5 ? 'fh' : 'psa');
    } else {
      S.demo = false; S.autopilot = false; S.lage = 'attract'; rensaEffekter(); inp.rensa();
    }
  }
  function uppdateraAttract(dt) {
    const a = S.attract;
    a.t += dt;
    // valfri knapp (men inte autopilotens egna tryck) startar ett riktigt spel
    if (inp.tryck.valfri || inp.tryck.paus || inp.tryck.siffra) { Ljud.klick(); visaFigur(); return; }
    if (a.typ === 'demo') { autopilot(dt); uppdateraSpel(dt); }
    else { S.kamera += 200 * dt; uppdateraEffekter(dt); }
    if (S.attract && a.t > CONFIG.attract[a.typ]) nastaAttract();
  }

  /* ---------- namnregistrering med skärmtangentbord ---------- */
  const TANG_RADER = ['1234567890', 'QWERTYUIOPÅ', 'ASDFGHJKLÖÄ', 'ZXCVBNM-'];
  const MAXLANGD = [12, 20];
  function tangentLayout() {
    const ut = [], kw = 104, kh = 82, gap = 12, y0 = 560;
    TANG_RADER.forEach((rad, r) => {
      const n = rad.length, x0 = W / 2 - (n * kw + (n - 1) * gap) / 2;
      [...rad].forEach((ch, k) => ut.push({ r, k, x: x0 + k * (kw + gap), y: y0 + r * (kh + gap), w: kw, h: kh, typ: 'tecken', etikett: ch }));
    });
    const sista = [['MELLANSLAG', 340, 'mellanslag'], ['⌫', 180, 'radera'], [I.namnHoppa, 330, 'hoppa'], [S.namn && S.namn.falt === 0 ? I.namnNasta : I.namnKlar, 330, 'klar']];
    const total = sista.reduce((a, t) => a + t[1], 0) + gap * (sista.length - 1);
    let x = W / 2 - total / 2;
    sista.forEach(([etikett, w, typ], k) => { ut.push({ r: 4, k, x, y: y0 + 4 * (kh + gap), w, h: kh, typ, etikett }); x += w + gap; });
    return ut;
  }
  const FALT_Y = [280, 395];
  function oppnaNamn() {
    S.lage = 'namn';
    S.namn = { falt: 0, varden: ['', ''], r: 4, k: 3, msg: '', fel: false, t: 0 };
    S.namn.r = 1; S.namn.k = 0;
    inp.rensa(); Ljud.fanfar();
  }
  function hoppaNamn() { S.lage = 'slut'; S.vantarNamn = false; S.namnHoppad = true; S.slutTid = Math.max(S.slutTid, 1.3); inp.rensa(); }
  function namnMeddelande(t, fel = true) { S.namn.msg = t; S.namn.fel = fel; S.namn.msgT = 3; if (fel) Ljud.fel(); }
  function skriv(ch) {
    const n = S.namn, v = n.varden[n.falt];
    if (v.length >= MAXLANGD[n.falt]) return;
    if (ch === ' ' && (!v || v.endsWith(' '))) return;
    // första bokstaven (och efter mellanslag) blir stor, resten små
    const stor = !v || v.endsWith(' ') || v.endsWith('-');
    n.varden[n.falt] = v + (/\p{L}/u.test(ch) ? (stor ? ch.toUpperCase() : ch.toLowerCase()) : ch);
  }
  function tryckTangent(t) {
    const n = S.namn; if (!t || n.t < 0.6) return;
    if (t.typ === 'tecken') skriv(t.etikett);
    else if (t.typ === 'mellanslag') skriv(' ');
    else if (t.typ === 'radera') n.varden[n.falt] = n.varden[n.falt].slice(0, -1);
    else if (t.typ === 'hoppa') { hoppaNamn(); return; }
    else if (t.typ === 'klar') {
      const v = n.varden[n.falt].trim();
      if (n.falt === 0) {
        if (!v) return namnMeddelande(I.namnTomt);
        if (!T.arOk(v)) { n.varden[0] = ''; return namnMeddelande(I.namnBlockerat); }
        n.falt = 1; n.msg = ''; Ljud.klick(); return;
      }
      if (v && !T.arOk(v)) { n.varden[1] = ''; return namnMeddelande(I.namnBlockerat); }
      sparaNamn(); return;
    }
    Ljud.klick();
  }
  function sparaNamn() {
    const n = S.namn;
    const { post, plats } = T.laggTill({ namn: n.varden[0].trim(), skola: n.varden[1].trim(), poang: S.poang, inriktning: S.inriktning, monter: MONTER });
    S.sparadId = post.id; S.plats = plats; S.lage = 'slut'; S.vantarNamn = false; S.slutTid = Math.max(S.slutTid, 1.3);
    Ljud.ratt(); inp.rensa();
  }
  function flyttaMarkor(r) {
    const n = S.namn, lay = tangentLayout();
    const nu = lay.find(t => t.r === n.r && t.k === n.k) || lay[0];
    if (r === 'vanster' || r === 'hoger') {
      const rad = lay.filter(t => t.r === n.r);
      n.k = (n.k + (r === 'hoger' ? 1 : -1) + rad.length) % rad.length;
    } else {
      const nr = clamp(n.r + (r === 'ner' ? 1 : -1), 0, 4);
      const rad = lay.filter(t => t.r === nr), mitt = nu.x + nu.w / 2;
      let bast = rad[0]; for (const t of rad) if (Math.abs(t.x + t.w / 2 - mitt) < Math.abs(bast.x + bast.w / 2 - mitt)) bast = t;
      n.r = nr; n.k = bast.k;
    }
  }
  function uppdateraNamn(dt, ledig) {
    const n = S.namn; n.t += dt; if (n.msgT > 0) n.msgT -= dt;
    if (n.t < 0.6) return;
    if (inp.tryck.nav) flyttaMarkor(inp.tryck.nav);
    if (inp.tryck.valj) tryckTangent(tangentLayout().find(t => t.r === n.r && t.k === n.k));
    if (inp.tryck.radera) tryckTangent({ typ: 'radera' });
    if (inp.tryck.klar) tryckTangent({ typ: 'klar' });
    if (S.lage === 'namn' && ledig > CONFIG.namnTimeout) hoppaNamn();
  }
  function namnTangent(e) {
    const n = S.namn; if (!n || n.t < 0.6) return;
    if (e.key === 'Enter') tryckTangent({ typ: 'klar' });
    else if (e.key === 'Backspace') tryckTangent({ typ: 'radera' });
    else if (e.key === 'Tab') n.falt = n.falt ? 0 : 1;
    else if (e.key.startsWith('Arrow')) flyttaMarkor({ ArrowUp: 'upp', ArrowDown: 'ner', ArrowLeft: 'vanster', ArrowRight: 'hoger' }[e.key]);
    else if (e.key.length === 1 && /[\p{L}\p{N} \-]/u.test(e.key) && !e.ctrlKey && !e.metaKey) { skriv(e.key); }
  }
  function namnKlick(x, y) {
    const n = S.namn; if (!n) return;
    FALT_Y.forEach((fy, i) => { if (Math.abs(y - fy) < 45 && Math.abs(x - W / 2) < 500) n.falt = i; });
    const t = tangentLayout().find(t => x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h);
    if (t) { n.r = t.r; n.k = t.k; tryckTangent(t); }
  }

  /* ---------- personalmenyn (js/personal.js) ---------- */
  function oppnaPersonal() {
    if (S.personalOppen || !window.BFPersonal) return;
    if (S.lage === 'spel' && !S.demo) pausa(true);
    S.personalOppen = true; inp.rensa();
    window.BFPersonal.oppna({
      CONFIG, Topp: T,
      ljudPa: () => Ljud.pa, vaxlaLjud: () => { Ljud.vaxla(); Ljud.starta(); },
      musikPa: () => CONFIG.musikPa, vaxlaMusik: () => { CONFIG.musikPa = !CONFIG.musikPa; store.set('bfrush_musik', CONFIG.musikPa); },
      sattSvarighet: v => { CONFIG.svarighet = v; store.set('bfrush_svarighet', v); },
      sattFps: b => { CONFIG.visaFps = b; store.set('bfrush_fps', b); },
      stang: () => { S.personalOppen = false; inp.rensa(); inp.sistaAktivitet = performance.now(); canvas.focus({ preventScroll: true }); }
    });
  }

  function uppdateraSpel(dtVerklig) {
    // läspaus: allt står still medan frågan visas stort
    if (S.lasPaus > 0) {
      S.lasPaus -= dtVerklig; S.lasT += dtVerklig;
      if (S.lasT > S.lasMinNu && (inp.tryck.hopp || inp.tryck.glid)) S.lasPaus = 0;
      if (S.lasPaus <= 0) inp.rensa();
      if (S.vagvalVisas) S.vagvalVisas.visadT += dtVerklig;
      uppdateraEffekter(0, dtVerklig);
      return;
    }
    if (S.slowmo > 0) { S.slowmo -= dtVerklig; S.tidSkala = CONFIG.vagval.slowSkala; } else S.tidSkala = 1;
    const dt = dtVerklig * S.tidSkala;
    S.tid += dt; B.tid = S.tid;
    const px = S.kamera + CONFIG.spelareX;

    // aktuellt pass
    const p = passVid(px) || S.aktivt;
    if (p && p !== S.aktivt) passBorjar(p, S.aktivt);
    const info = S.aktivt.info;

    // farten glider mot dagens mål (lite lugnare medan en fråga visas)
    let mal = passFart(info);
    if (S.fordelar.tidsplan) mal *= CONFIG.planera.tidsplanFart;
    if (S.vagvalVisas) mal *= CONFIG.vagval.broms;
    S.fartFaktor += clamp(mal - S.fartFaktor, -CONFIG.fart.acceleration * 2 * dt, CONFIG.fart.acceleration * dt);
    S.fart = CONFIG.fart.bas * S.fartFaktor;

    // timers
    S.kraftTimer -= dt;
    if (S.teamwork > 0) S.teamwork -= dt;
    if (S.magnet > 0) S.magnet -= dt;
    if (S.helgFest > 0) S.helgFest -= dtVerklig;
    if (S.veckokort) { S.veckokort.t += dtVerklig; if (S.veckokort.t > CONFIG.veckokortTid && !S.veckokort.klar) { S.veckokort.klar = true; helgFest(S.aktivt); } if (S.veckokort.t > CONFIG.veckokortTid + 0.4) S.veckokort = null; }

    // fysik i små steg så att inget hinder "hoppas över" vid hög fart
    const steg = Math.max(1, Math.ceil(dt / (1 / 120)));
    const ds = dt / steg;
    for (let i = 0; i < steg && S.lage === 'spel'; i++) {
      S.kamera += S.fart * ds;
      laggPoang((S.fart * ds / CONFIG.meterPx) * CONFIG.poang.perMeter * mult());
      uppdateraSpelare(ds);
      const py = spelarYta(), pmx = (py.x1 + py.x2) / 2;
      for (const ob of S.hinder) {
        if (ob.traffad || ob.borta || ob.x > py.x2 + 20 || ob.x + ob.w < py.x1 - 20) continue;
        if (overlapp(py, hinderYta(ob))) skadas(ob);
      }
      for (const fm of S.foremal) {
        if (fm.taget) continue;
        const dx = fm.x - pmx, dyy = fm.y - (py.y1 + py.y2) / 2;
        const r = fm.typ === 'kraft' || fm.typ === 'lapp' ? 80 : 62;
        if (Math.abs(dx) < r && Math.abs(dyy) < (py.y2 - py.y1) / 2 + 40) samla(fm);
      }
      for (const h of S.hjalpare) if (!h.hjalpt && Math.abs(h.x - pmx) < 70 && S.sp.y > MARK - 230) hjalp(h);
      for (const vv of S.vagvalLista) if (!vv.avgjord && S.kamera + CONFIG.spelareX >= vv.beslutX) avgorVagval(vv);
    }

    // magneten (fruktskålen) drar till sig allt samlingsbart
    if (S.magnet > 0) for (const fm of S.foremal) {
      if (fm.taget) continue;
      const dx = px - fm.x, dyy = (S.sp.y - 80) - fm.y, d = Math.hypot(dx, dyy);
      if (d < CONFIG.kraft.magnetRadie) { const k = Math.min(1, dt * 9); fm.x += dx * k; fm.y += dyy * k; }
    }

    // vilken fråga som ska visas just nu
    // frågan dyker upp på den tomma sträckan före vägvalet, när figuren står på marken.
    // En fråga som väl visats ligger kvar tills vägvalet är avgjort.
    const nasta = S.vagvalLista.find(v => !v.avgjord && (v.visad || (px >= v.pausX && (S.sp.paMark || px >= v.forkX - 0.6 * S.fart))));
    if (nasta && S.vagvalVisas !== nasta) {
      S.vagvalVisas = nasta; nasta.visadT = 0; S.resultat = null;
      if (!nasta.visad) { nasta.visad = true; const utv = nasta.typ === 'utvardering', forst = !nasta.pass.temaVisat; nasta.pass.temaVisat = true; nasta.visaTema = forst;
        S.lasTidNu = (utv ? CONFIG.vagval.utvLasTid : CONFIG.vagval.lasTid) + (forst ? CONFIG.vagval.temaTid : 0); S.lasMinNu = utv ? CONFIG.vagval.utvLasMin : CONFIG.vagval.lasMin; S.lasPaus = S.lasTidNu; S.lasT = 0; S.antalLaspauser = (S.antalLaspauser || 0) + 1; inp.rensa(); }
    }
    if (!nasta) S.vagvalVisas = null;
    if (S.vagvalVisas) { S.vagvalVisas.visadT += dtVerklig; S.skylt = null; }   // frågan går före passkylten
    if (S.resultat) { S.resultat.t += dtVerklig; if (S.resultat.t > CONFIG.vagval.resultatTid) S.resultat = null; }

    for (const h of S.hjalpare) h.t += dt;
    for (const f of S.foljare) f.foljer -= dt;
    S.foljare = S.foljare.filter(f => f.foljer > 0);

    fyllBana();
    const v = S.kamera - 600;
    S.hinder = S.hinder.filter(o => o.x + o.w > v && !(o.flyg && o.flyg.y > H + 300));
    S.foremal = S.foremal.filter(f => f.x > v && !f.taget);
    S.hjalpare = S.hjalpare.filter(h => h.x > v || h.foljer > 0);
    S.plattformar = S.plattformar.filter(pl => pl.x2 > v);
    S.vagvalLista = S.vagvalLista.filter(vv => vv.pl.x2 > v);
    S.passer = S.passer.filter(pp => pp.slut > v - W || pp === S.aktivt);
    uppdateraEffekter(dt, dtVerklig);
  }

  function uppdateraEffekter(dt, dtVerklig = dt) {
    for (const ob of S.hinder || []) if (ob.flyg) {
      const f = ob.flyg; f.y = (f.y || 0) + f.vy * dt; f.dx = (f.dx || 0) + f.vx * dt; f.vy += 3200 * dt; f.rot += f.vr * dt;
    }
    for (const pt of S.partiklar || []) {
      pt.t += dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += (pt.g || 0) * dt; pt.vx *= (1 - dt * (pt.luft || 2));
      if (pt.rot !== undefined) pt.rot += pt.vr * dt;
    }
    if (S.partiklar) S.partiklar = S.partiklar.filter(p => p.t < p.liv);
    if (S.partiklar && S.partiklar.length > 450) S.partiklar.splice(0, S.partiklar.length - 450);   // tak, så att konfettiregn inte sänker farten
    for (const t of S.texter || []) { t.t += dtVerklig; t.y -= 90 * dtVerklig; }
    if (S.texter) S.texter = S.texter.filter(t => t.t < 1.1);
    for (const b of S.banderoller || []) b.t += dtVerklig;
    if (S.banderoller) S.banderoller = S.banderoller.filter(b => b.t < b.tid);
    if (S.skylt) { S.skylt.t += dtVerklig; if (S.skylt.t > 2.9) S.skylt = null; }
    if (S.planSkylt) { S.planSkylt.t += dtVerklig; if (S.planSkylt.t > 4.2) S.planSkylt = null; }
    if (S.kraftSkylt) { S.kraftSkylt.t += dtVerklig; if (S.kraftSkylt.t > 2.2) S.kraftSkylt = null; }
    if (S.skak > 0) S.skak -= dtVerklig;
    if (S.skadaBlink > 0) S.skadaBlink -= dtVerklig;
    if (S.gronBlink > 0) S.gronBlink -= dtVerklig;
    if (S.comboPop > 0) S.comboPop = Math.max(0, S.comboPop - dtVerklig * 2.5);
    if (S.poangPop > 0) S.poangPop = Math.max(0, S.poangPop - dtVerklig * 4);
    // glittrande spår bakom figuren vid combo ×3 och mer
    if (S.lage === 'spel' && S.combo >= 3 && S.sp && Math.random() < S.combo * 0.12) {
      S.partiklar.push({ x: S.kamera + CONFIG.spelareX - 30 + rnd(-10, 10), y: S.sp.y - rnd(30, 140), vx: rnd(-220, -120), vy: rnd(-30, 30), g: 0, t: 0, liv: rnd(0.3, 0.5), r: rnd(4, 7), farg: S.combo >= 5 ? F.gul : '#ffffff' });
    }
  }

  /* =====================================================================
     Partiklar, konfetti, flytande text, banderoller
     ===================================================================== */
  function partiklarDamm(n) {
    const x = S.kamera + CONFIG.spelareX, y = S.sp.y;
    for (let i = 0; i < n; i++) S.partiklar.push({ x: x + rnd(-30, 20), y: y - rnd(0, 8), vx: rnd(-260, -60), vy: rnd(-180, -40), g: 300, t: 0, liv: rnd(0.3, 0.5), r: rnd(6, 13), farg: 'rgba(255,255,255,0.55)' });
  }
  function partiklarRing(x, y, farg, n) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rnd(-0.2, 0.2), v = rnd(220, 420);
      S.partiklar.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 400, t: 0, liv: rnd(0.35, 0.6), r: rnd(5, 9), farg });
    }
  }
  function konfetti(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = rnd(-Math.PI, 0), v = rnd(300, 900);
      S.partiklar.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 900, luft: 1.2, t: 0, liv: rnd(1.2, 2.2), r: rnd(7, 12), farg: valj(B.PALETT), rot: rnd(0, 6), vr: rnd(-12, 12), rekt: true });
    }
  }
  function flytText(x, y, text, farg, px) { S.texter.push({ x, y, text, farg, px, t: 0 }); }
  function banderoll(text, farg, tid = 1.8, stor = false) { S.banderoller.push({ text, farg, tid, t: 0, stor }); }

  /* =====================================================================
     Ritning – världen
     ===================================================================== */
  function ritaVarlden() {
    const px = S.kamera + CONFIG.spelareX;
    // miljöerna: passet till vänster och höger om en passgräns ritas var för sig
    const synliga = S.passer.filter(p => p.slut > S.kamera && p.start < S.kamera + W);
    if (!synliga.length) { MILJOER.klassrum.rita(S.kamera, { dagFas: 0 }); return; }
    for (const p of synliga) {
      const x1 = Math.max(0, p.start - S.kamera), x2 = Math.min(W, p.slut - S.kamera);
      c.save(); c.beginPath(); c.rect(x1, 0, x2 - x1 + 1, H); c.clip();
      MILJOER[p.info.miljo].rita(S.kamera, ritInfo(p, clamp(px, p.start, p.slut)));
      c.restore();
    }
    // portaler vid passgränser och lägereld i skogen
    for (const p of synliga) {
      if (p.nr > 0) ritaPortal(p.start - S.kamera, p.info);
      if (p.info.skymning) ritaLagereld(p.slut - S.kamera - 260, ritInfo(p, px).skymning);
    }
  }

  function ritaPortal(x, info) {
    if (x < -300 || x > W + 300) return;
    // en dörrkarm mellan två miljöer, med en skylt om vad som väntar
    c.fillStyle = '#0d0f1d'; c.fillRect(x - 34, 0, 68, MARK);
    c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(x - 34, 0, 10, MARK);
    const t = info.typ === 'helg' ? `${I.nasta} HELG!` : `${I.nasta} ${I.dagar[info.dag]} ${I.passKort[info.passKey]}`;
    klistermarke(x, 430, 460, 84, { rot: -4, fyll: F.svart, lw: 6, r: 22 });
    text(t, x, 434, { px: 42, farg: info.typ === 'helg' ? F.gul : '#fff', rot: -4, max: 420 });
  }

  function ritaLagereld(x, sk) {
    if (x < -300 || x > W + 300) return;
    const y = MARK;
    c.globalAlpha = 0.35 + sk * 0.5; c.drawImage(SPRITES.prick, x - 260, y - 300, 520, 520); c.globalAlpha = 1;
    B.kontur();
    for (const [dx, rot] of [[-40, 0.3], [40, -0.3]]) { c.save(); c.translate(x + dx, y - 14); c.rotate(rot); rundRekt(-60, -12, 120, 24, 12); B.fs('#7A4E2D'); c.restore(); }
    const fl = Math.sin(S.klocka * 14) * 6;
    c.fillStyle = F.orange; c.beginPath(); c.moveTo(x - 46, y - 20); c.quadraticCurveTo(x - 30, y - 120 - fl, x, y - 150 + fl); c.quadraticCurveTo(x + 30, y - 120 + fl, x + 46, y - 20); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = F.gul; c.beginPath(); c.moveTo(x - 24, y - 20); c.quadraticCurveTo(x - 10, y - 80 + fl, x, y - 96 - fl); c.quadraticCurveTo(x + 12, y - 80, x + 24, y - 20); c.closePath(); c.fill();
    klistermarke(x, y - 230, 280, 70, { rot: -4, fyll: F.svart, lw: 5, r: 20, skugga: false });
    text('Lägerelden', x, y - 226, { px: 36, farg: F.gul, rot: -4 });
  }

  function ritaVagvalVarld() {
    for (const vv of S.vagvalLista) {
      const pl = vv.pl, x1 = pl.x1 - S.kamera, x2 = pl.x2 - S.kamera;
      if (x2 < -100 || x1 > W + 600) continue;
      const fraga = vv.fraga, upp = vv.ratt === 'upp' ? fraga.ratt : fraga.fel, ner = vv.ratt === 'upp' ? fraga.fel : fraga.ratt;
      // skyltar (ritas bakom figuren)
      const skylt = (cx, cy, pil, txt, farg) => {
        klistermarke(cx, cy, 470, 130, { rot: -3, fyll: F.svart, kant: farg, lw: 7, r: 24 });
        text(pil, cx - 196, cy + 2, { px: 48, farg, rot: -3 });
        textRader(txt, cx + 26, cy + 2, 370, { px: 38, farg: '#fff', rot: -3, maxRader: 2, radhojd: 42 });
      };
      const avgjord = vv.avgjord;
      c.globalAlpha = avgjord ? 0.55 : 1;
      skylt(x1 + 240, pl.y - 100, '▲', upp, F.gul);
      skylt(x1 + 260, MARK - 84, '▶', ner, F.turkos);
      c.globalAlpha = 1;
      // plattformen hänger i linor
      B.kontur();
      for (const lx of [x1 + 40, x2 - 40]) { c.beginPath(); c.moveTo(lx, 0); c.lineTo(lx, pl.y); c.stroke(); }
      rundRekt(x1, pl.y, x2 - x1, pl.tjock, 12); B.fs(F.gul);
      c.save(); rundRekt(x1, pl.y, x2 - x1, pl.tjock, 12); c.clip();
      c.fillStyle = F.svart; for (let x = x1 - 40; x < x2; x += 60) { c.beginPath(); c.moveTo(x, pl.y + pl.tjock); c.lineTo(x + 30, pl.y); c.lineTo(x + 50, pl.y); c.lineTo(x + 20, pl.y + pl.tjock); c.fill(); }
      c.restore();
      if (avgjord) {
        const rattUppe = vv.ratt === 'upp';
        text(rattUppe ? '✓' : '✗', x1 + 80, pl.y - 40, { px: 64, farg: rattUppe ? F.gron : F.korall, kant: F.svart, kantB: 8 });
        text(rattUppe ? '✗' : '✓', x1 + 80, MARK - 60, { px: 64, farg: rattUppe ? F.korall : F.gron, kant: F.svart, kantB: 8 });
      }
    }
  }

  function ritaHinder() {
    for (const ob of S.hinder) {
      if (ob.borta) continue;
      const sx = ob.x - S.kamera;
      if (sx > W + 80 || sx + ob.w < -400) continue;
      c.save();
      if (ob.flyg) {
        const f = ob.flyg, cx = sx + ob.w / 2, cy = MARK - (ob.h || 200) / 2;
        c.translate(cx + (f.dx || 0), cy + (f.y || 0)); c.rotate(f.rot); c.translate(-cx, -cy);
        c.globalAlpha = 0.85;
      } else if (ob.traffad && ob.typ === 'glid') {
        c.globalAlpha = 0.45;
        c.translate(sx + ob.w / 2, 0); c.rotate(Math.sin(S.klocka * 9) * 0.04); c.translate(-(sx + ob.w / 2), 0);
      }
      if (ob.typ !== 'glid' && !ob.flyg && ob.sort !== 'back' && ob.sort !== 'vattenpol' && ob.sort !== 'boll') { c.fillStyle = 'rgba(0,0,0,0.22)'; c.beginPath(); c.ellipse(sx + ob.w / 2, MARK + 6, ob.w * 0.55, 10, 0, 0, 7); c.fill(); }
      HINDER[ob.sort](sx, ob);
      if (!ob.flyg && !ob.traffad) varningstejp(sx, ob);
      c.restore();
      if (ob.tips && !ob.traffad && sx < W - 60) {
        const y = ob.typ === 'glid' ? MARK - CONFIG.glidFri + 70 : MARK - Math.max(ob.h + 70, 400);
        const bob = Math.sin(S.klocka * 8) * 6;
        klistermarke(sx + ob.w / 2, y + bob, ob.tips.length * 30 + 50, 64, { rot: -4, fyll: F.korall, kant: '#fff', lw: 6, r: 18, skugga: false });
        text(ob.tips, sx + ob.w / 2, y + bob + 2, { px: 40, farg: '#fff', rot: -4 });
        if (ob.typ === 'glid') text('▼', sx + ob.w / 2, y + bob + 56, { px: 36, farg: F.korall, kant: '#fff', kantB: 8 });
      }
    }
  }

  // Gul-svart varningstejp: allt med tejp ska man undvika (golvet under stående hinder, nederkanten på hängande).
  function varningstejp(sx, ob) {
    const y = ob.typ === 'glid' ? MARK - CONFIG.glidFri - 6 : MARK + 4, h = 12, x0 = sx - 6, w = ob.w + 12;
    c.save(); c.beginPath(); rundRekt(x0, y, w, h, 4); c.clip();
    c.fillStyle = F.gul; c.fillRect(x0, y, w, h);
    c.fillStyle = F.svart; for (let x = x0 - 12; x < x0 + w; x += 24) { c.beginPath(); c.moveTo(x, y + h); c.lineTo(x + 12, y); c.lineTo(x + 20, y); c.lineTo(x + 8, y + h); c.fill(); }
    c.restore();
  }
  // saker man ska ta svävar i en ljus bubbla
  function bubbla(sx, y, r) {
    c.fillStyle = 'rgba(255,255,255,0.18)'; B.cirkel(sx, y, r); c.fill();
    c.lineWidth = 4; c.strokeStyle = 'rgba(255,255,255,0.85)'; c.stroke();
    const a = S.klocka * 3; c.fillStyle = '#fff'; B.cirkel(sx + Math.cos(a) * r, y + Math.sin(a) * r, 6); c.fill();
  }

  function ritaForemal() {
    const zon = sx => SPRITES[MILJOER[(passVid(sx) || S.aktivt).info.miljo].zon];
    for (const fm of S.foremal) {
      const sx = fm.x - S.kamera;
      if (sx < -120 || sx > W + 120 || fm.taget) continue;
      const bob = Math.sin(S.klocka * 5 + fm.fas) * 8;
      if (fm.typ === 'zon') { const sp = zon(fm.x); bubbla(sx, fm.y + bob, 64); c.drawImage(sp, sx - 75, fm.y - 75 + bob); }
      else if (fm.typ === 'lapp') {
        c.drawImage(SPRITES.lapp, sx - 100, fm.y - 100 + bob);
        text(fm.lapp.namn, sx, fm.y + 6 + bob, { px: 30, farg: F.svart, rot: -5, max: 104 });
        text(I.planeraTips, sx, fm.y - 92 + bob, { px: 26, farg: '#fff', kant: F.svart, kantB: 6 });
      } else if (fm.typ === 'kraft') {
        const s = 1 + Math.sin(S.klocka * 6) * 0.06;
        c.save(); c.translate(sx, fm.y + bob);
        c.rotate(S.klocka * 1.5); c.lineWidth = 6; c.strokeStyle = '#fff'; c.setLineDash([18, 14]); B.cirkel(0, 0, 92); c.stroke(); c.setLineDash([]);
        c.restore();
        c.drawImage(SPRITES['kraft_' + fm.sort], sx - 95 * s, fm.y - 95 * s + bob, 190 * s, 190 * s);
      } else {
        const s = 1 + Math.sin(S.klocka * 8 + fm.fas) * 0.06;
        c.drawImage(SPRITES.gladje, sx - 60 * s, fm.y - 60 * s + bob, 120 * s, 120 * s);
      }
      if (fm.tips) {
        klistermarke(sx, fm.y - 90 + bob, 120, 56, { rot: -4, fyll: F.gron, kant: F.svart, lw: 5, r: 16, skugga: false });
        text(fm.tips, sx, fm.y - 88 + bob, { px: 34, farg: F.svart, rot: -4 });
      }
    }
  }

  function ritaHjalpare() {
    for (const h of S.hjalpare) {
      if (h.foljer > 0) continue;
      const sx = h.x - S.kamera;
      if (sx < -150 || sx > W + 150) continue;
      ritaBarn(sx, h, h.hjalpt ? 'vinka' : h.problem.problem === 'ramlat' ? 'sitta' : 'ledsen');
      if (!h.hjalpt) {
        // "!"-bubbla
        const bob = Math.sin(S.klocka * 6 + h.fas) * 6, by = MARK - 190 * h.skala / 0.68 - 40 + bob;
        klistermarke(sx + 40, by, 64, 70, { rot: 6, fyll: F.gul, kant: F.svart, lw: 6, r: 22, skugga: false });
        text('!', sx + 40, by + 2, { px: 52, farg: F.svart, rot: 6 });
        if (h.problem.problem === 'mossa') { c.save(); c.translate(sx + 70, MARK - 14); c.fillStyle = F.korall; c.lineWidth = 5; c.strokeStyle = F.svart; c.beginPath(); c.arc(0, 0, 20, Math.PI, 0); c.closePath(); c.fill(); c.stroke(); B.cirkel(0, -24, 7); c.fill(); c.stroke(); c.restore(); }
      }
    }
    // barn som hänger med en stund
    S.foljare.forEach((h, i) => {
      const sx = CONFIG.spelareX - 150 - i * 90;
      c.save(); c.globalAlpha = clamp(h.foljer / 0.5, 0, 1);
      ritaFigur(sx, MARK, { figur: h.figur, troja: h.figur.troja, fas: S.sp.fas + 1 + i, lage: 'spring', sx: h.skala, sy: h.skala, glad: true, mossa: h.problem.problem === 'mossa' ? F.korall : null });
      c.restore();
    });
  }
  function ritaBarn(sx, h, lage) {
    c.save(); c.translate(sx, MARK); c.scale(-1, 1);   // tittar mot spelaren
    ritaFigur(0, 0, { figur: h.figur, troja: h.figur.troja, fas: S.klocka * 3 + h.fas, lage, sx: h.skala, sy: h.skala, ont: !h.hjalpt, tarar: !h.hjalpt && h.problem.problem === 'ramlat', glad: h.hjalpt, mossa: h.hjalpt && h.problem.problem === 'mossa' ? F.korall : null });
    c.restore();
  }

  function ritaSpelare() {
    const p = S.sp;
    const blink = p.skydd > 0 && S.lage === 'spel' && Math.floor(p.skydd * 12) % 2 === 0;
    const x = CONFIG.spelareX, sk = CONFIG.figur.skala;
    // kollegan (teamwork) springer bredvid
    if (S.teamwork > 0) {
      const a = clamp(S.teamwork / 0.5, 0, 1);
      c.save(); c.globalAlpha = a;
      ritaFigur(x - 110, p.paMark ? p.y : MARK, { figur: FIGURER[(FIGURER.indexOf(S.figur) + 1) % FIGURER.length], troja: CONFIG.inriktningFarg[S.inriktning], marke: true, fas: p.fas + 1.6, lage: 'spring', sx: sk * 0.95, sy: sk * 0.95, glad: true });
      c.restore();
    }
    const hojd = clamp((p.golv - p.y) / 400, 0, 1);
    c.fillStyle = `rgba(0,0,0,${0.28 * (1 - hojd * 0.6)})`;
    c.beginPath(); c.ellipse(x, p.golv + 6, 48 * (1 - hojd * 0.4), 10, 0, 0, 7); c.fill();
    if (blink) return;
    const lage = S.lage === 'slut' ? 'sta' : p.glider ? 'glid' : !p.paMark ? 'luft' : 'spring';
    c.save(); c.translate(x, p.y); c.rotate(p.lutning * 0.4);
    ritaFigur(0, 0, { figur: S.figur, troja: CONFIG.inriktningFarg[S.inriktning], marke: true, fas: p.fas, lage, vy: p.vy, sx: p.sx * sk, sy: p.sy * sk, glasogon: S.glasogon, ont: S.lage === 'slut' || p.skydd > CONFIG.skyddTid - 0.5, glad: S.gronBlink > 0 });
    c.restore();
    if (S.skold) { c.globalAlpha = 0.35 + Math.sin(S.klocka * 6) * 0.1; c.lineWidth = 8; c.strokeStyle = F.turkos; B.cirkel(x, p.y - 90, 120); c.stroke(); c.fillStyle = 'rgba(25,211,197,0.12)'; c.fill(); c.globalAlpha = 1; }
    if (S.magnet > 0) { c.globalAlpha = 0.25; c.lineWidth = 4; c.strokeStyle = F.gron; c.setLineDash([10, 12]); B.cirkel(x, p.y - 90, 150 + Math.sin(S.klocka * 8) * 10); c.stroke(); c.setLineDash([]); c.globalAlpha = 1; }
  }

  function ritaPartiklar() {
    for (const p of S.partiklar || []) {
      const a = 1 - p.t / p.liv;
      c.globalAlpha = Math.min(1, a * 1.5); c.fillStyle = p.farg;
      if (p.rekt) { c.save(); c.translate(p.x - S.kamera, p.y); c.rotate(p.rot); c.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r); c.restore(); }
      else { B.cirkel(p.x - S.kamera, p.y, p.r * (0.6 + a * 0.4)); c.fill(); }
    }
    c.globalAlpha = 1;
    for (const t of S.texter || []) {
      const a = t.t < 0.8 ? 1 : 1 - (t.t - 0.8) / 0.3, s = t.t < 0.12 ? 0.6 + t.t * 3.4 : 1;
      c.globalAlpha = clamp(a, 0, 1);
      text(t.text, t.x - S.kamera, t.y, { px: t.px * s, farg: t.farg, kant: F.svart, kantB: 10 });
    }
    c.globalAlpha = 1;
  }

  function ritaLogga(cx, cy, bredd, rot = 0) {
    if (!logo.complete || !logo.naturalWidth) return;
    c.save(); c.translate(cx, cy); c.rotate(rot);
    c.drawImage(logo, -bredd / 2, -bredd * LOGO_KVOT / 2, bredd, bredd * LOGO_KVOT);
    c.restore();
  }

  /* =====================================================================
     Ritning – HUD
     ===================================================================== */
  function ritaHud() {
    // loggan på mörk platta, uppe till vänster
    c.fillStyle = 'rgba(15,18,34,0.78)'; rundRekt(20, 18, 150, 132, 24); c.fill();
    ritaLogga(95, 84, 124);

    // liv
    for (let i = 0; i < CONFIG.liv; i++) {
      const hx = 230 + i * 78, hy = 50, full = i < S.liv;
      const pulse = full && S.liv === 1 ? 1 + Math.sin(S.klocka * 10) * 0.08 : 1;
      c.save(); c.translate(hx, hy + 30); c.scale(pulse, pulse);
      hjartForm(0, -30, 62);
      c.fillStyle = full ? F.korall : 'rgba(255,255,255,0.12)'; c.fill();
      c.lineWidth = 6; c.strokeStyle = full ? '#ffffff' : 'rgba(255,255,255,0.35)'; c.stroke();
      c.restore();
    }
    if (S.skold) { klistermarke(470, 80, 70, 70, { rot: 0, fyll: F.turkos, kant: '#fff', lw: 5, r: 20, skugga: false }); text('🛡', 470, 82, { px: 40 }); }

    // schemat: "TIS · FM · APL – Förskolan" och veckoremsan
    if (S.aktivt) {
      const info = S.aktivt.info;
      c.font = font(34, 900);
      const tb = Math.min(560, c.measureText(info.hud).width) + 50;
      klistermarke(20 + tb / 2, 190, tb, 62, { rot: 0, fyll: 'rgba(20,20,28,0.85)', lw: 4, r: 20, skugga: false });
      text(info.hud, 20 + tb / 2, 192, { px: 34, farg: '#fff', max: tb - 40 });
      // veckoremsan M T O T F
      const x0 = 46, y0 = 252;
      text('V' + info.vecka, x0, y0, { px: 28, farg: F.gul, align: 'center' });
      I.veckoremsa.forEach((d, i) => {
        const x = x0 + 50 + i * 46, klar = info.typ === 'helg' || i < info.dag, nu = info.typ !== 'helg' && i === info.dag;
        c.fillStyle = klar ? F.gul : nu ? '#fff' : 'rgba(255,255,255,0.2)';
        B.cirkel(x, y0, nu ? 20 + Math.sin(S.klocka * 6) * 2 : 18); c.fill();
        text(d, x, y0 + 2, { px: 24, farg: klar || nu ? F.svart : 'rgba(255,255,255,0.7)' });
      });
      // planeringslappar
      if (S.lappar.size || info.typ === 'planera' || info.typ === 'genomfora') {
        I.lappar.forEach((l, i) => {
          const har = S.lappar.has(l.id), x = 60 + i * 110, y = 318;
          c.globalAlpha = har ? 1 : 0.35;
          klistermarke(x, y, 100, 44, { rot: -4, fyll: har ? '#FFE45C' : 'rgba(255,255,255,0.15)', kant: F.svart, lw: 3, r: 8, skugga: false });
          text(l.namn, x, y + 2, { px: 22, farg: F.svart, rot: -4, max: 90 });
          c.globalAlpha = 1;
        });
      }
    }

    // poäng
    const pp = 1 + (S.poangPop || 0) * 0.08;
    c.save(); c.translate(W / 2, 74); c.scale(pp, pp);
    klistermarke(0, 0, 420, 100, { rot: -3, fyll: F.svart, lw: 7, r: 26 });
    text(fmt(S.poang), 0, 4, { px: 72, farg: '#ffffff', rot: -3, max: 380 });
    c.restore();

    // combo
    const m = mult();
    if (m > 1 || S.comboRakning > 0) {
      const pop = 1 + S.comboPop * 0.5, cx = W / 2 + 300, cy = 80;
      c.save(); c.translate(cx, cy); c.scale(pop, pop);
      klistermarke(0, 0, 140, 84, { rot: 6, fyll: m > 1 ? F.gul : 'rgba(20,20,28,0.8)', kant: m > 1 ? F.svart : '#ffffff', lw: 6, r: 22, skugga: false });
      text('×' + m, 0, 4, { px: 56, farg: m > 1 ? F.svart : '#ffffff', rot: 6, max: 120 });
      c.restore();
      if (S.combo < CONFIG.combo.max) {
        for (let i = 0; i < CONFIG.combo.per; i++) {
          c.fillStyle = i < S.comboRakning ? F.gul : 'rgba(255,255,255,0.22)';
          B.cirkel(cx - 52 + i * 15, cy + 62, 5); c.fill();
        }
      }
    }
    // aktiva förmågor med tidsmätare
    const aktiva = [];
    if (S.teamwork > 0) aktiva.push(['kraft_teamwork', S.teamwork / CONFIG.kraft.teamworkTid]);
    if (S.magnet > 0) aktiva.push(['kraft_frukt', S.magnet / CONFIG.kraft.fruktTid]);
    if (S.fordelar.syfte) aktiva.push(['lapp', 1, 'Syfte ×2']);
    aktiva.forEach(([sp, andel, etikett], i) => {
      const x = W / 2 + 430 + i * 100, y = 80;
      c.drawImage(SPRITES[sp], x - 45, y - 45, 90, 90);
      if (etikett) text(etikett, x, y + 2, { px: 20, farg: F.svart, max: 70 });
      c.lineWidth = 7; c.strokeStyle = F.gul; c.beginPath(); c.arc(x, y, 44, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * andel); c.stroke();
    });
  }

  // fredagens skylt: vad planeringen gav
  function ritaPlanSkylt() {
    const s = S.planSkylt; if (!s || s.t < 1.2) return;
    const t = s.t - 1.2, a = clamp(t / 0.25, 0, 1) * (1 - clamp((t - 2.6) / 0.3, 0, 1));   // efter dagens banderoll
    if (a <= 0) return;
    c.save(); c.globalAlpha = a;
    const y = 360;
    if (!s.har.length) {
      klistermarke(W / 2, y, 1200, 150, { rot: -3, fyll: F.korall, lw: 9, r: 36 });
      text(I.planeraIngen, W / 2, y + 4, { px: 60, farg: '#fff', rot: -3, max: 1120 });
    } else {
      klistermarke(W / 2, y, 1400, 200, { rot: -3, fyll: F.gron, kant: '#fff', lw: 9, r: 36 });
      text(I.planeraRubrik, W / 2, y - 50, { px: 40, farg: F.svart, rot: -3 });
      text(s.har.map(l => `✓ ${l.namn}: ${l.fordel}`).join('   '), W / 2, y + 30, { px: 42, farg: F.svart, rot: -3, max: 1320 });
    }
    c.restore();
  }

  // frågan överst medan man närmar sig vägvalet
  function ritaVagvalBanner() {
    const vv = S.vagvalVisas;
    const fraga = vv && vv.fraga, txt = vv && (vv.typ === 'fraga' ? fraga.fraga : fraga.text);
    const upp = vv && (vv.ratt === 'upp' ? fraga.ratt : fraga.fel), ner = vv && (vv.ratt === 'upp' ? fraga.fel : fraga.ratt);
    if (vv && S.lasPaus <= 0) {
      // smal list högst upp medan man springer – banan syns hela tiden
      const y = 210, x = W / 2 + 130;
      c.save();
      klistermarke(x, y, 1260, 124, { rot: -1.5, fyll: F.svart, lw: 6, r: 30 });
      text(txt, x, y - 30, { px: 34, farg: '#fff', rot: -1.5, max: 1180 });
      const pill = (px, pil, svar, farg) => {
        c.save(); c.translate(px, y + 26); c.rotate(-1.5 * Math.PI / 180);
        c.fillStyle = 'rgba(255,255,255,0.1)'; rundRekt(-300, -26, 600, 52, 18); c.fill();
        text(pil, -280, 2, { px: 34, farg });
        text(svar, -238, 2, { px: 36, farg: '#fff', align: 'left', max: 520 });
        c.restore();
      };
      pill(x - 308, '▲', upp, F.gul);
      pill(x + 308, '▶', ner, F.turkos);
      c.restore();
    } else if (vv) {
      const a = clamp(vv.visadT / 0.25, 0, 1), y = 560;
      morkna(0.5 * a);
      c.save(); c.globalAlpha = a; c.translate(0, (1 - a) * -40);
      // passets tema överst: dag, pass och vad det handlar om
      const info = vv.pass.info;
      klistermarke(W / 2, y - 320, 1560, 190, { rot: -2, fyll: CONFIG.inriktningFarg[S.inriktning], kant: '#fff', lw: 8, r: 36 });
      text(`${I.dagar[info.dag].toUpperCase()} · ${I.pass[info.passKey].toUpperCase()}`, W / 2, y - 380, { px: 34, farg: F.svart, rot: -2 });
      textRader(info.skylt || info.titel, W / 2, y - 306, 1460, { px: 42, farg: '#fff', rot: -2, maxRader: 2, radhojd: 48, kant: F.svart, kantB: 6 });
      klistermarke(W / 2, y, 1500, 380, { rot: -2, fyll: F.svart, lw: 9, r: 40 });
      const rubrik = vv.typ === 'fraga' ? `${I.vagvalRubrik.fraga} · ${fraga.amne}` : I.vagvalRubrik[vv.typ] || I.vagvalRubrik.situation;
      text(rubrik.toUpperCase(), W / 2, y - 128, { px: 30, farg: F.gul, rot: -2 });
      textRader(txt, W / 2, y - 60, 1400, { px: 56, farg: '#fff', rot: -2, maxRader: 2, radhojd: 60 });
      const rad = (yy, pil, etikett, svar, farg) => {
        c.save(); c.translate(W / 2, yy); c.rotate(-2 * Math.PI / 180);
        c.fillStyle = 'rgba(255,255,255,0.08)'; rundRekt(-680, -36, 1360, 72, 20); c.fill();
        text(pil, -640, 2, { px: 42, farg });
        text(etikett, -600, 2, { px: 30, farg, align: 'left' });
        text(svar, -330, 2, { px: 44, farg: '#fff', align: 'left', max: 980 });
        c.restore();
      };
      rad(y + 46, '▲', I.vagvalUpp, upp, F.gul);
      rad(y + 128, '▶', I.vagvalNer, ner, F.turkos);
      c.restore();
      // nedräkning: spelet fortsätter av sig självt
      const kvar = Math.max(0, S.lasPaus), andel = kvar / S.lasTidNu;
      c.fillStyle = 'rgba(255,255,255,0.2)'; rundRekt(W / 2 - 500, y + 220, 1000, 16, 8); c.fill();
      c.fillStyle = F.gul; rundRekt(W / 2 - 500, y + 220, 1000 * andel, 16, 8); c.fill();
      const hint = S.lasT > S.lasMinNu ? ' – tryck för att köra direkt' : '';
      text(`Spelet fortsätter om ${Math.ceil(kvar)} s${hint}`, W / 2, y + 270, { px: 36, farg: '#fff', vikt: 800, kant: F.svart, kantB: 8 });
    } else if (S.resultat) {
      const r = S.resultat, a = Math.min(clamp(r.t / 0.2, 0, 1), 1 - clamp((r.t - CONFIG.vagval.resultatTid + 0.4) / 0.4, 0, 1)), y = 250;
      c.save(); c.globalAlpha = a;
      klistermarke(W / 2, y, 1400, r.ratt ? 130 : 190, { rot: -2, fyll: r.ratt ? F.gron : F.svart, kant: '#fff', lw: 9, r: 36 });
      text(r.text, W / 2, y - (r.ratt ? 0 : 36), { px: 56, farg: r.ratt ? F.svart : F.gul, rot: -2, max: 1320 });
      if (!r.ratt && r.forklaring) text(r.forklaring, W / 2, y + 44, { px: 38, farg: '#fff', vikt: 800, rot: -2, max: 1320 });
      c.restore();
    }
  }

  function ritaKraftSkylt() {
    const s = S.kraftSkylt; if (!s) return;
    const a = clamp(s.t / 0.2, 0, 1) * (1 - clamp((s.t - 1.8) / 0.4, 0, 1)), pop = 1 + (1 - clamp(s.t / 0.25, 0, 1)) * 0.3;
    c.save(); c.globalAlpha = a; c.translate(W / 2, 270); c.scale(pop, pop);
    klistermarke(0, 0, 1100, 130, { rot: -3, fyll: F.gul, kant: F.svart, lw: 8, r: 34 });
    c.drawImage(SPRITES['kraft_' + s.sort], -540, -70, 140, 140);
    text(`${s.namn} ${s.text}`, 40, 4, { px: 50, farg: F.svart, rot: -3, max: 900 });
    c.restore();
  }

  function ritaBanderoller() {
    for (const b of S.banderoller) {
      const inn = clamp(b.t / 0.3, 0, 1), ut = clamp((b.t - b.tid + 0.35) / 0.35, 0, 1);
      const e = 1 - Math.pow(1 - inn, 3), s = (b.stor ? 1.25 : 1) * (0.5 + 0.5 * e);
      c.save(); c.globalAlpha = 1 - ut; c.translate(W / 2, b.stor ? 560 : 400); c.scale(s, s); c.rotate(-0.07);
      const bredd = Math.min(1700, b.text.length * 70 + 200);
      klistermarke(0, 0, bredd, 190, { rot: 0, fyll: b.farg, kant: F.svart, lw: 12, r: 44 });
      text(b.text, 0, 8, { px: 130, farg: F.svart, max: bredd - 80 });
      c.restore();
      if (b.stor) ritaLogga(W / 2, 270 + Math.abs(Math.sin(b.t * 6)) * -40 * (1 - ut), 300 * e, -0.06);
    }
  }

  function ritaVeckokort() {
    const k = S.veckokort; if (!k || k.t > CONFIG.veckokortTid) return;
    const a = clamp(k.t / 0.3, 0, 1) * (1 - clamp((k.t - CONFIG.veckokortTid + 0.3) / 0.3, 0, 1));
    c.save(); c.globalAlpha = a;
    c.fillStyle = 'rgba(10,12,26,0.5)'; c.fillRect(0, 0, W, H);
    klistermarke(W / 2, 520, 1100, 560, { rot: -3, fyll: F.svart, lw: 10, r: 44 });
    text(`${I.veckokortRubrik.toUpperCase()} · VECKA ${k.vecka}`, W / 2, 310, { px: 52, farg: F.gul, rot: -3, max: 1000 });
    const rader = [
      [I.veckokort.lappar, `${k.lappar}/${I.lappar.length}`],
      [I.veckokort.val, `${k.valRatt}/${k.valTot}`],
      [I.veckokort.hjalpta, `${k.hjalpta}`]
    ];
    rader.forEach(([etikett, varde], i) => {
      const y = 420 + i * 120;
      text(etikett, W / 2 - 440, y, { px: 52, farg: '#fff', align: 'left', rot: -3 });
      text(varde, W / 2 + 440, y - 20, { px: 84, farg: F.gul, align: 'right', rot: -3 });
    });
    c.restore();
  }

  function ritaKnappar() {
    for (const k of KNAPPAR) {
      if (!k.synlig()) continue;
      const cx = k.x + k.w / 2, cy = k.y + k.h / 2;
      klistermarke(cx, cy, k.w, k.h, { rot: 0, fyll: 'rgba(20,20,28,0.8)', lw: 5, r: 20, skugga: false });
      c.fillStyle = '#ffffff'; c.strokeStyle = '#ffffff'; c.lineWidth = 6; c.lineCap = 'round';
      if (k.id === 'paus') {
        if (S.lage === 'paus') { c.beginPath(); c.moveTo(cx - 12, cy - 18); c.lineTo(cx + 18, cy); c.lineTo(cx - 12, cy + 18); c.closePath(); c.fill(); }
        else { rundRekt(cx - 16, cy - 18, 11, 36, 4); c.fill(); rundRekt(cx + 5, cy - 18, 11, 36, 4); c.fill(); }
      } else if (k.id === 'helskarm') {
        c.lineWidth = 7;
        for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { c.beginPath(); c.moveTo(cx + sx * 20, cy + sy * 6); c.lineTo(cx + sx * 20, cy + sy * 20); c.lineTo(cx + sx * 6, cy + sy * 20); c.stroke(); }
      } else {
        c.beginPath(); c.moveTo(cx - 22, cy - 9); c.lineTo(cx - 12, cy - 9); c.lineTo(cx + 2, cy - 21); c.lineTo(cx + 2, cy + 21); c.lineTo(cx - 12, cy + 9); c.lineTo(cx - 22, cy + 9); c.closePath(); c.fill();
        if (Ljud.pa) { c.beginPath(); c.arc(cx + 6, cy, 12, -0.9, 0.9); c.stroke(); c.beginPath(); c.arc(cx + 6, cy, 22, -0.9, 0.9); c.stroke(); }
        else { c.beginPath(); c.moveTo(cx + 10, cy - 10); c.lineTo(cx + 26, cy + 10); c.moveTo(cx + 26, cy - 10); c.lineTo(cx + 10, cy + 10); c.stroke(); }
      }
    }
  }

  /* =====================================================================
     Ritning – skärmar
     ===================================================================== */
  function morkna(a) { c.fillStyle = `rgba(10,12,26,${a})`; c.fillRect(0, 0, W, H); }

  function ritaStart() {
    morkna(0.45);
    const bob = Math.sin(S.klocka * 2.2);
    c.globalAlpha = 0.5 + 0.15 * Math.sin(S.klocka * 3);
    c.drawImage(SPRITES.prick, W / 2 - 330, bob * 10, 660, 660);
    c.globalAlpha = 1;
    ritaLogga(W / 2, 320 + bob * 12, 420, (bob * 3 - 2) * Math.PI / 180);
    klistermarke(W / 2, 600, 760, 140, { rot: -4, fyll: F.gul, kant: F.svart, lw: 10, r: 34 });
    text('BF-RUSH', W / 2, 606, { px: 120, farg: F.svart, rot: -4 });
    text('En vecka på Barn- och fritidsprogrammet', W / 2, 720, { px: 44, farg: '#ffffff', vikt: 800 });
    const puls = 1 + Math.sin(S.klocka * 5) * 0.05;
    c.save(); c.translate(W / 2, 860); c.scale(puls, puls);
    text('TRYCK PÅ VALFRI KNAPP FÖR ATT SPELA', 0, 0, { px: 58, farg: '#ffffff', kant: F.svart, kantB: 12 });
    c.restore();
    text('Hoppa: mellanslag / ↑ / övre halvan   ·   Glid: ↓ / nedre halvan   ·   Håll inne = högre hopp, tryck igen = dubbelhopp', W / 2, 980, { px: 28, farg: '#C9CDEA', vikt: 700, max: 1800 });
    c.save(); c.translate(W / 2 + 640, MARK); c.scale(1.4, 1.4);
    ritaFigur(0, 0, { figur: FIGURER[Math.floor(S.klocka / 3) % FIGURER.length], troja: CONFIG.inriktningFarg[Math.floor(S.klocka / 3) % 2 ? 'psa' : 'fh'], marke: true, fas: S.klocka * 8, lage: 'spring' });
    c.restore();
    // dagens ledare – så att alla i montern ser vem som leder
    const topp = T.dagens().slice(0, 3);
    if (topp.length) {
      klistermarke(300, 330, 500, 120 + topp.length * 74, { rot: -3, fyll: 'rgba(20,20,28,0.92)', lw: 7, r: 32 });
      text(I.dagensLedare, 300, 330 - (topp.length * 74) / 2 - 18, { px: 38, farg: F.gul, rot: -3 });
      ritaLista(90, 330 - (topp.length * 74) / 2 + 30, 420, topp, null, 3, 74, 40);
    }
  }

  // en topplista: plats, namn (och skola) och poäng
  function ritaLista(x, y, w, lista, markId, antal = 10, radH = 64, px = 40) {
    if (!lista.length) { text(I.tomLista, x + w / 2, y + radH / 2, { px: px * 0.85, farg: '#C9CDEA', vikt: 800, max: w }); return; }
    lista.slice(0, antal).forEach((r, i) => {
      const ry = y + i * radH + radH / 2, me = r.id === markId;
      if (me) { c.fillStyle = 'rgba(255,210,63,0.28)'; rundRekt(x - 10, ry - radH / 2 + 4, w + 20, radH - 8, 16); c.fill(); }
      const medalj = [F.gul, '#D7DCE8', '#E0A060'][i];
      c.fillStyle = medalj || 'rgba(255,255,255,0.15)'; B.cirkel(x + radH * 0.35, ry, radH * 0.34); c.fill();
      text(String(i + 1), x + radH * 0.35, ry + 2, { px: px * 0.8, farg: medalj ? F.svart : '#fff' });
      const namnX = x + radH * 0.85;
      if (r.skola) {
        text(r.namn, namnX, ry - px * 0.22, { px, farg: me ? F.gul : '#fff', align: 'left', max: w * 0.55 });
        text(r.skola, namnX, ry + px * 0.5, { px: px * 0.55, farg: '#C9CDEA', vikt: 800, align: 'left', max: w * 0.55 });
      } else text(r.namn, namnX, ry + 2, { px, farg: me ? F.gul : '#fff', align: 'left', max: w * 0.55 });
      text(fmt(r.poang), x + w, ry + 2, { px, farg: me ? F.gul : '#fff', align: 'right', max: w * 0.35 });
    });
  }

  // figurval: fyra figurer, högst två tryck
  const figurKort = i => ({ x: W / 2 + (i - 1.5) * 420 - 180, y: 260, w: 360, h: 560 });
  function figurVid(x, y) { for (let i = 0; i < FIGURER.length; i++) { const k = figurKort(i); if (x >= k.x && x <= k.x + k.w && y >= k.y && y <= k.y + k.h) return i; } return -1; }
  function ritaFigurval() {
    morkna(0.6);
    text(I.figurRubrik, W / 2, 140, { px: 80, farg: '#fff', kant: F.svart, kantB: 12 });
    FIGURER.forEach((f, i) => {
      const k = figurKort(i), vald = i === S.figurIndex, pop = vald ? 1 + Math.sin(S.klocka * 6) * 0.02 : 0.94;
      c.save(); c.translate(k.x + k.w / 2, k.y + k.h / 2); c.scale(pop, pop);
      klistermarke(0, 0, k.w, k.h, { rot: vald ? -3 : 0, fyll: vald ? F.gul : 'rgba(20,20,28,0.85)', kant: vald ? F.svart : 'rgba(255,255,255,0.6)', lw: vald ? 10 : 5, r: 40 });
      c.restore();
      c.save(); c.translate(k.x + k.w / 2, k.y + k.h - 90); c.scale(1.9, 1.9);
      ritaFigur(0, 0, { figur: f, troja: '#3D8BFF', marke: true, fas: S.klocka * (vald ? 8 : 3) + i, lage: vald ? 'spring' : 'sta', glad: vald });
      c.restore();
      text(String(i + 1), k.x + 50, k.y + 50, { px: 44, farg: vald ? F.svart : 'rgba(255,255,255,0.6)' });
    });
    text(I.figurHjalp, W / 2, 900, { px: 36, farg: '#fff', vikt: 800, max: 1700 });
    text(`Väljs om ${Math.ceil(Math.max(0, CONFIG.figurTid - S.figurTid))} s`, W / 2, 970, { px: 32, farg: '#C9CDEA', vikt: 800 });
  }

  function ritaNamn() {
    morkna(0.82);
    const n = S.namn;
    text(fyll(I.namnRubrik, { plats: S.plats }), W / 2, 110, { px: 64, farg: F.gul, kant: F.svart, kantB: 10, max: 1700 });
    text(`${fmt(S.poang)} poäng`, W / 2, 180, { px: 44, farg: '#fff', vikt: 800 });
    [I.namnFalt, I.skolaFalt].forEach((etikett, i) => {
      const y = FALT_Y[i], aktiv = n.falt === i;
      text(etikett, W / 2 - 480, y - 58, { px: 28, farg: aktiv ? F.gul : '#C9CDEA', align: 'left', vikt: 800 });
      klistermarke(W / 2, y, 960, 76, { rot: 0, fyll: aktiv ? '#fff' : 'rgba(255,255,255,0.15)', kant: aktiv ? F.gul : 'rgba(255,255,255,0.4)', lw: aktiv ? 6 : 3, r: 20, skugga: false });
      const markor = aktiv && Math.floor(S.klocka * 2) % 2 === 0 ? '|' : '';
      text(n.varden[i] + markor, W / 2 - 450, y + 3, { px: 46, farg: aktiv ? F.svart : '#fff', align: 'left', max: 900 });
      text(`${n.varden[i].length}/${MAXLANGD[i]}`, W / 2 + 450, y + 3, { px: 24, farg: aktiv ? '#767B82' : '#C9CDEA', align: 'right', vikt: 800 });
    });
    if (n.msgT > 0 && n.msg) text(n.msg, W / 2, 495, { px: 40, farg: n.fel ? F.korall : F.gron, kant: F.svart, kantB: 8 });
    else text(I.namnPaminnelse, W / 2, 495, { px: 32, farg: '#fff', vikt: 800 });
    for (const t of tangentLayout()) {
      const vald = t.r === n.r && t.k === n.k;
      const fyllF = t.typ === 'klar' ? F.gron : t.typ === 'hoppa' ? 'rgba(255,255,255,0.12)' : '#fff';
      c.fillStyle = fyllF; rundRekt(t.x, t.y, t.w, t.h, 16); c.fill();
      if (vald) { c.lineWidth = 8; c.strokeStyle = F.gul; c.stroke(); }
      text(t.etikett, t.x + t.w / 2, t.y + t.h / 2 + 2, { px: t.typ === 'tecken' ? 44 : 30, farg: t.typ === 'hoppa' ? '#fff' : F.svart, max: t.w - 16 });
    }
  }

  function ritaToppSkarm() {
    morkna(0.75);
    ritaLogga(190, 130, 220, -0.05);
    klistermarke(W / 2, 110, 900, 140, { rot: -3, fyll: F.gul, kant: F.svart, lw: 10, r: 36 });
    text(I.dagensTopp, W / 2, 116, { px: 92, farg: F.svart, rot: -3, max: 840 });
    ritaLista(200, 235, 900, T.dagens(), null, 10, 72, 44);
    const basta = T.basta().slice(0, 5);
    klistermarke(1540, 470, 600, 470, { rot: 2, fyll: 'rgba(20,20,28,0.92)', lw: 7, r: 36 });
    text(I.bastaNagonsin, 1540, 290, { px: 40, farg: F.gul, rot: 2 });
    ritaLista(1270, 330, 540, basta, null, 5, 70, 36);
    ritaTryckText(1000);
  }

  function ritaVadArBF() {
    morkna(0.78);
    const V = I.vadArBF;
    ritaLogga(190, 130, 220, -0.05);
    klistermarke(W / 2 + 60, 100, 760, 130, { rot: -3, fyll: F.gul, kant: F.svart, lw: 10, r: 36 });
    text(V.rubrik, W / 2 + 60, 106, { px: 84, farg: F.svart, rot: -3 });
    text(V.text, W / 2 + 140, 215, { px: 38, farg: '#fff', vikt: 800, max: 1320 });
    ['fh', 'psa'].forEach((id, i) => {
      const inr = I.inriktningar[id], x = W / 2 + (i ? 440 : -440), y = 380;
      klistermarke(x, y, 820, 230, { rot: i ? 2 : -2, fyll: CONFIG.inriktningFarg[id], kant: '#fff', lw: 8, r: 36 });
      text(inr.namn, x, y - 62, { px: 46, farg: '#fff', kant: F.svart, kantB: 8, max: 760, rot: i ? 2 : -2 });
      text(inr.pitch, x, y + 2, { px: 28, farg: '#fff', vikt: 800, max: 760, rot: i ? 2 : -2 });
      text('Yrken: ' + inr.yrken.join(' · '), x, y + 62, { px: 28, farg: F.svart, vikt: 800, max: 760, rot: i ? 2 : -2 });
    });
    // en vecka på BF
    text(V.veckaRubrik, W / 2, 560, { px: 40, farg: F.gul });
    const kolW = 330, x0 = W / 2 - kolW * 2.5;
    I.dagar.forEach((d, i) => {
      const x = x0 + i * kolW + kolW / 2;
      text(d, x, 620, { px: 32, farg: '#fff' });
      [0, 1].forEach(j => {
        const p = I.schema[i * 2 + j], titel = p.miljo === 'apl' ? 'APL' : p.titel;
        c.fillStyle = j ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.18)'; rundRekt(x - kolW / 2 + 8, 650 + j * 74, kolW - 16, 64, 14); c.fill();
        text(titel, x, 683 + j * 74, { px: 30, farg: '#fff', vikt: 800, max: kolW - 40 });
      });
    });
    V.fakta.forEach((f, i) => text('✓ ' + f, W / 2, 850 + i * 46, { px: 32, farg: '#fff', vikt: 800, max: 1300 }));
    ritaQr(1790, 900, 170, false);
    ritaTryckText(1030);
  }

  // QR-koden ritas en gång till en egen canvas (vita kanter, svarta moduler)
  let qrCache = null;
  function ritaQr(cx, cy, storlek, medText = true) {
    if (!CONFIG.qrAdress || !B.qr) return;
    if (!qrCache || qrCache.adress !== CONFIG.qrAdress) {
      const q = B.qr(CONFIG.qrAdress); if (!q) return;
      const kant = 3, mod = 8, cv = document.createElement('canvas');
      cv.width = cv.height = (q.storlek + kant * 2) * mod;
      const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.fillStyle = '#000';
      for (let y = 0; y < q.storlek; y++) for (let x = 0; x < q.storlek; x++) if (q.mork(x, y)) g.fillRect((x + kant) * mod, (y + kant) * mod, mod, mod);
      qrCache = { adress: CONFIG.qrAdress, cv };
    }
    c.fillStyle = '#fff'; rundRekt(cx - storlek / 2 - 8, cy - storlek / 2 - 8, storlek + 16, storlek + 16, 16); c.fill();
    c.imageSmoothingEnabled = false;
    c.drawImage(qrCache.cv, cx - storlek / 2, cy - storlek / 2, storlek, storlek);
    c.imageSmoothingEnabled = true;
    if (medText) text(CONFIG.qrText, cx - storlek / 2 - 24, cy, { px: 30, farg: '#fff', vikt: 800, align: 'right' });
  }

  function ritaTryckText(y) {
    const puls = 1 + Math.sin(S.klocka * 5) * 0.05;
    c.save(); c.translate(W / 2, y); c.scale(puls, puls);
    text(I.tryckForAttSpela, 0, 0, { px: 52, farg: '#ffffff', kant: F.svart, kantB: 12 });
    c.restore();
  }

  function ritaDemoText() {
    klistermarke(W - 230, H - 180, 260, 90, { rot: -4, fyll: F.korall, lw: 6, r: 24 });
    text(I.demo, W - 230, H - 176, { px: 56, farg: '#fff', rot: -4 });
    ritaTryckText(H - 60);
  }

  function ritaInriktning() {
    morkna(0.6);
    text('VÄLJ INRIKTNING', W / 2, 120, { px: 72, farg: '#fff', kant: F.svart, kantB: 12 });
    const kvar = Math.max(0, CONFIG.inriktningTid - S.inrTid);
    const kort = (y, id, pil, knapp) => {
      const inr = I.inriktningar[id], farg = CONFIG.inriktningFarg[id];
      const puls = 1 + Math.sin(S.klocka * 4 + (id === 'fh' ? 0 : 1.5)) * 0.015;
      c.save(); c.translate(W / 2, y); c.scale(puls, puls);
      klistermarke(0, 0, 1500, 330, { rot: -3, fyll: farg, kant: '#fff', lw: 10, r: 44 });
      text(pil, -640, 0, { px: 110, farg: '#fff', kant: F.svart, kantB: 12, rot: -3 });
      text(inr.namn, -540, -80, { px: 68, farg: '#fff', align: 'left', rot: -3, kant: F.svart, kantB: 10, max: 1150 });
      text(inr.pitch, -540, 0, { px: 38, farg: '#fff', vikt: 800, align: 'left', rot: -3, max: 1150 });
      text('Yrken: ' + inr.yrken.join(', '), -540, 64, { px: 32, farg: F.svart, vikt: 800, align: 'left', rot: -3, max: 1150 });
      text(knapp, -540, 118, { px: 28, farg: 'rgba(255,255,255,0.85)', vikt: 800, align: 'left', rot: -3, max: 1150 });
      c.restore();
      c.save(); c.translate(W / 2 + 600, y - 6); c.scale(1.05, 1.05);
      ritaFigur(0, 110, { figur: FIGURER[id === 'fh' ? 1 : 2], troja: farg, marke: true, fas: S.klocka * 3, lage: 'vinka', glad: true });
      c.restore();
    };
    kort(370, 'fh', '▲', 'Hoppa (↑ / mellanslag / övre halvan)');
    kort(760, 'psa', '▼', 'Glid (↓ / nedre halvan)');
    text(`Slumpas om ${Math.ceil(kvar)} s`, W / 2, 1010, { px: 34, farg: '#C9CDEA', vikt: 800 });
  }

  const PAUSKNAPPAR = [{ y: 560, w: 640 }, { y: 700, w: 640 }];
  function ritaPaus() {
    morkna(0.65);
    klistermarke(W / 2, 330, 560, 170, { rot: -4, fyll: F.svart, lw: 10, r: 36 });
    text(I.paus.rubrik, W / 2, 336, { px: 120, farg: '#ffffff', rot: -4 });
    [I.paus.fortsatt, I.paus.tillStart].forEach((t, i) => {
      const k = PAUSKNAPPAR[i], vald = S.pausVal === i, pop = vald ? 1 + Math.sin(S.klocka * 6) * 0.02 : 1;
      c.save(); c.translate(W / 2, k.y); c.scale(pop, pop);
      klistermarke(0, 0, k.w, 110, { rot: -2, fyll: vald ? (i ? F.korall : F.gul) : 'rgba(20,20,28,0.9)', kant: vald ? F.svart : 'rgba(255,255,255,0.6)', lw: vald ? 8 : 4, r: 30, skugga: vald });
      text(t, 0, 4, { px: 54, farg: vald ? F.svart : '#fff', rot: -2, max: k.w - 60 });
      c.restore();
    });
    text(I.paus.hjalp, W / 2, 830, { px: 34, farg: '#C9CDEA', vikt: 800, max: 1700 });
  }

  function hurLangt() {
    const p = S.slutPass || S.aktivt; if (!p) return '';
    const info = p.info;
    if (info.typ === 'helg') return `Vecka ${info.vecka} – helg!`;
    const titel = info.moment === 'apl' ? `APL – ${I.inriktningar[S.inriktning].aplNamn}` : info.titel;
    return `Vecka ${info.vecka}, ${I.dagar[info.dag].toLowerCase()} ${I.pass[info.passKey].toLowerCase()} – ${titel}`;
  }
  function titelFor(poang) {
    let t = I.titlar[0];
    CONFIG.titelGranser.forEach((g, i) => { if (poang >= g && I.titlar[i]) t = I.titlar[i]; });
    return t;
  }

  function ritaSlut() {
    const a = clamp(S.slutTid / 0.6, 0, 1);
    morkna(0.86 * a);
    if (S.slutTid < 0.5) return;
    const in1 = clamp((S.slutTid - 0.5) / 0.3, 0, 1), e = 1 - Math.pow(1 - in1, 3);
    c.globalAlpha = e;
    // vänster: resultatet
    ritaLogga(180, 140, 220, -0.05);
    klistermarke(700, 105, 760, 120, { rot: -3, fyll: F.korall, kant: '#fff', lw: 10, r: 34 });
    text('SLUT PÅ HJÄRTAN!', 700, 111, { px: 76, farg: '#ffffff', rot: -3, max: 700 });
    text(fmt(S.poang), 700, 250, { px: 120, farg: F.gul, kant: F.svart, kantB: 14 });
    text(titelFor(S.poang).toUpperCase(), 700, 340, { px: 40, farg: '#fff', max: 1000 });
    text(hurLangt(), 700, 392, { px: 32, farg: '#C9CDEA', vikt: 800, max: 1000 });

    // veckans utvärdering
    const st = S.stat, ratt = st.situationRatt + st.fragaRatt + st.utvRatt, tot = st.situationTot + st.fragaTot + st.utvTot;
    const lappar = Math.max(st.lapparBast, S.lappar.size);
    [[`${lappar}/${I.lappar.length}`, 'planeringslappar'], [`${ratt}/${tot}`, 'rätta val'], [`${st.hjalpta}`, 'hjälpta barn']].forEach(([v, t], i) => {
      const x = 250 + i * 300;
      c.fillStyle = 'rgba(255,255,255,0.1)'; rundRekt(x - 135, 440, 270, 120, 20); c.fill();
      text(v, x, 485, { px: 56, farg: F.gul });
      text(t, x, 535, { px: 26, farg: '#fff', vikt: 800, max: 250 });
    });

    // "Det här hann du med på BF"
    const ordning = ['svenska', 'planera', 'apl', 'matnk', 'idrott', 'engelska', 'friluftsliv', 'evenemang', 'utvardering'];
    text(I.hannMed, 115, 610, { px: 34, farg: F.gul, align: 'left' });
    ordning.forEach((m, i) => {
      const klar = S.stat.moment.has(m), x = 115 + (i % 3) * 330, y = 665 + Math.floor(i / 3) * 58;
      c.globalAlpha = e * (klar ? 1 : 0.35);
      klistermarke(x + 20, y, 40, 40, { rot: 0, fyll: klar ? F.gron : 'rgba(255,255,255,0.15)', kant: '#fff', lw: 4, r: 10, skugga: false });
      if (klar) text('✓', x + 20, y + 2, { px: 30, farg: F.svart });
      text(I.moment[m], x + 54, y + 2, { px: 28, farg: '#fff', vikt: 800, align: 'left', max: 270 });
    });
    c.globalAlpha = e;
    const pepp = st.situationTot ? fyll(I.peppRad, { ratt: st.situationRatt, totalt: st.situationTot }) : I.peppIngen;
    text(pepp, 600, 860, { px: 30, farg: '#fff', vikt: 800, max: 1050 });

    // höger: dagens topplista
    klistermarke(1500, 470, 720, 820, { rot: 0, fyll: 'rgba(20,20,28,0.9)', lw: 6, r: 36, skugga: false });
    text(I.dagensTopp, 1500, 110, { px: 48, farg: F.gul });
    const plats = S.sparadId ? fyll(I.placeringText, { plats: S.plats }) : S.plats ? fyll(I.placeringText, { plats: S.plats }) : I.utanforListan;
    text(plats, 1500, 160, { px: 28, farg: '#fff', vikt: 800, max: 660 });
    ritaLista(1170, 195, 660, T.dagens(), S.sparadId, 10, 66, 36);

    ritaQr(1790, 975, 150);
    if (S.slutTid > 1.2 && !S.vantarNamn) {
      const puls = 1 + Math.sin(S.klocka * 5) * 0.05;
      c.save(); c.translate(W / 2 - 120, 980); c.scale(puls, puls);
      text(I.spelaIgen, 0, 0, { px: 56, farg: '#ffffff', kant: F.svart, kantB: 12 });
      c.restore();
    }
    c.globalAlpha = 1;
  }

  function rita() {
    const s = vy.skala * vy.dpr;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = F.natt; c.fillRect(0, 0, canvas.width, canvas.height);
    c.setTransform(s, 0, 0, s, vy.ox * vy.dpr, vy.oy * vy.dpr);
    c.save();
    c.beginPath(); c.rect(0, 0, W, H); c.clip();

    const spelar = S.lage === 'spel' || S.lage === 'paus' || S.lage === 'slut' || S.lage === 'namn';
    c.save();
    if (S.skak > 0) { const k = S.skak / CONFIG.skak * 22; c.translate(rnd(-k, k), rnd(-k, k)); }
    if (spelar) {
      ritaVarlden();
      ritaVagvalVarld();
      ritaHinder();
      ritaForemal();
      ritaHjalpare();
      ritaSpelare();
      ritaPartiklar();
      // fartlinjer vid hög fart
      if (S.fartFaktor > 1.35 && S.lage === 'spel') {
        c.globalAlpha = clamp((S.fartFaktor - 1.35) * 1.2, 0, 0.5); c.fillStyle = '#fff';
        for (let i = 0; i < 10; i++) { const y = (hashY(i) * 700 + 120), x = W - ((S.klocka * 2600 + i * 397) % (W + 600)); c.fillRect(x, y, 200 + i * 20, 4); }
        c.globalAlpha = 1;
      }
    } else MILJOER.klassrum.rita(S.kamera, { dagFas: 0.2 + Math.sin(S.klocka * 0.1) * 0.2, tavla: 'planera → genomföra → utvärdera' });
    if (S.skadaBlink > 0) { c.fillStyle = `rgba(255,90,95,${S.skadaBlink})`; c.fillRect(0, 0, W, H); }
    if (S.gronBlink > 0) { c.fillStyle = `rgba(61,220,132,${S.gronBlink * 0.35})`; c.fillRect(0, 0, W, H); }
    c.restore();

    if (S.lage === 'spel' || S.lage === 'paus') {
      ritaHud();
      ritaPlanSkylt();
      ritaVagvalBanner();
      ritaKraftSkylt();
      ritaBanderoller();
      ritaVeckokort();
    }
    if (S.lage === 'start') ritaStart();
    if (S.lage === 'figur') ritaFigurval();
    if (S.lage === 'inriktning') ritaInriktning();
    if (S.lage === 'paus') ritaPaus();
    if (S.lage === 'slut') ritaSlut();
    if (S.lage === 'namn') ritaNamn();
    if (S.attract) { if (S.attract.typ === 'topp') ritaToppSkarm(); else if (S.attract.typ === 'vadar') ritaVadArBF(); else ritaDemoText(); }
    if (!S.attract) ritaKnappar();
    if (CONFIG.visaFps) text(`${Math.round(fps)} fps`, 20, H - 30, { px: 30, farg: F.gron, align: 'left', kant: F.svart, kantB: 6 });
    c.restore();
  }
  const hashY = i => B.hash(i * 7.3);

  /* =====================================================================
     Spelloopen
     ===================================================================== */
  let forra = performance.now(), fps = 60;
  function loop(nu) {
    const verklig = (nu - forra) / 1000;
    if (verklig > 0) fps = lerp(fps, 1 / verklig, 0.05);
    const dt = clamp(verklig, 0, 0.05) * (S.tidsFaktor || 1);   // tidsFaktor används bara av testerna
    forra = nu;
    lasHandkontroller();
    uppdatera(dt);
    rita();
    requestAnimationFrame(loop);
  }

  // Debug/test: window.BFRush ger tillgång till tillståndet (används av Playwright-testerna).
  window.BFRush = {
    CONFIG, S, inp, MILJOER, SEGMENT, FIGURER, I,
    nyRunda, starta(inriktning, autopilot = false) { S.autopilot = autopilot; S.attract = null; S.demo = false; S.figur = valj(FIGURER); nyRunda(inriktning || 'fh'); },
    Topp: T, MONTER, Musik, startaAttract, oppnaPersonal, fps: () => fps
  };
  if (MONTER) document.title = 'BF-Rush – monter';

  const startaLoop = () => { forra = performance.now(); requestAnimationFrame(loop); canvas.focus({ preventScroll: true }); };
  Promise.race([document.fonts ? document.fonts.load(font(40)) : Promise.resolve(), new Promise(r => setTimeout(r, 1500))]).then(startaLoop, startaLoop);
})();
