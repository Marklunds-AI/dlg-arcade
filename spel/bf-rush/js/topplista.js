/* BF-Rush – topplistan.
   Allt sparas lokalt i webbläsaren (localStorage), så att det fungerar helt utan nät:
     bfrush_dag_ÅÅÅÅ-MM-DD   dagens resultat (en lista per datum – historiken sparas)
     bfrush_basta            bästa någonsin (topp 10)
     bfrush_ko               resultat som väntar på att skickas till Supabase
   Finns nätet skickas resultatet också till Supabase (tabellen ArcadeScore, game: 'bfrush').
   Saknas nätet ligger det kvar i kön och skickas senare. Spelet väntar aldrig på nätet. */
(function () {
  'use strict';
  const B = window.BFR = window.BFR || {};

  const SUPABASE_URL = 'https://yafkxfuveudkccjkkcto.supabase.co';
  // Publik "anon"-nyckel – den får synas i webbläsaren. Skyddet ligger i tabellens RLS-regler.
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhZmt4ZnV2ZXVka2NjamtrY3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMjgxNzMsImV4cCI6MjA5MTcwNDE3M30.yR26rgUwAouA9LV6MuXncOTsIiQvrhhe06o4vqK3pA0';
  const TABELL = 'ArcadeScore', SPEL = 'bfrush';
  const VISA = 10;          // dagens topp 10
  const SPARA_PER_DAG = 200;

  const store = {
    get(k, f) { try { const v = localStorage.getItem(k); return v === null ? f : JSON.parse(v); } catch (e) { return f; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  const pad = n => String(n).padStart(2, '0');
  const datumText = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  let testDatum = null;   // testerna kan simulera ett annat datum
  const idag = () => testDatum || datumText(new Date());
  const dagNyckel = d => 'bfrush_dag_' + d;
  const sortera = l => l.sort((a, b) => b.poang - a.poang || a.tid - b.tid);

  const dagens = (d = idag()) => sortera(store.get(dagNyckel(d), []));
  const basta = () => sortera(store.get('bfrush_basta', []));
  const datumLista = () => store.get('bfrush_datum', []).slice().sort().reverse();

  // Vilken plats ett resultat skulle få på dagens lista (1–10), eller null om det inte räcker.
  function placering(poang) {
    if (!(poang > 0)) return null;
    const l = dagens();
    let i = l.findIndex(r => poang > r.poang);
    if (i < 0) i = l.length;
    return i < VISA ? i + 1 : null;
  }

  function laggTill({ namn, skola, poang, inriktning, monter }) {
    const d = idag();
    const post = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), namn, skola: skola || '', poang: Math.round(poang), inriktning, tid: Date.now(), datum: d };
    const l = dagens(d); l.push(post);
    store.set(dagNyckel(d), sortera(l).slice(0, SPARA_PER_DAG));
    const datum = store.get('bfrush_datum', []); if (!datum.includes(d)) { datum.push(d); store.set('bfrush_datum', datum); }
    store.set('bfrush_basta', sortera(basta().concat(post)).slice(0, VISA));
    // Till Supabase skickas bara smeknamn och poäng – skolan stannar i montern.
    koa({ game: SPEL, name: namn, score: post.poang, list: monter ? 'monter' : 'webb' });
    setTimeout(() => { try { parent !== window && parent.postMessage({ type: 'dlg-score-saved', game: SPEL }, '*'); } catch (e) {} }, 2500);   // spelsidan uppdaterar sin topplista
    return { post, plats: dagens(d).findIndex(r => r.id === post.id) + 1 };
  }

  function taBort(id, d = idag()) {
    store.set(dagNyckel(d), dagens(d).filter(r => r.id !== id));
    store.set('bfrush_basta', basta().filter(r => r.id !== id));
  }
  function nollstallDag(d = idag()) { store.set(dagNyckel(d), []); }
  // Tömmer alla dagars listor och bästa någonsin (kön till Supabase lämnas orörd).
  function nollstallAllt() {
    datumLista().forEach(d => { try { localStorage.removeItem(dagNyckel(d)); } catch (e) {} });
    store.set('bfrush_datum', []); store.set('bfrush_basta', []);
  }

  // CSV för Excel (semikolon och BOM så att å, ä och ö blir rätt)
  function csv(d = idag()) {
    const rad = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const inr = { fh: 'Fritid och hälsa', psa: 'Pedagogiskt och socialt arbete' };
    const rader = dagens(d).map((r, i) => [i + 1, r.namn, r.skola, r.poang, inr[r.inriktning] || '', new Date(r.tid).toLocaleTimeString('sv-SE')].map(rad).join(';'));
    return '﻿' + ['Plats', 'Namn', 'Skola', 'Poäng', 'Inriktning', 'Tid'].map(rad).join(';') + '\r\n' + rader.join('\r\n') + '\r\n';
  }

  /* ---------- fula ord ----------
     Texten normaliseras först: små bokstäver, 4→a, 0→o, 1→i, 3→e, 5→s, 7→t, @→a, $→s,
     å/ä→a, ö→o, bara bokstäver kvar och upprepade bokstäver slås ihop ("fuuuck" → "fuck"). */
  const ERSATT = { '4': 'a', '@': 'a', '0': 'o', '1': 'i', '!': 'i', '|': 'i', '3': 'e', '5': 's', '$': 's', '7': 't', '8': 'b', '9': 'g', 'å': 'a', 'ä': 'a', 'ö': 'o', 'é': 'e', 'ü': 'u' };
  function normalisera(t, mellanslag = false) {
    let s = String(t || '').toLowerCase().split('').map(ch => ERSATT[ch] || ch).join('');
    s = s.replace(mellanslag ? /[^a-z ]+/g : /[^a-z]+/g, mellanslag ? ' ' : '');
    return s.replace(/(.)\1+/g, '$1');
  }
  function arOk(t) {
    const I = window.BF_INNEHALL || {};
    const hel = normalisera(t), ord = normalisera(t, true).split(/\s+/).filter(Boolean);
    if ((I.fulaOrd || []).some(w => { const n = normalisera(w); return n && hel.includes(n); })) return false;
    if ((I.fulaOrdHela || []).some(w => { const n = normalisera(w); return ord.includes(n) || hel === n; })) return false;
    return true;
  }

  /* ---------- Supabase-kön ---------- */
  let skickar = false;
  function koa(rad) { const ko = store.get('bfrush_ko', []); ko.push(rad); store.set('bfrush_ko', ko); setTimeout(skickaKo, 200); }
  async function skickaKo() {
    if (skickar || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
    let ko = store.get('bfrush_ko', []);
    if (!ko.length) return;
    skickar = true;
    try {
      while (ko.length) {
        const rad = ko[0];
        const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timer = setTimeout(() => ctrl && ctrl.abort(), 6000);
        let res;
        try {
          res = await fetch(`${SUPABASE_URL}/rest/v1/${TABELL}`, {
            method: 'POST', signal: ctrl && ctrl.signal,
            headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
            body: JSON.stringify(rad)
          });
        } catch (e) { break; }               // inget nät – försök igen senare
        finally { clearTimeout(timer); }
        // Skickat, eller ett fel som aldrig går över (t.ex. 400) – ta bort raden så att kön inte fastnar.
        if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429)) {
          ko = store.get('bfrush_ko', []).slice(1); store.set('bfrush_ko', ko);
          if (!res.ok) B.koFel = (B.koFel || 0) + 1;
        } else break;
      }
    } finally { skickar = false; }
  }
  setInterval(skickaKo, 30000);
  addEventListener('online', skickaKo);
  setTimeout(skickaKo, 3000);

  B.Topp = {
    VISA, idag, dagens, basta, datumLista, placering, laggTill, taBort, nollstallDag, nollstallAllt, csv, arOk, normalisera,
    koLangd: () => store.get('bfrush_ko', []).length, skickaKo,
    sattTestDatum(d) { testDatum = d; }
  };
})();
