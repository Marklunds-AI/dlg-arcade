/* BF-Rush – alla texter i spelet.
   ================================================================
   Den här filen kan du ändra utan att röra spelkoden.

   Tänk på:
   - Varje rad står inom 'enkla citattecken'. Vill du skriva ' i en text, skriv \' i stället.
   - Varje post slutar med ett kommatecken, utom ibland den sista. Glöm inte kommatecknet om du lägger till en rad.
   - Håll texterna korta. Vägvalen ska gå att läsa på 2–3 meters avstånd medan man springer.
   - Spara filen och ladda om spelet (F5) för att se ändringen.

   Miljöer (används i "miljoer" nedan):
     klassrum, labb, planering, forskola, fritidsgard, idrott, skog, evenemang
   'apl' betyder "båda APL-miljöerna" (förskolan och fritidsgården).
   ================================================================ */
window.BF_INNEHALL = {

  /* ---------- De två inriktningarna ---------- */
  inriktningar: {
    fh: {
      namn: 'Fritid och hälsa',
      kort: 'Fritid och hälsa',
      apl: 'fritidsgard',                       // miljön på tisdagens APL
      aplNamn: 'Fritidsgården',
      evenemang: 'Turnering på fritidsgården',  // fredagens evenemang
      yrken: ['Fritidsledare', 'Tränare', 'Instruktör', 'Personlig assistent'],
      pitch: 'Leda aktiviteter, träning och hälsa för barn, unga och vuxna'
    },
    psa: {
      namn: 'Pedagogiskt och socialt arbete',
      kort: 'Pedagogiskt och socialt',
      apl: 'forskola',
      aplNamn: 'Förskolan',
      evenemang: 'Idrottsdag med förskolebarn',
      yrken: ['Barnskötare', 'Elevassistent', 'Personlig assistent', 'Stödassistent'],
      pitch: 'Stötta barns lärande, lek och utveckling i förskola och skola'
    }
  },

  // Pausmenyn
  paus: { rubrik: 'PAUS', fortsatt: '▶ FORTSÄTT', tillStart: '⌂ TILL START', hjalp: 'Pil upp/ner väljer · Mellanslag eller A bekräftar · P eller Esc fortsätter' },

  // Uppvärmningen innan måndagen (bara i vecka 1)
  uppvarmning: { hud: 'UPPVÄRMNING', banderoll: 'TESTA: HOPPA OCH GLID!' },
  nasta: 'Nästa:',              // skylten på dörren mellan två pass

  dagar: ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag'],
  dagKort: ['MÅN', 'TIS', 'ONS', 'TOR', 'FRE'],
  veckoremsa: ['M', 'T', 'O', 'T', 'F'],
  pass: { fm: 'Förmiddag', em: 'Eftermiddag' },
  passKort: { fm: 'FM', em: 'EM' },

  /* ---------- Veckan: tio pass, måndag–fredag (samma ordning varje vecka, farten ökar) ----------
     moment   = vad som bockas av på slutskärmen ("Det här hann du med på BF")
     miljo    = miljön. 'apl' = förskolan eller fritidsgården, beroende på inriktning
     vagval   = situation (vad gör en bra barnskötare/fritidsledare?), fraga (snabbfråga) eller utvardering
     amnen    = vilka ämnen snabbfrågorna hämtas från
     tavla    = det som står på tavlan i bakgrunden
     skylt    = passets tema, visas överst i läspausen före passets första fråga. { fh: ..., psa: ... } = olika per inriktning
     under    = extra rad (används inte i spelet just nu)
     typ      = planera / genomfora / utvardera (styr specialreglerna)
  */
  schema: [
    { moment: 'svenska', titel: 'Svenska', miljo: 'klassrum', vagval: 'fraga', amnen: ['Svenska'],
      tavla: 'Läs högt · Skriv tydligt · Informera',
      skylt: 'Svenska – du skriver planeringar, informerar föräldrar och läser högt för barn', under: 'Gymnasiegemensamt ämne' },
    { moment: 'planera', titel: 'Planera', miljo: 'planering', vagval: 'situation', typ: 'planera',
      tavla: 'PLANERA → genomföra → utvärdera',
      skylt: 'Planera fredagens evenemang – samla Syfte, Material, Säkerhet och Tidsplan!', under: 'Karaktärsämne: planera, leda och pedagogik' },
    { moment: 'apl', titel: 'APL', miljo: 'apl', vagval: 'situation',
      skylt: { fh: 'APL på fritidsgården – så jobbar en fritidsledare', psa: 'APL på förskolan – så jobbar en barnskötare' },
      under: { fh: 'Inriktning: Fritid och hälsa', psa: 'Inriktning: Pedagogiskt och socialt arbete' } },
    { moment: 'apl', titel: 'APL', miljo: 'apl', vagval: 'situation',
      skylt: { fh: 'APL fortsätter – fritidsledaren håller i aktiviteterna', psa: 'APL fortsätter – barnskötaren leder samlingen' },
      under: 'Arbetsplatsförlagt lärande – du lär dig yrket på riktigt' },
    { moment: 'matnk', titel: 'Matte och NK', miljo: 'labb', vagval: 'fraga', amnen: ['Matte', 'Naturkunskap'],
      tavla: '10 barn × 30 kr = 300 kr',
      skylt: 'Matte och naturkunskap – budget, scheman, gruppindelning och kroppen', under: 'Gymnasiegemensamma ämnen' },
    { moment: 'idrott', titel: 'Idrott och hälsa', miljo: 'idrott', vagval: 'situation',
      skylt: 'Idrott och hälsa – grunden för att bli tränare och instruktör', under: 'Gymnasiegemensamt ämne' },
    { moment: 'engelska', titel: 'Engelska', miljo: 'klassrum', vagval: 'fraga', amnen: ['Engelska'],
      tavla: 'Hello! · Let\'s play! · Well done!',
      skylt: 'Engelska – du möter barn och familjer från hela världen', under: 'Gymnasiegemensamt ämne' },
    { moment: 'friluftsliv', titel: 'Friluftsliv', miljo: 'skog', vagval: 'situation', skymning: true,
      skylt: 'Friluftsliv – leda grupper ute i naturen', under: 'Passet slutar vid lägerelden' },
    { moment: 'evenemang', titel: 'Genomföra', miljo: 'evenemang', vagval: 'situation', typ: 'genomfora',
      skylt: { fh: 'Genomföra – turnering på fritidsgården!', psa: 'Genomföra – idrottsdag med förskolebarnen!' },
      under: 'Nu leder ni – och planeringen märks' },
    { moment: 'utvardering', titel: 'Utvärdera', miljo: 'planering', vagval: 'utvardering', typ: 'utvardera',
      tavla: 'planera → genomföra → UTVÄRDERA',
      skylt: 'Utvärdera – vad gick bra och vad gör vi bättre nästa gång?', under: 'Karaktärsämne' }
  ],

  // Kort namn i HUD:en, t.ex. "TIS · FM · APL – Förskolan"
  miljoNamn: {
    klassrum: 'Klassrummet', labb: 'Labbet', planering: 'Planeringsrummet', forskola: 'Förskolan',
    fritidsgard: 'Fritidsgården', idrott: 'Idrottshallen', skog: 'Skogen', evenemang: 'Evenemanget'
  },

  // Det här bockas av på slutskärmen
  moment: {
    svenska: 'Svenska', planera: 'Planera', apl: 'APL', matnk: 'Matte och naturkunskap', idrott: 'Idrott och hälsa',
    engelska: 'Engelska', friluftsliv: 'Friluftsliv', evenemang: 'Evenemanget', utvardering: 'Utvärdering'
  },

  /* ---------- Situationer: vad gör en bra barnskötare eller fritidsledare? ----------
     forklaring visas om man väljer fel: rätt svar och varför, i en rad. */
  situationer: [
    { text: 'Ett barn har ramlat och gråter', ratt: 'Trösta och kolla om hen gjort sig illa', fel: '"Det där gör inte ont"',
      forklaring: 'Trösta först – barnet ska känna sig sett och tryggt.', miljoer: ['forskola', 'idrott', 'skog', 'evenemang'] },
    { text: 'En elev står alltid ensam på rasten', ratt: 'Bjud in till leken', fel: 'Låt hen vara',
      forklaring: 'Bjud in – alla ska få vara med.', miljoer: ['forskola', 'fritidsgard', 'evenemang'] },
    { text: 'Två barn bråkar om en boll', ratt: 'Hjälp dem att turas om', fel: 'Ta bollen och gå',
      forklaring: 'Hjälp dem turas om – så lär de sig lösa konflikter.', miljoer: ['forskola', 'idrott', 'evenemang'] },
    { text: 'En ny deltagare på träningen är nervös', ratt: 'Hälsa och visa runt', fel: 'Kör det svåraste direkt',
      forklaring: 'Hälsa och visa runt – en trygg start gör att hen kommer tillbaka.', miljoer: ['idrott', 'fritidsgard'] },
    { text: 'Barnet vill knäppa jackan själv', ratt: 'Låt hen försöka och peppa', fel: 'Gör det åt hen',
      forklaring: 'Låt hen försöka – så växer självständigheten.', miljoer: ['forskola', 'skog'] },
    { text: 'Dags för fotbollsträning', ratt: 'Värm upp lugnt först', fel: 'Spurta direkt',
      forklaring: 'Värm upp först – det minskar risken för skador.', miljoer: ['idrott', 'evenemang'] },
    { text: 'Någon skojar elakt om en kompis', ratt: 'Säg ifrån och prata med dem', fel: 'Skratta med',
      forklaring: 'Säg ifrån – en vuxen tittar aldrig bort.', miljoer: ['fritidsgard', 'idrott', 'forskola'] },
    { text: 'Ni ska planera en aktivitet på fritidsgården', ratt: 'Fråga ungdomarna vad de vill', fel: 'Bestäm allt själv',
      forklaring: 'Fråga ungdomarna – delaktighet gör aktiviteten bättre.', miljoer: ['fritidsgard', 'planering'] },
    { text: 'Personen du är assistent åt vill välja tröja', ratt: 'Låt hen välja själv', fel: 'Välj åt hen',
      forklaring: 'Låt hen välja – alla har rätt att bestämma över sitt liv.', miljoer: ['apl'] },
    { text: 'Ett barn förstår inte svenska så bra än', ratt: 'Visa med bilder och kroppsspråk', fel: 'Prata högre',
      forklaring: 'Visa med bilder och kroppsspråk – att prata högre hjälper inte.', miljoer: ['forskola', 'evenemang'] },
    { text: 'Utflykt i skogen med barngruppen', ratt: 'Räkna barnen ofta', fel: 'Låt alla springa iväg',
      forklaring: 'Räkna barnen ofta – säkerheten går först.', miljoer: ['skog'] },
    { text: 'Träningspasset är slut', ratt: 'Varva ner och drick vatten', fel: 'Hoppa över återhämtningen',
      forklaring: 'Varva ner och drick – återhämtning hör till träningen.', miljoer: ['idrott'] },
    { text: 'Ett barn klarar något nytt', ratt: 'Beröm att hen kämpade', fel: '"Äntligen!"',
      forklaring: 'Beröm kämpandet – då vågar barnet försöka igen.', miljoer: ['forskola', 'idrott', 'evenemang'] },
    { text: 'Alla ska få vara med i leken', ratt: 'Anpassa så att alla kan delta', fel: 'De bästa väljer lag',
      forklaring: 'Anpassa – ingen ska känna sig utanför.', miljoer: ['forskola', 'idrott', 'evenemang', 'skog'] },
    { text: 'En ungdom berättar om sin dag', ratt: 'Lyssna och ställ frågor', fel: 'Titta i mobilen',
      forklaring: 'Lyssna och fråga – att bli lyssnad på bygger förtroende.', miljoer: ['fritidsgard'] },
    { text: 'Ett barn berättar något som oroar dig', ratt: 'Lyssna och prata med ansvarig vuxen', fel: 'Lova att inte säga något',
      forklaring: 'Berätta för ansvarig vuxen – lova aldrig att hålla tyst om något allvarligt.', miljoer: ['forskola', 'fritidsgard'] },
    { text: 'Det börjar regna på utflykten', ratt: 'Ta på regnkläder och fortsätt', fel: 'Spring hem direkt',
      forklaring: 'Med rätt kläder går det att vara ute i alla väder.', miljoer: ['skog'] },
    { text: 'Lägerelden ska tändas', ratt: 'Ha vatten nära och en vuxen bredvid', fel: 'Låt barnen tända själva',
      forklaring: 'Vatten nära och en vuxen bredvid – säkerheten först.', miljoer: ['skog'] },
    { text: 'Vad skriver ni först i planeringen?', ratt: 'Syftet – varför gör vi det?', fel: 'Vilken musik vi ska ha',
      forklaring: 'Syftet först – det styr allt annat i planeringen.', miljoer: ['planering'] },
    { text: 'Hur många vuxna behövs på idrottsdagen?', ratt: 'Så många att alla är säkra', fel: 'En räcker gott',
      forklaring: 'Tillräckligt många vuxna – säkerheten går först.', miljoer: ['planering'] },
    { text: 'Vad behöver ni packa till fredagen?', ratt: 'Gör en materiallista', fel: 'Ta det som råkar finnas',
      forklaring: 'En materiallista gör att inget saknas på dagen.', miljoer: ['planering'] },
    { text: 'Vem gör vad på evenemanget?', ratt: 'Fördela uppgifter i arbetslaget', fel: 'Alla gör allt samtidigt',
      forklaring: 'Tydliga uppgifter i arbetslaget gör att allt flyter.', miljoer: ['planering'] },
    { text: 'Hur lång tid ska varje station ta?', ratt: 'Planera så att alla hinner', fel: 'Det löser sig',
      forklaring: 'En tidsplan gör att alla barn hinner prova allt.', miljoer: ['planering'] },
    { text: 'Ett barn i rullstol ska vara med', ratt: 'Planera stationer som alla kan göra', fel: 'Hen får titta på',
      forklaring: 'Planera så att alla kan delta från början.', miljoer: ['planering', 'evenemang', 'idrott'] },
    { text: 'En ungdom vill starta en e-sportklubb', ratt: 'Hjälp hen att komma igång', fel: 'Säg att det inte går',
      forklaring: 'Ungdomarnas egna idéer är guld för en fritidsledare.', miljoer: ['fritidsgard'] },
    { text: 'Det är dags för vila på förskolan', ratt: 'Läs en lugn saga', fel: 'Sätt på hög musik',
      forklaring: 'Lugn och ro hjälper barnen att vila.', miljoer: ['forskola'] },
    { text: 'Ett barn vill inte äta', ratt: 'Uppmuntra lugnt utan tvång', fel: 'Tvinga i maten',
      forklaring: 'Måltiden ska vara trygg – uppmuntra, tvinga aldrig.', miljoer: ['forskola'] },
    { text: 'Någon blir andfådd under löpningen', ratt: 'Sakta ner och ta det lugnt', fel: 'Spring fortare',
      forklaring: 'Lyssna på kroppen – tempot anpassas efter deltagaren.', miljoer: ['idrott', 'evenemang'] },
    { text: 'Det blir kallt på utflykten', ratt: 'Ta på fler lager kläder', fel: 'Frys lite, det går över',
      forklaring: 'Lager på lager håller värmen ute i naturen.', miljoer: ['skog'] },
    { text: 'Två ungdomar vill inte vara i samma lag', ratt: 'Prata med dem och hitta en lösning', fel: 'Strunta i det',
      forklaring: 'En bra ledare hjälper till att lösa konflikter.', miljoer: ['fritidsgard', 'idrott'] }
  ],

  /* ---------- Snabbfrågor i de gymnasiegemensamma ämnena (alltid med BF-koppling) ---------- */
  fragor: [
    { amne: 'Matte', fraga: '24 barn, 4 vid varje bord. Hur många bord?', ratt: '6', fel: '8', forklaring: '24 / 4 = 6 bord. Matte behövs när du planerar för en grupp.' },
    { amne: 'Matte', fraga: 'Utflykten kostar 30 kr per barn, 10 barn. Totalt?', ratt: '300 kr', fel: '130 kr', forklaring: '30 × 10 = 300 kr. Så gör du en budget.' },
    { amne: 'Matte', fraga: 'Passet börjar 13.15 och är 45 min. Slut?', ratt: '14.00', fel: '13.60', forklaring: '13.15 + 45 min = 14.00. En timme har 60 minuter.' },
    { amne: 'Matte', fraga: '18 barn i lag om 3. Hur många lag?', ratt: '6', fel: '5', forklaring: '18 / 3 = 6 lag. Gruppindelning är vardag på BF.' },
    { amne: 'Svenska', fraga: 'Rätt stavat?', ratt: 'aktivitet', fel: 'aktivitét', forklaring: 'Aktivitet – utan accent.' },
    { amne: 'Svenska', fraga: 'Bäst sätt att informera föräldrarna?', ratt: 'Kort och tydlig text', fel: 'Lång text med svåra ord', forklaring: 'Kort och tydligt – då förstår alla.' },
    { amne: 'Svenska', fraga: 'Bra högläsningsbok för 4-åringar?', ratt: 'Bilderbok', fel: 'Deckare', forklaring: 'Bilderbok – bilderna hjälper små barn att förstå.' },
    { amne: 'Svenska', fraga: 'Hur börjar en bra inbjudan?', ratt: 'Välkomna på idrottsdag!', fel: 'Ni måste komma.', forklaring: 'Var välkomnande – tonen spelar roll.' },
    { amne: 'Naturkunskap', fraga: 'Bäst energi före träning?', ratt: 'Fullkornsmacka', fel: 'Godispåse', forklaring: 'Fullkorn ger jämn energi länge.' },
    { amne: 'Naturkunskap', fraga: 'Vad sprider minst smitta på förskolan?', ratt: 'Tvätta händerna', fel: 'Dela nappflaskor', forklaring: 'Handtvätt stoppar smitta bäst.' },
    { amne: 'Naturkunskap', fraga: 'Vad behöver kroppen efter träning?', ratt: 'Vatten och mat', fel: 'Läsk och chips', forklaring: 'Vatten och riktig mat hjälper kroppen att återhämta sig.' },
    { amne: 'Naturkunskap', fraga: 'Hur mycket bör barn röra sig varje dag?', ratt: 'Minst 60 minuter', fel: '5 minuter', forklaring: 'Minst en timme om dagen – det vet en bra fritidsledare.' },
    { amne: 'Engelska', fraga: '"Can you help me?" betyder…', ratt: 'Kan du hjälpa mig?', fel: 'Kan du se mig?', forklaring: 'Help = hjälpa. Engelska behövs när du möter nya familjer.' },
    { amne: 'Engelska', fraga: '"Let\'s play together!"', ratt: 'Vi leker tillsammans!', fel: 'Vi går hem!', forklaring: 'Play together = leka tillsammans.' },
    { amne: 'Engelska', fraga: '"Warm-up" betyder…', ratt: 'Uppvärmning', fel: 'Varm mat', forklaring: 'Warm-up = uppvärmning, före varje träning.' },
    { amne: 'Engelska', fraga: '"Well done!" betyder…', ratt: 'Bra jobbat!', fel: 'Brunnen är klar!', forklaring: 'Well done = bra jobbat. Beröm på engelska!' },
    { amne: 'Engelska', fraga: '"Be careful!" betyder…', ratt: 'Var försiktig!', fel: 'Var glad!', forklaring: 'Careful = försiktig. Bra att kunna på utflykten.' },
    { amne: 'Engelska', fraga: '"Let\'s take a break"', ratt: 'Vi tar en paus', fel: 'Vi tar sönder något', forklaring: 'Take a break = ta en paus.' },
    { amne: 'Engelska', fraga: '"Line up, please!" betyder…', ratt: 'Ställ er på led!', fel: 'Ställ er i solen!', forklaring: 'Line up = ställa sig på led, t.ex. innan utflykten.' },
    { amne: 'Svenska', fraga: 'Vilket ord betyder samma sak som "glad"?', ratt: 'Lycklig', fel: 'Ledsen', forklaring: 'Ord som betyder samma sak kallas synonymer.' },
    { amne: 'Svenska', fraga: 'Bäst meddelande till en förälder?', ratt: 'Hej! Vi går till skogen i morgon.', fel: 'tja vi drar ut imon', forklaring: 'Skriv vårdat och tydligt till föräldrar.' },
    { amne: 'Svenska', fraga: 'Rätt stavat?', ratt: 'fritidsledare', fel: 'fritidsledarre', forklaring: 'Fritidsledare – med ett r på slutet.' },
    { amne: 'Matte', fraga: 'Varje barn får 2 frukter. 15 barn. Hur många frukter?', ratt: '30', fel: '17', forklaring: '2 × 15 = 30 frukter.' },
    { amne: 'Matte', fraga: 'Hälften av 20 barn vill spela fotboll. Hur många?', ratt: '10', fel: '5', forklaring: 'Hälften av 20 = 10.' },
    { amne: 'Matte', fraga: 'Bussen går 9.40. Ni behöver 15 min dit. Gå senast?', ratt: '9.25', fel: '9.55', forklaring: '9.40 − 15 min = 9.25. Planera tiden!' },
    { amne: 'Naturkunskap', fraga: 'Vad händer med pulsen när du springer?', ratt: 'Den går upp', fel: 'Den går ner', forklaring: 'Hjärtat slår snabbare när musklerna behöver mer syre.' },
    { amne: 'Naturkunskap', fraga: 'Vad skyddar mot solbränna på utflykten?', ratt: 'Solkräm och keps', fel: 'Ingenting', forklaring: 'Solkräm och keps skyddar barnens hud.' },
    { amne: 'Naturkunskap', fraga: 'Hur länge bör man tvätta händerna?', ratt: 'Minst 20 sekunder', fel: '2 sekunder', forklaring: 'Minst 20 sekunder med tvål tar bort bakterierna.' }
  ],

  /* ---------- Utvärdering (fredag eftermiddag) – vägvalen kommer tätt ---------- */
  utvardering: [
    { text: 'Barnen tyckte stationerna var för svåra', ratt: 'Gör dem enklare nästa gång', fel: 'Skyll på barnen',
      forklaring: 'Utvärdering handlar om att bli bättre, inte om att skylla ifrån sig.' },
    { text: 'Vad gick bra?', ratt: 'Fråga deltagarna', fel: 'Strunta i det', forklaring: 'Fråga deltagarna – deras röst visar vad som fungerade.' },
    { text: 'Tidsplanen sprack', ratt: 'Planera in mer tid nästa gång', fel: 'Planera aldrig igen', forklaring: 'Lär av det – nästa planering blir bättre.' },
    { text: 'En station blev jättepopulär', ratt: 'Ta med den nästa gång', fel: 'Ta bort den', forklaring: 'Behåll det som fungerar.' },
    { text: 'Någon skadade sig lite', ratt: 'Se över säkerheten', fel: 'Låtsas att inget hänt', forklaring: 'Säkerheten ska alltid utvärderas.' },
    { text: 'Nåddes syftet med dagen?', ratt: 'Jämför med planeringen', fel: 'Gissa', forklaring: 'Jämför med syftet ni skrev på måndagen.' }
  ],

  /* ---------- Rubriker för vägvalen ---------- */
  vagvalRubrik: { situation: 'Vad gör du?', fraga: 'Snabbfråga', utvardering: 'Utvärdera' },
  vagvalUpp: 'HOPPA UPP',
  vagvalNer: 'SPRING RAKT',
  vagvalRatt: 'Snyggt!',
  vagvalFel: 'Hmm…',

  /* ---------- Planeringslappar (måndag eftermiddag) och fördelarna på fredag ---------- */
  lappar: [
    { id: 'syfte', namn: 'Syfte', fordel: 'Dubbla poäng' },
    { id: 'material', namn: 'Material', fordel: 'Fler föremål' },
    { id: 'sakerhet', namn: 'Säkerhet', fordel: 'En sköld' },
    { id: 'tidsplan', namn: 'Tidsplan', fordel: 'Lugnare tempo' }
  ],
  planeraIngen: 'Ni planerade inte – det märks!',
  planeraRubrik: 'Er planering ger:',
  planeraTips: 'Planeringslapp',

  /* ---------- Hjälpa någon (barn och ungdomar vid vägen) ---------- */
  hjalp: [
    { problem: 'ramlat', tack: 'Tröstad!' },
    { problem: 'ensam', tack: 'Bjöd in!' },
    { problem: 'mossa', tack: 'Hittade mössan!' }
  ],
  hjalptText: 'Hjälpt!',

  /* ---------- Kraftföremål (BF-förmågor) ---------- */
  kraft: {
    visselpipa: { namn: 'Visselpipan!', text: 'Fritidsledaren tar kommandot' },
    forstaHjalpen: { namn: 'Första hjälpen!', text: 'Säkerhet och omsorg' },
    teamwork: { namn: 'Teamwork!', text: 'I arbetslaget är ni starkare' },
    frukt: { namn: 'Fruktskålen!', text: 'Hälsa och kost ger kraft' }
  },

  /* ---------- Banderoller och helg ---------- */
  helg: 'HELG!',
  nyVecka: 'VECKA {n} – snabbare!',
  veckokortRubrik: 'Veckans utvärdering',
  veckokort: { lappar: 'Planeringslappar', val: 'Rätta val', hjalpta: 'Hjälpta barn' },

  /* ---------- Slutskärmen ---------- */
  titlar: ['Praktikant', 'BF-elev', 'Fritidsledar-ämne', 'BF-proffs', 'BF-legend'],   // gränserna står i CONFIG
  hannMed: 'Det här hann du med på BF',
  peppRad: 'Du valde rätt i {ratt} av {totalt} situationer – det är precis det vi tränar på BF!',
  peppIngen: 'Nästa gång: spring längre och möt fler situationer – det är dem vi tränar på BF!',

  /* ---------- "Vad är BF?" (attract mode i monterläget) ---------- */
  vadArBF: {
    rubrik: 'Vad är BF?',
    text: 'Barn- och fritidsprogrammet är för dig som vill jobba med människor – barn, unga och vuxna.',
    fakta: [
      'Mycket APL – du lär dig yrket ute på riktiga arbetsplatser',
      'Planera → genomföra → utvärdera: så jobbar vi i alla kurser',
      'Du kan jobba direkt efter gymnasiet eller läsa vidare'
    ],
    veckaRubrik: 'En vecka på BF'
  },

  /* ---------- Monterläget: figurval, topplista och namn ---------- */
  figurRubrik: 'VÄLJ FIGUR',
  figurHjalp: 'Glid (↓) byter · Hoppa (↑ / mellanslag) väljer · Eller tryck på en figur',
  tryckForAttSpela: 'TRYCK PÅ VALFRI KNAPP FÖR ATT SPELA',
  dagensTopp: 'DAGENS TOPP 10',
  bastaNagonsin: 'BÄSTA NÅGONSIN',
  dagensLedare: 'DAGENS LEDARE',
  tomLista: 'Ingen har spelat än i dag – bli först!',
  demo: 'DEMO',
  namnRubrik: 'Du är på dagens topplista – plats {plats}!',
  namnFalt: 'Namn',
  skolaFalt: 'Högstadieskola (valfritt)',
  namnPaminnelse: 'Skriv bara förnamn eller smeknamn – inte efternamn.',
  namnBlockerat: 'Välj ett annat namn',
  namnTomt: 'Skriv ett namn först',
  namnKlar: 'KLAR',
  namnNasta: 'NÄSTA',
  namnHoppa: 'HOPPA ÖVER',
  namnSparat: 'Sparat! Du ligger på plats {plats}.',
  spelaIgen: 'TRYCK FÖR ATT SPELA IGEN',
  placeringText: 'Plats {plats} på dagens lista',
  utanforListan: 'Inte på dagens topp 10 – försök igen!',

  /* ---------- Fula ord ----------
     fulaOrd: stoppas var de än står i namnet (även inuti andra ord).
     fulaOrdHela: stoppas bara som hela ord (så att t.ex. "Stefan" inte stoppas av "fan").
     Spelet ersätter själv 4→a, 0→o, 1→i, 3→e, 5→s och tar bort upprepade bokstäver. */
  fulaOrd: [
    'fitta', 'fittan', 'kuken', 'knulla', 'knull', 'horunge', 'hora', 'jävla', 'javla', 'helvete', 'satan', 'skitstövel',
    'neger', 'nigger', 'nigga', 'negro', 'bögjävel', 'blatte', 'svartskalle', 'mongo', 'cpunge', 'idiot', 'pucko', 'efterbliven',
    'fuck', 'shit', 'bitch', 'cunt', 'dick', 'cock', 'pussy', 'whore', 'slut', 'faggot', 'retard', 'nazi', 'hitler', 'heil',
    'rape', 'porr', 'porn', 'penis', 'vagina', 'pedofil', 'pedo', 'kåtis', 'asshole', 'bastard', 'wanker', 'twat', 'motherf'
  ],
  fulaOrdHela: [
    'fan', 'kuk', 'hor', 'bög', 'cp', 'sex', 'anal', 'skit', 'ass', 'tits', 'kåt', 'pk', 'kys', 'fag', 'sug', 'rov', 'piss'
  ]
};
