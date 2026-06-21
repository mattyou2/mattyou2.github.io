filename="config.js" language="javascript"]
// Supabase Configuratie
// Als je dit host via GitHub Pages/Vercel, kun je deze waarden laten vervangen door GitHub Secrets / Environment Variables.
const SUPABASE_URL = window.env?.SUPABASE_URL || "https://gscqsdztghjvlrvfhdjv.supabase.co";
const SUPABASE_ANON_KEY = window.env?.SUPABASE_ANON_KEY || "JOUW_SUPABASE_ANON_KEY_HIER";

// Initialiseer Supabase client
let supabase = null;
if (typeof supabaseJS !== 'undefined' || window.supabase) {
    const client = window.supabase || supabaseJS;
    supabase = client.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
    console.warn("Supabase SDK is nog niet geladen of geconfigureerd.");
}
