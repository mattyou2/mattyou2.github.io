// ============================================================================
// MATTYOU CRAFT - ADVANCED DEEP WORLD & CAVE GENERATION (world.js) - LIGHT EDITION
// ============================================================================

class WorldManager {
    /**
     * @param {Game} game - Referentie naar de hoofd game-engine
     */
    constructor(game) {
        this.game = game;
        
        this.chunkSize = 16;
        this.worldHeight = 64; 
        this.chunks = {};
        this.blockMeshes = {};
        this.loadedChunks = new Set();
        
        this.name = "Mijn Diepe Wereld";
        this.mode = "survival"; 

        this.sharedGeometry = new THREE.BoxGeometry(1, 1, 1);
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
     * FIX: Controleert of een specifieke chunk al volledig is gegenereerd en geladen.
     */
    isChunkLoaded(x, z) {
        const { cx, cz } = this.getChunkCoords(x, z);
        return this.loadedChunks.has(`${cx},${cz}`);
    }

    shouldRenderBlock(x, y, z) {
        const type = this.getBlock(x, y, z);
        if (type === 0) return false;

        if (this.getBlock(x + 1, y, z) === 0 || this.getBlock(x + 1, y, z) === 5) return true;
        if (this.getBlock(x - 1, y, z) === 0 || this.getBlock(x - 1, y, z) === 5) return true;
        if (this.getBlock(x, y + 1, z) === 0 || this.getBlock(x, y + 1, z) === 5) return true;
        if (this.getBlock(x, y - 1, z) === 0 || this.getBlock(x, y - 1, z) === 5) return true;
        if (this.getBlock(x, y, z + 1) === 0 || this.getBlock(x, y, z + 1) === 5) return true;
        if (this.getBlock(x, y, z - 1) === 0 || this.getBlock(x, y, z - 1) === 5) return true;

        return false; 
    }

    updateBlockMesh(x, y, z) {
        const blockKey = `${x},${y},${z}`;
        const typeId = this.getBlock(x, y, z);

        if (this.blockMeshes[blockKey]) {
            this.game.scene.remove(this.blockMeshes[blockKey]);
            delete this.blockMeshes[blockKey];
        }

        if (typeId !== 0 && this.shouldRenderBlock(x, y, z)) {
            const mesh = new THREE.Mesh(this.sharedGeometry, this.game.materials[typeId]);
            mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
            this.game.scene.add(mesh);
            this.blockMeshes[blockKey] = mesh;
        }
    }

    /**
     * Genereert een diepe 3D chunk met grotten en ertslagen.
     * Herkent nu of er al opgeslagen data is voor deze chunk!
     */
    generateChunk(cx, cz) {
        const chunkKey = `${cx},${cz}`;
        
        // Controleer of de chunk al bestaat in het geheugen (bijv. geladen uit savegame)
        const hasSavedData = this.chunks[chunkKey] && Object.keys(this.chunks[chunkKey]).length > 0;

        if (!hasSavedData) {
            this.chunks[chunkKey] = {};

            // STAP 1: Genereer nieuwe data via noise als er geen savegame is
            for (let x = 0; x < this.chunkSize; x++) {
                for (let z = 0; z < this.chunkSize; z++) {
                    const worldX = cx * this.chunkSize + x;
                    const worldZ = cz * this.chunkSize + z;

                    const surfaceHeight = Math.floor(
                        Math.sin(worldX / 12) * Math.cos(worldZ / 12) * 4 + 50
                    );

                    for (let y = 0; y < this.worldHeight; y++) {
                        let blockType = 0; 

                        if (y === 0) {
                            blockType = 45; 
                        } 
                        else if (y < 5) {
                            blockType = Math.random() < 0.45 ? 45 : 43;
                        } 
                        else if (y < 20) {
                            blockType = 43; 
                        } 
                        else if (y < surfaceHeight - 3) {
                            blockType = 3;  
                        } 
                        else if (y < surfaceHeight) {
                            blockType = 2;  
                        } 
                        else if (y === surfaceHeight) {
                            blockType = 1;  
                        }

                        // 3D GROTTEN GENERATOR
                        if (blockType !== 0 && blockType !== 45 && y < surfaceHeight - 4) {
                            const caveNoise = Math.sin(worldX * 0.25) * Math.cos(y * 0.2) * Math.sin(worldZ * 0.25);
                            if (caveNoise > 0.42) {
                                blockType = 0; 
                            }
                        }

                        // ERTS GENERATOR
                        if (blockType === 3) { 
                            const rand = Math.random();
                            if (rand < 0.015 && y < 40) {
                                blockType = 17; 
                            } else if (rand < 0.025 && rand >= 0.015 && y < 35) {
                                blockType = 18; 
                            } else if (rand < 0.029 && rand >= 0.025 && y < 25) {
                                blockType = 19; 
                            } else if (rand < 0.031 && rand >= 0.029 && y < 15) {
                                blockType = 20; 
                            }
                        } 
                        else if (blockType === 43) { 
                            const rand = Math.random();
                            if (rand < 0.015) {
                                blockType = 84; 
                            } else if (rand < 0.020 && rand >= 0.015) {
                                blockType = 83; 
                            } else if (rand < 0.022 && rand >= 0.020) {
                                blockType = 44; 
                            }
                        }

                        if (blockType !== 0) {
                            const blockKey = `${worldX},${y},${worldZ}`;
                            this.chunks[chunkKey][blockKey] = blockType;
                        }
                    }

                    // BOMEN SPAWNER
                    if (Math.random() < 0.02) {
                        const treeY = surfaceHeight + 1;
                        if (this.getBlock(worldX, surfaceHeight, worldZ) === 1) {
                            this.spawnTreeData(worldX, treeY, worldZ, chunkKey);
                        }
                    }
                }
            }
        }

        // STAP 2: Genereer de 3D-meshes (voor zowel nieuwe als geladen chunks)
        for (let x = 0; x < this.chunkSize; x++) {
            for (let z = 0; z < this.chunkSize; z++) {
                const worldX = cx * this.chunkSize + x;
                const worldZ = cz * this.chunkSize + z;
                for (let y = 0; y < this.worldHeight; y++) {
                    this.updateBlockMesh(worldX, y, worldZ);
                }
            }
        }
    }

    spawnTreeData(tx, ty, tz, chunkKey) {
        for (let h = 0; h < 4; h++) {
            const blockKey = `${tx},${ty + h},${tz}`;
            this.chunks[chunkKey][blockKey] = 4;
        }
        for (let x = -2; x <= 2; x++) {
            for (let z = -2; z <= 2; z++) {
                for (let y = 2; y <= 4; y++) {
                    if (Math.abs(x) + Math.abs(z) < 3) {
                        const leafX = tx + x;
                        const leafY = ty + y;
                        const leafZ = tz + z;
                        if (this.getBlock(leafX, leafY, leafZ) === 0) {
                            const leafChunkCoords = this.getChunkCoords(leafX, leafZ);
                            const leafChunkKey = `${leafChunkCoords.cx},${leafChunkCoords.cz}`;
                            if (!this.chunks[leafChunkKey]) this.chunks[leafChunkKey] = {};
                            this.chunks[leafChunkKey][`${leafX},${leafY},${leafZ}`] = 5;
                        }
                    }
                }
            }
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

        if (typeId === 0) {
            delete this.chunks[chunkKey][blockKey];
        } else {
            this.chunks[chunkKey][blockKey] = typeId;
        }

        this.updateBlockMesh(x, y, z);
        this.updateBlockMesh(x + 1, y, z);
        this.updateBlockMesh(x - 1, y, z);
        this.updateBlockMesh(x, y + 1, z);
        this.updateBlockMesh(x, y - 1, z);
        this.updateBlockMesh(x, y, z + 1);
        this.updateBlockMesh(x, y, z - 1);
    }

    updateChunksAroundPlayer(playerPosition, renderDistance) {
        const { cx, cz } = this.getChunkCoords(playerPosition.x, playerPosition.z);
        const activeKeys = new Set();
        const chunksToGenerate = [];

        for (let x = -renderDistance; x <= renderDistance; x++) {
            for (let z = -renderDistance; z <= renderDistance; z++) {
                const nCX = cx + x;
                const nCZ = cz + z;
                const key = `${nCX},${nCZ}`;
                activeKeys.add(key);

                if (!this.loadedChunks.has(key)) {
                    chunksToGenerate.push({ cx: nCX, cz: nCZ, key });
                }
            }
        }

        if (chunksToGenerate.length > 0) {
            chunksToGenerate.sort((a, b) => {
                const distA = Math.hypot(a.cx - cx, a.cz - cz);
                const distB = Math.hypot(b.cx - cx, b.cz - cz);
                return distA - distB; 
            });

            const nextChunk = chunksToGenerate[0];
            this.generateChunk(nextChunk.cx, nextChunk.cz);
            this.loadedChunks.add(nextChunk.key);
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
