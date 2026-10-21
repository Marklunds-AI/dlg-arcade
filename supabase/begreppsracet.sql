-- Topplista för spelet "Begreppsracet" i DLG Arcade (tabellen fanns redan innan detta skript).
-- Slår på RLS och lägger till samma sorts regler som de andra topplistorna har.
-- Kör en gång i Supabase: SQL Editor -> New query -> klistra in -> Run.

-- Rimliga gränser för namn och poäng. "not valid" betyder att reglerna gäller nya resultat,
-- men befintliga rader lämnas orörda (några gamla resultat ligger över gränsen).
alter table public."Highscore"
  add constraint highscore_name_len check (char_length(name) between 1 and 20) not valid,
  add constraint highscore_score_range check (score between 0 and 1000000) not valid;

alter table public."Highscore" enable row level security;

-- Alla får läsa topplistan och lägga till resultat, men ingen kan ändra eller ta bort via webben.
create policy "Alla kan läsa" on public."Highscore"
  for select to anon using (true);

create policy "Alla kan spara resultat" on public."Highscore"
  for insert to anon with check (true);

-- Extra spärr utöver RLS: webbens roller får inte ändra, radera eller tömma tabellen.
revoke update, delete, truncate on public."Highscore" from anon, authenticated;
