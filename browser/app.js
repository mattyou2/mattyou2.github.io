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

export async function isAdmin() {
  const session = await getSession();
  if (!session) return false;
  const { data, error } = await supabase.rpc('is_admin');
  if (error) return false;
  return !!data;
}

export async function signUp(email, password) {
  return supabase.auth.signUp({ email, password });
}

export async function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
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
    el.innerHTML = `<a class="btn btn-ghost" href="browser/dashboard.html">Inloggen</a>
                     <a class="btn btn-primary" href="browser/dashboard.html?tab=register">Domein registreren</a>`;
    return;
  }
  const admin = await isAdmin();
  el.innerHTML = `${admin ? '<span class="badge-admin">ADMIN</span>' : ''}
                   <a class="btn btn-ghost" href="browser/dashboard.html">Dashboard</a>`;
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
