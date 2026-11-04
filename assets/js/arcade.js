/* DLG Arcade – gemensam logik för alla sidor.
   Nytt spel? Bygg det på assets/js/dlg-spel.js, lägg filen i /spel och en rad i TOOLS
   med table: 'ArcadeScore' och game: '<spelets id>'. Ingen ny tabell behövs.
   - added: dagens datum (ÅÅÅÅ-MM-DD). Spelet får märket "Nytt" i NEW_DAYS dagar och blir
     veckans spel den första veckan. Topplistan, filtren och lärarsidan hittar det själva.
   - banor: 'begrepp' eller 'sprak' om spelet använder banbanken (banor.js) och ?bana=&niva=. */

const SUPABASE_URL = 'https://yafkxfuveudkccjkkcto.supabase.co';
// Publik "anon"-nyckel – den får synas i webbläsaren. Skyddet ligger i tabellernas RLS-regler.
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhZmt4ZnV2ZXVka2NjamtrY3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMjgxNzMsImV4cCI6MjA5MTcwNDE3M30.yR26rgUwAouA9LV6MuXncOTsIiQvrhhe06o4vqK3pA0';

const TOOLS = [
  { id: 'nastaord', title: 'Nästa ord', short: 'Nästa ord', type: 'Spel', program: 'Alla program', added: '2026-10-21',
    href: 'spel/nasta-ord.html', table: 'NastaOrdHighscore', unit: '',
    bg: 'var(--lk-navy)', soft: 'var(--lk-sky)', time: '5 min',
    courses: ['AI-kunskap'],
    desc: 'Gissa vilket ord en AI skulle välja härnäst. Lär dig hur en språkmodell egentligen tänker – och varför den ibland hittar på.' },
  { id: 'racet', title: 'Begreppsracet', short: 'Begreppsracet', type: 'Spel', program: 'BF', added: '2026-10-21',
    href: 'spel/begreppsracet.html', table: 'Highscore', unit: ' m',
    bg: 'var(--lk-red)', soft: 'var(--lk-pink)', time: '1–10 min',
    courses: ['Hälsopedagogik', 'Fritidskunskap', 'Pedagogik'],
    desc: 'Kör banan och svara rätt på begreppen för att ta dig i mål.' },
  { id: 'snake', title: 'Begrepps-Snake Deluxe', short: 'Begrepps-Snake', type: 'Spel', program: 'BF', added: '2026-10-21',
    href: 'spel/begrepps-snake.html', table: 'SnakeHighscore', unit: '',
    bg: 'var(--lk-forest)', soft: 'var(--lk-mint)', time: '1–10 min',
    courses: ['Hälsopedagogik', 'Fritidskunskap', 'Pedagogik'],
    desc: 'Styr ormen till rätt svar och väx för varje begrepp du kan.' },
  { id: 'invaders', title: 'Begreppsinvaders', short: 'Begreppsinvaders', type: 'Spel', program: 'Alla program', added: '2026-10-25', banor: 'begrepp',
    href: 'spel/begreppsinvaders.html', table: 'ArcadeScore', game: 'invaders', unit: '',
    bg: 'var(--lk-slate)', soft: 'var(--lk-cream)', time: '2–10 min',
    courses: ['Hälsopedagogik', 'Fritidskunskap', 'AI-kunskap'],
    desc: 'Begreppen invaderar! Läs definitionen och skjut rätt begrepp innan formationen når marken.' },
  { id: 'slukaren', title: 'Begreppsslukaren', short: 'Begreppsslukaren', type: 'Spel', program: 'Alla program', added: '2026-10-25', banor: 'begrepp',
    href: 'spel/begreppsslukaren.html', table: 'ArcadeScore', game: 'slukaren', unit: '',
    bg: 'var(--lk-lavender)', soft: 'var(--lk-sky)', time: '5–10 min',
    courses: ['Hälsopedagogik', 'Fritidskunskap', 'Pedagogik', 'AI-kunskap'],
    desc: 'Ät rätt begrepp och väx! Spela mot bottar eller med hela klassen – läraren skapar ett rum och eleverna går med på mobilen.' },
  { id: 'bfrush', title: 'BF-Rush', short: 'BF-Rush', type: 'Spel', program: 'BF', added: '2026-11-02',
    href: 'spel/bf-rush/index.html', table: 'ArcadeScore', game: 'bfrush', unit: '',
    bg: '#FF6B3D', soft: '#FFE1D4', time: '1–5 min',
    courses: ['Pedagogik', 'Fritidskunskap', 'Hälsopedagogik'],
    desc: 'Spring dig igenom en vecka på Barn- och fritidsprogrammet! Hoppa och glid förbi hinder, hjälp barn längs vägen och välj rätt i situationerna – från APL till HELG!' },
  { id: 'habla', title: '¡Habla!', short: '¡Habla!', type: 'Spel', program: 'Alla program', added: '2026-11-04', banor: 'sprak',
    href: 'spel/habla.html', table: 'ArcadeScore', game: 'habla', unit: '',
    bg: '#7E2A2D', soft: 'var(--lk-cream)', time: '5–10 min',
    courses: ['Spanska', 'Franska', 'Tyska', 'Engelska', 'Moderna språk'],
    desc: 'Lyssna, läs, säg och skriv glosor på spanska, franska, tyska eller engelska. Mikrofonen kollar ditt uttal, spelet blir svårare ju bättre du blir – och var femte runda väntar en boss.' }
];
// Veckans spel väljs automatiskt (se featuredTool). Skriv ett id här för att låsa ett spel.
const FEATURED_ID = null;
const NEW_DAYS = 14;
const PROGRAMS = { BF: 'Barn- och fritid (BF)' };   // kortnamn → namnet i filtret
const TYPES = [...new Set(TOOLS.map(t => t.type))];
const COURSES = [...new Set(TOOLS.flatMap(t => t.courses))].sort((a, b) => a.localeCompare(b, 'sv'));

const daysSince = date => (Date.now() - new Date(date + 'T00:00:00')) / 864e5;
TOOLS.forEach(t => { t.isNew = daysSince(t.added) < NEW_DAYS; });

// Ett spel som lagts till den senaste veckan är veckans spel. Annars turas alla om, ett per vecka.
function featuredTool() {
  if (FEATURED_ID) return toolById(FEATURED_ID);
  const fresh = TOOLS.filter(t => daysSince(t.added) < 7).sort((a, b) => b.added.localeCompare(a.added));
  if (fresh.length) return fresh[0];
  const week = Math.floor((Date.now() / 864e5 + 3) / 7);   // byter på måndagar
  return TOOLS[week % TOOLS.length];
}

/* ---------- banor (banor.js + lärarnas banor) ----------
   Spel med banor: 'begrepp' visar banorna utan språk, banor: 'sprak' bara språkbanorna.
   SHARED_BANOR fylls av loadSharedBanor() med de publika banorna från lärarsidan. */
let SHARED_BANOR = [];
const banaFits = (t, b) => t.banor === 'sprak' ? !!b.sprak : !b.sprak;
const toolBanor = (t, extra = []) => !t.banor ? []
  : [...(window.DLG_BANOR || []), ...SHARED_BANOR, ...extra]
    .filter((b, i, all) => banaFits(t, b) && all.findIndex(x => x.id === b.id) === i);
let sharedLoading = null;
function loadSharedBanor() {
  return sharedLoading || (sharedLoading = fetch(`${SUPABASE_URL}/rest/v1/ArcadeBana?select=id,namn,kurs,sprak,begrepp,skapad_av&publik=eq.true&order=kurs,namn`,
    { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } })
    .then(r => r.ok ? r.json() : [])
    .then(rows => { SHARED_BANOR = rows.map(b => ({ ...b, sprak: b.sprak || undefined, delad: true })); return SHARED_BANOR; })
    .catch(() => SHARED_BANOR));
}
const playHref = (t, bana, niva) => 'spela.html?spel=' + t.id + (bana ? '&bana=' + encodeURIComponent(bana) : '') + (niva ? '&niva=' + niva : '');

/* ---------- små hjälpare ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const toolById = id => TOOLS.find(t => t.id === id);

const ICONS = {
  'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  'arrow-left': '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  'external-link': '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  'clock': '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  'search': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  'chevron-left': '<path d="m15 18-6-6 6-6"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  'pause': '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
  'play': '<polygon points="6 3 20 12 6 21 6 3"/>',
  'copy': '<rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  'graduation-cap': '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>'
};
const icon = (name, size = 20, color = 'currentColor') =>
  `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

/* ---------- sidhuvud och sidfot ---------- */
function renderChrome(active) {
  const file = location.pathname.split('/').pop() || 'index.html';
  const page = file.startsWith('spela') ? 'spela' : file.startsWith('verktyg') ? 'verktyg' : file.startsWith('larare') ? 'larare' : 'start';
  trackView(page, page === 'spela' ? (new URLSearchParams(location.search).get('spel') || featuredTool().id) : null);
  const header = $('#site-header');
  if (header) header.innerHTML = `
    <div class="wrap">
      <a class="brand" href="index.html" aria-label="DLG Arcade – till startsidan">
        <img src="assets/img/lidkoping-logo-vit.png" alt="Lidköpings kommun" width="113" height="38">
        <span class="divider"></span>
        <span class="name">DLG Arcade</span>
      </a>
      <nav class="nav" aria-label="Huvudmeny">
        <a href="index.html" ${active === 'start' ? 'aria-current="page"' : ''}>Start</a>
        <a href="verktyg.html" ${active === 'verktyg' ? 'aria-current="page"' : ''}>Alla spel</a>
        <a class="nav-teacher" href="larare.html" ${active === 'larare' ? 'aria-current="page"' : ''}>${icon('graduation-cap', 18)}För lärare</a>
      </nav>
    </div>`;
  const footer = $('#site-footer');
  if (footer) footer.innerHTML = `
    <svg class="wave" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
      <path fill="var(--lk-yellow)" d="M0 1000L0 1000C250 1000 250 200 500 200C750 200 750 1000 1000 1000L1000 1000Z"/>
    </svg>
    <footer class="site-footer">
      <div class="wrap">
        <div class="col">
          <span class="big">DLG Arcade</span>
          <span>De la Gardiegymnasiet, en del av Lidköpings kommun</span>
          <span class="proto-badge">Prototyp</span>
        </div>
        <div class="col">
          <b>Kontakt</b>
          <span>Samuel Marklund, yrkeslärare</span>
          <a href="mailto:samuel.marklund@utb.lidkoping.se">samuel.marklund@utb.lidkoping.se</a>
        </div>
      </div>
    </footer>`;
}

/* ---------- kort ---------- */
// hit = { bana, text } från sökningen på Alla spel: kortet länkar då direkt till banan.
function cardHTML(t, variant = 'start', hit = null) {
  const ticks = '<div class="ticks"><span></span><span></span><span></span><span></span></div>';
  const tags = `<div class="tags">
      <span class="tag" style="background:${t.soft}">${esc(t.type)}</span>
      ${variant === 'lib' ? `<span class="tag grey">${esc(t.program)}</span>` : ''}
      ${t.isNew ? '<span class="tag new">Nytt</span>' : ''}
    </div>`;
  const meta = variant === 'lib' ? `<div class="meta">
      <span>${icon('clock', 16)}${esc(t.time)}</span>
      <span>${icon('graduation-cap', 16)}${esc(t.courses.join(', '))}</span>
    </div>` : '';
  const hitHTML = hit ? `<div class="hit">${icon('search', 16)}<span>${esc(hit.text)}</span></div>` : '';
  return `<a class="card" href="${playHref(t, hit && hit.bana)}" style="background:${t.bg}">
    ${ticks}
    <div class="label">${tags}
      <div class="title">${esc(t.title)}</div>
      <div class="desc">${esc(t.desc)}</div>${hitHTML}${meta}
    </div>
    <div class="go">Spela ${icon('arrow-right', 22)}</div>
  </a>`;
}

/* ---------- rubriker som ska få plats ----------
   Krymper texten i varje element tills det längsta ordet ryms på en rad (minst min px).
   Körs igen när fönstrets storlek ändras. */
function fitText(sel, min = 18) {
  const run = () => document.querySelectorAll(sel).forEach(el => {
    el.style.fontSize = '';
    el.style.overflowWrap = 'normal';
    let size = parseFloat(getComputedStyle(el).fontSize);
    while (el.scrollWidth > el.clientWidth + 1 && size > min) el.style.fontSize = (size -= 1) + 'px';
    el.style.overflowWrap = '';
  });
  run();
  if (document.fonts) document.fonts.ready.then(run);
  if (!fitText.sels) {
    fitText.sels = new Map();
    let timer;
    addEventListener('resize', () => { clearTimeout(timer); timer = setTimeout(() => fitText.sels.forEach((m, s) => fitText(s, m)), 100); });
  }
  fitText.sels.set(sel, min);
}

/* ---------- topplistor (Supabase REST) ---------- */
async function fetchTop(tool, limit = 5) {
  // Spel i den gemensamma tabellen ArcadeScore filtreras på kolumnen game.
  const filter = tool.game ? `&game=eq.${encodeURIComponent(tool.game)}` : '';
  const url = `${SUPABASE_URL}/rest/v1/${tool.table}?select=name,score${filter}&order=score.desc&limit=${limit}`;
  const res = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return (await res.json()).map(r => ({ name: r.name, score: Number(r.score) || 0, tool }));
}

function rowsHTML(rows, showGame) {
  if (!rows.length) return '<div class="status">Inga resultat än – bli först!</div>';
  return rows.map((r, i) => `<div class="row">
      <span class="rank">${i + 1}</span>
      <span class="who"><b>${esc(r.name)}</b>${showGame ? `<small>${esc(r.tool.short)}</small>` : ''}</span>
      <span class="pts">${fmt(r.score)}${r.tool.unit}</span>
    </div>`).join('');
}

const statusHTML = msg => `<div class="status">${esc(msg)}</div>`;

/* ---------- anonym besöksräknare ----------
   Sparar bara sida, spel och enhetstyp. Inga cookies, inget ID, ingen IP i vår tabell. */
function trackView(page, game = null) {
  try {
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) || location.protocol === 'file:') return;
    const w = Math.min(screen.width, window.innerWidth || screen.width);
    const device = w < 600 ? 'mobil' : w < 1024 ? 'surfplatta' : 'dator';
    fetch(`${SUPABASE_URL}/rest/v1/PageViews`, {
      method: 'POST', keepalive: true,
      headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ page, game, device })
    }).catch(() => {});
  } catch (e) {}
}
