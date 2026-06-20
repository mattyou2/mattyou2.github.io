// ============================================================================
// MATTYOU CRAFT - PLAYER, PHYSICS & INVENTORY SYSTEM (player.js)
// ============================================================================

class Player {
    /**
     * @param {Game} game - Referentie naar de hoofd game-engine
     */
    constructor(game) {
        this.game = game;

        // Positie & Beweging
        this.position = new THREE.Vector3(8, 12, 8);
        this.velocity = new THREE.Vector3();
        this.yaw = 0;
        this.pitch = 0;
        this.onGround = false;

        // Inventaris & Hotbar
        this.inventory = Array(27).fill(null).map(() => ({ id: null, count: 0 }));
        this.hotbar = Array(9).fill(null).map(() => ({ id: null, count: 0 }));
        this.activeHotbarIdx = 0;

        this.heldItem = { id: null, count: 0 };
    }

    /**
     * Update de speler physics, beweging en camera-rotatie.
     * @param {number} dt - Delta time
     */
    update(dt) {
        // FIX: Void rescue! Als de speler toch door de wereld valt (Y < -10), zet hem terug op veilige hoogte.
        if (this.position.y < -10) {
            this.position.set(8, 58, 8);
            this.velocity.set(0, 0, 0);
        }

        // 1. Camera rotatie via muisbeweging (Gevoeligheid toegepast!)
        const mouse = this.game.input.consumeMouseMove();
        const sensMultiplier = (this.game.settings.sensitivity / 100) * 0.0025;
        
        this.yaw -= mouse.x * sensMultiplier;
        this.pitch -= mouse.y * sensMultiplier;
        
        this.pitch = Math.max(-Math.PI / 2.05, Math.min(Math.PI / 2.05, this.pitch));
        this.game.camera.rotation.set(this.pitch, this.yaw, 0);

        // 2. Toetsenbord input verwerken voor lopen
        const moveSpeed = 6.0;
        const moveVector = new THREE.Vector3();

        if (this.game.input.isKeyDown('KeyW')) moveVector.z -= 1;
        if (this.game.input.isKeyDown('KeyS')) moveVector.z += 1;
        if (this.game.input.isKeyDown('KeyA')) moveVector.x -= 1;
        if (this.game.input.isKeyDown('KeyD')) moveVector.x += 1;

        moveVector.normalize();
        moveVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

        this.velocity.x = moveVector.x * moveSpeed;
        this.velocity.z = moveVector.z * moveSpeed;

        // 3. Zwaartekracht & Vliegen
        if (this.game.activeWorld.mode === 'creative') {
            this.velocity.y = 0;
            if (this.game.input.isKeyDown('Space')) this.velocity.y = moveSpeed;
            if (this.game.input.isKeyDown('ShiftLeft')) this.velocity.y = -moveSpeed;
        } else {
            if (!this.onGround) {
                this.velocity.y -= 22 * dt; 
            } else {
                this.velocity.y = 0;
                if (this.game.input.isKeyDown('Space')) {
                    this.velocity.y = 7.6; 
                    this.onGround = false;
                }
            }
        }

        // 4. Bereken nieuwe positie en los botsingen op
        const nextPos = this.position.clone().addScaledVector(this.velocity, dt);
        this.resolveCollisions(nextPos, dt);

        // 5. Update de camera positie naar de ooghoogte van de speler (1.65m)
        this.game.camera.position.copy(this.position).y += 1.65;

        // 6. Hotbar selectie via cijfertoetsen (1 t/m 9)
        for (let i = 1; i <= 9; i++) {
            if (this.game.input.isKeyDown(`Digit${i}`)) {
                this.activeHotbarIdx = i - 1;
                this.game.updateHotbarUI();
                this.game.resetMining();
                this.game.showHotbarSelectionText();
            }
        }
    }

    resolveCollisions(nextPos, dt) {
        if (this.game.activeWorld.mode === 'creative') {
            this.position.copy(nextPos);
            return;
        }

        const pSize = { x: 0.6, y: 1.8, z: 0.6 }; 
        
        let tempPos = this.position.clone();
        tempPos.x = nextPos.x;
        if (!this.checkCollisionAt(tempPos.x, tempPos.y, tempPos.z, pSize)) {
            this.position.x = nextPos.x;
        } else {
            this.velocity.x = 0;
        }

        tempPos = this.position.clone();
        tempPos.z = nextPos.z;
        if (!this.checkCollisionAt(tempPos.x, tempPos.y, tempPos.z, pSize)) {
            this.position.z = nextPos.z;
        } else {
            this.velocity.z = 0;
        }

        this.position.y += this.velocity.y * dt;
        if (this.checkCollisionAt(this.position.x, this.position.y, this.position.z, pSize)) {
            if (this.velocity.y < 0) {
                this.onGround = true;
                this.position.y = Math.ceil(this.position.y); 
            } else if (this.velocity.y > 0) {
                this.position.y = Math.floor(this.position.y); 
            }
            this.velocity.y = 0;
        } else {
            const belowPos = this.position.clone();
            belowPos.y -= 0.05;
            if (this.checkCollisionAt(belowPos.x, belowPos.y, belowPos.z, pSize)) {
                this.onGround = true;
            } else {
                this.onGround = false;
            }
        }
    }

    checkCollisionAt(px, py, pz, size) {
        const minX = Math.floor(px - size.x / 2);
        const maxX = Math.floor(px + size.x / 2);
        const minY = Math.floor(py);
        const maxY = Math.floor(py + size.y);
        const minZ = Math.floor(pz - size.z / 2);
        const maxZ = Math.floor(pz + size.z / 2);

        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                for (let z = minZ; z <= maxZ; z++) {
                    // FIX: Als de chunk nog niet geladen is, behandel het als een onzichtbare muur!
                    if (!this.game.worldManager.isChunkLoaded(x, z)) {
                        return true; 
                    }
                    if (this.game.getBlock(x, y, z) !== 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    addItemToInventory(id, count = 1) {
        for (let i = 0; i < 9; i++) {
            if (this.hotbar[i] && this.hotbar[i].id === id && this.hotbar[i].count < 64) {
                this.hotbar[i].count += count;
                return;
            }
        }
        for (let i = 0; i < 27; i++) {
            if (this.inventory[i] && this.inventory[i].id === id && this.inventory[i].count < 64) {
                this.inventory[i].count += count;
                return;
            }
        }
        for (let i = 0; i < 9; i++) {
            if (!this.hotbar[i] || this.hotbar[i].id === null) {
                this.hotbar[i] = { id: id, count: count };
                return;
            }
        }
        for (let i = 0; i < 27; i++) {
            if (!this.inventory[i] || this.inventory[i].id === null) {
                this.inventory[i] = { id: id, count: count };
                return;
            }
        }
    }

    countItemInInventory(id) {
        let count = 0;
        this.inventory.forEach(slot => {
            if (slot && slot.id === id) count += slot.count;
        });
        this.hotbar.forEach(slot => {
            if (slot && slot.id === id) count += slot.count;
        });
        return count;
    }

    deductItemFromInventory(id, amount) {
        let remaining = amount;
        for (let slot of this.inventory) {
            if (slot && slot.id === id) {
                if (slot.count >= remaining) {
                    slot.count -= remaining;
                    if (slot.count === 0) slot.id = null;
                    return;
                } else {
                    remaining -= slot.count;
                    slot.id = null;
                    slot.count = 0;
                }
            }
        }
        for (let slot of this.hotbar) {
            if (slot && slot.id === id) {
                if (slot.count >= remaining) {
                    slot.count -= remaining;
                    if (slot.count === 0) slot.id = null;
                    return;
                } else {
                    remaining -= slot.count;
                    slot.id = null;
                    slot.count = 0;
                }
            }
        }
    }

    getSlot(type, index) {
        if (type === 'inventory') return this.inventory[index];
        if (type === 'hotbar') return this.hotbar[index];
        if (type === 'crafting') return this.game.craftingGrid[index];
        if (type === 'output') return this.game.craftingOutput;
        return null;
    }

    handleSlotClick(type, index, button) {
        if (type === 'output') {
            if (button === 0) {
                this.game.retrieveCraftedItem();
            }
            return;
        }

        let slot = this.getSlot(type, index);
        if (!slot) return;

        if (button === 0) { 
            if (this.heldItem.id === null) {
                if (slot.id !== null) {
                    this.heldItem.id = slot.id;
                    this.heldItem.count = slot.count;
                    slot.id = null;
                    slot.count = 0;
                }
            } else {
                if (slot.id === null) {
                    slot.id = this.heldItem.id;
                    slot.count = this.heldItem.count;
                    this.heldItem.id = null;
                    this.heldItem.count = 0;
                } else if (slot.id === this.heldItem.id && !BLOCK_TYPES[slot.id].isItem) {
                    const total = slot.count + this.heldItem.count;
                    if (total <= 64) {
                        slot.count = total;
                        this.heldItem.id = null;
                        this.heldItem.count = 0;
                    } else {
                        slot.count = 64;
                        this.heldItem.count = total - 64;
                    }
                } else {
                    const temp = { id: slot.id, count: slot.count };
                    slot.id = this.heldItem.id;
                    slot.count = this.heldItem.count;
                    this.heldItem.id = temp.id;
                    this.heldItem.count = temp.count;
                }
            }
        } else if (button === 2) { 
            if (this.heldItem.id === null) {
                if (slot.id !== null && slot.count > 1 && !BLOCK_TYPES[slot.id].isItem) {
                    const take = Math.ceil(slot.count / 2);
                    this.heldItem.id = slot.id;
                    this.heldItem.count = take;
                    slot.count -= take;
                } else if (slot.id !== null) {
                    this.heldItem.id = slot.id;
                    this.heldItem.count = slot.count;
                    slot.id = null;
                    slot.count = 0;
                }
            } else {
                if (slot.id === null) {
                    slot.id = this.heldItem.id;
                    slot.count = 1;
                    this.heldItem.count--;
                    if (this.heldItem.count <= 0) this.heldItem.id = null;
                } else if (slot.id === this.heldItem.id && !BLOCK_TYPES[slot.id].isItem && slot.count < 64) {
                    slot.count++;
                    this.heldItem.count--;
                    if (this.heldItem.count <= 0) this.heldItem.id = null;
                }
            }
        }

        this.game.updateCraftingOutput();
        this.game.updateHeldItemCursor();
        this.game.drawInventory(this.game.isAdvancedCrafting);
        this.game.updateHotbarUI();
    }
}
