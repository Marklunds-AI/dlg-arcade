-- Gemensam topplista för alla spel som byggs på spelmotorn (assets/js/dlg-spel.js).
-- Ett nytt spel behöver INGEN ny tabell – det sparar med sin egen "game"-nyckel.
-- Kör en gång i Supabase: SQL Editor -> New query -> klistra in -> Run.

create table if not exists public."ArcadeScore" (
  id         bigint generated always as identity primary key,
  game       text    not null check (game ~ '^[a-z0-9-]{2,30}$'),
  name       text    not null check (char_length(name) between 1 and 30),
  score      integer not null check (score between 0 and 1000000),
  list       text    check (char_length(list) <= 60),
  difficulty text    check (difficulty in ('latt', 'normal', 'hardcore')),
  created_at timestamptz not null default now()
);

create index if not exists arcadescore_topp
  on public."ArcadeScore" (game, list, difficulty, score desc);

alter table public."ArcadeScore" enable row level security;

create policy "Alla kan läsa" on public."ArcadeScore"
  for select to anon using (true);

create policy "Alla kan spara resultat" on public."ArcadeScore"
  for insert to anon with check (true);

-- Extra spärr utöver RLS: webbens roller får inte ändra, radera eller tömma tabellen.
revoke update, delete, truncate on public."ArcadeScore" from anon, authenticated;

-- Poängtak per spel (spelen kapar också själva i webbläsaren):
alter table public."ArcadeScore" add constraint arcadescore_tak check (
  case game
    when 'invaders' then score <= 250000
    when 'slukaren' then score <= 100000
    else true
  end
);
