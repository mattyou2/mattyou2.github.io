// Interactive 3D Background with Floating Game Panels, Repulsion & Sound
let scene, camera, renderer, starGeo, stars;
let gamePanels = [];
let mouse = new THREE.Vector2(-1000, -1000);
let targetMouse = new THREE.Vector2(0, 0);
let currentTheme = 'neon-rainbow';

// Web Audio API Synthesizer voor interactieve geluiden
let audioCtx = null;

function playSynthSound(freq, type = 'sine', duration = 0.3) {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        
        // Pitch sweep effect
        osc.frequency.exponentialRampToValueAtTime(freq * 0.5, audioCtx.currentTime + duration);
        
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
        console.log("Audio interactie geblokkeerd of niet ondersteund.");
    }
}

// Helper om een canvas textuur te maken voor de 3D panelen
function createTextTexture(text, subtitle, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Achtergrond verloop
    const grad = ctx.createLinearGradient(0, 0, 512, 256);
    grad.addColorStop(0, '#0a0518');
    grad.addColorStop(1, '#020105');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    // Neon Rand
    ctx.strokeStyle = color;
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 502, 246);

    // Glow effect op tekst
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;

    // Hoofdtitel
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 38px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, 256, 110);

    // Subtitel
    ctx.shadowBlur = 5;
    ctx.fillStyle = color;
    ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(subtitle, 256, 170);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

function init3D() {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.z = 400;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Lichtbronnen voor 3D diepte
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00f0ff, 1.5);
    dirLight.position.set(0, 200, 100);
    scene.add(dirLight);

    // 1. Deeltjessysteem (Sterrenhemel)
    starGeo = new THREE.BufferGeometry();
    const starCount = 1000;
    const posArray = new Float32Array(starCount * 3);
    const colorArray = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i += 3) {
        posArray[i] = (Math.random() - 0.5) * 1200;
        posArray[i + 1] = (Math.random() - 0.5) * 800;
        posArray[i + 2] = (Math.random() - 0.5) * 400;

        // Willekeurige neon kleuren initialiseren
        colorArray[i] = 0.0;
        colorArray[i + 1] = 0.94;
        colorArray[i + 2] = 1.0;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

    const starMaterial = new THREE.PointsMaterial({
        size: 3,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });

    stars = new THREE.Points(starGeo, starMaterial);
    scene.add(stars);

    // 2. Zwevende 3D Game Panelen aanmaken
    const gamesData = [
        { title: "MINECRAFT 3D", sub: "(Mattyou edition)", color: "#ff007f", x: -250, y: 120 },
        { title: "MINECRAFT 2D", sub: "(Mattyou edition)", color: "#00f0ff", x: 250, y: 100 },
        { title: "survive world", sub: "(Mattyou edition)", color: "#ffaa00", x: -180, y: -120 },
        { title: "GRAVITY SANDBOX", sub: "PHYSICS SIMULATOR", color: "#7000ff", x: 180, y: -140 },
        { title: "NEON RIDER 3D", sub: "SYNTHWAVE RACER", color: "#00ff66", x: 0, y: 0 }
    ];

    const panelGeometry = new THREE.BoxGeometry(160, 90, 10);

    gamesData.forEach((data) => {
        const texture = createTextTexture(data.title, data.sub, data.color);
        
        // Materialen voor de doos (voorkant heeft de tekst, zijkanten zijn donker neon)
        const materials = [
            new THREE.MeshLambertMaterial({ color: 0x110520 }), // rechts
            new THREE.MeshLambertMaterial({ color: 0x110520 }), // links
            new THREE.MeshLambertMaterial({ color: 0x110520 }), // boven
            new THREE.MeshLambertMaterial({ color: 0x110520 }), // onder
            new THREE.MeshLambertMaterial({ map: texture }),    // voorkant
            new THREE.MeshLambertMaterial({ color: 0x110520 })  // achterkant
        ];

        const mesh = new THREE.Mesh(panelGeometry, materials);
        mesh.position.set(data.x, data.y, Math.random() * 50 - 25);
        
        // Sla originele staat op voor deformatie/repulsion berekeningen
        mesh.userData = {
            originalPosition: mesh.position.clone(),
            originalRotation: new THREE.Euler(0, 0, 0),
            velocity: new THREE.Vector3(),
            color: data.color,
            hovered: false
        };

        scene.add(mesh);
        gamePanels.push(mesh);
    });

    // Event Listeners
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mousedown', onMouseDown);
    window.addEventListener('resize', onWindowResize);

    // Start met het standaard thema
    setThemeColors(currentTheme);

    animate();
}

function onMouseMove(event) {
    // Normaliseer muispositie voor Three.js (-1 tot +1)
    targetMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    targetMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onMouseDown() {
    // Speel een vette synth sweep bij een klik!
    playSynthSound(330, 'sawtooth', 0.5);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Thema switcher logica
window.changeTheme = function(themeName) {
    currentTheme = themeName;
    
    // Update body class voor CSS overgangen
    document.body.className = '';
    document.body.classList.add(`theme-${themeName}`);

    // Update actieve knop in UI
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.theme === themeName) {
            btn.classList.add('active');
        }
    });

    setThemeColors(themeName);
    playThemeChangeSound(themeName);
};

function playThemeChangeSound(theme) {
    if (theme === 'neon-rainbow') {
        playSynthSound(440, 'sine', 0.4);
    } else if (theme === 'cyber-blue') {
        playSynthSound(523.25, 'triangle', 0.4);
    } else if (theme === 'retro-gold') {
        playSynthSound(392, 'sawtooth', 0.4);
    }
}

function setThemeColors(theme) {
    if (!stars) return;

    const colors = starGeo.attributes.color.array;
    let r, g, b;

    if (theme === 'neon-rainbow') {
        // Regenboog deeltjes
        for (let i = 0; i < colors.length; i += 3) {
            colors[i] = Math.random();
            colors[i + 1] = Math.random();
            colors[i + 2] = Math.random();
        }
    } else if (theme === 'cyber-blue') {
        // Blauw & Cyaan deeltjes
        for (let i = 0; i < colors.length; i += 3) {
            colors[i] = 0.0;
            colors[i + 1] = Math.random() * 0.5 + 0.5;
            colors[i + 2] = 1.0;
        }
    } else if (theme === 'retro-gold') {
        // Goud & Oranje deeltjes
        for (let i = 0; i < colors.length; i += 3) {
            colors[i] = 1.0;
            colors[i + 1] = Math.random() * 0.6 + 0.3;
            colors[i + 2] = 0.0;
        }
    }
    starGeo.attributes.color.needsUpdate = true;
}

function animate() {
    requestAnimationFrame(animate);

    // Muispositie dempen voor vloeiende beweging
    mouse.x += (targetMouse.x - mouse.x) * 0.1;
    mouse.y += (targetMouse.y - mouse.y) * 0.1;

    // Camera volgt de muis heel subtiel
    camera.position.x += (mouse.x * 80 - camera.position.x) * 0.05;
    camera.position.y += (mouse.y * 50 - camera.position.y) * 0.05;
    camera.lookAt(scene.position);

    // Sterren zachtjes laten roteren
    stars.rotation.y += 0.0008;
    stars.rotation.x += 0.0003;

    // Raycasting voor muis-interactie met de 3D panelen
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(gamePanels);

    // Reset hovers
    gamePanels.forEach(panel => panel.userData.hovered = false);

    if (intersects.length > 0) {
        const hitPanel = intersects[0].object;
        if (!hitPanel.userData.hovered) {
            hitPanel.userData.hovered = true;
            // Geluidje als je over een paneel hovert!
            playSynthSound(659.25, 'sine', 0.15);
        }
    }

    // Update en animeer elk 3D paneel (Zweven + Repulsion/Indeuk effect)
    const time = Date.now() * 0.001;

    gamePanels.forEach((panel, index) => {
        const data = panel.userData;

        // 1. Natuurlijk zweef-effect (sinus/cosinus golven)
        const floatOffset = Math.sin(time + index) * 15;
        const targetPos = data.originalPosition.clone();
        targetPos.y += floatOffset;

        // 2. Repulsion (Indeuk/Uitwijk-effect van de muis)
        // Projecteer de 3D positie van het paneel naar 2D schermcoördinaten
        const panelScreenPos = panel.position.clone().project(camera);
        const dist = mouse.distanceTo(new THREE.Vector2(panelScreenPos.x, panelScreenPos.y));

        if (dist < 0.6) {
            // Hoe dichterbij de muis, hoe dieper het paneel naar achteren (Z-as) "indeukt"
            const pushForce = (0.6 - dist) * 180;
            targetPos.z -= pushForce;
            
            // Draai het paneel ook subtiel weg van de muis
            const angleX = (mouse.y - panelScreenPos.y) * 0.8;
            const angleY = -(mouse.x - panelScreenPos.x) * 0.8;
            panel.rotation.x += (angleX - panel.rotation.x) * 0.1;
            panel.rotation.y += (angleY - panel.rotation.y) * 0.1;
        } else {
            // Herstel rotatie naar neutraal
            panel.rotation.x += (0 - panel.rotation.x) * 0.1;
            panel.rotation.y += (0 - panel.rotation.y) * 0.1;
            targetPos.z += (data.originalPosition.z - panel.position.z) * 0.1;
        }

        // Hover effect (extra schaal en glow-vibe)
        if (data.hovered) {
            panel.scale.set(1.08, 1.08, 1.08);
            targetPos.z += 20; // Komt iets naar voren bij hover
        } else {
            panel.scale.set(1, 1, 1);
        }

        // Vloeiend naar de doelpositie bewegen
        panel.position.lerp(targetPos, 0.1);
    });

    renderer.render(scene, camera);
}

// Start zodra de DOM geladen is
document.addEventListener('DOMContentLoaded', init3D);
