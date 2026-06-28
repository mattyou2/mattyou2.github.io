// =============================================
// SUPABASE CONFIGURATIE
// Vul hier jouw Supabase project gegevens in
// De 'anon' key is veilig om publiek te tonen
// Ga naar: https://supabase.com/dashboard/project/_/settings/api
// =============================================

const SUPABASE_URL = 'JOUW_SUPABASE_URL_HIER';
const SUPABASE_ANON_KEY = 'JOUW_SUPABASE_ANON_KEY_HIER';

// Initialiseer Supabase client
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
