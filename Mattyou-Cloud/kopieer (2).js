/**
 * MATTYOU CLOUD - FULL LOGIC
 * Gebruikt GitHub Secrets via Vite omgeving.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabaseClient;
let currentUser = null;
let currentFiles = [];

async function init() {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.error("Configuratie ontbreekt in Build!");
        return;
    }

    const { createClient } = window.supabase;
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

    const { data: { session } } = await supabaseClient.auth.getSession();
    handleAuthStateChange(session?.user ?? null);

    supabaseClient.auth.onAuthStateChange((_event, session) => {
        handleAuthStateChange(session?.user ?? null);
    });

    setupEventListeners();
}

function handleAuthStateChange(user) {
    currentUser = user;
    const authScreen = document.getElementById('auth-screen');
    const mainApp = document.getElementById('main-app');
    
    if (user) {
        authScreen.classList.add('hidden');
        mainApp.classList.remove('hidden');
        document.getElementById('user-email').innerText = user.email;
        document.getElementById('settings-email-display').innerText = user.email;
        document.getElementById('user-avatar').innerText = user.email[0].toUpperCase();
        loadFiles();
    } else {
        authScreen.classList.remove('hidden');
        mainApp.classList.add('hidden');
    }
}

async function loadFiles() {
    if (!currentUser) return;
    const { data, error } = await supabaseClient.storage.from('files').list(currentUser.id);
    if (error) return console.error(error);
    
    currentFiles = data.map(f => ({
        filename: f.name,
        size: f.metadata.size,
        created_at: f.created_at,
        storage_path: currentUser.id + '/' + f.name
    }));
    
    updateUI();
}

function updateUI() {
    const totalSize = currentFiles.reduce((acc, f) => acc + (f.size || 0), 0);
    const sizeGB = (totalSize / (1024 * 1024 * 1024)).toFixed(2);
    const usagePercent = Math.min((totalSize / (5 * 1024 * 1024 * 1024)) * 100, 100);

    document.getElementById('storage-usage').innerText = `${sizeGB} GB`;
    document.getElementById('storage-bar').style.width = `${usagePercent}%`;
    document.getElementById('file-count').innerText = currentFiles.length;

    const tbody = document.getElementById('files-tbody');
    tbody.innerHTML = currentFiles.map(f => `
        <tr class="border-b border-slate-800/50 hover:bg-slate-900/50 transition-colors">
            <td class="px-8 py-4 text-sm font-medium">${f.filename}</td>
            <td class="px-8 py-4 text-xs text-slate-500">${formatBytes(f.size)}</td>
            <td class="px-8 py-4 text-right">
                <button onclick="downloadFile('${f.storage_path}', '${f.filename}')" class="text-blue-500 hover:text-blue-400 p-2"><i data-lucide="download" class="w-4 h-4"></i></button>
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
}

async function handleFileUpload(e) {
    const files = e.target.files;
    if (!files.length) return;
    
    for (const file of files) {
        const path = `${currentUser.id}/${file.name}`;
        await supabaseClient.storage.from('files').upload(path, file);
    }
    showToast('Bestanden geüpload!');
    loadFiles();
}

async function downloadFile(path, filename) {
    const { data } = await supabaseClient.storage.from('files').download(path);
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
}

async function handleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const isReg = document.getElementById('auth-submit').innerText === 'Registreren';
    
    const { error } = isReg 
        ? await supabaseClient.auth.signUp({ email, password })
        : await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
        const errDiv = document.getElementById('auth-error');
        errDiv.innerText = error.message;
        errDiv.classList.remove('hidden');
    }
}

async function handleLogout() {
    await supabaseClient.auth.signOut();
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById(`page-${pageId}`).classList.remove('hidden');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector(`[data-page="${pageId}"]`).classList.add('active');
}

function setupEventListeners() {
    document.getElementById('auth-form').addEventListener('submit', handleAuth);
    document.getElementById('file-upload-input').addEventListener('change', handleFileUpload);
    document.querySelectorAll('.nav-link').forEach(l => {
        l.onclick = (e) => { e.preventDefault(); showPage(l.dataset.page); };
    });
    document.getElementById('toggle-auth').onclick = () => {
        const btn = document.getElementById('auth-submit');
        btn.innerText = btn.innerText === 'Inloggen' ? 'Registreren' : 'Inloggen';
    };
}

function formatBytes(b) {
    if (!b) return '0 B';
    const i = Math.floor(Math.log(b) / Math.log(1024));
    return (b / Math.pow(1024, i)).toFixed(1) + ' ' + ['B', 'KB', 'MB', 'GB'][i];
}

function showToast(m) {
    const t = document.getElementById('toast');
    document.getElementById('toast-msg').innerText = m;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

init();
