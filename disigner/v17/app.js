// --- STATE MANAGEMENT ---
let projectName = "Mijn Website";
let pages = []; // Array van pagina objecten: { id, name, elements: [] }
let activePageId = "";
let selectedElementId = null;

// Global settings
let webBgColor = "#0b0f19";
let webParticlesBg = false;

// Drag & Drop State
let isDragging = false;
let dragStartX, dragStartY;
let dragStartLeft, dragStartTop;

// --- INITIALIZATION ---
function init() {
    // Lees URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const projectParam = urlParams.get('project');
    if (projectParam) {
        projectName = projectParam;
    }

    document.getElementById('current-project-display').innerText = projectName;

    // Laad project uit LocalStorage of laad default
    loadProject();

    // Setup global inputs
    document.getElementById('web-bg-color').value = webBgColor;
    document.getElementById('web-particles-bg').checked = webParticlesBg;
    updateCanvasStyle();

    // Klik buiten element deselecteert
    document.getElementById('website-canvas').addEventListener('click', (e) => {
        if (e.target === document.getElementById('website-canvas')) {
            deselectElement();
        }
    });

    // Window resize handler
    window.addEventListener('resize', () => {
        // Eventuele herberekeningen
    });
}

// --- PROJECT STORAGE ---
function saveProject() {
    const projectData = {
        projectName,
        webBgColor,
        webParticlesBg,
        pages
    };
    localStorage.setItem(`web3d_project_${projectName}`, JSON.stringify(projectData));
    alert(`Website "${projectName}" succesvol opgeslagen!`);
}

function saveProjectSilently() {
    const projectData = {
        projectName,
        webBgColor,
        webParticlesBg,
        pages
    };
    localStorage.setItem(`web3d_project_${projectName}`, JSON.stringify(projectData));
}

function loadProject() {
    const raw = localStorage.getItem(`web3d_project_${projectName}`);
    if (raw) {
        const data = JSON.parse(raw);
        webBgColor = data.webBgColor || "#0b0f19";
        webParticlesBg = data.webParticlesBg || false;
        pages = data.pages || [];
        if (pages.length > 0) {
            activePageId = pages[0].id;
        }
    } else {
        // Maak standaard pagina's aan
        pages = [
            { id: 'page_home', name: 'Home', elements: [] },
            { id: 'page_over', name: 'Over Ons', elements: [] }
        ];
        activePageId = 'page_home';
        saveProjectSilently();
    }

    renderPagesList();
    renderCanvas();
}

// --- PAGES MANAGER ---
function renderPagesList() {
    const container = document.getElementById('pages-list');
    if (!container) return;
    container.innerHTML = '';

    pages.forEach(page => {
        const isActive = page.id === activePageId;
        const div = document.createElement('div');
        div.className = `flex items-center justify-between p-2 rounded cursor-pointer transition text-xs ${isActive ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-300 hover:bg-slate-800/50'}`;
        div.innerHTML = `
            <span onclick="switchPage('${page.id}')" class="flex items-center gap-1.5 truncate flex-1">
                <i data-lucide="file" class="w-3.5 h-3.5"></i> ${page.name}
            </span>
            ${pages.length > 1 ? `
                <button onclick="deletePage('${page.id}')" class="p-1 text-red-400 hover:text-red-300 transition" title="Verwijder pagina">
                    <i data-lucide="trash" class="w-3 h-3"></i>
                </button>
            ` : ''}
        `;
        container.appendChild(div);
    });
    lucide.createIcons();
}

function switchPage(pageId) {
    deselectElement();
    activePageId = pageId;
    renderPagesList();
    renderCanvas();
}

function createNewPagePrompt() {
    const name = prompt("Voer de naam in voor de nieuwe pagina:");
    if (name) {
        const id = 'page_' + Date.now();
        pages.push({ id, name, elements: [] });
        switchPage(id);
        saveProjectSilently();
    }
}

function deletePage(pageId) {
    if (pages.length <= 1) return;
    if (confirm("Weet je zeker dat je deze pagina wilt verwijderen?")) {
        pages = pages.filter(p => p.id !== pageId);
        if (activePageId === pageId) {
            activePageId = pages[0].id;
        }
        renderPagesList();
        renderCanvas();
        saveProjectSilently();
    }
}

// --- CANVAS RENDERER ---
function renderCanvas() {
    const canvas = document.getElementById('website-canvas');
    if (!canvas) return;
    
    // Verwijder alle oude elementen behalve eventuele achtergrond effecten
    canvas.innerHTML = '';

    const currentPage = pages.find(p => p.id === activePageId);
    if (!currentPage) return;

    currentPage.elements.forEach(el => {
        const div = document.createElement('div');
        div.id = el.id;
        div.className = `canvas-element ${selectedElementId === el.id ? 'selected' : ''}`;
        div.style.left = `${el.x}px`;
        div.style.top = `${el.y}px`;
        div.style.width = `${el.width}px`;
        div.style.height = `${el.height}px`;

        // Render element inhoud op basis van type
        if (el.type === 'text') {
            div.innerHTML = `<div style="color: ${el.color}; font-size: ${el.fontSize}px; width: 100%; height: 100%; font-weight: 500;">${el.text}</div>`;
        } 
        else if (el.type === 'button') {
            div.innerHTML = `
                <button style="background-color: ${el.color}; font-size: ${el.fontSize}px;" class="w-full h-full text-white font-bold rounded-lg shadow-lg hover:brightness-110 transition">
                    ${el.text}
                </button>
            `;
        }
        else if (el.type === '3dtext') {
            div.innerHTML = `<div class="mini-3d-canvas" id="canvas3d_${el.id}"></div>`;
            setTimeout(() => initMini3DText(el), 50);
        }
        else if (el.type === '3dcard') {
            div.innerHTML = `
                <div class="tilt-card w-full h-full bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-2xl">
                    <div class="h-2/3 w-full" id="canvas3d_${el.id}"></div>
                    <div class="text-center mt-2">
                        <h4 style="color: ${el.color};" class="font-bold text-sm">${el.text}</h4>
                        <p class="text-[10px] text-slate-400">Interactieve 3D Kaart</p>
                    </div>
                </div>
            `;
            setTimeout(() => initMini3DModel(el, `canvas3d_${el.id}`), 50);
        }
        else if (el.type === '3dmodel') {
            div.innerHTML = `<div class="mini-3d-canvas" id="canvas3d_${el.id}"></div>`;
            setTimeout(() => initMini3DModel(el, `canvas3d_${el.id}`), 50);
        }

        // Setup Dragging
        div.addEventListener('mousedown', (e) => {
            // Voorkom drag op knoppen of invoervelden
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
            selectElement(el.id);
            isDragging = true;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            dragStartLeft = el.x;
            dragStartTop = el.y;
            e.stopPropagation();
        });

        canvas.appendChild(div);
    });

    // Update properties panel
    updatePropertiesPanel();
}

// Global drag handlers
window.addEventListener('mousemove', (e) => {
    if (!isDragging || !selectedElementId) return;
    const currentPage = pages.find(p => p.id === activePageId);
    if (!currentPage) return;

    const el = currentPage.elements.find(item => item.id === selectedElementId);
    if (!el) return;

    const deltaX = e.clientX - dragStartX;
    const deltaY = e.clientY - dragStartY;

    // Bereken nieuwe posities en snap aan grid van 4px
    let newLeft = Math.round((dragStartLeft + deltaX) / 4) * 4;
    let newTop = Math.round((dragStartTop + deltaY) / 4) * 4;

    // Canvas grenzen bewaken (960x540)
    el.x = Math.max(0, Math.min(960 - el.width, newLeft));
    el.y = Math.max(0, Math.min(540 - el.height, newTop));

    const dom = document.getElementById(el.id);
    if (dom) {
        dom.style.left = `${el.x}px`;
        dom.style.top = `${el.y}px`;
    }

    // Update sidebar inputs live
    document.getElementById('prop-pos-x').value = el.x;
    document.getElementById('prop-pos-y').value = el.y;
});

window.addEventListener('mouseup', () => {
    if (isDragging) {
        isDragging = false;
        saveProjectSilently();
    }
});

// --- MINI 3D ENGINE WIDGETS ---
function initMini3DText(el) {
    const container = document.getElementById(`canvas3d_${el.id}`);
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, el.width / el.height, 0.1, 100);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(el.width, el.height);
    container.appendChild(renderer.domElement);

    // Maak een canvas-gebaseerde 3D tekst plane
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 512, 128);
    ctx.font = 'Bold 48px sans-serif';
    ctx.fillStyle = el.color || '#6366f1';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(el.text || "3D Titel", 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const geometry = new THREE.PlaneGeometry(4, 1);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    function animate() {
        if (!document.getElementById(`canvas3d_${el.id}`)) return; // Stop loop als element weg is
        requestAnimationFrame(animate);
        mesh.rotation.y += 0.02;
        mesh.rotation.x = Math.sin(Date.now() * 0.001) * 0.2;
        renderer.render(scene, camera);
    }
    animate();
}

function initMini3DModel(el, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const width = container.clientWidth || el.width;
    const height = container.clientHeight || el.height;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.5, 3.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);

    // Bouw het geselecteerde model
    let group = new THREE.Group();
    const modelType = el.modelType || 'cube';
    const material = new THREE.MeshStandardMaterial({ color: el.color || '#6366f1', roughness: 0.4 });

    if (modelType === 'cube') {
        group.add(new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), material));
    } else if (modelType === 'sphere') {
        group.add(new THREE.Mesh(new THREE.SphereGeometry(0.8, 32, 32), material));
    } else if (modelType === 'cylinder') {
        group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.5, 32), material));
    } else if (modelType === 'cow') {
        // Cute voxel cow
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1, 1.8), material);
        body.position.y = 0.3;
        group.add(body);
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), material);
        head.position.set(0, 0.9, 0.9);
        group.add(head);
    } else if (modelType === 'house') {
        const walls = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1, 1.4), material);
        walls.position.y = -0.2;
        group.add(walls);
        const roof = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.8, 4), new THREE.MeshStandardMaterial({ color: '#ef4444' }));
        roof.position.y = 0.7;
        roof.rotation.y = Math.PI / 4;
        group.add(roof);
    } else if (modelType === 'tree') {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 1, 8), new THREE.MeshStandardMaterial({ color: '#78350f' }));
        trunk.position.y = -0.4;
        group.add(trunk);
        const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 8), new THREE.MeshStandardMaterial({ color: '#10b981' }));
        leaves.position.y = 0.4;
        group.add(leaves);
    }

    scene.add(group);

    function animate() {
        if (!document.getElementById(containerId)) return;
        requestAnimationFrame(animate);
        group.rotation.y += 0.015;
        renderer.render(scene, camera);
    }
    animate();
}

// --- ELEMENT CREATION ---
function addElement(type) {
    const currentPage = pages.find(p => p.id === activePageId);
    if (!currentPage) return;

    const id = 'el_' + Date.now();
    let newElement = {
        id,
        type,
        x: 100,
        y: 100,
        width: 200,
        height: 60,
        text: type === 'button' ? 'Klik Hier' : (type === '3dtext' ? '3D Titel' : 'Nieuwe Tekst'),
        color: '#6366f1',
        fontSize: 18,
        actionType: 'none',
        actionTarget: '',
        modelType: 'cube'
    };

    if (type === '3dcard') {
        newElement.width = 220;
        newElement.height = 260;
        newElement.text = "Product Kaart";
    } else if (type === '3dmodel') {
        newElement.width = 150;
        newElement.height = 150;
    }

    currentPage.elements.push(newElement);
    selectElement(id);
    renderCanvas();
    saveProjectSilently();
}

// --- SELECTION SYSTEM ---
function selectElement(id) {
    selectedElementId = id;
    
    // Geef geselecteerde element border
    document.querySelectorAll('.canvas-element').forEach(el => {
        el.classList.remove('selected');
    });
    const dom = document.getElementById(id);
    if (dom) dom.classList.add('selected');

    updatePropertiesPanel();
}

function deselectElement() {
    selectedElementId = null;
    document.querySelectorAll('.canvas-element').forEach(el => {
        el.classList.remove('selected');
    });
    updatePropertiesPanel();
}

// --- PROPERTIES PANEL UPDATES ---
function updatePropertiesPanel() {
    const panel = document.getElementById('properties-panel');
    const msg = document.getElementById('no-selection-msg');
    if (!panel || !msg) return;

    if (!selectedElementId) {
        panel.classList.add('hidden');
        msg.classList.remove('hidden');
        return;
    }

    panel.classList.remove('hidden');
    msg.classList.add('hidden');

    const currentPage = pages.find(p => p.id === activePageId);
    if (!currentPage) return;

    const el = currentPage.elements.find(item => item.id === selectedElementId);
    if (!el) return;

    // Vul invoervelden
    document.getElementById('prop-text').value = el.text;
    document.getElementById('prop-pos-x').value = el.x;
    document.getElementById('prop-pos-y').value = el.y;
    document.getElementById('prop-width').value = el.width;
    document.getElementById('prop-height').value = el.height;
    document.getElementById('prop-color').value = el.color;
    document.getElementById('prop-font-size').value = el.fontSize;

    // 3D Model Selector tonen/verbergen
    const modelContainer = document.getElementById('prop-3d-model-container');
    if (el.type === '3dmodel' || el.type === '3dcard') {
        modelContainer.classList.remove('hidden');
        document.getElementById('prop-3d-model').value = el.modelType || 'cube';
    } else {
        modelContainer.classList.add('hidden');
    }

    // Actions dropdown
    document.getElementById('prop-action-type').value = el.actionType || 'none';
    
    // Vul pagina dropdown voor acties
    const pageSelect = document.getElementById('prop-action-page');
    pageSelect.innerHTML = '';
    pages.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.innerText = p.name;
        if (el.actionTarget === p.id) opt.selected = true;
        pageSelect.appendChild(opt);
    });

    if (el.actionType === 'link') {
        document.getElementById('prop-action-link').value = el.actionTarget || '';
    }

    toggleActionFields();
}

function toggleActionFields() {
    const type = document.getElementById('prop-action-type').value;
    const pageCont = document.getElementById('action-page-container');
    const linkCont = document.getElementById('action-link-container');

    pageCont.classList.add('hidden');
    linkCont.classList.add('hidden');

    if (type === 'page') {
        pageCont.classList.remove('hidden');
    } else if (type === 'link') {
        linkCont.classList.remove('hidden');
    }

    updateSelectedElement();
}

function updateSelectedElement() {
    if (!selectedElementId) return;

    const currentPage = pages.find(p => p.id === activePageId);
    if (!currentPage) return;

    const el = currentPage.elements.find(item => item.id === selectedElementId);
    if (!el) return;

    el.text = document.getElementById('prop-text').value;
    el.x = parseInt(document.getElementById('prop-pos-x').value) || 0;
    el.y = parseInt(document.getElementById('prop-pos-y').value) || 0;
    el.width = parseInt(document.getElementById('prop-width').value) || 100;
    el.height = parseInt(document.getElementById('prop-height').value) || 50;
    el.color = document.getElementById('prop-color').value;
    el.fontSize = parseInt(document.getElementById('prop-font-size').value) || 16;

    if (el.type === '3dmodel' || el.type === '3dcard') {
        el.modelType = document.getElementById('prop-3d-model').value;
    }

    const actionType = document.getElementById('prop-action-type').value;
    el.actionType = actionType;
    if (actionType === 'page') {
        el.actionTarget = document.getElementById('prop-action-page').value;
    } else if (actionType === 'link') {
        el.actionTarget = document.getElementById('prop-action-link').value;
    } else {
        el.actionTarget = '';
    }

    // Update live op canvas
    const dom = document.getElementById(el.id);
    if (dom) {
        dom.style.left = `${el.x}px`;
        dom.style.top = `${el.y}px`;
        dom.style.width = `${el.width}px`;
        dom.style.height = `${el.height}px`;
        
        if (el.type === 'text') {
            dom.innerHTML = `<div style="color: ${el.color}; font-size: ${el.fontSize}px; width: 100%; height: 100%; font-weight: 500;">${el.text}</div>`;
        } else if (el.type === 'button') {
            dom.innerHTML = `
                <button style="background-color: ${el.color}; font-size: ${el.fontSize}px;" class="w-full h-full text-white font-bold rounded-lg shadow-lg hover:brightness-110 transition">
                    ${el.text}
                </button>
            `;
        }
    }

    saveProjectSilently();
}

function deleteSelectedElement() {
    if (!selectedElementId) return;
    if (confirm("Weet je zeker dat je dit element wilt verwijderen?")) {
        const currentPage = pages.find(p => p.id === activePageId);
        if (currentPage) {
            currentPage.elements = currentPage.elements.filter(item => item.id !== selectedElementId);
            deselectElement();
            renderCanvas();
            saveProjectSilently();
        }
    }
}

// --- GLOBAL SETTINGS ---
function updateGlobalSettings() {
    webBgColor = document.getElementById('web-bg-color').value;
    webParticlesBg = document.getElementById('web-particles-bg').checked;
    updateCanvasStyle();
    saveProjectSilently();
}

function updateCanvasStyle() {
    const canvas = document.getElementById('website-canvas');
    if (canvas) {
        canvas.style.backgroundColor = webBgColor;
    }
}

// --- WEBSITE TEMPLATES ---
function loadTemplate(type) {
    if (confirm("Weet je zeker dat je dit template wilt laden? Dit overschrijft je huidige pagina's!")) {
        deselectElement();
        if (type === 'portfolio') {
            pages = [
                {
                    id: 'page_home',
                    name: 'Home',
                    elements: [
                        { id: 'el_title', type: '3dtext', x: 280, y: 80, width: 400, height: 100, text: 'Mattyou Studios', color: '#6366f1', fontSize: 32, actionType: 'none', actionTarget: '' },
                        { id: 'el_sub', type: 'text', x: 330, y: 180, width: 300, height: 40, text: 'De toekomst van 3D Webdesign', color: '#94a3b8', fontSize: 18, actionType: 'none', actionTarget: '' },
                        { id: 'el_btn_work', type: 'button', x: 260, y: 280, width: 200, height: 50, text: 'Bekijk Ons Werk', color: '#6366f1', fontSize: 16, actionType: 'page', actionTarget: 'page_werk' },
                        { id: 'el_btn_contact', type: 'button', x: 500, y: 280, width: 200, height: 50, text: 'Neem Contact Op', color: '#10b981', fontSize: 16, actionType: 'page', actionTarget: 'page_contact' },
                        { id: 'el_model', type: '3dmodel', x: 405, y: 360, width: 150, height: 150, modelType: 'house', color: '#6366f1' }
                    ]
                },
                {
                    id: 'page_werk',
                    name: 'Ons Werk',
                    elements: [
                        { id: 'el_werk_title', type: 'text', x: 380, y: 40, width: 200, height: 50, text: 'Ons Portfolio', color: '#ffffff', fontSize: 28, actionType: 'none', actionTarget: '' },
                        { id: 'el_card1', type: '3dcard', x: 180, y: 120, width: 220, height: 260, text: 'Voxel Koe Project', color: '#10b981', modelType: 'cow' },
                        { id: 'el_card2', type: '3dcard', x: 560, y: 120, width: 220, height: 260, text: '3D Architectuur', color: '#6366f1', modelType: 'house' },
                        { id: 'el_btn_back', type: 'button', x: 380, y: 440, width: 200, height: 50, text: 'Terug naar Home', color: '#475569', fontSize: 16, actionType: 'page', actionTarget: 'page_home' }
                    ]
                },
                {
                    id: 'page_contact',
                    name: 'Contact',
                    elements: [
                        { id: 'el_contact_title', type: 'text', x: 380, y: 60, width: 200, height: 50, text: 'Contact Opnemen', color: '#ffffff', fontSize: 28, actionType: 'none', actionTarget: '' },
                        { id: 'el_contact_info', type: 'text', x: 280, y: 160, width: 400, height: 100, text: 'E-mail: info@mattyoustudios.nl\\nTelefoon: +31 6 12345678', color: '#94a3b8', fontSize: 18, actionType: 'none', actionTarget: '' },
                        { id: 'el_btn_back_c', type: 'button', x: 380, y: 320, width: 200, height: 50, text: 'Terug naar Home', color: '#475569', fontSize: 16, actionType: 'page', actionTarget: 'page_home' }
                    ]
                }
            ];
            webBgColor = "#0b0f19";
            webParticlesBg = true;
        } 
        else if (type === 'shop') {
            pages = [
                {
                    id: 'page_home',
                    name: 'Shop Home',
                    elements: [
                        { id: 'el_shop_title', type: '3dtext', x: 280, y: 40, width: 400, height: 80, text: '3D Tech Store', color: '#06b6d4', fontSize: 32 },
                        { id: 'el_prod1', type: '3dcard', x: 80, y: 150, width: 220, height: 260, text: 'Super Computer', color: '#06b6d4', modelType: 'cube' },
                        { id: 'el_prod2', type: '3dcard', x: 370, y: 150, width: 220, height: 260, text: 'Smart Eco Home', color: '#10b981', modelType: 'house' },
                        { id: 'el_prod3', type: '3dcard', x: 660, y: 150, width: 220, height: 260, text: 'Cyber Tree', color: '#f59e0b', modelType: 'tree' }
                    ]
                }
            ];
            webBgColor = "#020617";
            webParticlesBg = true;
        }

        activePageId = pages[0].id;
        document.getElementById('web-bg-color').value = webBgColor;
        document.getElementById('web-particles-bg').checked = webParticlesBg;
        updateCanvasStyle();
        renderPagesList();
        renderCanvas();
        saveProjectSilently();
    }
}

// --- EXPORT ENGINE ---
function exportWebsite() {
    if (pages.length === 0) return;

    // Genereer de complete HTML met alle pagina's, Three.js en navigatie logic
    const pagesJSON = JSON.stringify(pages).replace(/</g, '\\u003c');

    const htmlContent = `<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectName} - Mattyou Studios™</title>
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <!-- Three.js -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <style>
        body {
            margin: 0;
            font-family: 'Inter', sans-serif;
            background-color: ${webBgColor};
            overflow-x: hidden;
            color: #ffffff;
        }
        .page-container {
            width: 100vw;
            height: 100vh;
            position: relative;
            display: none;
        }
        .page-container.active {
            display: block;
        }
        .canvas-element {
            position: absolute;
        }
        #particles-canvas {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: -1;
            pointer-events: none;
        }
        .tilt-card {
            transform-style: preserve-3d;
            perspective: 1000px;
            transition: transform 0.1s ease;
        }
        .mini-3d-canvas {
            width: 100%;
            height: 100%;
            pointer-events: none;
        }
    </style>
</head>
<body>

    ${webParticlesBg ? '<canvas id="particles-canvas"></canvas>' : ''}

    <div id="website-root">
        <!-- Pagina's worden hier dynamisch gerenderd -->
    </div>

    <script>
        const pagesData = ${pagesJSON};
        let activePageId = "${activePageId}";

        function renderWebsite() {
            const root = document.getElementById('website-root');
            root.innerHTML = '';

            pagesData.forEach(page => {
                const pageDiv = document.createElement('div');
                pageDiv.id = page.id;
                pageDiv.className = "page-container " + (page.id === activePageId ? "active" : "");

                page.elements.forEach(el => {
                    const div = document.createElement('div');
                    div.className = "canvas-element";
                    
                    // Schaal de absolute posities naar responsive viewport percentages
                    const leftPct = (el.x / 960) * 100;
                    const topPct = (el.y / 540) * 100;
                    const widthPct = (el.width / 960) * 100;
                    const heightPct = (el.height / 540) * 100;

                    div.style.left = leftPct + "vw";
                    div.style.top = topPct + "vh";
                    div.style.width = widthPct + "vw";
                    div.style.height = heightPct + "vh";

                    // Render content
                    if (el.type === 'text') {
                        div.innerHTML = '<div style="color: ' + el.color + '; font-size: ' + (el.fontSize * 1.5) + 'px; font-weight: 500;">' + el.text + '</div>';
                    } 
                    else if (el.type === 'button') {
                        const btn = document.createElement('button');
                        btn.className = "w-full h-full text-white font-bold rounded-lg shadow-lg hover:brightness-110 transition";
                        btn.style.backgroundColor = el.color;
                        btn.style.fontSize = (el.fontSize * 1.2) + "px";
                        btn.innerText = el.text;
                        btn.onclick = () => handleAction(el.actionType, el.actionTarget);
                        div.appendChild(btn);
                    }
                    else if (el.type === '3dtext') {
                        const canvasId = "canvas3d_" + el.id;
                        div.innerHTML = '<div class="mini-3d-canvas" id="' + canvasId + '"></div>';
                        setTimeout(() => initMini3DText(el, canvasId), 50);
                    }
                    else if (el.type === '3dcard') {
                        const canvasId = "canvas3d_" + el.id;
                        div.innerHTML = \`
                            <div class="tilt-card w-full h-full bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-2xl cursor-pointer" onclick="handleAction('\${el.actionType}', '\${el.actionTarget}')">
                                <div class="h-2/3 w-full" id="\${canvasId}"></div>
                                <div class="text-center mt-2">
                                    <h4 style="color: \${el.color};" class="font-bold text-sm">\${el.text}</h4>
                                    <p class="text-[10px] text-slate-400">Interactieve 3D Kaart</p>
                                </div>
                            </div>
                        \`;
                        setTimeout(() => initMini3DModel(el, canvasId), 50);
                    }
                    else if (el.type === '3dmodel') {
                        const canvasId = "canvas3d_" + el.id;
                        div.innerHTML = '<div class="mini-3d-canvas" id="' + canvasId + '"></div>';
                        setTimeout(() => initMini3DModel(el, canvasId), 50);
                    }

                    pageDiv.appendChild(div);
                });

                root.appendChild(pageDiv);
            });
        }

        function handleAction(type, target) {
            if (type === 'page') {
                document.querySelectorAll('.page-container').forEach(p => p.classList.remove('active'));
                const targetPage = document.getElementById(target);
                if (targetPage) targetPage.classList.add('active');
                activePageId = target;
            } else if (type === 'link') {
                window.open(target, '_blank');
            }
        }

        // --- THREE.JS EXPORT WIDGETS ---
        function initMini3DText(el, containerId) {
            const container = document.getElementById(containerId);
            if (!container) return;

            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
            camera.position.z = 5;

            const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(container.clientWidth, container.clientHeight);
            container.appendChild(renderer.domElement);

            const canvas = document.createElement('canvas');
            canvas.width = 512; canvas.height = 128;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, 512, 128);
            ctx.font = 'Bold 48px sans-serif';
            ctx.fillStyle = el.color || '#6366f1';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(el.text || "3D Titel", 256, 64);

            const texture = new THREE.CanvasTexture(canvas);
            const geometry = new THREE.PlaneGeometry(4, 1);
            const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
            const mesh = new THREE.Mesh(geometry, material);
            scene.add(mesh);

            function animate() {
                requestAnimationFrame(animate);
                mesh.rotation.y += 0.02;
                mesh.rotation.x = Math.sin(Date.now() * 0.001) * 0.2;
                renderer.render(scene, camera);
            }
            animate();
        }

        function initMini3DModel(el, containerId) {
            const container = document.getElementById(containerId);
            if (!container) return;

            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
            camera.position.set(0, 1.5, 3.5);
            camera.lookAt(0, 0, 0);

            const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(container.clientWidth, container.clientHeight);
            container.appendChild(renderer.domElement);

            scene.add(new THREE.AmbientLight(0xffffff, 0.6));
            const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
            dirLight.position.set(5, 10, 5);
            scene.add(dirLight);

            let group = new THREE.Group();
            const modelType = el.modelType || 'cube';
            const material = new THREE.MeshStandardMaterial({ color: el.color || '#6366f1', roughness: 0.4 });

            if (modelType === 'cube') {
                group.add(new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), material));
            } else if (modelType === 'sphere') {
                group.add(new THREE.Mesh(new THREE.SphereGeometry(0.8, 32, 32), material));
            } else if (modelType === 'cylinder') {
                group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.5, 32), material));
            } else if (modelType === 'cow') {
                const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1, 1.8), material);
                body.position.y = 0.3; group.add(body);
                const head = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), material);
                head.position.set(0, 0.9, 0.9); group.add(head);
            } else if (modelType === 'house') {
                const walls = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1, 1.4), material);
                walls.position.y = -0.2; group.add(walls);
                const roof = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.8, 4), new THREE.MeshStandardMaterial({ color: '#ef4444' }));
                roof.position.y = 0.7; roof.rotation.y = Math.PI / 4; group.add(roof);
            } else if (modelType === 'tree') {
                const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 1, 8), new THREE.MeshStandardMaterial({ color: '#78350f' }));
                trunk.position.y = -0.4; group.add(trunk);
                const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 8), new THREE.MeshStandardMaterial({ color: '#10b981' }));
                leaves.position.y = 0.4; group.add(leaves);
            }

            scene.add(group);

            function animate() {
                requestAnimationFrame(animate);
                group.rotation.y += 0.015;
                renderer.render(scene, camera);
            }
            animate();
        }

        // --- PARTICLES BACKGROUND ---
        if (${webParticlesBg}) {
            const canvas = document.getElementById('particles-canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            const particles = [];
            for (let i = 0; i < 80; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: Math.random() * 2 + 1,
                    speed: Math.random() * 0.5 + 0.2
                });
            }

            function drawParticles() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                particles.forEach(p => {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                    p.y -= p.speed;
                    if (p.y < 0) p.y = canvas.height;
                });
                requestAnimationFrame(drawParticles);
            }
            drawParticles();

            window.addEventListener('resize', () => {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            });
        }

        renderWebsite();
    </script>
</body>
</html>`;

            // Download triggeren met split/join (100% veilig voor dollartekens)
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${projectName.toLowerCase().replace(/\s+/g, '_')}_website.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }
}

function goToMainMenu() {
    window.location.href = 'index.html';
}

// --- SAFE DOM READY CHECK ---
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
} else {
    window.addEventListener('DOMContentLoaded', init);
}
