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

// Plant configuratie (groeitijd in seconden, verkoopprijs, zaadprijs)
const PLANT_TYPES = {
    carrot: { name: 'Wortel', seedPrice: 10, sellPrice: 25, growthTime: 8, color: 0xffa500 },
    tomato: { name: 'Tomaat', seedPrice: 25, sellPrice: 65, growthTime: 15, color: 0xff0000 },
    sunflower: { name: 'Zonnebloem', seedPrice: 50, sellPrice: 150, growthTime: 25, color: 0xffd700 }
};

// --- GELUIDSEFFECTEN (Web Audio API) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
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
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
    } else if (type === 'harvest') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
    } else if (type === 'sell') {
        // Kassa geluidje!
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.16); // G5
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    }
}

// --- THREE.JS SETUP ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7ec0ee); // Mooie blauwe lucht

// Camera
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 10, 12);

// Renderer met schaduwen
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// Controls (Orbit)
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2.1; // Voorkom dat de camera onder de grond gaat
controls.minDistance = 5;
controls.maxDistance = 25;

// --- BELICHTING ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
sunLight.position.set(10, 20, 10);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.bias = -0.001;
scene.add(sunLight);

// --- WERELD OPBOUWEN ---
// Grasveld (Ondergrond)
const grassGeo = new THREE.BoxGeometry(20, 0.5, 20);
const grassMat = new THREE.MeshStandardMaterial({ color: 0x557a2b, roughness: 0.8 });
const grass = new THREE.Mesh(grassGeo, grassMat);
grass.position.y = -0.25;
grass.receiveShadow = true;
scene.add(grass);

// Decoratieve hekken rondom de tuin
function createFence() {
    const fenceGroup = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8B5A2B, roughness: 0.9 });
    
    // Horizontale balken
    const barGeo = new THREE.BoxGeometry(18, 0.15, 0.15);
    const bar1 = new THREE.Mesh(barGeo, woodMat);
    bar1.position.set(0, 0.5, 0);
    const bar2 = new THREE.Mesh(barGeo, woodMat);
    bar2.position.set(0, 1.0, 0);
    fenceGroup.add(bar1, bar2);

    // Verticale paaltjes
    for(let i = -9; i <= 9; i += 2) {
        const postGeo = new THREE.BoxGeometry(0.2, 1.4, 0.2);
        const post = new THREE.Mesh(postGeo, woodMat);
        post.position.set(i, 0.7, 0);
        post.castShadow = true;
        fenceGroup.add(post);
    }
    return fenceGroup;
}

const fenceBack = createFence();
fenceBack.position.set(0, 0, -9.5);
scene.add(fenceBack);

// --- AKKER PLOTS (3x3 Grid) ---
const plots = [];
const plotGroup = new THREE.Group();
const plotSpacing = 3.0;

const dirtGeo = new THREE.BoxGeometry(2.2, 0.15, 2.2);
const dirtMat = new THREE.MeshStandardMaterial({ color: 0x4a2f13, roughness: 0.9 });

for (let x = -1; x <= 1; x++) {
    for (let z = -1; z <= 1; z++) {
        const plotMesh = new THREE.Mesh(dirtGeo, dirtMat);
        plotMesh.position.set(x * plotSpacing, 0.08, z * plotSpacing);
        plotMesh.receiveShadow = true;
        plotMesh.castShadow = true;
        
        // Custom data koppelen aan de mesh
        plotMesh.userData = {
            isPlot: true,
            planted: false,
            plantType: null,
            growth: 0, // 0 tot 1
            plantMesh: null,
            growthIndicator: null
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
        // Wortel model
        if (growthStage < 0.4) {
            // Klein groen sprietje
            const stemGeo = new THREE.ConeGeometry(0.05, 0.4, 4);
            const stem = new THREE.Mesh(stemGeo, greenMat);
            stem.position.y = 0.2;
            plantGroup.add(stem);
        } else {
            // Oranje wortel die in de grond zit + groen loof
            const orangeMat = new THREE.MeshStandardMaterial({ color: 0xff6f00, roughness: 0.5 });
            const bodyGeo = new THREE.ConeGeometry(0.15, 0.6, 8);
            const body = new THREE.Mesh(bodyGeo, orangeMat);
            body.rotation.x = Math.PI; // Punt naar beneden
            body.position.y = 0.1;
            body.castShadow = true;
            plantGroup.add(body);

            // Groene bladeren bovenop
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
        // Tomaat model
        const stemGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8 * growthStage, 5);
        const stem = new THREE.Mesh(stemGeo, greenMat);
        stem.position.y = (0.8 * growthStage) / 2;
        stem.castShadow = true;
        plantGroup.add(stem);

        if (growthStage >= 0.7) {
            // Rode tomaten ballen
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
        // Zonnebloem model
        const height = 1.5 * growthStage;
        const stemGeo = new THREE.CylinderGeometry(0.05, 0.05, height, 6);
        const stem = new THREE.Mesh(stemGeo, greenMat);
        stem.position.y = height / 2;
        stem.castShadow = true;
        plantGroup.add(stem);

        if (growthStage >= 0.8) {
            // Bloemhoofd
            const flowerGroup = new THREE.Group();
            flowerGroup.position.y = height;

            // Gele blaadjes (schijf)
            const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfbc02d, roughness: 0.5 });
            const petalGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.08, 12);
            const petals = new THREE.Mesh(petalGeo, yellowMat);
            petals.rotation.x = Math.PI / 2;
            flowerGroup.add(petals);

            // Bruine kern
            const brownMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 });
            const centerGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 10);
            const center = new THREE.Mesh(centerGeo, brownMat);
            center.rotation.x = Math.PI / 2;
            center.position.z = 0.02;
            flowerGroup.add(center);

            plantGroup.add(flowerGroup);
        }
    }

    // Schaal de plant op basis van de groei (zacht effect)
    const scale = Math.max(0.2, growthStage);
    plantGroup.scale.set(scale, scale, scale);

    return plantGroup;
}

// --- INTERACTIE (Raycasting) ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', onDocumentMouseDown, false);

function onDocumentMouseDown(event) {
    // Voorkom klikken op 3D als je op UI klikt
    if (event.target.tagName === 'BUTTON' || event.target.closest('.card')) return;

    // Bereken muispositie in genormaliseerde apparaatcoördinaten
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(plots);

    if (intersects.length > 0) {
        const clickedPlot = intersects[0].object;
        handlePlotClick(clickedPlot);
    }
}

function handlePlotClick(plot) {
    const data = plot.userData;

    if (!data.planted) {
        // Planten!
        if (!gameState.selectedSeed) {
            alert("Selecteer eerst een zaadje in de winkel!");
            return;
        }

        data.planted = true;
        data.plantType = gameState.selectedSeed;
        data.growth = 0;
        
        // Maak 3D plant model aan
        data.plantMesh = createPlant3D(data.plantType, 0.1);
        data.plantMesh.position.copy(plot.position);
        data.plantMesh.position.y += 0.1; // Net boven de grond
        scene.add(data.plantMesh);

        playSound('plant');
        
        // Reset selectie zodat je niet per ongeluk alles vol plant
        gameState.selectedSeed = null;
        updateUI();
    } else {
        // Oogsten!
        if (data.growth >= 1.0) {
            // Oogst succesvol
            gameState.inventory[data.plantType]++;
            
            // Verwijder 3D model
            scene.remove(data.plantMesh);
            data.plantMesh = null;
            
            data.planted = false;
            data.plantType = null;
            data.growth = 0;

            playSound('harvest');
            updateUI();
        } else {
            // Nog niet klaar
            const perc = Math.floor(data.growth * 100);
            alert(`Deze plant groeit nog! (${perc}% klaar)`);
        }
    }
}

// --- WINKEL & ECONOMIE LOGICA ---
window.buySeed = function(type, price) {
    if (gameState.money >= price) {
        gameState.money -= price;
        gameState.selectedSeed = type;
        playSound('plant'); // Koopgeluidje
        updateUI();
    } else {
        alert("Je hebt niet genoeg goud!");
    }
};

window.sellAllCrops = function() {
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
        alert(`Je hebt je oogst verkocht voor $${totalEarnings} goud! 💰`);
    } else {
        alert("Je hebt geen gewassen in je schuur om te verkopen!");
    }
};

function updateUI() {
    // Update geld
    document.getElementById('money-display').innerText = `💰 Goud: $${gameState.money}`;
    
    // Update actieve selectie
    const activeDisplay = document.getElementById('active-seed-display');
    if (gameState.selectedSeed) {
        const name = PLANT_TYPES[gameState.selectedSeed].name;
        activeDisplay.innerText = `🌱 ${name} Zaad`;
        activeDisplay.style.borderColor = "#4caf50";
    } else {
        activeDisplay.innerText = "Geen (Selecteer in de winkel)";
        activeDisplay.style.borderColor = "#81c784";
    }

    // Update inventaris
    document.getElementById('inv-carrot').innerText = gameState.inventory.carrot;
    document.getElementById('inv-tomato').innerText = gameState.inventory.tomato;
    document.getElementById('inv-sunflower').innerText = gameState.inventory.sunflower;
}

// --- GAME LOOP & ANIMATIE ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();

    // Update groei van alle geplante gewassen
    plots.forEach(plot => {
        const data = plot.userData;
        if (data.planted && data.growth < 1.0) {
            const config = PLANT_TYPES[data.plantType];
            // Groei verhogen op basis van tijd
            data.growth += delta / config.growthTime;
            if (data.growth > 1.0) data.growth = 1.0;

            // Update het 3D model visueel
            scene.remove(data.plantMesh);
            data.plantMesh = createPlant3D(data.plantType, data.growth);
            data.plantMesh.position.copy(plot.position);
            data.plantMesh.position.y += 0.1;
            scene.add(data.plantMesh);
        }

        // Subtiel zweef-effect voor volgroeide planten om te laten zien dat ze klaar zijn
        if (data.planted && data.growth >= 1.0 && data.plantMesh) {
            data.plantMesh.position.y = 0.1 + Math.sin(Date.now() * 0.005) * 0.05;
            data.plantMesh.rotation.y += 0.01; // Langzaam ronddraaien
        }
    });

    controls.update();
    renderer.render(scene, camera);
}

// Window resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start de game loop en update UI
updateUI();
animate();
