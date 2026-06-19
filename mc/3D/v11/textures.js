// ============================================================================
// MATTYOU CRAFT - TEXTURES & CONFIGURATION (textures.js)
// ============================================================================

class TextureGenerator {
    /**
     * Genereert een procedurele pixel-art textuur op basis van het bloktype.
     * @param {string} type - Het type blok (bijv. 'grass', 'stone')
     * @returns {THREE.CanvasTexture} De gegenereerde Three.js textuur
     */
    static createBlockTexture(type) {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');

        const drawPixel = (x, y, color) => {
            ctx.fillStyle = color;
            ctx.fillRect(x, y, 1, 1);
        };

        if (type === 'grass') {
            ctx.fillStyle = '#557a2b';
            ctx.fillRect(0, 0, 16, 4);
            ctx.fillStyle = '#866043';
            ctx.fillRect(0, 4, 16, 12);
            for(let i = 0; i < 20; i++) {
                drawPixel(Math.floor(Math.random() * 16), Math.floor(Math.random() * 4), '#4d6e27');
                drawPixel(Math.floor(Math.random() * 16), 4 + Math.floor(Math.random() * 12), '#5c402c');
            }
        } else if (type === 'dirt') {
            ctx.fillStyle = '#866043';
            ctx.fillRect(0, 0, 16, 16);
            for(let i = 0; i < 30; i++) {
                drawPixel(Math.floor(Math.random() * 16), Math.floor(Math.random() * 16), '#5c402c');
            }
        } else if (type === 'stone') {
            ctx.fillStyle = '#737373';
            ctx.fillRect(0, 0, 16, 16);
            for(let i = 0; i < 30; i++) {
                drawPixel(Math.floor(Math.random() * 16), Math.floor(Math.random() * 16), '#525252');
            }
        } else if (type === 'wood') {
            ctx.fillStyle = '#5c402c';
            ctx.fillRect(0, 0, 16, 16);
            ctx.fillStyle = '#3d2a1d';
            ctx.fillRect(4, 0, 8, 16);
        } else if (type === 'leaves') {
            ctx.fillStyle = '#2e5c1e';
            ctx.fillRect(0, 0, 16, 16);
            for(let i = 0; i < 20; i++) {
                drawPixel(Math.floor(Math.random() * 16), Math.floor(Math.random() * 16), '#1f3d14');
            }
        } else if (type === 'planks') {
            ctx.fillStyle = '#b08854';
            ctx.fillRect(0, 0, 16, 16);
            ctx.strokeStyle = '#7a5a31';
            ctx.lineWidth = 1;
            ctx.strokeRect(0, 0, 16, 16);
        } else if (type === 'crafting_table') {
            ctx.fillStyle = '#7a5a31';
            ctx.fillRect(0, 0, 16, 16);
            ctx.fillStyle = '#b08854';
            ctx.fillRect(2, 2, 12, 12);
            ctx.fillStyle = '#333';
            ctx.fillRect(4, 4, 2, 6);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        return texture;
    }
}

// ============================================================================
// BLOKKEN & ITEMS DATABASE
// ============================================================================
const BLOCK_TYPES = {
    1: { name: 'Gras', key: 'grass', color: '#557a2b', hardness: 0.6 },
    2: { name: 'Aarde', key: 'dirt', color: '#866043', hardness: 0.5 },
    3: { name: 'Steen', key: 'stone', color: '#737373', hardness: 3.0 },
    4: { name: 'Hout Stam', key: 'wood', color: '#5c402c', hardness: 1.5 },
    5: { name: 'Bladeren', key: 'leaves', color: '#2e5c1e', hardness: 0.2 },
    6: { name: 'Houten Planken', key: 'planks', color: '#b08854', hardness: 1.0 },
    7: { name: 'Crafting Table', key: 'crafting_table', color: '#7a5a31', hardness: 1.5 },
    
    // Items (Geen fysieke blokken in de 3D wereld)
    8: { name: 'Stok (Stick)', key: 'stick', color: '#8b5a2b', isItem: true },
    9: { name: 'Houten Pickaxe', key: 'wood_pickaxe', color: '#00ffff', isItem: true, speedMultiplier: 3.0 },
    10: { name: 'Steen Pickaxe', key: 'stone_pickaxe', color: '#ff00ff', isItem: true, speedMultiplier: 6.0 }
};

// ============================================================================
// CRAFTING RECEPTEN
// ============================================================================
const BASE_RECIPES = [
    { result: 6, resultCount: 4, ingredients: { 4: 1 }, name: 'Planken (4x)' },
    { result: 8, resultCount: 4, ingredients: { 6: 2 }, name: 'Stokken (4x)' },
    { result: 7, resultCount: 1, ingredients: { 6: 4 }, name: 'Crafting Table' }
];

const ADVANCED_RECIPES = [
    ...BASE_RECIPES,
    { result: 9, resultCount: 1, ingredients: { 6: 3, 8: 2 }, name: 'Houten Pickaxe' },
    { result: 10, resultCount: 1, ingredients: { 3: 3, 8: 2 }, name: 'Steen Pickaxe' }
];
