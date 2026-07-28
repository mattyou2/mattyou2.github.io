/**
 * ui.js — De interactielaag van Aurora
 * -------------------------------------
 * Regelt: het opvangen van invoer, het live streamen van gegenereerde
 * woorden in de chat, en het oplichten van de actieve berekening in de
 * datamatrix-sectie. Bevat zelf geen wiskunde — dat staat uitsluitend
 * in engine.js.
 */

const els = {
  status: document.getElementById("status"),
  chat: document.getElementById("chat"),
  form: document.getElementById("composer"),
  input: document.getElementById("user-input"),
  sendBtn: document.getElementById("send-btn"),
  matrix: document.getElementById("matrix-body"),
  contextVector: document.getElementById("context-vector"),
  activeWord: document.getElementById("active-word"),
  stepCounter: document.getElementById("step-counter"),
  vocabSize: document.getElementById("vocab-size"),
  modelName: document.getElementById("model-name"),
};

function setStatus(text, mode = "idle") {
  els.status.textContent = text;
  els.status.dataset.mode = mode;
}

function addMessage(role, text = "") {
  const wrapper = document.createElement("div");
  wrapper.className = `msg msg--${role}`;

  const avatar = document.createElement("div");
  avatar.className = "msg__avatar";
  avatar.textContent = role === "user" ? "JIJ" : "AU";

  const bubble = document.createElement("div");
  bubble.className = "msg__bubble";
  bubble.textContent = text;

  wrapper.appendChild(avatar);
  wrapper.appendChild(bubble);
  els.chat.appendChild(wrapper);
  els.chat.scrollTop = els.chat.scrollHeight;
  return bubble;
}

function formatVec(v) {
  return `[${v.map(n => n.toFixed(2)).join(", ")}]`;
}

/** Bouwt de rijen van de live datamatrix voor één generatiestap. */
function renderMatrixStep(stepInfo) {
  els.matrix.innerHTML = "";
  els.activeWord.textContent = stepInfo.from;
  els.stepCounter.textContent = stepInfo.step;
  els.contextVector.textContent = formatVec(stepInfo.contextVector);

  const maxScore = Math.max(...stepInfo.candidates.map(c => c.score), 0.0001);

  stepInfo.candidates.forEach((c, idx) => {
    const row = document.createElement("div");
    row.className = "matrix-row" + (c.word === stepInfo.chosen.word ? " matrix-row--chosen" : "");
    row.style.setProperty("--delay", `${idx * 35}ms`);

    const label = document.createElement("div");
    label.className = "matrix-row__label";
    label.textContent = c.word;

    const barTrack = document.createElement("div");
    barTrack.className = "matrix-row__track";
    const bar = document.createElement("div");
    bar.className = "matrix-row__bar";
    const pct = Math.max(4, (c.score / maxScore) * 100);
    barTrack.appendChild(bar);
    // Animeer de breedte na het toevoegen aan de DOM.
    requestAnimationFrame(() => { bar.style.width = pct + "%"; });

    const score = document.createElement("div");
    score.className = "matrix-row__score";
    score.textContent = `cos ${c.similarity.toFixed(2)} · P ${c.bigram.toFixed(2)}`;

    row.appendChild(label);
    row.appendChild(barTrack);
    row.appendChild(score);
    els.matrix.appendChild(row);
  });
}

function clearMatrix() {
  els.matrix.innerHTML = `<p class="matrix-empty">Wacht op invoer…</p>`;
  els.activeWord.textContent = "—";
  els.stepCounter.textContent = "0";
  els.contextVector.textContent = "—";
}

let isGenerating = false;

async function handleSubmit(evt) {
  evt.preventDefault();
  if (isGenerating) return;

  const value = els.input.value.trim();
  if (!value) return;

  addMessage("user", value);
  els.input.value = "";
  isGenerating = true;
  els.sendBtn.disabled = true;
  setStatus("Aan het rekenen…", "busy");

  const bubble = addMessage("assistant", "");
  bubble.classList.add("msg__bubble--streaming");
  let streamed = "";

  try {
    const { text } = await auroraEngine.generate(value, {
      maxWords: 26,
      delayMs: 130,
      onStep: async (stepInfo) => {
        renderMatrixStep(stepInfo);
        const word = stepInfo.chosen.word;
        streamed += (streamed && word !== "." ? " " : "") + (word === "." ? "." : word);
        const display = streamed.charAt(0).toUpperCase() + streamed.slice(1).replace(/\s+\./g, ".");
        bubble.textContent = display;
        els.chat.scrollTop = els.chat.scrollHeight;
      }
    });
    bubble.textContent = text;
  } catch (err) {
    bubble.textContent = "Er ging iets mis tijdens het genereren.";
    console.error(err);
  } finally {
    bubble.classList.remove("msg__bubble--streaming");
    isGenerating = false;
    els.sendBtn.disabled = false;
    setStatus("Klaar — stel gerust een volgende vraag.", "idle");
    els.input.focus();
  }
}

async function init() {
  clearMatrix();
  setStatus("Model wordt geladen…", "busy");
  try {
    const meta = await auroraEngine.load("model.json");
    els.modelName.textContent = meta.name;
    els.vocabSize.textContent = meta.vocab_size.toLocaleString("nl-NL");
    setStatus("Model geladen — typ iets om te beginnen.", "idle");
    addMessage(
      "assistant",
      "Hallo, ik ben Aurora. Ik genereer tekst met cosine similarity en bigram-kansen — geen externe API's, alles lokaal in je browser. Typ een zin om te beginnen."
    );
  } catch (err) {
    console.error(err);
    setStatus("Kon model.json niet laden. Draai een lokale server (zie README).", "error");
    addMessage(
      "assistant",
      "Ik kon model.json niet laden. Dit gebeurt meestal wanneer je index.html rechtstreeks vanaf schijf opent. Start een lokale server — zie de instructies die bij dit project horen."
    );
  }
  els.form.addEventListener("submit", handleSubmit);
}

document.addEventListener("DOMContentLoaded", init);
