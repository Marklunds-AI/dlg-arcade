-- Lärarnas egna banor (lärarsidan larare.html).
-- Lärare loggar in med sitt Google-konto. Bara konton som slutar på @utb.lidkoping.se och som
-- loggat in via Google får skapa banor, och var och en kan bara ändra och ta bort sina egna.
-- En bana är antingen bara för den som har länken (publik = false) eller synlig i alla spel (publik = true).
-- Kör en gång i Supabase: SQL Editor -> New query -> klistra in -> Run. Filen går att köra igen.

create table if not exists public."ArcadeBana" (
  -- Slumpad kod, t.ex. l-3f9a1c7b2e. Den används i länkar (?bana=l-...) och går inte att gissa.
  id         text primary key default ('l-' || substr(md5(gen_random_uuid()::text), 1, 10)),
  namn       text not null check (char_length(namn) between 1 and 60),
  kurs       text not null check (char_length(kurs) between 1 and 40),
  sprak      text check (sprak is null or sprak in ('es-ES')),
  begrepp    jsonb not null check (
               jsonb_typeof(begrepp) = 'array'
               and jsonb_array_length(begrepp) between 4 and 200
               and octet_length(begrepp::text) <= 60000),
  publik     boolean not null default false,
  agare      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  skapad_av  text default (auth.jwt() -> 'user_metadata' ->> 'full_name'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists arcadebana_publik on public."ArcadeBana" (publik, kurs, namn);
create index if not exists arcadebana_agare on public."ArcadeBana" (agare);

-- Är den inloggade en lärare? Google-inloggning + skolans domän. Kontrolleras i databasen,
-- så det spelar ingen roll vad sidan i webbläsaren säger.
create or replace function public.ar_larare() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'provider', '') = 'google'
     and lower(coalesce(auth.jwt() ->> 'email', '')) like '%@utb.lidkoping.se'
$$;

create or replace function public.arcadebana_uppdaterad() returns trigger
language plpgsql set search_path = '' as $$ begin new.updated_at := now(); return new; end $$;
drop trigger if exists arcadebana_uppdaterad on public."ArcadeBana";
create trigger arcadebana_uppdaterad before update on public."ArcadeBana"
  for each row execute function public.arcadebana_uppdaterad();

alter table public."ArcadeBana" enable row level security;

drop policy if exists "Alla kan läsa publika banor" on public."ArcadeBana";
create policy "Alla kan läsa publika banor" on public."ArcadeBana"
  for select to anon, authenticated using (publik);

drop policy if exists "Läraren ser sina banor" on public."ArcadeBana";
create policy "Läraren ser sina banor" on public."ArcadeBana"
  for select to authenticated using (agare = auth.uid());

drop policy if exists "Lärare kan skapa banor" on public."ArcadeBana";
create policy "Lärare kan skapa banor" on public."ArcadeBana"
  for insert to authenticated with check (public.ar_larare() and agare = auth.uid());

drop policy if exists "Läraren ändrar sina banor" on public."ArcadeBana";
create policy "Läraren ändrar sina banor" on public."ArcadeBana"
  for update to authenticated using (agare = auth.uid() and public.ar_larare())
  with check (agare = auth.uid() and public.ar_larare());

drop policy if exists "Läraren tar bort sina banor" on public."ArcadeBana";
create policy "Läraren tar bort sina banor" on public."ArcadeBana"
  for delete to authenticated using (agare = auth.uid());

-- Kolumnrättigheter: ingen kan själv sätta id, agare eller skapad_av (de får sina standardvärden),
-- och ägarens användar-id lämnas aldrig ut.
revoke all on public."ArcadeBana" from anon, authenticated;
grant select (id, namn, kurs, sprak, begrepp, publik, skapad_av, created_at, updated_at)
  on public."ArcadeBana" to anon, authenticated;
grant insert (namn, kurs, sprak, begrepp, publik) on public."ArcadeBana" to authenticated;
grant update (namn, kurs, sprak, begrepp, publik) on public."ArcadeBana" to authenticated;
grant delete on public."ArcadeBana" to authenticated;

-- Banor som bara delas med länk hämtas en i taget med sin kod. Listan över dem går inte att läsa.
create or replace function public.hamta_bana(bana_id text)
returns table (id text, namn text, kurs text, sprak text, begrepp jsonb, publik boolean, skapad_av text)
language sql stable security definer set search_path = public as $$
  select b.id, b.namn, b.kurs, b.sprak, b.begrepp, b.publik, b.skapad_av
  from public."ArcadeBana" b where b.id = bana_id
$$;
revoke all on function public.hamta_bana(text) from public;
grant execute on function public.hamta_bana(text) to anon, authenticated;

-- Lärarens egna banor (lärarsidans lista "Dina banor"). Ägarkolumnen går inte att läsa direkt.
create or replace function public.mina_banor()
returns table (id text, namn text, kurs text, sprak text, begrepp jsonb, publik boolean, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select b.id, b.namn, b.kurs, b.sprak, b.begrepp, b.publik, b.updated_at
  from public."ArcadeBana" b where b.agare = auth.uid()
  order by b.updated_at desc
$$;
-- Supabase ger nya funktioner till anon som standard, så den rättigheten tas bort uttryckligen.
revoke all on function public.mina_banor() from public, anon;
grant execute on function public.mina_banor() to authenticated;
