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

## Lägga till ett spel

1. Lägg spelfilen i `spel/`.
2. Lägg till en rad i `TOOLS` i `assets/js/arcade.js`. Raden behöver id, titel, beskrivning, kurser, färg och tabellnamn för topplistan.
3. Skapa topplistetabellen i Supabase. Använd `supabase/nasta-ord.sql` som mall.

## Topplistor

Topplistorna ligger i Supabase och hämtas via REST med den publika anon-nyckeln. Eleverna sparar resultat under ett **smeknamn**, inte under sitt riktiga namn, och det finns ingen inloggning. RLS-reglerna tillåter bara att resultat läses och läggs till.

| Spel | Tabell |
|---|---|
| Nästa ord | `NastaOrdHighscore` |
| Begreppsracet | `Highscore` |
| Begrepps-Snake Deluxe | `SnakeHighscore` |

## Publicering

Sajten publiceras med GitHub Pages direkt från grenen `main`. Det finns inget byggsteg, så det räcker att pusha ändringarna.
