// ============================================================================
// MATTYOU CRAFT - ADVANCED DEEP WORLD & CAVE GENERATION (world.js)
// ============================================================================

class WorldManager {
    /**
     * @param {Game} game - Referentie naar de hoofd game-engine
     */
    constructor(game) {
        this.game = game;
        
        this.chunkSize = 16;
        this.worldHeight = 64; // Verhoogd naar 64 voor diepe grotten en ertslagen!
        this.chunks = {};
        this.blockMeshes = {};
        this.loadedChunks = new Set();
        
        this.name = "Mijn Diepe Wereld";
        this.mode = "survival"; 
    }

    clearWorld() {
        Object.keys(this.blockMeshes).forEach(blockKey => {
            this.game.scene.remove(this.blockMeshes[blockKey]);
        });
        this.blockMeshes = {};
        this.chunks = {};
        this.loadedChunks.clear();
    }

    getChunkCoords(x, z) {
        const cx = Math.floor(x / this.chunkSize);
        const cz = Math.floor(z / this.chunkSize);
        return { cx, cz };
    }

    /**
     * Genereert een diepe 3D chunk met grotten en ertslagen.
     */
    generateChunk(cx, cz) {
        const chunkKey = `${cx},${cz}`;
        if (this.chunks[chunkKey]) return;

        this.chunks[chunkKey] = {};
        const geom = new THREE.BoxGeometry(1, 1, 1);

        for (let x = 0; x < this.chunkSize; x++) {
            for (let z = 0; z < this.chunkSize; z++) {
                const worldX = cx * this.chunkSize + x;
                const worldZ = cz * this.chunkSize + z;

                // Bepaal de hoogte van het oppervlak (tussen laag 48 en 56)
                const surfaceHeight = Math.floor(
                    Math.sin(worldX / 12) * Math.cos(worldZ / 12) * 4 + 50
                );

                for (let y = 0; y < this.worldHeight; y++) {
                    let blockType = 0; // Standaard lucht

                    // 1. BEPALING VAN DE BLOK-LAGEN (Van onder naar boven)
                    if (y === 0) {
                        blockType = 45; // Onbreekbare Bedrock bodem
                    } 
                    else if (y < 5) {
                        // Bedrock overgangslaag (mix van bedrock en deepslate)
                        blockType = Math.random() < 0.45 ? 45 : 43;
                    } 
                    else if (y < 20) {
                        blockType = 43; // Deepslate laag
                    } 
                    else if (y < surfaceHeight - 3) {
                        blockType = 3;  // Steen (Stone) laag
                    } 
                    else if (y < surfaceHeight) {
                        blockType = 2;  // Aarde (Dirt) onder de grasmat
                    } 
                    else if (y === surfaceHeight) {
                        blockType = 1;  // Gras (Grass) toplaag
                    }

                    // 2. 3D GROTTEN GENERATOR (Graaft tunnels in steen en deepslate)
                    if (blockType !== 0 && blockType !== 45 && y < surfaceHeight - 4) {
                        // Wiskundige 3D sinus-ruis om grottunnels te maken
                        const caveNoise = Math.sin(worldX * 0.25) * Math.cos(y * 0.2) * Math.sin(worldZ * 0.25);
                        if (caveNoise > 0.42) {
                            blockType = 0; // Graaf grot (maak lucht)
                        }
                    }

                    // 3. ERTS GENERATOR (Alleen als het blok niet is weggegraven door een grot)
                    if (blockType === 3) { // In de gewone stenen laag
                        const rand = Math.random();
                        if (rand < 0.015 && y < 40) {
                            blockType = 17; // Steenkool Erts
                        } else if (rand < 0.025 && rand >= 0.015 && y < 35) {
                            blockType = 18; // IJzer Erts
                        } else if (rand < 0.029 && rand >= 0.025 && y < 25) {
                            blockType = 19; // Goud Erts
                        } else if (rand < 0.031 && rand >= 0.029 && y < 15) {
                            blockType = 20; // Diamant Erts (Zeldzaam in steen)
                        }
                    } 
                    else if (blockType === 43) { // In de Deepslate laag
                        const rand = Math.random();
                        if (rand < 0.015) {
                            blockType = 84; // Deepslate IJzer Erts
                        } else if (rand < 0.020 && rand >= 0.015) {
                            blockType = 83; // Deepslate Diamant Erts (Meer kans diep onder de grond!)
                        } else if (rand < 0.022 && rand >= 0.020) {
                            blockType = 44; // Obsidian pockets
                        }
                    }

                    // Plaats het blok in de 3D wereld
                    if (blockType !== 0) {
                        this.setBlockInChunk(worldX, y, worldZ, blockType, chunkKey, geom);
                    }
                }

                // 4. BOMEN SPAWNER (Alleen op gras en als er geen grot direct onder zit)
                if (Math.random() < 0.02) {
                    const treeY = surfaceHeight + 1;
                    // Check of er gras onder de boom ligt
                    if (this.getBlock(worldX, surfaceHeight, worldZ) === 1) {
                        this.spawnTree(worldX, treeY, worldZ, chunkKey, geom);
                    }
                }
            }
        }
    }

    spawnTree(tx, ty, tz, chunkKey, geom) {
        // Stam van 4 blokken hoog (ID 4 = Wood)
        for (let h = 0; h < 4; h++) {
            this.setBlockInChunk(tx, ty + h, tz, 4, chunkKey, geom);
        }
        // Bladerdak (ID 5 = Leaves) rondom de top van de stam
        for (let x = -2; x <= 2; x++) {
            for (let z = -2; z <= 2; z++) {
                for (let y = 2; y <= 4; y++) {
                    // Maak een mooie ronde boomtop in plaats van een vierkant blok
                    if (Math.abs(x) + Math.abs(z) < 3) {
                        const leafX = tx + x;
                        const leafY = ty + y;
                        const leafZ = tz + z;
                        // Plaats alleen bladeren als er nog niks staat (voorkomt overschrijven stam)
                        if (this.getBlock(leafX, leafY, leafZ) === 0) {
                            this.setBlockInChunk(leafX, leafY, leafZ, 5, chunkKey, geom);
                        }
                    }
                }
            }
        }
    }

    setBlockInChunk(x, y, z, typeId, chunkKey, sharedGeom) {
        const blockKey = `${x},${y},${z}`;
        this.chunks[chunkKey][blockKey] = typeId;

        if (typeId !== 0) {
            const geom = sharedGeom || new THREE.BoxGeometry(1, 1, 1);
            const mesh = new THREE.Mesh(geom, this.game.materials[typeId]);
            mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
            this.game.scene.add(mesh);
            this.blockMeshes[blockKey] = mesh;
        }
    }

    getBlock(x, y, z) {
        const { cx, cz } = this.getChunkCoords(x, z);
        const chunkKey = `${cx},${cz}`;
        if (!this.chunks[chunkKey]) return 0;
        return this.chunks[chunkKey][`${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`] || 0;
    }

    setBlock(x, y, z, typeId) {
        const { cx, cz } = this.getChunkCoords(x, z);
        const chunkKey = `${cx},${cz}`;
        const blockKey = `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;

        if (!this.chunks[chunkKey]) {
            this.chunks[chunkKey] = {};
        }

        if (this.blockMeshes[blockKey]) {
            this.game.scene.remove(this.blockMeshes[blockKey]);
            delete this.blockMeshes[blockKey];
        }

        if (typeId === 0) {
            delete this.chunks[chunkKey][blockKey];
        } else {
            this.chunks[chunkKey][blockKey] = typeId;
            const geom = new THREE.BoxGeometry(1, 1, 1);
            const mesh = new THREE.Mesh(geom, this.game.materials[typeId]);
            mesh.position.set(Math.floor(x) + 0.5, Math.floor(y) + 0.5, Math.floor(z) + 0.5);
            this.game.scene.add(mesh);
            this.blockMeshes[blockKey] = mesh;
        }
    }

    updateChunksAroundPlayer(playerPosition) {
        const { cx, cz } = this.getChunkCoords(playerPosition.x, playerPosition.z);
        const radius = 2; // Render distance (2 chunks rondom de speler)
        const activeKeys = new Set();

        for (let x = -radius; x <= radius; x++) {
            for (let z = -radius; z <= radius; z++) {
                const nCX = cx + x;
                const nCZ = cz + z;
                const key = `${nCX},${nCZ}`;
                activeKeys.add(key);

                if (!this.loadedChunks.has(key)) {
                    this.generateChunk(nCX, nCZ);
                    this.loadedChunks.add(key);
                }
            }
        }

        this.loadedChunks.forEach(key => {
            if (!activeKeys.has(key)) {
                const chunkData = this.chunks[key];
                if (chunkData) {
                    Object.keys(chunkData).forEach(blockKey => {
                        if (this.blockMeshes[blockKey]) {
                            this.game.scene.remove(this.blockMeshes[blockKey]);
                            delete this.blockMeshes[blockKey];
                        }
                    });
                }
                this.loadedChunks.delete(key);
            }
        });
    }
}
