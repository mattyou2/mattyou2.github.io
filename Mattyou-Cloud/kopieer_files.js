/**
 * MATTYOU CLOUD - FILES ENGINE V3.0
 */

let cloudFiles = [];

async function syncCloudData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
        // Laad bestanden uit storage
        const { data: storageList, error: storageError } = await supabase.storage.from('files').list(user.id + '/');
        
        if (storageError) {
            console.error("Storage error:", storageError);
            return;
        }

        cloudFiles = (storageList || []).map(f => ({
            id: f.id,
            name: f.name,
            size: f.metadata?.size || 0,
            type: f.metadata?.mimetype || 'unknown',
            created_at: f.created_at,
            path: user.id + '/' + f.name
        }));

        renderFiles();
        updateStorageStats();
        updateNavBadges();
    } catch (err) {
        console.error("Sync error:", err)
    }
}

function renderFiles() {
    const list = document.getElementById('files-list');
    const noFiles = document.getElementById('no-files');
    const badge = document.getElementById('nav-file-badge');
    
    if (!list) return;
    list.innerHTML = "";
    
    if (cloudFiles.length === 0) {
        noFiles?.classList.remove('hidden');
        if (badge) badge.innerText = "0";
        return;
    }

    noFiles?.classList.add('hidden');
    if (badge) badge.innerText = cloudFiles.length;

    cloudFiles.forEach((file, index) => {
        const row = document.createElement('tr');
        row.className = "group hover:bg-slate-900/40 transition-all duration-300";
        row.style.animation = `slideUp 0.4s ease forwards ${index * 0.05}s`;
        
        const fileIcon = getFileIcon(file.type);
        
        row.innerHTML = `
            <td class="px-10 py-5">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors shadow-lg">
                        <i data-lucide="${fileIcon}" class="w-5 h-5"></i>
                    </div>
                    <div class="flex flex-col">
                        <span class="font-bold text-sm text-slate-200 truncate max-w-[200px]">${file.name}</span>
                        <span class="text-[10px] font-bold text-slate-600 uppercase tracking-widest">${file.type.split('/')[1] || 'FILE'}</span>
                    </div>
                </div>
            </td>
            <td class="px-10 py-5 text-xs font-mono font-bold text-slate-500">${formatFileSize(file.size)}</td>
            <td class="px-10 py-5 text-xs font-bold text-slate-600">${new Date(file.created_at).toLocaleDateString()}</td>
            <td class="px-10 py-5 text-right">
                <div class="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onclick="downloadFile('${file.path}', '${file.name}')" class="file-action-btn" title="Download">
                        <i data-lucide="download" class="w-4 h-4"></i>
                    </button>
                    <button onclick="deleteFile('${file.path}')" class="file-action-btn delete" title="Verwijder">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </td>
        `;
        list.appendChild(row);
    });
    
    lucide.createIcons();
}

async function handleSingleUpload(file) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    showGlobalToast(`Uploaden: ${file.name}...`, "info");
    
    // We voegen een timestamp toe om duplicaten te voorkomen
    const filePath = `${user.id}/${Date.now()}_${file.name}`;
    
    const { error } = await supabase.storage.from('files').upload(filePath, file);

    if (error) {
        showGlobalToast(`Upload mislukt: ${error.message}`, "error");
    } else {
        showGlobalToast(`${file.name} veilig opgeslagen.`, "success");
        syncCloudData();
        if (window.addActivity) addActivity(`Bestand geüpload: ${file.name}`);
    }
}

async function downloadFile(path, name) {
    try {
        const { data, error } = await supabase.storage.from('files').download(path);
        if (error) throw error;

        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showGlobalToast(`${name} is gedownload.`, "success");
    } catch (err) {
        showGlobalToast("Download mislukt.", "error");
    }
}

async function deleteFile(path) {
    if (!confirm("Weet je zeker dat je dit bestand wilt verwijderen uit de cloud?")) return;

    const { error } = await supabase.storage.from('files').remove([path]);

    if (error) {
        showGlobalToast("Verwijderen mislukt.", "error");
    } else {
        showGlobalToast("Bestand verwijderd.", "success");
        syncCloudData();
        if (window.addActivity) addActivity(`Bestand verwijderd: ${path.split('/').pop()}`);
    }
}

// Helpers
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIcon(type) {
    if (type.includes('image')) return 'image';
    if (type.includes('video')) return 'video';
    if (type.includes('audio')) return 'music';
    if (type.includes('pdf')) return 'file-text';
    if (type.includes('zip') || type.includes('compressed')) return 'archive';
    return 'file';
}

function updateStorageStats() {
    const total = cloudFiles.reduce((acc, f) => acc + (f.size || 0), 0);
    const limit = 5 * 1024 * 1024 * 1024; // 5GB Free
    const percent = Math.min((total / limit) * 100, 100);
    
    const usageEl = document.getElementById('storage-usage');
    const barEl = document.getElementById('storage-bar');
    const countEl = document.getElementById('file-count');
    
    if (usageEl) usageEl.innerHTML = `${(total / (1024 * 1024 * 1024)).toFixed(2)} <span class="text-sm font-bold text-slate-500">GB</span>`;
    if (barEl) barEl.style.width = percent + '%';
    if (countEl) countEl.innerText = cloudFiles.length;
}

function updateNavBadges() {
    const badge = document.getElementById('nav-file-badge');
    if (badge) badge.innerText = cloudFiles.length;
}

// Event Listeners for Upload
document.getElementById('header-upload-btn').onclick = () => document.getElementById('bulk-upload').click();
document.getElementById('bulk-upload').onchange = (e) => {
    Array.from(e.target.files).forEach(file => handleSingleUpload(file));
};
