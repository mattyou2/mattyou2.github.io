const SUPABASE_URL = 'https://hydnkvuhuoyqeusjlwyr.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5ZG5rdnVodW95cWV1c2psd3lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2MzU1MzgsImV4cCI6MjA5ODIxMTUzOH0.eVc879oP59tw4NbIa3r-xcrJNMmH57Cw7toZmehOIpA';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
