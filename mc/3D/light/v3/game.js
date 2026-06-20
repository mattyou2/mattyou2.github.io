// ============================================================================
// MATTYOU CRAFT - MAIN GAME ENGINE (game.js) - LIGHT EDITION WITH SAVING
// ============================================================================

class Game {
    constructor() {
        this.state = 'menu';
        this.inventoryOpen = false;
        this.recipeBookOpen = false;
        this.pauseMenuOpen = false;
        this.settingsOpen = false;
        this.settingsFromMainMenu = true;
        this.isNearCraftingTable = false;
        this.isAdvancedCrafting = false;
        
        // Three.js Core
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();
        
        // Globale Instellingen (Met standaardwaarden)
        this.settings = {
            renderDistance: 2,
            sensitivity: 100,
            fov: 75
        };
        this.loadSettings();

        // Managers & Speler
        this.input = new InputManager();
        this.worldManager = new WorldManager(this);
        this.player = new Player(this);
        
        // Werelden Database (Local Storage)
        this.worlds = JSON.parse(localStorage.getItem('mattyou_craft_worlds')) || [];
        this.activeWorld = null;
        
        // UI Popups & Timeouts
        this.hotbarTextTimeout = null;

        // Crafting Grid State (9 slots max)
        this.craftingGrid = Array(9).fill(null).map(() => ({ id: null, count: 0 }));
        this.craftingOutput = { id: null, count: 0 };

        // Mining State
        this.mining = {
            active: false,
            x: null, y: null, z: null,
            progress: 0,
            targetTime: 0
        };

        this.materials = {};
        
        // Initialiseer de engine
        this.initEngine();
        this.loadBlockMaterials();
        this.initMouseAndScrollTracking();
    }

    // ============================================================================
    // ENGINE INITIALISATIE
    // ============================================================================
    initEngine() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x80a0ff);
        this.scene.fog = new THREE.FogExp2(0x80a0ff, 0.03);

        this.camera = new THREE.PerspectiveCamera(this.settings.fov, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.rotation.order = 'YXZ';
        
        this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);

        // Belichting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
        dirLight.position.set(10, 40, 10);
        this.scene.add(dirLight);

        // Resize handler
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Voorkom rechtermuisknop menu in de inventaris
        document.getElementById('inventory-screen').addEventListener('contextmenu', e => e.preventDefault());
    }

    initMouseAndScrollTracking() {
        window.addEventListener('mousemove', (e) => {
            if (this.inventoryOpen) {
                const cursor = document.getElementById('held-item-cursor');
                cursor.style.left = `${e.clientX - 26}px`;
                cursor.style.top = `${e.clientY - 26}px`;
            }
        });

        window.addEventListener('wheel', (e) => {
            if (this.state === 'playing' && !this.inventoryOpen && !this.pauseMenuOpen) {
                if (e.deltaY > 0) {
                    this.player.activeHotbarIdx = (this.player.activeHotbarIdx + 1) % 9;
                } else if (e.deltaY < 0) {
                    this.player.activeHotbarIdx = (this.player.activeHotbarIdx - 1 + 9) % 9;
                }
                this.updateHotbarUI();
                this.resetMining();
                this.showHotbarSelectionText();
            }
        });
    }

    loadBlockMaterials() {
        Object.keys(BLOCK_TYPES).forEach(id => {
            const type = BLOCK_TYPES[id];
            if (!type.isItem) {
                this.materials[id] = new THREE.MeshLambertMaterial({
                    map: TextureGenerator.createBlockTexture(type.key)
                });
            }
        });
    }

    // API Wrappers voor WorldManager
    getBlock(x, y, z) { return this.worldManager.getBlock(x, y, z); }
    setBlock(x, y, z, id) { this.worldManager.setBlock(x, y, z, id); }
    updateChunksAroundPlayer() { this.worldManager.updateChunksAroundPlayer(this.player.position, this.settings.renderDistance); }

    // ============================================================================
    // MAIN GAME LOOP
    // ============================================================================
    animate() {
        if (this.state !== 'playing') return;
        requestAnimationFrame(() => this.animate());

        const dt = Math.min(this.clock.getDelta(), 0.1);

        if (!this.inventoryOpen && !this.pauseMenuOpen && !this.settingsOpen) {
            this.player.update(dt);
            this.handleInteractions(dt);
            this.updateChunksAroundPlayer();
        }

        this.renderer.render(this.scene, this.camera);
    }

    // ============================================================================
    // MINING & PLACING LOGICA
    // ============================================================================
    handleInteractions(dt) {
        this.checkCraftingTableProximity();

        if (this.input.mouse.left) {
            this.performMining(dt);
        } else {
            this.resetMining();
        }

        if (this.input.mouse.right) {
            this.input.mouse.right = false;
            this.performPlacingOrInteraction();
        }
    }

    performMining(dt) {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

        const meshes = Object.values(this.worldManager.blockMeshes);
        const intersects = raycaster.intersectObjects(meshes);

        if (intersects.length > 0 && intersects[0].distance < 5.0) {
            const hit = intersects[0];
            const point = hit.point;
            const normal = hit.face.normal;

            const vx = Math.floor(point.x - normal.x * 0.5);
            const vy = Math.floor(point.y - normal.y * 0.5);
            const vz = Math.floor(point.z - normal.z * 0.5);

            const blockId = this.getBlock(vx, vy, vz);

            if (blockId === 45) {
                this.resetMining();
                return;
            }

            if (blockId !== 0) {
                if (this.activeWorld.mode === 'creative') {
                    this.breakBlock(vx, vy, vz, blockId);
                    return;
                }

                if (this.mining.x !== vx || this.mining.y !== vy || this.mining.z !== vz) {
                    this.mining.x = vx;
                    this.mining.y = vy;
                    this.mining.z = vz;
                    this.mining.progress = 0;
                    
                    let baseHardness = BLOCK_TYPES[blockId].hardness || 1.0;
                    const activeSlot = this.player.hotbar[this.player.activeHotbarIdx];
                    let speedMultiplier = 1.0;

                    if (activeSlot && activeSlot.id && BLOCK_TYPES[activeSlot.id].isItem && BLOCK_TYPES[activeSlot.id].speedMultiplier) {
                        const isStoneOrOre = [3, 17, 18, 19, 20, 41, 43, 44, 83, 84].includes(blockId);
                        if (isStoneOrOre) {
                            speedMultiplier = BLOCK_TYPES[activeSlot.id].speedMultiplier;
                        } else {
                            speedMultiplier = BLOCK_TYPES[activeSlot.id].speedMultiplier * 0.3;
                        }
                    }

                    this.mining.targetTime = baseHardness / speedMultiplier;
                    this.mining.active = true;
                    document.getElementById('mining-bar-container').style.display = 'block';
                }

                this.mining.progress += dt;
                const percent = Math.min(100, (this.mining.progress / this.mining.targetTime) * 100);
                document.getElementById('mining-bar-fill').style.width = `${percent}%`;

                if (this.mining.progress >= this.mining.targetTime) {
                    this.breakBlock(vx, vy, vz, blockId);
                    this.resetMining();
                }
            } else {
                this.resetMining();
            }
        } else {
            this.resetMining();
        }
    }

    breakBlock(x, y, z, blockId) {
        this.setBlock(x, y, z, 0);
        if (this.activeWorld.mode === 'survival') {
            let dropId = blockId;
            if (blockId === 3) dropId = 41; 
            if (blockId === 17) dropId = 24; 
            if (blockId === 20 || blockId === 83) dropId = 27; 

            this.player.addItemToInventory(dropId, 1);
        }
        this.updateHotbarUI();
    }

    resetMining() {
        this.mining.active = false;
        this.mining.x = null;
        this.mining.y = null;
        this.mining.z = null;
        this.mining.progress = 0;
        document.getElementById('mining-bar-container').style.display = 'none';
    }

    performPlacingOrInteraction() {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

        const meshes = Object.values(this.worldManager.blockMeshes);
        const intersects = raycaster.intersectObjects(meshes);

        if (intersects.length > 0 && intersects[0].distance < 5.0) {
            const hit = intersects[0];
            const point = hit.point;
            const normal = hit.face.normal;

            const rx = Math.floor(point.x - normal.x * 0.5);
            const ry = Math.floor(point.y - normal.y * 0.5);
            const rz = Math.floor(point.z - normal.z * 0.5);

            const clickedBlockId = this.getBlock(rx, ry, rz);

            if (clickedBlockId === 7) {
                this.toggleInventory(false, true);
                return;
            }

            const vx = Math.floor(point.x + normal.x * 0.5);
            const vy = Math.floor(point.y + normal.y * 0.5);
            const vz = Math.floor(point.z + normal.z * 0.5);

            const pBox = {
                minX: this.player.position.x - 0.3,
                maxX: this.player.position.x + 0.3,
                minY: this.player.position.y,
                maxY: this.player.position.y + 2.0,
                minZ: this.player.position.z - 0.3,
                maxZ: this.player.position.z + 0.3
            };

            if (vx >= pBox.minX && vx <= pBox.maxX && 
                vy >= pBox.minY && vy <= pBox.maxY && 
                vz >= pBox.minZ && vz <= pBox.maxZ) {
                return;
            }

            const activeSlot = this.player.hotbar[this.player.activeHotbarIdx];
            
            if (activeSlot && activeSlot.id && !BLOCK_TYPES[activeSlot.id].isItem) {
                if (this.activeWorld.mode === 'creative' || activeSlot.count > 0) {
                    this.setBlock(vx, vy, vz, activeSlot.id);

                    if (this.activeWorld.mode === 'survival') {
                        activeSlot.count--;
                        if (activeSlot.count <= 0) {
                            activeSlot.id = null;
                        }
                    }
                }
            }

            this.updateHotbarUI();
        }
    }

    checkCraftingTableProximity() {
        const px = Math.floor(this.player.position.x);
        const py = Math.floor(this.player.position.y);
        const pz = Math.floor(this.player.position.z);
        
        let found = false;
        for (let x = -2; x <= 2; x++) {
            for (let y = -2; y <= 2; y++) {
                for (let z = -2; z <= 2; z++) {
                    if (this.getBlock(px + x, py + y, pz + z) === 7) {
                        found = true;
                        break;
                    }
                }
            }
        }
        this.isNearCraftingTable = found;
    }

    // ============================================================================
    // PAUSE & SETTINGS MENU LOGICA
    // ============================================================================
    openPauseMenu() {
        if (this.state !== 'playing' || this.inventoryOpen || this.settingsOpen) return;
        this.pauseMenuOpen = true;
        document.getElementById('pause-screen').style.display = 'flex';
        document.exitPointerLock();
    }

    closePauseMenu() {
        this.pauseMenuOpen = false;
        document.getElementById('pause-screen').style.display = 'none';
        document.getElementById('canvas-container').requestPointerLock();
    }

    openSettings(fromMainMenu = false) {
        this.settingsOpen = true;
        this.settingsFromMainMenu = fromMainMenu;

        // Vul de sliders met de huidige opgeslagen waarden
        document.getElementById('setting-render-dist').value = this.settings.renderDistance;
        document.getElementById('val-render-dist').innerText = this.settings.renderDistance + ' Chunks';

        document.getElementById('setting-sensitivity').value = this.settings.sensitivity;
        document.getElementById('val-sensitivity').innerText = this.settings.sensitivity + '%';

        document.getElementById('setting-fov').value = this.settings.fov;
        document.getElementById('val-fov').innerText = this.settings.fov + '°';

        // Verberg andere schermen
        document.getElementById('menu-screen').style.display = 'none';
        document.getElementById('pause-screen').style.display = 'none';
        document.getElementById('settings-screen').style.display = 'flex';
    }

    saveAndCloseSettings() {
        this.settings.renderDistance = parseInt(document.getElementById('setting-render-dist').value);
        this.settings.sensitivity = parseInt(document.getElementById('setting-sensitivity').value);
        this.settings.fov = parseInt(document.getElementById('setting-fov').value);

        // Sla op in LocalStorage
        localStorage.setItem('mattyou_craft_settings', JSON.stringify(this.settings));

        // Pas direct toe op camera
        if (this.camera) {
            this.camera.fov = this.settings.fov;
            this.camera.updateProjectionMatrix();
        }

        this.settingsOpen = false;
        document.getElementById('settings-screen').style.display = 'none';

        if (this.settingsFromMainMenu) {
            document.getElementById('menu-screen').style.display = 'flex';
        } else {
            document.getElementById('pause-screen').style.display = 'flex';
        }
    }

    loadSettings() {
        const saved = localStorage.getItem('mattyou_craft_settings');
        if (saved) {
            this.settings = JSON.parse(saved);
        }
    }

    // ============================================================================
    // INVENTORY & CRAFTING UI
    // ============================================================================
    toggleInventory(forceClose = false, openAdvancedCrafting = false) {
        if (this.state !== 'playing' || this.pauseMenuOpen || this.settingsOpen) return;

        if (this.inventoryOpen || forceClose) {
            this.returnCraftingItemsToInventory();
            
            if (this.player.heldItem.id !== null) {
                this.player.addItemToInventory(this.player.heldItem.id, this.player.heldItem.count);
                this.player.heldItem = { id: null, count: 0 };
                this.updateHeldItemCursor();
            }

            this.inventoryOpen = false;
            document.getElementById('inventory-screen').style.display = 'none';
            document.getElementById('tooltip').style.display = 'none';
            document.getElementById('canvas-container').requestPointerLock();
        } else {
            this.inventoryOpen = true;
            document.getElementById('inventory-screen').style.display = 'flex';
            document.exitPointerLock();
            this.drawInventory(openAdvancedCrafting);
        }
    }

    returnCraftingItemsToInventory() {
        const size = this.isAdvancedCrafting ? 9 : 4;
        for (let i = 0; i < size; i++) {
            if (this.craftingGrid[i] && this.craftingGrid[i].id !== null) {
                this.player.addItemToInventory(this.craftingGrid[i].id, this.craftingGrid[i].count);
                this.craftingGrid[i] = { id: null, count: 0 };
            }
        }
        this.craftingOutput = { id: null, count: 0 };
    }

    toggleRecipeBook() {
        this.recipeBookOpen = !this.recipeBookOpen;
        document.getElementById('recipe-book').style.display = this.recipeBookOpen ? 'flex' : 'none';
        if (this.recipeBookOpen) {
            this.renderRecipeBook();
        }
    }

    renderRecipeBook() {
        const container = document.getElementById('recipe-list-container');
        container.innerHTML = '';

        const recipesToUse = RECIPES.filter(r => this.isAdvancedCrafting ? true : !r.is3x3);

        recipesToUse.forEach(recipe => {
            const el = document.createElement('div');
            el.className = 'recipe-item';
            
            let ingredientsText = "";
            Object.keys(recipe.ingredients).forEach(ingId => {
                ingredientsText += `${BLOCK_TYPES[ingId].name} (${recipe.ingredients[ingId]}x) `;
            });

            el.innerHTML = `
                <b style="color:#4caf50;">${recipe.name}</b><br>
                <span style="color: #aaa; font-size: 11px;">Nodig: ${ingredientsText}</span>
            `;
            
            el.addEventListener('click', () => {
                this.autoFillRecipe(recipe);
            });

            container.appendChild(el);
        });
    }

    autoFillRecipe(recipe) {
        this.returnCraftingItemsToInventory();

        let canCraft = true;
        Object.keys(recipe.ingredients).forEach(ingId => {
            const reqCount = recipe.ingredients[ingId];
            const hasCount = this.player.countItemInInventory(parseInt(ingId));
            if (hasCount < reqCount) canCraft = false;
        });

        if (!canCraft && this.activeWorld.mode !== 'creative') {
            alert("Je hebt niet genoeg materialen in je inventaris om dit te maken!");
            return;
        }

        const pattern = this.isAdvancedCrafting ? recipe.pattern3x3 : recipe.pattern2x2;
        if (!pattern) return;

        for (let i = 0; i < pattern.length; i++) {
            const itemId = pattern[i];
            if (itemId !== null) {
                if (this.activeWorld.mode === 'creative') {
                    this.craftingGrid[i] = { id: itemId, count: 1 };
                } else {
                    this.player.deductItemFromInventory(itemId, 1);
                    this.craftingGrid[i] = { id: itemId, count: 1 };
                }
            } else {
                this.craftingGrid[i] = { id: null, count: 0 };
            }
        }

        this.updateCraftingOutput();
        this.drawInventory(this.isAdvancedCrafting);
    }

    drawInventory(useAdvanced = false) {
        this.isAdvancedCrafting = useAdvanced;
        
        const container = document.getElementById('crafting-layout-container');
        container.innerHTML = '';

        const gridDiv = document.createElement('div');
        if (this.isAdvancedCrafting) {
            gridDiv.className = 'crafting-grid-3x3';
            for (let i = 0; i < 9; i++) {
                gridDiv.appendChild(this.createSlotElement('crafting', i));
            }
        } else {
            gridDiv.className = 'crafting-grid-2x2';
            for (let i = 0; i < 4; i++) {
                gridDiv.appendChild(this.createSlotElement('crafting', i));
            }
        }
        container.appendChild(gridDiv);

        const arrow = document.createElement('div');
        arrow.className = 'crafting-arrow';
        arrow.innerText = '→';
        container.appendChild(arrow);

        const outputSlot = this.createSlotElement('output', 0);
        container.appendChild(outputSlot);

        const grid = document.getElementById('inv-grid');
        grid.innerHTML = '';
        for (let i = 0; i < 27; i++) {
            grid.appendChild(this.createSlotElement('inventory', i));
        }

        const hotbarGrid = document.getElementById('inv-hotbar-grid');
        hotbarGrid.innerHTML = '';
        for (let i = 0; i < 9; i++) {
            hotbarGrid.appendChild(this.createSlotElement('hotbar', i));
        }

        if (this.recipeBookOpen) {
            this.renderRecipeBook();
        }
    }

    createSlotElement(type, index) {
        const slot = document.createElement('div');
        slot.className = 'inv-slot';
        slot.dataset.type = type;
        slot.dataset.index = index;

        let item = null;
        if (type === 'inventory') item = this.player.inventory[index];
        else if (type === 'hotbar') item = this.player.hotbar[index];
        else if (type === 'crafting') item = this.craftingGrid[index];
        else if (type === 'output') item = this.craftingOutput;

        if (item && item.id !== null) {
            const blockInfo = BLOCK_TYPES[item.id];
            const itemEl = document.createElement('div');
            itemEl.className = 'item-draggable';
            itemEl.style.backgroundColor = blockInfo.color;

            if (blockInfo.isItem) {
                itemEl.innerHTML = `<span>${blockInfo.name.split(' ')[0]}</span>`;
            } else {
                const countEl = document.createElement('span');
                countEl.className = 'slot-count';
                countEl.innerText = this.activeWorld.mode === 'creative' ? '∞' : item.count;
                itemEl.appendChild(countEl);
            }

            slot.appendChild(itemEl);

            // Tooltips
            slot.addEventListener('mouseenter', (e) => {
                const tooltip = document.getElementById('tooltip');
                tooltip.innerHTML = `
                    <div class="tooltip-title">${blockInfo.name}</div>
                    <div class="tooltip-desc">${blockInfo.description || "Een nuttig voorwerp."}</div>
                `;
                tooltip.style.display = 'block';
            });

            slot.addEventListener('mousemove', (e) => {
                const tooltip = document.getElementById('tooltip');
                tooltip.style.left = `${e.clientX + 15}px`;
                tooltip.style.top = `${e.clientY + 15}px`;
            });

            slot.addEventListener('mouseleave', () => {
                document.getElementById('tooltip').style.display = 'none';
            });
        }

        slot.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.player.handleSlotClick(type, index, e.button);
        });

        return slot;
    }

    updateCraftingOutput() {
        const size = this.isAdvancedCrafting ? 9 : 4;
        const gridIds = Array(size).fill(null);
        for (let i = 0; i < size; i++) {
            gridIds[i] = (this.craftingGrid[i] && this.craftingGrid[i].id !== null) ? this.craftingGrid[i].id : null;
        }

        let matched = null;

        const woodCount = gridIds.filter(id => id === 4).length;
        const otherCountWood = gridIds.filter(id => id !== null && id !== 4).length;
        if (woodCount === 1 && otherCountWood === 0) {
            matched = { id: 6, count: 4 };
        }

        if (!matched) {
            const plankCount = gridIds.filter(id => id === 6).length;
            const otherCountPlank = gridIds.filter(id => id !== null && id !== 6).length;
            if (plankCount === 2 && otherCountPlank === 0) {
                if (this.isAdvancedCrafting) {
                    const vMatches = [[0, 3], [3, 6], [1, 4], [4, 7], [2, 5], [5, 8]];
                    if (vMatches.some(([a, b]) => gridIds[a] === 6 && gridIds[b] === 6)) {
                        matched = { id: 8, count: 4 };
                    }
                } else {
                    if ((gridIds[0] === 6 && gridIds[2] === 6) || (gridIds[1] === 6 && gridIds[3] === 6)) {
                        matched = { id: 8, count: 4 };
                    }
                }
            }
        }

        if (!matched) {
            const plankCount = gridIds.filter(id => id === 6).length;
            const otherCountPlank = gridIds.filter(id => id !== null && id !== 6).length;
            if (plankCount === 4 && otherCountPlank === 0) {
                if (this.isAdvancedCrafting) {
                    const squares = [[0, 1, 3, 4], [1, 2, 4, 5], [3, 4, 6, 7], [4, 5, 7, 8]];
                    if (squares.some(sq => sq.every(idx => gridIds[idx] === 6))) {
                        matched = { id: 7, count: 1 };
                    }
                } else {
                    if (gridIds.every(id => id === 6)) {
                        matched = { id: 7, count: 1 };
                    }
                }
            }
        }

        if (!matched) {
            const recipesToUse = RECIPES.filter(r => this.isAdvancedCrafting ? true : !r.is3x3);
            for (let recipe of recipesToUse) {
                if (recipe.result === 6 || recipe.result === 8 || recipe.result === 7) continue;

                const pattern = this.isAdvancedCrafting ? recipe.pattern3x3 : recipe.pattern2x2;
                if (!pattern) continue;

                let match = true;
                for (let i = 0; i < pattern.length; i++) {
                    if (gridIds[i] !== pattern[i]) {
                        match = false;
                        break;
                    }
                }
                if (match) {
                    matched = { id: recipe.result, count: recipe.resultCount };
                    break;
                }
            }
        }

        if (matched) {
            this.craftingOutput.id = matched.id;
            this.craftingOutput.count = matched.count;
        } else {
            this.craftingOutput.id = null;
            this.craftingOutput.count = 0;
        }
    }

    retrieveCraftedItem() {
        if (this.craftingOutput.id === null) return;

        if (this.player.heldItem.id === null) {
            this.player.heldItem.id = this.craftingOutput.id;
            this.player.heldItem.count = this.craftingOutput.count;
        } else if (this.player.heldItem.id === this.craftingOutput.id && this.player.heldItem.count + this.craftingOutput.count <= 64) {
            this.player.heldItem.count += this.craftingOutput.count;
        } else {
            this.player.addItemToInventory(this.craftingOutput.id, this.craftingOutput.count);
        }

        const size = this.isAdvancedCrafting ? 9 : 4;
        for (let i = 0; i < size; i++) {
            if (this.craftingGrid[i] && this.craftingGrid[i].id !== null) {
                this.craftingGrid[i].count--;
                if (this.craftingGrid[i].count <= 0) {
                    this.craftingGrid[i].id = null;
                }
            }
        }

        this.updateCraftingOutput();
        this.updateHeldItemCursor();
        this.drawInventory(this.isAdvancedCrafting);
        this.updateHotbarUI();
    }

    updateHeldItemCursor() {
        const cursor = document.getElementById('held-item-cursor');
        if (this.player.heldItem.id !== null) {
            const blockInfo = BLOCK_TYPES[this.player.heldItem.id];
            cursor.style.display = 'flex';
            cursor.style.backgroundColor = blockInfo.color;
            
            if (blockInfo.isItem) {
                cursor.innerHTML = `<span>${blockInfo.name.split(' ')[0]}</span>`;
            } else {
                cursor.innerHTML = `<span class="slot-count">${this.activeWorld.mode === 'creative' ? '∞' : this.player.heldItem.count}</span>`;
            }
        } else {
            cursor.style.display = 'none';
        }
    }

    showHotbarSelectionText() {
        const activeSlot = this.player.hotbar[this.player.activeHotbarIdx];
        const textEl = document.getElementById('hotbar-text');

        if (activeSlot && activeSlot.id !== null) {
            const blockInfo = BLOCK_TYPES[activeSlot.id];
            textEl.innerText = blockInfo.name;
            textEl.style.opacity = '1';

            if (this.hotbarTextTimeout) clearTimeout(this.hotbarTextTimeout);
            this.hotbarTextTimeout = setTimeout(() => {
                textEl.style.opacity = '0';
            }, 2000);
        } else {
            textEl.style.opacity = '0';
        }
    }

    updateHotbarUI() {
        const hotbar = document.getElementById('hotbar');
        hotbar.innerHTML = '';

        for (let i = 0; i < 9; i++) {
            const slot = document.createElement('div');
            slot.className = `hotbar-slot ${i === this.player.activeHotbarIdx ? 'active' : ''}`;
            
            const item = this.player.hotbar[i];
            
            if (item && item.id !== null && (this.activeWorld.mode === 'creative' || item.count > 0)) {
                const type = BLOCK_TYPES[item.id];
                slot.style.backgroundColor = type.color;

                if (type.isItem) {
                    slot.innerHTML = `<span style="font-size: 8px; text-align: center; color: white; font-weight: bold; text-shadow: 1px 1px 2px black;">${type.name}</span>`;
                } else {
                    const countEl = document.createElement('span');
                    countEl.className = 'slot-count';
                    countEl.innerText = this.activeWorld.mode === 'creative' ? '∞' : item.count;
                    slot.appendChild(countEl);
                }
            } else {
                this.player.hotbar[i] = { id: null, count: 0 };
            }

            slot.addEventListener('click', () => {
                this.player.activeHotbarIdx = i;
                this.updateHotbarUI();
                this.resetMining();
                this.showHotbarSelectionText();
            });

            hotbar.appendChild(slot);
        }
    }

    // ============================================================================
    // MENU & PERSISTENT OPSLAG LOGICA
    // ============================================================================
    showWorldSelection() {
        document.getElementById('main-menu-buttons').style.display = 'none';
        document.getElementById('world-list-container').style.display = 'flex';
        this.renderWorldList();
    }

    renderWorldList() {
        const list = document.getElementById('world-list');
        list.innerHTML = '';

        if (this.worlds.length === 0) {
            list.innerHTML = '<p style="color:#888; text-align:center;">Geen werelden gevonden.</p>';
            return;
        }

        this.worlds.forEach((w, idx) => {
            const el = document.createElement('div');
            el.className = 'world-item';
            el.innerHTML = `
                <span><b>${w.name}</b> (${w.mode.toUpperCase()})</span>
                <span style="color:#ff0055; font-weight:bold;" onclick="event.stopPropagation(); game.deleteWorld(${idx})">X</span>
            `;
            el.addEventListener('click', () => this.loadWorld(w));
            list.appendChild(el);
        });
    }

    showCreateWorld() {
        document.getElementById('menu-screen').style.display = 'none';
        document.getElementById('create-world-screen').style.display = 'flex';
    }

    cancelWorldCreation() {
        document.getElementById('create-world-screen').style.display = 'none';
        document.getElementById('menu-screen').style.display = 'flex';
        this.showWorldSelection();
    }

    createAndStartWorld() {
        const name = document.getElementById('world-name').value.trim() || 'Nieuwe Wereld';
        const mode = document.getElementById('world-mode').value;

        const newWorld = {
            id: 'world_' + Date.now(), // Unieke ID voor opslag
            name: name,
            mode: mode,
            created: Date.now()
        };

        this.worlds.push(newWorld);
        localStorage.setItem('mattyou_craft_worlds', JSON.stringify(this.worlds));

        this.loadWorld(newWorld);
    }

    deleteWorld(idx) {
        const world = this.worlds[idx];
        if (world) {
            localStorage.removeItem(`mattyou_craft_save_${world.id}`);
        }
        this.worlds.splice(idx, 1);
        localStorage.setItem('mattyou_craft_worlds', JSON.stringify(this.worlds));
        this.renderWorldList();
    }

    /**
     * Sla de huidige wereld en spelerstatus op in LocalStorage
     */
    saveActiveWorld() {
        if (!this.activeWorld) return;

        const saveData = {
            player: {
                position: { x: this.player.position.x, y: this.player.position.y, z: this.player.position.z },
                yaw: this.player.yaw,
                pitch: this.player.pitch,
                inventory: this.player.inventory,
                hotbar: this.player.hotbar
            },
            chunks: this.worldManager.chunks // Sla alle gemodificeerde blokken op!
        };

        localStorage.setItem(`mattyou_craft_save_${this.activeWorld.id}`, JSON.stringify(saveData));
        console.log(`Wereld '${this.activeWorld.name}' succesvol opgeslagen!`);
    }

    saveAndQuit() {
        this.saveActiveWorld();
        
        // Stop de game loop en keer terug naar het menu
        this.state = 'menu';
        this.pauseMenuOpen = false;
        
        document.getElementById('pause-screen').style.display = 'none';
        document.getElementById('hud').style.display = 'none';
        document.getElementById('menu-screen').style.display = 'flex';
        
        this.worldManager.clearWorld();
        this.showWorldSelection();
    }

    loadWorld(world) {
        this.activeWorld = world;
        this.state = 'playing';

        document.getElementById('menu-screen').style.display = 'none';
        document.getElementById('create-world-screen').style.display = 'none';
        document.getElementById('hud').style.display = 'block';

        this.worldManager.clearWorld();

        // Probeer opgeslagen data te laden
        const savedDataRaw = localStorage.getItem(`mattyou_craft_save_${world.id}`);
        
        if (savedDataRaw) {
            const savedData = JSON.parse(savedDataRaw);
            
            // Herstel spelerpositie en rotatie
            this.player.position.set(savedData.player.position.x, savedData.player.position.y, savedData.player.position.z);
            this.player.yaw = savedData.player.yaw;
            this.player.pitch = savedData.player.pitch;
            
            // Herstel inventaris
            this.player.inventory = savedData.player.inventory;
            this.player.hotbar = savedData.player.hotbar;

            // Herstel wereldblokken
            this.worldManager.chunks = savedData.chunks || {};
        } else {
            // Geen opgeslagen data -> Genereer nieuwe speler status
            this.player.position.set(8, 58, 8);
            this.player.yaw = 0;
            this.player.pitch = 0;

            if (world.mode === 'survival') {
                this.player.inventory = Array(27).fill(null).map(() => ({ id: null, count: 0 }));
                this.player.hotbar = Array(9).fill(null).map(() => ({ id: null, count: 0 }));
            } else {
                this.player.inventory = Array(27).fill(null).map(() => ({ id: null, count: 0 }));
                this.player.hotbar = Array(9).fill(null).map(() => ({ id: null, count: 0 }));
                
                const creativeItems = [1, 2, 3, 4, 5, 6, 7, 17, 18, 19, 20, 41, 43, 44, 77, 8, 24, 25, 26, 27, 9, 10, 48, 50, 11, 12, 51, 53, 74, 76];
                creativeItems.forEach((id, idx) => {
                    if (idx < 27) {
                        this.player.inventory[idx] = { id: id, count: 99 };
                    }
                });
            }
        }

        // Pas FOV instelling toe
        this.camera.fov = this.settings.fov;
        this.camera.updateProjectionMatrix();

        // FIX: Genereer de directe chunks rondom de spawnpositie direct synchroon in!
        // Dit voorkomt dat je bij het inladen direct door de grond valt.
        const spawnX = this.player.position.x;
        const spawnZ = this.player.position.z;
        const { cx, cz } = this.worldManager.getChunkCoords(spawnX, spawnZ);
        for (let x = -1; x <= 1; x++) {
            for (let z = -1; z <= 1; z++) {
                const key = `${cx + x},${cz + z}`;
                this.worldManager.generateChunk(cx + x, cz + z);
                this.worldManager.loadedChunks.add(key);
            }
        }

        this.updateChunksAroundPlayer();
        this.updateHotbarUI();

        document.getElementById('canvas-container').requestPointerLock();
        this.clock.getDelta();
        this.animate();
    }
}

// Start de game instantie
const game = new Game();

// Globale functies koppelen aan de HTML knoppen
function showCreateWorld() { game.showCreateWorld(); }
function showWorldSelection() { game.showWorldSelection(); }
function createAndStartWorld() { game.createAndStartWorld(); }
function cancelWorldCreation() { game.cancelWorldCreation(); }
