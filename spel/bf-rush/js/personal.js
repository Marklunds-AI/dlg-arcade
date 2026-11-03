/* BF-Rush – personalmenyn (dold).
   Öppnas genom att hålla nere övre vänstra hörnet i 3 s eller med Ctrl+Shift+B. Kräver PIN (CONFIG.personalPin).
   Här kan personalen ta bort enskilda namn, nollställa dagens lista, exportera listan som CSV,
   stänga av ljudet, ändra svårighetsgraden och visa FPS. */
(function () {
  'use strict';

  const CSS = `
.bfp{position:fixed;inset:0;z-index:50;background:rgba(10,12,26,.88);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:24px 14px;
  font-family:"Inter",Arial,sans-serif;color:#fff;touch-action:auto;user-select:text;-webkit-user-select:text}
.bfp *{box-sizing:border-box}
.bfp-panel{width:min(860px,100%);background:#14141c;border:4px solid #fff;border-radius:28px;padding:24px;display:flex;flex-direction:column;gap:18px;margin:auto 0}
.bfp h1{margin:0;font:900 34px/1.1 "Nunito",Arial,sans-serif}
.bfp h2{margin:0;font:900 22px/1.2 "Nunito",Arial,sans-serif;color:#FFD23F}
.bfp p,.bfp small{margin:0;color:#C9CDEA}
.bfp button,.bfp select{font:700 17px "Inter",Arial,sans-serif;border-radius:12px;border:2px solid #fff;background:transparent;color:#fff;padding:10px 16px;cursor:pointer}
.bfp button.fyll{background:#FFD23F;border-color:#FFD23F;color:#14141c}
.bfp button.fara{border-color:#FF5A5F;color:#FF5A5F}
.bfp button:focus-visible,.bfp select:focus-visible,.bfp input:focus-visible{outline:3px solid #FFD23F;outline-offset:2px}
.bfp .rad{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.bfp .sekt{display:flex;flex-direction:column;gap:10px;padding-top:14px;border-top:1px solid #3a3a47}
.bfp table{width:100%;border-collapse:collapse;font-size:16px}
.bfp td,.bfp th{text-align:left;padding:6px 8px;border-bottom:1px solid #2c2c38}
.bfp th{color:#C9CDEA;font-weight:600}
.bfp td.p{text-align:right;font-variant-numeric:tabular-nums;font-weight:800}
.bfp td button{padding:4px 10px;font-size:14px}
.bfp .pin{font:900 46px "Nunito",Arial,sans-serif;letter-spacing:.3em;text-align:center;min-height:56px}
.bfp .knappsats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-width:360px;margin:0 auto;width:100%}
.bfp .knappsats button{font-size:28px;padding:16px 0}
.bfp input[type=range]{width:240px}
.bfp .fel{color:#FF5A5F;font-weight:700;min-height:22px;text-align:center}
`;
  let rot = null, api = null;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  function stil() {
    if (document.getElementById('bfp-stil')) return;
    const st = document.createElement('style'); st.id = 'bfp-stil'; st.textContent = CSS; document.head.appendChild(st);
  }
  function stang() {
    if (rot) { rot.remove(); rot = null; }
    removeEventListener('keydown', tangent, true);
    if (api) api.stang();
  }
  function tangent(e) {
    if (!rot) return;
    if (e.key === 'Escape') { e.preventDefault(); stang(); return; }
    const pin = rot.querySelector('.pin');
    if (pin && /^[0-9]$/.test(e.key)) { e.preventDefault(); siffra(e.key); }
    else if (pin && e.key === 'Backspace') { e.preventDefault(); siffra('⌫'); }
    else if (pin && e.key === 'Enter') { e.preventDefault(); siffra('OK'); }
  }

  /* ---------- PIN ---------- */
  let inmatat = '';
  function visaPin() {
    inmatat = '';
    rot.innerHTML = `<div class="bfp-panel" role="dialog" aria-label="Personalmeny">
      <h1>Personalmeny</h1><p>Skriv PIN-koden.</p>
      <div class="pin" aria-live="polite"></div><div class="fel"></div>
      <div class="knappsats">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OK'].map(k => `<button data-k="${k}" ${k === 'OK' ? 'class="fyll"' : ''}>${k}</button>`).join('')}</div>
      <div class="rad" style="justify-content:center"><button data-stang>Avbryt</button></div></div>`;
    rot.querySelectorAll('[data-k]').forEach(b => b.onclick = () => siffra(b.dataset.k));
    rot.querySelector('[data-stang]').onclick = stang;
  }
  function siffra(k) {
    const fel = rot.querySelector('.fel');
    if (k === '⌫') inmatat = inmatat.slice(0, -1);
    else if (k === 'OK') {
      if (inmatat === String(api.CONFIG.personalPin)) return visaMeny();
      inmatat = ''; fel.textContent = 'Fel PIN-kod';
    } else if (inmatat.length < 8) { inmatat += k; fel.textContent = ''; }
    rot.querySelector('.pin').textContent = '•'.repeat(inmatat.length) || ' ';
  }

  /* ---------- menyn ---------- */
  function visaMeny(datum) {
    const T = api.Topp, idag = T.idag();
    datum = datum || idag;
    const lista = T.dagens(datum), basta = T.basta();
    const datumVal = [idag, ...T.datumLista().filter(d => d !== idag)];
    const inr = { fh: 'FH', psa: 'PSA' };
    const tabell = (rader, d) => rader.length ? `<table><thead><tr><th>#</th><th>Namn</th><th>Skola</th><th>Inr.</th><th style="text-align:right">Poäng</th><th></th></tr></thead><tbody>${
      rader.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.namn)}</td><td>${esc(r.skola)}</td><td>${inr[r.inriktning] || ''}</td><td class="p">${fmt(r.poang)}</td><td><button class="fara" data-bort="${esc(r.id)}" data-datum="${esc(d || r.datum)}">Ta bort</button></td></tr>`).join('')
    }</tbody></table>` : '<p>Inga resultat.</p>';
    rot.innerHTML = `<div class="bfp-panel" role="dialog" aria-label="Personalmeny">
      <div class="rad" style="justify-content:space-between"><h1>Personalmeny</h1><button class="fyll" data-stang>Stäng</button></div>

      <div class="sekt">
        <div class="rad" style="justify-content:space-between">
          <h2>Topplistan ${datum === idag ? '(i dag)' : esc(datum)}</h2>
          <select data-datum-val aria-label="Välj datum">${datumVal.map(d => `<option value="${esc(d)}" ${d === datum ? 'selected' : ''}>${d === idag ? 'I dag' : esc(d)}</option>`).join('')}</select>
        </div>
        ${tabell(lista, datum)}
        <div class="rad"><button data-csv>Exportera CSV</button>${datum === idag ? '<button class="fara" data-nollstall>Nollställ dagens lista</button>' : ''}</div>
        <small>Borttagna namn försvinner bara här i montern. I Supabase tar du bort dem i Table Editor (tabellen ArcadeScore).</small>
      </div>

      <div class="sekt"><h2>Bästa någonsin</h2>${tabell(basta, null)}
        <div class="rad"><button class="fara" data-nollstall-allt>Töm alla listor</button></div>
        <small>Tömmer dagens lista, alla tidigare dagar och bästa någonsin här i webbläsaren.</small>
      </div>

      <div class="sekt"><h2>Inställningar</h2>
        <div class="rad"><button data-ljud>Ljud: ${api.ljudPa() ? 'PÅ' : 'AV'}</button><button data-musik>Musik: ${api.musikPa() ? 'PÅ' : 'AV'}</button><button data-fps>FPS: ${api.CONFIG.visaFps ? 'visas' : 'dold'}</button></div>
        <div class="rad"><label for="bfp-sv">Svårighet</label><input id="bfp-sv" type="range" min="0.8" max="1.2" step="0.05" value="${api.CONFIG.svarighet}"><b data-svv>${api.CONFIG.svarighet.toFixed(2)}</b><small>(påverkar farten, 1,00 = normal)</small></div>
      </div>

      <div class="sekt"><h2>Supabase</h2>
        <div class="rad"><p>Resultat som väntar på att skickas: <b data-ko>${T.koLangd()}</b></p><button data-skicka>Skicka nu</button></div>
        <small>Saknas nätet ligger resultaten kvar här och skickas automatiskt när nätet kommer tillbaka.</small>
      </div>
    </div>`;
    const $ = s => rot.querySelector(s);
    $('[data-stang]').onclick = stang;
    $('[data-datum-val]').onchange = e => visaMeny(e.target.value);
    rot.querySelectorAll('[data-bort]').forEach(b => b.onclick = () => {
      if (!confirm('Ta bort det här resultatet?')) return;
      T.taBort(b.dataset.bort, b.dataset.datum); visaMeny(datum);
    });
    const nollstall = $('[data-nollstall]');
    if (nollstall) nollstall.onclick = () => { if (confirm('Nollställa hela dagens lista? Det går inte att ångra.')) { T.nollstallDag(); visaMeny(datum); } };
    $('[data-nollstall-allt]').onclick = () => { if (confirm('Tömma ALLA listor, även bästa någonsin? Det går inte att ångra.')) { T.nollstallAllt(); visaMeny(idag); } };
    $('[data-csv]').onclick = () => {
      const blob = new Blob([T.csv(datum)], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `bf-rush-${datum}.csv`;
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    };
    $('[data-ljud]').onclick = () => { api.vaxlaLjud(); visaMeny(datum); };
    $('[data-musik]').onclick = () => { api.vaxlaMusik(); visaMeny(datum); };
    $('[data-fps]').onclick = () => { api.sattFps(!api.CONFIG.visaFps); visaMeny(datum); };
    $('#bfp-sv').oninput = e => { const v = Number(e.target.value); api.sattSvarighet(v); $('[data-svv]').textContent = v.toFixed(2); };
    $('[data-skicka]').onclick = async () => { await T.skickaKo(); $('[data-ko]').textContent = T.koLangd(); };
  }

  window.BFPersonal = {
    oppna(a) {
      api = a; stil();
      rot = document.createElement('div'); rot.className = 'bfp';
      document.body.appendChild(rot);
      addEventListener('keydown', tangent, true);
      visaPin();
    }
  };
})();
