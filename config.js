filename="config.js" language="javascript"]
// --- CONFIGURATIE MY DEVABLE ---

const SUPABASE_URL = "https://gscqsdztghjvlrvfhdjv.supabase.co";
const SUPABASE_ANON_KEY = "JOUW_SUPABASE_ANON_KEY_HIER"; // Vervang dit door je echte sleutel als je live gaat!

let supabase = null;
let MOCK_MODE = false;

// Controleer of de Supabase SDK geladen is en of we een geldige sleutel hebben
if (typeof supabaseJS !== 'undefined' || window.supabase) {
    const client = window.supabase || supabaseJS;
    
    if (SUPABASE_ANON_KEY === "JOUW_SUPABASE_ANON_KEY_HIER" || !SUPABASE_ANON_KEY) {
        console.warn("My Devable draait in MOCK-modus (Lokale Database) omdat er geen geldige Supabase Anon Key is ingevuld.");
        MOCK_MODE = true;
    } else {
        try {
            supabase = client.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log("My Devable succesvol verbonden met live Supabase database!");
        } catch (e) {
            console.error("Fout bij initialiseren Supabase client. Schakelt over naar Mock-modus.", e);
            MOCK_MODE = true;
        }
    }
} else {
    console.warn("Supabase SDK niet gedetecteerd. Schakelt over naar Mock-modus.");
    MOCK_MODE = true;
}

// --- MOCK DATABASE IMPLEMENTATIE (Voor direct testen zonder database setup!) ---
const getMockDB = () => {
    let db = localStorage.getItem("devable_mock_db");
    if (!db) {
        db = {
            users: [],
            profiles: [],
            schools: [
                { id: "s1", name: "Devable High School" },
                { id: "s2", name: "Coder Academy" }
            ],
            classes: [
                { id: "c1", name: "Klas 4A (Skript)", teacher_id: "mock-teacher-id" }
            ],
            session: null
        };
        localStorage.setItem("devable_mock_db", JSON.stringify(db));
    } else {
        db = JSON.parse(db);
    }
    return db;
};

const saveMockDB = (db) => {
    localStorage.setItem("devable_mock_db", JSON.stringify(db));
};
