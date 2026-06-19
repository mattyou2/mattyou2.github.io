// ============================================================================
// MATTYOU CRAFT - WORLD & CHUNK GENERATION SYSTEM (world.js)
// ============================================================================

class WorldManager {
    /**
     * @param {Game} game - Referentie naar de hoofd game-engine
     */
    constructor(game) {
        this.game = game;
        
        this.chunkSize = 16;
        this.worldHeight = 16;
        this.chunks = {};
        this.blockMeshes = {};
        this.loadedChunks = new Set();
        
        // De actieve wereld-instellingen (naam, modus)
        this.name = "Mijn Wereld";
        this.mode = "survival"; 
    }

    /**
     * Reset de complete wereld (handig bij het wisselen van werelden).
     */
    clearWorld() {
        Object.keys(this.blockMeshes).forEach(blockKey => {
            this.game.scene.remove(this.blockMeshes[blockKey]);
        });
        this.blockMeshes = {};
        this.chunks = {};
        this.loadedChunks.clear();
    }

    /**
     * Berekent in welke chunk een specifieke X- en Z-coördinaat ligt.
     */
    getChunkCoords(x, z) {
        const cx = Math.floor(x / this.chunkSize);
        const cz = Math.floor(z / this.chunkSize);
        return { cx, cz };
    }

    /**
     * Genereert een nieuwe chunk (16x16x16 blokken) op basis van chunk-coördinaten.
     */
    generateChunk(cx, cz) {
        const chunkKey = `${cx},${cz}`;
        if (this.chunks[chunkKey]) return; // Al gegenereerd!

        this.chunks[chunkKey] = {};
        const geom = new THREE.BoxGeometry(1, 1, 1);

        for (let x = 0; x < this.chunkSize; x++) {
            for (let z = 0; z < this.chunkSize; z++) {
                const worldX = cx * this.chunkSize + x;
                const worldZ = cz * this.chunkSize + z;

                // Formule voor heuvelachtig terrein
                const height = Math.floor(Math.sin(worldX / 10) * Math.cos(worldZ / 10) * 4 + 7);

                for (let y = 0; y < this.worldHeight; y++) {
                    let blockType = 0; // Lucht

                    if (y < height - 3) {
                        blockType = 3; // Steen (Stone)
                    } else if (y < height - 1) {
                        blockType = 2; // Aarde (Dirt)
                    } else if (y === height - 1) {
                        blockType = 1; // Gras (Grass)
                    }

                    if (blockType !== 0) {
                        this.setBlockInChunk(worldX, y, worldZ, blockType, chunkKey, geom);
                    }
                }

                // Kans op het spawnen van een boom op het gras
                if (Math.random() < 0.02) {
                    const treeY = height;
                    this.spawnTree(worldX, treeY, worldZ, chunkKey, geom);
                }
            }
        }
    }

    /**
     * Spawnt een boom (stam van hout en bladerdak).
     */
    spawnTree(tx, ty, tz, chunkKey, geom) {
        // Stam van 3 blokken hoog (ID 4 = Wood)
        for (let h = 0; h < 3; h++) {
            this.setBlockInChunk(tx, ty + h, tz, 4, chunkKey, geom);
        }
        // Bladerdak (ID 5 = Leaves)
        for (let x = -1; x <= 1; x++) {
            for (let z = -1; z <= 1; z++) {
                this.setBlockInChunk(tx + x, ty + 3, tz + z, 5, chunkKey, geom);
            }
        }
    }

    /**
     * Interne helper om een blok direct in de chunk-data en 3D-scene te zetten tijdens generatie.
     */
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

    /**
     * Vraagt op welk bloktype er op een specifieke 3D-positie staat.
     * @returns {number} ID van het blok (0 = lucht)
     */
    getBlock(x, y, z) {
        const { cx, cz } = this.getChunkCoords(x, z);
        const chunkKey = `${cx},${cz}`;
        if (!this.chunks[chunkKey]) return 0;
        return this.chunks[chunkKey][`${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`] || 0;
    }

    /**
     * Plaatst of verwijdert een blok in de wereld (door speler of game-events).
     */
    setBlock(x, y, z, typeId) {
        const { cx, cz } = this.getChunkCoords(x, z);
        const chunkKey = `${cx},${cz}`;
        const blockKey = `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;

        if (!this.chunks[chunkKey]) {
            this.chunks[chunkKey] = {};
        }

        // Verwijder oude mesh als die er al stond
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

    /**
     * Laadt chunks rondom de speler in en verwijdert chunks die te ver weg zijn (render distance).
     */
    updateChunksAroundPlayer(playerPosition) {
        const { cx, cz } = this.getChunkCoords(playerPosition.x, playerPosition.z);
        const radius = 2; // Render distance (2 chunks in elke richting)
        const activeKeys = new Set();

        // Genereer nieuwe chunks binnen de radius
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

        // Verwijder chunks die buiten de render distance vallen om lag te voorkomen
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
