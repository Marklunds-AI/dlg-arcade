/* Begreppsslukaren – klassrummets nät.

   Supabases gratisplan tål ca 100 Realtime-meddelanden per sekund, och varje broadcast räknas
   som 1 skickat + 1 per mottagare. Ett klassrum med 30 elever i realtid skulle kräva tusentals.
   Därför går själva spelet direkt mellan tavlan och eleverna med WebRTC, och Supabase Broadcast
   används bara för att hitta varandra (några meddelanden per elev):

     slukaren:<KOD>         inkorg – bara läraren lyssnar. Eleverna skickar med REST (httpSend).
     slukaren:<KOD>:<pid>   elevens egen kanal – bara den eleven lyssnar. Läraren skickar med REST.
     slukaren:<KOD>:ut      reserv för elever där WebRTC inte går igenom (t.ex. strängt skolnät).
                            Läraren sänder här i låg takt, anpassad efter BUDGET nedan.

   Kräver supabase-js v2 (window.supabase).
*/
(function () {
  'use strict';

  const SUPABASE_URL = 'https://yafkxfuveudkccjkkcto.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhZmt4ZnV2ZXVka2NjamtrY3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMjgxNzMsImV4cCI6MjA5MTcwNDE3M30.yR26rgUwAouA9LV6MuXncOTsIiQvrhhe06o4vqK3pA0';
  const ICE = [{ urls: 'stun:stun.l.google.com:19302' }];
  const KOD_TECKEN = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // inga 0/O/1/I/L

  // Hur många broadcast-meddelanden/s reservläget får använda totalt (gratisplanen: 100/s).
  // Räknat för 30 elever i reservläget: tavlan ≈ 45/s och styrningen ≈ 30/s (15 skickade + 15 mottagna).
  const BUDGET = { utPerSek: 45, inPerSek: 15, maxHz: 5 };

  const stat = { ut: 0, in: 0, start: performance.now() };   // broadcast-meddelanden den här webbläsaren skickat/tagit emot

  const nyKod = () => Array.from({ length: 4 }, () => KOD_TECKEN[Math.floor(Math.random() * KOD_TECKEN.length)]).join('');
  const stadaKod = s => String(s || '').toUpperCase().split('').filter(c => KOD_TECKEN.includes(c)).join('').slice(0, 4);
  const nyPid = () => Math.random().toString(36).slice(2, 10);

  function klient() {
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 20 } }
    });
  }
  function prenumerera(ch) {
    return new Promise((ok, fel) => {
      const t = setTimeout(() => fel(new Error('Tidsgräns mot Supabase')), 10000);
      ch.subscribe(s => {
        if (s === 'SUBSCRIBED') { clearTimeout(t); ok(ch); }
        else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') { clearTimeout(t); fel(new Error('Kunde inte ansluta (' + s + ')')); }
      });
    });
  }
  function vantaIce(pc, ms = 2500) {
    if (pc.iceGatheringState === 'complete') return Promise.resolve();
    return new Promise(ok => {
      const t = setTimeout(ok, ms);
      pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); ok(); } });
    });
  }
  const sdp = d => ({ type: d.type, sdp: d.sdp });

  /* ======================================================================
     Vard – lärarens webbläsare. h: { hej(pid, p), data(pid, msg), upp(pid, lage), ner(pid) }
     ====================================================================== */
  class Vard {
    constructor(kod, h) { this.kod = kod; this.h = h; this.peers = new Map(); this.elevKanaler = new Map(); this.reservTid = 0; }

    async starta() {
      this.sb = klient();
      this.inkorg = this.sb.channel('slukaren:' + this.kod, { config: { broadcast: { self: false } } })
        .on('broadcast', { event: 'm' }, ({ payload }) => { stat.in++; this.inkommande(payload); });
      this.ut = this.sb.channel('slukaren:' + this.kod + ':ut', { config: { broadcast: { self: false } } });
      await Promise.all([prenumerera(this.inkorg), prenumerera(this.ut)]);
    }

    inkommande(p) {
      const pid = p && String(p.fran || '').slice(0, 16);
      if (!pid) return;
      if (p.t === 'hej') this.h.hej(pid, p);
      else if (p.t === 'sdp') this.svaraOffer(pid, p.sdp).catch(e => console.warn('WebRTC', e));
      else if (p.t === 'reserv') { const x = this.peer(pid); x.lage = 'reserv'; this.h.upp(pid, 'reserv'); }
      else if (p.t === 'hejda') this.h.ner(pid);
      else this.h.data(pid, p);
    }

    peer(pid) { let x = this.peers.get(pid); if (!x) { x = { pid, lage: 'ny' }; this.peers.set(pid, x); } return x; }

    async svaraOffer(pid, offer) {
      const x = this.peer(pid);
      try { x.pc && x.pc.close(); } catch (e) {}
      const pc = new RTCPeerConnection({ iceServers: ICE });
      x.pc = pc; x.dc = null;
      pc.ondatachannel = e => {
        const dc = e.channel;
        dc.onopen = () => { if (x.pc !== pc) return; x.dc = dc; x.lage = 'rtc'; this.h.upp(pid, 'rtc'); };
        dc.onmessage = m => { try { this.h.data(pid, JSON.parse(m.data)); } catch (err) {} };
        dc.onclose = () => { if (x.pc === pc && x.lage === 'rtc') { x.lage = 'ner'; this.h.ner(pid); } };
      };
      pc.onconnectionstatechange = () => {
        if (x.pc === pc && (pc.connectionState === 'failed' || pc.connectionState === 'closed') && x.lage === 'rtc') { x.lage = 'ner'; this.h.ner(pid); }
      };
      await pc.setRemoteDescription(offer);
      await pc.setLocalDescription(await pc.createAnswer());
      await vantaIce(pc);
      this.tillElev(pid, { t: 'sdp', sdp: sdp(pc.localDescription) });
    }

    // Via Supabase till en enda elev (inloggning, signalering). Kostar 2 meddelanden.
    tillElev(pid, msg) {
      let ch = this.elevKanaler.get(pid);
      if (!ch) { ch = this.sb.channel('slukaren:' + this.kod + ':' + pid); this.elevKanaler.set(pid, ch); }
      stat.ut++;
      return ch.httpSend('m', msg).catch(e => console.warn('httpSend', e));
    }

    // Till en elev under spelet: WebRTC om det finns, annars Supabase.
    skicka(pid, msg) {
      const x = this.peers.get(pid);
      if (x && x.dc && x.dc.readyState === 'open') { try { x.dc.send(JSON.stringify(msg)); return; } catch (e) {} }
      if (x && x.lage === 'reserv') this.tillElev(pid, msg);
    }
    // Till alla med WebRTC. Bygg meddelandet en gång.
    skickaRtc(msg) {
      const s = JSON.stringify(msg);
      this.peers.forEach(x => { if (x.dc && x.dc.readyState === 'open') { try { x.dc.send(s); } catch (e) {} } });
    }
    // Till alla i reservläget, i en takt som håller budgeten. bygg() anropas bara när det är dags.
    skickaReserv(dt, bygg) {
      const n = this.antalReserv();
      if (!n) return;
      this.reservTid -= dt;
      if (this.reservTid > 0) return;
      this.reservTid = Math.max(1 / BUDGET.maxHz, (1 + n) / BUDGET.utPerSek);
      stat.ut++;
      this.ut.send({ type: 'broadcast', event: 'm', payload: bygg() });
    }
    antalReserv() { let n = 0; this.peers.forEach(x => { if (x.lage === 'reserv') n++; }); return n; }
    lage(pid) { const x = this.peers.get(pid); return x ? x.lage : 'ny'; }

    koppla(pid) {
      const x = this.peers.get(pid);
      if (x) { try { x.pc && x.pc.close(); } catch (e) {} this.peers.delete(pid); }
    }
    stang() {
      this.peers.forEach(x => { try { x.pc && x.pc.close(); } catch (e) {} });
      this.peers.clear();
      try { this.sb.removeAllChannels(); } catch (e) {}
    }
  }

  /* ======================================================================
     Elev – h: { data(msg), status(lage) }   lage: 'rtc' | 'reserv' | 'ner'
     ====================================================================== */
  class Elev {
    constructor(kod, pid, h, o = {}) { this.kod = kod; this.pid = pid; this.h = h; this.lage = 'ny'; this.tvingaReserv = !!o.reserv; this.inTid = 0; }

    async anslut(info) {
      if (!this.sb) {
        this.sb = klient();
        this.egen = this.sb.channel('slukaren:' + this.kod + ':' + this.pid, { config: { broadcast: { self: false } } })
          .on('broadcast', { event: 'm' }, ({ payload }) => { stat.in++; this.inkommande(payload); });
        this.inkorg = this.sb.channel('slukaren:' + this.kod);
        await prenumerera(this.egen);
      }
      const svar = new Promise((ok, fel) => {
        this.vantar = { ok, fel };
        setTimeout(() => { if (this.vantar) { this.vantar = null; fel(new Error('Hittar inget rum med koden ' + this.kod + '. Kontrollera koden och att läraren har skapat rummet.')); } }, 6000);
      });
      this.tillVard({ t: 'hej', ...info });
      return svar;
    }

    inkommande(p) {
      if (!p) return;
      if (this.vantar && (p.t === 'valkommen' || p.t === 'nej')) {
        const v = this.vantar; this.vantar = null;
        if (p.t === 'nej') { v.fel(new Error(p.orsak || 'Läraren släppte inte in dig.')); return; }
        v.ok(p);
        this.startaRtc();
        return;
      }
      if (p.t === 'sdp') { this.pc && this.pc.setRemoteDescription(p.sdp).catch(e => console.warn('WebRTC', e)); return; }
      this.h.data(p);
    }

    async startaRtc() {
      clearTimeout(this.rtcTimer);
      try { this.pc && this.pc.close(); } catch (e) {}
      this.dc = null;
      if (this.tvingaReserv || !window.RTCPeerConnection) return this.reserv();
      const pc = new RTCPeerConnection({ iceServers: ICE });
      const dc = pc.createDataChannel('spel', { ordered: true });
      this.pc = pc;
      dc.onopen = () => { if (this.pc !== pc) return; clearTimeout(this.rtcTimer); this.dc = dc; this.lage = 'rtc'; this.h.status('rtc'); };
      dc.onmessage = m => { try { this.h.data(JSON.parse(m.data)); } catch (e) {} };
      dc.onclose = () => { if (this.pc === pc && this.lage === 'rtc') { this.lage = 'ner'; this.h.status('ner'); } };
      this.rtcTimer = setTimeout(() => { if (this.pc === pc && this.lage !== 'rtc') this.reserv(); }, 9000);
      try {
        await pc.setLocalDescription(await pc.createOffer());
        await vantaIce(pc);
        this.tillVard({ t: 'sdp', sdp: sdp(pc.localDescription) });
      } catch (e) { this.reserv(); }
    }

    async reserv() {
      clearTimeout(this.rtcTimer);
      try { this.pc && this.pc.close(); } catch (e) {}
      this.pc = null; this.dc = null;
      if (!this.utKanal) {
        this.utKanal = this.sb.channel('slukaren:' + this.kod + ':ut', { config: { broadcast: { self: false } } })
          .on('broadcast', { event: 'm' }, ({ payload }) => { stat.in++; this.h.data(payload); });
        try { await prenumerera(this.utKanal); } catch (e) {}
      }
      this.lage = 'reserv';
      this.tillVard({ t: 'reserv' });
      this.h.status('reserv');
    }

    tillVard(msg) { stat.ut++; return this.inkorg.httpSend('m', { ...msg, fran: this.pid }).catch(e => console.warn('httpSend', e)); }

    // Styrning: via WebRTC varje gång, i reservläget glest och bara när den ändrats.
    styr(x, y, dt) {
      const msg = { t: 'i', x: Math.round(x * 100), y: Math.round(y * 100) };
      if (this.dc && this.dc.readyState === 'open') {
        this.rtcTid = (this.rtcTid || 0) - dt;
        if (this.rtcTid > 0) return;
        this.rtcTid = 0.1;   // ca 10 gånger/s
        try { this.dc.send(JSON.stringify(msg)); } catch (e) {}
        return;
      }
      if (this.lage !== 'reserv') return;
      this.inTid -= dt;
      const andrad = !this.senastIn || Math.abs(this.senastIn.x - msg.x) + Math.abs(this.senastIn.y - msg.y) > 25;
      if (this.inTid > 0 || !andrad) return;
      this.inTid = 30 / BUDGET.inPerSek;   // dimensionerat för 30 elever i reservläget
      this.senastIn = msg;
      this.tillVard(msg);
    }

    stang() {
      clearTimeout(this.rtcTimer);
      try { this.pc && this.pc.close(); } catch (e) {}
      try { this.sb && this.sb.removeAllChannels(); } catch (e) {}
    }
  }

  /* ======================================================================
     Paket – kompakt format. Heltal i platta arrayer.
       s     ögonblicksbild (ca 10/s via WebRTC): b = [id,x,y,massa,flaggor, ...] + ändringar för smulor/bitar
       init  allt (när någon ansluter eller omgången startar)
       f     allt + fasen (reservläget, glest)
       fas   ny fas med frågetexten
       rost  vilka som är med: [[id, alias, färg], ...]
     ====================================================================== */
  const Paket = {
    blobbar(v) {
      const ut = [];
      v.blobbar.forEach(b => ut.push(b.id, Math.round(b.x), Math.round(b.y), Math.round(b.m),
        (b.kraft > 0 ? 1 : 0) | (b.skydd > 0 ? 2 : 0) | (b.seg > 0 ? 4 : 0) | (b.offline ? 8 : 0)));
      return ut;
    },
    smula: s => [s.id, Math.round(s.x), Math.round(s.y), Math.round(s.m * 10) / 10, s.c, Math.round(s.vx), Math.round(s.vy), s.klump ? 1 : 0],
    bit: b => [b.id, Math.round(b.x), Math.round(b.y), b.text],
    tider: v => ({ f: v.fas, nr: v.nr, ft: Math.round(v.fasTid * 10) / 10, tk: v.tidKvar == null ? null : Math.round(v.tidKvar), p: v.pausad }),
    fas(v) { return { t: 'fas', ...this.tider(v), tot: v.antalFragor, text: v.fraga ? v.fraga.text : '', facit: v.forraSvar || '', jt: v.jaktTid, L: v.L }; },
    rost: v => ({ t: 'rost', r: v.blobbar.map(b => [b.id, b.namn, b.farg]) }),
    snap(v) {
      const a = v.andr, p = { t: 's', b: this.blobbar(v), ...this.tider(v) };
      if (a.smulNy.length) p.sa = a.smulNy.map(this.smula);
      if (a.smulBort.length) p.sd = a.smulBort;
      if (a.bitNy.length) p.bn = a.bitNy.map(this.bit);
      if (a.bitBort.length) p.bd = a.bitBort;
      v.andr = { smulNy: [], smulBort: [], bitNy: [], bitBort: [] };
      return p;
    },
    full(v, t) {
      return { ...this.fas(v), t, b: this.blobbar(v), r: this.rost(v).r,
        sm: [...v.smulor.values()].map(this.smula), bi: [...v.bitar.values()].map(this.bit) };
    }
  };

  /* ======================================================================
     Spegel – elevens kopia av världen, byggd av paketen. vy() interpolerar mellan
     ögonblicksbilderna så att det ser mjukt ut.
     ====================================================================== */
  class Spegel {
    constructor() {
      this.rost = new Map(); this.snaps = []; this.smulor = new Map(); this.bitar = new Map();
      this.fas = { f: 'lobby' }; this.fasVid = performance.now(); this.L = 2000; this.intervall = 100;
    }
    satRost(r) { this.rost = new Map(r.map(([id, namn, farg]) => [id, { namn, farg }])); }
    laggSmula(a) { this.smulor.set(a[0], { id: a[0], x: a[1], y: a[2], m: a[3], c: a[4], vx: a[5], vy: a[6], klump: !!a[7] }); }
    laggBit(a) { this.bitar.set(a[0], { id: a[0], x: a[1], y: a[2], text: a[3] }); }
    ta(p) {
      const nu = performance.now();
      if (p.t === 'rost') this.satRost(p.r);
      else if (p.t === 'fas') { this.fas = p; this.fasVid = nu; this.L = p.L || this.L; }
      else if (p.t === 'init' || p.t === 'f') {
        this.L = p.L || this.L; if (p.r) this.satRost(p.r);
        this.smulor.clear(); p.sm.forEach(a => this.laggSmula(a));
        this.bitar.clear(); p.bi.forEach(a => this.laggBit(a));
        this.fas = { ...this.fas, ...p }; this.fasVid = nu;
        this.laggSnap(p.b, nu);
      } else if (p.t === 's') {
        (p.sa || []).forEach(a => this.laggSmula(a)); (p.sd || []).forEach(id => this.smulor.delete(id));
        (p.bn || []).forEach(a => this.laggBit(a)); (p.bd || []).forEach(id => this.bitar.delete(id));
        Object.assign(this.fas, { f: p.f, nr: p.nr, ft: p.ft, tk: p.tk, p: p.p }); this.fasVid = nu;
        this.laggSnap(p.b, nu);
      }
    }
    laggSnap(b, nu) {
      const m = new Map();
      for (let i = 0; i < b.length; i += 5) m.set(b[i], { x: b[i + 1], y: b[i + 2], m: b[i + 3], f: b[i + 4] });
      const sist = this.snaps[this.snaps.length - 1];
      if (sist) this.intervall = this.intervall * 0.8 + Math.min(3000, nu - sist.t) * 0.2;
      this.snaps.push({ t: nu, m });
      while (this.snaps.length > 30 || (this.snaps.length > 2 && this.snaps[1].t < nu - 5000)) this.snaps.shift();
    }
    sedan() { return this.fas.p ? 0 : (performance.now() - this.fasVid) / 1000; }
    fasTid() { return Math.max(0, (this.fas.ft || 0) - this.sedan()); }
    tidKvar() { return this.fas.tk == null ? null : Math.max(0, this.fas.tk - this.sedan()); }
    vy(dt) {
      const nu = performance.now();
      const rt = nu - Math.min(1600, this.intervall * 1.3 + 20);
      let a = null, b = null;
      for (let i = this.snaps.length - 1; i >= 0; i--) if (this.snaps[i].t <= rt) { a = this.snaps[i]; b = this.snaps[i + 1] || null; break; }
      if (!a) a = this.snaps[0];
      const k = b ? Math.min(1, (rt - a.t) / (b.t - a.t)) : 0;
      const blobbar = [];
      if (a) a.m.forEach((s, id) => {
        const r = this.rost.get(id); if (!r) return;
        const e = (b && b.m.get(id)) || s;
        blobbar.push({ id, namn: r.namn, farg: r.farg, x: s.x + (e.x - s.x) * k, y: s.y + (e.y - s.y) * k, m: s.m + (e.m - s.m) * k,
          kraft: e.f & 1, skydd: e.f & 2, seg: e.f & 4, offline: !!(e.f & 8) });
      });
      // klumpar som sprätter iväg rör sig likadant som hos läraren
      if (this.fas.f === 'jakt' && !this.fas.p) {
        const fr = Math.exp(-4 * dt);
        for (const s of this.smulor.values()) if (s.vx || s.vy) {
          s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= fr; s.vy *= fr;
          if (Math.abs(s.vx) + Math.abs(s.vy) < 8) { s.vx = 0; s.vy = 0; }
        }
      }
      return { L: this.L, blobbar, smulor: this.smulor.values(), bitar: this.bitar.values() };
    }
  }

  window.SLNatet = { Vard, Elev, Paket, Spegel, nyKod, stadaKod, nyPid, stat, BUDGET, KOD_TECKEN };
})();
