// ============================================================================
// MATTYOU CRAFT - INPUT MANAGER (input.js)
// ============================================================================

class InputManager {
    constructor() {
        this.keys = {};
        this.mouse = { x: 0, y: 0, left: false, right: false };
        this.locked = false;

        this.initListeners();
    }

    initListeners() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            // Open/Sluit inventaris met 'E'
            if (e.code === 'KeyE') {
                if (typeof game !== 'undefined' && game.state === 'playing' && !game.pauseMenuOpen && !game.settingsOpen) {
                    game.toggleInventory();
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        const container = document.getElementById('canvas-container');
        if (container) {
            container.addEventListener('click', () => {
                if (!this.locked && typeof game !== 'undefined' && game.state === 'playing') {
                    // Alleen focussen als er geen menu's openstaan
                    if (!game.inventoryOpen && !game.pauseMenuOpen && !game.settingsOpen) {
                        container.requestPointerLock();
                    }
                }
            });
        }

        // Pointer Lock status updates
        document.addEventListener('pointerlockchange', () => {
            this.locked = document.pointerLockElement === container;
            
            // Als de speler de focus verliest (bijv. via ESC), open dan het Pauzemenu!
            if (!this.locked && typeof game !== 'undefined' && game.state === 'playing') {
                if (!game.inventoryOpen && !game.settingsOpen && !game.pauseMenuOpen) {
                    game.openPauseMenu();
                }
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (this.locked) {
                this.mouse.x = e.movementX;
                this.mouse.y = e.movementY;
            }
        });

        window.addEventListener('mousedown', (e) => {
            if (!this.locked) return;
            if (e.button === 0) this.mouse.left = true;
            if (e.button === 2) this.mouse.right = true;
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.mouse.left = false;
            if (e.button === 2) this.mouse.right = false;
        });

        window.addEventListener('contextmenu', (e) => {
            if (this.locked) {
                e.preventDefault();
            }
        });
    }

    isKeyDown(code) {
        return !!this.keys[code];
    }

    consumeMouseMove() {
        const m = { x: this.mouse.x, y: this.mouse.y };
        this.mouse.x = 0;
        this.mouse.y = 0;
        return m;
    }
}
