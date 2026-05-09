/**
 * MATTYOU CLOUD - AUTH CORE V3.0
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabase;

async function initAuth() {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
        showGlobalToast("Configuratie fout. Cloud engine niet gevonden.", "error");
        return;
    }

    const { createClient } = window.supabase;
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Initial session check
    const { data: { session } } = await supabase.auth.getSession();
    handleAuthState(session?.user ?? null);

    // Live auth monitoring
    supabase.auth.onAuthStateChange((event, session) => {
        console.log(`Auth Event: ${event}`);
        handleAuthState(session?.user ?? null);
    });

    // Form submission
    document.getElementById('auth-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const submitBtn = document.getElementById('auth-submit');
        const isRegister = submitBtn.innerText.includes('Registreren');
        const errorDiv = document.getElementById('auth-error');

        errorDiv.classList.add('hidden');
        submitBtn.disabled = true;
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>';

        try {
            let result;
            if (isRegister) {
                result = await supabase.auth.signUp({ email, password });
                if (result.data.user && !result.data.session) {
                    showGlobalToast("Bevestig je e-mail om verder te gaan.", "info");
                }
            } else {
                result = await supabase.auth.signInWithPassword({ email, password });
            }

            if (result.error) throw result.error;
        } catch (error) {
            errorDiv.innerText = error.message;
            errorDiv.classList.remove('hidden');
            errorDiv.classList.add('shake-anim');
            setTimeout(() => errorDiv.classList.remove('shake-anim'), 500);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });

    // Toggle register/login
    document.getElementById('toggle-auth').addEventListener('click', () => {
        const btn = document.getElementById('auth-submit');
        const toggle = document.getElementById('toggle-auth');
        const title = document.querySelector('#auth-screen h1').nextElementSibling;
        
        if (btn.innerText.includes('Inloggen')) {
            btn.innerHTML = 'Registreren <i data-lucide="user-plus" class="w-4 h-4"></i>';
            toggle.innerText = 'Al een account? Log hier in';
            title.innerText = 'Maak een nieuw account aan';
        } else {
            btn.innerHTML = 'Inloggen <i data-lucide="arrow-right" class="w-4 h-4"></i>';
            toggle.innerText = 'Nog geen account? Maak er een aan';
            title.innerText = 'Beveiligde toegang tot je digitale leven';
        }
        lucide.createIcons();
    });
}

function handleAuthState(user) {
    const authScreen = document.getElementById('auth-screen');
    const mainApp = document.getElementById('main-app');
    
    if (user) {
        authScreen.classList.add('hidden');
        mainApp.classList.remove('hidden');
        
        // Update user UI
        document.getElementById('user-email').innerText = user.email;
        document.getElementById('user-avatar').innerText = user.email[0].toUpperCase();
        
        // Load data
        syncCloudData();
    } else {
        authScreen.classList.remove('hidden');
        mainApp.classList.add('hidden');
    }
}

async function handleLogout() {
    await supabase.auth.signOut();
    showGlobalToast("Je bent veilig uitgelogd.", "success");
}

// Global Toast System
function showGlobalToast(msg, type = "info") {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast-msg flex items-center gap-4 p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-huge min-w-[300px] border-l-4 ${type === 'error' ? 'border-l-red-500' : type === 'success' ? 'border-l-emerald-500' : 'border-l-blue-500'}`;
    
    const icon = type === 'error' ? 'alert-circle' : type === 'success' ? 'check-circle' : 'info';
    const color = type === 'error' ? 'text-red-500' : type === 'success' ? 'text-emerald-500' : 'text-blue-500';

    toast.innerHTML = `
        <div class="p-2 rounded-xl bg-slate-950 border border-slate-800 ${color}">
            <i data-lucide="${icon}" class="w-5 h-5"></i>
        </div>
        <div class="flex-1">
            <p class="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">${type}</p>
            <p class="text-sm font-bold text-slate-200">${msg}</p>
        </div>
    `;

    container.appendChild(toast);
    lucide.createIcons();

    setTimeout(() => {
        toast.classList.add('closing');
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

initAuth();
