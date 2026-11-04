# DLG Arcade

Spelsajt för elever på De la Gardiegymnasiet, Lidköping. Här tränar eleverna ämnesbegrepp och AI-skicklighet genom korta spel med gemensamma topplistor.

**Status:** prototyp.

## Struktur

| Fil | Vad |
|---|---|
| `index.html` | Startsida med veckans spel, spelväljare och topplista (bläddrar mellan spelen) |
| `verktyg.html` | Alla spel, med filter och sök – sökningen hittar även begrepp i banorna |
| `spela.html?spel=<id>` | Spelsida: spelet i en ram, info, banor och topplista. `&bana=<id>&niva=<latt/normal/hardcore>` skickas vidare till spelet |
| `larare.html` | För lärare: dela en bana med länk och QR-kod, klassrumsläget, alla banor, monterläget |
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

## ¡Habla! – spanska glosor och uttal

`spel/habla.html` tränar spanska glosor med fyra utmaningar som blandas: **Escucha** (lyssna och välj svensk betydelse), **Lee** (läs svenska och välj spanska), **Habla** (säg ordet, taligenkänningen jämför med svaret) och **Escribe** (lyssna och skriv). Var femte runda kommer bossrundan El Toro. Allt ljud kommer från webbläsarens Web Speech API, så det behövs inga ljudfiler eller API-nycklar.

- **Banor:** banorna med `sprak: 'es-ES'` i `banor.js` (kursen Spanska). Bara de banorna visas i ¡Habla!. Egna banor klistras in som `spanska ; svenska`, en glosa per rad.
- **Direktlänk:** `spel/habla.html?bana=es-comida&niva=latt`.
- **Taligenkänning** finns i Chrome och Edge. I Chrome skickas talet till Googles taltjänst medan eleven håller in knappen. Saknas taligenkänning (t.ex. Firefox) eller nekas mikrofonen blir Habla självbedömning. Testa det läget med `?mikrofon=av`.
- **Spansk röst:** spelet väljer en es-ES-röst och tar annars valfri spansk röst. Saknas spansk röst visas en varning på startskärmen.

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

## BF-Rush – monterspelet för Barn- och fritidsprogrammet

En endless runner där man springer igenom en vecka på BF: uppvärmning, måndag–fredag (svenska, planera, APL, matte och NK, idrott och hälsa, engelska, friluftsliv, genomföra, utvärdera) och sedan HELG!. Därefter börjar vecka 2 i högre fart. Spelet är byggt för montern och fungerar helt utan nät.

Allt som hör till spelet ligger i en egen mapp, så att hela mappen kan kopieras till en annan dator:

| Fil | Vad |
|---|---|
| `spel/bf-rush/index.html` | Spelet |
| `spel/bf-rush/bf-rush-innehall.js` | **Alla texter**: schemat, frågor, situationer, skyltar, titlar, fula ord |
| `spel/bf-rush/js/spel.js` | Spelet. **`CONFIG` överst** har alla siffror (fart, hopp, poäng, läspauser, PIN, QR-adress) |
| `spel/bf-rush/js/grafik.js`, `miljoer.js` | Figurer, föremål och de åtta miljöerna (allt ritas med kod) |
| `spel/bf-rush/js/topplista.js` | Lokal topplista och kön till Supabase |
| `spel/bf-rush/js/personal.js` | Personalmenyn |
| `spel/bf-rush/js/qr.js` | QR-kod utan externa bibliotek |
| `spel/bf-rush/img/`, `fonts/` | BF-loggan och typsnitten (Nunito och Inter) |

### Starta monterläget

1. Öppna `spel/bf-rush/index.html?monter=1`, antingen från sajten (`https://<sajten>/spel/bf-rush/index.html?monter=1`) eller lokalt genom att dubbelklicka på `spel/bf-rush/index.html` och lägga till `?monter=1` sist i adressen.
2. Tryck **F** (eller helskärmsknappen uppe till höger) för helskärm.
3. Tryck en gång på tangentbordet eller skärmen innan besökarna börjar, så att ljudet startar. Chrome tillåter inte ljud förrän någon har tryckt. Med handkontroll räcker det inte, så starta hellre Chrome med `--autoplay-policy=no-user-gesture-required` (och gärna `--kiosk`).

I monterläget visas dagens topp 10 på startskärmen. Efter 25 s utan aktivitet rullar attract mode (topplistan → en demo där figuren spelar själv → "Vad är BF?"). Valfri knapp startar ett nytt spel.

Styrning: hoppa = mellanslag/↑/W, övre halvan av skärmen eller A på handkontrollen (håll inne = högre, tryck igen = dubbelhopp). Glida = ↓/S, nedre halvan eller B. Paus = P/Esc, pausknappen eller Start. I pausmenyn finns **Till start**. M = ljud av/på.

### Personalmenyn

Håll nere **övre vänstra hörnet i 3 sekunder** eller tryck **Ctrl+Shift+B** (⌘+Shift+B på Mac). Du kan också lägga till `?personal=1` i adressen, till exempel `spel/bf-rush/index.html?monter=1&personal=1`. PIN-koden är **2468** (ändras i `CONFIG.personalPin`). I menyn kan du:

- **ta bort ett enskilt resultat** (t.ex. ett olämpligt namn) från dagens lista eller Bästa någonsin
- **exportera listan som CSV**. Den öppnas rätt i Excel och har med namn, skola, poäng, inriktning och tid, så att ni hittar vinnaren. Välj datum i listan för att exportera en tidigare dag.
- **nollställa dagens lista**
- slå av och på ljud och musik, ändra svårighetsgraden (0,8–1,2) och visa FPS
- se hur många resultat som väntar på att skickas till Supabase, och skicka dem direkt

Borttagna resultat försvinner bara i montern. I Supabase tar du bort dem i Table Editor (tabellen `ArcadeScore`, `game = 'bfrush'`).

### Topplistan

Resultaten sparas i webbläsaren (localStorage), en lista per datum, så dagens lista byts automatiskt vid midnatt och historiken finns kvar. Finns nätet skickas namnet och poängen också till `ArcadeScore` (`game: 'bfrush'`, `list: 'monter'` eller `'webb'`). Skolan skickas inte, den stannar i montern. Saknas nätet ligger resultatet i en kö och skickas när nätet kommer tillbaka.

Topplistan finns i den webbläsare där spelet körs. Använd därför samma dator och webbläsare under hela dagen, och samma adress (filen eller sajten), eftersom de räknas som olika ställen.

### Ändra texterna

Alla texter ligger i `spel/bf-rush/bf-rush-innehall.js`. Läs instruktionen överst i filen. Spara och ladda om spelet (F5).

- **Situationer** (`situationer`): `text`, `ratt`, `fel`, `forklaring` (visas om man väljer fel) och `miljoer` (var situationen kan dyka upp: `forskola`, `fritidsgard`, `idrott`, `skog`, `evenemang`, `planering` eller `apl` för båda APL-miljöerna).
- **Snabbfrågor** (`fragor`): `amne` (Svenska, Matte, Naturkunskap eller Engelska), `fraga`, `ratt`, `fel`, `forklaring`.
- **Utvärdering** (`utvardering`): som situationerna, utan miljöer.
- **Schemat** (`schema`): passens titlar, temat som visas i läspausen (`skylt`) och texten på tavlan.
- **Fula ord** (`fulaOrd`, `fulaOrdHela`): ord som stoppas i namnen.

Spelet väljer alltid den fråga som visades för längst sedan, så ju fler frågor, desto mer variation.

### QR-koden

Skriv adressen till programsidan i `CONFIG.qrAdress` i `spel/bf-rush/js/spel.js`. Koden ritas av spelet självt och syns på slutskärmen och på "Vad är BF?". Lämnas adressen tom visas ingen QR-kod.

### Justera svårighetsgraden

De viktigaste siffrorna i `CONFIG`: `fart.vecka1` (farten måndag–fredag), `fart.veckaStart` (vecka 2 och 3), `bana.luckaPerDag` och `bana.luckaMinst` (hur tätt hindren kommer), `uppvarmning` (lugn start), `vagval.lasTid` (läspausen), `hopp` (hopphöjd) och `titelGranser` (titlarna på slutskärmen).

## Lägga till ett spel

1. Kopiera `spel/begreppsinvaders.html`, byt `id` och skriv din spelmekanik i `starta(ctx)`.
2. Lägg till en rad i `TOOLS` i `assets/js/arcade.js` med `table: 'ArcadeScore'`, `game: '<spelets id>'`, `added: '<dagens datum>'` och `banor: 'begrepp'` (eller `'sprak'` för språkbanor).
3. Klart – ingen ny tabell behövs. (Lägg gärna till ett poängtak för spelet i `supabase/arcade-score.sql`.)

Resten sköter sig självt:

- **Nytt:** spelet får märket i 14 dagar efter `added` (`NEW_DAYS`).
- **Veckans spel:** ett spel som lagts till den senaste veckan blir veckans spel. Annars turas alla spel om, ett per vecka (byte på måndagar). Vill du låsa ett spel skriver du dess id i `FEATURED_ID`.
- **Topplistan** på startsidan, filtren (typ, ämne, program) och lärarsidan läser från `TOOLS`. Typfilter visas bara när det finns mer än en typ. Program får ett längre namn i `PROGRAMS`.

Äldre spel (Begreppsracet, Begrepps-Snake, Nästa ord) har egna banor och egna tabeller tills de flyttas över.

## Topplistor

Topplistorna ligger i Supabase och hämtas via REST med den publika anon-nyckeln. Eleverna sparar resultat under ett **smeknamn**, inte under sitt riktiga namn, och det finns ingen inloggning. RLS-reglerna tillåter bara att resultat läses och läggs till.

| Spel | Tabell |
|---|---|
| Nästa ord | `NastaOrdHighscore` |
| Begreppsracet | `Highscore` |
| Begrepps-Snake Deluxe | `SnakeHighscore` |
| Begreppsinvaders, Begreppsslukaren, BF-Rush, ¡Habla! och alla nya motorspel | `ArcadeScore` (kolumnen `game`) |

## Publicering

Sajten publiceras med GitHub Pages direkt från grenen `main`. Det finns inget byggsteg, så det räcker att pusha ändringarna.
