-- Topplista för spelet "Nästa ord" i DLG Arcade.
-- Kör en gång i Supabase: SQL Editor -> New query -> klistra in -> Run.

create table if not exists public."NastaOrdHighscore" (
  id         bigint generated always as identity primary key,
  name       text    not null check (char_length(name) between 1 and 20),
  score      integer not null check (score between 0 and 2000),
  created_at timestamptz not null default now()
);

alter table public."NastaOrdHighscore" enable row level security;

-- Alla får läsa topplistan och lägga till resultat, men ingen kan ändra eller ta bort via webben.
create policy "Alla kan läsa" on public."NastaOrdHighscore"
  for select to anon using (true);

create policy "Alla kan spara resultat" on public."NastaOrdHighscore"
  for insert to anon with check (true);
