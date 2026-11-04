/* DLG Arcade – banbanken.
   Alla begreppsbanor på ett ställe. Alla spel som använder dlg-spel.js får dem automatiskt.

   Ny bana: kopiera ett block nedan, ge det ett unikt id och fyll i begreppen.
   - id:      kort namn utan mellanslag, t.ex. "kasam"
   - namn:    det eleverna ser
   - kurs:    Hälsopedagogik, Fritidskunskap, Pedagogik, AI-kunskap ... (används för att gruppera)
   - begrepp: minst 4 st, varje med ord och def (definition)
   - sprak:   (valfritt) språkbanor för ¡Habla!, t.ex. 'es-ES'. Då är ord = spanska (med artikel) och def = svenska.
*/
window.DLG_BANOR = [
  {
    id: "salutogent", namn: "Salutogent perspektiv", kurs: "Hälsopedagogik",
    begrepp: [
      { ord: "Salutogenes", def: "Hälsans ursprung (från latin och grekiska)" },
      { ord: "Salutogena perspektivet", def: "Ett sätt att se på hälsa där man fokuserar på de faktorer som skapar god hälsa." },
      { ord: "Faktorer", def: "Omständigheter som bidrar till ett visst resultat." },
      { ord: "Maskrosbarn", def: "Barn som klarar sig bra i livet trots svåra uppväxtförhållanden." },
      { ord: "KASAM", def: "Känsla av sammanhang" },
      { ord: "Begriplighet", def: "Att förstå eller kunna förstå något" },
      { ord: "Hanterbarhet", def: "Att hantera eller kunna hantera något" },
      { ord: "Meningsfullhet", def: "När man känner att något är viktigt eller att det ger mig något att hålla på med detta." },
      { ord: "Holistiskt arbetssätt", def: "Man ser helheten." },
      { ord: "Självkänsla", def: "Individens bedömning av sig själv. Är man tillräckligt bra? Duger man? Sett från sig själv." },
      { ord: "Självförtroende", def: "Individens tro på sin egna förmåga. Hur mycket klarar man av? Kommer man lyckas eller misslyckas? Vad tror man om sig själv." },
      { ord: "Coping", def: "Att hantera motgångar på olika sätt." },
      { ord: "Ansvarstagande", def: "Att själv förstå att de val och handlingar man gör kommer få konsekvenser och det behöver man själv stå för." },
      { ord: "Humor", def: "Förmåga att skämta och att förstå skämt" }
    ]
  },
  {
    id: "perspektiv-pa-halsa", namn: "Perspektiv på hälsa", kurs: "Hälsopedagogik",
    begrepp: [
      { ord: "Objektiv hälsa", def: "Hälsa bedömd utifrån fakta och saklighet." },
      { ord: "Subjektiv hälsa", def: "Hälsa bedömd utifrån värderingar och känslor." },
      { ord: "Psykosomatiskt", def: "Kroppsliga symtom med psykisk orsak." },
      { ord: "Helhetsperspektiv", def: "Man ser helheten, inte detaljer." },
      { ord: "Fysisk hälsa", def: "Hur kroppen mår och fungerar." },
      { ord: "Psykisk hälsa", def: "Inre välbefinnande, hur vi mår i tankar och känslor." },
      { ord: "Social hälsa", def: "Hur relationerna är till andra människor, om man ingår i ett sammanhang och om det sociala livet fungerar." },
      { ord: "Allmänt hälsotillstånd", def: "Hur man uppfattar den egna hälsan (pigg, trött, frisk)." },
      { ord: "Funktionsnedsättning/Funktionsvariation", def: "Rörelsehinder, mentala variationer eller syn- och hörselnedsättningar, t.ex. Cerebral Pares, blindhet, förlamning m.m." },
      { ord: "Nedstämdhet", def: "Att känna sig nere, inte på topp eller ledsen." },
      { ord: "WHO", def: "Världshälsoorganisationen." },
      { ord: "Fattigdom", def: "Att inte ha tillräckligt med pengar för att klara sig." },
      { ord: "Välfärd", def: "Att befolkningen i ett land har pengar nog för att leva bättre än vad man behöver." }
    ]
  },
  {
    id: "vad-ar-fritid", namn: "Vad är fritid?", kurs: "Fritidskunskap",
    begrepp: [
      { ord: "Tvångstid", def: "Tid man inte bestämmer över själv, när man måste göra ett \"måste\"." },
      { ord: "Ekonomisk tvångstid", def: "Tid man måste lägga på jobb och skola för att tjäna pengar eller i framtiden tjäna pengar." },
      { ord: "Fysiologisk tvångstid", def: "Tid man lägger för att sköta sin fysiska hälsa eller fylla fysiska behov, t.ex. sova, äta." },
      { ord: "Social tvångstid", def: "Tid man lägger på familj och vänner för att hålla relationen levande." },
      { ord: "Inre motivation", def: "Motivationen finns i personen, i tankar och känslor." },
      { ord: "Yttre motivation", def: "Motivation som kommer från någon eller något annat." },
      { ord: "Livsmakt", def: "Att känna att man har kontroll och kan påverka sitt eget liv." },
      { ord: "Kollektivt", def: "Gemensamt i gruppen eller ett land." },
      { ord: "Kommersiell", def: "Med vinstsyfte, ett syfte att tjäna pengar." },
      { ord: "Friluftsliv", def: "Typ av fritid när vi vistas i naturen, t.ex. vandra, campa." },
      { ord: "Objektivt", def: "Att bedöma, studera eller värdera något utan känslor." },
      { ord: "Verifierbar", def: "Kan bevisas med hjälp av vetenskap." },
      { ord: "Oorganiserad fritid", def: "Fritid som personen själv bestämmer över: vad, när, hur och med vem." },
      { ord: "Organiserad fritid", def: "Fritid som är organiserad med ledare, innehåll och bestämda tider." },
      { ord: "Subjektivt", def: "Att spekulera eller bedöma något utifrån känslor och egna tankar. Att tro, tycka och tänka." },
      { ord: "Fritid", def: "Den del av dygnet eller livet då man inte arbetar, studerar eller utför obligatoriska vardagssysslor." },
      { ord: "Fri tid", def: "Tid som för stunden är helt obokad och fri från alla typer av krav eller måsten." }
    ]
  },
  {
    id: "ai-grunder", namn: "AI – grundbegrepp", kurs: "AI-kunskap",
    begrepp: [
      { ord: "AI", def: "Artificiell intelligens: datorsystem som gör saker vi annars förknippar med mänsklig intelligens." },
      { ord: "Språkmodell", def: "En AI som har tränats på massor av text och räknar ut vilket ord som troligast kommer härnäst." },
      { ord: "Token", def: "En liten bit text, ofta ett ord eller en del av ett ord, som språkmodellen arbetar med." },
      { ord: "Träningsdata", def: "Den text, de bilder eller annan data som en AI har lärt sig mönster från." },
      { ord: "Prompt", def: "Instruktionen eller frågan man skriver till en AI." },
      { ord: "Hallucination", def: "När en AI hittar på något som låter trovärdigt men är fel." },
      { ord: "Bias", def: "Snedvridning: AI:n upprepar fördomar eller skevheter som fanns i träningsdatan." },
      { ord: "Källkritik", def: "Att granska varifrån information kommer och om den går att lita på." },
      { ord: "Generativ AI", def: "AI som skapar nytt innehåll, till exempel text, bilder eller ljud." },
      { ord: "Algoritm", def: "En steg-för-steg-instruktion som en dator följer för att lösa en uppgift." },
      { ord: "Maskininlärning", def: "När en dator lär sig mönster från exempel i stället för att få varje regel programmerad." },
      { ord: "Chattbot", def: "Ett program man kan skriva med som svarar i textform, till exempel ChatGPT eller Claude." }
    ]
  },
  {
    id: "es-saludos", namn: "Saludos y frases", kurs: "Spanska", sprak: "es-ES",
    begrepp: [
      { ord: "hola", def: "hej" },
      { ord: "buenos días", def: "god morgon" },
      { ord: "buenas tardes", def: "god eftermiddag" },
      { ord: "buenas noches", def: "god kväll / god natt" },
      { ord: "adiós", def: "hej då" },
      { ord: "hasta luego", def: "vi ses" },
      { ord: "hasta mañana", def: "vi ses i morgon" },
      { ord: "por favor", def: "snälla / var så snäll" },
      { ord: "gracias", def: "tack" },
      { ord: "de nada", def: "ingen orsak" },
      { ord: "perdón", def: "förlåt" },
      { ord: "¿Cómo estás?", def: "Hur mår du?" },
      { ord: "muy bien", def: "mycket bra" },
      { ord: "¿Cómo te llamas?", def: "Vad heter du?" },
      { ord: "me llamo", def: "jag heter" },
      { ord: "mucho gusto", def: "trevligt att träffas" },
      { ord: "¿De dónde eres?", def: "Var kommer du ifrån?" },
      { ord: "soy de Suecia", def: "jag kommer från Sverige" }
    ]
  },
  {
    id: "es-familia", namn: "La familia", kurs: "Spanska", sprak: "es-ES",
    begrepp: [
      { ord: "la familia", def: "familjen" },
      { ord: "la madre", def: "mamman" },
      { ord: "el padre", def: "pappan" },
      { ord: "los padres", def: "föräldrarna" },
      { ord: "el hermano", def: "brodern" },
      { ord: "la hermana", def: "systern" },
      { ord: "los hermanos", def: "syskonen" },
      { ord: "el abuelo", def: "farfar / morfar" },
      { ord: "la abuela", def: "farmor / mormor" },
      { ord: "los abuelos", def: "far- och morföräldrarna" },
      { ord: "el hijo", def: "sonen" },
      { ord: "la hija", def: "dottern" },
      { ord: "el tío", def: "farbrodern / morbrodern" },
      { ord: "la tía", def: "fastern / mostern" },
      { ord: "el primo", def: "kusinen (kille)" },
      { ord: "la prima", def: "kusinen (tjej)" },
      { ord: "el marido", def: "maken" },
      { ord: "la mujer", def: "frun / kvinnan" },
      { ord: "el bebé", def: "bebisen" }
    ]
  },
  {
    id: "es-comida", namn: "La comida", kurs: "Spanska", sprak: "es-ES",
    begrepp: [
      { ord: "la comida", def: "maten" },
      { ord: "la manzana", def: "äpplet" },
      { ord: "el pan", def: "brödet" },
      { ord: "el agua", def: "vattnet" },
      { ord: "la leche", def: "mjölken" },
      { ord: "el queso", def: "osten" },
      { ord: "el huevo", def: "ägget" },
      { ord: "la carne", def: "köttet" },
      { ord: "el pollo", def: "kycklingen" },
      { ord: "el pescado", def: "fisken (som mat)" },
      { ord: "la fruta", def: "frukten" },
      { ord: "la verdura", def: "grönsaken" },
      { ord: "el arroz", def: "riset" },
      { ord: "la naranja", def: "apelsinen" },
      { ord: "el plátano", def: "bananen" },
      { ord: "el tomate", def: "tomaten" },
      { ord: "la patata", def: "potatisen" },
      { ord: "el café", def: "kaffet" },
      { ord: "el zumo", def: "juicen" },
      { ord: "el desayuno", def: "frukosten" }
    ]
  },
  {
    id: "es-colores-numeros", namn: "Colores y números 1–20", kurs: "Spanska", sprak: "es-ES",
    begrepp: [
      { ord: "rojo", def: "röd" },
      { ord: "azul", def: "blå" },
      { ord: "verde", def: "grön" },
      { ord: "amarillo", def: "gul" },
      { ord: "negro", def: "svart" },
      { ord: "blanco", def: "vit" },
      { ord: "uno", def: "ett (1)" },
      { ord: "dos", def: "två (2)" },
      { ord: "tres", def: "tre (3)" },
      { ord: "cuatro", def: "fyra (4)" },
      { ord: "cinco", def: "fem (5)" },
      { ord: "seis", def: "sex (6)" },
      { ord: "siete", def: "sju (7)" },
      { ord: "ocho", def: "åtta (8)" },
      { ord: "nueve", def: "nio (9)" },
      { ord: "diez", def: "tio (10)" },
      { ord: "once", def: "elva (11)" },
      { ord: "quince", def: "femton (15)" },
      { ord: "dieciséis", def: "sexton (16)" },
      { ord: "veinte", def: "tjugo (20)" }
    ]
  },
  {
    id: "es-verbos", namn: "Verbos comunes", kurs: "Spanska", sprak: "es-ES",
    begrepp: [
      { ord: "ser", def: "att vara (egenskap, vem man är)" },
      { ord: "estar", def: "att vara (tillstånd, plats)" },
      { ord: "tener", def: "att ha" },
      { ord: "hacer", def: "att göra" },
      { ord: "ir", def: "att gå / åka" },
      { ord: "hablar", def: "att prata" },
      { ord: "comer", def: "att äta" },
      { ord: "beber", def: "att dricka" },
      { ord: "vivir", def: "att bo / leva" },
      { ord: "escribir", def: "att skriva" },
      { ord: "leer", def: "att läsa" },
      { ord: "escuchar", def: "att lyssna" },
      { ord: "ver", def: "att se" },
      { ord: "querer", def: "att vilja" },
      { ord: "poder", def: "att kunna" },
      { ord: "saber", def: "att veta" },
      { ord: "dormir", def: "att sova" },
      { ord: "jugar", def: "att spela / leka" },
      { ord: "trabajar", def: "att arbeta" },
      { ord: "estudiar", def: "att studera" }
    ]
  }
];
