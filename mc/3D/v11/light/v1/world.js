// ============================================================================
// MATTYOU CRAFT - LIGHT EDITION: OPTIMIZED WORLD & CAVE GENERATION (world.js)
// ============================================================================

class WorldManager {
    /**
     * @param {Game} game - Referentie naar de hoofd game-engine
     */
    constructor(game) {
        this.game = game;
        
        this.chunkSize = 16;
        this.worldHeight = 64; // Diepe grotten en ertslagen
        this.chunks = {};      // Slaat alleen de blok-ID's op (zeer lichtgewicht)
        this.blockMeshes = {}; // Slaat de actieve 3D-meshes op in de scene
        this.loadedChunks = new Set();
        this.chunkQueue = [];  // Wachtrij voor progressive loading (voorkomt lag spikes)
        
        this.name = "Mijn Diepe Wereld (Light Edition)";
        this.mode = "survival"; 

        // PERFORMANCE SETTINGS (Aanpasbaar voor de speler!)
        this.settings = {
            renderDistance: 2,       // Straal in chunks (1 = Low, 2 = Medium, 3 = High, 4 = Ultra)
            enableCulling: true,     // Verbergt onzichtbare blokken onder de grond (90% FPS boost!)
            progressiveLoading: true // Laadt chunks geleidelijk in om haperingen te voorkomen
        };
    }

    /**
     * Verwijdert de hele wereld uit het geheugen en de scene.
     */
    clearWorld() {
        this.clearWorldMeshesOnly();
        this.chunks = {};
        this.loadedChunks.clear();
        this.chunkQueue = [];
    }

    /**
     * Verwijdert alleen de 3D-meshes uit de scene (handig bij grafische updates).
     */
    clearWorldMeshesOnly() {
        Object.keys(this.blockMeshes).forEach(blockKey => {
            this.game.scene.remove(this.blockMeshes[blockKey]);
        });
        this.blockMeshes = {};
    }

    getChunkCoords(x, z) {
        const cx = Math.floor(x / this.chunkSize);
        const cz = Math.floor(z / this.chunkSize);
        return { cx, cz };
    }

    /**
     * Controleert of een blok aan de lucht grenst.
     * Als een blok volledig ingesloten is, hoeven we het niet te renderen!
     */
    shouldRenderBlock(x, y, z) {
        if (!this.settings.enableCulling) return true;
        
        // Blokken aan de absolute bovenkant altijd renderen
        if (y >= this.worldHeight - 1) return true;
        if (y <= 0) return true;

        // Check de 6 directe buren (boven, onder, links, rechts, voor, achter)
        const neighbors = [
            this.getBlock(x + 1, y, z),
            this.getBlock(x - 1, y, z),
            this.getBlock(x, y + 1, z),
            this.getBlock(x, y - 1, z),
            this.getBlock(x, y, z + 1),
            this.getBlock(x, y, z - 1)
        ];

        // Als minstens één buurman lucht (0) of een transparant blad (5) is, moet dit blok gerenderd worden
        return neighbors.some(id => id === 0 || id === 5);
    }

    /**
     * Genereert de data voor een chunk (zonder direct zware 3D-meshes te maken).
     */
    generateChunk(cx, cz) {
        const chunkKey = `${cx},${cz}`;
        if (this.chunks[chunkKey]) return;

        this.chunks[chunkKey] = {};

        // STAP 1: Genereer de blok-data (supersnel in het geheugen)
        for (let x = 0; x < this.chunkSize; x++) {
            for (let z = 0; z < this.chunkSize; z++) {
                const worldX = cx * this.chunkSize + x;
                const worldZ = cz * this.chunkSize + z;

                // Bepaal de hoogte van het oppervlak
                const surfaceHeight = Math.floor(
                    Math.sin(worldX / 12) * Math.cos(worldZ / 12) * 4 + 50
                );

                for (let y = 0; y < this.worldHeight; y++) {
                    let blockType = 0; // Lucht

                    // Bepaling van de lagen
                    if (y === 0) {
                        blockType = 45; // Bedrock
                    } 
                    else if (y < 5) {
                        blockType = Math.random() < 0.45 ? 45 : 43;
                    } 
                    else if (y < 20) {
                        blockType = 43; // Deepslate
                    } 
                    else if (y < surfaceHeight - 3) {
                        blockType = 3;  // Steen
                    } 
                    else if (y < surfaceHeight) {
                        blockType = 2;  // Aarde
                    } 
                    else if (y === surfaceHeight) {
                        blockType = 1;  // Gras
                    }

                    // 3D Grotten Generator (Ruis-tunnels)
                    if (blockType !== 0 && blockType !== 45 && y < surfaceHeight - 4) {
                        const caveNoise = Math.sin(worldX * 0.25) * Math.cos(y * 0.2) * Math.sin(worldZ * 0.25);
                        if (caveNoise > 0.42) {
                            blockType = 0; // Graaf grot
                        }
                    }

                    // Ertsen Generator
                    if (blockType === 3) {
                        const rand = Math.random();
                        if (rand < 0.015 && y < 40) blockType = 17; // Steenkool
                        else if (rand < 0.025 && rand >= 0.015 && y < 35) blockType = 18; // IJzer
                        else if (rand < 0.029 && rand >= 0.025 && y < 25) blockType = 19; // Goud
                        else if (rand < 0.031 && rand >= 0.029 && y < 15) blockType = 20; // Diamant
                    } 
                    else if (blockType === 43) {
                        const rand = Math.random();
                        if (rand < 0.015) blockType = 84; // Deepslate IJzer
                        else if (rand < 0.020 && rand >= 0.015) blockType = 83; // Deepslate Diamant
                        else if (rand < 0.022 && rand >= 0.020) blockType = 44; // Obsidian
                    }

                    if (blockType !== 0) {
                        const blockKey = `${worldX},${y},${worldZ}`;
                        this.chunks[chunkKey][blockKey] = blockType;
                    }
                }

                // Bomen Spawner (Alleen data wegschrijven)
                if (Math.random() < 0.02) {
                    const treeY = surfaceHeight + 1;
                    const blockKey = `${worldX},${surfaceHeight},${worldZ}`;
                    if (this.chunks[chunkKey][blockKey] === 1) {
                        this.generateTreeData(worldX, treeY, worldZ, chunkKey);
                    }
                }
            }
        }

        // STAP 2: Render alleen de zichtbare blokken van deze chunk
        this.renderChunkMeshes(cx, cz);
    }

    /**
     * Schrijft boom-data weg in de chunks (ondersteunt cross-chunk bladeren).
     */
    generateTreeData(tx, ty, tz, chunkKey) {
        // Stam van 4 blokken hoog (ID 4 = Hout)
        for (let h = 0; h < 4; h++) {
            const blockKey = `${tx},${ty + h},${tz}`;
            this.chunks[chunkKey][blockKey] = 4;
        }
        // Bladerdak (ID 5 = Bladeren)
        for (let x = -2; x <= 2; x++) {
            for (let z = -2; z <= 2; z++) {
                for (let y = 2; y <= 4; y++) {
                    if (Math.abs(x) + Math.abs(z) < 3) {
                        const leafX = tx + x;
                        const leafY = ty + y;
                        const leafZ = tz + z;
                        
                        const { cx, cz } = this.getChunkCoords(leafX, leafZ);
                        const leafChunkKey = `${cx},${cz}`;
                        
                        if (!this.chunks[leafChunkKey]) {
                            this.chunks[leafChunkKey] = {};
                        }
                        
                        const leafBlockKey = `${leafX},${leafY},${leafZ}`;
                        if (!this.chunks[leafChunkKey][leafBlockKey]) {
                            this.chunks[leafChunkKey][leafBlockKey] = 5;
                        }
                    }
                }
            }
        }
    }

    /**
     * Bouwt de 3D meshes voor een chunk, rekening houdend met Culling.
     */
    renderChunkMeshes(cx, cz) {
        const chunkKey = `${cx},${cz}`;
        const chunkData = this.chunks[chunkKey];
        if (!chunkData) return;

        const geom = new THREE.BoxGeometry(1, 1, 1);

        Object.keys(chunkData).forEach(blockKey => {
            const [x, y, z] = blockKey.split(',').map(Number);
            const typeId = chunkData[blockKey];

            if (typeId !== 0 && this.shouldRenderBlock(x, y, z)) {
                this.createBlockMesh(x, y, z, typeId, geom);
            }
        });
    }

    createBlockMesh(x, y, z, typeId, sharedGeom) {
        const blockKey = `${x},${y},${z}`;
        if (this.blockMeshes[blockKey]) return; // Staat al in de scene

        const geom = sharedGeom || new THREE.BoxGeometry(1, 1, 1);
        const mesh = new THREE.Mesh(geom, this.game.materials[typeId]);
        mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
        this.game.scene.add(mesh);
        this.blockMeshes[blockKey] = mesh;
    }

    removeBlockMesh(x, y, z) {
        const blockKey = `${x},${y},${z}`;
        if (this.blockMeshes[blockKey]) {
            this.game.scene.remove(this.blockMeshes[blockKey]);
            delete this.blockMeshes[blockKey];
        }
    }

    getBlock(x, y, z) {
        const { cx, cz } = this.getChunkCoords(x, z);
        const chunkKey = `${cx},${cz}`;
        if (!this.chunks[chunkKey]) return 0;
        return this.chunks[chunkKey][`${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`] || 0;
    }

    /**
     * Plaatst of sloopt een blok, en update direct de buren!
     */
    setBlock(x, y, z, typeId) {
        const { cx, cz } = this.getChunkCoords(x, z);
        const chunkKey = `${cx},${cz}`;
        const blockKey = `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;

        if (!this.chunks[chunkKey]) {
            this.chunks[chunkKey] = {};
        }

        // 1. Update eigen blok
        if (typeId === 0) {
            delete this.chunks[chunkKey][blockKey];
            this.removeBlockMesh(x, y, z);
        } else {
            this.chunks[chunkKey][blockKey] = typeId;
            this.removeBlockMesh(x, y, z); // Reset eventuele oude mesh
            if (this.shouldRenderBlock(x, y, z)) {
                this.createBlockMesh(x, y, z, typeId);
            }
        }

        // 2. Update de 6 buren (omdat er nu een blok geplaatst of weggehaald is)
        const neighbors = [
            { x: x + 1, y: y, z: z },
            { x: x - 1, y: y, z: z },
            { x: x, y: y + 1, z: z },
            { x: x, y: y - 1, z: z },
            { x: x, y: y, z: z + 1 },
            { x: x, y: y, z: z - 1 }
        ];

        neighbors.forEach(n => {
            const nType = this.getBlock(n.x, n.y, n.z);
            if (nType !== 0) {
                if (this.shouldRenderBlock(n.x, n.y, n.z)) {
                    this.createBlockMesh(n.x, n.y, n.z, nType);
                } else {
                    this.removeBlockMesh(n.x, n.y, n.z);
                }
            }
        });
    }

    /**
     * Houdt de chunks rondom de speler bij.
     * Maakt nu gebruik van een soepele wachtrij om lag spikes te voorkomen!
     */
    updateChunksAroundPlayer(playerPosition) {
        const { cx, cz } = this.getChunkCoords(playerPosition.x, playerPosition.z);
        const radius = this.settings.renderDistance;
        const activeKeys = new Set();

        // Verzamel alle chunks die geladen moeten zijn
        for (let x = -radius; x <= radius; x++) {
            for (let z = -radius; z <= radius; z++) {
                const nCX = cx + x;
                const nCZ = cz + z;
                const key = `${nCX},${nCZ}`;
                activeKeys.add(key);

                if (!this.loadedChunks.has(key)) {
                    if (this.settings.progressiveLoading) {
                        // Voeg toe aan wachtrij als deze er nog niet in staat
                        if (!this.chunkQueue.some(q => q.cx === nCX && q.cz === nCZ)) {
                            this.chunkQueue.push({ cx: nCX, cz: nCZ, key });
                        }
                    } else {
                        this.generateChunk(nCX, nCZ);
                        this.loadedChunks.add(key);
                    }
                }
            }
        }

        // Verwerk de wachtrij: laad maximaal 1 chunk per frame (voorkomt lag spikes!)
        if (this.settings.progressiveLoading && this.chunkQueue.length > 0) {
            // Sorteer de wachtrij zodat chunks het dichtst bij de speler als eerst laden
            this.chunkQueue.sort((a, b) => {
                const distA = Math.hypot(a.cx - cx, a.cz - cz);
                const distB = Math.hypot(b.cx - cx, b.cz - cz);
                return distA - distB;
            });

            const nextChunk = this.chunkQueue.shift();
            if (!this.loadedChunks.has(nextChunk.key)) {
                this.generateChunk(nextChunk.cx, nextChunk.cz);
                this.loadedChunks.add(nextChunk.key);
            }
        }

        // Unload chunks die buiten de render distance vallen
        this.loadedChunks.forEach(key => {
            if (!activeKeys.has(key)) {
                const chunkData = this.chunks[key];
                if (chunkData) {
                    Object.keys(chunkData).forEach(blockKey => {
                        const [bx, by, bz] = blockKey.split(',').map(Number);
                        this.removeBlockMesh(bx, by, bz);
                    });
                }
                this.loadedChunks.delete(key);
                // Verwijder ook uit de laad-wachtrij
                this.chunkQueue = this.chunkQueue.filter(q => q.key !== key);
            }
        });
    }

    /**
     * Verander de render distance live in-game!
     * @param {number} distance - Nieuwe render distance (bijv. 1, 2, 3 of 4)
     */
    setRenderDistance(distance) {
        this.settings.renderDistance = Math.max(1, Math.min(4, distance));
        this.chunkQueue = [];
        this.loadedChunks.clear();
        this.rebuildVisibleMeshes();
    }

    /**
     * Schakelt culling live aan/uit.
     */
    setPerformanceMode(enableCulling) {
        this.settings.enableCulling = enableCulling;
        this.rebuildVisibleMeshes();
    }

    /**
     * Bouwt alle actieve meshes opnieuw op (handig na het wijzigen van instellingen).
     */
    rebuildVisibleMeshes() {
        this.clearWorldMeshesOnly();
        this.loadedChunks.forEach(key => {
            const [cx, cz] = key.split(',').map(Number);
            this.renderChunkMeshes(cx, cz);
        });
    }
}
