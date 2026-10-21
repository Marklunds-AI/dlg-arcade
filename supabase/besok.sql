-- DLG Arcade: anonym besöksräknare (inga cookies, inga personuppgifter)
create table if not exists public."PageViews" (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  page text not null check (char_length(page) between 1 and 40),
  game text check (game is null or char_length(game) <= 30),
  device text check (device in ('mobil', 'surfplatta', 'dator'))
);
alter table public."PageViews" enable row level security;
-- Webbsidan får bara lägga till rader, aldrig läsa enskilda rader.
create policy "Sidan kan registrera besök" on public."PageViews" for insert to anon with check (true);

-- Sammanställning per dag, sida, spel och enhet (bara antal, inga enskilda besök).
create or replace view public."PageViewStats" as
  select (created_at at time zone 'Europe/Stockholm')::date as dag,
         page as sida, game as spel, device as enhet, count(*)::int as besok
  from public."PageViews"
  group by 1, 2, 3, 4;
grant select on public."PageViewStats" to anon;
