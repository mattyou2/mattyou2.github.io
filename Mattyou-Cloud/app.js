// CONFIGURATIE (Pas dit aan of laat de app erom vragen)
let SUPABASE_URL = localStorage.getItem('SB_URL') || '';
let SUPABASE_KEY = localStorage.getItem('SB_KEY') || '';

const appDiv = document.getElementById('app');

function init() {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
        showSetup();
    } else {
        startDashboard();
    }
}

function showSetup() {
    appDiv.innerHTML = `
        <div class="max-w-md mx-auto mt-20 glass p-8 rounded-3xl shadow-2xl">
            <h1 class="text-2xl font-bold mb-2">Mattyou Cloud Setup</h1>
            <p class="text-slate-400 mb-6 text-sm">Voer je Supabase gegevens in om te beginnen.</p>
            <div class="space-y-4">
                <input type="text" id="url" placeholder="Supabase Project URL" class="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 outline-none focus:border-blue-500">
                <input type="password" id="key" placeholder="Anon API Key" class="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 outline-none focus:border-blue-500">
                <button onclick="saveConfig()" class="w-full bg-blue-600 hover:bg-blue-700 p-4 rounded-xl font-bold transition-all transform hover:scale-[1.02]">Start Mattyou Cloud</button>
            </div>
        </div>
    `;
}

function saveConfig() {
    const url = document.getElementById('url').value;
    const key = document.getElementById('key').value;
    if (url && key) {
        localStorage.setItem('SB_URL', url);
        localStorage.setItem('SB_KEY', key);
        location.reload();
    }
}

async function startDashboard() {
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    
    // Check inlogstatus
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        showLogin(supabase);
    } else {
        showMain(supabase, user);
    }
}

function showLogin(supabase) {
    appDiv.innerHTML = `
        <div class="max-w-md mx-auto mt-20 glass p-8 rounded-3xl text-center">
            <h1 class="text-3xl font-bold mb-6">Welkom bij Mattyou</h1>
            <button onclick="loginGoogle()" class="w-full bg-white text-black p-4 rounded-xl font-bold mb-4 flex items-center justify-center gap-2">
                Log in met Google
            </button>
            <p class="text-slate-500 text-xs">Je data is veilig versleuteld.</p>
        </div>
    `;
}

async function showMain(supabase, user) {
    appDiv.innerHTML = `
        <div class="max-w-6xl mx-auto">
            <header class="flex justify-between items-center mb-8 glass p-6 rounded-2xl">
                <h1 class="text-2xl font-bold">Mattyou <span class="text-blue-500">Cloud</span></h1>
                <div class="flex items-center gap-4">
                    <span class="text-sm text-slate-400 hidden md:block">${user.email}</span>
                    <button onclick="logout()" class="text-red-400 text-sm hover:underline">Uitloggen</button>
                </div>
            </header>

            <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                <!-- Sidebar -->
                <div class="glass p-6 rounded-2xl h-fit">
                    <button class="w-full bg-blue-600 p-3 rounded-xl font-bold mb-6">+ Upload Bestands</button>
                    <nav class="space-y-2">
                        <div class="p-2 bg-blue-500/10 text-blue-400 rounded-lg">Mijn Bestanden</div>
                        <div class="p-2 hover:bg-slate-800 rounded-lg cursor-pointer">Gedeeld</div>
                        <div class="p-2 hover:bg-slate-800 rounded-lg cursor-pointer">Prullenbak</div>
                    </nav>
                </div>

                <!-- Main Content -->
                <div class="md:col-span-3 glass p-6 rounded-2xl min-h-[500px]">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-xl font-semibold">Recente Bestanden</h2>
                        <input type="text" placeholder="Zoeken..." class="bg-slate-800 border-none rounded-lg p-2 text-sm">
                    </div>
                    
                    <div class="flex flex-col items-center justify-center h-[300px] text-slate-600">
                        <svg class="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        <p>Nog geen bestanden geüpload.</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function logout() {
    localStorage.clear();
    location.reload();
}

init();
