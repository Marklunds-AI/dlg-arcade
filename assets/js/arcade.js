/* DLG Arcade – gemensam logik för alla sidor.
   Nytt spel? Bygg det på assets/js/dlg-spel.js, lägg filen i /spel och en rad i TOOLS
   med table: 'ArcadeScore' och game: '<spelets id>'. Ingen ny tabell behövs. */

const SUPABASE_URL = 'https://yafkxfuveudkccjkkcto.supabase.co';
// Publik "anon"-nyckel – den får synas i webbläsaren. Skyddet ligger i tabellernas RLS-regler.
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhZmt4ZnV2ZXVka2NjamtrY3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMjgxNzMsImV4cCI6MjA5MTcwNDE3M30.yR26rgUwAouA9LV6MuXncOTsIiQvrhhe06o4vqK3pA0';

const TOOLS = [
  { id: 'nastaord', title: 'Nästa ord', short: 'Nästa ord', type: 'Spel', program: 'Alla program', isNew: true,
    href: 'spel/nasta-ord.html', table: 'NastaOrdHighscore', unit: '',
    bg: 'var(--lk-navy)', soft: 'var(--lk-sky)', time: '5 min',
    courses: ['AI-kunskap'],
    desc: 'Gissa vilket ord en AI skulle välja härnäst. Lär dig hur en språkmodell egentligen tänker – och varför den ibland hittar på.' },
  { id: 'racet', title: 'Begreppsracet', short: 'Begreppsracet', type: 'Spel', program: 'BF', isNew: false,
    href: 'spel/begreppsracet.html', table: 'Highscore', unit: ' m',
    bg: 'var(--lk-red)', soft: 'var(--lk-pink)', time: '1–10 min',
    courses: ['Hälsopedagogik', 'Fritidskunskap', 'Pedagogik'],
    desc: 'Kör banan och svara rätt på begreppen för att ta dig i mål.' },
  { id: 'snake', title: 'Begrepps-Snake Deluxe', short: 'Begrepps-Snake', type: 'Spel', program: 'BF', isNew: true,
    href: 'spel/begrepps-snake.html', table: 'SnakeHighscore', unit: '',
    bg: 'var(--lk-forest)', soft: 'var(--lk-mint)', time: '1–10 min',
    courses: ['Hälsopedagogik', 'Fritidskunskap', 'Pedagogik'],
    desc: 'Styr ormen till rätt svar och väx för varje begrepp du kan.' },
  { id: 'invaders', title: 'Begreppsinvaders', short: 'Begreppsinvaders', type: 'Spel', program: 'Alla program', isNew: true,
    href: 'spel/begreppsinvaders.html', table: 'ArcadeScore', game: 'invaders', unit: '',
    bg: 'var(--lk-slate)', soft: 'var(--lk-cream)', time: '2–10 min',
    courses: ['Hälsopedagogik', 'Fritidskunskap', 'AI-kunskap'],
    desc: 'Begreppen invaderar! Läs definitionen och skjut rätt begrepp innan formationen når marken.' },
  { id: 'slukaren', title: 'Begreppsslukaren', short: 'Begreppsslukaren', type: 'Spel', program: 'Alla program', isNew: true,
    href: 'spel/begreppsslukaren.html', table: 'ArcadeScore', game: 'slukaren', unit: '',
    bg: 'var(--lk-lavender)', soft: 'var(--lk-sky)', time: '5–10 min',
    courses: ['Hälsopedagogik', 'Fritidskunskap', 'Pedagogik', 'AI-kunskap'],
    desc: 'Ät rätt begrepp och väx! Spela mot bottar eller med hela klassen – läraren skapar ett rum och eleverna går med på mobilen.' }
];
const FEATURED_ID = 'nastaord';
const COURSES = ['AI-kunskap', 'Hälsopedagogik', 'Fritidskunskap', 'Pedagogik'];

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
  'graduation-cap': '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>'
};
const icon = (name, size = 20, color = 'currentColor') =>
  `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

/* ---------- sidhuvud och sidfot ---------- */
function renderChrome(active) {
  const file = location.pathname.split('/').pop() || 'index.html';
  const page = file.startsWith('spela') ? 'spela' : file.startsWith('verktyg') ? 'verktyg' : 'start';
  trackView(page, page === 'spela' ? (new URLSearchParams(location.search).get('spel') || FEATURED_ID) : null);
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
        <a href="verktyg.html" ${active === 'verktyg' ? 'aria-current="page"' : ''}>Alla verktyg</a>
        <span class="soon">${icon('graduation-cap', 18)}För lärare <span class="pill-dark">Snart</span></span>
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
function cardHTML(t, variant = 'start') {
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
  return `<a class="card" href="spela.html?spel=${t.id}" style="background:${t.bg}">
    ${ticks}
    <div class="label">${tags}
      <div class="title">${esc(t.title)}</div>
      <div class="desc">${esc(t.desc)}</div>${meta}
    </div>
    <div class="go">Spela ${icon('arrow-right', 22)}</div>
  </a>`;
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
