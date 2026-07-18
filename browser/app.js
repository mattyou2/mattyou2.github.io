// ============================================================
// BROWSEPORT — shared app module
// Supabase client + auth helpers + kleine UI-utilities.
// Wordt geïmporteerd als ES module: <script type="module" src="app.js">
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// --- Supabase project "Domainport" ---
export const SUPABASE_URL = 'https://puljajfgjyzipgdrvioy.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1bGphamZnanl6aXBnZHJ2aW95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzNjU1NDUsImV4cCI6MjA5OTk0MTU0NX0.F9r4TxzjfOLieUaslnvG8cwgKPlEjSrWEPCHM2miJtU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

export const ADMIN_EMAILS = ['treurmattheo@gmail.com', 'mattyougaming@gmail.com'];

// ------------------------------------------------------------
// Domeinnaam-validatie/normalisatie (client-side spiegel van de
// database check-constraint, voor snelle feedback in formulieren)
// ------------------------------------------------------------
const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;

export function normalizeDomain(raw) {
  return (raw || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
}

export function isValidDomain(raw) {
  return DOMAIN_RE.test(normalizeDomain(raw));
}

// ------------------------------------------------------------
// Auth helpers
// ------------------------------------------------------------
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getCurrentEmail() {
  const session = await getSession();
  return session?.user?.email || null;
}

// True account privilege — always reflects the database, never the
// client-side "preview as normal user" override below.
export async function isAdmin() {
  const session = await getSession();
  if (!session) return false;
  const { data, error } = await supabase.rpc('is_admin');
  if (error) return false;
  return !!data;
}

export async function signUp(email, password) {
  return supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: window.location.origin + window.location.pathname.replace(/[^/]*$/, '') + 'dashboard.html' },
  });
}

export async function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function resetPassword(email) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname.replace(/[^/]*$/, '') + 'dashboard.html',
  });
}

// ------------------------------------------------------------
// Admin "preview as normal user" toggle
// ------------------------------------------------------------
// Puur cosmetisch/UI-niveau: schakelt de adminweergave uit zodat een
// admin-account precies kan zien wat een gewone bezoeker ziet, zonder
// echt uit te loggen. De database-rechten (RLS) blijven ongewijzigd —
// dit bepaalt alleen wat de front-end laat zien.
const ADMIN_PREVIEW_KEY = 'browseport_admin_preview_off';

export function isAdminPreviewDisabled() {
  return localStorage.getItem(ADMIN_PREVIEW_KEY) === '1';
}

export function setAdminPreviewDisabled(off) {
  if (off) localStorage.setItem(ADMIN_PREVIEW_KEY, '1');
  else localStorage.removeItem(ADMIN_PREVIEW_KEY);
}

// Wat de UI daadwerkelijk mag tonen: waar-admin EN niet handmatig verborgen.
export async function effectiveIsAdmin() {
  const real = await isAdmin();
  if (!real) return false;
  return !isAdminPreviewDisabled();
}

// ------------------------------------------------------------
// Toast
// ------------------------------------------------------------
let toastTimer = null;
export function toast(message, type = '') {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

// ------------------------------------------------------------
// Topbar: rendert login-status in elke pagina die #topbar-actions heeft
// ------------------------------------------------------------
export async function renderTopbarAuth() {
  const el = document.getElementById('topbar-actions');
  if (!el) return;
  const session = await getSession();
  if (!session) {
    el.innerHTML = `<a class="btn btn-ghost" href="dashboard.html">Inloggen</a>
                     <a class="btn btn-primary" href="dashboard.html?tab=register">Domein registreren</a>`;
    return;
  }
  const admin = await effectiveIsAdmin();
  el.innerHTML = `${admin ? '<span class="badge-admin">ADMIN</span>' : ''}
                   <a class="btn btn-ghost" href="dashboard.html">Dashboard</a>`;
}

// ------------------------------------------------------------
// Publieke domein-directory (voor de homepage showcase)
// ------------------------------------------------------------
export async function fetchPublicDomains(limit = 6) {
  const { data, error } = await supabase
    .from('domains')
    .select('domain_name, description, is_hosted, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return { domains: [], error };
  return { domains: data || [], error: null };
}

export async function fetchDomainStats() {
  const { count: totalCount } = await supabase.from('domains').select('*', { count: 'exact', head: true });
  const { count: hostedCount } = await supabase.from('domains').select('*', { count: 'exact', head: true }).eq('is_hosted', true);
  return { total: totalCount || 0, hosted: hostedCount || 0 };
}

// ------------------------------------------------------------
// Starter-sjabloon voor nieuwe gehoste sites
// Zodat "ik heb nog geen site" nooit een doodlopend leeg scherm is —
// één klik zet een compleet, werkend 3-bestanden-sitetje neer.
// ------------------------------------------------------------
export function starterTemplateFiles(domainName) {
  const title = domainName || 'mijn-site';
  const html = `<!doctype html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
  <main>
    <h1>Welkom op ${title}</h1>
    <p>Deze site draait op <strong>Browseport</strong> — bewerk <code>index.html</code>,
       <code>style.css</code> en <code>script.js</code> in het dashboard om 'm te maken tot wat je wil.</p>
    <button id="hi-btn">Zeg hoi</button>
  </main>
  <script src="script.js"></script>
</body>
</html>`;

  const css = `body {
  margin: 0;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: system-ui, sans-serif;
  background: #101828;
  color: #eef1f6;
}
main { max-width: 560px; padding: 40px; text-align: center; }
h1 { font-size: 32px; margin-bottom: 12px; }
p { color: #b7c0cf; line-height: 1.6; }
code { background: #1c2536; padding: 2px 6px; border-radius: 4px; }
button {
  margin-top: 20px;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: #00c48c;
  color: #05261c;
  font-weight: 700;
  cursor: pointer;
}
button:hover { background: #00e0a1; }`;

  const js = `document.getElementById('hi-btn').addEventListener('click', () => {
  alert('Hoi! 👋 Deze site is live via Browseport.');
});`;

  return [
    { file_path: 'index.html', content: html, mime_type: 'text/html' },
    { file_path: 'style.css', content: css, mime_type: 'text/css' },
    { file_path: 'script.js', content: js, mime_type: 'application/javascript' },
  ];
}

// ------------------------------------------------------------
// PWA install-knop
// Verzamelt het beforeinstallprompt-event en toont/activeert
// elke knop met [data-install-btn] op de pagina.
// ------------------------------------------------------------
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  document.querySelectorAll('[data-install-btn]').forEach((btn) => {
    btn.hidden = false;
  });
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  document.querySelectorAll('[data-install-btn]').forEach((btn) => { btn.hidden = true; });
  toast('Browseport is geïnstalleerd ✓', 'success');
});

export function wireInstallButtons() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  document.querySelectorAll('[data-install-btn]').forEach((btn) => {
    if (isStandalone) { btn.hidden = true; return; }
    btn.addEventListener('click', async () => {
      if (!deferredInstallPrompt) {
        toast('Gebruik het installeer-icoon in je browser-adresbalk, of "Toevoegen aan beginscherm" in het browsermenu.');
        return;
      }
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
    });
  });
}

// ------------------------------------------------------------
// Service worker registratie
// ------------------------------------------------------------
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {
        /* stil falen — PWA-installatie is een progressive enhancement */
      });
    });
  }
}

// ------------------------------------------------------------
// Kleine helper: debounce
// ------------------------------------------------------------
export function debounce(fn, ms = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// ------------------------------------------------------------
// MIME-type raden op basis van bestandsextensie (voor site_files)
// ------------------------------------------------------------
export function guessMimeType(path) {
  const ext = path.split('.').pop().toLowerCase();
  const map = {
    html: 'text/html', htm: 'text/html',
    css: 'text/css',
    js: 'application/javascript', mjs: 'application/javascript',
    json: 'application/json',
    svg: 'image/svg+xml',
    txt: 'text/plain',
    md: 'text/markdown',
    xml: 'application/xml',
  };
  return map[ext] || 'text/plain';
}
