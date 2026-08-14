/**
 * Mattyou Cloud & Accounts — voorbeeld backend
 * ----------------------------------------------
 * Draait server-side. Gebruikt jouw bestaande Mattyou Cloud API
 * (tekstmappen voor users/shares/published_projects, filemappen
 * voor de daadwerkelijke projectbestanden).
 *
 * Benodigd: npm install express jsonwebtoken node-fetch dotenv
 * .env: MATTYOU_CLOUD_URL, MATTYOU_CLOUD_KEY, JWT_SECRET
 */

import express from "express";
import jwt from "jsonwebtoken";
import fetch from "node-fetch";
import crypto from "crypto";
import "dotenv/config";

const app = express();
app.use(express.json());

const CLOUD_URL = process.env.MATTYOU_CLOUD_URL; // bv. https://qzqncoebdglqbivmlbla.supabase.co/functions/v1/api
const CLOUD_KEY = process.env.MATTYOU_CLOUD_KEY; // NOOIT naar de browser sturen
const JWT_SECRET = process.env.JWT_SECRET;

function cloud(path, options = {}) {
  return fetch(`${CLOUD_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${CLOUD_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  }).then(r => r.json());
}

// -------------------------------------------------------------
// Vaste tekstmappen aanmaken (eenmalig nodig, hier idempotent)
// -------------------------------------------------------------
let folderIds = { users: null, shares: null, published: null };

async function ensureTextFolders() {
  const names = { users: "users", shares: "shares", published: "published_projects" };
  for (const key of Object.keys(names)) {
    const created = await cloud("/text/folders", {
      method: "POST",
      body: JSON.stringify({ name: names[key], parent_id: null })
    });
    folderIds[key] = created.id || created.folder?.id;
  }
}
ensureTextFolders();

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const check = crypto.scryptSync(password, salt, 64).toString("hex");
  return check === hash;
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Niet ingelogd" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Sessie verlopen, log opnieuw in" });
  }
}

// -------------------------------------------------------------
// REGISTREREN
// -------------------------------------------------------------
app.post("/api/auth/register", async (req, res) => {
  const { username, email, password } = req.body;

  const existing = await cloud(`/text/folders/${folderIds.users}/entries`);
  if (existing.entries?.some(e => e.name === username)) {
    return res.status(409).json({ error: "Gebruikersnaam bestaat al" });
  }

  const entry = await cloud(`/text/folders/${folderIds.users}/entries`, {
    method: "POST",
    body: JSON.stringify({
      name: username,
      content: [
        `Username: ${username}`,
        `Email: ${email}`,
        `Password: ${hashPassword(password)}`,
        `Created: ${new Date().toISOString()}`
      ].join("\n"),
      tags: ["user"]
    })
  });

  const token = jwt.sign({ userId: entry.id, username }, JWT_SECRET, { expiresIn: "30d" });
  res.json({ token, username });
});

// -------------------------------------------------------------
// INLOGGEN
// -------------------------------------------------------------
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  const { entries } = await cloud(`/text/folders/${folderIds.users}/entries`);
  const userEntry = entries?.find(e => e.name === username);
  if (!userEntry) return res.status(401).json({ error: "Onbekende gebruikersnaam" });

  const storedHash = userEntry.content.match(/Password: (.+)/)?.[1];
  if (!verifyPassword(password, storedHash)) {
    return res.status(401).json({ error: "Wachtwoord klopt niet" });
  }

  const token = jwt.sign({ userId: userEntry.id, username }, JWT_SECRET, { expiresIn: "30d" });
  res.json({ token, username });
});

// -------------------------------------------------------------
// PROJECT OPSLAAN (auto naar eigen local storage gebeurt in de
// frontend zelf; dit endpoint is de EXTRA "opslaan in cloud"-knop)
// -------------------------------------------------------------
app.post("/api/projects/:id/save-to-cloud", authMiddleware, async (req, res) => {
  const { files, title } = req.body;
  const folder = await cloud("/folders", {
    method: "POST",
    body: JSON.stringify({ name: `${req.user.username}-${req.params.id}`, parent_id: null })
  });

  for (const file of files) {
    const form = new FormData();
    form.append("file", new Blob([file.content]), file.path);
    form.append("folder_id", folder.id);
    await fetch(`${CLOUD_URL}/files/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${CLOUD_KEY}` },
      body: form
    });
  }

  res.json({ ok: true, cloudFolderId: folder.id, title });
});

// -------------------------------------------------------------
// PUBLICEREN — zichtbaar maken op de ontdek-pagina
// -------------------------------------------------------------
app.post("/api/projects/:id/publish", authMiddleware, async (req, res) => {
  const { title, description, previewUrl } = req.body;

  const entry = await cloud(`/text/folders/${folderIds.published}/entries`, {
    method: "POST",
    body: JSON.stringify({
      name: `${req.params.id}`,
      content: [
        `Titel: ${title}`,
        `Beschrijving: ${description}`,
        `Auteur: ${req.user.username}`,
        `Preview: ${previewUrl}`,
        `Gepubliceerd: ${new Date().toISOString()}`
      ].join("\n"),
      tags: ["published"]
    })
  });

  res.json({ ok: true, publishedId: entry.id });
});

// -------------------------------------------------------------
// ONTDEKKEN — zoeken tussen gepubliceerde projecten
// -------------------------------------------------------------
app.get("/api/discover", async (req, res) => {
  const q = (req.query.q || "").toLowerCase();
  const { entries } = await cloud(`/text/folders/${folderIds.published}/entries`);

  const results = (entries || [])
    .filter(e => e.content.toLowerCase().includes(q))
    .map(e => ({
      id: e.name,
      title: e.content.match(/Titel: (.+)/)?.[1],
      description: e.content.match(/Beschrijving: (.+)/)?.[1],
      author: e.content.match(/Auteur: (.+)/)?.[1],
      preview: e.content.match(/Preview: (.+)/)?.[1]
    }));

  res.json({ results });
});

// -------------------------------------------------------------
// DELEN — met een specifieke gebruiker, met optioneel berichtje
// -------------------------------------------------------------
app.post("/api/projects/:id/share", authMiddleware, async (req, res) => {
  const { toUsername, message } = req.body;

  const entry = await cloud(`/text/folders/${folderIds.shares}/entries`, {
    method: "POST",
    body: JSON.stringify({
      name: `${req.user.username}->${toUsername}-${req.params.id}`,
      content: [
        `Van: ${req.user.username}`,
        `Naar: ${toUsername}`,
        `Project: ${req.params.id}`,
        `Berichtje: ${message || ""}`,
        `Verzonden: ${new Date().toISOString()}`
      ].join("\n"),
      tags: ["share", toUsername]
    })
  });

  res.json({ ok: true, shareId: entry.id });
});

// Binnenkomende shares ophalen voor de ingelogde gebruiker
app.get("/api/shares/inbox", authMiddleware, async (req, res) => {
  const { entries } = await cloud(`/text/folders/${folderIds.shares}/entries`);
  const mine = (entries || []).filter(e => e.tags?.includes(req.user.username));
  res.json({ shares: mine });
});

// Gebruikers zoeken (voor de "deel met" zoekbalk)
app.get("/api/users/search", authMiddleware, async (req, res) => {
  const q = (req.query.q || "").toLowerCase();
  const { entries } = await cloud(`/text/folders/${folderIds.users}/entries`);
  const results = (entries || [])
    .filter(e => e.name.toLowerCase().includes(q))
    .map(e => ({ username: e.name }))
    .slice(0, 10);
  res.json({ results });
});

app.listen(process.env.PORT || 3002, () => {
  console.log("Mattyou Cloud & Accounts draait op poort", process.env.PORT || 3002);
});
