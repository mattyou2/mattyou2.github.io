/**
 * Mattyou AI-brein — voorbeeld backend
 * -------------------------------------
 * Dit draait op JOUW server (nooit in de browser), omdat hier de
 * geheime keys gebruikt worden: ANTHROPIC_API_KEY, EXA_API_KEY,
 * FIRECRAWL_API_KEY, GITHUB_TOKEN, MATTYOU_CLOUD_KEY.
 *
 * Benodigd: npm install express @anthropic-ai/sdk node-fetch dotenv
 */

import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import fetch from "node-fetch";
import "dotenv/config";

const app = express();
app.use(express.json({ limit: "5mb" }));

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// -------------------------------------------------------------
// 1. SYSTEEMPROMPT — het "karakter" en de regels van de AI-bouwer
// -------------------------------------------------------------
const SYSTEM_PROMPT = `
Je bent de AI-bouwer van het Mattyou platform. Gebruikers vragen je om
een website, app of onderdeel te bouwen of aan te passen.

REGELS (verplicht):
1. Zeg NOOIT "sorry, dit snap ik niet" of iets vergelijkbaars. Probeer
   ALTIJD eerst te zoeken met exa_search en/of firecrawl_scrape naar
   een bestaande, werkende implementatie, voordat je zelf iets verzint.
2. Als je met exa_search een goede bron vindt, haal daarna met
   firecrawl_scrape de VOLLEDIGE pagina/code op — nooit alleen een
   samenvatting gebruiken om code te "verzinnen".
3. Pas de opgehaalde code aan op de wens van de gebruiker (naam, kleuren,
   teksten, structuur) en op de bestaande projectstijl.
4. Zet de aangepaste code ECHT in het project met apply_code_to_project.
   Beschrijf een wijziging nooit alleen in woorden — voer 'm uit.
5. Als de gebruiker elementen heeft getagd (zie context.tags), gaat de
   wijziging over precies die elementen.
6. Antwoord daarna kort en concreet in het Nederlands wat je hebt gedaan.
7. Weet je een klein ding niet zeker (bijv. exacte naam van een kleur)?
   Kies de meest logische aanname en ga door — vraag niet onnodig terug.
`;

// -------------------------------------------------------------
// 2. TOOLS die het taalmodel zelf mag aanroepen
// -------------------------------------------------------------
const tools = [
  {
    name: "exa_search",
    description:
      "Zoek op internet naar voorbeeldpagina's, componenten of code die passen bij wat de gebruiker vraagt. Geeft een lijst met URLs + korte beschrijvingen terug.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Zoekopdracht, bijv. 'pricing table html css tailwind'" },
        num_results: { type: "integer", default: 5 }
      },
      required: ["query"]
    }
  },
  {
    name: "firecrawl_scrape",
    description:
      "Haal de VOLLEDIGE inhoud (incl. HTML/CSS/JS) van een specifieke URL op, zodat je de echte code kan gebruiken en aanpassen.",
    input_schema: {
      type: "object",
      properties: { url: { type: "string" } },
      required: ["url"]
    }
  },
  {
    name: "github_search",
    description:
      "Zoek open-source code/componenten/repositories op GitHub die passen bij het verzoek.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"]
    }
  },
  {
    name: "apply_code_to_project",
    description:
      "Schrijf/overschrijf bestanden in het huidige project, zodat de preview direct bijwerkt. Gebruik dit ALTIJD om wijzigingen echt door te voeren.",
    input_schema: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        files: {
          type: "array",
          items: {
            type: "object",
            properties: {
              path: { type: "string", description: "bijv. index.html, styles.css" },
              content: { type: "string" }
            },
            required: ["path", "content"]
          }
        },
        summary: { type: "string", description: "Korte NL-samenvatting van de wijziging" }
      },
      required: ["project_id", "files"]
    }
  }
];

// -------------------------------------------------------------
// 3. TOOL-IMPLEMENTATIES — de échte API-calls
// -------------------------------------------------------------
async function exaSearch(query, num_results = 5) {
  const res = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: {
      "x-api-key": process.env.EXA_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query, numResults: num_results })
  });
  const data = await res.json();
  return data.results?.map(r => ({ url: r.url, title: r.title, snippet: r.text?.slice(0, 300) })) ?? [];
}

async function firecrawlScrape(url) {
  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ url, formats: ["html", "markdown"] })
  });
  const data = await res.json();
  return { html: data.data?.html ?? "", markdown: data.data?.markdown ?? "" };
}

async function githubSearch(query) {
  const res = await fetch(
    `https://api.github.com/search/code?q=${encodeURIComponent(query)}`,
    { headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } }
  );
  const data = await res.json();
  return data.items?.slice(0, 5).map(i => ({ path: i.path, repo: i.repository.full_name, url: i.html_url })) ?? [];
}

// Schrijft bestanden weg naar jouw eigen projectopslag / Mattyou Cloud.
async function applyCodeToProject(project_id, files, summary) {
  // Voorbeeld: opslaan via jouw eigen Mattyou Cloud API (server-side!).
  for (const file of files) {
    await fetch(`${process.env.MATTYOU_CLOUD_URL}/files/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MATTYOU_CLOUD_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ project_id, path: file.path, content: file.content })
    });
  }
  return { ok: true, summary, files: files.map(f => f.path) };
}

// -------------------------------------------------------------
// 4. ORCHESTRATIE — het model laten "denken en doen" via tool-loop
// -------------------------------------------------------------
async function runAiTurn({ projectId, userMessage, tags = [], history = [] }) {
  const contextNote = tags.length
    ? `\n\n[Gebruiker heeft deze elementen geselecteerd: ${tags.join(", ")}]`
    : "";

  const messages = [
    ...history,
    { role: "user", content: userMessage + contextNote }
  ];

  let response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools,
    messages
  });

  // Loop zolang het model tools wil gebruiken
  while (response.stop_reason === "tool_use") {
    const toolResults = [];

    for (const block of response.content) {
      if (block.type !== "tool_use") continue;

      let result;
      switch (block.name) {
        case "exa_search":
          result = await exaSearch(block.input.query, block.input.num_results);
          break;
        case "firecrawl_scrape":
          result = await firecrawlScrape(block.input.url);
          break;
        case "github_search":
          result = await githubSearch(block.input.query);
          break;
        case "apply_code_to_project":
          result = await applyCodeToProject(
            block.input.project_id || projectId,
            block.input.files,
            block.input.summary
          );
          break;
        default:
          result = { error: "onbekende tool" };
      }

      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: JSON.stringify(result)
      });
    }

    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });

    response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools,
      messages
    });
  }

  const finalText = response.content.find(b => b.type === "text")?.text ?? "";
  return { reply: finalText, messages: [...messages, { role: "assistant", content: response.content }] };
}

// -------------------------------------------------------------
// 5. API endpoint dat de chat-UI aanroept
// -------------------------------------------------------------
app.post("/api/chat", async (req, res) => {
  try {
    const { projectId, message, tags, history } = req.body;
    const result = await runAiTurn({ projectId, userMessage: message, tags, history });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Er ging iets mis, probeer het opnieuw." });
  }
});

app.listen(process.env.PORT || 3001, () => {
  console.log("Mattyou AI-brein draait op poort", process.env.PORT || 3001);
});
