-- Topplista för Begrepps-Snake Deluxe i DLG Arcade.
-- Kör en gång i Supabase: SQL Editor -> New query -> klistra in -> Run.

create table if not exists public."SnakeHighscore" (
  id         bigint generated always as identity primary key,
  name       text    not null check (char_length(name) between 1 and 30),
  score      integer not null check (score between 0 and 100000),
  list       text,
  difficulty text,
  created_at timestamptz not null default now()
);

alter table public."SnakeHighscore" enable row level security;

create policy "Alla kan läsa" on public."SnakeHighscore"
  for select to anon using (true);

create policy "Alla kan spara resultat" on public."SnakeHighscore"
  for insert to anon with check (true);
