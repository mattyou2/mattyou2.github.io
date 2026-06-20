// ============================================================================
// MATTYOU CRAFT - ADVANCED TEXTURES & CONFIGURATION (textures.js)
// ============================================================================

class TextureGenerator {
    /**
     * Genereert een prachtige 16x16 pixel-art textuur met shading en ruis.
     */
    static createBlockTexture(type) {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');

        // Helper om pixel te tekenen
        const drawPixel = (x, y, color) => {
            ctx.fillStyle = color;
            ctx.fillRect(x, y, 1, 1);
        };

        // Helper om ruis/kleurvariatie toe te voegen
        const adjustColor = (hex, percent) => {
            let num = parseInt(hex.replace("#",""), 16),
                amt = Math.round(2.55 * percent),
                R = (num >> 16) + amt,
                G = (num >> 8 & 0x00FF) + amt,
                B = (num & 0x0000FF) + amt;
            return "#" + (0x1000000 + (R<255?R<0?0:R:255)*0x10000 + (G<255?G<0?0:G:255)*0x100 + (B<255?B<0?0:B:255)).toString(16).slice(1);
        };

        // Basis vulling met ruis
        const fillWithNoise = (baseColor, noiseRange = 10) => {
            for (let x = 0; x < 16; x++) {
                for (let y = 0; y < 16; y++) {
                    const offset = Math.floor(Math.random() * (noiseRange * 2)) - noiseRange;
                    drawPixel(x, y, adjustColor(baseColor, offset));
                }
            }
        };

        // Voeg 3D-shading randen toe (Minecraft stijl)
        const apply3DShading = (lightColor, darkColor) => {
            ctx.fillStyle = lightColor;
            ctx.fillRect(0, 0, 16, 1); // Bovenrand
            ctx.fillRect(0, 0, 1, 16); // Linkerrand
            ctx.fillStyle = darkColor;
            ctx.fillRect(0, 15, 16, 1); // Onderrand
            ctx.fillRect(15, 0, 1, 16); // Rechterrand
        };

        if (type === 'grass') {
            fillWithNoise('#866043', 8); // Aarde onderkant
            ctx.fillStyle = '#557a2b';
            ctx.fillRect(0, 0, 16, 5); // Gras bovenkant
            // Gras sprieten die naar beneden hangen
            for (let x = 0; x < 16; x++) {
                const hang = Math.floor(Math.random() * 3) + 4;
                ctx.fillStyle = '#4d6e27';
                ctx.fillRect(x, 4, 1, hang - 4);
            }
            apply3DShading('#7cb83d', '#3d5c1d');
        } 
        else if (type === 'dirt') {
            fillWithNoise('#866043', 12);
            apply3Texturize(ctx, '#5c402c', 15);
            apply3DShading('#9c7352', '#5c402c');
        } 
        else if (type === 'stone') {
            fillWithNoise('#737373', 10);
            apply3DShading('#919191', '#525252');
        } 
        else if (type === 'deepslate') {
            fillWithNoise('#2f3136', 8);
            apply3DShading('#404249', '#1c1d21');
        }
        else if (type === 'wood') {
            fillWithNoise('#5c402c', 10);
            // Houtnerven (verticale lijnen)
            ctx.fillStyle = '#3d2a1d';
            ctx.fillRect(3, 0, 2, 16);
            ctx.fillRect(11, 0, 2, 16);
            apply3DShading('#7a5a31', '#2d1e14');
        } 
        else if (type === 'leaves') {
            fillWithNoise('#2e5c1e', 15);
            apply3DShading('#41822b', '#193310');
        } 
        else if (type === 'planks') {
            fillWithNoise('#b08854', 8);
            // Planken lijnen
            ctx.fillStyle = '#7a5a31';
            ctx.fillRect(0, 5, 16, 1);
            ctx.fillRect(0, 11, 16, 1);
            apply3DShading('#cf9f63', '#5c4322');
        } 
        else if (type === 'crafting_table') {
            fillWithNoise('#7a5a31', 8);
            ctx.fillStyle = '#b08854';
            ctx.fillRect(2, 2, 12, 12);
            ctx.fillStyle = '#4a331c';
            ctx.fillRect(4, 4, 2, 6);
            ctx.fillRect(10, 4, 2, 6);
            apply3DShading('#a67a42', '#3d2a15');
        }
        else if (type === 'obsidian') {
            fillWithNoise('#15101a', 15);
            apply3DShading('#2b1f36', '#09060d');
        }
        else if (type === 'bedrock') {
            fillWithNoise('#111111', 25);
            apply3DShading('#333333', '#000000');
        }
        // --- ERTSEN ---
        else if (type.endsWith('_ore')) {
            // Basis is steen of deepslate
            const isDeep = type.startsWith('deepslate_');
            const baseColor = isDeep ? '#2f3136' : '#737373';
            fillWithNoise(baseColor, 8);

            // Bepaal de kleur van de ertsvlekken
            let oreColor = '#ff0000';
            if (type.includes('coal')) oreColor = '#1c1c1c';
            else if (type.includes('iron')) oreColor = '#d49b74';
            else if (type.includes('gold')) oreColor = '#f2cd38';
            else if (type.includes('diamond')) oreColor = '#4dedf0';

            // Teken willekeurige ertsvlekken
            ctx.fillStyle = oreColor;
            for (let i = 0; i < 6; i++) {
                const ox = Math.floor(Math.random() * 12) + 1;
                const oy = Math.floor(Math.random() * 12) + 1;
                ctx.fillRect(ox, oy, Math.floor(Math.random()*2)+1, Math.floor(Math.random()*2)+1);
            }
            apply3DShading(isDeep ? '#404249' : '#919191', isDeep ? '#1c1d21' : '#525252');
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        return texture;
    }
}

// Extra helper voor textuur details
function apply3Texturize(ctx, color, count) {
    ctx.fillStyle = color;
    for(let i=0; i<count; i++) {
        ctx.fillRect(Math.floor(Math.random()*16), Math.floor(Math.random()*16), 1, 1);
    }
}

// ============================================================================
// COMPREHENSIVE BLOCKS & ITEMS DATABASE
// ============================================================================
const BLOCK_TYPES = {
    // --- BLOKKEN ---
    1: { name: 'Gras', key: 'grass', color: '#557a2b', hardness: 0.6, description: 'Heerlijk groen gras.' },
    2: { name: 'Aarde', key: 'dirt', color: '#866043', hardness: 0.5, description: 'Gewoon een blok modder.' },
    3: { name: 'Steen', key: 'stone', color: '#737373', hardness: 1.5, description: 'Stevig bouwmateriaal.' },
    4: { name: 'Hout Stam', key: 'wood', color: '#5c402c', hardness: 1.5, description: 'Kan worden omgezet in planken.' },
    5: { name: 'Bladeren', key: 'leaves', color: '#2e5c1e', hardness: 0.2, description: 'Lekker groen en zacht.' },
    6: { name: 'Houten Planken', key: 'planks', color: '#b08854', hardness: 1.0, description: 'Ideaal voor het maken van gereedschap.' },
    7: { name: 'Crafting Table', key: 'crafting_table', color: '#7a5a31', hardness: 1.5, description: 'Gebruik dit om 3x3 recepten te craften!' },
    
    // Nieuwe diepe blokken
    41: { name: 'Cobblestone', key: 'stone', color: '#616161', hardness: 1.5, description: 'Gebroken steen, perfect voor ovens en gereedschap.' },
    43: { name: 'Deepslate', key: 'deepslate', color: '#2f3136', hardness: 3.0, description: 'Een zeer harde steensoort diep onder de grond.' },
    44: { name: 'Obsidian', key: 'obsidian', color: '#15101a', hardness: 15.0, description: 'Keihard vulkanisch glas.' },
    45: { name: 'Bedrock', key: 'bedrock', color: '#111111', hardness: 9999.0, description: 'Onverwoestbaar gesteente op de bodem van de wereld.' },

    // Nieuwe Ertsen
    17: { name: 'Steenkool Erts', key: 'coal_ore', color: '#363636', hardness: 2.0, description: 'Bevat steenkool.' },
    18: { name: 'IJzer Erts', key: 'iron_ore', color: '#b88c6e', hardness: 3.0, description: 'Moet worden omgesmolten tot ijzer.' },
    19: { name: 'Goud Erts', key: 'gold_ore', color: '#d1b841', hardness: 3.0, description: 'Moet worden omgesmolten tot goud.' },
    20: { name: 'Diamant Erts', key: 'diamond_ore', color: '#4dedf0', hardness: 4.0, description: 'Super zeldzaam glimmend erts!' },

    // Deepslate varianten van ertsen
    83: { name: 'Deepslate Diamant Erts', key: 'deepslate_diamond_ore', color: '#33b5b7', hardness: 5.0, description: 'Diamant diep in de deepslate laag.' },
    84: { name: 'Deepslate IJzer Erts', key: 'deepslate_iron_ore', color: '#916e56', hardness: 4.5, description: 'IJzer diep in de deepslate laag.' },

    // --- ITEMS (Geen fysieke blokken in de 3D wereld) ---
    8: { name: 'Stok (Stick)', key: 'stick', color: '#8b5a2b', isItem: true, description: 'Een houten stok.' },
    24: { name: 'Steenkool (Coal)', key: 'coal', color: '#1c1c1c', isItem: true, description: 'Brandstof voor fakkels.' },
    25: { name: 'IJzer Ingot', key: 'iron_ingot', color: '#d8d8d8', isItem: true, description: 'Sterk metaal voor armor en tools.' },
    26: { name: 'Goud Ingot', key: 'gold_ingot', color: '#f2cd38', isItem: true, description: 'Zacht maar waardevol metaal.' },
    27: { name: 'Diamant', key: 'diamond', color: '#4dedf0', isItem: true, description: 'Het ultieme materiaal.' },

    // Tools
    9: { name: 'Houten Pickaxe', key: 'wood_pickaxe', color: '#8b5a2b', isItem: true, speedMultiplier: 2.0, description: 'Hakt steen.' },
    10: { name: 'Steen Pickaxe', key: 'stone_pickaxe', color: '#616161', isItem: true, speedMultiplier: 4.0, description: 'Hakt ijzer.' },
    48: { name: 'IJzeren Pickaxe', key: 'iron_pickaxe', color: '#d8d8d8', isItem: true, speedMultiplier: 6.0, description: 'Hakt goud en diamant.' },
    50: { name: 'Diamanten Pickaxe', key: 'diamond_pickaxe', color: '#4dedf0', isItem: true, speedMultiplier: 10.0, description: 'Hakt alles super snel!' },

    11: { name: 'Houten Zwaard', key: 'wood_sword', color: '#8b5a2b', isItem: true, description: 'Houten wapen.' },
    12: { name: 'Steen Zwaard', key: 'stone_sword', color: '#616161', isItem: true, description: 'Stenen wapen.' },
    51: { name: 'IJzeren Zwaard', key: 'iron_sword', color: '#d8d8d8', isItem: true, description: 'Scherp ijzeren wapen.' },
    53: { name: 'Diamanten Zwaard', key: 'diamond_sword', color: '#4dedf0', isItem: true, description: 'Het dodelijkste wapen.' },

    13: { name: 'Houten Bijl', key: 'wood_axe', color: '#8b5a2b', isItem: true },
    14: { name: 'Steen Bijl', key: 'stone_axe', color: '#616161', isItem: true },
    15: { name: 'Houten Schep', key: 'wood_shovel', color: '#8b5a2b', isItem: true },
    16: { name: 'Steen Schep', key: 'stone_shovel', color: '#616161', isItem: true },

    // Armor
    60: { name: 'IJzeren Helm', key: 'iron_helmet', color: '#d8d8d8', isItem: true },
    63: { name: 'IJzeren Borstplaat', key: 'iron_chestplate', color: '#d8d8d8', isItem: true },
    66: { name: 'IJzeren Broek', key: 'iron_leggings', color: '#d8d8d8', isItem: true },
    69: { name: 'IJzeren Laarzen', key: 'iron_boots', color: '#d8d8d8', isItem: true },
    62: { name: 'Diamanten Helm', key: 'diamond_helmet', color: '#4dedf0', isItem: true },
    65: { name: 'Diamanten Borstplaat', key: 'diamond_chestplate', color: '#4dedf0', isItem: true },

    // Eten & Overig
    73: { name: 'Tarwe (Wheat)', key: 'wheat', color: '#e3c16d', isItem: true, description: 'Om brood mee te bakken.' },
    74: { name: 'Brood', key: 'bread', color: '#9c6f35', isItem: true, description: 'Herstelt je honger.' },
    75: { name: 'Appel', key: 'apple', color: '#ff2222', isItem: true, description: 'Gezond fruit.' },
    76: { name: 'Gouden Appel', key: 'golden_apple', color: '#f2cd38', isItem: true, description: 'Geeft legendarische krachten!' },
    77: { name: 'Fakkel (Torch)', key: 'torch', color: '#ffaa00', isItem: true, description: 'Geeft licht in het donker.' }
};
