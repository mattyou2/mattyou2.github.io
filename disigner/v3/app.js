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

// UI lists
let menus = []; // 2D overlays
let screenButtons = []; // Permanente 2D schermknoppen
let activeEditingMenuId = null;
let activeEditingScreenBtnId = null;
let clipboard = null; // Knippen/Kopiëren buffer

const canvasContainer = document.getElementById('canvas-container');
let gridHelper, groundMesh;

// --- INITIALIZATION ---
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

    // OrbitControls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // TransformControls (Gizmo)
    transformControls = new THREE.TransformControls(camera, renderer.domElement);
    transformControls.size = 0.75;
    scene.add(transformControls);

    // Voorkom dat OrbitControls beweegt tijdens het slepen van de Gizmo
    transformControls.addEventListener('dragging-changed', (event) => {
        controls.enabled = !event.value;
    });

    // Update object eigenschappen live tijdens het slepen van de gizmo
    transformControls.addEventListener('change', () => {
        if (transformControls.object) {
            updatePropertiesPanelFromMesh(transformControls.object);
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
        // Alleen selecteren bij linkermuisknop en als we niet op de gizmo klikken
        if (e.button !== 0 || transformControls.dragging) return;

        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);
        
        // Haal alle meshes op uit onze geregistreerde objecten
        const checkList = [];
        objects.forEach(obj => {
            obj.mesh.traverse(child => {
                if (child.isMesh) checkList.push(child);
            });
        });

        const intersects = raycaster.intersectObjects(checkList, true);
        if (intersects.length > 0) {
            let hitMesh = intersects[0].object;
            // Zoek de top-level parent die geregistreerd staat in onze objectenlijst
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

    // Window Resize
    window.addEventListener('resize', onWindowResize);

    // Setup Context Menu & Global Clicks
    setupContextMenus();

    // Laad projecten uit LocalStorage
    loadProjectList();
    loadProject(currentProjectName);

    // Start de engine loop
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
        clearSelection();
        updateUI();
    }
}

// --- TRANSFORM TOOLS (GIZMO) ---
function setTransformTool(tool) {
    activeTool = tool;
    document.querySelectorAll('[id^="tool-"]').forEach(btn => btn.classList.remove('tool-active'));
    document.getElementById(`tool-${tool}`).classList.add('tool-active');

    if (tool === 'select' || selectedObjects.length === 0) {
        transformControls.detach();
    } else {
        // Bevestig gizmo aan het laatst geselecteerde object
        const primary = selectedObjects[selectedObjects.length - 1];
        transformControls.attach(primary.mesh);
        
        if (tool === 'translate') transformControls.setMode('translate');
        else if (tool === 'rotate') transformControls.setMode('rotate');
        else if (tool === 'scale') transformControls.setMode('scale');
        else if (tool === 'combined') {
            // Combined mode toont alle assen tegelijk (indien ondersteund door Three.js versie, anders fallback naar translate)
            transformControls.setMode('translate');
        }
    }
}

// --- SELECTION SYSTEM (MULTI-SELECT & GROUPS) ---
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

function applySelectionEffects() {
    // Verwijder alle eerdere outlines/highlights
    objects.forEach(obj => {
        obj.mesh.traverse(child => {
            if (child.isMesh && child.material) {
                child.material.emissive = child.material.emissive || new THREE.Color(0x000000);
                child.material.emissive.setHex(0x000000);
            }
        });
    });

    // Highlight geselecteerde objecten
    selectedObjects.forEach(obj => {
        obj.mesh.traverse(child => {
            if (child.isMesh && child.material) {
                child.material.emissive = child.material.emissive || new THREE.Color(0x000000);
                child.material.emissive.setHex(0x111122); // Zachte gloed
            }
        });
    });

    // Update Gizmo
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
    const objId = 'obj_' + Date.now() + '_' + objectCounter;
    
    // Zorg dat alle onderliggende meshes hun parent ID weten
    mesh.userData = { id: objId };
    mesh.traverse(child => {
        child.userData = { id: objId };
    });

    const objData = {
        id: objId,
        name: `${nameType} #${objectCounter}`,
        mesh: mesh,
        type: nameType.toLowerCase(),
        clickAction: 'none',
        keyframes: {},
        parentId: extraData.parentId || null,
        ...extraData
    };
    
    saveKeyframeData(objData, 0);
    objects.push(objData);
    
    // Voeg toe aan scene als het geen kind is van een andere groep
    if (!objData.parentId) {
        scene.add(mesh);
    }
    
    selectSingleObject(objData);
    updateUI();
    return objData;
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
}

// Groepeer geselecteerde objecten in een nieuwe map/groep
function groupSelectedObjects() {
    if (selectedObjects.length === 0) {
        alert("Selecteer eerst objecten om te groeperen!");
        return;
    }

    const group = new THREE.Group();
    scene.add(group);

    const groupData = createBaseObjectData(group, 'Groep', { isGroup: true });

    selectedObjects.forEach(obj => {
        if (obj.id === groupData.id) return;
        
        // Voeg mesh toe aan de Three.js Group
        group.add(obj.mesh);
        obj.parentId = groupData.id;
    });

    selectSingleObject(groupData);
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

// --- PREMIUM TEMPLATES ---
function addTemplate(type) {
    const group = new THREE.Group();
    group.position.set((Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3);
    
    const groupData = createBaseObjectData(group, type.charAt(0).toUpperCase() + type.slice(1), { isGroup: true });

    if (type === 'cow') {
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
        const spotMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
        const pinkMat = new THREE.MeshStandardMaterial({ color: 0xffb6c1, roughness: 0.8 });
        const hoofMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });

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
}

// --- ANIMATION SYSTEM (LERP & SLERP FOR SMOOTH ROTATION) ---
function saveKeyframeData(objData, frame) {
    let colorHex = "#ffffff";
    let opacityVal = 1;

    if (objData.mesh.material) {
        colorHex = "#" + objData.mesh.material.color.getHexString();
        opacityVal = objData.mesh.material.opacity;
    }

    // Sla rotatie op als Quaternion voor perfecte slerp interpolatie!
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

        // Vloeiende Positie Lerp
        objData.mesh.position.set(
            THREE.MathUtils.lerp(start.pos.x, end.pos.x, t),
            THREE.MathUtils.lerp(start.pos.y, end.pos.y, t),
            THREE.MathUtils.lerp(start.pos.z, end.pos.z, t)
        );

        // Vloeiende Rotatie Slerp (Quaternion)
        const qStart = new THREE.Quaternion(start.rot.x, start.rot.y, start.rot.z, start.rot.w);
        const qEnd = new THREE.Quaternion(end.rot.x, end.rot.y, end.rot.z, end.rot.w);
        objData.mesh.quaternion.copy(qStart).slerp(qEnd, t);

        // Vloeiende Schaal Lerp
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
    document.getElementById('timeline-slider').value = currentFrame;
    document.getElementById('current-frame-display').innerText = currentFrame;
    
    objects.forEach(obj => {
        applyKeyframeState(obj, currentFrame);
    });
}

function stepFrame(dir) {
    currentFrame = Math.max(0, Math.min(100, currentFrame + dir));
    document.getElementById('timeline-slider').value = currentFrame;
    document.getElementById('current-frame-display').innerText = currentFrame;
    objects.forEach(obj => applyKeyframeState(obj, currentFrame));
    updateKeyframeTrackUI();
}

// --- RIGHT-CLICK CONTEXT MENU & CLIPBOARD ---
function setupContextMenus() {
    const ctxMenu = document.getElementById('context-menu');

    // Toon context menu bij rechtermuisklik op de canvas of de tree
    window.addEventListener('contextmenu', (e) => {
        const isOnCanvas = canvasContainer.contains(e.target);
        const isOnTree = document.getElementById('scene-tree-container').contains(e.target);

        if (isOnCanvas || isOnTree) {
            e.preventDefault();
            ctxMenu.style.top = `${e.clientY}px`;
            ctxMenu.style.left = `${e.clientX}px`;
            ctxMenu.classList.remove('hidden');

            // Toggle paste knop status
            document.getElementById('ctx-paste-btn').disabled = !clipboard;
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
                    clipboard = null; // Leegmaken na knippen
                }
                selectSingleObject(pastedMesh);
            }
            break;
        case 'duplicate':
            const duplicated = deserializeObject(serializeObject(primary));
            duplicated.mesh.position.x += 1.5; // Verschuif een beetje
            selectSingleObject(duplicated);
            break;
        case 'delete':
            selectedObjects.forEach(obj => deleteObject(obj.id));
            clearSelection();
            break;
    }
    updateUI();
}

// --- SERIALIZATION HELPERS ---
function serializeObject(obj) {
    return {
        name: obj.name,
        type: obj.type,
        pos: { x: obj.mesh.position.x, y: obj.mesh.position.y, z: obj.mesh.position.z },
        rot: { x: obj.mesh.quaternion.x, y: obj.mesh.quaternion.y, z: obj.mesh.quaternion.z, w: obj.mesh.quaternion.w },
        scale: { x: obj.mesh.scale.x, y: obj.mesh.scale.y, z: obj.mesh.scale.z },
        color: obj.mesh.material ? "#" + obj.mesh.material.color.getHexString() : "#ffffff",
        opacity: obj.mesh.material ? obj.mesh.material.opacity : 1,
        clickAction: obj.clickAction,
        keyframes: obj.keyframes,
        isGroup: obj.isGroup || false,
        textVal: obj.textVal || ""
    };
}

function deserializeObject(data) {
    let mesh;
    if (data.isGroup) {
        mesh = new THREE.Group();
    } else if (data.type === '3dtext') {
        const texture = create3DTextTexture(data.textVal, data.color);
        mesh = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide }));
    } else {
        let geom;
        if (data.type === 'cube') geom = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        else if (data.type === 'sphere') geom = new THREE.SphereGeometry(1, 32, 32);
        else if (data.type === 'cylinder') geom = new THREE.CylinderGeometry(0.8, 0.8, 2, 32);
        
        const mat = new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.4, transparent: data.opacity < 1, opacity: data.opacity });
        mesh = new THREE.Mesh(geom, mat);
    }

    mesh.position.set(data.pos.x, data.pos.y, data.pos.z);
    mesh.quaternion.set(data.rot.x, data.rot.y, data.rot.z, data.rot.w);
    mesh.scale.set(data.scale.x, data.scale.y, data.scale.z);

    const newObj = createBaseObjectData(mesh, data.type.charAt(0).toUpperCase() + data.type.slice(1), {
        keyframes: data.keyframes,
        clickAction: data.clickAction,
        isGroup: data.isGroup,
        textVal: data.textVal
    });

    return newObj;
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
        updatePropertiesPanel();
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

// --- PERMANENT 2D SCREEN BUTTONS ---
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
    } else {
        document.getElementById('btn-target-menu-container').classList.add('hidden');
        document.getElementById('btn-target-link-container').classList.remove('hidden');
    }
}

function fillScreenBtnMenuDropdown() {
    const select = document.getElementById('btn-target-menu');
    select.innerHTML = '';
    menus.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.innerText = m.title;
        select.appendChild(opt);
    });
}

function saveScreenButtonData() {
    const label = document.getElementById('btn-label').value;
    const actionType = document.getElementById('btn-action-type').value;
    const targetMenu = document.getElementById('btn-target-menu').value;
    const targetLink = document.getElementById('btn-target-link').value;

    const btnData = {
        id: activeEditingScreenBtnId || 'btn_' + Date.now(),
        label,
        actionType,
        target: actionType === 'open_menu' ? targetMenu : targetLink
    };

    if (activeEditingScreenBtnId) {
        const idx = screenButtons.findIndex(b => b.id === activeEditingScreenBtnId);
        if (idx !== -1) screenButtons[idx] = btnData;
    } else {
        screenButtons.push(btnData);
    }

    closeScreenButtonEditor();
    updateScreenButtonsUI();
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
        } else {
            document.getElementById('btn-target-link').value = btn.target;
        }
        
        toggleScreenBtnActionFields();
        document.getElementById('screen-button-modal').classList.remove('hidden');
    }
}

function deleteScreenButton(id) {
    if (confirm("Weet je zeker dat je deze schermknop wilt verwijderen?")) {
        screenButtons = screenButtons.filter(b => b.id !== id);
        updateScreenButtonsUI();
    }
}

function updateScreenButtonsUI() {
    // Update sidebar lijst
    const list = document.getElementById('screen-buttons-list');
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

    // Update live preview knoppen op het canvas
    const liveContainer = document.getElementById('live-screen-buttons-container');
    liveContainer.innerHTML = '';
    screenButtons.forEach(b => {
        const btn = document.createElement('button');
        btn.className = 'pointer-events-auto bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-lg transition transform hover:scale-105';
        btn.innerText = b.label;
        btn.onclick = () => {
            if (b.actionType === 'open_menu') {
                previewMenu(b.target);
            } else {
                window.open(b.target, '_blank');
            }
        };
        liveContainer.appendChild(btn);
    });

    lucide.createIcons();
}

// --- SCENE TREE HIERARCHY (RECURSIVE) ---
function updateUI() {
    document.getElementById('object-count').innerText = objects.length;
    renderSceneTree();
}

function renderSceneTree() {
    const container = document.getElementById('scene-tree-container');
    container.innerHTML = '';

    // Haal alle top-level objecten op (geen parentId)
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

    // Click handler voor selectie (met Shift ondersteuning)
    header.addEventListener('click', (e) => {
        e.stopPropagation();
        if (e.shiftKey) {
            toggleSelectObject(obj);
        } else {
            selectSingleObject(obj);
        }
    });

    node.appendChild(header);

    // Als het een groep is, render de kinderen recursief
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

    document.getElementById('prop-name').value = objData.name;
    
    // Positie
    document.getElementById('prop-pos-x').value = mesh.position.x.toFixed(2);
    document.getElementById('prop-pos-y').value = mesh.position.y.toFixed(2);
    document.getElementById('prop-pos-z').value = mesh.position.z.toFixed(2);

    // Rotatie (Euler graden voor de gebruiker)
    const euler = new THREE.Euler().setFromQuaternion(mesh.quaternion);
    document.getElementById('prop-rot-x').value = Math.round(euler.x * (180 / Math.PI));
    document.getElementById('prop-rot-y').value = Math.round(euler.y * (180 / Math.PI));
    document.getElementById('prop-rot-z').value = Math.round(euler.z * (180 / Math.PI));

    // Schaal
    document.getElementById('prop-scale-x').value = mesh.scale.x.toFixed(2);
    document.getElementById('prop-scale-y').value = mesh.scale.y.toFixed(2);
    document.getElementById('prop-scale-z').value = mesh.scale.z.toFixed(2);

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
    
    if (mesh.material) {
        colorHex = "#" + mesh.material.color.getHexString();
        opacityVal = Math.round(mesh.material.opacity * 100);
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
}

function updateSelectedObjectFromInputs() {
    if (selectedObjects.length === 0) return;
    const primary = selectedObjects[selectedObjects.length - 1];

    primary.mesh.position.set(
        parseFloat(document.getElementById('prop-pos-x').value) || 0,
        parseFloat(document.getElementById('prop-pos-y').value) || 0,
        parseFloat(document.getElementById('prop-pos-z').value) || 0
    );

    // Rotatie omzetten van graden naar Quaternion
    const rx = (parseFloat(document.getElementById('prop-rot-x').value) || 0) * (Math.PI / 180);
    const ry = (parseFloat(document.getElementById('prop-rot-y').value) || 0) * (Math.PI / 180);
    const rz = (parseFloat(document.getElementById('prop-rot-z').value) || 0) * (Math.PI / 180);
    const euler = new THREE.Euler(rx, ry, rz);
    primary.mesh.quaternion.setFromEuler(euler);

    primary.mesh.scale.set(
        parseFloat(document.getElementById('prop-scale-x').value) || 1,
        parseFloat(document.getElementById('prop-scale-y').value) || 1,
        parseFloat(document.getElementById('prop-scale-z').value) || 1
    );

    if (primary.type === '3dtext') {
        const textVal = document.getElementById('prop-text-val').value;
        primary.textVal = textVal;
        const colorHex = document.getElementById('prop-color').value;
        primary.mesh.material.map = create3DTextTexture(textVal, colorHex);
    }

    if (primary.mesh.material) {
        const colorHex = document.getElementById('prop-color').value;
        primary.mesh.material.color.set(colorHex);
        document.getElementById('color-hex').innerText = colorHex.toUpperCase();

        const opacityVal = parseInt(document.getElementById('prop-opacity').value);
        primary.mesh.material.opacity = opacityVal / 100;
        primary.mesh.material.transparent = opacityVal < 100;
        document.getElementById('opacity-val').innerText = opacityVal;
    }

    primary.clickAction = document.getElementById('prop-click-action').value;
}

// --- KEYFRAME TRACK UI ---
function updateKeyframeTrackUI() {
    const track = document.getElementById('keyframe-track');
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
            document.getElementById('timeline-slider').value = currentFrame;
            document.getElementById('current-frame-display').innerText = currentFrame;
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
    const projectData = {
        skyColor,
        groundColor,
        showGrid,
        exportGrid,
        lockCamera,
        menus,
        screenButtons,
        objects: objects.map(serializeObject)
    };
    localStorage.setItem(`project_${currentProjectName}`, JSON.stringify(projectData));
    alert(`Project "${currentProjectName}" succesvol opgeslagen!`);
    loadProjectList();
}

function loadProject(name) {
    const raw = localStorage.getItem(`project_${name}`);
    if (!raw) {
        // Standaard demo project
        currentProjectName = name;
        menus = [{ id: 'welkom_menu', title: 'Welkom bij Designer', content: 'Dit is een premium 3D website ontworpen met Designer Pro!' }];
        screenButtons = [{ id: 'btn_demo', label: 'Over Ons', actionType: 'open_menu', target: 'welkom_menu' }];
        updateMenusUI();
        updateScreenButtonsUI();
        return;
    }

    // Leeg huidige scene
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
    menus = data.menus || [];
    screenButtons = data.screenButtons || [];

    // Reconstructie van meshes
    data.objects.forEach(objData => {
        deserializeObject(objData);
    });

    // Update UI elementen
    document.getElementById('scene-sky-color').value = skyColor;
    document.getElementById('scene-ground-color').value = groundColor;
    document.getElementById('scene-show-grid').checked = showGrid;
    document.getElementById('scene-export-grid').checked = exportGrid;
    document.getElementById('scene-lock-camera').checked = lockCamera;

    gridHelper.visible = showGrid;
    groundMesh.material.color.set(groundColor);
    document.getElementById('canvas-container').style.background = `radial-gradient(circle at center, ${skyColor} 0%, #020617 100%)`;

    updateMenusUI();
    updateScreenButtonsUI();
    updateUI();
}

function promptNewProject() {
    const name = prompt("Voer een naam in voor het nieuwe project:");
    if (name) {
        currentProjectName = name;
        clearScene();
        saveCurrentProject();
    }
}

function loadProjectList() {
    const selector = document.getElementById('project-selector');
    selector.innerHTML = '';
    
    let keys = Object.keys(localStorage).filter(k => k.startsWith('project_'));
    if (keys.length === 0) {
        // Maak een eerste default project aan
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

document.getElementById('project-selector').addEventListener('change', (e) => {
    loadProject(e.target.value);
});

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
    if (selectedObjects.length > 0) {
        selectedObjects.forEach(obj => {
            saveKeyframeData(obj, currentFrame);
        });
        updateKeyframeTrackUI();
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
['prop-pos-x', 'prop-pos-y', 'prop-pos-z', 
 'prop-rot-x', 'prop-rot-y', 'prop-rot-z', 
 'prop-scale-x', 'prop-scale-y', 'prop-scale-z', 'prop-text-val'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateSelectedObjectFromInputs);
});

document.getElementById('prop-color').addEventListener('input', updateSelectedObjectFromInputs);
document.getElementById('prop-opacity').addEventListener('input', updateSelectedObjectFromInputs);
document.getElementById('prop-click-action').addEventListener('change', updateSelectedObjectFromInputs);

document.getElementById('prop-name').addEventListener('input', (e) => {
    if (selectedObjects.length > 0) {
        selectedObjects[selectedObjects.length - 1].name = e.target.value;
        updateUI();
    }
});

// --- EXPORT SYSTEM (STANDALONE HTML GENERATOR) ---
document.getElementById('btn-export').addEventListener('click', () => {
    if (objects.length === 0) {
        alert("Voeg eerst wat objecten toe aan de scène voordat je exporteert!");
        return;
    }

    const exportData = objects.map(serializeObject);

    const htmlContent = `
<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Designer Pro - Mattyou Studios™</title>
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

        /* Floating Screen Buttons */
        #screen-buttons {
            position: absolute;
            bottom: 30px;
            left: 30px;
            z-index: 50;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .screen-btn {
            background: #4f46e5;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
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
        ${screenButtons.map(b => `
            <button class="screen-btn" onclick="handleScreenBtnClick('${b.actionType}', '${b.target}')">${b.label}</button>
        `).join('')}
    </div>

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

        let controls;
        if (!${lockCamera}) {
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
        }

        scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(10, 20, 15);
        scene.add(dirLight);

        if (${exportGrid}) {
            scene.add(new THREE.GridHelper(20, 20, 0x6366f1, 0x334155));
        }

        const groundGeo = new THREE.PlaneGeometry(40, 40);
        const groundMat = new THREE.MeshStandardMaterial({ color: '${groundColor}', roughness: 0.8 });
        const groundMesh = new THREE.Mesh(groundGeo, groundMat);
        groundMesh.rotation.x = -Math.PI / 2;
        scene.add(groundMesh);

        const animationData = ${JSON.stringify(exportData)};
        const loadedObjects = [];

        function create3DTextTexture(text, colorHex) {
            const canvas = document.createElement('canvas');
            canvas.width = 512; canvas.height = 128;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, 512, 128);
            ctx.font = 'Bold 48px sans-serif';
            ctx.fillStyle = colorHex;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(text, 256, 64);
            return new THREE.CanvasTexture(canvas);
        }

        // Bouw de scene op
        animationData.forEach(data => {
            let mesh;
            if (data.isGroup) {
                mesh = new THREE.Group();
            } else if (data.type === '3dtext') {
                const texture = create3DTextTexture(data.textVal, data.color);
                mesh = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide }));
            } else {
                let geom;
                if (data.type === 'cube') geom = new THREE.BoxGeometry(1.5, 1.5, 1.5);
                else if (data.type === 'sphere') geom = new THREE.SphereGeometry(1, 32, 32);
                else if (data.type === 'cylinder') geom = new THREE.CylinderGeometry(0.8, 0.8, 2, 32);
                
                const mat = new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.4 });
                mesh = new THREE.Mesh(geom, mat);
            }

            mesh.position.set(data.pos.x, data.pos.y, data.pos.z);
            mesh.quaternion.set(data.rot.x, data.rot.y, data.rot.z, data.rot.w);
            mesh.scale.set(data.scale.x, data.scale.y, data.scale.z);

            scene.add(mesh);
            loadedObjects.push({ mesh: mesh, keyframes: data.keyframes, clickAction: data.clickAction });
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
            const el = document.getElementById('overlay-' + id);
            if(el) el.classList.add('active');
        }

        window.closeMenu = function(id) {
            const el = document.getElementById('overlay-' + id);
            if(el) el.classList.remove('active');
        }

        window.handleScreenBtnClick = function(type, target) {
            if (type === 'open_menu') openMenu(target);
            else window.open(target, '_blank');
        }

        // Animatie Loop
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
            }
        }

        function animate() {
            requestAnimationFrame(animate);
            if (controls) controls.update();

            currentFrame = (currentFrame + 1) % 100;
            loadedObjects.forEach(obj => {
                applyKeyframeState(obj, currentFrame);
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
    a.download = `${currentProjectName.toLowerCase().replace(/\s+/g, '_')}_website.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// Start de engine!
initThree();
