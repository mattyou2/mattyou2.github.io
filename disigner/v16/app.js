// --- STATE MANAGEMENT ---
let scene, camera, renderer, controls, transformControls;
let objects = []; // Platte lijst van geregistreerde objecten voor beheer
let selectedObjects = []; // Multi-selectie array
let currentFrame = 0;
let isPlaying = false;
let animationFrameId = null;

// Project & Omgevingsinstellingen
let currentProjectName = "Mijn Eerste Project";
let skyColor = '#0f172a';
let groundColor = '#22c55e';
let showGrid = true;
let exportGrid = false;
let lockCamera = false;
let activeTool = 'select'; // select, translate, rotate, scale, combined

// Camera Perspective Snap State
let savedCameraPos = { x: 8, y: 8, z: 12 };
let savedCameraTarget = { x: 0, y: 0, z: 0 };

// UI lists
let menus = []; // 2D overlays
let screenButtons = []; // Permanente 2D schermknoppen
let activeEditingMenuId = null;
let activeEditingScreenBtnId = null;
let clipboard = null; // Knippen/Kopiëren buffer

// Undo Stack
let undoStack = [];
const MAX_UNDO_STEPS = 40;

let canvasContainer;
let gridHelper, groundMesh;

// --- INITIALIZATION ---
function initThree() {
    canvasContainer = document.getElementById('canvas-container');
    if (!canvasContainer) {
        console.error("Fout: canvas-container niet gevonden!");
        return;
    }

    scene = new THREE.Scene();
    
    // Camera
    camera = new THREE.PerspectiveCamera(60, canvasContainer.clientWidth / canvasContainer.clientHeight, 0.1, 1000);
    camera.position.set(savedCameraPos.x, savedCameraPos.y, savedCameraPos.z);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    canvasContainer.appendChild(renderer.domElement);

    // OrbitControls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(savedCameraTarget.x, savedCameraTarget.y, savedCameraTarget.z);
    controls.enabled = !lockCamera; // Pas direct toe bij opstarten!

    // TransformControls (Gizmo)
    transformControls = new THREE.TransformControls(camera, renderer.domElement);
    transformControls.size = 0.75;
    scene.add(transformControls);

    // Voorkom dat OrbitControls beweegt tijdens het slepen van de Gizmo
    transformControls.addEventListener('dragging-changed', (event) => {
        controls.enabled = !event.value && !lockCamera;
        if (!event.value) {
            pushUndo();
            saveCurrentProjectSilently();
        }
    });

    // Update object eigenschappen live tijdens het slepen van de gizmo
    transformControls.addEventListener('change', () => {
        if (transformControls.object) {
            selectedObjects.forEach(obj => {
                updatePropertiesPanelFromMesh(obj.mesh, obj);
                saveKeyframeData(obj, currentFrame);
            });
        }
    });

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

    // Click Raycaster voor 3D selectie
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    canvasContainer.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || transformControls.dragging) return;

        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);
        
        const checkList = [];
        objects.forEach(obj => {
            obj.mesh.traverse(child => {
                if (child.isMesh) checkList.push(child);
            });
        });

        const intersects = raycaster.intersectObjects(checkList, true);
        if (intersects.length > 0) {
            let hitMesh = intersects[0].object;
            while (hitMesh.parent && !objects.some(o => o.id === hitMesh.userData.id)) {
                hitMesh = hitMesh.parent;
            }
            
            const found = objects.find(o => o.id === hitMesh.userData.id);
            if (found) {
                if (e.shiftKey) {
                    toggleSelectObject(found);
                } else {
                    selectSingleObject(found);
                }
            }
        } else {
            if (!e.shiftKey) {
                clearSelection();
            }
        }
    });

    window.addEventListener('resize', onWindowResize);
    setupContextMenus();

    // Sneltoetsen (Ctrl + Z)
    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            undo();
        }
    });

    // --- READ URL PARAMS ON LAUNCH ---
    const urlParams = new URLSearchParams(window.location.search);
    const projectParam = urlParams.get('project');

    loadProjectList();
    if (projectParam) {
        currentProjectName = projectParam;
    }
    loadProject(currentProjectName);
    renderCustomModelsList();

    // Start de engine loop
    animate();
}

function animate() {
    requestAnimationFrame(animate);
    if (controls) controls.update();
    
    if (isPlaying) {
        advanceFrame();
    }
    
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

function onWindowResize() {
    if (!canvasContainer || !renderer || !camera) return;
    camera.aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
}

function resetCamera() {
    camera.position.set(savedCameraPos.x, savedCameraPos.y, savedCameraPos.z);
    controls.target.set(savedCameraTarget.x, savedCameraTarget.y, savedCameraTarget.z);
    camera.lookAt(savedCameraTarget.x, savedCameraTarget.y, savedCameraTarget.z);
}

// --- CAMERA PERSPECTIVE SNAP FEATURE ---
function captureCameraPerspective() {
    pushUndo();
    savedCameraPos = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
    savedCameraTarget = { x: controls.target.x, y: controls.target.y, z: controls.target.z };
    saveCurrentProjectSilently();
    alert("Camera startpositie succesvol vastgezet op deze weergave!");
}

function clearScene() {
    if (confirm("Weet je zeker dat je de hele scène wilt leegmaken?")) {
        pushUndo();
        objects.forEach(obj => scene.remove(obj.mesh));
        objects = [];
        clearSelection();
        updateUI();
        saveCurrentProjectSilently();
    }
}

function goToMainMenu() {
    window.location.href = 'index.html';
}

function toggleTimeline() {
    const timeline = document.getElementById('timeline-panel');
    if (timeline) {
        timeline.classList.toggle('hidden');
        onWindowResize();
    }
}

// --- UNDO SYSTEM ---
function pushUndo() {
    const state = JSON.stringify({
        skyColor,
        groundColor,
        showGrid,
        exportGrid,
        lockCamera,
        savedCameraPos,
        savedCameraTarget,
        menus,
        screenButtons,
        objects: objects.map(serializeObject)
    });
    undoStack.push(state);
    if (undoStack.length > MAX_UNDO_STEPS) {
        undoStack.shift();
    }
}

function undo() {
    if (undoStack.length === 0) return;
    const previousStateRaw = undoStack.pop();
    const data = JSON.parse(previousStateRaw);

    objects.forEach(obj => scene.remove(obj.mesh));
    objects = [];
    clearSelection();

    skyColor = data.skyColor || '#0f172a';
    groundColor = data.groundColor || '#22c55e';
    showGrid = data.showGrid !== undefined ? data.showGrid : true;
    exportGrid = data.exportGrid || false;
    lockCamera = data.lockCamera || false;
    savedCameraPos = data.savedCameraPos || { x: 8, y: 8, z: 12 };
    savedCameraTarget = data.savedCameraTarget || { x: 0, y: 0, z: 0 };
    menus = data.menus || [];
    screenButtons = data.screenButtons || [];

    if (data.objects) {
        data.objects.forEach(objData => {
            deserializeObject(objData);
        });
    }

    document.getElementById('scene-sky-color').value = skyColor;
    document.getElementById('scene-ground-color').value = groundColor;
    document.getElementById('scene-show-grid').checked = showGrid;
    document.getElementById('scene-export-grid').checked = exportGrid;
    document.getElementById('scene-lock-camera').checked = lockCamera;

    gridHelper.visible = showGrid;
    groundMesh.material.color.set(groundColor);
    document.getElementById('canvas-container').style.background = `radial-gradient(circle at center, ${skyColor} 0%, #020617 100%)`;

    if (controls) {
        controls.enabled = !lockCamera;
    }

    updateMenusUI();
    updateScreenButtonsUI();
    updateUI();
    saveCurrentProjectSilently();
}

// --- TRANSFORM TOOLS (GIZMO) ---
function setTransformTool(tool) {
    activeTool = tool;
    document.querySelectorAll('[id^="tool-"]').forEach(btn => btn.classList.remove('tool-active'));
    const activeBtn = document.getElementById(`tool-${tool}`);
    if (activeBtn) activeBtn.classList.add('tool-active');

    if (tool === 'select' || selectedObjects.length === 0) {
        transformControls.detach();
    } else {
        const primary = selectedObjects[selectedObjects.length - 1];
        transformControls.attach(primary.mesh);
        
        if (tool === 'translate') transformControls.setMode('translate');
        else if (tool === 'rotate') transformControls.setMode('rotate');
        else if (tool === 'scale') transformControls.setMode('scale');
        else if (tool === 'combined') {
            transformControls.setMode('translate');
        }
    }
}

// --- SELECTION SYSTEM ---
function selectSingleObject(objData) {
    selectedObjects = [objData];
    applySelectionEffects();
}

function toggleSelectObject(objData) {
    const idx = selectedObjects.findIndex(o => o.id === objData.id);
    if (idx !== -1) {
        selectedObjects.splice(idx, 1);
    } else {
        selectedObjects.push(objData);
    }
    applySelectionEffects();
}

function clearSelection() {
    selectedObjects = [];
    applySelectionEffects();
}

// --- SERIALIZATION HELPERS ---
function serializeObject(obj) {
    let geomType = 'group';
    if (obj.mesh.isMesh) {
        if (obj.mesh.geometry.type === 'BoxGeometry') geomType = 'cube';
        else if (obj.mesh.geometry.type === 'SphereGeometry') geomType = 'sphere';
        else if (obj.mesh.geometry.type === 'CylinderGeometry') geomType = 'cylinder';
        else if (obj.type === '3dtext') geomType = '3dtext';
    }
    return {
        id: obj.id,
        parentId: obj.parentId,
        name: obj.name,
        type: obj.type,
        geomType: geomType, // Cruciaal voor perfecte export!
        pos: { x: obj.mesh.position.x, y: obj.mesh.position.y, z: obj.mesh.position.z },
        rot: { x: obj.mesh.quaternion.x, y: obj.mesh.quaternion.y, z: obj.mesh.quaternion.z, w: obj.mesh.quaternion.w },
        scale: { x: obj.mesh.scale.x, y: obj.mesh.scale.y, z: obj.mesh.scale.z },
        color: (obj.mesh.material && obj.mesh.material.color) ? "#" + obj.mesh.material.color.getHexString() : "#6366f1",
        opacity: (obj.mesh.material && typeof obj.mesh.material.opacity === 'number') ? obj.mesh.material.opacity : 1,
        clickAction: obj.clickAction,
        keyframes: obj.keyframes,
        isGroup: obj.isGroup || false,
        textVal: obj.textVal || ""
    };
}

function deserializeObject(data) {
    let mesh;
    const geomType = data.geomType || data.type; // Fallback

    if (data.isGroup || geomType === 'group') {
        mesh = new THREE.Group();
    } else if (geomType === '3dtext') {
        const texture = create3DTextTexture(data.textVal, data.color);
        mesh = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide }));
    } else {
        let geom;
        if (geomType === 'cube' || geomType === 'box') geom = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        else if (geomType === 'sphere') geom = new THREE.SphereGeometry(1, 32, 32);
        else if (geomType === 'cylinder') geom = new THREE.CylinderGeometry(0.8, 0.8, 2, 32);
        else geom = new THREE.BoxGeometry(1, 1, 1);
        
        const mat = new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.4, transparent: data.opacity < 1, opacity: data.opacity });
        mesh = new THREE.Mesh(geom, mat);
    }

    mesh.position.set(data.pos.x, data.pos.y, data.pos.z);
    mesh.quaternion.set(data.rot.x, data.rot.y, data.rot.z, data.rot.w);
    mesh.scale.set(data.scale.x, data.scale.y, data.scale.z);

    const newObj = createBaseObjectData(mesh, data.type.charAt(0).toUpperCase() + data.type.slice(1), {
        id: data.id,
        name: data.name,
        parentId: data.parentId,
        keyframes: data.keyframes,
        clickAction: data.clickAction,
        isGroup: data.isGroup,
        textVal: data.textVal
    });

    return newObj;
}

function applySelectionEffects() {
    objects.forEach(obj => {
        obj.mesh.traverse(child => {
            if (child.isMesh && child.material) {
                child.material.emissive = child.material.emissive || new THREE.Color(0x000000);
                child.material.emissive.setHex(0x000000);
            }
        });
    });

    selectedObjects.forEach(obj => {
        obj.mesh.traverse(child => {
            if (child.isMesh && child.material) {
                child.material.emissive = child.material.emissive || new THREE.Color(0x000000);
                child.material.emissive.setHex(0x111122);
            }
        });
    });

    if (selectedObjects.length > 0 && activeTool !== 'select') {
        const primary = selectedObjects[selectedObjects.length - 1];
        transformControls.attach(primary.mesh);
    } else {
        transformControls.detach();
    }

    updateUI();
    updatePropertiesPanel();
}

// --- OBJECT & GROUP CREATION ---
let objectCounter = 0;

function createBaseObjectData(mesh, nameType, extraData = {}) {
    objectCounter++;
    const objId = extraData.id || 'obj_' + Date.now() + '_' + objectCounter;
    
    mesh.userData = { id: objId };
    mesh.traverse(child => {
        child.userData = { id: objId };
    });

    const objData = {
        id: objId,
        name: extraData.name || `${nameType} #${objectCounter}`,
        mesh: mesh,
        type: nameType.toLowerCase(),
        clickAction: extraData.clickAction || 'none',
        keyframes: extraData.keyframes || {},
        parentId: extraData.parentId || null,
        isGroup: extraData.isGroup || false,
        textVal: extraData.textVal || ""
    };
    
    if (Object.keys(objData.keyframes).length === 0) {
        saveKeyframeData(objData, currentFrame);
    }
    
    objects.push(objData);
    
    if (!objData.parentId) {
        scene.add(mesh);
    }
    
    selectSingleObject(objData);
    updateUI();
    return objData;
}

function addObject(type) {
    pushUndo();
    let mesh;

    if (type === '3dtext') {
        const texture = create3DTextTexture("Mattyou Studios", "#6366f1");
        const geometry = new THREE.PlaneGeometry(4, 1);
        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
        mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(0, 2, 0);
        createBaseObjectData(mesh, '3DText', { textVal: "Mattyou Studios" });
        saveCurrentProjectSilently();
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
    }

    mesh = new THREE.Mesh(geometry, material);
    mesh.position.set((Math.random() - 0.5) * 4, 1, (Math.random() - 0.5) * 4);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    createBaseObjectData(mesh, type.charAt(0).toUpperCase() + type.slice(1));
    saveCurrentProjectSilently();
}

function groupSelectedObjects() {
    if (selectedObjects.length === 0) {
        alert("Selecteer eerst objecten om te groeperen!");
        return;
    }
    pushUndo();

    const group = new THREE.Group();
    scene.add(group);

    const groupData = createBaseObjectData(group, 'Groep', { isGroup: true });

    selectedObjects.forEach(obj => {
        if (obj.id === groupData.id) return;
        group.add(obj.mesh);
        obj.parentId = groupData.id;
    });

    selectSingleObject(groupData);
    updateUI();
    saveCurrentProjectSilently();
}

function create3DTextTexture(text, colorHex) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, 1024, 256);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.roundRect ? ctx.roundRect(10, 10, 1004, 236, 30) : ctx.rect(10, 10, 1004, 236);
    ctx.fill();
    
    ctx.font = 'Bold 96px Inter, sans-serif';
    ctx.fillStyle = colorHex;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;
    
    ctx.fillText(text, 512, 128);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    return texture;
}

// --- PREMIUM TEMPLATES ---
function addTemplate(type) {
    pushUndo();
    const group = new THREE.Group();
    group.position.set((Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3);
    
    const groupData = createBaseObjectData(group, type.charAt(0).toUpperCase() + type.slice(1), { isGroup: true });

    if (type === 'cow') {
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
        const spotMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
        const pinkMat = new THREE.MeshStandardMaterial({ color: 0xffb6c1, roughness: 0.8 });

        const body = new THREE.Mesh(new THREE.BoxGeometry(2, 1.4, 3), bodyMat);
        body.position.y = 1.2;
        group.add(body);
        createBaseObjectData(body, 'Koe Lichaam', { parentId: groupData.id });

        const spot1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.8), spotMat);
        spot1.position.set(0.71, 1.4, 0.5);
        group.add(spot1);
        createBaseObjectData(spot1, 'Vlek A', { parentId: groupData.id });

        const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), bodyMat);
        head.position.set(0, 2.1, 1.6);
        group.add(head);
        createBaseObjectData(head, 'Koe Kop', { parentId: groupData.id });

        const snout = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.6), pinkMat);
        snout.position.set(0, 1.85, 2.2);
        group.add(snout);
        createBaseObjectData(snout, 'Snuit', { parentId: groupData.id });
    } 
    else if (type === 'house') {
        const wallMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.5 });
        const roofMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.6 });
        const doorMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });

        const walls = new THREE.Mesh(new THREE.BoxGeometry(3, 2.2, 3), wallMat);
        walls.position.y = 1.1;
        group.add(walls);
        createBaseObjectData(walls, 'Muren', { parentId: groupData.id });

        const roof = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.8, 4), roofMat);
        roof.position.y = 3.1;
        roof.rotation.y = Math.PI / 4;
        group.add(roof);
        createBaseObjectData(roof, 'Dak', { parentId: groupData.id });

        const door = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.4, 0.1), doorMat);
        door.position.set(0, 0.7, 1.51);
        group.add(door);
        createBaseObjectData(door, 'Deur', { parentId: groupData.id });
    }
    else if (type === 'tree') {
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
        const leavesMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.8 });

        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 2.5, 8), trunkMat);
        trunk.position.y = 1.25;
        group.add(trunk);
        createBaseObjectData(trunk, 'Stam', { parentId: groupData.id });

        const leaves = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 8), leavesMat);
        leaves.position.y = 2.8;
        group.add(leaves);
        createBaseObjectData(leaves, 'Bladeren', { parentId: groupData.id });
    }

    selectSingleObject(groupData);
    updateUI();
    saveCurrentProjectSilently();
}

// --- BROWSER CUSTOM MODELS (PREFABS) ---
function saveSelectionAsModel() {
    if (selectedObjects.length === 0) {
        alert("Selecteer eerst een object of groep om op te slaan!");
        return;
    }
    const primary = selectedObjects[selectedObjects.length - 1];
    const modelName = prompt("Voer een naam in voor dit 3D model:", primary.name);
    if (!modelName) return;

    const collected = [];
    function collect(obj) {
        collected.push(serializeObject(obj));
        const children = objects.filter(o => o.parentId === obj.id);
        children.forEach(collect);
    }
    collect(primary);

    localStorage.setItem(`custom_model_${modelName}`, JSON.stringify(collected));
    alert(`Model "${modelName}" succesvol opgeslagen in je browser!`);
    renderCustomModelsList();
}

function renderCustomModelsList() {
    const list = document.getElementById('custom-models-list');
    if (!list) return;
    list.innerHTML = '';

    let keys = Object.keys(localStorage).filter(k => k.startsWith('custom_model_'));
    if (keys.length === 0) {
        list.innerHTML = `<div class="text-center py-4 text-slate-500 text-[10px]">Geen opgeslagen modellen.</div>`;
        return;
    }

    keys.forEach(key => {
        const name = key.replace('custom_model_', '');
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between p-2 bg-slate-800/40 rounded border border-slate-700/30 text-xs';
        div.innerHTML = `
            <span class="font-medium text-slate-300 truncate max-w-[120px]">${name}</span>
            <div class="flex gap-1">
                <button onclick="spawnModel('${name}')" class="p-1 text-emerald-400 hover:text-emerald-300" title="Plaats in scène"><i data-lucide="plus-circle" class="w-3.5 h-3.5"></i></button>
                <button onclick="deleteCustomModel('${name}')" class="p-1 text-red-400 hover:text-red-300" title="Verwijder model"><i data-lucide="trash" class="w-3.5 h-3.5"></i></button>
            </div>
        `;
        list.appendChild(div);
    });
    lucide.createIcons();
}

function deleteCustomModel(name) {
    if (confirm(`Weet je zeker dat je het model "${name}" wilt verwijderen uit je browser?`)) {
        localStorage.removeItem(`custom_model_${name}`);
        renderCustomModelsList();
    }
}

function spawnModel(modelName) {
    const raw = localStorage.getItem(`custom_model_${modelName}`);
    if (!raw) return;

    pushUndo();
    const collectedData = JSON.parse(raw);

    const idMap = {};
    collectedData.forEach(data => {
        objectCounter++;
        const newId = 'obj_' + Date.now() + '_' + objectCounter;
        idMap[data.id] = newId;
    });

    const spawnedObjects = [];

    collectedData.forEach(data => {
        const newId = idMap[data.id];
        const newParentId = data.parentId ? idMap[data.parentId] : null;

        let mesh;
        const geomType = data.geomType || data.type;

        if (data.isGroup || geomType === 'group') {
            mesh = new THREE.Group();
        } else if (geomType === '3dtext') {
            const texture = create3DTextTexture(data.textVal, data.color);
            mesh = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide }));
        } else {
            let geom;
            if (geomType === 'cube' || geomType === 'box') geom = new THREE.BoxGeometry(1.5, 1.5, 1.5);
            else if (geomType === 'sphere') geom = new THREE.SphereGeometry(1, 32, 32);
            else if (geomType === 'cylinder') geom = new THREE.CylinderGeometry(0.8, 0.8, 2, 32);
            else geom = new THREE.BoxGeometry(1, 1, 1);

            const mat = new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.4, transparent: data.opacity < 1, opacity: data.opacity });
            mesh = new THREE.Mesh(geom, mat);
        }

        mesh.position.set(data.pos.x + 1, data.pos.y, data.pos.z + 1);
        mesh.quaternion.set(data.rot.x, data.rot.y, data.rot.z, data.rot.w);
        mesh.scale.set(data.scale.x, data.scale.y, data.scale.z);

        mesh.userData = { id: newId };
        mesh.traverse(child => {
            child.userData = { id: newId };
        });

        const objData = {
            id: newId,
            name: `${data.name} (Kloon)`,
            mesh: mesh,
            type: data.type,
            clickAction: data.clickAction,
            keyframes: JSON.parse(JSON.stringify(data.keyframes)),
            parentId: newParentId,
            isGroup: data.isGroup,
            textVal: data.textVal
        };

        objects.push(objData);
        spawnedObjects.push(objData);
    });

    spawnedObjects.forEach(obj => {
        if (obj.parentId) {
            const parentObj = objects.find(o => o.id === obj.parentId);
            if (parentObj) {
                parentObj.mesh.add(obj.mesh);
            }
        } else {
            scene.add(obj.mesh);
        }
    });

    const rootSpawned = spawnedObjects.find(obj => !obj.parentId);
    if (rootSpawned) {
        selectSingleObject(rootSpawned);
    }

    updateUI();
    saveCurrentProjectSilently();
}

// --- ANIMATION SYSTEM ---
function saveKeyframeData(objData, frame) {
    let colorHex = "#ffffff";
    let opacityVal = 1;

    if (objData.mesh.material) {
        colorHex = "#" + objData.mesh.material.color.getHexString();
        opacityVal = objData.mesh.material.opacity;
    }

    const quaternion = objData.mesh.quaternion.clone();

    objData.keyframes[frame] = {
        pos: { x: objData.mesh.position.x, y: objData.mesh.position.y, z: objData.mesh.position.z },
        rot: { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w },
        scale: { x: objData.mesh.scale.x, y: objData.mesh.scale.y, z: objData.mesh.scale.z },
        color: colorHex,
        opacity: opacityVal
    };
}

function applyKeyframeState(objData, frame) {
    const keys = Object.keys(objData.keyframes).map(Number).sort((a, b) => a - b);
    
    if (keys.length <= 1) {
        if (keys.length === 1 && isPlaying && keys[0] === frame) {
            setMeshState(objData.mesh, objData.keyframes[keys[0]]);
        }
        return;
    }

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

        const qStart = new THREE.Quaternion(start.rot.x, start.rot.y, start.rot.z, start.rot.w);
        const qEnd = new THREE.Quaternion(end.rot.x, end.rot.y, end.rot.z, end.rot.w);
        objData.mesh.quaternion.copy(qStart).slerp(qEnd, t);

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
        if (isPlaying) setMeshState(objData.mesh, objData.keyframes[prevFrame]);
    } else if (nextFrame !== null) {
        if (isPlaying) setMeshState(objData.mesh, objData.keyframes[nextFrame]);
    }
}

function setMeshState(mesh, state) {
    mesh.position.set(state.pos.x, state.pos.y, state.pos.z);
    mesh.quaternion.set(state.rot.x, state.rot.y, state.rot.z, state.rot.w);
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
    const slider = document.getElementById('timeline-slider');
    if (slider) slider.value = currentFrame;
    
    const display = document.getElementById('current-frame-display');
    if (display) display.innerText = currentFrame;
    
    objects.forEach(obj => {
        applyKeyframeState(obj, currentFrame);
    });
}

function stepFrame(dir) {
    currentFrame = Math.max(0, Math.min(100, currentFrame + dir));
    const slider = document.getElementById('timeline-slider');
    if (slider) slider.value = currentFrame;
    
    const display = document.getElementById('current-frame-display');
    if (display) display.innerText = currentFrame;
    
    objects.forEach(obj => applyKeyframeState(obj, currentFrame));
    updateKeyframeTrackUI();
}

// --- RIGHT-CLICK CONTEXT MENU & CLIPBOARD ---
function setupContextMenus() {
    const ctxMenu = document.getElementById('context-menu');
    if (!ctxMenu) return;

    window.addEventListener('contextmenu', (e) => {
        const isOnCanvas = canvasContainer && canvasContainer.contains(e.target);
        const isOnTree = document.getElementById('scene-tree-container') && document.getElementById('scene-tree-container').contains(e.target);

        if (isOnCanvas || isOnTree) {
            e.preventDefault();
            ctxMenu.style.top = `${e.clientY}px`;
            ctxMenu.style.left = `${e.clientX}px`;
            ctxMenu.classList.remove('hidden');
            const pasteBtn = document.getElementById('ctx-paste-btn');
            if (pasteBtn) pasteBtn.disabled = !clipboard;
        } else {
            ctxMenu.classList.add('hidden');
        }
    });

    window.addEventListener('click', () => {
        ctxMenu.classList.add('hidden');
    });
}

function triggerContextAction(action) {
    if (selectedObjects.length === 0 && action !== 'paste') return;
    pushUndo();

    const primary = selectedObjects[selectedObjects.length - 1];

    switch(action) {
        case 'copy':
            clipboard = { action: 'copy', data: serializeObject(primary) };
            break;
        case 'cut':
            clipboard = { action: 'cut', data: serializeObject(primary), originalId: primary.id };
            break;
        case 'paste':
            if (clipboard) {
                const pastedMesh = deserializeObject(clipboard.data);
                if (clipboard.action === 'cut') {
                    deleteObject(clipboard.originalId);
                    clipboard = null;
                }
                selectSingleObject(pastedMesh);
            }
            break;
        case 'duplicate':
            const duplicated = deserializeObject(serializeObject(primary));
            duplicated.mesh.position.x += 1.5;
            selectSingleObject(duplicated);
            break;
        case 'delete':
            selectedObjects.forEach(obj => deleteObject(obj.id));
            clearSelection();
            break;
    }
    updateUI();
    saveCurrentProjectSilently();
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
        pushUndo();
        menus = menus.filter(m => m.id !== id);
        updateMenusUI();
        updatePropertiesPanel();
        saveCurrentProjectSilently();
    }
}

function closeMenuEditor() {
    document.getElementById('menu-editor-modal').classList.add('hidden');
}

function saveMenuData() {
    pushUndo();
    const id = document.getElementById('edit-menu-id').value;
    const title = document.getElementById('edit-menu-title').value;
    const content = document.getElementById('edit-menu-content').value;

    if (activeEditingMenuId) {
        const m = menus.find(menu => menu.id === activeEditingMenuId);
        if (m) {
            m.id = id; m.title = title; m.content = content;
        }
    } else {
        menus.push({ id, title, content });
    }

    closeMenuEditor();
    updateMenusUI();
    updatePropertiesPanel();
    saveCurrentProjectSilently();
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
    if (!list) return;
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

// --- PERMANENT 2D SCREEN BUTTONS (DRAGGABLE) ---
function createNewScreenButton() {
    activeEditingScreenBtnId = null;
    document.getElementById('btn-label').value = 'Nieuwe Knop';
    document.getElementById('btn-action-type').value = 'open_menu';
    document.getElementById('btn-target-link').value = '';
    
    fillScreenBtnMenuDropdown();
    toggleScreenBtnActionFields();
    document.getElementById('screen-button-modal').classList.remove('hidden');
}

function toggleScreenBtnActionFields() {
    const type = document.getElementById('btn-action-type').value;
    if (type === 'open_menu') {
        document.getElementById('btn-target-menu-container').classList.remove('hidden');
        document.getElementById('btn-target-link-container').classList.add('hidden');
    } else if (type === 'link') {
        document.getElementById('btn-target-menu-container').classList.add('hidden');
        document.getElementById('btn-target-link-container').classList.remove('hidden');
    } else {
        document.getElementById('btn-target-menu-container').classList.add('hidden');
        document.getElementById('btn-target-link-container').classList.add('hidden');
    }
}

function fillScreenBtnMenuDropdown() {
    const select = document.getElementById('btn-target-menu');
    if (!select) return;
    select.innerHTML = '';
    menus.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.innerText = m.title;
        select.appendChild(opt);
    });
}

function saveScreenButtonData() {
    pushUndo();
    const label = document.getElementById('btn-label').value;
    const actionType = document.getElementById('btn-action-type').value;
    const targetMenu = document.getElementById('btn-target-menu').value;
    const targetLink = document.getElementById('btn-target-link').value;

    const btnData = {
        id: activeEditingScreenBtnId || 'btn_' + Date.now(),
        label,
        actionType,
        target: actionType === 'open_menu' ? targetMenu : (actionType === 'link' ? targetLink : ''),
        left: activeEditingScreenBtnId ? (screenButtons.find(b => b.id === activeEditingScreenBtnId).left || 50) : 50,
        top: activeEditingScreenBtnId ? (screenButtons.find(b => b.id === activeEditingScreenBtnId).top || 80) : 80
    };

    if (activeEditingScreenBtnId) {
        const idx = screenButtons.findIndex(b => b.id === activeEditingScreenBtnId);
        if (idx !== -1) screenButtons[idx] = btnData;
    } else {
        screenButtons.push(btnData);
    }

    closeScreenButtonEditor();
    updateScreenButtonsUI();
    saveCurrentProjectSilently();
}

function closeScreenButtonEditor() {
    document.getElementById('screen-button-modal').classList.add('hidden');
}

function editScreenButton(id) {
    const btn = screenButtons.find(b => b.id === id);
    if (btn) {
        activeEditingScreenBtnId = id;
        document.getElementById('btn-label').value = btn.label;
        document.getElementById('btn-action-type').value = btn.actionType;
        fillScreenBtnMenuDropdown();
        
        if (btn.actionType === 'open_menu') {
            document.getElementById('btn-target-menu').value = btn.target;
        } else if (btn.actionType === 'link') {
            document.getElementById('btn-target-link').value = btn.target;
        }
        
        toggleScreenBtnActionFields();
        document.getElementById('screen-button-modal').classList.remove('hidden');
    }
}

function deleteScreenButton(id) {
    if (confirm("Weet je zeker dat je deze schermknop wilt verwijderen?")) {
        pushUndo();
        screenButtons = screenButtons.filter(b => b.id !== id);
        updateScreenButtonsUI();
        saveCurrentProjectSilently();
    }
}

function updateScreenButtonsUI() {
    const list = document.getElementById('screen-buttons-list');
    if (!list) return;
    list.innerHTML = '';
    screenButtons.forEach(b => {
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between p-2 bg-slate-800/40 rounded border border-slate-700/30 text-xs';
        div.innerHTML = `
            <span class="font-medium text-slate-300 truncate max-w-[120px]">${b.label}</span>
            <div class="flex gap-1">
                <button onclick="editScreenButton('${b.id}')" class="p-1 text-indigo-400 hover:text-indigo-300"><i data-lucide="edit" class="w-3.5 h-3.5"></i></button>
                <button onclick="deleteScreenButton('${b.id}')" class="p-1 text-red-400 hover:text-red-300"><i data-lucide="trash" class="w-3.5 h-3.5"></i></button>
            </div>
        `;
        list.appendChild(div);
    });

    const liveContainer = document.getElementById('live-screen-buttons-container');
    if (!liveContainer) return;
    liveContainer.innerHTML = '';
    
    screenButtons.forEach(b => {
        const btn = document.createElement('button');
        btn.className = 'draggable-screen-btn pointer-events-auto bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-lg border border-indigo-400/30';
        btn.innerText = b.label;
        
        btn.style.left = `${b.left}%`;
        btn.style.top = `${b.top}%`;

        let isDraggingBtn = false;
        let startX, startY;
        let startLeft, startTop;

        btn.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            isDraggingBtn = true;
            startX = e.clientX;
            startY = e.clientY;
            
            const rect = btn.getBoundingClientRect();
            const containerRect = liveContainer.getBoundingClientRect();
            
            startLeft = ((rect.left - containerRect.left) / containerRect.width) * 100;
            startTop = ((rect.top - containerRect.top) / containerRect.height) * 100;
            
            btn.style.transform = 'scale(1.05)';
            e.stopPropagation();
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDraggingBtn) return;
            const containerRect = liveContainer.getBoundingClientRect();
            
            const deltaX = ((e.clientX - startX) / containerRect.width) * 100;
            const deltaY = ((e.clientY - startY) / containerRect.height) * 100;
            
            let newLeft = Math.max(0, Math.min(95, startLeft + deltaX));
            let newTop = Math.max(0, Math.min(95, startTop + deltaY));
            
            btn.style.left = `${newLeft}%`;
            btn.style.top = `${newTop}%`;
            
            b.left = newLeft;
            b.top = newTop;
        });

        window.addEventListener('mouseup', () => {
            if (isDraggingBtn) {
                isDraggingBtn = false;
                btn.style.transform = 'none';
                pushUndo();
                saveCurrentProjectSilently();
            }
        });

        btn.addEventListener('click', (e) => {
            if (Math.abs(btn.getBoundingClientRect().left - (b.left / 100 * liveContainer.clientWidth)) > 5) return;
            
            if (b.actionType === 'open_menu') {
                previewMenu(b.target);
            } else if (b.actionType === 'link') {
                window.open(b.target, '_blank');
            } else if (b.actionType === 'toggle_animation') {
                isPlaying = !isPlaying;
                const playBtn = document.getElementById('btn-play-preview');
                if (playBtn) {
                    playBtn.innerHTML = isPlaying ? `<i data-lucide="pause" class="w-4 h-4"></i> Pauzeer Preview` : `<i data-lucide="play" class="w-4 h-4"></i> Speel Animatie`;
                }
                lucide.createIcons();
            }
        });

        liveContainer.appendChild(btn);
    });

    lucide.createIcons();
}

// --- SCENE TREE HIERARCHY ---
function updateUI() {
    const objCount = document.getElementById('object-count');
    if (objCount) objCount.innerText = objects.length;
    renderSceneTree();
}

function renderSceneTree() {
    const container = document.getElementById('scene-tree-container');
    if (!container) return;
    container.innerHTML = '';

    const topLevelObjects = objects.filter(obj => !obj.parentId);
    topLevelObjects.forEach(obj => {
        container.appendChild(createTreeNode(obj));
    });

    lucide.createIcons();
}

function createTreeNode(obj) {
    const node = document.createElement('div');
    node.className = 'pl-2';

    const isSelected = selectedObjects.some(o => o.id === obj.id);
    const hasChildren = objects.some(o => o.parentId === obj.id);

    const header = document.createElement('div');
    header.className = `tree-node-hover flex items-center justify-between p-1.5 rounded cursor-pointer transition ${isSelected ? 'bg-indigo-600/30 border-l-2 border-indigo-500 text-white' : 'text-slate-300'}`;
    
    const labelSpan = document.createElement('span');
    labelSpan.className = 'flex items-center gap-1.5 truncate';
    
    let iconName = 'box';
    if (obj.isGroup) iconName = 'folder';
    else if (obj.type === '3dtext') iconName = 'type';
    
    labelSpan.innerHTML = `<i data-lucide="${iconName}" class="w-3.5 h-3.5 text-indigo-400"></i> ${obj.name}`;
    header.appendChild(labelSpan);

    header.addEventListener('click', (e) => {
        e.stopPropagation();
        if (e.shiftKey) {
            toggleSelectObject(obj);
        } else {
            selectSingleObject(obj);
        }
    });

    node.appendChild(header);

    if (hasChildren) {
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'pl-4 border-l border-slate-800/80 mt-1 space-y-1';
        
        const children = objects.filter(o => o.parentId === obj.id);
        children.forEach(child => {
            childrenContainer.appendChild(createTreeNode(child));
        });
        node.appendChild(childrenContainer);
    }

    return node;
}

// --- PROPERTIES PANEL UPDATES ---
function updatePropertiesPanel() {
    const panel = document.getElementById('properties-panel');
    const msg = document.getElementById('no-selection-msg');
    if (!panel || !msg) return;

    if (selectedObjects.length === 0) {
        panel.classList.add('hidden');
        msg.classList.remove('hidden');
        return;
    }

    panel.classList.remove('hidden');
    msg.classList.add('hidden');

    const primary = selectedObjects[selectedObjects.length - 1];
    updatePropertiesPanelFromMesh(primary.mesh, primary);
}

function updatePropertiesPanelFromMesh(mesh, objData = null) {
    if (!objData) {
        objData = objects.find(o => o.mesh === mesh || o.mesh.uuid === mesh.uuid);
    }
    if (!objData) return;

    const propName = document.getElementById('prop-name');
    if (propName) propName.value = objData.name;
    
    const px = document.getElementById('prop-pos-x'); if (px) px.value = mesh.position.x.toFixed(2);
    const py = document.getElementById('prop-pos-y'); if (py) py.value = mesh.position.y.toFixed(2);
    const pz = document.getElementById('prop-pos-z'); if (pz) pz.value = mesh.position.z.toFixed(2);

    const euler = new THREE.Euler().setFromQuaternion(mesh.quaternion);
    const rx = document.getElementById('prop-rot-x'); if (rx) rx.value = Math.round(euler.x * (180 / Math.PI));
    const ry = document.getElementById('prop-rot-y'); if (ry) ry.value = Math.round(euler.y * (180 / Math.PI));
    const rz = document.getElementById('prop-rot-z'); if (rz) rz.value = Math.round(euler.z * (180 / Math.PI));

    const sx = document.getElementById('prop-scale-x'); if (sx) sx.value = mesh.scale.x.toFixed(2);
    const sy = document.getElementById('prop-scale-y'); if (sy) sy.value = mesh.scale.y.toFixed(2);
    const sz = document.getElementById('prop-scale-z'); if (sz) sz.value = mesh.scale.z.toFixed(2);

    const textContainer = document.getElementById('prop-text-container');
    if (objData.type === '3dtext') {
        if (textContainer) textContainer.classList.remove('hidden');
        const ptv = document.getElementById('prop-text-val');
        if (ptv) ptv.value = objData.textVal || "";
    } else {
        if (textContainer) textContainer.classList.add('hidden');
    }

    let colorHex = "#6366f1";
    let opacityVal = 100;
    
    if (mesh.material) {
        colorHex = "#" + mesh.material.color.getHexString();
        opacityVal = Math.round(mesh.material.opacity * 100);
    }
    
    const pCol = document.getElementById('prop-color'); if (pCol) pCol.value = colorHex;
    const colHex = document.getElementById('color-hex'); if (colHex) colHex.innerText = colorHex.toUpperCase();
    const pOpac = document.getElementById('prop-opacity'); if (pOpac) pOpac.value = opacityVal;
    const opacVal = document.getElementById('opacity-val'); if (opacVal) opacVal.innerText = opacityVal;

    const clickSelect = document.getElementById('prop-click-action');
    if (clickSelect) {
        clickSelect.innerHTML = '<option value="none">Geen actie</option>';
        menus.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.innerText = `Open Menu: ${m.title}`;
            if (objData.clickAction === m.id) opt.selected = true;
            clickSelect.appendChild(opt);
        });
    }

    updateKeyframeTrackUI();
}

function updateSelectedObjectFromInputs() {
    if (selectedObjects.length === 0) return;
    const primary = selectedObjects[selectedObjects.length - 1];

    const px = document.getElementById('prop-pos-x');
    const py = document.getElementById('prop-pos-y');
    const pz = document.getElementById('prop-pos-z');
    if (px && py && pz) {
        primary.mesh.position.set(
            parseFloat(px.value) || 0,
            parseFloat(py.value) || 0,
            parseFloat(pz.value) || 0
        );
    }

    const rx = document.getElementById('prop-rot-x');
    const ry = document.getElementById('prop-rot-y');
    const rz = document.getElementById('prop-rot-z');
    if (rx && ry && rz) {
        const rotX = (parseFloat(rx.value) || 0) * (Math.PI / 180);
        const rotY = (parseFloat(ry.value) || 0) * (Math.PI / 180);
        const rotZ = (parseFloat(rz.value) || 0) * (Math.PI / 180);
        const euler = new THREE.Euler(rotX, rotY, rotZ);
        primary.mesh.quaternion.setFromEuler(euler);
    }

    const sx = document.getElementById('prop-scale-x');
    const sy = document.getElementById('prop-scale-y');
    const sz = document.getElementById('prop-scale-z');
    if (sx && sy && sz) {
        primary.mesh.scale.set(
            parseFloat(sx.value) || 1,
            parseFloat(sy.value) || 1,
            parseFloat(sz.value) || 1
        );
    }

    if (primary.type === '3dtext') {
        const ptv = document.getElementById('prop-text-val');
        const pCol = document.getElementById('prop-color');
        if (ptv && pCol) {
            const textVal = ptv.value;
            primary.textVal = textVal;
            const colorHex = pCol.value;
            primary.mesh.material.map = create3DTextTexture(textVal, colorHex);
        }
    }

    if (primary.mesh.material) {
        const pCol = document.getElementById('prop-color');
        if (pCol) {
            const colorHex = pCol.value;
            primary.mesh.material.color.set(colorHex);
            const colHex = document.getElementById('color-hex');
            if (colHex) colHex.innerText = colorHex.toUpperCase();
        }

        const pOpac = document.getElementById('prop-opacity');
        if (pOpac) {
            const opacityVal = parseInt(pOpac.value);
            primary.mesh.material.opacity = opacityVal / 100;
            primary.mesh.material.transparent = opacityVal < 100;
            const opacVal = document.getElementById('opacity-val');
            if (opacVal) opacVal.innerText = opacityVal;
        }
    }

    const clickAction = document.getElementById('prop-click-action');
    if (clickAction) {
        primary.clickAction = clickAction.value;
    }

    saveKeyframeData(primary, currentFrame);
    saveCurrentProjectSilently();
}

// --- KEYFRAME TRACK UI ---
function updateKeyframeTrackUI() {
    const track = document.getElementById('keyframe-track');
    if (!track) return;
    track.innerHTML = '';
    
    if (selectedObjects.length === 0) return;
    const primary = selectedObjects[selectedObjects.length - 1];

    Object.keys(primary.keyframes).forEach(frame => {
        const dot = document.createElement('div');
        dot.className = `keyframe-dot ${parseInt(frame) === currentFrame ? 'active' : ''}`;
        dot.style.left = `${frame}%`;
        dot.title = `Frame ${frame}`;
        dot.addEventListener('click', () => {
            currentFrame = parseInt(frame);
            const slider = document.getElementById('timeline-slider');
            if (slider) slider.value = currentFrame;
            const display = document.getElementById('current-frame-display');
            if (display) display.innerText = currentFrame;
            objects.forEach(obj => applyKeyframeState(obj, currentFrame));
            updateKeyframeTrackUI();
        });
        track.appendChild(dot);
    });
}

function deleteObject(id) {
    const index = objects.findIndex(o => o.id === id);
    if (index !== -1) {
        scene.remove(objects[index].mesh);
        objects.splice(index, 1);
        updateUI();
    }
}

// --- PROJECT MANAGEMENT & LOCAL STORAGE ---
function saveCurrentProject() {
    saveCurrentProjectSilently();
    alert(`Project "${currentProjectName}" succesvol opgeslagen!`);
}

// Sla project op in LocalStorage
function saveCurrentProjectSilently() {
    const projectData = {
        skyColor,
        groundColor,
        showGrid,
        exportGrid,
        lockCamera,
        savedCameraPos,
        savedCameraTarget,
        menus,
        screenButtons,
        objects: objects.map(serializeObject)
    };
    localStorage.setItem(`project_${currentProjectName}`, JSON.stringify(projectData));
    loadProjectList();
}

// Laad project uit LocalStorage
function loadProject(name) {
    const raw = localStorage.getItem(`project_${name}`);
    if (!raw) {
        currentProjectName = name;
        menus = [{ id: 'welkom_menu', title: 'Welkom bij Designer', content: 'Dit is een premium 3D website ontworpen met Designer Pro!' }];
        screenButtons = [{ id: 'btn_demo', label: 'Over Ons', actionType: 'open_menu', target: 'welkom_menu', left: 45, top: 85 }];
        
        skyColor = '#0f172a';
        groundColor = '#22c55e';
        showGrid = true;
        exportGrid = false;
        lockCamera = false;
        savedCameraPos = { x: 8, y: 8, z: 12 };
        savedCameraTarget = { x: 0, y: 0, z: 0 };

        if (gridHelper) gridHelper.visible = showGrid;
        if (groundMesh) groundMesh.material.color.set(groundColor);
        const canvasCont = document.getElementById('canvas-container');
        if (canvasCont) {
            canvasCont.style.background = `radial-gradient(circle at center, ${skyColor} 0%, #020617 100%)`;
        }

        if (controls) {
            controls.enabled = !lockCamera;
        }

        updateMenusUI();
        updateScreenButtonsUI();
        updateUI();
        return;
    }

    objects.forEach(obj => scene.remove(obj.mesh));
    objects = [];
    clearSelection();

    const data = JSON.parse(raw);
    currentProjectName = name;
    skyColor = data.skyColor || '#0f172a';
    groundColor = data.groundColor || '#22c55e';
    showGrid = data.showGrid !== undefined ? data.showGrid : true;
    exportGrid = data.exportGrid || false;
    lockCamera = data.lockCamera || false;
    savedCameraPos = data.savedCameraPos || { x: 8, y: 8, z: 12 };
    savedCameraTarget = data.savedCameraTarget || { x: 0, y: 0, z: 0 };
    menus = data.menus || [];
    screenButtons = data.screenButtons || [];

    if (data.objects) {
        data.objects.forEach(objData => {
            deserializeObject(objData);
        });
    }

    const skyCol = document.getElementById('scene-sky-color'); if (skyCol) skyCol.value = skyColor;
    const groundCol = document.getElementById('scene-ground-color'); if (groundCol) groundCol.value = groundColor;
    const sGrid = document.getElementById('scene-show-grid'); if (sGrid) sGrid.checked = showGrid;
    const eGrid = document.getElementById('scene-export-grid'); if (eGrid) eGrid.checked = exportGrid;
    const lCam = document.getElementById('scene-lock-camera'); if (lCam) lCam.checked = lockCamera;

    if (gridHelper) gridHelper.visible = showGrid;
    if (groundMesh) groundMesh.material.color.set(groundColor);
    
    const canvasCont = document.getElementById('canvas-container');
    if (canvasCont) {
        canvasCont.style.background = `radial-gradient(circle at center, ${skyColor} 0%, #020617 100%)`;
    }

    if (camera && controls) {
        camera.position.set(savedCameraPos.x, savedCameraPos.y, savedCameraPos.z);
        controls.target.set(savedCameraTarget.x, savedCameraTarget.y, savedCameraTarget.z);
        controls.enabled = !lockCamera;
        controls.update();
    }

    updateMenusUI();
    updateScreenButtonsUI();
    updateUI();
}

function promptNewProject() {
    const name = prompt("Voer een naam in voor het nieuwe project:");
    if (name) {
        pushUndo();
        currentProjectName = name;
        clearScene();
        saveCurrentProjectSilently();
    }
}

function loadProjectList() {
    const selector = document.getElementById('project-selector');
    if (!selector) return;
    selector.innerHTML = '';
    
    let keys = Object.keys(localStorage).filter(k => k.startsWith('project_'));
    if (keys.length === 0) {
        localStorage.setItem(`project_Mijn Eerste Project`, JSON.stringify({ menus: [], objects: [], screenButtons: [] }));
        keys = ['project_Mijn Eerste Project'];
    }

    keys.forEach(key => {
        const name = key.replace('project_', '');
        const opt = document.createElement('option');
        opt.value = name;
        opt.innerText = name;
        if (name === currentProjectName) opt.selected = true;
        selector.appendChild(opt);
    });
}

// --- BULLETPROOF INITIALIZATION WRAPPER ---
function initWorkspace() {
    initThree();

    const projSelector = document.getElementById('project-selector');
    if (projSelector) {
        projSelector.addEventListener('change', (e) => {
            loadProject(e.target.value);
        });
    }

    const timelineSlider = document.getElementById('timeline-slider');
    if (timelineSlider) {
        timelineSlider.addEventListener('input', (e) => {
            currentFrame = parseInt(e.target.value);
            const display = document.getElementById('current-frame-display');
            if (display) display.innerText = currentFrame;
            objects.forEach(obj => applyKeyframeState(obj, currentFrame));
            updateKeyframeTrackUI();
        });
    }

    const btnPlay = document.getElementById('btn-play');
    if (btnPlay) {
        btnPlay.addEventListener('click', () => {
            isPlaying = !isPlaying;
            const icon = btnPlay.querySelector('i');
            if (icon) icon.setAttribute('data-lucide', isPlaying ? 'pause' : 'play');
            lucide.createIcons();
        });
    }

    const btnPlayPreview = document.getElementById('btn-play-preview');
    if (btnPlayPreview) {
        btnPlayPreview.addEventListener('click', () => {
            isPlaying = !isPlaying;
            btnPlayPreview.innerHTML = isPlaying ? `<i data-lucide="pause" class="w-4 h-4"></i> Pauzeer Preview` : `<i data-lucide="play" class="w-4 h-4"></i> Speel Animatie`;
            lucide.createIcons();
        });
    }

    const btnAddKeyframe = document.getElementById('btn-add-keyframe');
    if (btnAddKeyframe) {
        btnAddKeyframe.addEventListener('click', () => {
            if (selectedObjects.length > 0) {
                pushUndo();
                selectedObjects.forEach(obj => {
                    saveKeyframeData(obj, currentFrame);
                });
                updateKeyframeTrackUI();
                saveCurrentProjectSilently();
            } else {
                alert("Selecteer eerst een object om een keyframe toe te voegen!");
            }
        });
    }

    // Realtime Scene Settings Updates
    const skyCol = document.getElementById('scene-sky-color');
    if (skyCol) {
        skyCol.addEventListener('input', (e) => {
            skyColor = e.target.value;
            const canvasCont = document.getElementById('canvas-container');
            if (canvasCont) canvasCont.style.background = `radial-gradient(circle at center, ${skyColor} 0%, #020617 100%)`;
            saveCurrentProjectSilently();
        });
    }

    const groundCol = document.getElementById('scene-ground-color');
    if (groundCol) {
        groundCol.addEventListener('input', (e) => {
            groundColor = e.target.value;
            if (groundMesh) groundMesh.material.color.set(groundColor);
            saveCurrentProjectSilently();
        });
    }

    const sGrid = document.getElementById('scene-show-grid');
    if (sGrid) {
        sGrid.addEventListener('change', (e) => {
            showGrid = e.target.checked;
            if (gridHelper) gridHelper.visible = showGrid;
            saveCurrentProjectSilently();
        });
    }

    const eGrid = document.getElementById('scene-export-grid');
    if (eGrid) {
        eGrid.addEventListener('change', (e) => {
            exportGrid = e.target.checked;
            saveCurrentProjectSilently();
        });
    }

    const lCam = document.getElementById('scene-lock-camera');
    if (lCam) {
        lCam.addEventListener('change', (e) => {
            lockCamera = e.target.checked;
            if (controls) {
                controls.enabled = !lockCamera; // Pas direct live toe in editor!
            }
            saveCurrentProjectSilently();
        });
    }

    // Properties Inputs Realtime Update
    ['prop-pos-x', 'prop-pos-y', 'prop-pos-z', 
     'prop-rot-x', 'prop-rot-y', 'prop-rot-z', 
     'prop-scale-x', 'prop-scale-y', 'prop-scale-z', 'prop-text-val'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updateSelectedObjectFromInputs);
    });

    const propCol = document.getElementById('prop-color');
    if (propCol) propCol.addEventListener('input', updateSelectedObjectFromInputs);

    const propOpac = document.getElementById('prop-opacity');
    if (propOpac) propOpac.addEventListener('input', updateSelectedObjectFromInputs);

    const propClick = document.getElementById('prop-click-action');
    if (propClick) propClick.addEventListener('change', updateSelectedObjectFromInputs);

    const propName = document.getElementById('prop-name');
    if (propName) {
        propName.addEventListener('input', (e) => {
            if (selectedObjects.length > 0) {
                selectedObjects[selectedObjects.length - 1].name = e.target.value;
                updateUI();
                saveCurrentProjectSilently();
            }
        });
    }

    // Export Button
    const btnExport = document.getElementById('btn-export');
    if (btnExport) {
        btnExport.addEventListener('click', () => {
            if (objects.length === 0) {
                alert("Voeg eerst wat objecten toe aan de scène voordat je exporteert!");
                return;
            }

            const exportData = objects.map(serializeObject);

            // --- DE ULTIEME WATERDICHTE EXPORT MET PLACEHOLDERS EN SPLIT/JOIN ---
            // Dit voorkomt dat reguliere expressies of dollartekens ($) de JSON breken!
            const rawTemplate = `<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Designer Pro - Mattyou Studios™</title>
    <style>
        body { margin: 0; overflow: hidden; font-family: 'Inter', sans-serif; background: radial-gradient(circle at center, __SKY_COLOR__ 0%, #020617 100%); }
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

        /* Floating Screen Buttons */
        #screen-buttons {
            position: absolute;
            inset: 0;
            pointer-events: none;
            z-index: 50;
        }
        .screen-btn {
            position: absolute;
            background: #4f46e5;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            pointer-events: auto;
            box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3);
            transition: transform 0.2s, background 0.2s;
        }
        .screen-btn:hover {
            background: #4338ca;
            transform: scale(1.05);
        }
    </style>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
</head>
<body>
    <div id="branding">
        <h1>Designer Pro</h1>
        <p>Made by Mattyou Studios™</p>
    </div>

    <div id="canvas-container"></div>

    <div id="screen-buttons">
        __SCREEN_BUTTONS_HTML__
    </div>

    <!-- Dynamisch gegenereerde 2D Overlays -->
    __MENUS_HTML__

    <script>
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        // Gebruik de exact opgeslagen camera positie!
        camera.position.set(__SAVED_CAMERA_POS_X__, __SAVED_CAMERA_POS_Y__, __SAVED_CAMERA_POS_Z__);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        document.getElementById('canvas-container').appendChild(renderer.domElement);

        let controls;
        if (!__LOCK_CAMERA__) {
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            // Gebruik het exact opgeslagen camera kijkpunt!
            controls.target.set(__SAVED_CAMERA_TARGET_X__, __SAVED_CAMERA_TARGET_Y__, __SAVED_CAMERA_TARGET_Z__);
            controls.update();
        } else {
            camera.lookAt(__SAVED_CAMERA_TARGET_X__, __SAVED_CAMERA_TARGET_Y__, __SAVED_CAMERA_TARGET_Z__);
        }

        scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(10, 20, 15);
        scene.add(dirLight);

        if (__EXPORT_GRID__) {
            scene.add(new THREE.GridHelper(20, 20, 0x6366f1, 0x334155));
        }

        const groundGeo = new THREE.PlaneGeometry(40, 40);
        const groundMat = new THREE.MeshStandardMaterial({ color: '__GROUND_COLOR__', roughness: 0.8 });
        const groundMesh = new THREE.Mesh(groundGeo, groundMat);
        groundMesh.rotation.x = -Math.PI / 2;
        scene.add(groundMesh);

        const animationData = __ANIMATION_DATA__;
        const loadedObjects = [];
        const objectsMap = {};

        function create3DTextTexture(text, colorHex) {
            const canvas = document.createElement('canvas');
            canvas.width = 1024; canvas.height = 256;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, 1024, 256);
            ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
            ctx.roundRect ? ctx.roundRect(10, 10, 1004, 236, 30) : ctx.rect(10, 10, 1004, 236);
            ctx.fill();
            ctx.font = 'Bold 96px sans-serif';
            ctx.fillStyle = colorHex;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(text, 512, 128);
            return new THREE.CanvasTexture(canvas);
        }

        animationData.forEach(data => {
            let mesh;
            const geomType = data.geomType || data.type; // Fallback indien geomType ontbreekt

            if (data.isGroup || geomType === 'group') {
                mesh = new THREE.Group();
            } else if (geomType === '3dtext') {
                const texture = create3DTextTexture(data.textVal, data.color);
                mesh = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide }));
            } else {
                let geom;
                if (geomType === 'cube' || geomType === 'box') geom = new THREE.BoxGeometry(1.5, 1.5, 1.5);
                else if (geomType === 'sphere') geom = new THREE.SphereGeometry(1, 32, 32);
                else if (geomType === 'cylinder') geom = new THREE.CylinderGeometry(0.8, 0.8, 2, 32);
                else geom = new THREE.BoxGeometry(1, 1, 1); // Fallback voor koe/huis onderdelen!
                
                const mat = new THREE.MeshStandardMaterial({ color: data.color || "#6366f1", roughness: 0.4, transparent: Number(data.opacity) < 1, opacity: typeof data.opacity === 'number' ? data.opacity : 1 });
                mesh = new THREE.Mesh(geom, mat);
            }

            mesh.position.set(data.pos.x, data.pos.y, data.pos.z);
            mesh.quaternion.set(data.rot.x, data.rot.y, data.rot.z, data.rot.w);
            mesh.scale.set(data.scale.x, data.scale.y, data.scale.z);

            // Sla ID op voor Raycasting
            mesh.userData = { id: data.id };
            mesh.traverse(child => {
                child.userData = { id: data.id };
            });

            objectsMap[data.id] = mesh;
            loadedObjects.push({ id: data.id, parentId: data.parentId, mesh: mesh, keyframes: data.keyframes, clickAction: data.clickAction });
        });

        loadedObjects.forEach(obj => {
            if (obj.parentId && objectsMap[obj.parentId]) {
                objectsMap[obj.parentId].add(obj.mesh);
            } else {
                scene.add(obj.mesh);
            }
        });

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        window.addEventListener('pointerdown', (e) => {
            mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);

            const intersects = raycaster.intersectObjects(loadedObjects.map(o => o.mesh), true);
            if (intersects.length > 0) {
                const hitMesh = intersects[0].object;
                const clickedId = hitMesh.userData ? hitMesh.userData.id : null;
                if (clickedId) {
                    const found = loadedObjects.find(o => o.id === clickedId);
                    if (found && found.clickAction && found.clickAction !== 'none') {
                        openMenu(found.clickAction);
                    }
                }
            }
        });

        function openMenu(id) {
            const el = document.getElementById('overlay-' + id);
            if(el) el.classList.add('active');
        }

        window.closeMenu = function(id) {
            const el = document.getElementById('overlay-' + id);
            if(el) el.classList.remove('active');
        }

        let isPlaying = true;

        window.handleScreenBtnClick = function(type, target) {
            if (type === 'open_menu') openMenu(target);
            else if (type === 'link') window.open(target, '_blank');
            else if (type === 'toggle_animation') {
                isPlaying = !isPlaying;
            }
        }

        let currentFrame = 0;

        function applyKeyframeState(obj, frame) {
            const keys = Object.keys(obj.keyframes).map(Number).sort((a, b) => a - b);
            if (keys.length === 0) return;

            if (obj.keyframes[frame]) {
                const state = obj.keyframes[frame];
                obj.mesh.position.set(state.pos.x, state.pos.y, state.pos.z);
                obj.mesh.quaternion.set(state.rot.x, state.rot.y, state.rot.z, state.rot.w);
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
                
                const qStart = new THREE.Quaternion(start.rot.x, start.rot.y, start.rot.z, start.rot.w);
                const qEnd = new THREE.Quaternion(end.rot.x, end.rot.y, end.rot.z, end.rot.w);
                obj.mesh.quaternion.copy(qStart).slerp(qEnd, t);

                obj.mesh.scale.set(
                    THREE.MathUtils.lerp(start.scale.x, end.scale.x, t),
                    THREE.MathUtils.lerp(start.scale.y, end.scale.y, t),
                    THREE.MathUtils.lerp(start.scale.z, end.scale.z, t)
                );
            } else if (prevFrame !== null) {
                const state = obj.keyframes[prevFrame];
                obj.mesh.position.set(state.pos.x, state.pos.y, state.pos.z);
                obj.mesh.quaternion.set(state.rot.x, state.rot.y, state.rot.z, state.rot.w);
                obj.mesh.scale.set(state.scale.x, state.scale.y, state.scale.z);
            } else if (nextFrame !== null) {
                const state = obj.keyframes[nextFrame];
                obj.mesh.position.set(state.pos.x, state.pos.y, state.pos.z);
                obj.mesh.quaternion.set(state.rot.x, state.rot.y, state.rot.z, state.rot.w);
                obj.mesh.scale.set(state.scale.x, state.scale.y, state.scale.z);
            }
        }

        function animate() {
            requestAnimationFrame(animate);
            if (controls) controls.update();

            if (isPlaying) {
                currentFrame = (currentFrame + 1) % 100;
                loadedObjects.forEach(obj => {
                    applyKeyframeState(obj, currentFrame);
                });
            }

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
</html>`;

            // Genereer de HTML voor knoppen en menu's
            const screenButtonsHTML = screenButtons.map(b => `
                <button class="screen-btn" style="left: ${b.left}%; top: ${b.top}%;" onclick="handleScreenBtnClick('${b.actionType}', '${b.target}')">${b.label}</button>
            `).join('');

            const menusHTML = menus.map(m => `
            <div id="overlay-${m.id}" class="overlay-menu">
                <div class="menu-box">
                    <button class="close-btn" onclick="closeMenu('${m.id}')">&times;</button>
                    <h2>${m.title}</h2>
                    <div>${m.content}</div>
                </div>
            </div>
            `).join('');

            // --- DE ULTIEME WATERDICHTE VERVANGING MET SPLIT/JOIN ---
            // Dit is 100% veilig en kan nooit crashen op dollartekens ($) in de JSON!
            let finalHTML = rawTemplate;
            finalHTML = finalHTML.split('__SKY_COLOR__').join(skyColor);
            finalHTML = finalHTML.split('__GROUND_COLOR__').join(groundColor);
            finalHTML = finalHTML.split('__EXPORT_GRID__').join(exportGrid ? 'true' : 'false');
            finalHTML = finalHTML.split('__LOCK_CAMERA__').join(lockCamera ? 'true' : 'false');
            
            // Camera Posities
            finalHTML = finalHTML.split('__SAVED_CAMERA_POS_X__').join(typeof savedCameraPos.x === 'number' ? savedCameraPos.x : '8');
            finalHTML = finalHTML.split('__SAVED_CAMERA_POS_Y__').join(typeof savedCameraPos.y === 'number' ? savedCameraPos.y : '8');
            finalHTML = finalHTML.split('__SAVED_CAMERA_POS_Z__').join(typeof savedCameraPos.z === 'number' ? savedCameraPos.z : '12');
            
            // Camera Target (Kijkpunt)
            finalHTML = finalHTML.split('__SAVED_CAMERA_TARGET_X__').join(typeof savedCameraTarget.x === 'number' ? savedCameraTarget.x : '0');
            finalHTML = finalHTML.split('__SAVED_CAMERA_TARGET_Y__').join(typeof savedCameraTarget.y === 'number' ? savedCameraTarget.y : '0');
            finalHTML = finalHTML.split('__SAVED_CAMERA_TARGET_Z__').join(typeof savedCameraTarget.z === 'number' ? savedCameraTarget.z : '0');

            // UI & Scènedata
            finalHTML = finalHTML.split('__SCREEN_BUTTONS_HTML__').join(screenButtonsHTML);
            finalHTML = finalHTML.split('__MENUS_HTML__').join(menusHTML);
            finalHTML = finalHTML.split('__ANIMATION_DATA__').join(JSON.stringify(exportData));

            // Download triggeren
            const blob = new Blob([finalHTML], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${currentProjectName.toLowerCase().replace(/\s+/g, '_')}_website.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }
}

// --- SAFE DOM READY CHECK (CRUCIAL FIX!) ---
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initWorkspace();
} else {
    window.addEventListener('DOMContentLoaded', initWorkspace);
}
