# DLG Arcade

Spelsajt för elever på De la Gardiegymnasiet, Lidköping. Här tränar eleverna ämnesbegrepp och AI-skicklighet genom korta spel med gemensamma topplistor.

**Status:** prototyp.

## Struktur

| Fil | Vad |
|---|---|
| `index.html` | Startsida med veckans spel, spelväljare och topplista |
| `verktyg.html` | Alla verktyg, med sök och filter |
| `spela.html?spel=<id>` | Spelsida: spelet i en ram, info och topplista |
| `spel/` | Själva spelen, en fristående HTML-fil per spel |
| `assets/js/arcade.js` | **Spelkatalogen (`TOOLS`)** och gemensam kod |
| `assets/css/arcade.css` | Utseende, byggt på Lidköpings kommuns designsystem |
| `supabase/` | SQL för topplistornas tabeller |

## Spelmotorn (nya spel)

Nya spel byggs på den gemensamma motorn. Den ger val av bana och nivå, egna banor, frågor, ljud, pekknappar, paus, resultatskärm med missade begrepp och topplista.

| Fil | Vad |
|---|---|
| `assets/js/banor.js` | **Banbanken.** Alla begreppsbanor, grupperade per kurs. Ny bana = ett nytt block här, så syns den i alla motorspel. |
| `assets/js/dlg-spel.js` | **Motorn** (`DLGSpel.start({...})`). Se kommentaren överst i filen. |
| `spel/begreppsinvaders.html` | Första spelet på motorn – använd det som mall. |
| `supabase/arcade-score.sql` | Den gemensamma topplistetabellen `ArcadeScore`. |

Länka direkt till en bana och nivå: `spel/begreppsinvaders.html?bana=salutogent&niva=latt`.

## Begreppsslukaren och klassrumsläget

Begreppsslukaren är ett ät-och-väx-spel (som agar.io). Frågan visas stort medan allt står still, sedan dyker svarsbitar upp på kartan. Rätt bit ger tillväxt och superkraft i 6 s, och med superkraft kan man slå loss 15 % av andras massa. Ingen kan åka ut.

| Fil | Vad |
|---|---|
| `spel/begreppsslukaren.html` | Fritt spel mot 9 bots, och elevsidan i klassrumsläget (`?rum=KOD`) |
| `spel/begreppsslukaren-larare.html` | Lärarens sida: skapa rum, lobby, tavlan och slutskärmen |
| `assets/js/slukaren.js` | Reglerna (`SL.REGLER` – alla siffror på ett ställe), bots, ritning och styrning |
| `assets/js/slukaren-natet.js` | Klassrummets nät |

### Så startar läraren ett rum

1. Öppna Begreppsslukaren och klicka **Lärare: skapa rum** (eller gå direkt till `spel/begreppsslukaren-larare.html`).
2. Välj bana (även egna banor från den här webbläsaren), när omgången ska sluta (antal frågor eller tid), sekunder per jakt och nivå. Nivån styr hur många felaktiga bitar det finns per rätt.
3. Visa skärmen på projektorn. Eleverna går till sajten → Begreppsslukaren → **Gå med i klassrum**, skriver koden (4 tecken), ett alias och väljer färg. De syns i lobbyn, och ✕ tar bort en spelare (t.ex. vid ett olämpligt alias).
4. Klicka **Starta spelet**. Under spelet kan du pausa och avsluta i förtid. Elever kan gå med även efter start.
5. Slutskärmen visar pallplatserna, flest rätt och klassens fem mest missade begrepp med definition. **Ny omgång med samma klass** behåller eleverna i rummet.

Lärarens flik måste vara öppen hela tiden – den kör spelet. Tappar en elev uppkopplingen (eller laddar om sidan) går hen med igen med samma alias och får tillbaka sin blobb. Klassrumsrundor sparas inte i topplistan.

### Tekniken

Lärarens webbläsare är värd och "sanningen": den kör reglerna 20 gånger/s och skickar en kompakt ögonblicksbild (cirka 0,6 kB) 10 gånger/s. Eleverna skickar bara sin styrriktning, cirka 10 gånger/s, och interpolerar mellan ögonblicksbilderna.

Supabases gratisplan tål **100 Realtime-meddelanden per sekund**. Varje broadcast räknas som 1 skickat plus 1 per mottagare. 30 elever i realtid över Broadcast skulle bli flera tusen per sekund. Därför:

- **Själva spelet går med WebRTC**, direkt mellan tavlan och varje elev. Det kostar inga Supabase-meddelanden.
- **Supabase Broadcast används bara för att hitta varandra.** Varje elev kostar ungefär 8 meddelanden för att gå med. Kanalerna är `slukaren:<KOD>` (inkorg, bara läraren lyssnar), `slukaren:<KOD>:<elev>` (elevens egen kanal) och `slukaren:<KOD>:ut` (reserv).
- **Reservläge:** Om skolnätet stoppar WebRTC går eleven automatiskt över till Broadcast i låg takt (cirka 1,5 bilder/s och styrning varannan sekund vid 30 elever). Det blir ryckigare men fungerar. Takten styrs av `BUDGET` i `slukaren-natet.js`.

Uppmätt med 30 elever (Playwright, lokalt):

| | Supabase-meddelanden |
|---|---|
| 30 elever går med (WebRTC) | cirka 240 totalt, utspritt medan de går med |
| Under spelet, alla via WebRTC | 0/s |
| Under spelet, alla 30 i reservläget (värsta fallet) | cirka 70/s (gränsen är 100/s) |

WebRTC använder Googles publika STUN-server för att hitta vägen mellan enheterna. Ingen speldata går via den. Presence används inte, eftersom gratisplanen bara tål 20 Presence-meddelanden/s.

### Justeringar mot den ursprungliga spelplanen

- **Farten** är `260 × (20/massa)^0,45` i stället för exakt 1/√massa, så att stora blobbar inte blir nästan orörliga.
- **Ett rätt svar per spelare och fråga.** Den som redan ätit rätt passerar resten av bitarna utan effekt, så att alla har en chans.
- **Superkraft** som finns kvar när jakten tar slut sparas till nästa jakt, eftersom allt står still under frysen.
- **Smulor:** max 5 per spelare på kartan, påfyllning 0,2 per spelare och sekund under jakten. I test (en hel omgång med bots) gav de cirka 15 % av tillväxten (taket är 25 %).
- **Bots** "läser" i 2,5–6 s innan de väljer en bit och kör med 70–92 % fart. Annars åt de upp alla rätta svar innan en människa hann reagera.
- **Antal felaktiga bitar per rätt:** Lätt 2, Normal 3, Hardcore 4.

## Lägga till ett spel

1. Kopiera `spel/begreppsinvaders.html`, byt `id` och skriv din spelmekanik i `starta(ctx)`.
2. Lägg till en rad i `TOOLS` i `assets/js/arcade.js` med `table: 'ArcadeScore'` och `game: '<spelets id>'`.
3. Klart – ingen ny tabell behövs. (Lägg gärna till ett poängtak för spelet i `supabase/arcade-score.sql`.)

Äldre spel (Begreppsracet, Begrepps-Snake, Nästa ord) har egna banor och egna tabeller tills de flyttas över.

## Topplistor

Topplistorna ligger i Supabase och hämtas via REST med den publika anon-nyckeln. Eleverna sparar resultat under ett **smeknamn**, inte under sitt riktiga namn, och det finns ingen inloggning. RLS-reglerna tillåter bara att resultat läses och läggs till.

| Spel | Tabell |
|---|---|
| Nästa ord | `NastaOrdHighscore` |
| Begreppsracet | `Highscore` |
| Begrepps-Snake Deluxe | `SnakeHighscore` |
| Begreppsinvaders, Begreppsslukaren och alla nya motorspel | `ArcadeScore` (kolumnen `game`) |

## Publicering

Sajten publiceras med GitHub Pages direkt från grenen `main`. Det finns inget byggsteg, så det räcker att pusha ändringarna.
