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
        // Toetsenbord - Toets Ingedrukt
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            // Open/Sluit inventaris met 'E'
            if (e.code === 'KeyE') {
                if (typeof game !== 'undefined') {
                    game.toggleInventory();
                }
            }
        });

        // Toetsenbord - Toets Losgelaten
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Klik op het scherm om de game te focussen (Pointer Lock)
        const container = document.getElementById('canvas-container');
        if (container) {
            container.addEventListener('click', () => {
                if (!this.locked && typeof game !== 'undefined' && game.state === 'playing') {
                    container.requestPointerLock();
                }
            });
        }

        // Pointer Lock status updates
        document.addEventListener('pointerlockchange', () => {
            this.locked = document.pointerLockElement === container;
            
            // Als de speler de focus verliest (bijv. via ESC), open dan automatisch de inventaris/pauzeermenu
            if (!this.locked && typeof game !== 'undefined' && game.state === 'playing' && !game.inventoryOpen) {
                game.toggleInventory(true);
            }
        });

        // Muisbeweging (Rondkijken)
        document.addEventListener('mousemove', (e) => {
            if (this.locked) {
                this.mouse.x = e.movementX;
                this.mouse.y = e.movementY;
            }
        });

        // Muisklikken (Links = Minen, Rechts = Bouwen/Interactie)
        window.addEventListener('mousedown', (e) => {
            if (!this.locked) return;
            if (e.button === 0) this.mouse.left = true;
            if (e.button === 2) this.mouse.right = true;
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.mouse.left = false;
            if (e.button === 2) this.mouse.right = false;
        });

        // Voorkom dat het rechtermuisknop-menu opent tijdens het spelen
        window.addEventListener('contextmenu', (e) => {
            if (this.locked) {
                e.preventDefault();
            }
        });
    }

    /**
     * Controleert of een specifieke toets momenteel is ingedrukt.
     * @param {string} code - De KeyCode (bijv. 'KeyW', 'Space')
     * @returns {boolean}
     */
    isKeyDown(code) {
        return !!this.keys[code];
    }

    /**
     * Geeft de muisbeweging terug en reset deze direct naar 0.
     * Dit voorkomt dat de camera blijft doordraaien als de muis stilstaat.
     * @returns {{x: number, y: number}}
     */
    consumeMouseMove() {
        const m = { x: this.mouse.x, y: this.mouse.y };
        this.mouse.x = 0;
        this.mouse.y = 0;
        return m;
    }
}
