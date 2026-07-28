/**
 * engine.js — De rekenmotor van Aurora
 * ------------------------------------
 * Dit bestand bevat de volledige wiskunde van het model, ÉÉN keer
 * uitgeschreven. Geen externe API's, geen frameworks — alleen de kale
 * lineaire algebra die ook onder "echte" taalmodellen ligt:
 *
 *   1. Elk woord in het vocabulaire heeft een vector [x, y, z]
 *      (geleerd via co-occurrentie + SVD, zie build_model.py).
 *   2. De invoer van de gebruiker wordt omgezet naar een context-vector
 *      (het gemiddelde van de woordvectoren in de zin).
 *   3. Cosine similarity meet de hoek tussen twee vectoren: hoe kleiner
 *      de hoek, hoe "verwanter" de betekenis.
 *   4. Voor het volgende woord combineren we twee wiskundige signalen:
 *        a) de bigram-kans (statistiek: wat volgt normaal op dit woord)
 *        b) de cosine similarity met de context-vector (betekenis)
 *      Deze twee scores worden vermenigvuldigd tot één eindscore.
 *   5. We herhalen dit woord-voor-woord tot een punt "." volgt, of tot
 *      een maximale lengte is bereikt.
 */

class AuroraEngine {
  constructor() {
    this.model = null;
    this.words = null;      // { woord: {id, vector, next, freq} }
    this.vocabList = [];    // array van woorden, geïndexeerd op id
    this.ready = false;
  }

  /** Laadt model.json via fetch (vereist een lokale server, zie README). */
  async load(modelPath = "model.json") {
    const response = await fetch(modelPath);
    if (!response.ok) {
      throw new Error(
        `Kon ${modelPath} niet laden (status ${response.status}). ` +
        `Draai een lokale server — zie de instructies in de README.`
      );
    }
    this.model = await response.json();
    this.words = this.model.words;
    this.vocabList = new Array(this.model.meta.vocab_size);
    for (const w in this.words) {
      this.vocabList[this.words[w].id] = w;
    }
    this.ready = true;
    return this.model.meta;
  }

  /* ---------------------------------------------------------------- *
   *  STAP 1 — Basiswiskunde: vectorbewerkingen
   * ---------------------------------------------------------------- */

  /** Inproduct (dot product) van twee vectoren. */
  dot(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
    return sum;
  }

  /** Euclidische lengte (magnitude / norm) van een vector. */
  magnitude(v) {
    return Math.sqrt(this.dot(v, v));
  }

  /**
   * Cosine similarity: cos(θ) = (A · B) / (‖A‖ · ‖B‖)
   * Resultaat tussen -1 (tegengesteld) en 1 (identiek qua richting).
   * Dit is de kernformule van het hele systeem — hier, en nergens
   * anders, staat hij uitgeschreven.
   */
  cosineSimilarity(a, b) {
    const magA = this.magnitude(a);
    const magB = this.magnitude(b);
    if (magA === 0 || magB === 0) return 0;
    return this.dot(a, b) / (magA * magB);
  }

  /** Gemiddelde van meerdere vectoren -> de "context-vector" van een zin. */
  averageVector(vectors) {
    const dim = this.model.meta.dimensions;
    const avg = new Array(dim).fill(0);
    if (vectors.length === 0) return avg;
    for (const v of vectors) {
      for (let i = 0; i < dim; i++) avg[i] += v[i];
    }
    for (let i = 0; i < dim; i++) avg[i] /= vectors.length;
    return avg;
  }

  /* ---------------------------------------------------------------- *
   *  STAP 2 — Tokenisatie & vectorisatie van de invoer
   * ---------------------------------------------------------------- */

  tokenize(text) {
    return (text.toLowerCase().match(/[a-zàâäéèêëïîôöùûüç]+(?:'[a-z]+)?/g) || []);
  }

  /** Zet een array van woorden om naar hun vectoren (onbekende woorden overslaan). */
  vectorize(tokens) {
    const vectors = [];
    for (const t of tokens) {
      if (this.words[t]) vectors.push(this.words[t].vector);
    }
    return vectors;
  }

  /**
   * Vindt het dichtstbijzijnde woord in het vocabulaire bij een gegeven
   * vector, via cosine similarity tegen elk woord in de database.
   * Geeft de volledige, gesorteerde ranglijst terug (voor visualisatie).
   */
  nearestWords(targetVector, excludeSet = new Set(), limit = 12) {
    const scored = [];
    for (const w in this.words) {
      if (excludeSet.has(w)) continue;
      const sim = this.cosineSimilarity(targetVector, this.words[w].vector);
      scored.push({ word: w, score: sim });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }

  /* ---------------------------------------------------------------- *
   *  STAP 3 — Woord-voor-woord generatie
   * ---------------------------------------------------------------- */

  /**
   * Berekent, gegeven het huidige woord en de context-vector, de
   * kandidaten voor het volgende woord met hun gecombineerde score:
   *
   *    score(kandidaat) = P_bigram(kandidaat | huidig_woord)
   *                        × ( 0.5 + 0.5 × cosineSimilarity(kandidaat, context) )
   *
   * De bigram-kans zorgt voor grammaticaal logische opvolging,
   * de cosine similarity trekt de generatie richting de betekenis
   * van de oorspronkelijke invoer van de gebruiker.
   */
  scoreCandidates(currentWord, contextVector) {
    const entry = this.words[currentWord];
    const candidates = [];

    const bigramNext = (entry && entry.next) ? entry.next : {};
    const bigramWords = Object.keys(bigramNext);

    if (bigramWords.length > 0) {
      for (const w of bigramWords) {
        const wVec = this.words[w].vector;
        const sim = this.cosineSimilarity(wVec, contextVector);
        const semanticFactor = 0.5 + 0.5 * sim; // herschaalt [-1,1] -> [0,1]
        const score = bigramNext[w] * semanticFactor;
        candidates.push({ word: w, score, bigram: bigramNext[w], similarity: sim });
      }
    } else {
      // Geen bekende bigram-opvolgers: val terug op pure vector-nabijheid.
      const nearest = this.nearestWords(contextVector, new Set([currentWord]), 8);
      for (const n of nearest) {
        candidates.push({ word: n.word, score: Math.max(n.score, 0.0001), bigram: 0, similarity: n.score });
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates;
  }

  /**
   * Kiest het volgende woord. `temperature` voegt kleine, gecontroleerde
   * willekeur toe zodat niet elke generatie identiek is — zonder de
   * wiskunde te verstoppen: we samplen gewogen naar de score.
   */
  pickNext(candidates, temperature = 0.35) {
    if (candidates.length === 0) return { word: ".", score: 1, bigram: 1, similarity: 1 };
    const top = candidates.slice(0, Math.min(5, candidates.length));
    const weights = top.map(c => Math.pow(Math.max(c.score, 1e-6), 1 / Math.max(temperature, 0.05)));
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < top.length; i++) {
      r -= weights[i];
      if (r <= 0) return top[i];
    }
    return top[0];
  }

  /**
   * Genereert woord-voor-woord een volledige zin, en roept na élk woord
   * `onStep(stepInfo)` aan zodat de UI live kan meekijken met de
   * wiskunde (voor de datamatrix-visualisatie).
   */
  async generate(inputText, { maxWords = 28, onStep = null, delayMs = 140 } = {}) {
    if (!this.ready) throw new Error("Model is nog niet geladen.");

    const tokens = this.tokenize(inputText);
    const inputVectors = this.vectorize(tokens);
    const contextVector = inputVectors.length > 0
      ? this.averageVector(inputVectors)
      : this.words[this.pickRandomKnownWord()].vector;

    // Startwoord: het bekende invoerwoord met de hoogste "informatiewaarde"
    // (laagste frequentie = specifieker), anders het dichtstbijzijnde woord.
    let currentWord = this.pickStartWord(tokens, contextVector);

    const output = [currentWord];
    const trace = [];

    for (let i = 0; i < maxWords; i++) {
      const candidates = this.scoreCandidates(currentWord, contextVector);
      const chosen = this.pickNext(candidates);

      const stepInfo = {
        step: i + 1,
        from: currentWord,
        candidates: candidates.slice(0, 6),
        chosen,
        contextVector
      };
      trace.push(stepInfo);
      if (onStep) await onStep(stepInfo);
      if (delayMs > 0) await new Promise(res => setTimeout(res, delayMs));

      if (chosen.word === ".") {
        output.push(".");
        break;
      }
      output.push(chosen.word);
      currentWord = chosen.word;
    }

    return { text: this.formatSentence(output), trace };
  }

  pickStartWord(tokens, contextVector) {
    const known = tokens.filter(t => this.words[t]);
    if (known.length > 0) {
      // Kies het minst frequente (meest specifieke) bekende woord.
      known.sort((a, b) => this.words[a].freq - this.words[b].freq);
      return known[0];
    }
    const nearest = this.nearestWords(contextVector, new Set(), 1);
    return nearest.length > 0 ? nearest[0].word : this.pickRandomKnownWord();
  }

  pickRandomKnownWord() {
    const idx = Math.floor(Math.random() * this.vocabList.length);
    return this.vocabList[idx];
  }

  formatSentence(words) {
    if (words.length === 0) return "";
    let sentence = words.join(" ").replace(/\s+\./g, ".");
    sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1);
    if (!sentence.endsWith(".")) sentence += ".";
    return sentence;
  }
}

// Eén gedeelde instantie voor de hele applicatie.
const auroraEngine = new AuroraEngine();
