/**
 * sources.js — Externe kennisbron (Wikipedia)
 * ---------------------------------------------
 * Los bestand, met opzet gescheiden van engine.js: dit stuk code doet
 * GEEN vectorwiskunde. Het praat met de Wikipedia-API (via fetch, met
 * CORS ondersteund door Wikipedia zelf via de `origin=*`-parameter) en
 * geeft simpele, kant-en-klare tekst + een bronvermelding terug.
 *
 * Wordt alleen aangeroepen wanneer:
 *   - Aurora een woord niet kent (converse() gaf `unknown: true` terug), of
 *   - de vraag duidelijk een feitenvraag is ("wat is...", "wie is...", ...)
 *
 * Wikipedia wordt dus NIET geraadpleegd voor gewone small talk of open,
 * onderwerp-gedreven zinnen — daar is de eigen motor (engine.js) voor.
 */

const WIKI_LANG = "nl";
const WIKI_API = `https://${WIKI_LANG}.wikipedia.org/w/api.php`;

/** Herkent of een zin waarschijnlijk een feitenvraag is (i.p.v. small talk of mening). */
function looksLikeFactualQuestion(text) {
  const t = text.toLowerCase().trim();
  return /^(wat is|wat zijn|wat betekent|wie is|wie was|waar is|waar ligt|waar komt|wanneer is|wanneer was|hoe werkt|hoe ontstaat|hoeveel|leg uit wat|vertel (me |mij )?(eens )?over)\b/.test(t)
    || /\?\s*$/.test(t.trim());
}

/** Stap 1: zoek de meest relevante Wikipedia-paginatitel bij een zoekterm. */
async function wikipediaSearchTitle(query) {
  const url = `${WIKI_API}?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Wikipedia-zoekopdracht mislukt (status ${res.status})`);
  const data = await res.json();
  const hit = data?.query?.search?.[0];
  return hit ? hit.title : null;
}

/** Stap 2: haal de introductietekst (platte tekst, geen wiki-opmaak) van die pagina op. */
async function wikipediaExtract(title) {
  const url = `${WIKI_API}?action=query&prop=extracts&exintro=true&explaintext=true&redirects=1&titles=${encodeURIComponent(title)}&format=json&origin=*`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Wikipedia-extract mislukt (status ${res.status})`);
  const data = await res.json();
  const pages = data?.query?.pages || {};
  const page = Object.values(pages)[0];
  return page && page.extract ? page.extract : null;
}

function splitSentences(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Stap 3: kies de 1-2 zinnen uit de introtekst die het best bij de vraag
 * passen (eenvoudige trefwoord-overlap — dit is bewust simpel, geen
 * herschrijving, alleen selectie en lichte inkorting).
 */
function selectRelevantSentences(extract, query, maxSentences = 2) {
  const sentences = splitSentences(extract).slice(0, 6); // niet het hele artikel doorzoeken
  if (sentences.length === 0) return [];

  const queryTokens = (query.toLowerCase().match(/[a-zà-ü0-9]+/g) || [])
    .filter(t => t.length > 2);

  const scored = sentences.map((s, idx) => {
    const lower = s.toLowerCase();
    const overlap = queryTokens.filter(t => lower.includes(t)).length;
    return { text: s, idx, overlap };
  });

  const anyOverlap = scored.some(s => s.overlap > 0);
  let chosen;
  if (anyOverlap) {
    chosen = [...scored].sort((a, b) => b.overlap - a.overlap).slice(0, maxSentences);
  } else {
    // Geen directe trefwoord-match: de eerste zin(nen) van een Wikipedia-
    // intro zijn vrijwel altijd de kernomschrijving, dus die zijn een
    // veilige default.
    chosen = scored.slice(0, maxSentences);
  }
  // Herstel de oorspronkelijke volgorde voor een leesbaar resultaat.
  chosen.sort((a, b) => a.idx - b.idx);
  return chosen.map(c => c.text);
}

/**
 * Hoofdfunctie: probeert een vraag te beantwoorden via Wikipedia.
 * Geeft `null` terug als er niets bruikbaars gevonden is — Aurora mag
 * dan niets verzinnen en valt terug op zijn eigen, eerlijke antwoord.
 */
async function lookupWikipedia(query) {
  try {
    const title = await wikipediaSearchTitle(query);
    if (!title) return null;

    const extract = await wikipediaExtract(title);
    if (!extract) return null;

    const sentences = selectRelevantSentences(extract, query, 2);
    if (sentences.length === 0) return null;

    return {
      text: sentences.join(" "),
      sourceTitle: title,
      sourceUrl: `https://${WIKI_LANG}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`
    };
  } catch (err) {
    console.error("Wikipedia-opzoeking mislukt:", err);
    return null; // geen internet, of Wikipedia niet bereikbaar: stil falen
  }
}
