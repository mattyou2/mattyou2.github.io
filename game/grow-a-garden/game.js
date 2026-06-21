// --- GAME STATE ---
let gameState = {
    money: 50,
    selectedSeed: null, // 'carrot', 'tomato', 'sunflower'
    inventory: {
        carrot: 0,
        tomato: 0,
        sunflower: 0
    }
};

const PLANT_TYPES = {
    carrot: { name: 'Wortel', seedPrice: 10, sellPrice: 25, growthTime: 8 },
    tomato: { name: 'Tomaat', seedPrice: 25, sellPrice: 65, growthTime: 15 },
    sunflower: { name: 'Zonnebloem', seedPrice: 50, sellPrice: 150, growthTime: 25 }
};

// --- GELUIDSEFFECTEN (Web Audio API) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'plant') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.start(); osc.stop(audioCtx.currentTime + 0.15);
    } else if (type === 'harvest') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start(); osc.stop(audioCtx.currentTime + 0.2);
    } else if (type === 'sell') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.16); // G5
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start(); osc.stop(audioCtx.currentTime + 0.3);
    }
}

// --- THREE.JS SETUP ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7ec0ee); // Blauwe lucht

// Camera
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// Belichting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
sunLight.position.set(15, 30, 15);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.bias = -0.0005;
scene.add(sunLight);

// --- WERELD OPBOUWEN ---
// Grasveld (Groter gemaakt om lekker rond te rennen)
const grassGeo = new THREE.BoxGeometry(40, 0.5, 40);
const grassMat = new THREE.MeshStandardMaterial({ color: 0x557a2b, roughness: 0.9 });
const grass = new THREE.Mesh(grassGeo, grassMat);
grass.position.y = -0.25;
grass.receiveShadow = true;
scene.add(grass);

// --- SPELER AANMAKEN (Cute 3D Robot/Karakter) ---
const playerGroup = new THREE.Group();

// Lichaam (Blauwe capsule)
const bodyGeo = new THREE.CylinderGeometry(0.4, 0.4, 1.0, 16);
const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2980b9, roughness: 0.5 });
const body = new THREE.Mesh(bodyGeo, bodyMat);
body.position.y = 0.7;
body.castShadow = true;
playerGroup.add(body);

// Hoofd (Gele bol)
const headGeo = new THREE.SphereGeometry(0.35, 16, 16);
const headMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.5 });
const head = new THREE.Mesh(headGeo, headMat);
head.position.y = 1.35;
head.castShadow = true;
playerGroup.add(head);

// Oogjes (Zwart)
const eyeGeo = new THREE.SphereGeometry(0.06, 8, 8);
const eyeMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50 });
const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
leftEye.position.set(0.12, 1.4, 0.3);
const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
rightEye.position.set(-0.12, 1.4, 0.3);
playerGroup.add(leftEye, rightEye);

// Schattig hoedje (Rood)
const hatGeo = new THREE.ConeGeometry(0.25, 0.4, 16);
const hatMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c });
const hat = new THREE.Mesh(hatGeo, hatMat);
hat.position.y = 1.7;
hat.rotation.x = 0.1;
hat.castShadow = true;
playerGroup.add(hat);

playerGroup.position.set(0, 0, 5); // Startpositie
scene.add(playerGroup);

// --- 3D KRAAMPJES BOUWEN (Shop & Sell) ---
function createStall(roofColor) {
    const stallGroup = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
    
    // Toonbank (Tafel)
    const tableGeo = new THREE.BoxGeometry(2.5, 0.8, 1.2);
    const table = new THREE.Mesh(tableGeo, woodMat);
    table.position.y = 0.4;
    table.castShadow = true;
    table.receiveShadow = true;
    stallGroup.add(table);

    // 4 Palen voor het dak
    const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.8, 8);
    const polePositions = [
        [-1.1, 0.5], [1.1, 0.5], [-1.1, -0.5], [1.1, -0.5]
    ];
    polePositions.forEach(pos => {
        const pole = new THREE.Mesh(poleGeo, woodMat);
        pole.position.set(pos[0], 0.9, pos[1]);
        pole.castShadow = true;
        stallGroup.add(pole);
    });

    // Het Dak (Gekleurd)
    const roofGeo = new THREE.BoxGeometry(2.8, 0.2, 1.5);
    const roofMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.5 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 1.8;
    roof.castShadow = true;
    stallGroup.add(roof);

    return stallGroup;
}

// Shop Kraam (Rood dak) links achteren
const shopStall = createStall(0xe74c3c);
shopStall.position.set(-7, 0, -6);
shopStall.rotation.y = Math.PI / 4;
scene.add(shopStall);

// Sell Kraam (Groen dak) rechts achteren
const sellStall = createStall(0x2ecc71);
sellStall.position.set(7, 0, -6);
sellStall.rotation.y = -Math.PI / 4;
scene.add(sellStall);

// --- AKKER PLOTS (3x3 Grid in het midden) ---
const plots = [];
const plotSpacing = 3.5;
const dirtGeo = new THREE.BoxGeometry(2.4, 0.1, 2.4);
const dirtMat = new THREE.MeshStandardMaterial({ color: 0x4a2f13, roughness: 0.9 });

for (let x = -1; x <= 1; x++) {
    for (let z = -1; z <= 1; z++) {
        const plotMesh = new THREE.Mesh(dirtGeo, dirtMat);
        plotMesh.position.set(x * plotSpacing, 0.05, z * plotSpacing);
        plotMesh.receiveShadow = true;
        
        plotMesh.userData = {
            isPlot: true,
            planted: false,
            plantType: null,
            growth: 0,
            plantMesh: null
        };
        
        scene.add(plotMesh);
        plots.push(plotMesh);
    }
}

// --- PROCEDURELE 3D PLANT MODELLEN ---
function createPlant3D(type, growthStage) {
    const plantGroup = new THREE.Group();
    const greenMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.6 });

    if (type === 'carrot') {
        if (growthStage < 0.4) {
            const stemGeo = new THREE.ConeGeometry(0.05, 0.4, 4);
            const stem = new THREE.Mesh(stemGeo, greenMat);
            stem.position.y = 0.2;
            plantGroup.add(stem);
        } else {
            const orangeMat = new THREE.MeshStandardMaterial({ color: 0xff6f00, roughness: 0.5 });
            const bodyGeo = new THREE.ConeGeometry(0.15, 0.6, 8);
            const body = new THREE.Mesh(bodyGeo, orangeMat);
            body.rotation.x = Math.PI;
            body.position.y = 0.1;
            body.castShadow = true;
            plantGroup.add(body);

            for (let i = 0; i < 3; i++) {
                const leafGeo = new THREE.ConeGeometry(0.08, 0.5, 4);
                const leaf = new THREE.Mesh(leafGeo, greenMat);
                leaf.position.set(Math.sin(i * 2) * 0.05, 0.5, Math.cos(i * 2) * 0.05);
                leaf.rotation.z = 0.2 * (i - 1);
                leaf.castShadow = true;
                plantGroup.add(leaf);
            }
        }
    } 
    else if (type === 'tomato') {
        const stemGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8 * growthStage, 5);
        const stem = new THREE.Mesh(stemGeo, greenMat);
        stem.position.y = (0.8 * growthStage) / 2;
        stem.castShadow = true;
        plantGroup.add(stem);

        if (growthStage >= 0.7) {
            const redMat = new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.3 });
            const tomatoGeo = new THREE.SphereGeometry(0.15, 8, 8);
            const t1 = new THREE.Mesh(tomatoGeo, redMat);
            t1.position.set(0.15, 0.4, 0.1);
            t1.castShadow = true;
            const t2 = new THREE.Mesh(tomatoGeo, redMat);
            t2.position.set(-0.15, 0.6, -0.1);
            t2.castShadow = true;
            plantGroup.add(t1, t2);
        }
    } 
    else if (type === 'sunflower') {
        const height = 1.5 * growthStage;
        const stemGeo = new THREE.CylinderGeometry(0.05, 0.05, height, 6);
        const stem = new THREE.Mesh(stemGeo, greenMat);
        stem.position.y = height / 2;
        stem.castShadow = true;
        plantGroup.add(stem);

        if (growthStage >= 0.8) {
            const flowerGroup = new THREE.Group();
            flowerGroup.position.y = height;

            const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfbc02d, roughness: 0.5 });
            const petalGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.08, 12);
            const petals = new THREE.Mesh(petalGeo, yellowMat);
            petals.rotation.x = Math.PI / 2;
            flowerGroup.add(petals);

            const brownMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 });
            const centerGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 10);
            const center = new THREE.Mesh(centerGeo, brownMat);
            center.rotation.x = Math.PI / 2;
            center.position.z = 0.02;
            flowerGroup.add(center);

            plantGroup.add(flowerGroup);
        }
    }

    const scale = Math.max(0.2, growthStage);
    plantGroup.scale.set(scale, scale, scale);
    return plantGroup;
}

// --- CONTROLS & INPUTS ---
const keys = { w: false, a: false, s: false, d: false, ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };
let keyEPressed = false;
let holdETimer = 0;
const requiredHoldTime = 4000; // 4 seconden in milliseconden
let lastTime = performance.now();

window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'w' || key === 'a' || key === 's' || key === 'd') keys[key] = true;
    if (e.key.startsWith('Arrow')) keys[e.key] = true;

    // 'E' Toets logica
    if (e.key.toLowerCase() === 'e' && !keyEPressed) {
        keyEPressed = true;
        holdETimer = 0; // Reset timer bij indrukken
    }

    // Spatiebalk voor planten/oogsten bij akker
    if (e.key === ' ') {
        e.preventDefault();
        tryInteractWithNearbyPlot();
    }
});

window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'w' || key === 'a' || key === 's' || key === 'd') keys[key] = false;
    if (e.key.startsWith('Arrow')) keys[e.key] = false;

    if (e.key.toLowerCase() === 'e') {
        keyEPressed = false;
        // Als de speler E kort heeft ingedrukt (minder dan 500ms) en NIET bij een kraampje staat, open inventaris
        if (holdETimer < 500 && !isNearStall()) {
            toggleInventory();
        }
        holdETimer = 0;
        document.getElementById('progress-bar').style.width = '0%';
    }
});

// --- AFSTANDSBEREKENINGEN (Proximity) ---
function getDistance(obj1, obj2) {
    return obj1.position.distanceTo(obj2.position);
}

function isNearStall() {
    const distToShop = getDistance(playerGroup, shopStall);
    const distToSell = getDistance(playerGroup, sellStall);
    return (distToShop < 2.5 || distToSell < 2.5);
}

function tryInteractWithNearbyPlot() {
    // Zoek dichtstbijzijnde akker
    let closestPlot = null;
    let minDist = 2.0; // Moet binnen 2 meter zijn

    plots.forEach(plot => {
        const dist = getDistance(playerGroup, plot);
        if (dist < minDist) {
            minDist = dist;
            closestPlot = plot;
        }
    });

    if (closestPlot) {
        handlePlotInteraction(closestPlot);
    }
}

function handlePlotInteraction(plot) {
    const data = plot.userData;

    if (!data.planted) {
        // Planten
        if (!gameState.selectedSeed) {
            alert("Je hebt geen zaadje geselecteerd! Open de winkel bij het rode kraampje.");
            return;
        }
        data.planted = true;
        data.plantType = gameState.selectedSeed;
        data.growth = 0;
        
        data.plantMesh = createPlant3D(data.plantType, 0.1);
        data.plantMesh.position.copy(plot.position);
        data.plantMesh.position.y += 0.1;
        scene.add(data.plantMesh);

        playSound('plant');
        gameState.selectedSeed = null; // Reset selectie
        updateUI();
    } else {
        // Oogsten
        if (data.growth >= 1.0) {
            gameState.inventory[data.plantType]++;
            scene.remove(data.plantMesh);
            data.plantMesh = null;
            data.planted = false;
            data.plantType = null;
            data.growth = 0;

            playSound('harvest');
            updateUI();
        } else {
            const perc = Math.floor(data.growth * 100);
            alert(`Dit gewas groeit nog! (${perc}% klaar)`);
        }
    }
}

// --- WINKEL & VERKOOP LOGICA ---
window.buySeed = function(type, price) {
    if (gameState.money >= price) {
        gameState.money -= price;
        gameState.selectedSeed = type;
        playSound('plant');
        closeShop();
        updateUI();
    } else {
        alert("Je hebt niet genoeg goud!");
    }
};

function sellAllCrops() {
    let totalEarnings = 0;
    for (let crop in gameState.inventory) {
        const count = gameState.inventory[crop];
        if (count > 0) {
            totalEarnings += count * PLANT_TYPES[crop].sellPrice;
            gameState.inventory[crop] = 0;
        }
    }

    if (totalEarnings > 0) {
        gameState.money += totalEarnings;
        playSound('sell');
        updateUI();
        alert(`💰 Alles verkocht! Je verdiende $${totalEarnings} goud!`);
    } else {
        alert("Je rugzak is leeg! Oogst eerst wat volgroeide planten.");
    }
}

// --- UI MODALS OPENEN/SLUITEN ---
function openShop() {
    document.getElementById('shop-modal').classList.remove('hidden');
}
window.closeShop = function() {
    document.getElementById('shop-modal').classList.add('hidden');
};

window.toggleInventory = function() {
    const inv = document.getElementById('inventory-modal');
    inv.classList.toggle('hidden');
};

function updateUI() {
    document.getElementById('money-display').innerText = `💰 Goud: $${gameState.money}`;
    
    const activeDisplay = document.getElementById('active-seed-display');
    if (gameState.selectedSeed) {
        const name = PLANT_TYPES[gameState.selectedSeed].name;
        activeDisplay.innerText = `🌱 ${name} Zaad`;
        activeDisplay.style.borderColor = "#4caf50";
    } else {
        activeDisplay.innerText = "Geen (Koop in de winkel)";
        activeDisplay.style.borderColor = "#81c784";
    }

    document.getElementById('inv-carrot').innerText = gameState.inventory.carrot;
    document.getElementById('inv-tomato').innerText = gameState.inventory.tomato;
    document.getElementById('inv-sunflower').innerText = gameState.inventory.sunflower;
}

// --- GAME LOOP & ANIMATIE ---
function animate() {
    requestAnimationFrame(animate);
    
    const currentTime = performance.now();
    const delta = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    // 1. SPELER BEWEGING (WASD / Pijltjes)
    const moveSpeed = 6.0;
    let moveX = 0;
    let moveZ = 0;

    if (keys.w || keys.ArrowUp) moveZ -= 1;
    if (keys.s || keys.ArrowDown) moveZ += 1;
    if (keys.a || keys.ArrowLeft) moveX -= 1;
    if (keys.d || keys.ArrowRight) moveX += 1;

    if (moveX !== 0 || moveZ !== 0) {
        // Normaliseer vector zodat diagonaal lopen niet sneller gaat
        const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
        const dx = (moveX / length) * moveSpeed * delta;
        const dz = (moveZ / length) * moveSpeed * delta;

        // Update positie met grenzen (binnen de 40x40 grasmat)
        playerGroup.position.x = Math.max(-19, Math.min(19, playerGroup.position.x + dx));
        playerGroup.position.z = Math.max(-19, Math.min(19, playerGroup.position.z + dz));

        // Draai karakter naar looprichting
        const angle = Math.atan2(dx, dz);
        playerGroup.rotation.y = angle;

        // Loop-animatie (subtiel op en neer bouncen)
        playerGroup.position.y = Math.abs(Math.sin(currentTime * 0.01)) * 0.15;
    } else {
        playerGroup.position.y = 0; // Ruststand
    }

    // 2. CAMERA VOLGING (Derde persoon perspectief)
    camera.position.set(
        playerGroup.position.x,
        playerGroup.position.y + 8,
        playerGroup.position.z + 10
    );
    camera.lookAt(playerGroup.position);

    // 3. INTERACTIE DETECTIE (Shop & Sell Kraampjes)
    const distToShop = getDistance(playerGroup, shopStall);
    const distToSell = getDistance(playerGroup, sellStall);
    const prompt = document.getElementById('interaction-prompt');
    const promptText = document.getElementById('prompt-text');
    const progressBar = document.getElementById('progress-bar');

    let nearStall = false;
    let currentStallAction = null;

    if (distToShop < 2.5) {
        nearStall = true;
        currentStallAction = 'shop';
        promptText.innerText = "Houd [E] ingedrukt voor de Winkel";
    } else if (distToSell < 2.5) {
        nearStall = true;
        currentStallAction = 'sell';
        promptText.innerText = "Houd [E] ingedrukt om Oogst te Verkopen";
    }

    // Toon/Verberg prompt
    if (nearStall) {
        prompt.classList.remove('hidden');
    } else {
        prompt.classList.add('hidden');
        holdETimer = 0;
        progressBar.style.width = '0%';
    }

    // E-toets vasthouden logica
    if (nearStall && keyEPressed) {
        holdETimer += delta * 1000; // Omrekenen naar milliseconden
        const progress = Math.min(100, (holdETimer / requiredHoldTime) * 100);
        progressBar.style.width = `${progress}%`;

        if (holdETimer >= requiredHoldTime) {
            // Actie voltooien!
            if (currentStallAction === 'shop') {
                openShop();
            } else if (currentStallAction === 'sell') {
                sellAllCrops();
            }
            keyEPressed = false; // Reset zodat het niet blijft triggeren
            holdETimer = 0;
            progressBar.style.width = '0%';
        }
    } else if (!keyEPressed) {
        progressBar.style.width = '0%';
    }

    // 4. PLANTEN GROEI UPDATE
    plots.forEach(plot => {
        const data = plot.userData;
        if (data.planted && data.growth < 1.0) {
            const config = PLANT_TYPES[data.plantType];
            data.growth += delta / config.growthTime;
            if (data.growth > 1.0) data.growth = 1.0;

            // Update 3D model visueel
            scene.remove(data.plantMesh);
            data.plantMesh = createPlant3D(data.plantType, data.growth);
            data.plantMesh.position.copy(plot.position);
            data.plantMesh.position.y += 0.1;
            scene.add(data.plantMesh);
        }

        // Zweef- en draai-effect voor oogstbare planten
        if (data.planted && data.growth >= 1.0 && data.plantMesh) {
            data.plantMesh.position.y = 0.1 + Math.sin(currentTime * 0.005) * 0.05;
            data.plantMesh.rotation.y += 0.01;
        }
    });

    renderer.render(scene, camera);
}

// Window resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start de game
updateUI();
animate();
