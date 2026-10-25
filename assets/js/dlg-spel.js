/* DLG Arcade – gemensam spelmotor.
   Ger varje spel: val av bana och nivå, egna banor, frågor, ljud, styrning,
   paus, resultatskärm med missade begrepp och topplista (tabellen ArcadeScore).

   Kräver att banor.js laddas före den här filen.

   Minsta spel:
     DLGSpel.start({
       id: 'invaders',                    // spelets nyckel i topplistan
       titel: 'Begreppsinvaders',
       ingress: 'Skjut rätt begrepp innan de når dig.',
       instruktion: ['Läs definitionen', 'Skjut rätt begrepp'],
       maxPoang: 100000,
       knappar: ['vanster', 'hoger', 'skjut'],   // pekknappar på skärmen
       starta(ctx) { ... }                 // ctx.bana, ctx.niva, ctx.fragor, ctx.slut(poang)
     });

   Valfritt:
     startKnappar: [{ text, klick }]       // extra knappar bredvid "Spela" på startskärmen
     DLGSpel.startaExtern() / avslutaExtern()   // spelet styr själv (t.ex. klassrum): ingen paus, ingen topplista
     DLGSpel.skapaFragor(bana), allaBanor(), banaById(id), stil()   // för sidor som inte kör start()
*/
(function () {
  'use strict';

  const SUPABASE_URL = 'https://yafkxfuveudkccjkkcto.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhZmt4ZnV2ZXVka2NjamtrY3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMjgxNzMsImV4cCI6MjA5MTcwNDE3M30.yR26rgUwAouA9LV6MuXncOTsIiQvrhhe06o4vqK3pA0';
  const SCORE_TABLE = 'ArcadeScore';
  const DB_HEADERS = { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' };

  const NIVAER = {
    latt:     { id: 'latt',     namn: 'Lätt',     ikon: '🐢', text: 'Lugnt tempo, färre alternativ' },
    normal:   { id: 'normal',   namn: 'Normal',   ikon: '🎮', text: 'Lagom utmaning' },
    hardcore: { id: 'hardcore', namn: 'Hardcore', ikon: '🔥', text: 'Snabbt och svårt' }
  };

  const KEYMAP = {
    ArrowLeft: 'vanster', KeyA: 'vanster', ArrowRight: 'hoger', KeyD: 'hoger',
    ArrowUp: 'upp', KeyW: 'upp', ArrowDown: 'ner', KeyS: 'ner',
    Space: 'skjut', Enter: 'skjut', KeyP: 'paus', Escape: 'paus'
  };
  const KNAPP_IKON = { vanster: '◀', hoger: '▶', upp: '▲', ner: '▼', skjut: '●' };

  /* ---------- små hjälpare ---------- */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const store = {
    get(k, f) { try { const v = localStorage.getItem(k); return v === null ? f : JSON.parse(v); } catch (e) { return f; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---------- banor ---------- */
  const EGNA_KEY = 'dlg_egna_banor';
  const allaBanor = () => [...(window.DLG_BANOR || []), ...store.get(EGNA_KEY, [])];
  const banaById = id => allaBanor().find(b => b.id === id);

  // Tolkar inklistrad text: en rad per begrepp, "ord - definition", "ord: definition" eller tab.
  function tolkaBana(text) {
    return text.split(/\r?\n/).map(r => r.trim()).filter(Boolean).map(r => {
      const m = r.match(/^(.+?)\s*(?:\t|:|\s[-–—]\s)\s*(.+)$/);
      return m ? { ord: m[1].trim(), def: m[2].trim() } : null;
    }).filter(Boolean);
  }

  /* ---------- frågemotor ----------
     Begrepp man missar får högre vikt och dyker upp oftare. */
  function skapaFragor(bana) {
    const lista = bana.begrepp.map((b, i) => ({ ...b, i, vikt: 1, ratt: 0, fel: 0 }));
    let senaste = [];
    const api = {
      lista,
      // lage: 'def' = visa definition, välj begrepp. 'ord' = visa begrepp, välj definition.
      nasta(antal = 4, lage = 'def') {
        const pool = lista.filter(b => !senaste.includes(b.i));
        const kand = pool.length ? pool : lista;
        const sum = kand.reduce((s, b) => s + b.vikt, 0);
        let r = Math.random() * sum, val = kand[0];
        for (const b of kand) { r -= b.vikt; if (r <= 0) { val = b; break; } }
        senaste = [...senaste, val.i].slice(-Math.min(3, Math.floor(lista.length / 2)));
        const andra = shuffle(lista.filter(b => b.i !== val.i)).slice(0, Math.max(1, Math.min(antal, lista.length) - 1));
        const alt = shuffle([val, ...andra]);
        return {
          begrepp: val,
          fraga: lage === 'ord' ? val.ord : val.def,
          svar: lage === 'ord' ? val.def : val.ord,
          alternativ: alt.map(b => ({ text: lage === 'ord' ? b.def : b.ord, ratt: b.i === val.i, begrepp: b }))
        };
      },
      svara(begrepp, ratt) {
        const b = lista[begrepp.i];
        if (ratt) { b.ratt++; b.vikt = Math.max(0.5, b.vikt * 0.7); }
        else { b.fel++; b.vikt = Math.min(6, b.vikt + 2); }
      },
      statistik() {
        const ratt = lista.reduce((s, b) => s + b.ratt, 0), fel = lista.reduce((s, b) => s + b.fel, 0);
        return { ratt, fel, missade: lista.filter(b => b.fel > 0).sort((a, b) => b.fel - a.fel) };
      }
    };
    return api;
  }

  /* ---------- ljud (genereras, inga filer) ---------- */
  let actx = null;
  let ljudPa = store.get('dlg_ljud', true);
  function ton(freq, dur, typ = 'square', vol = 0.06, slide = 0, delay = 0) {
    if (!ljudPa) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const t = actx.currentTime + delay;
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = typ; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
  }
  const LJUD = {
    ratt() { ton(660, 0.09, 'square', 0.05); ton(990, 0.14, 'square', 0.05, 0, 0.08); },
    fel() { ton(220, 0.25, 'sawtooth', 0.05, -120); },
    skott() { ton(880, 0.07, 'square', 0.025, -500); },
    small() { ton(160, 0.22, 'triangle', 0.08, -110); },
    poang() { ton(1320, 0.06, 'square', 0.03); },
    traff() { ton(120, 0.35, 'sawtooth', 0.07, -80); },
    niva() { [523, 659, 784, 1046].forEach((f, i) => ton(f, 0.12, 'square', 0.04, 0, i * 0.09)); },
    slut() { [392, 330, 262, 196].forEach((f, i) => ton(f, 0.22, 'triangle', 0.06, 0, i * 0.18)); }
  };

  /* ---------- styrning ---------- */
  const nere = new Set();
  const tryckt = new Set(); // "just nu tryckt" – töms när spelet läser den
  function satt(namn, pa) {
    if (pa && !nere.has(namn)) tryckt.add(namn);
    pa ? nere.add(namn) : nere.delete(namn);
  }

  /* ---------- stil ---------- */
  const CSS = `
@font-face{font-family:"Inria Serif";font-weight:400;font-display:swap;src:url("../assets/fonts/InriaSerif-400-normal.woff2") format("woff2");}
@font-face{font-family:"Inter";font-weight:300 900;font-display:swap;src:url("../assets/fonts/Inter-300-900-normal.woff2") format("woff2");}
:root{--navy:#363B68;--sky:#C9E0EE;--yellow:#F7D563;--cream:#F8EAA4;--red:#A43033;--pink:#F1D9EA;--forest:#205B4F;--mint:#E1EFE3;--black:#242422;--slate:#484F59;--grey:#C8CACD;--sans:"Inter",Arial,Helvetica,sans-serif;--serif:"Inria Serif",Georgia,serif;--ease:cubic-bezier(.2,0,0,1)}
*{box-sizing:border-box}
html,body{margin:0;height:100%;overflow:hidden;background:var(--dlg-bg,var(--navy));color:#fff;font-family:var(--sans);-webkit-font-smoothing:antialiased;touch-action:manipulation;user-select:none;-webkit-user-select:none}
button{font:inherit;cursor:pointer}
button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid var(--yellow);outline-offset:2px}
[hidden]{display:none!important}
.dlg-root{position:fixed;inset:0;display:flex;flex-direction:column}
.dlg-hud{display:flex;gap:8px;align-items:center;padding:10px 12px;flex-wrap:wrap;z-index:2}
.dlg-hud .logo{font-weight:900;letter-spacing:-.03em;font-size:18px;margin-right:auto}
.dlg-hud .logo span{color:var(--yellow)}
.dlg-stat{background:rgba(255,255,255,.12);border-radius:999px;padding:4px 12px;font-size:14px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap}
.dlg-stat b{color:var(--yellow);font-weight:800}
.dlg-iconbtn{background:rgba(255,255,255,.12);border:0;color:#fff;border-radius:999px;width:34px;height:30px;font-size:15px}
.dlg-iconbtn:hover{background:rgba(255,255,255,.22)}
.dlg-stage{position:relative;flex:1;min-height:0}
.dlg-stage canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.dlg-pad{display:none;gap:10px;padding:8px 12px calc(10px + env(safe-area-inset-bottom));justify-content:space-between;z-index:2}
.dlg-pad .grp{display:flex;gap:10px}
.dlg-pad button{width:68px;height:60px;border-radius:14px;border:2px solid rgba(255,255,255,.35);background:rgba(255,255,255,.1);color:#fff;font-size:24px;touch-action:none}
.dlg-pad button.skjut{width:92px;background:var(--yellow);color:var(--black);border-color:var(--yellow)}
.dlg-pad button.on{transform:scale(.94);background:rgba(255,255,255,.3)}
.dlg-pad button.skjut.on{background:var(--cream)}
@media (pointer:coarse){.dlg-pad{display:flex}}
@media (max-width:560px){.dlg-hud .logo{display:none}.dlg-hud{gap:6px;padding:8px 10px}.dlg-stat{padding:4px 10px;font-size:13px}}
.dlg-overlay{position:fixed;inset:0;z-index:10;background:rgba(36,36,34,.55);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:20px 14px}
.dlg-panel{width:min(720px,100%);margin:auto 0;display:flex;flex-direction:column;gap:16px}
.dlg-panel h1{margin:0;font-size:clamp(38px,8vw,64px);line-height:.95;font-weight:900;letter-spacing:-.045em}
.dlg-panel h1 span{color:var(--yellow)}
.dlg-lead{font-family:var(--serif);font-size:clamp(18px,2.6vw,23px);line-height:1.3;color:var(--cream);margin:0}
.dlg-box{background:#fff;color:var(--black);padding:18px 20px;display:flex;flex-direction:column;gap:10px;border-radius:2px}
.dlg-box h2{margin:0;font-size:18px;font-weight:800}
.dlg-box ol{margin:0;padding-left:22px;display:grid;gap:4px}
.dlg-small{font-size:14px;color:var(--slate)}
.dlg-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:52px;padding:0 26px;font-size:18px;font-weight:700;border:2px solid var(--yellow);border-radius:4px;background:var(--yellow);color:var(--black);transition:background 120ms var(--ease)}
.dlg-btn:hover{background:var(--cream);border-color:var(--cream)}
.dlg-btn.ghost{background:transparent;color:#fff;border-color:#fff}
.dlg-btn.ghost:hover{background:rgba(255,255,255,.12)}
.dlg-btn.dark{background:var(--navy);border-color:var(--navy);color:#fff}
.dlg-btn.small{height:40px;font-size:15px;padding:0 14px}
.dlg-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.dlg-banor{display:flex;flex-direction:column;gap:12px}
.dlg-kurs{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--slate);margin:4px 0 -4px}
.dlg-chips{display:flex;flex-wrap:wrap;gap:8px}
.dlg-chip{border:2px solid var(--grey);background:#fff;color:var(--black);border-radius:999px;padding:8px 14px;font-weight:600;font-size:15px}
.dlg-chip small{color:var(--slate);font-weight:500;margin-left:4px}
.dlg-chip:hover{border-color:var(--navy)}
.dlg-chip[aria-pressed="true"]{background:var(--navy);border-color:var(--navy);color:#fff}
.dlg-chip[aria-pressed="true"] small{color:var(--sky)}
.dlg-niva{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.dlg-niva .dlg-chip{border-radius:8px;padding:10px 8px;display:flex;flex-direction:column;align-items:center;gap:2px}
.dlg-niva .dlg-chip small{margin:0;font-size:12px;text-align:center}
.dlg-input,.dlg-text{width:100%;border:2px solid var(--grey);border-radius:4px;padding:10px 12px;font:inherit;font-size:16px;color:var(--black);background:#fff}
.dlg-text{min-height:160px;resize:vertical;font-size:15px}
.dlg-score{font-size:clamp(48px,11vw,84px);font-weight:900;letter-spacing:-.04em;line-height:1;color:var(--yellow)}
.dlg-kpi{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.dlg-kpi div{background:rgba(255,255,255,.12);padding:10px 12px;border-radius:2px}
.dlg-kpi b{display:block;font-size:24px}
.dlg-kpi span{font-size:13px;color:var(--sky)}
.dlg-miss{display:grid;gap:8px;max-height:240px;overflow:auto}
.dlg-miss div{border-left:4px solid var(--red);padding:4px 10px;background:var(--pink)}
.dlg-miss b{display:block}
.dlg-top{display:grid;gap:2px}
.dlg-top .r{display:grid;grid-template-columns:28px 1fr auto;gap:8px;padding:6px 4px;border-bottom:1px solid #eee;font-variant-numeric:tabular-nums}
.dlg-top .r.me{background:var(--cream)}
.dlg-top .r b:first-child{color:var(--slate)}
.dlg-toast{position:fixed;left:50%;top:18%;transform:translateX(-50%);z-index:5;pointer-events:none;font-weight:900;font-size:clamp(28px,6vw,46px);letter-spacing:-.03em;text-shadow:0 3px 0 rgba(0,0,0,.35);animation:dlgToast 1s var(--ease) forwards;white-space:nowrap}
@keyframes dlgToast{0%{opacity:0;transform:translate(-50%,10px) scale(.9)}15%{opacity:1;transform:translate(-50%,0) scale(1.05)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-14px)}}
`;

  /* ---------- motorn ---------- */
  const DLGSpel = {
    NIVAER, LJUD, esc, fmt, shuffle, store,
    ned: namn => nere.has(namn),
    tryckt(namn) { const t = tryckt.has(namn); tryckt.delete(namn); return t; },
    ljud(namn) { LJUD[namn] && LJUD[namn](); },
    pausad: false,

    start(cfg) {
      this.cfg = cfg = Object.assign({ maxPoang: 100000, knappar: [], hud: [], instruktion: [], ingress: '', farg: null, lage: 'def', startKnappar: [] }, cfg);
      this.stil();
      if (cfg.farg) document.documentElement.style.setProperty('--dlg-bg', cfg.farg);
      document.title = cfg.titel + ' – DLG Arcade';

      const root = document.createElement('div');
      root.className = 'dlg-root';
      root.innerHTML = `
        <div class="dlg-hud">
          <div class="logo">${esc(cfg.titel)}</div>
          <span id="dlg-hud-extra" style="display:contents"></span>
          <span class="dlg-stat">Poäng <b id="dlg-poang">0</b></span>
          <button class="dlg-iconbtn" id="dlg-ljud" aria-label="Ljud av/på"></button>
          <button class="dlg-iconbtn" id="dlg-paus" aria-label="Paus">❚❚</button>
        </div>
        <div class="dlg-stage" id="dlg-stage"></div>
        <div class="dlg-pad" id="dlg-pad"></div>`;
      document.body.appendChild(root);
      this.stage = root.querySelector('#dlg-stage');
      this.hudExtra = root.querySelector('#dlg-hud-extra');

      // ljud
      const lb = root.querySelector('#dlg-ljud');
      const ritaLjud = () => { lb.textContent = ljudPa ? '🔊' : '🔇'; };
      ritaLjud();
      lb.onclick = () => { ljudPa = !ljudPa; store.set('dlg_ljud', ljudPa); ritaLjud(); lb.blur(); };
      root.querySelector('#dlg-paus').onclick = e => { e.currentTarget.blur(); this.togglePaus(); };

      // tangentbord
      addEventListener('keydown', e => {
        if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
        const n = KEYMAP[e.code]; if (!n) return;
        if (this.spelar) e.preventDefault();
        if (n === 'paus' && !e.repeat) { if (this.spelar && !this.extern) this.togglePaus(); return; }
        satt(n, true);
      });
      addEventListener('keyup', e => { const n = KEYMAP[e.code]; if (n) satt(n, false); });
      addEventListener('blur', () => { nere.clear(); if (this.spelar && !this.pausad && !this.extern) this.togglePaus(); });

      // pekknappar
      const pad = root.querySelector('#dlg-pad');
      const vanster = cfg.knappar.filter(k => k !== 'skjut'), hoger = cfg.knappar.filter(k => k === 'skjut');
      pad.innerHTML = `<div class="grp">${vanster.map(k => `<button data-k="${k}" aria-label="${k}">${KNAPP_IKON[k]}</button>`).join('')}</div>
                       <div class="grp">${hoger.map(k => `<button class="skjut" data-k="${k}" aria-label="${k}">${KNAPP_IKON[k]}</button>`).join('')}</div>`;
      pad.querySelectorAll('button').forEach(b => {
        const k = b.dataset.k;
        const on = e => { e.preventDefault(); b.classList.add('on'); satt(k, true); };
        const off = e => { e.preventDefault(); b.classList.remove('on'); satt(k, false); };
        b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off);
        b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
      });
      if (!cfg.knappar.length) pad.remove();

      // förval från adressen: ?bana=salutogent&niva=normal
      const q = new URLSearchParams(location.search);
      this.valdBana = (q.get('bana') && banaById(q.get('bana'))) ? q.get('bana') : store.get('dlg_bana', (window.DLG_BANOR || [{}])[0].id);
      if (!banaById(this.valdBana)) this.valdBana = (window.DLG_BANOR || [{}])[0].id;
      this.valdNiva = NIVAER[q.get('niva')] ? q.get('niva') : store.get('dlg_niva', 'normal');
      if (!NIVAER[this.valdNiva]) this.valdNiva = 'normal';

      this.visaStart();
    },

    stil() {
      if (document.getElementById('dlg-stil')) return;
      const st = document.createElement('style'); st.id = 'dlg-stil'; st.textContent = CSS; document.head.appendChild(st);
    },

    /* --- HUD som spelet kan fylla på --- */
    hud(id, etikett, varde) {
      let el = this.hudExtra.querySelector(`[data-id="${id}"]`);
      if (!el) { el = document.createElement('span'); el.className = 'dlg-stat'; el.dataset.id = id; this.hudExtra.appendChild(el); }
      el.innerHTML = `${esc(etikett)} <b>${esc(varde)}</b>`;
    },
    setPoang(p) { this.poang = p; document.getElementById('dlg-poang').textContent = fmt(p); },
    toast(text, farg = '#F7D563') {
      const t = document.createElement('div'); t.className = 'dlg-toast'; t.style.color = farg; t.textContent = text;
      document.body.appendChild(t); setTimeout(() => t.remove(), 1000);
    },

    /* --- overlay --- */
    overlay(html) {
      this.stangOverlay();
      const o = document.createElement('div'); o.className = 'dlg-overlay'; o.innerHTML = `<div class="dlg-panel">${html}</div>`;
      document.body.appendChild(o); this.ov = o; return o;
    },
    stangOverlay() { if (this.ov) { this.ov.remove(); this.ov = null; } },

    visaStart() {
      const cfg = this.cfg;
      this.spelar = false;
      const titel = cfg.titel.replace(/^(\S+)(.*)$/, (m, a, b) => b ? `${esc(a)}<span>${esc(b)}</span>` : `<span>${esc(a)}</span>`);
      const o = this.overlay(`
        <h1>${titel}</h1>
        ${cfg.ingress ? `<p class="dlg-lead">${esc(cfg.ingress)}</p>` : ''}
        <div class="dlg-box">
          <h2>Välj bana</h2>
          <div class="dlg-banor" id="dlg-banor"></div>
          <div class="dlg-row"><button class="dlg-btn small dark" id="dlg-ny">+ Skapa egen bana</button></div>
        </div>
        <div class="dlg-box">
          <h2>Välj nivå</h2>
          <div class="dlg-niva" id="dlg-niva">${Object.values(NIVAER).map(n =>
            `<button class="dlg-chip" data-n="${n.id}" aria-pressed="${n.id === this.valdNiva}"><span>${n.ikon} ${n.namn}</span><small>${esc((cfg.nivaText || {})[n.id] || n.text)}</small></button>`).join('')}</div>
        </div>
        <div class="dlg-row"><button class="dlg-btn" id="dlg-spela">Spela ▶</button>${cfg.startKnappar.map((k, i) => `<button class="dlg-btn ghost" data-sk="${i}">${esc(k.text)}</button>`).join('')}<span class="dlg-small" style="color:var(--sky)">Tangentbord: piltangenter + mellanslag. P = paus.</span></div>
        ${cfg.instruktion.length ? `<div class="dlg-box"><h2>Så spelar du</h2><ol>${cfg.instruktion.map(r => `<li>${esc(r)}</li>`).join('')}</ol></div>` : ''}`);
      this.ritaBanor();
      o.querySelector('#dlg-ny').onclick = () => this.visaNyBana();
      o.querySelectorAll('[data-n]').forEach(b => b.onclick = () => {
        this.valdNiva = b.dataset.n; store.set('dlg_niva', this.valdNiva);
        o.querySelectorAll('[data-n]').forEach(x => x.setAttribute('aria-pressed', x === b));
      });
      o.querySelector('#dlg-spela').onclick = () => this.spela();
      o.querySelectorAll('[data-sk]').forEach(b => b.onclick = () => cfg.startKnappar[b.dataset.sk].klick());
      o.querySelector('#dlg-spela').focus({ preventScroll: true });
    },

    ritaBanor() {
      const el = this.ov.querySelector('#dlg-banor');
      const grupper = {};
      allaBanor().forEach(b => { const k = b.egen ? 'Egna banor' : (b.kurs || 'Övrigt'); (grupper[k] = grupper[k] || []).push(b); });
      el.innerHTML = Object.entries(grupper).map(([kurs, banor]) => `
        <div class="dlg-kurs">${esc(kurs)}</div>
        <div class="dlg-chips">${banor.map(b => `<button class="dlg-chip" data-b="${esc(b.id)}" aria-pressed="${b.id === this.valdBana}">${esc(b.namn)}<small>${b.begrepp.length}</small></button>`).join('')}</div>`).join('');
      el.querySelectorAll('[data-b]').forEach(b => b.onclick = () => {
        this.valdBana = b.dataset.b; store.set('dlg_bana', this.valdBana);
        el.querySelectorAll('[data-b]').forEach(x => x.setAttribute('aria-pressed', x === b));
      });
    },

    visaNyBana() {
      const o = this.overlay(`
        <h1>Egen <span>bana</span></h1>
        <div class="dlg-box">
          <label class="dlg-small" for="dlg-bn">Namn på banan</label>
          <input class="dlg-input" id="dlg-bn" placeholder="t.ex. Utvecklingspsykologi" maxlength="40">
          <label class="dlg-small" for="dlg-bt">Ett begrepp per rad: <b>begrepp - definition</b> (eller begrepp: definition). Minst 4 rader.</label>
          <textarea class="dlg-text" id="dlg-bt" placeholder="Piaget - Utvecklingspsykolog som beskrev barns kognitiva utveckling i stadier.&#10;Anknytning - Det känslomässiga bandet mellan barn och omsorgsperson."></textarea>
          <p class="dlg-small" id="dlg-bmsg">Banan sparas bara i den här webbläsaren och fungerar i alla spel på DLG Arcade.</p>
          <div class="dlg-row"><button class="dlg-btn small" id="dlg-bspara">Spara bana</button><button class="dlg-btn small dark" id="dlg-bavbryt">Avbryt</button></div>
        </div>`);
      o.querySelector('#dlg-bavbryt').onclick = () => this.visaStart();
      o.querySelector('#dlg-bspara').onclick = () => {
        const namn = o.querySelector('#dlg-bn').value.trim() || 'Min bana';
        const begrepp = tolkaBana(o.querySelector('#dlg-bt').value);
        if (begrepp.length < 4) { o.querySelector('#dlg-bmsg').innerHTML = `<b style="color:var(--red)">Hittade ${begrepp.length} begrepp. Det behövs minst 4, ett per rad med bindestreck eller kolon.</b>`; return; }
        const egna = store.get(EGNA_KEY, []);
        const id = 'egen-' + Date.now().toString(36);
        egna.push({ id, namn, kurs: 'Egna banor', egen: true, begrepp });
        store.set(EGNA_KEY, egna);
        this.valdBana = id; store.set('dlg_bana', id);
        this.visaStart();
      };
      o.querySelector('#dlg-bn').focus();
    },

    /* --- spelets livscykel --- */
    spela() {
      this.stangOverlay();
      nere.clear(); tryckt.clear();
      const bana = banaById(this.valdBana) || allaBanor()[0];
      this.bana = bana;
      this.fragor = skapaFragor(bana);
      this.setPoang(0);
      this.hudExtra.innerHTML = '';
      this.spelar = true; this.pausad = false;
      try { actx && actx.state === 'suspended' && actx.resume(); } catch (e) {}
      const ctx = {
        bana, niva: this.valdNiva, fragor: this.fragor, stage: this.stage,
        setPoang: p => this.setPoang(p),
        hud: (id, et, v) => this.hud(id, et, v),
        toast: (t, f) => this.toast(t, f),
        slut: (p, extra) => this.slut(p, extra),
        get pausad() { return DLGSpel.pausad; }
      };
      this.cfg.starta(ctx);
    },

    // Spelet tar över helt (t.ex. klassrumsläget): ingen paus och ingen resultatskärm från motorn.
    startaExtern() {
      this.stangOverlay();
      nere.clear(); tryckt.clear();
      this.extern = true; this.spelar = true; this.pausad = false;
      this.setPoang(0); this.hudExtra.innerHTML = '';
      document.getElementById('dlg-paus').hidden = true;
      try { actx && actx.state === 'suspended' && actx.resume(); } catch (e) {}
    },
    avslutaExtern() {
      this.extern = false; this.spelar = false; this.pausad = false;
      document.getElementById('dlg-paus').hidden = false;
    },

    togglePaus() {
      if (!this.spelar || this.extern) return;
      this.pausad = !this.pausad;
      if (this.pausad) {
        const o = this.overlay(`<h1>Paus</h1><div class="dlg-row"><button class="dlg-btn" id="dlg-fortsatt">Fortsätt ▶</button><button class="dlg-btn ghost" id="dlg-avsluta">Avsluta rundan</button></div>`);
        o.querySelector('#dlg-fortsatt').onclick = () => this.togglePaus();
        o.querySelector('#dlg-avsluta').onclick = () => { this.pausad = false; this.slut(this.poang || 0); };
        o.querySelector('#dlg-fortsatt').focus();
      } else { this.stangOverlay(); nere.clear(); }
      this.cfg.onPaus && this.cfg.onPaus(this.pausad);
    },

    slut(poang, extra = {}) {
      if (!this.spelar) return;
      this.spelar = false; this.pausad = false;
      this.cfg.onSlut && this.cfg.onSlut();
      poang = Math.max(0, Math.min(Math.round(poang), this.cfg.maxPoang));
      this.setPoang(poang);
      LJUD.slut();
      const s = this.fragor.statistik();
      const andel = s.ratt + s.fel ? Math.round(100 * s.ratt / (s.ratt + s.fel)) : 0;
      const o = this.overlay(`
        <h1>${esc(extra.rubrik || 'Game over')}</h1>
        <div class="dlg-score">${fmt(poang)}</div>
        <div class="dlg-kpi">
          <div><b>${s.ratt}</b><span>rätt</span></div>
          <div><b>${s.fel}</b><span>fel</span></div>
          <div><b>${andel} %</b><span>träffsäkerhet</span></div>
        </div>
        ${s.missade.length ? `<div class="dlg-box"><h2>Begrepp att öva på</h2><div class="dlg-miss">${s.missade.slice(0, 8).map(b => `<div><b>${esc(b.ord)}</b>${esc(b.def)}</div>`).join('')}</div></div>`
          : (s.ratt ? `<div class="dlg-box"><h2>Inga missar – snyggt!</h2></div>` : '')}
        <div class="dlg-box">
          <h2>Topplista · ${esc(this.bana.namn)} · ${NIVAER[this.valdNiva].namn}</h2>
          ${poang > 0 && !this.bana.egen ? `<div class="dlg-row"><input class="dlg-input" id="dlg-alias" maxlength="20" placeholder="Ditt smeknamn (inte riktiga namnet)" style="flex:1;min-width:160px" value="${esc(store.get('dlg_alias', ''))}"><button class="dlg-btn small" id="dlg-sparapoang">Spara</button></div>` : ''}
          ${this.bana.egen ? '<p class="dlg-small">Egna banor har ingen topplista.</p>' : ''}
          <p class="dlg-small" id="dlg-msg"></p>
          <div class="dlg-top" id="dlg-top"></div>
        </div>
        <div class="dlg-row"><button class="dlg-btn" id="dlg-igen">Spela igen ▶</button><button class="dlg-btn ghost" id="dlg-byt">Byt bana eller nivå</button></div>`);
      o.querySelector('#dlg-igen').onclick = () => this.spela();
      o.querySelector('#dlg-byt').onclick = () => this.visaStart();
      const spara = o.querySelector('#dlg-sparapoang');
      if (spara) spara.onclick = async () => {
        const namn = o.querySelector('#dlg-alias').value.trim();
        const msg = o.querySelector('#dlg-msg');
        if (!namn) { msg.textContent = 'Skriv ett smeknamn först.'; return; }
        store.set('dlg_alias', namn);
        spara.disabled = true; msg.textContent = 'Sparar…';
        try {
          await this.sparaPoang(namn, poang);
          msg.textContent = 'Sparat!';
          o.querySelector('#dlg-alias').parentElement.remove();
          try { parent !== window && parent.postMessage({ type: 'dlg-score-saved', game: this.cfg.id }, '*'); } catch (e) {}
          this.visaTopp({ namn, poang });
        } catch (e) { msg.textContent = 'Kunde inte spara just nu. ' + e.message; spara.disabled = false; }
      };
      if (!this.bana.egen) this.visaTopp();
      (o.querySelector('#dlg-alias') || o.querySelector('#dlg-igen')).focus({ preventScroll: true });
    },

    async hamtaTopp(limit = 10) {
      const q = `?select=name,score&game=eq.${encodeURIComponent(this.cfg.id)}&list=eq.${encodeURIComponent(this.bana.id)}&difficulty=eq.${this.valdNiva}&order=score.desc&limit=${limit}`;
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${SCORE_TABLE}${q}`, { headers: DB_HEADERS });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    },
    async sparaPoang(name, score) {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${SCORE_TABLE}`, {
        method: 'POST', headers: { ...DB_HEADERS, Prefer: 'return=minimal' },
        body: JSON.stringify({ game: this.cfg.id, name, score, list: this.bana.id, difficulty: this.valdNiva })
      });
      if (!r.ok) throw new Error('(HTTP ' + r.status + ')');
    },
    async visaTopp(jag) {
      const el = this.ov && this.ov.querySelector('#dlg-top'); if (!el) return;
      el.innerHTML = '<span class="dlg-small">Hämtar topplistan…</span>';
      try {
        const rader = await this.hamtaTopp();
        let markerad = false;
        el.innerHTML = rader.length ? rader.map((r, i) => {
          const me = jag && !markerad && r.name === jag.namn && Number(r.score) === jag.poang; if (me) markerad = true;
          return `<div class="r ${me ? 'me' : ''}"><b>${i + 1}</b><span>${esc(r.name)}</span><b>${fmt(r.score)}</b></div>`;
        }).join('') : '<span class="dlg-small">Inga resultat än – bli först!</span>';
      } catch (e) { el.innerHTML = '<span class="dlg-small">Topplistan kunde inte hämtas just nu.</span>'; }
    }
  };

  Object.assign(DLGSpel, { skapaFragor, allaBanor, banaById });
  window.DLGSpel = DLGSpel;
})();
