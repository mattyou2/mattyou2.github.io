// --- THREE.JS SETUP ---
let scene, camera, renderer, controls;
let objects = []; // Houdt alle door de gebruiker gemaakte objecten bij
let selectedObject = null;
let currentFrame = 0;
let isPlaying = false;
let animationFrameId = null;

// Omgevingsinstellingen & 2D Overlays
let skyColor = '#0f172a';
let groundColor = '#22c55e';
let showGrid = true;
let exportGrid = false;
let lockCamera = false;
let menus = []; // Lijst van 2D overlays: { id, title, content }
let activeEditingMenuId = null;

const canvasContainer = document.getElementById('canvas-container');
let gridHelper, groundMesh;

function initThree() {
    scene = new THREE.Scene();
    
    // Camera
    camera = new THREE.PerspectiveCamera(60, canvasContainer.clientWidth / canvasContainer.clientHeight, 0.1, 1000);
    camera.position.set(8, 8, 12);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    canvasContainer.appendChild(renderer.domElement);

    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 15);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    // Grid Helper
    gridHelper = new THREE.GridHelper(20, 20, 0x6366f1, 0x334155);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // Ground Plane
    const groundGeo = new THREE.PlaneGeometry(40, 40);
    const groundMat = new THREE.MeshStandardMaterial({ color: groundColor, roughness: 0.8 });
    groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Click Raycaster to select objects in 3D
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    canvasContainer.addEventListener('pointerdown', (e) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(objects.map(o => o.mesh), true);
        if (intersects.length > 0) {
            // Vind het hoofdobject dat in onze array staat
            let hitMesh = intersects[0].object;
            while (hitMesh.parent && !hitMesh.userData.id) {
                hitMesh = hitMesh.parent;
            }
            const found = objects.find(o => o.id === hitMesh.userData.id);
            if (found) selectObject(found);
        }
    });

    // Window Resize
    window.addEventListener('resize', onWindowResize);

    // Initialiseer standaard menu
    menus.push({
        id: 'welkom_menu',
        title: 'Welkom bij Designer',
        content: 'Dit is een premium 3D website ontworpen met Designer van Mattyou Studios™!'
    });
    updateMenusUI();

    animate();
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    
    if (isPlaying) {
        advanceFrame();
    }
    
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
}

function resetCamera() {
    camera.position.set(8, 8, 12);
    controls.target.set(0, 0, 0);
}

function clearScene() {
    if (confirm("Weet je zeker dat je de hele scène wilt leegmaken?")) {
        objects.forEach(obj => scene.remove(obj.mesh));
        objects = [];
        selectedObject = null;
        updateUI();
    }
}

// --- OBJECT CREATION & TEMPLATES ---
let objectCounter = 0;

function createBaseObjectData(mesh, nameType, extraData = {}) {
    objectCounter++;
    const objData = {
        id: 'obj_' + Date.now() + '_' + objectCounter,
        name: `${nameType} #${objectCounter}`,
        mesh: mesh,
        type: nameType.toLowerCase(),
        clickAction: 'none', // Kan een menu ID zijn
        keyframes: {},
        ...extraData
    };
    
    saveKeyframeData(objData, 0);
    mesh.userData = { id: objData.id };
    objects.push(objData);
    scene.add(mesh);
    
    selectObject(objData);
    updateUI();
}

// Helper om 3D Tekst te genereren met CanvasTexture
function create3DTextTexture(text, colorHex) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 512, 128);
    ctx.font = 'Bold 48px Inter, sans-serif';
    ctx.fillStyle = colorHex;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

function addObject(type) {
    let mesh;

    if (type === '3dtext') {
        const texture = create3DTextTexture("Mattyou Studios", "#6366f1");
        const geometry = new THREE.PlaneGeometry(4, 1);
        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
        mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(0, 2, 0);
        createBaseObjectData(mesh, '3DText', { textVal: "Mattyou Studios" });
        return;
    }

    if (type === 'camera') {
        // Een visueel camera object voor in de editor
        const group = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 1), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.5, 16), new THREE.MeshBasicMaterial({ color: 0x111111 }));
        lens.rotation.x = Math.PI / 2;
        lens.position.z = -0.6;
        group.add(body, lens);
        group.position.set(0, 3, 5);
        createBaseObjectData(group, 'Camera');
        return;
    }

    let geometry, material;
    material = new THREE.MeshStandardMaterial({ color: 0x6366f1, roughness: 0.4, metalness: 0.1 });

    switch(type) {
        case 'cube':
            geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
            break;
        case 'sphere':
            geometry = new THREE.SphereGeometry(1, 32, 32);
            break;
        case 'cylinder':
            geometry = new THREE.CylinderGeometry(0.8, 0.8, 2, 32);
            break;
        case 'cone':
            geometry = new THREE.ConeGeometry(1, 2, 32);
            break;
    }

    mesh = new THREE.Mesh(geometry, material);
    mesh.position.set((Math.random() - 0.5) * 4, 1, (Math.random() - 0.5) * 4);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    createBaseObjectData(mesh, type.charAt(0).toUpperCase() + type.slice(1));
}

// Premium Templates Generator
function addTemplate(type) {
    const group = new THREE.Group();
    
    if (type === 'cow') {
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
        const spotMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
        const pinkMat = new THREE.MeshStandardMaterial({ color: 0xffb6c1, roughness: 0.8 });
        const hoofMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });

        const body = new THREE.Mesh(new THREE.BoxGeometry(2, 1.4, 3), bodyMat);
        body.position.y = 1.2;
        group.add(body);

        const spot1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.8), spotMat);
        spot1.position.set(0.71, 1.4, 0.5);
        const spot2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.6), spotMat);
        spot2.position.set(-0.71, 1.1, -0.5);
        group.add(spot1, spot2);

        const legGeo = new THREE.BoxGeometry(0.4, 1, 0.4);
        const hoofGeo = new THREE.BoxGeometry(0.42, 0.2, 0.42);
        const legPositions = [
            [-0.7, 0.5, 1], [0.7, 0.5, 1],
            [-0.7, 0.5, -1], [0.7, 0.5, -1]
        ];
        legPositions.forEach(pos => {
            const leg = new THREE.Mesh(legGeo, bodyMat);
            leg.position.set(pos[0], pos[1], pos[2]);
            const hoof = new THREE.Mesh(hoofGeo, hoofMat);
            hoof.position.set(pos[0], 0.1, pos[2]);
            group.add(leg, hoof);
        });

        const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), bodyMat);
        head.position.set(0, 2.1, 1.6);
        const snout = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.6), pinkMat);
        snout.position.set(0, 1.85, 2.2);
        group.add(head, snout);

    } else if (type === 'house') {
        const wallMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.5 });
        const roofMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.6 });
        const doorMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });

        const walls = new THREE.Mesh(new THREE.BoxGeometry(3, 2.2, 3), wallMat);
        walls.position.y = 1.1;
        group.add(walls);

        const roof = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.8, 4), roofMat);
        roof.position.y = 3.1;
        roof.rotation.y = Math.PI / 4;
        group.add(roof);

        const door = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.4, 0.1), doorMat);
        door.position.set(0, 0.7, 1.51);
        group.add(door);

    } else if (type === 'tree') {
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
        const leavesMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.8 });

        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 2.5, 8), trunkMat);
        trunk.position.y = 1.25;
        group.add(trunk);

        const leaf1 = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 8), leavesMat);
        leaf1.position.y = 2.8;
        const leaf2 = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 8), leavesMat);
        leaf2.position.y = 3.7;
        group.add(leaf1, leaf2);

    } else if (type === 'grass') {
        const grassMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.9 });
        const dirtMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });

        const base = new THREE.Mesh(new THREE.BoxGeometry(4, 0.3, 4), dirtMat);
        base.position.y = 0.15;
        const topGrass = new THREE.Mesh(new THREE.BoxGeometry(4.05, 0.1, 4.05), grassMat);
        topGrass.position.y = 0.31;
        group.add(base, topGrass);

        const bladeGeo = new THREE.ConeGeometry(0.1, 0.6, 4);
        for (let i = 0; i < 15; i++) {
            const blade = new THREE.Mesh(bladeGeo, grassMat);
            blade.position.set(
                (Math.random() - 0.5) * 3.5,
                0.6,
                (Math.random() - 0.5) * 3.5
            );
            blade.rotation.x = (Math.random() - 0.5) * 0.3;
            blade.rotation.z = (Math.random() - 0.5) * 0.3;
            group.add(blade);
        }
    }

    group.position.set((Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3);
    createBaseObjectData(group, type.charAt(0).toUpperCase() + type.slice(1));
}

// --- SELECTION SYSTEM ---
function selectObject(objData) {
    selectedObject = objData;
    
    document.querySelectorAll('.object-item').forEach(el => el.classList.remove('bg-indigo-600/20', 'border-indigo-500'));
    const activeEl = document.getElementById(`list-item-${objData.id}`);
    if (activeEl) {
        activeEl.classList.add('bg-indigo-600/20', 'border-indigo-500');
    }

    document.getElementById('no-selection-msg').classList.add('hidden');
    document.getElementById('properties-panel').classList.remove('hidden');

    document.getElementById('prop-name').value = objData.name;
    
    // Positie
    document.getElementById('prop-pos-x').value = objData.mesh.position.x.toFixed(2);
    document.getElementById('prop-pos-y').value = objData.mesh.position.y.toFixed(2);
    document.getElementById('prop-pos-z').value = objData.mesh.position.z.toFixed(2);

    // Rotatie
    document.getElementById('prop-rot-x').value = Math.round(objData.mesh.rotation.x * (180 / Math.PI));
    document.getElementById('prop-rot-y').value = Math.round(objData.mesh.rotation.y * (180 / Math.PI));
    document.getElementById('prop-rot-z').value = Math.round(objData.mesh.rotation.z * (180 / Math.PI));

    // Schaal
    document.getElementById('prop-scale-x').value = objData.mesh.scale.x.toFixed(2);
    document.getElementById('prop-scale-y').value = objData.mesh.scale.y.toFixed(2);
    document.getElementById('prop-scale-z').value = objData.mesh.scale.z.toFixed(2);

    // 3D Text specifieke velden
    const textContainer = document.getElementById('prop-text-container');
    if (objData.type === '3dtext') {
        textContainer.classList.remove('hidden');
        document.getElementById('prop-text-val').value = objData.textVal || "";
    } else {
        textContainer.classList.add('hidden');
    }

    // Kleur & Opacity
    let colorHex = "#6366f1";
    let opacityVal = 100;
    
    if (objData.mesh.material) {
        colorHex = "#" + objData.mesh.material.color.getHexString();
        opacityVal = Math.round(objData.mesh.material.opacity * 100);
    }
    
    document.getElementById('prop-color').value = colorHex;
    document.getElementById('color-hex').innerText = colorHex.toUpperCase();
    document.getElementById('prop-opacity').value = opacityVal;
    document.getElementById('opacity-val').innerText = opacityVal;

    // Interactie dropdown vullen
    const clickSelect = document.getElementById('prop-click-action');
    clickSelect.innerHTML = '<option value="none">Geen actie</option>';
    menus.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.innerText = `Open Menu: ${m.title}`;
        if (objData.clickAction === m.id) opt.selected = true;
        clickSelect.appendChild(opt);
    });

    updateKeyframeTrackUI();
    updateKeyframesListUI();
}

// --- KEYFRAME & ANIMATION SYSTEM ---
function saveKeyframeData(objData, frame) {
    let colorHex = "#ffffff";
    let opacityVal = 1;

    if (objData.mesh.material) {
        colorHex = "#" + objData.mesh.material.color.getHexString();
        opacityVal = objData.mesh.material.opacity;
    }

    objData.keyframes[frame] = {
        pos: { x: objData.mesh.position.x, y: objData.mesh.position.y, z: objData.mesh.position.z },
        rot: { x: objData.mesh.rotation.x, y: objData.mesh.rotation.y, z: objData.mesh.rotation.z },
        scale: { x: objData.mesh.scale.x, y: objData.mesh.scale.y, z: objData.mesh.scale.z },
        color: colorHex,
        opacity: opacityVal
    };
}

function applyKeyframeState(objData, frame) {
    const keys = Object.keys(objData.keyframes).map(Number).sort((a, b) => a - b);
    if (keys.length === 0) return;

    if (objData.keyframes[frame]) {
        setMeshState(objData.mesh, objData.keyframes[frame]);
        return;
    }

    let prevFrame = null;
    let nextFrame = null;

    for (let i = 0; i < keys.length; i++) {
        if (keys[i] < frame) prevFrame = keys[i];
        if (keys[i] > frame && nextFrame === null) nextFrame = keys[i];
    }

    if (prevFrame !== null && nextFrame !== null) {
        const t = (frame - prevFrame) / (nextFrame - prevFrame);
        const start = objData.keyframes[prevFrame];
        const end = objData.keyframes[nextFrame];

        objData.mesh.position.set(
            THREE.MathUtils.lerp(start.pos.x, end.pos.x, t),
            THREE.MathUtils.lerp(start.pos.y, end.pos.y, t),
            THREE.MathUtils.lerp(start.pos.z, end.pos.z, t)
        );

        objData.mesh.rotation.set(
            THREE.MathUtils.lerp(start.rot.x, end.rot.x, t),
            THREE.MathUtils.lerp(start.rot.y, end.rot.y, t),
            THREE.MathUtils.lerp(start.rot.z, end.rot.z, t)
        );

        objData.mesh.scale.set(
            THREE.MathUtils.lerp(start.scale.x, end.scale.x, t),
            THREE.MathUtils.lerp(start.scale.y, end.scale.y, t),
            THREE.MathUtils.lerp(start.scale.z, end.scale.z, t)
        );

        if (objData.mesh.material) {
            const startColor = new THREE.Color(start.color);
            const endColor = new THREE.Color(end.color);
            objData.mesh.material.color.copy(startColor).lerp(endColor, t);
            objData.mesh.material.opacity = THREE.MathUtils.lerp(start.opacity, end.opacity, t);
            objData.mesh.material.transparent = objData.mesh.material.opacity < 1;
        }
    } else if (prevFrame !== null) {
        setMeshState(objData.mesh, objData.keyframes[prevFrame]);
    } else if (nextFrame !== null) {
        setMeshState(objData.mesh, objData.keyframes[nextFrame]);
    }
}

function setMeshState(mesh, state) {
    mesh.position.set(state.pos.x, state.pos.y, state.pos.z);
    mesh.rotation.set(state.rot.x, state.rot.y, state.rot.z);
    mesh.scale.set(state.scale.x, state.scale.y, state.scale.z);
    
    if (mesh.material) {
        mesh.material.color.set(state.color);
        mesh.material.opacity = state.opacity;
        mesh.material.transparent = state.opacity < 1;
    }
}

function advanceFrame() {
    currentFrame++;
    if (currentFrame > 100) {
        currentFrame = 0;
    }
    document.getElementById('timeline-slider').value = currentFrame;
    document.getElementById('current-frame-display').innerText = currentFrame;
    
    objects.forEach(obj => {
        applyKeyframeState(obj, currentFrame);
        // Als het een geanimeerde camera is, sturen we de actieve viewport camera aan!
        if (obj.type === 'camera') {
            camera.position.copy(obj.mesh.position);
            camera.rotation.copy(obj.mesh.rotation);
        }
    });
}

// --- 2D OVERLAY MENU BUILDER ---
function createNewMenu() {
    activeEditingMenuId = null;
    document.getElementById('edit-menu-id').value = 'menu_' + Date.now().toString().slice(-4);
    document.getElementById('edit-menu-title').value = 'Nieuw Menu';
    document.getElementById('edit-menu-content').value = '<h2>Welkom</h2><p>Dit is een prachtig 2D menu overlay.</p>';
    document.getElementById('menu-editor-modal').classList.remove('hidden');
}

function editMenu(id) {
    const m = menus.find(menu => menu.id === id);
    if (m) {
        activeEditingMenuId = id;
        document.getElementById('edit-menu-id').value = m.id;
        document.getElementById('edit-menu-title').value = m.title;
        document.getElementById('edit-menu-content').value = m.content;
        document.getElementById('menu-editor-modal').classList.remove('hidden');
    }
}

function deleteMenu(id) {
    if (confirm("Weet je zeker dat je dit menu wilt verwijderen?")) {
        menus = menus.filter(m => m.id !== id);
        updateMenusUI();
    }
}

function closeMenuEditor() {
    document.getElementById('menu-editor-modal').classList.add('hidden');
}

function saveMenuData() {
    const id = document.getElementById('edit-menu-id').value;
    const title = document.getElementById('edit-menu-title').value;
    const content = document.getElementById('edit-menu-content').value;

    if (activeEditingMenuId) {
        // Bewerken
        const m = menus.find(menu => menu.id === activeEditingMenuId);
        if (m) {
            m.id = id;
            m.title = title;
            m.content = content;
        }
    } else {
        // Nieuw
        menus.push({ id, title, content });
    }

    closeMenuEditor();
    updateMenusUI();
}

function previewMenu(id) {
    const m = menus.find(menu => menu.id === id);
    if (m) {
        document.getElementById('preview-menu-title').innerText = m.title;
        document.getElementById('preview-menu-content').innerHTML = m.content;
        document.getElementById('overlay-preview-container').classList.remove('hidden');
    }
}

function closeOverlayPreview() {
    document.getElementById('overlay-preview-container').classList.add('hidden');
}

function updateMenusUI() {
    const list = document.getElementById('menus-list');
    list.innerHTML = '';

    menus.forEach(m => {
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between p-2 bg-slate-800/40 rounded border border-slate-700/30 text-xs';
        div.innerHTML = `
            <span class="font-medium text-slate-300 truncate max-w-[120px]">${m.title}</span>
            <div class="flex gap-1">
                <button onclick="previewMenu('${m.id}')" class="p-1 text-cyan-400 hover:text-cyan-300" title="Preview"><i data-lucide="eye" class="w-3.5 h-3.5"></i></button>
                <button onclick="editMenu('${m.id}')" class="p-1 text-indigo-400 hover:text-indigo-300" title="Bewerk"><i data-lucide="edit" class="w-3.5 h-3.5"></i></button>
                <button onclick="deleteMenu('${m.id}')" class="p-1 text-red-400 hover:text-red-300" title="Verwijder"><i data-lucide="trash" class="w-3.5 h-3.5"></i></button>
            </div>
        `;
        list.appendChild(div);
    });
    lucide.createIcons();
}

// --- UI EVENT LISTENERS & UPDATES ---
function updateUI() {
    document.getElementById('object-count').innerText = objects.length;

    const listContainer = document.getElementById('objects-list');
    listContainer.innerHTML = '';

    objects.forEach(obj => {
        const item = document.createElement('div');
        item.id = `list-item-${obj.id}`;
        item.className = `object-item flex items-center justify-between p-2 rounded border border-slate-800 bg-slate-900/30 hover:bg-slate-800/50 cursor-pointer transition text-xs`;
        item.innerHTML = `
            <span class="font-medium text-slate-300">${obj.name}</span>
            <div class="flex gap-1">
                <button onclick="event.stopPropagation(); deleteObject('${obj.id}')" class="p-1 hover:text-red-400"><i data-lucide="trash" class="w-3.5 h-3.5"></i></button>
            </div>
        `;
        item.addEventListener('click', () => selectObject(obj));
        listContainer.appendChild(item);
    });

    lucide.createIcons();
}

function updateKeyframeTrackUI() {
    const track = document.getElementById('keyframe-track');
    track.innerHTML = '';
    
    if (!selectedObject) return;

    Object.keys(selectedObject.keyframes).forEach(frame => {
        const dot = document.createElement('div');
        dot.className = `keyframe-dot ${parseInt(frame) === currentFrame ? 'active' : ''}`;
        dot.style.left = `${frame}%`;
        dot.title = `Frame ${frame}`;
        dot.addEventListener('click', () => {
            currentFrame = parseInt(frame);
            document.getElementById('timeline-slider').value = currentFrame;
            document.getElementById('current-frame-display').innerText = currentFrame;
            objects.forEach(obj => applyKeyframeState(obj, currentFrame));
            updateKeyframeTrackUI();
        });
        track.appendChild(dot);
    });
}

function updateKeyframesListUI() {
    const list = document.getElementById('keyframes-list');
    list.innerHTML = '';

    if (!selectedObject) return;

    const sortedFrames = Object.keys(selectedObject.keyframes).map(Number).sort((a,b) => a-b);
    
    if (sortedFrames.length === 0) {
        list.innerHTML = '<div class="text-center py-4 text-slate-600">Geen keyframes opgeslagen.</div>';
        return;
    }

    sortedFrames.forEach(frame => {
        const item = document.createElement('div');
        item.className = `flex items-center justify-between p-2 bg-slate-800/40 rounded border border-slate-700/30`;
        item.innerHTML = `
            <span>Frame <strong>${frame}</strong></span>
            <button onclick="deleteKeyframe('${selectedObject.id}', ${frame})" class="text-red-400 hover:text-red-300 transition">Verwijder</button>
        `;
        list.appendChild(item);
    });
}

function deleteObject(id) {
    const index = objects.findIndex(o => o.id === id);
    if (index !== -1) {
        scene.remove(objects[index].mesh);
        objects.splice(index, 1);
        if (selectedObject && selectedObject.id === id) {
            selectedObject = null;
            document.getElementById('properties-panel').classList.add('hidden');
            document.getElementById('no-selection-msg').classList.remove('hidden');
        }
        updateUI();
    }
}

function deleteKeyframe(objId, frame) {
    const obj = objects.find(o => o.id === objId);
    if (obj && obj.keyframes[frame]) {
        delete obj.keyframes[frame];
        updateKeyframeTrackUI();
        updateKeyframesListUI();
    }
}

// --- EVENT LISTENERS ---
document.getElementById('timeline-slider').addEventListener('input', (e) => {
    currentFrame = parseInt(e.target.value);
    document.getElementById('current-frame-display').innerText = currentFrame;
    objects.forEach(obj => applyKeyframeState(obj, currentFrame));
    updateKeyframeTrackUI();
});

document.getElementById('btn-play').addEventListener('click', () => {
    isPlaying = !isPlaying;
    const icon = document.getElementById('btn-play').querySelector('i');
    icon.setAttribute('data-lucide', isPlaying ? 'pause' : 'play');
    lucide.createIcons();
});

document.getElementById('btn-play-preview').addEventListener('click', () => {
    isPlaying = !isPlaying;
    const btn = document.getElementById('btn-play-preview');
    btn.innerHTML = isPlaying ? `<i data-lucide="pause" class="w-4 h-4"></i> Pauzeer Preview` : `<i data-lucide="play" class="w-4 h-4"></i> Speel Animatie`;
    lucide.createIcons();
});

document.getElementById('btn-add-keyframe').addEventListener('click', () => {
    if (selectedObject) {
        saveKeyframeData(selectedObject, currentFrame);
        updateKeyframeTrackUI();
        updateKeyframesListUI();
    } else {
        alert("Selecteer eerst een object om een keyframe toe te voegen!");
    }
});

// Realtime Scene Settings Updates
document.getElementById('scene-sky-color').addEventListener('input', (e) => {
    skyColor = e.target.value;
    document.getElementById('canvas-container').style.background = `radial-gradient(circle at center, ${skyColor} 0%, #020617 100%)`;
});

document.getElementById('scene-ground-color').addEventListener('input', (e) => {
    groundColor = e.target.value;
    groundMesh.material.color.set(groundColor);
});

document.getElementById('scene-show-grid').addEventListener('change', (e) => {
    showGrid = e.target.checked;
    gridHelper.visible = showGrid;
});

document.getElementById('scene-export-grid').addEventListener('change', (e) => {
    exportGrid = e.target.checked;
});

document.getElementById('scene-lock-camera').addEventListener('change', (e) => {
    lockCamera = e.target.checked;
});

// Properties Inputs Realtime Update
function updateSelectedObjectFromInputs() {
    if (!selectedObject) return;

    selectedObject.mesh.position.set(
        parseFloat(document.getElementById('prop-pos-x').value) || 0,
        parseFloat(document.getElementById('prop-pos-y').value) || 0,
        parseFloat(document.getElementById('prop-pos-z').value) || 0
    );

    selectedObject.mesh.rotation.set(
        (parseFloat(document.getElementById('prop-rot-x').value) || 0) * (Math.PI / 180),
        (parseFloat(document.getElementById('prop-rot-y').value) || 0) * (Math.PI / 180),
        (parseFloat(document.getElementById('prop-rot-z').value) || 0) * (Math.PI / 180)
    );

    selectedObject.mesh.scale.set(
        parseFloat(document.getElementById('prop-scale-x').value) || 1,
        parseFloat(document.getElementById('prop-scale-y').value) || 1,
        parseFloat(document.getElementById('prop-scale-z').value) || 1
    );

    // 3D Text specifieke update
    if (selectedObject.type === '3dtext') {
        const textVal = document.getElementById('prop-text-val').value;
        selectedObject.textVal = textVal;
        const colorHex = document.getElementById('prop-color').value;
        selectedObject.mesh.material.map = create3DTextTexture(textVal, colorHex);
    }

    if (selectedObject.mesh.material) {
        const colorHex = document.getElementById('prop-color').value;
        selectedObject.mesh.material.color.set(colorHex);
        document.getElementById('color-hex').innerText = colorHex.toUpperCase();

        const opacityVal = parseInt(document.getElementById('prop-opacity').value);
        selectedObject.mesh.material.opacity = opacityVal / 100;
        selectedObject.mesh.material.transparent = opacityVal < 100;
        document.getElementById('opacity-val').innerText = opacityVal;
    }

    selectedObject.clickAction = document.getElementById('prop-click-action').value;
}

['prop-pos-x', 'prop-pos-y', 'prop-pos-z', 
 'prop-rot-x', 'prop-rot-y', 'prop-rot-z', 
 'prop-scale-x', 'prop-scale-y', 'prop-scale-z', 'prop-text-val'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateSelectedObjectFromInputs);
});

document.getElementById('prop-color').addEventListener('input', updateSelectedObjectFromInputs);
document.getElementById('prop-opacity').addEventListener('input', updateSelectedObjectFromInputs);
document.getElementById('prop-click-action').addEventListener('change', updateSelectedObjectFromInputs);

document.getElementById('prop-name').addEventListener('input', (e) => {
    if (selectedObject) {
        selectedObject.name = e.target.value;
        updateUI();
    }
});

// --- EXPORT SYSTEM (STANDALONE HTML GENERATOR) ---
document.getElementById('btn-export').addEventListener('click', () => {
    if (objects.length === 0) {
        alert("Voeg eerst wat objecten toe aan de scène voordat je exporteert!");
        return;
    }

    const exportData = objects.map(obj => {
        let type = obj.type;
        if (obj.mesh.geometry instanceof THREE.SphereGeometry) type = 'sphere';
        else if (obj.mesh.geometry instanceof THREE.CylinderGeometry) type = 'cylinder';
        else if (obj.mesh.geometry instanceof THREE.ConeGeometry) type = 'cone';
        else if (obj.mesh instanceof THREE.Group && obj.type !== 'camera') type = 'group';

        return {
            name: obj.name,
            type: type,
            keyframes: obj.keyframes,
            clickAction: obj.clickAction,
            textVal: obj.textVal || "",
            isGroup: obj.mesh instanceof THREE.Group && obj.type !== 'camera',
            templateType: obj.name.split(' ')[0].toLowerCase()
        };
    });

    const htmlContent = `
<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Designer - Mattyou Studios™</title>
    <style>
        body { margin: 0; overflow: hidden; font-family: 'Inter', sans-serif; background: radial-gradient(circle at center, ${skyColor} 0%, #020617 100%); }
        #canvas-container { width: 100vw; height: 100vh; }
        #branding { position: absolute; top: 20px; left: 20px; color: white; pointer-events: none; z-index: 10; }
        #branding h1 { margin:0; font-size: 24px; font-weight: 700; letter-spacing: -0.05em; }
        #branding p { margin:2px 0 0 0; font-size: 10px; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.1em; }
        
        /* 2D Overlay Menu Styles */
        .overlay-menu {
            position: fixed;
            inset: 0;
            background: rgba(2, 6, 23, 0.85);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
        }
        .overlay-menu.active {
            opacity: 1;
            pointer-events: auto;
        }
        .menu-box {
            background: rgba(15, 23, 42, 0.95);
            border: 1px solid rgba(99, 102, 241, 0.3);
            padding: 30px;
            border-radius: 16px;
            max-width: 500px;
            width: 90%;
            text-align: center;
            color: white;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
            position: relative;
        }
        .close-btn {
            position: absolute;
            top: 15px;
            right: 15px;
            background: transparent;
            border: none;
            color: #94a3b8;
            font-size: 20px;
            cursor: pointer;
            transition: color 0.2s;
        }
        .close-btn:hover { color: white; }
    </style>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
</head>
<body>
    <div id="branding">
        <h1>Designer</h1>
        <p>Made by Mattyou Studios™</p>
    </div>

    <div id="canvas-container"></div>

    <!-- Dynamisch gegenereerde 2D Overlays -->
    ${menus.map(m => `
    <div id="overlay-${m.id}" class="overlay-menu">
        <div class="menu-box">
            <button class="close-btn" onclick="closeMenu('${m.id}')">&times;</button>
            <h2>${m.title}</h2>
            <div>${m.content}</div>
        </div>
    </div>
    `).join('')}

    <script>
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(8, 8, 12);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        document.getElementById('canvas-container').appendChild(renderer.domElement);

        // OrbitControls conditioneel initialiseren
        let controls;
        if (!${lockCamera}) {
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
        }

        // Lights
        scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(10, 20, 15);
        scene.add(dirLight);

        // Grid Helper (indien ingeschakeld voor export)
        if (${exportGrid}) {
            scene.add(new THREE.GridHelper(20, 20, 0x6366f1, 0x334155));
        }

        // Ground Plane
        const groundGeo = new THREE.PlaneGeometry(40, 40);
        const groundMat = new THREE.MeshStandardMaterial({ color: '${groundColor}', roughness: 0.8 });
        const groundMesh = new THREE.Mesh(groundGeo, groundMat);
        groundMesh.rotation.x = -Math.PI / 2;
        scene.add(groundMesh);

        const animationData = ${JSON.stringify(exportData)};
        const loadedObjects = [];

        // Helper om 3D Tekst te genereren
        function create3DTextTexture(text, colorHex) {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, 512, 128);
            ctx.font = 'Bold 48px sans-serif';
            ctx.fillStyle = colorHex;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, 256, 64);
            return new THREE.CanvasTexture(canvas);
        }

        // Helper om templates te bouwen
        function createTemplate(type) {
            const group = new THREE.Group();
            if (type === 'cow') {
                const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
                const spotMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
                const pinkMat = new THREE.MeshStandardMaterial({ color: 0xffb6c1 });
                const hoofMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
                const body = new THREE.Mesh(new THREE.BoxGeometry(2, 1.4, 3), bodyMat); body.position.y = 1.2; group.add(body);
                const spot1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.8), spotMat); spot1.position.set(0.71, 1.4, 0.5); group.add(spot1);
                const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), bodyMat); head.position.set(0, 2.1, 1.6); group.add(head);
                const snout = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.6), pinkMat); snout.position.set(0, 1.85, 2.2); group.add(snout);
            } else if (type === 'house') {
                const wallMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9 });
                const roofMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });
                const doorMat = new THREE.MeshStandardMaterial({ color: 0x78350f });
                const walls = new THREE.Mesh(new THREE.BoxGeometry(3, 2.2, 3), wallMat); walls.position.y = 1.1; group.add(walls);
                const roof = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.8, 4), roofMat); roof.position.y = 3.1; roof.rotation.y = Math.PI/4; group.add(roof);
                const door = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.4, 0.1), doorMat); door.position.set(0, 0.7, 1.51); group.add(door);
            } else if (type === 'tree') {
                const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f });
                const leavesMat = new THREE.MeshStandardMaterial({ color: 0x10b981 });
                const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 2.5, 8), trunkMat); trunk.position.y = 1.25; group.add(trunk);
                const leaf1 = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 8), leavesMat); leaf1.position.y = 2.8; group.add(leaf1);
            } else if (type === 'grass') {
                const grassMat = new THREE.MeshStandardMaterial({ color: 0x22c55e });
                const base = new THREE.Mesh(new THREE.BoxGeometry(4, 0.3, 4), new THREE.MeshStandardMaterial({ color: 0x451a03 })); base.position.y = 0.15; group.add(base);
                const topGrass = new THREE.Mesh(new THREE.BoxGeometry(4.05, 0.1, 4.05), grassMat); topGrass.position.y = 0.31; group.add(topGrass);
            }
            return group;
        }

        // Bouw de scene op
        animationData.forEach(data => {
            let mesh;
            if (data.type === 'camera') {
                // Maak een onzichtbare dummy voor camera animatie
                mesh = new THREE.Group();
            } else if (data.isGroup) {
                mesh = createTemplate(data.templateType);
            } else if (data.type === '3dtext') {
                const texture = create3DTextTexture(data.textVal, "#6366f1");
                const geom = new THREE.PlaneGeometry(4, 1);
                const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
                mesh = new THREE.Mesh(geom, mat);
            } else {
                let geom;
                if (data.type === 'cube') geom = new THREE.BoxGeometry(1.5, 1.5, 1.5);
                else if (data.type === 'sphere') geom = new THREE.SphereGeometry(1, 32, 32);
                else if (data.type === 'cylinder') geom = new THREE.CylinderGeometry(0.8, 0.8, 2, 32);
                else if (data.type === 'cone') geom = new THREE.ConeGeometry(1, 2, 32);
                
                const mat = new THREE.MeshStandardMaterial({ color: 0x6366f1, roughness: 0.4 });
                mesh = new THREE.Mesh(geom, mat);
            }
            scene.add(mesh);
            loadedObjects.push({ mesh: mesh, keyframes: data.keyframes, clickAction: data.clickAction, type: data.type });
        });

        // Raycaster voor klik-triggers
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        window.addEventListener('pointerdown', (e) => {
            mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);

            const intersects = raycaster.intersectObjects(loadedObjects.map(o => o.mesh), true);
            if (intersects.length > 0) {
                let hitMesh = intersects[0].object;
                while (hitMesh.parent && hitMesh.parent.type !== 'Scene') {
                    hitMesh = hitMesh.parent;
                }
                const found = loadedObjects.find(o => o.mesh === hitMesh);
                if (found && found.clickAction !== 'none') {
                    openMenu(found.clickAction);
                }
            }
        });

        function openMenu(id) {
            document.getElementById('overlay-' + id).classList.add('active');
        }

        window.closeMenu = function(id) {
            document.getElementById('overlay-' + id).classList.remove('active');
        }

        // Animatie Loop
        let currentFrame = 0;

        function applyKeyframeState(obj, frame) {
            const keys = Object.keys(obj.keyframes).map(Number).sort((a, b) => a - b);
            if (keys.length === 0) return;

            if (obj.keyframes[frame]) {
                const state = obj.keyframes[frame];
                obj.mesh.position.set(state.pos.x, state.pos.y, state.pos.z);
                obj.mesh.rotation.set(state.rot.x, state.rot.y, state.rot.z);
                obj.mesh.scale.set(state.scale.x, state.scale.y, state.scale.z);
                return;
            }

            let prevFrame = null, nextFrame = null;
            for (let i = 0; i < keys.length; i++) {
                if (keys[i] < frame) prevFrame = keys[i];
                if (keys[i] > frame && nextFrame === null) nextFrame = keys[i];
            }

            if (prevFrame !== null && nextFrame !== null) {
                const t = (frame - prevFrame) / (nextFrame - prevFrame);
                const start = obj.keyframes[prevFrame];
                const end = obj.keyframes[nextFrame];

                obj.mesh.position.set(
                    THREE.MathUtils.lerp(start.pos.x, end.pos.x, t),
                    THREE.MathUtils.lerp(start.pos.y, end.pos.y, t),
                    THREE.MathUtils.lerp(start.pos.z, end.pos.z, t)
                );
                obj.mesh.rotation.set(
                    THREE.MathUtils.lerp(start.rot.x, end.rot.x, t),
                    THREE.MathUtils.lerp(start.rot.y, end.rot.y, t),
                    THREE.MathUtils.lerp(start.rot.z, end.rot.z, t)
                );
                obj.mesh.scale.set(
                    THREE.MathUtils.lerp(start.scale.x, end.scale.x, t),
                    THREE.MathUtils.lerp(start.scale.y, end.scale.y, t),
                    THREE.MathUtils.lerp(start.scale.z, end.scale.z, t)
                );
            }
        }

        function animate() {
            requestAnimationFrame(animate);
            if (controls) controls.update();

            currentFrame = (currentFrame + 1) % 100;
            loadedObjects.forEach(obj => {
                applyKeyframeState(obj, currentFrame);
                if (obj.type === 'camera') {
                    camera.position.copy(obj.mesh.position);
                    camera.rotation.copy(obj.mesh.rotation);
                }
            });

            renderer.render(scene, camera);
        }

        animate();

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    </script>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'designer_3d_website.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// Start de engine!
initThree();
