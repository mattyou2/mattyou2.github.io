# -*- coding: utf-8 -*-
"""
Bouwscript voor Aurora — een lokaal, wiskundig taalmodel.

Stappen (echte, simpele basiswiskunde — geen externe API's):
1. Lees de trainingsdata uit training.txt (één zin per regel — wil je
   Aurora "trainen"? Voeg gewoon meer zinnen toe aan dat bestand en
   draai dit script opnieuw).
2. Tokeniseer elke zin tot woorden.
3. Bouw een co-occurrentiematrix (welke woorden staan vaak dicht bij
   elkaar) en reduceer die met SVD naar 3 dimensies -> de
   embedding-vectoren [x, y, z] per woord.
4. Tel bigram- én trigram-overgangen (welk woord volgt op de vorige
   1, resp. 2 woorden) en zet dat om naar echte kansen.
5. Bereken zin-vectoren voor retrieval (het terugvinden van complete,
   grammaticaal correcte zinnen die goed bij een vraag passen).
6. Schrijf alles weg naar model.json.
"""
import json
import re
from collections import defaultdict, Counter
import numpy as np

WINDOW = 3           # co-occurrentie-venster voor de embeddings
DIM = 3               # aantal dimensies van elke vector (x, y, z)
TOP_NEXT_BIGRAM = 10  # hoeveel opvolgers we per (1 woord) bewaren
TOP_NEXT_TRIGRAM = 6  # hoeveel opvolgers we per (2 woorden) bewaren
MIN_TRIGRAM_COUNT = 2 # een trigram-context moet minstens dit vaak voorkomen

with open("training.txt", encoding="utf-8") as f:
    CORPUS = f.read()

def tokenize(text):
    text = text.lower()
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    tokenized_sentences = []
    for s in sentences:
        s = s.strip()
        if not s:
            continue
        # Cijfers (bijv. "1", "2") en Nederlandse letters met accenten tellen mee.
        words = re.findall(r"[a-z0-9àâäéèêëïîôöùûüç]+(?:'[a-z]+)?", s)
        if words:
            tokenized_sentences.append(words + ['.'])
    return tokenized_sentences

def original_sentences(text):
    """Dezelfde zinsplitsing, maar dan met behoud van originele hoofdletters/interpunctie."""
    raw = re.split(r'(?<=[.!?])\s+', text.strip())
    return [s.strip() for s in raw if s.strip()]

sentences = tokenize(CORPUS)
orig_sentences = original_sentences(CORPUS)
assert len(sentences) == len(orig_sentences), "Getokeniseerde en originele zinnen lopen uit de pas."
print(f"Aantal zinnen: {len(sentences)}")

# --- Vocabulaire opbouwen ---
vocab_counter = Counter()
for s in sentences:
    vocab_counter.update(s)

vocab = sorted(vocab_counter.keys())
vocab_index = {w: i for i, w in enumerate(vocab)}
V = len(vocab)
print(f"Vocabulaire-grootte: {V}")

# --- Co-occurrentiematrix opbouwen (voor de vectoren/embeddings) ---
cooc = np.zeros((V, V), dtype=np.float64)
for s in sentences:
    n = len(s)
    for i, w in enumerate(s):
        wi = vocab_index[w]
        for j in range(max(0, i - WINDOW), min(n, i + WINDOW + 1)):
            if i == j:
                continue
            wj = vocab_index[s[j]]
            dist = abs(i - j)
            cooc[wi, wj] += 1.0 / dist

# Log-schaal dempt hoogfrequente woorden (zoals 'de', 'een')
cooc_log = np.log1p(cooc)

# --- SVD: reduceer naar DIM dimensies -> dit zijn onze embeddingvectoren ---
U, S, Vt = np.linalg.svd(cooc_log, full_matrices=False)
vectors = U[:, :DIM] * S[:DIM]

# Normaliseer naar een prettige schaal (-1 .. 1) voor visualisatie
max_abs = np.max(np.abs(vectors)) or 1.0
vectors = vectors / max_abs

# --- Bigram-kansen: P(volgend_woord | huidig_woord) ---
bigram_counts = defaultdict(Counter)
for s in sentences:
    for i in range(len(s) - 1):
        bigram_counts[s[i]][s[i + 1]] += 1

def compute_bigram_next(word):
    counts = bigram_counts.get(word)
    if not counts:
        return {}
    top = counts.most_common(TOP_NEXT_BIGRAM)
    kept_total = sum(c for _, c in top)
    return {w: round(c / kept_total, 4) for w, c in top}

# --- Trigram-kansen: P(volgend_woord | vorige twee woorden) ---
# Dit geeft veel scherpere, minder willekeurige overgangen dan bigrammen
# alleen, omdat de context specifieker is (2 woorden i.p.v. 1). Een
# trigram-context die te zeldzaam is (< MIN_TRIGRAM_COUNT) slaan we over
# — te weinig data om betrouwbaar te zijn, dan valt de engine terug op
# het bigram-model (zie engine.js: scoreCandidates).
trigram_counts = defaultdict(Counter)
for s in sentences:
    for i in range(len(s) - 2):
        key = s[i] + " " + s[i + 1]
        trigram_counts[key][s[i + 2]] += 1

trigrams_obj = {}
for key, counts in trigram_counts.items():
    total = sum(counts.values())
    if total < MIN_TRIGRAM_COUNT:
        continue
    top = counts.most_common(TOP_NEXT_TRIGRAM)
    kept_total = sum(c for _, c in top)
    trigrams_obj[key] = {w: round(c / kept_total, 4) for w, c in top}

print(f"Aantal bigram-contexten: {len(bigram_counts)}")
print(f"Aantal trigram-contexten (na drempel): {len(trigrams_obj)}")

# --- Zin-vectoren voor retrieval: gemiddelde van de woordvectoren per zin ---
sentence_entries = []
seen_texts = set()
for tok_sentence, orig_text in zip(sentences, orig_sentences):
    words_only = [w for w in tok_sentence if w != '.']
    if not words_only:
        continue
    if orig_text in seen_texts:
        continue  # exacte duplicaten overslaan
    seen_texts.add(orig_text)
    idxs = [vocab_index[w] for w in words_only]
    avg_vec = vectors[idxs].mean(axis=0)
    sentence_entries.append({
        "text": orig_text,
        "vector": [round(float(avg_vec[0]), 4), round(float(avg_vec[1]), 4), round(float(avg_vec[2]), 4)]
    })
print(f"Aantal opvraagbare zinnen (retrieval): {len(sentence_entries)}")

# --- Model samenstellen ---
words_obj = {}
for i, w in enumerate(vocab):
    vec = vectors[i]
    words_obj[w] = {
        "id": i,
        "freq": int(vocab_counter[w]),
        "vector": [round(float(vec[0]), 4), round(float(vec[1]), 4), round(float(vec[2]), 4)],
        "next": compute_bigram_next(w)
    }

model = {
    "meta": {
        "name": "Aurora Taalmodel NL-mini",
        "version": "1.2",
        "dimensions": DIM,
        "vocab_size": V,
        "sentence_count": len(sentence_entries),
        "trigram_context_count": len(trigrams_obj),
        "method": "co-occurrence + SVD (embeddings), trigram met bigram-backoff (kansen), zin-retrieval via cosine similarity",
        "language": "nl"
    },
    "words": words_obj,
    "trigrams": trigrams_obj,
    "sentences": sentence_entries
}

with open("model.json", "w", encoding="utf-8") as f:
    json.dump(model, f, ensure_ascii=False, indent=2)

with open("model.json", encoding="utf-8") as f:
    n_lines = sum(1 for _ in f)
print(f"model.json geschreven met {n_lines} regels, {V} woorden en {len(trigrams_obj)} trigram-contexten.")
